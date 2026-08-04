-- ============================================================================
-- CORTEX aba — 28 · o passado não vira cobrança
-- ----------------------------------------------------------------------------
-- As sessões trazidas do sistema anterior aconteceram e contam nos indicadores
-- de frequência e absenteísmo. Mas ninguém vai escrever evolução para
-- atendimento que já passou, feito fora daqui.
--
-- Deixá-las na conta produzia 35 pendências que nunca seriam resolvidas — e
-- painel com número impossível de zerar ensina a equipe a ignorar o painel.
-- ============================================================================
create index if not exists idx_sessoes_importadas on public.sessoes(observacao)
    where observacao = 'importado do sistema anterior';

create or replace function public.gerar_tarefas_evolucao()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; v_prazo integer; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return 0;
    end if;

    select coalesce((valor #>> '{}')::integer, 2) into v_prazo
      from public.configuracoes where chave = 'prazo_evolucao_dias';
    if v_prazo is null then v_prazo := 2; end if;

    for r in
        select s.profissional_id, count(*) as quantas, min(s.data) as mais_antiga
        from public.sessoes s
        left join public.evolucoes_diarias e on e.sessao_id = s.id
        where s.status = 'realizada' and e.id is null
          and coalesce(s.observacao,'') <> 'importado do sistema anterior'
          and s.data < current_date - v_prazo and s.data >= current_date - 30
          and s.profissional_id is not null
        group by s.profissional_id
    loop
        insert into public.tarefas
            (titulo, descricao, tipo, responsavel_id, criado_por, prazo, prioridade, origem, chave_unica)
        values ('Evoluções pendentes',
             r.quantas || ' sessão(ões) realizada(s) sem evolução escrita. A mais antiga é de ' ||
             to_char(r.mais_antiga, 'DD/MM/YYYY') || '.',
             'evolucao', r.profissional_id, public.eq_prof_id(),
             current_date, 'media', 'automatica',
             'evolucao:' || r.profissional_id || ':' || to_char(current_date, 'YYYY-MM-DD'))
        on conflict (chave_unica) do nothing;
        if found then v_criadas := v_criadas + 1; end if;
    end loop;
    return v_criadas;
end $$;

notify pgrst, 'reload schema';
