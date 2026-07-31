-- ============================================================================
-- CORTEX aba — 11 · configurações do sistema
-- ============================================================================
create table if not exists public.configuracoes (
    chave          text primary key,
    valor          jsonb not null,
    descricao      text,
    grupo          text not null default 'geral',
    atualizado_por uuid references public.profissionais(id) on delete set null,
    updated_at     timestamptz not null default now()
);

drop trigger if exists trg_cfg_upd on public.configuracoes;
create trigger trg_cfg_upd before update on public.configuracoes
    for each row execute function public.set_updated_at();

alter table public.configuracoes enable row level security;

drop policy if exists cfg_select on public.configuracoes;
create policy cfg_select on public.configuracoes for select to authenticated
using (public.eq_prof_id() is not null);

drop policy if exists cfg_escrita on public.configuracoes;
create policy cfg_escrita on public.configuracoes for all to authenticated
using  (public.eq_perfil() = 'admin_direcao') with check (public.eq_perfil() = 'admin_direcao');

insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('clinica_nome',          '"Equilibrium Med Center"'::jsonb, 'Nome nos relatórios', 'clinica'),
    ('clinica_setor',         '"Setor ABA"'::jsonb,              'Setor no cabeçalho', 'clinica'),
    ('clinica_telefone',      '""'::jsonb,                       'Telefone de contato', 'clinica'),
    ('sessao_duracao_padrao', '60'::jsonb,                       'Duração padrão da sessão (min)', 'operacao'),
    ('prazo_evolucao_dias',   '2'::jsonb,                        'Prazo para lançar evolução', 'operacao'),
    ('janela_evolucao_dias',  '7'::jsonb,                        'Janela do painel', 'operacao'),
    ('faltas_para_tarefa',    '2'::jsonb,                        'Faltas seguidas que geram tarefa', 'operacao'),
    ('inatividade_minutos',   '0'::jsonb,                        'Minutos até derrubar sessão (0 = desligado)', 'seguranca')
on conflict (chave) do nothing;

notify pgrst, 'reload schema';
