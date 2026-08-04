-- ============================================================================
-- CORTEX aba — 29 · CPF do paciente e do responsável
-- ----------------------------------------------------------------------------
-- É o que identifica a criança no convênio e na nota fiscal; o do responsável
-- é quem assina e paga.
--
-- A validação fica no banco, não só na tela: CPF digitado errado só aparece na
-- hora de emitir a nota, quando já virou retrabalho.
-- ============================================================================
alter table public.pacientes add column if not exists cpf text;
alter table public.pacientes add column if not exists cpf_responsavel text;

create or replace function public.eq_cpf_valido(p_cpf text)
returns boolean
language plpgsql immutable set search_path = pg_temp as $$
declare v text; v_soma integer; v_dig integer; i integer;
begin
    if p_cpf is null or btrim(p_cpf) = '' then return true; end if;
    v := regexp_replace(p_cpf, '\D', '', 'g');
    if length(v) <> 11 then return false; end if;
    -- 11111111111 e afins passam no cálculo mas não existem
    if v ~ '^(\d)\1{10}$' then return false; end if;

    v_soma := 0;
    for i in 1..9 loop
        v_soma := v_soma + (substr(v, i, 1))::integer * (11 - i);
    end loop;
    v_dig := 11 - (v_soma % 11);
    if v_dig >= 10 then v_dig := 0; end if;
    if v_dig <> (substr(v, 10, 1))::integer then return false; end if;

    v_soma := 0;
    for i in 1..10 loop
        v_soma := v_soma + (substr(v, i, 1))::integer * (12 - i);
    end loop;
    v_dig := 11 - (v_soma % 11);
    if v_dig >= 10 then v_dig := 0; end if;
    if v_dig <> (substr(v, 11, 1))::integer then return false; end if;

    return true;
end $$;

-- guarda só os dígitos: máscara é assunto de tela
create or replace function public.eq_normaliza_cpf()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
    if new.cpf is not null then
        new.cpf := nullif(regexp_replace(new.cpf, '\D', '', 'g'), '');
    end if;
    if new.cpf_responsavel is not null then
        new.cpf_responsavel := nullif(regexp_replace(new.cpf_responsavel, '\D', '', 'g'), '');
    end if;
    if not public.eq_cpf_valido(new.cpf) then
        raise exception 'CPF do paciente inválido: %', new.cpf;
    end if;
    if not public.eq_cpf_valido(new.cpf_responsavel) then
        raise exception 'CPF do responsável inválido: %', new.cpf_responsavel;
    end if;
    return new;
end $$;

drop trigger if exists trg_normaliza_cpf on public.pacientes;
create trigger trg_normaliza_cpf before insert or update on public.pacientes
    for each row execute function public.eq_normaliza_cpf();

-- Duas crianças não podem ter o mesmo CPF. O do responsável pode repetir:
-- irmãos atendidos na mesma clínica são comuns.
create unique index if not exists idx_pac_cpf on public.pacientes(cpf)
    where cpf is not null;

-- create or replace não muda o formato de retorno; a coluna nova exige apagar antes
drop function if exists public.relatorio_convenio(text, date, date);

create function public.relatorio_convenio(
    p_convenio text default null, p_ini date default null, p_fim date default null)
returns table (
    paciente_id uuid, paciente text, cpf text, carteirinha text, convenio text,
    guia_numero text, guia_validade date, autorizadas integer,
    data date, hora time, duracao_min integer,
    profissional text, conselho text, status text, guia_vencida boolean)
language sql stable security definer set search_path = public, pg_temp as $$
    select p.id, p.nome_completo, p.cpf, p.carteirinha, p.convenio,
           p.guia_numero, p.guia_validade, p.guia_sessoes_autorizadas,
           s.data, s.hora_inicio, s.duracao_min,
           pr.nome_completo, coalesce(pr.registro_conselho, ''), s.status,
           -- vencida NA DATA DO ATENDIMENTO, não hoje
           (p.guia_validade is not null and p.guia_validade < s.data)
    from public.sessoes s
    join public.pacientes p on p.id = s.paciente_id
    left join public.profissionais pr on pr.id = s.profissional_id
    where s.status = 'realizada'
      and (p_convenio is null or p.convenio = p_convenio)
      and (p_ini is null or s.data >= p_ini)
      and (p_fim is null or s.data <= p_fim)
      and public.eq_ve_paciente(p.id)
    order by p.nome_completo, s.data, s.hora_inicio
$$;

revoke execute on function public.relatorio_convenio(text, date, date) from public, anon;
grant  execute on function public.relatorio_convenio(text, date, date) to authenticated;

notify pgrst, 'reload schema';
