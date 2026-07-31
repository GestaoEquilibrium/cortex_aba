-- ============================================================================
-- CORTEX aba — 21 · registro de erros
-- ----------------------------------------------------------------------------
-- Erro que só aparece no console do navegador desaparece. Com a equipe usando em
-- sala, "deu erro" sem print vira adivinhação.
--
-- Guarda o que aconteceu, em qual tela e com quem — mas o módulo do frontend
-- corta o que puder carregar dado de paciente. Mensagem de erro às vezes traz
-- trecho do que estava sendo gravado, e isso não pode ficar numa tabela que a
-- coordenação inteira consulta.
-- ============================================================================
create table if not exists public.erros_sistema (
    id              bigserial primary key,
    profissional_id uuid references public.profissionais(id) on delete set null,
    pagina          text,
    mensagem        text not null,
    origem          text,                      -- arquivo e linha, quando o navegador informa
    pilha           text,                      -- primeiras linhas da pilha
    navegador       text,
    resolvido       boolean not null default false,
    observacao      text,
    criado_em       timestamptz not null default now()
);

create index if not exists idx_erro_data   on public.erros_sistema(criado_em desc);
create index if not exists idx_erro_aberto on public.erros_sistema(resolvido, criado_em desc);

alter table public.erros_sistema enable row level security;

-- qualquer pessoa autenticada registra o próprio erro
drop policy if exists erro_insert on public.erros_sistema;
create policy erro_insert on public.erros_sistema for insert to authenticated
with check (profissional_id = public.eq_prof_id() or profissional_id is null);

-- só quem vai corrigir enxerga
drop policy if exists erro_select on public.erros_sistema;
create policy erro_select on public.erros_sistema for select to authenticated
using (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists erro_update on public.erros_sistema;
create policy erro_update on public.erros_sistema for update to authenticated
using (public.eq_perfil() in ('admin_direcao','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba'));

-- Limpeza: erro de três meses atrás já resolvido não ajuda ninguém, e a tabela
-- cresce sozinha sem ninguém olhando.
create or replace function public.limpar_erros_antigos()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_removidos integer;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba') then
        return 0;
    end if;
    delete from public.erros_sistema
     where criado_em < now() - interval '90 days'
       and resolvido;
    get diagnostics v_removidos = row_count;
    return v_removidos;
end $$;

revoke execute on function public.limpar_erros_antigos() from public, anon;
grant  execute on function public.limpar_erros_antigos() to authenticated;

notify pgrst, 'reload schema';
