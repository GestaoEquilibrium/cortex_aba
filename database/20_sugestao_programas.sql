-- ============================================================================
-- CORTEX aba — 20 · avaliação sugere programas da biblioteca
-- ============================================================================

-- 1. A ponte que faltava ---------------------------------------------------------
-- Domínio de protocolo era texto livre; a biblioteca usa áreas fixas. Sem ligar os
-- dois, não há como a avaliação apontar o que ensinar.
alter table public.protocolo_dominios
    add column if not exists area text
    check (area in ('receptiva','expressiva','cognicao','motora','social','autocuidado'));

-- 2. O que a avaliação indica ------------------------------------------------------
-- Percorre os domínios da avaliação, calcula o percentual atingido e, para os que
-- ficaram abaixo do corte, devolve programas da biblioteca daquela área que ainda
-- não estão no PEI da criança.
create or replace function public.sugerir_programas(p_avaliacao uuid, p_corte integer default 60)
returns table (
    dominio      text,
    area         text,
    percentual   integer,
    respondidos  integer,
    programa_id  uuid,
    programa     text,
    objetivo     text,
    tentativas   integer
)
language sql stable security definer set search_path = public, pg_temp as $$
    with aval as (
        select a.id, a.paciente_id, a.protocolo_id, p.escala_max
        from public.avaliacoes a
        join public.protocolos_avaliacao p on p.id = a.protocolo_id
        where a.id = p_avaliacao
    ),
    por_dominio as (
        select d.id, d.nome, d.area,
               count(r.pontuacao) as respondidos,
               case when count(r.pontuacao) = 0 then null
                    else round(sum(r.pontuacao) * 100.0
                               / (count(r.pontuacao) * (select escala_max from aval)))::integer
               end as percentual
        from public.protocolo_dominios d
        join public.protocolo_itens i on i.dominio_id = d.id
        left join public.avaliacao_respostas r
               on r.item_id = i.id and r.avaliacao_id = p_avaliacao
        where d.protocolo_id = (select protocolo_id from aval)
        group by d.id, d.nome, d.area
    )
    select pd.nome, pd.area, pd.percentual, pd.respondidos::integer,
           b.id, b.nome, b.objetivo, b.tentativas_padrao
    from por_dominio pd
    join public.biblioteca_programas b
      on b.area = pd.area and b.ativo
    where pd.area is not null
      and pd.percentual is not null
      and pd.percentual < p_corte
      and not exists (
          select 1 from public.pei_programas pp
          join public.pei pe on pe.id = pp.pei_id
          where pe.paciente_id = (select paciente_id from aval)
            and pp.programa_id = b.id
            and pp.status in ('em_ensino','em_manutencao','dominado')
      )
    order by pd.percentual, pd.nome, b.nome
$$;

revoke execute on function public.sugerir_programas(uuid, integer) from public, anon;
grant  execute on function public.sugerir_programas(uuid, integer) to authenticated;

-- 3. Corte configurável ------------------------------------------------------------
insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('avaliacao_corte_sugestao', '60'::jsonb,
     'Percentual abaixo do qual a avaliação sugere programas', 'clinico')
on conflict (chave) do nothing;

notify pgrst, 'reload schema';
