-- ============================================================================
-- CORTEX aba — 18 · encerramento de acompanhamento e portabilidade de dados
-- ============================================================================

-- 1. O encerramento --------------------------------------------------------------
create table if not exists public.encerramentos (
    id               uuid primary key default gen_random_uuid(),
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    tipo             text not null check (tipo in
                     ('alta','desligamento','transferencia','desistencia','obito')),
    data             date not null default current_date,
    motivo           text,
    sintese          text,                       -- resumo clínico do período
    encaminhamento   text,                       -- para onde vai
    objetivos_dominados integer,
    sessoes_realizadas  integer,
    meses_acompanhado   integer,
    registrado_por   uuid references public.profissionais(id) on delete set null,
    retencao_ate     date,                       -- até quando o prontuário fica guardado
    created_at       timestamptz not null default now()
);

create index if not exists idx_enc_pac on public.encerramentos(paciente_id);

alter table public.encerramentos enable row level security;

drop policy if exists enc_select on public.encerramentos;
create policy enc_select on public.encerramentos for select to authenticated
using (public.eq_ve_paciente(paciente_id)
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists enc_escrita on public.encerramentos;
create policy enc_escrita on public.encerramentos for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

-- 2. Encerrar arruma a agenda sozinho ---------------------------------------------
-- Sem isto, criança que saiu continua gerando sessão e aparecendo na agenda de alguém.
-- Prontuário de menor tem retenção longa: nada é apagado, só desativado.
create or replace function public.eq_encerra_acompanhamento()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    if new.status in ('alta','desligado') and old.status not in ('alta','desligado') then

        update public.cronograma_terapeutico
           set ativo = false, vigencia_fim = coalesce(vigencia_fim, current_date)
         where paciente_id = new.id and ativo;

        update public.sessoes
           set status = 'cancelada_clinica',
               motivo_alteracao = coalesce(motivo_alteracao, 'encerramento do acompanhamento')
         where paciente_id = new.id
           and data > current_date
           and status = 'agendada';

        update public.vinculos_paciente_aplicador
           set ativo = false, data_fim = coalesce(data_fim, current_date)
         where paciente_id = new.id and ativo;

        update public.pei
           set status = 'encerrado'
         where paciente_id = new.id and status = 'vigente';

        update public.tarefas
           set status = 'cancelada'
         where paciente_id = new.id and status = 'aberta';

        update public.anamneses
           set status = 'revisada'
         where paciente_id = new.id and status in ('enviada','em_preenchimento');
    end if;
    return new;
end $$;

drop trigger if exists trg_encerra_acompanhamento on public.pacientes;
create trigger trg_encerra_acompanhamento after update on public.pacientes
    for each row execute function public.eq_encerra_acompanhamento();

-- 3. Números do período, para a síntese do encerramento -----------------------------
create or replace function public.resumo_acompanhamento(p_paciente uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
    select jsonb_build_object(
        'entrada',            (select data_entrada from public.pacientes where id = p_paciente),
        'meses',              (select greatest(1, (extract(year  from age(current_date, coalesce(data_entrada, created_at::date))) * 12
                                                 + extract(month from age(current_date, coalesce(data_entrada, created_at::date))))::integer)
                               from public.pacientes where id = p_paciente),
        'sessoes_previstas',  (select count(*) from public.sessoes where paciente_id = p_paciente),
        'sessoes_realizadas', (select count(*) from public.sessoes where paciente_id = p_paciente and status = 'realizada'),
        'faltas',             (select count(*) from public.sessoes where paciente_id = p_paciente and status like 'falta%'),
        'objetivos_total',    (select count(*) from public.pei_programas where paciente_id = p_paciente),
        'objetivos_dominados',(select count(*) from public.pei_programas where paciente_id = p_paciente
                                and status in ('dominado','em_manutencao')),
        'evolucoes',          (select count(*) from public.evolucoes_diarias where paciente_id = p_paciente),
        'relatorios',         (select count(*) from public.relatorios_mensais where paciente_id = p_paciente and status = 'finalizado'),
        'avaliacoes',         (select count(*) from public.avaliacoes where paciente_id = p_paciente and status = 'concluida')
    )
$$;

revoke execute on function public.resumo_acompanhamento(uuid) from public, anon;
grant  execute on function public.resumo_acompanhamento(uuid) to authenticated;

-- 4. Portabilidade: tudo que existe sobre uma criança, num só objeto ----------------
-- A LGPD dá ao titular o direito de receber os próprios dados. Sem isto, atender a
-- um pedido desses significaria alguém montando planilha à mão.
create or replace function public.exportar_paciente(p_paciente uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_resultado jsonb;
begin
    if public.eq_perfil() not in ('admin_direcao','supervisor_clinico','coordenador_aba') then
        raise exception 'Sem permissão para exportar dados de paciente.';
    end if;
    if not public.eq_ve_paciente(p_paciente) then
        raise exception 'Paciente fora do seu acesso.';
    end if;

    select jsonb_build_object(
        'gerado_em', now(),
        'paciente', (select to_jsonb(p) - 'foto_url' from public.pacientes p where p.id = p_paciente),

        'responsaveis', coalesce((
            select jsonb_agg(jsonb_build_object('nome', r.nome, 'email', r.email,
                                                'telefone', r.telefone, 'parentesco', rp.parentesco))
            from public.responsaveis_pacientes rp
            join public.responsaveis r on r.id = rp.responsavel_id
            where rp.paciente_id = p_paciente), '[]'::jsonb),

        'grade', coalesce((
            select jsonb_agg(jsonb_build_object('dia_semana', c.dia_semana, 'hora', c.hora_inicio,
                             'duracao_min', c.duracao_min, 'sala', c.sala, 'ativo', c.ativo,
                             'aplicador', pr.nome_completo))
            from public.cronograma_terapeutico c
            left join public.profissionais pr on pr.id = c.profissional_id
            where c.paciente_id = p_paciente), '[]'::jsonb),

        'sessoes', coalesce((
            select jsonb_agg(jsonb_build_object('data', s.data, 'hora', s.hora_inicio,
                             'duracao_min', s.duracao_min, 'status', s.status,
                             'aplicador', pr.nome_completo) order by s.data)
            from public.sessoes s
            left join public.profissionais pr on pr.id = s.profissional_id
            where s.paciente_id = p_paciente), '[]'::jsonb),

        'evolucoes', coalesce((
            select jsonb_agg(jsonb_build_object('data', s.data, 'texto', e.texto,
                             'contexto', e.contexto, 'profissional', pr.nome_completo) order by s.data)
            from public.evolucoes_diarias e
            join public.sessoes s on s.id = e.sessao_id
            left join public.profissionais pr on pr.id = e.profissional_id
            where e.paciente_id = p_paciente), '[]'::jsonb),

        'objetivos', coalesce((
            select jsonb_agg(jsonb_build_object('programa', b.nome, 'area', b.area,
                             'status', pp.status, 'inicio', pp.data_inicio,
                             'criterio', pp.criterio_percentual || '% em ' || pp.criterio_sessoes || ' sessões',
                             'tentativas', (select count(*) from public.registros_tentativa t
                                            where t.pei_programa_id = pp.id and not t.observador),
                             'independentes', (select count(*) from public.registros_tentativa t
                                               where t.pei_programa_id = pp.id and not t.observador
                                                 and t.resultado = 'independente')))
            from public.pei_programas pp
            join public.biblioteca_programas b on b.id = pp.programa_id
            where pp.paciente_id = p_paciente), '[]'::jsonb),

        'comportamentos', coalesce((
            select jsonb_agg(jsonb_build_object('nome', c.nome, 'definicao', c.definicao,
                             'tipo', c.tipo, 'status', c.status,
                             'episodios', (select count(*) from public.registros_comportamento r
                                           where r.comportamento_id = c.id)))
            from public.comportamentos_alvo c
            where c.paciente_id = p_paciente), '[]'::jsonb),

        'avaliacoes', coalesce((
            select jsonb_agg(jsonb_build_object('protocolo', pr.nome, 'onda', a.onda,
                             'data', a.data, 'status', a.status) order by a.onda)
            from public.avaliacoes a
            join public.protocolos_avaliacao pr on pr.id = a.protocolo_id
            where a.paciente_id = p_paciente), '[]'::jsonb),

        'relatorios', coalesce((
            select jsonb_agg(jsonb_build_object('mes', r.mes_referencia, 'status', r.status,
                             'frequencia', r.frequencia, 'objetivos', r.objetivos,
                             'progressos', r.progressos, 'dificuldades', r.dificuldades,
                             'comportamento', r.comportamento, 'plano', r.plano_proximo,
                             'conclusao', r.conclusao) order by r.mes_referencia)
            from public.relatorios_mensais r
            where r.paciente_id = p_paciente and r.status = 'finalizado'), '[]'::jsonb),

        'anamneses', coalesce((
            select jsonb_agg(jsonb_build_object('enviada_em', a.enviado_em,
                             'respondida_em', a.respondido_em, 'respostas', a.respostas))
            from public.anamneses a
            where a.paciente_id = p_paciente and a.status in ('respondida','revisada')), '[]'::jsonb),

        'documentos', coalesce((
            select jsonb_agg(jsonb_build_object('titulo', d.titulo, 'tipo', d.tipo,
                             'validade', d.validade, 'enviado_em', d.created_at))
            from public.documentos_paciente d
            where d.paciente_id = p_paciente), '[]'::jsonb),

        'termos', coalesce((
            select jsonb_agg(jsonb_build_object('termo', t.nome, 'versao', a.versao_assinada,
                             'assinado_em', a.assinado_em, 'assinante', a.nome_assinante,
                             'origem', a.origem))
            from public.termos_assinaturas a
            join public.termos_modelos t on t.id = a.termo_id
            where a.paciente_id = p_paciente), '[]'::jsonb),

        'encerramento', (select to_jsonb(e) from public.encerramentos e
                         where e.paciente_id = p_paciente order by e.data desc limit 1),

        'resumo', public.resumo_acompanhamento(p_paciente)
    ) into v_resultado;

    return v_resultado;
end $$;

revoke execute on function public.exportar_paciente(uuid) from public, anon;
grant  execute on function public.exportar_paciente(uuid) to authenticated;

notify pgrst, 'reload schema';
