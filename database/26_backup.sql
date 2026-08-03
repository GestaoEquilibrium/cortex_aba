-- ============================================================================
-- CORTEX aba — 26 · cópia de segurança dos dados
-- ----------------------------------------------------------------------------
-- O plano gratuito do Supabase NÃO faz backup automático. Isso significa que,
-- hoje, os prontuários existem em um único lugar: se o projeto for apagado por
-- engano, se a conta for suspensa, ou se alguém rodar um DELETE errado, não há
-- de onde voltar.
--
-- Esta função devolve todo o conteúdo clínico num objeto só, para ser baixado e
-- guardado fora do Supabase.
--
-- IMPORTANTE: isto é uma rede de segurança, não substitui `pg_dump`. Ele leva os
-- dados, não a estrutura — tabelas, funções, gatilhos e permissões vêm dos
-- arquivos em `database/`. Os dois juntos reconstroem o sistema; nenhum sozinho.
-- ============================================================================
create or replace function public.backup_completo()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
    -- só a direção: este objeto contém a clínica inteira
    if public.eq_perfil() <> 'admin_direcao' then
        raise exception 'Apenas a direção pode gerar cópia de segurança.';
    end if;

    select jsonb_build_object(
        'gerado_em',   now(),
        'origem',      current_database(),
        'aviso',       'Dados apenas. A estrutura vem dos arquivos em database/.',

        'equipes',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.equipes_aba t),
        'profissionais',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.profissionais t),
        'pacientes',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.pacientes t),
        'responsaveis',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.responsaveis t),
        'responsaveis_pacientes',(select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.responsaveis_pacientes t),
        'vinculos',             (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.vinculos_paciente_aplicador t),
        'cronograma',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.cronograma_terapeutico t),
        'sessoes',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.sessoes t),

        'biblioteca_programas', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.biblioteca_programas t),
        'pei',                  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.pei t),
        'pei_programas',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.pei_programas t),
        'pei_alvos',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.pei_alvos t),
        'registros_tentativa',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.registros_tentativa t),
        'evolucoes',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.evolucoes_diarias t),

        'comportamentos',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.comportamentos_alvo t),
        'registros_comportamento',(select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.registros_comportamento t),
        'planos_manejo',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.planos_manejo t),

        'protocolos',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.protocolos_avaliacao t),
        'protocolo_dominios',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.protocolo_dominios t),
        'protocolo_itens',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.protocolo_itens t),
        'avaliacoes',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.avaliacoes t),
        'avaliacao_respostas',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.avaliacao_respostas t),

        'relatorios',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.relatorios_mensais t),
        'orientacoes',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.orientacoes_responsavel t),
        'tarefas',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.tarefas t),
        'configuracoes',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.configuracoes t),

        'documentos',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.documentos_paciente t),
        'termos_modelos',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.termos_modelos t),
        'termos_assinaturas',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.termos_assinaturas t),
        'anamnese_modelos',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.anamnese_modelos t),
        'anamneses',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.anamneses t),

        'sondagens',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.sondagens_manutencao t),
        'supervisoes',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.supervisoes t),
        'reforcadores',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.reforcadores t),
        'avaliacoes_preferencia',(select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.avaliacoes_preferencia t),
        'admissoes',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.admissoes t),
        'encerramentos',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.encerramentos t),
        'bloqueios_agenda',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.bloqueios_agenda t),
        'ausencias',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.ausencias_profissional t)

        -- Fora de propósito: `auditoria` (cresce demais e é trilha local),
        -- `erros_sistema` (descartável) e os arquivos do Storage, que precisam
        -- ser baixados à parte.
    ) into v;

    return v;
end $$;

revoke execute on function public.backup_completo() from public, anon;
grant  execute on function public.backup_completo() to authenticated;

-- Contagem rápida, para conferir se a cópia veio inteira
create or replace function public.backup_resumo()
returns table (tabela text, registros bigint)
language sql stable security definer set search_path = public, pg_temp as $$
    select 'pacientes',            count(*) from public.pacientes
    union all select 'sessoes',    count(*) from public.sessoes
    union all select 'tentativas', count(*) from public.registros_tentativa
    union all select 'evolucoes',  count(*) from public.evolucoes_diarias
    union all select 'relatorios', count(*) from public.relatorios_mensais
    union all select 'termos assinados', count(*) from public.termos_assinaturas
    order by 1
$$;

revoke execute on function public.backup_resumo() from public, anon;
grant  execute on function public.backup_resumo() to authenticated;

notify pgrst, 'reload schema';
