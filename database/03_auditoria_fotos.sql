-- ============================================================================
-- CORTEX aba — 03 · auditoria e armazenamento de fotos
-- ============================================================================
create table if not exists public.auditoria (
    id              bigserial primary key,
    profissional_id uuid references public.profissionais(id) on delete set null,
    acao            text not null check (acao in ('criacao','edicao','exclusao','status','acesso','exportacao')),
    tabela          text not null,
    registro_id     uuid,
    detalhes        jsonb,
    pagina          text,
    criado_em       timestamptz not null default now()
);

create index if not exists idx_aud_data     on public.auditoria(criado_em desc);
create index if not exists idx_aud_registro on public.auditoria(tabela, registro_id);
create index if not exists idx_aud_prof     on public.auditoria(profissional_id);

alter table public.auditoria enable row level security;

drop policy if exists aud_insert on public.auditoria;
create policy aud_insert on public.auditoria for insert to authenticated
with check (profissional_id = public.eq_prof_id());

drop policy if exists aud_select on public.auditoria;
create policy aud_select on public.auditoria for select to authenticated
using (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

-- sem update e sem delete: trilha que pode ser editada não serve de trilha

-- ── fotos: bucket privado, acesso por link assinado ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
   set public = false, file_size_limit = 3145728,
       allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists fotos_ver on storage.objects;
create policy fotos_ver on storage.objects for select to authenticated
using (bucket_id = 'fotos' and public.eq_prof_id() is not null);

drop policy if exists fotos_gravar on storage.objects;
create policy fotos_gravar on storage.objects for insert to authenticated
with check (bucket_id = 'fotos' and public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists fotos_atualizar on storage.objects;
create policy fotos_atualizar on storage.objects for update to authenticated
using (bucket_id = 'fotos' and public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists fotos_apagar on storage.objects;
create policy fotos_apagar on storage.objects for delete to authenticated
using (bucket_id = 'fotos' and public.eq_perfil() in ('admin_direcao','coordenador_aba'));

notify pgrst, 'reload schema';
