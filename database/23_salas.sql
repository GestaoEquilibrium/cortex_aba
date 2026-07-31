-- ============================================================================
-- CORTEX aba — 23 · conflito de sala
-- ----------------------------------------------------------------------------
-- A grade já tinha o campo `sala`, mas ninguém validava. Duas crianças podiam ser
-- marcadas no mesmo horário com aplicadoras diferentes e a mesma sala — o sistema
-- aceitava, e o problema só aparecia com as duas famílias na porta.
--
-- A validação só age quando a sala está preenchida. Clínica que não controla sala
-- continua funcionando exatamente como antes: campo vazio, nenhuma trava.
-- ============================================================================

alter table public.sessoes add column if not exists sala text;

-- lista de salas da clínica, para virar seleção em vez de texto livre
insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('salas', '[]'::jsonb, 'Salas de atendimento da clínica', 'operacao')
on conflict (chave) do nothing;

-- 1. Grade: sala ocupada no mesmo dia e horário ---------------------------------
create or replace function public.eq_valida_cronograma()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
    v_fim time := new.hora_inicio + (new.duracao_min || ' minutes')::interval;
    v_conflito record;
begin
    if not new.ativo then return new; end if;

    -- profissional ou paciente já ocupados
    select c.*, p.nome_completo as paciente_nome, pr.nome_completo as prof_nome
      into v_conflito
    from public.cronograma_terapeutico c
    join public.pacientes p      on p.id  = c.paciente_id
    join public.profissionais pr on pr.id = c.profissional_id
    where c.ativo
      and c.id is distinct from new.id
      and c.dia_semana = new.dia_semana
      and (c.profissional_id = new.profissional_id or c.paciente_id = new.paciente_id)
      and c.hora_inicio < v_fim
      and new.hora_inicio < (c.hora_inicio + (c.duracao_min || ' minutes')::interval)
      and (c.vigencia_fim is null or c.vigencia_fim >= new.vigencia_inicio)
      and (new.vigencia_fim is null or new.vigencia_fim >= c.vigencia_inicio)
    limit 1;

    if found then
        if v_conflito.profissional_id = new.profissional_id then
            raise exception 'Conflito: % já atende % neste dia às %.',
                v_conflito.prof_nome, v_conflito.paciente_nome,
                to_char(v_conflito.hora_inicio,'HH24:MI');
        else
            raise exception 'Conflito: este paciente já tem atendimento neste dia às % com %.',
                to_char(v_conflito.hora_inicio,'HH24:MI'), v_conflito.prof_nome;
        end if;
    end if;

    -- sala ocupada — só verifica quando a sala foi informada
    if new.sala is not null and btrim(new.sala) <> '' then
        select c.*, p.nome_completo as paciente_nome, pr.nome_completo as prof_nome
          into v_conflito
        from public.cronograma_terapeutico c
        join public.pacientes p      on p.id  = c.paciente_id
        join public.profissionais pr on pr.id = c.profissional_id
        where c.ativo
          and c.id is distinct from new.id
          and c.dia_semana = new.dia_semana
          and c.sala is not null
          and lower(btrim(c.sala)) = lower(btrim(new.sala))
          and c.hora_inicio < v_fim
          and new.hora_inicio < (c.hora_inicio + (c.duracao_min || ' minutes')::interval)
          and (c.vigencia_fim is null or c.vigencia_fim >= new.vigencia_inicio)
          and (new.vigencia_fim is null or new.vigencia_fim >= c.vigencia_inicio)
        limit 1;

        if found then
            raise exception '% já está ocupada neste dia às % — % com %.',
                new.sala, to_char(v_conflito.hora_inicio,'HH24:MI'),
                v_conflito.paciente_nome, v_conflito.prof_nome;
        end if;
    end if;

    return new;
end $$;

drop trigger if exists trg_valida_cronograma on public.cronograma_terapeutico;
create trigger trg_valida_cronograma before insert or update on public.cronograma_terapeutico
    for each row execute function public.eq_valida_cronograma();

-- 2. Sessão avulsa: mesma checagem, para encaixe e reposição ---------------------
create or replace function public.eq_valida_sessao_sala()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_fim time; v_conflito record;
begin
    if new.sala is null or btrim(new.sala) = '' then return new; end if;
    if new.status in ('cancelada_clinica','remarcada','feriado') then return new; end if;

    v_fim := new.hora_inicio + (coalesce(new.duracao_min,60) || ' minutes')::interval;

    select s.*, p.nome_completo as paciente_nome
      into v_conflito
    from public.sessoes s
    join public.pacientes p on p.id = s.paciente_id
    where s.id is distinct from new.id
      and s.data = new.data
      and s.sala is not null
      and lower(btrim(s.sala)) = lower(btrim(new.sala))
      and s.status not in ('cancelada_clinica','remarcada','feriado')
      and s.hora_inicio < v_fim
      and new.hora_inicio < (s.hora_inicio + (coalesce(s.duracao_min,60) || ' minutes')::interval)
    limit 1;

    if found then
        raise exception '% já está ocupada às % por %.',
            new.sala, to_char(v_conflito.hora_inicio,'HH24:MI'), v_conflito.paciente_nome;
    end if;

    return new;
end $$;

drop trigger if exists trg_valida_sessao_sala on public.sessoes;
create trigger trg_valida_sessao_sala before insert or update on public.sessoes
    for each row execute function public.eq_valida_sessao_sala();

-- 3. A geração de sessões leva a sala da grade junto ------------------------------
create or replace function public.gerar_sessoes(p_data date default current_date)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
    v_perfil text := public.eq_perfil();
    v_equipe uuid := public.eq_equipe_id();
    v_criadas integer;
begin
    if v_perfil is null or v_perfil not in ('admin_direcao','coordenador_aba','recepcao') then
        raise exception 'Sem permissão para gerar sessões.';
    end if;

    if exists (select 1 from public.bloqueios_agenda b
               where b.data = p_data and b.equipe_id is null) then
        return 0;
    end if;

    insert into public.sessoes (paciente_id, profissional_id, cronograma_id, data,
                                hora_inicio, duracao_min, sala, status, origem, registrado_por)
    select c.paciente_id, c.profissional_id, c.id, p_data,
           c.hora_inicio, c.duracao_min, c.sala, 'agendada', 'grade', public.eq_prof_id()
    from public.cronograma_terapeutico c
    join public.pacientes pa on pa.id = c.paciente_id
    where c.ativo
      and c.dia_semana = extract(dow from p_data)
      and c.vigencia_inicio <= p_data
      and (c.vigencia_fim is null or c.vigencia_fim >= p_data)
      and pa.status = 'ativo'
      and (v_perfil in ('admin_direcao','recepcao') or pa.equipe_id = v_equipe)
      and not exists (select 1 from public.bloqueios_agenda b
                      where b.data = p_data and b.equipe_id = pa.equipe_id)
      and not exists (select 1 from public.ausencias_profissional a
                      where a.profissional_id = c.profissional_id
                        and p_data between a.data_inicio and a.data_fim)
    on conflict (paciente_id, data, hora_inicio) do nothing;

    get diagnostics v_criadas = row_count;
    return v_criadas;
end $$;

-- Nota: já existe `salas_ocupadas(dia, hora, duracao)` desde a migration 02, e a
-- ficha do paciente a usa para avisar quais salas estão em uso. Não criei função
-- nova para isso — a tela combina aquela resposta com a lista de salas cadastrada
-- em Configurações. Duas funções fazendo quase o mesmo é como o schema apodrece.

notify pgrst, 'reload schema';
