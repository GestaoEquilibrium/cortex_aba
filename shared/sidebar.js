// ============================================================================
// CORTEX aba — Sidebar
// Chrome copiado do CORTEX (badge do logo, sino, recolher, item ativo em pílula
// branca, cartão do usuário no rodapé). Estrutura e permissões são do ABA:
// menu próprio, agrupado em Clínico e Gestão, filtrado por perfil.
//
// Uso:  <div id="sidebar"></div>  →  EqSidebar.render('painel');
// ============================================================================

window.EqSidebar = (function () {
    'use strict';

    const CHAVE_RECOLHIDA = 'eqaba_sidebar_recolhida';

    const ITENS = [
        { id:'painel',    label:'Dashboard',  href:'dashboard.html',        perfis:'*',
          icon:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },

        { id:'pacientes', label:'Pacientes',  href:'pacientes/lista.html',  perfis:'*',
          icon:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.5-6 7-6s7 2 7 6"/>' },

        { id:'agenda',    label:'Agenda',     href:'agenda/agenda.html',    perfis:'*',
          icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },

        { id:'sessao',    label:'Sessão de hoje', href:'sessao/sessao.html',
          perfis:['aplicador','aplicador_itinerante','estagiario_aba','coordenador_aba','admin_direcao'],
          icon:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },

        { grupo:'Clínico' },

        { id:'programas', label:'Programas',  href:'programas/biblioteca.html',
          perfis:['coordenador_aba','supervisor_clinico','admin_direcao','aplicador','estagiario_aba'],
          icon:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>' },

        { id:'avaliacoes',label:'Avaliações', href:'avaliacoes/lista.html',
          perfis:['coordenador_aba','supervisor_clinico','admin_direcao'],
          icon:'<path d="M5 4h14v17H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>' },

        { id:'graficos',  label:'Gráficos',   href:'graficos/index.html',   perfis:'*',
          icon:'<path d="M4 19V5M4 19h16"/><path d="M8 15l4-5 3 3 5-7"/>' },

        { id:'comportamento', label:'Comportamento', href:'comportamento/index.html',
          perfis:['coordenador_aba','supervisor_clinico','admin_direcao','aplicador'],
          icon:'<path d="M12 3l9 17H3z"/><path d="M12 9v5M12 17h.01"/>' },

        { grupo:'Gestão' },

        { id:'tarefas',   label:'Tarefas',    href:'tarefas/index.html',    perfis:'*',
          icon:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>' },

        { id:'indicadores', label:'Indicadores', href:'indicadores/index.html',
          perfis:['admin_direcao','supervisor_clinico','coordenador_aba'],
          icon:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },

        { id:'relatorios',label:'Relatórios', href:'relatorios/index.html',
          perfis:['coordenador_aba','supervisor_clinico','admin_direcao'],
          icon:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>' },

        { id:'auditoria', label:'Auditoria',  href:'auditoria/index.html',
          perfis:['coordenador_aba','supervisor_clinico','admin_direcao'],
          icon:'<path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"/><path d="M9 12l2 2 4-4"/>' },

        { id:'equipe',    label:'Equipe',     href:'equipe/index.html',
          perfis:['coordenador_aba','admin_direcao'],
          icon:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/>' },

        { id:'config',    label:'Configurações', href:'configuracoes/index.html', perfis:['admin_direcao'],
          icon:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' }
    ];

    const LOGO = `<svg width="19" height="19" viewBox="0 0 32 32" aria-hidden="true">
        <g stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linecap="round">
            <line x1="16" y1="16" x2="9"  y2="9"/><line x1="16" y1="16" x2="23" y2="9"/>
            <line x1="16" y1="16" x2="9"  y2="23"/><line x1="16" y1="16" x2="23" y2="23"/>
            <line x1="16" y1="16" x2="16" y2="7"/><line x1="16" y1="16" x2="16" y2="25"/>
            <circle cx="16" cy="16" r="2.8" stroke="none"/>
            <circle cx="9" cy="9" r="1.6" stroke="none"/><circle cx="23" cy="9" r="1.6" stroke="none"/>
            <circle cx="9" cy="23" r="1.6" stroke="none"/><circle cx="23" cy="23" r="1.6" stroke="none"/>
            <circle cx="16" cy="7" r="1.4" stroke="none"/><circle cx="16" cy="25" r="1.4" stroke="none"/>
        </g></svg>`;

    const PASTAS = ['pacientes','sessao','portal','agenda','programas','avaliacoes',
                    'graficos','comportamento','tarefas','relatorios','equipe','configuracoes','auditoria','indicadores'];

    function caminho(href) {
        const partes = window.location.pathname.split('/').filter(Boolean);
        let subir = 0;
        partes.forEach(p => { if (PASTAS.includes(p)) subir++; });
        return '../'.repeat(subir) + href;
    }

    function podeVer(item, perfil) {
        if (item.perfis === '*') return true;
        return Array.isArray(item.perfis) && item.perfis.includes(perfil);
    }

    function iniciais(nome) {
        const p = (nome || '').trim().split(/\s+/);
        if (!p[0]) return '?';
        return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    }

    function estaRecolhida() {
        try { return localStorage.getItem(CHAVE_RECOLHIDA) === '1'; } catch (e) { return false; }
    }

    function aplicarLargura(recolhida) {
        document.documentElement.style.setProperty('--sidebar-width', recolhida ? '78px' : '248px');
    }

    // ── modo claro / escuro ────────────────────────────────────────────────
    const CHAVE_MODO = 'eqaba_modo';

    function modoAtual() {
        try {
            const salvo = localStorage.getItem(CHAVE_MODO);
            if (salvo === 'claro' || salvo === 'escuro') return salvo;
        } catch (e) {}
        // sem preferência salva, segue o sistema operacional
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
               ? 'escuro' : 'claro';
    }

    function aplicarModo(modo) {
        document.documentElement.setAttribute('data-modo', modo);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', modo === 'escuro' ? '#0C1420' : '#0F766E');
    }

    function alternarModo() {
        const novo = modoAtual() === 'escuro' ? 'claro' : 'escuro';
        try { localStorage.setItem(CHAVE_MODO, novo); } catch (e) {}
        aplicarModo(novo);
        const nav = document.getElementById('eqSidebar');
        if (nav) {
            const casca = document.createElement('div');
            casca.id = 'sidebar';
            nav.replaceWith(casca);
            render(window.__eqAtivo);
        }
    }

    function render(ativo) {
        const alvo = document.getElementById('sidebar');
        if (!alvo) return;

        const s       = window.EqSessao || {};
        const perfil  = s.perfil || (window.EqTema ? EqTema.perfilAtual() : 'coordenador_aba');
        const rotulo  = window.EqTema ? EqTema.rotulo(perfil) : perfil;
        const nome    = s.nome || '—';
        const foto    = s.fotoAssinada || null;
        const recolhida = estaRecolhida();
        const modo = modoAtual();
        aplicarLargura(recolhida);

        let html = `<nav class="sidebar${recolhida ? ' recolhida' : ''}" id="eqSidebar" aria-label="Menu principal">
            <div class="sidebar-topo">
                <div class="sidebar-badge">${LOGO}</div>
                <div class="sidebar-marca">CORTEX <span class="aba">aba</span></div>
                <button class="sidebar-bt" id="btSino" type="button" title="Avisos"
                        onclick="EqSidebar.avisos()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
                        <path d="M18 15v-5a6 6 0 1 0-12 0v5l-1.5 2h15z"/><path d="M10 20h4"/>
                    </svg>
                </button>
                <button class="sidebar-bt" id="btModo" type="button" title="Alternar claro e escuro"
                        onclick="EqSidebar.alternarModo()">
                    ${modo === 'escuro'
                      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
                            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`
                      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
                            <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>`}
                </button>
                <button class="sidebar-bt" type="button" title="Recolher menu"
                        onclick="EqSidebar.recolher()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                        <path d="${recolhida ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}"/>
                    </svg>
                </button>
            </div>
            <div class="sidebar-nav">`;

        let grupoPendente = null;
        ITENS.forEach(item => {
            if (item.grupo) { grupoPendente = item.grupo; return; }
            if (!podeVer(item, perfil)) return;
            if (grupoPendente) {
                html += `<div class="sidebar-grupo">${grupoPendente}</div>`;
                grupoPendente = null;
            }
            html += `<a class="sidebar-item ${item.id === ativo ? 'ativo' : ''}"
                        href="${caminho(item.href)}" title="${item.label}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
                     stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
                <span>${item.label}</span></a>`;
        });

        html += `</div>
            <div class="sidebar-usuario">
                ${foto
                    ? `<img class="sidebar-avatar" src="${foto}" alt="">`
                    : `<div class="sidebar-avatar">${iniciais(nome)}</div>`}
                <div class="sidebar-dados">
                    <b title="${nome}">${nome}</b>
                    <span>${rotulo}${s.equipe ? ' · ' + s.equipe : ''}</span>
                </div>
                <button class="sidebar-bt" type="button" title="Sair" onclick="EqSidebar.sair()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </button>
            </div>
        </nav>`;

        alvo.outerHTML = html;
        window.__eqAtivo = ativo;
    }

    function recolher() {
        const nova = !estaRecolhida();
        try { localStorage.setItem(CHAVE_RECOLHIDA, nova ? '1' : '0'); } catch (e) {}
        const nav = document.getElementById('eqSidebar');
        if (nav) {
            const casca = document.createElement('div');
            casca.id = 'sidebar';
            nav.replaceWith(casca);
            render(window.__eqAtivo);
        }
    }

    function avisos() {
        // Sprint de tarefas liga isto às pendências reais (evoluções, faltas, PEIs).
        if (window.EqConfirm) {
            EqConfirm.mostrar({
                titulo: 'Avisos',
                texto: 'A central de avisos entra junto com as tarefas: evoluções pendentes, faltas seguidas e PEIs a vencer.',
                confirmar: 'Fechar', cancelar: 'Fechar', tipo: 'padrao'
            });
        }
    }

    async function sair() {
        if (window.EqConfirm) {
            const ok = await EqConfirm.mostrar({
                titulo: 'Sair do sistema?',
                texto: 'Você precisará entrar de novo com e-mail e senha.',
                confirmar: 'Sair', tipo: 'alerta'
            });
            if (!ok) return;
        }
        try { if (window.EqAudit) await EqAudit.registrar('acesso', 'auth', null, { evento: 'saida' }); } catch (e) {}
        try { if (window.eqClient) await eqClient.auth.signOut(); } catch (e) {}
        try { sessionStorage.removeItem('eqaba_ultima_atividade'); } catch (e) {}
        window.location.href = caminho('index.html');
    }

    // largura e modo corretos desde o primeiro pixel, antes de o guard responder
    aplicarLargura(estaRecolhida());
    aplicarModo(modoAtual());

    return { render, recolher, avisos, sair, alternarModo, modoAtual, ITENS };
})();
