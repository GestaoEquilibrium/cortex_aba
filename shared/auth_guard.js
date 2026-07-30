// ============================================================================
// EQ ABA — Auth Guard
// ----------------------------------------------------------------------------
// Incluir em toda página autenticada, DEPOIS de supabase_client.js e tema.js.
// Faz, nesta ordem:
//   1. exige sessão válida
//   2. exige vínculo ativo em `profissionais` (conta órfã cai fora)
//   3. publica window.EqSessao { profissional, perfil, equipe }
//   4. aplica o tema do perfil (opção A)
//   5. dispara o evento 'eq:pronto' — as páginas só consultam depois disso
//   6. logout por inatividade (15 min), mesmo padrão do CORTEX
//
// Padrão anti-loop herdado do CORTEX (Sprint 37): antes de mandar para o login,
// SEMPRE chamar signOut(); senão o index detecta a sessão residual e devolve
// para a dashboard.
// ============================================================================

window.EqSessao = null;

(async function () {
    'use strict';

    if (!window.eqClient) {
        console.error('EQ ABA: eqClient não inicializado.');
        return;
    }

    // ── caminho até a raiz do app ───────────────────────────────────────────
    const partes = window.location.pathname.split('/').filter(Boolean);
    const pastas = ['pacientes','sessao','portal','agenda','programas','avaliacoes',
                    'graficos','comportamento','tarefas','relatorios','equipe','configuracoes'];
    let subir = 0;
    partes.forEach(p => { if (pastas.includes(p)) subir++; });
    const raiz = subir > 0 ? '../'.repeat(subir) : './';

    async function paraLogin(motivo, query) {
        console.warn('EQ ABA: ' + motivo);
        try { await window.eqClient.auth.signOut(); } catch (e) {}
        setTimeout(() => { window.location.href = raiz + 'index.html' + (query || ''); }, 50);
    }

    // ── inatividade (desligada por padrão — ver config.js) ──────────────────
    function monitorarInatividade() {
        const minutos = (typeof SUPABASE_CONFIG !== 'undefined' &&
                         typeof SUPABASE_CONFIG.inatividadeMinutos === 'number')
                        ? SUPABASE_CONFIG.inatividadeMinutos : 0;
        if (!minutos || minutos <= 0) return;   // 0 = não derruba ninguém

        const LIMITE = minutos * 60 * 1000;
        const KEY = 'eqaba_ultima_atividade';
        const ultima = () => {
            const v = sessionStorage.getItem(KEY);
            return v ? parseInt(v, 10) : Date.now();
        };
        const marcar = () => { try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) {} };

        if (Date.now() - ultima() >= LIMITE) { paraLogin('inatividade', '?timeout=1'); return; }
        marcar();

        let ultimaMarca = 0;
        const aoInteragir = () => {
            const n = Date.now();
            if (n - ultimaMarca > 5000) { ultimaMarca = n; marcar(); }
        };
        ['mousemove','mousedown','keydown','scroll','touchstart','click']
            .forEach(ev => window.addEventListener(ev, aoInteragir, { passive: true }));

        setInterval(() => {
            if (Date.now() - ultima() >= LIMITE) paraLogin('inatividade', '?timeout=1');
        }, 30000);
    }

    // ── verificação ─────────────────────────────────────────────────────────
    try {
        const { data: { session } } = await window.eqClient.auth.getSession();
        if (!session) { paraLogin('sem sessão'); return; }

        // Sem embed aqui de propósito. Existem duas FKs entre `profissionais` e
        // `equipes_aba` (profissionais.equipe_id e equipes_aba.coordenador_id), e o
        // PostgREST devolve PGRST201 se o embed não disser qual usar. Como esta é a
        // consulta que decide se a pessoa entra ou não, ela vai sem embed nenhum —
        // duas consultas simples em vez de uma frágil.
        const { data: prof, error } = await window.eqClient
            .from('profissionais')
            .select('id, nome_completo, email, perfil, turno, equipe_id, ativo, foto_url')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

        if (error) { console.error('EQ ABA: erro ao ler profissionais', error); }
        if (!prof)       { paraLogin('conta sem vínculo em profissionais'); return; }
        if (!prof.ativo) { paraLogin('profissional inativo'); return; }

        // Nome da equipe (opcional — falha aqui não impede o acesso)
        let equipe = null;
        if (prof.equipe_id) {
            try {
                const { data: eq } = await window.eqClient
                    .from('equipes_aba')
                    .select('id, nome, turno')
                    .eq('id', prof.equipe_id)
                    .maybeSingle();
                equipe = eq || null;
            } catch (e) { console.warn('EQ ABA: não foi possível ler a equipe', e); }
        }
        prof.equipe = equipe;

        window.EqSessao = {
            usuario: session.user,
            profissional: prof,
            perfil: prof.perfil,
            nome: prof.nome_completo,
            equipe: prof.equipe ? prof.equipe.nome : null,
            equipeId: prof.equipe_id
        };

        // link assinado da foto do próprio usuário (bucket privado)
        if (prof.foto_url && window.EqFotos) {
            try { window.EqSessao.fotoAssinada = await EqFotos.link(prof.foto_url); }
            catch (e) { console.warn('foto do usuário não carregada', e); }
        }

        if (window.EqTema) EqTema.aplicar(prof.perfil);

        monitorarInatividade();
        document.dispatchEvent(new CustomEvent('eq:pronto', { detail: window.EqSessao }));

    } catch (e) {
        console.error('EQ ABA: falha no auth guard', e);
        paraLogin('erro inesperado na verificação de sessão');
    }
})();
