// ============================================================================
// EQ ABA — Sidebar
// Mesma mecânica do CORTEX (render por id do item ativo), com o menu do ABA
// e filtragem por perfil.
//
// Uso:
//   <div id="sidebar"></div>
//   <script src="shared/sidebar.js"></script>
//   EqSidebar.render('painel');
// ============================================================================

window.EqSidebar = (function () {
    'use strict';

    const ITENS = [
        { id:'painel',    label:'Painel',     href:'dashboard.html',        perfis:'*',
          icon:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },

        { id:'pacientes', label:'Pacientes',  href:'pacientes/lista.html',  perfis:'*',
          icon:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.5-6 7-6s7 2 7 6"/>' },

        { id:'agenda',    label:'Agenda',     href:'agenda/agenda.html',    perfis:'*',
          icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },

        { id:'sessao',    label:'Sessão de hoje', href:'sessao/sessao.html', perfis:['aplicador','aplicador_itinerante','estagiario_aba','coordenador_aba','admin_direcao'],
          icon:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },

        { grupo:'Clínico' },

        { id:'programas', label:'Programas',  href:'programas/biblioteca.html', perfis:['coordenador_aba','supervisor_clinico','admin_direcao','aplicador','estagiario_aba'],
          icon:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>' },

        { id:'avaliacoes',label:'Avaliações', href:'avaliacoes/lista.html', perfis:['coordenador_aba','supervisor_clinico','admin_direcao'],
          icon:'<path d="M5 4h14v17H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>' },

        { id:'graficos',  label:'Gráficos',   href:'graficos/index.html',   perfis:'*',
          icon:'<path d="M4 19V5M4 19h16"/><path d="M8 15l4-5 3 3 5-7"/>' },

        { id:'comportamento', label:'Comportamento', href:'comportamento/index.html', perfis:['coordenador_aba','supervisor_clinico','admin_direcao','aplicador'],
          icon:'<path d="M12 3l9 17H3z"/><path d="M12 9v5M12 17h.01"/>' },

        { grupo:'Gestão' },

        { id:'tarefas',   label:'Tarefas',    href:'tarefas/index.html',    perfis:'*',
          icon:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>' },

        { id:'relatorios',label:'Relatórios', href:'relatorios/index.html', perfis:['coordenador_aba','supervisor_clinico','admin_direcao'],
          icon:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>' },

        { id:'equipe',    label:'Equipe',     href:'equipe/index.html',     perfis:['coordenador_aba','admin_direcao'],
          icon:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/>' },

        { id:'config',    label:'Configurações', href:'configuracoes/index.html', perfis:['admin_direcao'],
          icon:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' }
    ];

    const LOGO = `<svg width="17" height="17" viewBox="0 0 100 100" aria-hidden="true">
        <g stroke="currentColor" stroke-width="11" stroke-linecap="round">
            <line x1="50" y1="12" x2="50" y2="88"/>
            <line x1="17" y1="31" x2="83" y2="69"/>
            <line x1="17" y1="69" x2="83" y2="31"/>
        </g></svg>`;

    // Ajusta o href conforme a profundidade da página atual dentro da raiz.
    function caminho(href) {
        const partes = window.location.pathname.split('/').filter(Boolean);
        const idx = partes.findIndex(p => p.endsWith('.html'));
        const nivel = idx === -1 ? 0 : idx;            // 0 = raiz
        const raizPastas = ['pacientes','sessao','portal','agenda','programas','avaliacoes',
                            'graficos','comportamento','tarefas','relatorios','equipe','configuracoes'];
        let subir = 0;
        partes.forEach(p => { if (raizPastas.includes(p)) subir++; });
        return '../'.repeat(subir) + href;
    }

    function podeVer(item, perfil) {
        if (item.perfis === '*') return true;
        return Array.isArray(item.perfis) && item.perfis.includes(perfil);
    }

    function render(ativo, opcoes) {
        const alvo = document.getElementById('sidebar');
        if (!alvo) return;

        const usuario = (opcoes && opcoes.usuario) || (window.EqMock ? EqMock.usuario : null) || {};
        const perfil  = (window.EqTema ? EqTema.perfilAtual() : 'coordenador_aba');
        const rotulo  = window.EqTema ? EqTema.rotulo(perfil) : perfil;

        let html = `<nav class="sidebar" aria-label="Menu principal">
            <div class="sidebar-brand">${LOGO} EQ ABA</div>
            <div class="sidebar-nav">`;

        let grupoPendente = null;
        ITENS.forEach(item => {
            if (item.grupo) { grupoPendente = item.grupo; return; }
            if (!podeVer(item, perfil)) return;
            if (grupoPendente) {
                html += `<div class="sidebar-grupo">${grupoPendente}</div>`;
                grupoPendente = null;
            }
            const url = caminho(item.href) + '?perfil=' + encodeURIComponent(perfil);
            html += `<a class="sidebar-item ${item.id === ativo ? 'ativo' : ''}" href="${url}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
                     stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
                <span>${item.label}</span></a>`;
        });

        html += `</div>
            <div class="sidebar-rodape">
                <b>${usuario.nome || 'Usuária demo'}</b>
                ${rotulo}${usuario.equipe ? ' · ' + usuario.equipe : ''}
                <button class="sidebar-sair" type="button" onclick="EqSidebar.sair()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg> Sair
                </button>
            </div>
        </nav>`;

        alvo.outerHTML = html;
    }

    function sair() {
        // Sprint 1: supabaseClient.auth.signOut()
        window.location.href = caminho('index.html');
    }

    return { render, sair, ITENS };
})();
