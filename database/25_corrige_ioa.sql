-- ============================================================================
-- CORTEX aba — 25 · correção da trava que impedia o modo observador
-- ----------------------------------------------------------------------------
-- A migration 16 tentava remover a restrição única antiga de `registros_tentativa`
-- pelo nome:
--
--     registros_tentativa_sessao_id_pei_programa_id_alvo_id_numero_key
--
-- Só que o PostgreSQL corta nomes em 63 caracteres, e o nome real termina em
-- `_numer_key`. O `drop constraint if exists` não encontrou nada e seguiu em
-- silêncio — então a trava antiga continuou valendo.
--
-- Consequência: ao registrar em modo observador, o segundo lançamento da mesma
-- tentativa é recusado por chave duplicada. O IOA nunca funcionaria, e o erro só
-- apareceria com o supervisor dentro da sala, tentando registrar.
--
-- Aqui a remoção não depende do nome: procura qualquer restrição única sobre as
-- quatro colunas antigas e remove.
-- ============================================================================
do $$
declare r record; v_cols text;
begin
    for r in
        select c.conname,
               pg_get_constraintdef(c.oid) as def
        from pg_constraint c
        where c.conrelid = 'public.registros_tentativa'::regclass
          and c.contype = 'u'
    loop
        -- só as que NÃO consideram o observador: são as que impedem o registro paralelo
        if r.def like '%sessao_id%' and r.def like '%numero%'
           and r.def not like '%observador%' then
            execute format('alter table public.registros_tentativa drop constraint %I', r.conname);
            raise notice 'Removida a trava antiga: %', r.conname;
        end if;
    end loop;
end $$;

-- garante o índice correto, que separa aplicador de observador
create unique index if not exists idx_tent_unico
    on public.registros_tentativa (
        sessao_id,
        pei_programa_id,
        coalesce(alvo_id, '00000000-0000-0000-0000-000000000000'::uuid),
        numero,
        observador
    );

-- Conferência: deve sobrar apenas `idx_tent_unico` como índice único de conteúdo.
-- Se ainda aparecer alguma restrição sem `observador`, o modo observador continua quebrado.
select conname, pg_get_constraintdef(oid) as ainda_existe
from pg_constraint
where conrelid = 'public.registros_tentativa'::regclass and contype = 'u';

notify pgrst, 'reload schema';
