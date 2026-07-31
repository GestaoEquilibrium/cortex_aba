-- ============================================================================
-- CORTEX aba — 13 · anamnese com link para a família
-- ============================================================================
create table if not exists public.anamnese_modelos (
    id         uuid primary key default gen_random_uuid(),
    nome       text not null,
    descricao  text,
    estrutura  jsonb not null,
    ativo      boolean not null default true,
    criado_por uuid references public.profissionais(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.anamneses (
    id            uuid primary key default gen_random_uuid(),
    paciente_id   uuid not null references public.pacientes(id) on delete cascade,
    modelo_id     uuid not null references public.anamnese_modelos(id) on delete restrict,
    token         text not null unique,
    status        text not null default 'enviada' check (status in
                  ('enviada','em_preenchimento','respondida','revisada')),
    respostas     jsonb not null default '{}'::jsonb,
    enviado_por   uuid references public.profissionais(id) on delete set null,
    enviado_em    timestamptz not null default now(),
    aberto_em     timestamptz,
    respondido_em timestamptz,
    revisado_por  uuid references public.profissionais(id) on delete set null,
    revisado_em   timestamptz,
    expira_em     date,
    observacoes   text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_anam_pac   on public.anamneses(paciente_id, created_at desc);
create index if not exists idx_anam_token on public.anamneses(token);

drop trigger if exists trg_anam_mod_upd on public.anamnese_modelos;
create trigger trg_anam_mod_upd before update on public.anamnese_modelos
    for each row execute function public.set_updated_at();
drop trigger if exists trg_anam_upd on public.anamneses;
create trigger trg_anam_upd before update on public.anamneses
    for each row execute function public.set_updated_at();

alter table public.anamnese_modelos enable row level security;
alter table public.anamneses        enable row level security;

drop policy if exists anam_mod_select on public.anamnese_modelos;
create policy anam_mod_select on public.anamnese_modelos for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists anam_mod_escrita on public.anamnese_modelos;
create policy anam_mod_escrita on public.anamnese_modelos for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists anam_select on public.anamneses;
create policy anam_select on public.anamneses for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists anam_escrita on public.anamneses;
create policy anam_escrita on public.anamneses for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

-- A família não tem login. Se o anon tivesse policy de leitura, listaria todas as
-- anamneses. Ele só executa estas duas funções, que exigem o token.
create or replace function public.anamnese_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a record; m record; v_primeiro text;
begin
    select * into a from public.anamneses where token = p_token;
    if not found then return jsonb_build_object('erro','link_invalido'); end if;
    if a.expira_em is not null and a.expira_em < current_date then
        return jsonb_build_object('erro','link_expirado');
    end if;
    if a.status = 'revisada' then return jsonb_build_object('erro','ja_revisada'); end if;

    select * into m from public.anamnese_modelos where id = a.modelo_id;
    select split_part(nome_completo, ' ', 1) into v_primeiro
      from public.pacientes where id = a.paciente_id;

    if a.aberto_em is null then
        update public.anamneses set aberto_em = now(),
               status = case when status = 'enviada' then 'em_preenchimento' else status end
         where id = a.id;
    end if;

    return jsonb_build_object('ok', true, 'crianca', v_primeiro, 'modelo_nome', m.nome,
        'descricao', m.descricao, 'estrutura', m.estrutura,
        'respostas', a.respostas, 'status', a.status);
end $$;

create or replace function public.anamnese_salvar(p_token text, p_respostas jsonb, p_finalizar boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a record;
begin
    select * into a from public.anamneses where token = p_token;
    if not found then return jsonb_build_object('erro','link_invalido'); end if;
    if a.expira_em is not null and a.expira_em < current_date then
        return jsonb_build_object('erro','link_expirado');
    end if;
    if a.status = 'revisada' then return jsonb_build_object('erro','ja_revisada'); end if;

    update public.anamneses
       set respostas = p_respostas,
           status = case when p_finalizar then 'respondida' else 'em_preenchimento' end,
           respondido_em = case when p_finalizar then now() else respondido_em end
     where id = a.id;

    return jsonb_build_object('ok', true, 'finalizada', p_finalizar);
end $$;

revoke execute on function public.anamnese_abrir(text) from public;
revoke execute on function public.anamnese_salvar(text, jsonb, boolean) from public;
grant  execute on function public.anamnese_abrir(text) to anon, authenticated;
grant  execute on function public.anamnese_salvar(text, jsonb, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
