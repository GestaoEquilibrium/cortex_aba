-- ============================================================================
-- CORTEX aba — 12 · documentos do paciente e termos de consentimento
-- ============================================================================
create table if not exists public.documentos_paciente (
    id           uuid primary key default gen_random_uuid(),
    paciente_id  uuid not null references public.pacientes(id) on delete cascade,
    tipo         text not null default 'outro' check (tipo in
                 ('laudo','relatorio_escolar','encaminhamento','guia','exame','receita','outro')),
    titulo       text not null,
    arquivo_path text not null,
    mime         text,
    tamanho      integer,
    validade     date,
    observacao   text,
    enviado_por  uuid references public.profissionais(id) on delete set null,
    created_at   timestamptz not null default now()
);

create index if not exists idx_doc_pac on public.documentos_paciente(paciente_id, created_at desc);
create index if not exists idx_doc_val on public.documentos_paciente(validade) where validade is not null;

alter table public.documentos_paciente enable row level security;

drop policy if exists doc_select on public.documentos_paciente;
create policy doc_select on public.documentos_paciente for select to authenticated
using (public.eq_ve_paciente(paciente_id));

drop policy if exists doc_escrita on public.documentos_paciente;
create policy doc_escrita on public.documentos_paciente for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

create table if not exists public.termos_modelos (
    id          uuid primary key default gen_random_uuid(),
    nome        text not null,
    tipo        text not null default 'outro' check (tipo in
                ('lgpd','imagem','intervencao','financeiro','outro')),
    versao      integer not null default 1,
    texto       text not null,
    obrigatorio boolean not null default true,
    ativo       boolean not null default true,
    criado_por  uuid references public.profissionais(id) on delete set null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (tipo, versao)
);

-- texto_assinado guarda o conteúdo exato aceito: se o modelo mudar, a assinatura
-- antiga continua provando o que a família leu de fato
create table if not exists public.termos_assinaturas (
    id              uuid primary key default gen_random_uuid(),
    termo_id        uuid not null references public.termos_modelos(id) on delete restrict,
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    responsavel_id  uuid references public.responsaveis(id) on delete set null,
    nome_assinante  text not null,
    aceite          boolean not null default true,
    texto_assinado  text not null,
    versao_assinada integer not null,
    assinado_em     timestamptz not null default now(),
    origem          text not null default 'portal' check (origem in ('portal','presencial')),
    registrado_por  uuid references public.profissionais(id) on delete set null,
    unique (termo_id, paciente_id, responsavel_id)
);

create index if not exists idx_termo_pac on public.termos_assinaturas(paciente_id);

drop trigger if exists trg_termo_upd on public.termos_modelos;
create trigger trg_termo_upd before update on public.termos_modelos
    for each row execute function public.set_updated_at();

alter table public.termos_modelos     enable row level security;
alter table public.termos_assinaturas enable row level security;

drop policy if exists termo_select on public.termos_modelos;
create policy termo_select on public.termos_modelos for select to authenticated using (true);
drop policy if exists termo_escrita on public.termos_modelos;
create policy termo_escrita on public.termos_modelos for all to authenticated
using  (public.eq_perfil() = 'admin_direcao') with check (public.eq_perfil() = 'admin_direcao');

drop policy if exists assin_select on public.termos_assinaturas;
create policy assin_select on public.termos_assinaturas for select to authenticated
using (public.eq_ve_paciente(paciente_id) or public.eq_responsavel_ve(paciente_id));

drop policy if exists assin_familia on public.termos_assinaturas;
create policy assin_familia on public.termos_assinaturas for insert to authenticated
with check (public.eq_responsavel_ve(paciente_id) and responsavel_id = public.eq_responsavel_id());

drop policy if exists assin_equipe on public.termos_assinaturas;
create policy assin_equipe on public.termos_assinaturas for insert to authenticated
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

-- assinatura não se edita nem se apaga: é prova

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 15728640,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
   set public = false, file_size_limit = 15728640,
       allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists docs_ver on storage.objects;
create policy docs_ver on storage.objects for select to authenticated
using (bucket_id = 'documentos' and public.eq_prof_id() is not null);

drop policy if exists docs_gravar on storage.objects;
create policy docs_gravar on storage.objects for insert to authenticated
with check (bucket_id = 'documentos'
            and public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

drop policy if exists docs_apagar on storage.objects;
create policy docs_apagar on storage.objects for delete to authenticated
using (bucket_id = 'documentos' and public.eq_perfil() in ('admin_direcao','coordenador_aba'));

notify pgrst, 'reload schema';
