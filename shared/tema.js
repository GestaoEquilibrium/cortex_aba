// ============================================================================
// CORTEX aba — Tema por perfil (decisão: OPÇÃO A · três identidades)
// ----------------------------------------------------------------------------
//   coordenacao → verde e navy fechado
//   equipe      → quatro cores primárias  (aplicador, estagiário, itinerante)
//   familia     → espectro                (portal do responsável)
//
// Sprint 1: o perfil passa a vir de `profissionais.perfil` (window.EqSessao),
// preenchido pelo auth_guard. A querystring `?perfil=` continua funcionando
// apenas como pré-aplicação, para não haver piscada de cor antes do guard
// responder — e para as telas ainda sem banco.
//
// REGRA FIXADA NA DECISÃO (não alterar sem falar com o Wess):
//   as primárias do tema `equipe` valem para fundo, sidebar e ícones.
//   NÃO valem para botão de tentativa nem para gráfico de programa — ali
//   a cor tem significado clínico e é global (--st-* e --area-*).
// ============================================================================

window.EqTema = (function () {
    'use strict';

    const PERFIL_TEMA = {
        admin_direcao:       'coordenacao',
        coordenador_aba:     'coordenacao',
        supervisor_clinico:  'coordenacao',
        recepcao:            'coordenacao',
        aplicador:           'equipe',
        aplicador_itinerante:'equipe',
        estagiario_aba:      'equipe',
        responsavel:         'familia'
    };

    const ROTULO = {
        admin_direcao: 'direção',
        coordenador_aba: 'coordenação',
        supervisor_clinico: 'supervisão',
        recepcao: 'recepção',
        aplicador: 'aplicador',
        aplicador_itinerante: 'itinerante',
        estagiario_aba: 'estagiário',
        responsavel: 'responsável'
    };

    function perfilAtual() {
        if (window.EqSessao && window.EqSessao.perfil) return window.EqSessao.perfil;
        const url = new URLSearchParams(window.location.search);
        return url.get('perfil') || 'coordenador_aba';
    }

    function aplicar(perfil) {
        const p = perfil || perfilAtual();
        const tema = PERFIL_TEMA[p] || 'coordenacao';
        document.documentElement.setAttribute('data-tema', tema);
        document.documentElement.setAttribute('data-perfil', p);
        return { perfil: p, tema: tema, rotulo: ROTULO[p] || p };
    }

    function rotulo(perfil) { return ROTULO[perfil] || perfil; }

    aplicar();   // pré-aplica para não piscar

    return { aplicar, perfilAtual, rotulo, PERFIL_TEMA };
})();
