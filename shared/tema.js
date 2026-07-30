// ============================================================================
// EQ ABA — Tema por perfil (decisão: OPÇÃO A · três identidades)
// ----------------------------------------------------------------------------
//   coordenacao → verde e navy fechado
//   equipe      → quatro cores primárias  (aplicador, estagiário, itinerante)
//   familia     → espectro                (portal do responsável)
//
// O tema é escrito em <html data-tema="...">. Todo o CSS deriva dele.
//
// REGRA FIXADA NA DECISÃO (não alterar sem falar com o Wess):
//   as primárias do tema `equipe` valem para fundo, sidebar e ícones.
//   NÃO valem para botão de tentativa nem para gráfico de programa — ali
//   a cor tem significado clínico e é global (--st-* e --area-*).
// ============================================================================

window.EqTema = (function () {
    'use strict';

    const PERFIL_TEMA = {
        admin_direcao:      'coordenacao',
        coordenador_aba:    'coordenacao',
        supervisor_clinico: 'coordenacao',
        recepcao:           'coordenacao',
        aplicador:          'equipe',
        aplicador_itinerante:'equipe',
        estagiario_aba:     'equipe',
        responsavel:        'familia'
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
        // Sprint 0: sem banco ainda. O perfil vem da querystring (?perfil=)
        // para permitir navegar entre as três identidades.
        // Sprint 1: passa a vir de `profissionais.perfil` no Supabase.
        const url = new URLSearchParams(window.location.search);
        return url.get('perfil') || (window.EqMock && EqMock.usuario.perfil) || 'coordenador_aba';
    }

    function aplicar(perfil) {
        const p = perfil || perfilAtual();
        const tema = PERFIL_TEMA[p] || 'coordenacao';
        document.documentElement.setAttribute('data-tema', tema);
        document.documentElement.setAttribute('data-perfil', p);
        return { perfil: p, tema: tema, rotulo: ROTULO[p] || p };
    }

    function rotulo(perfil) { return ROTULO[perfil] || perfil; }

    // Aplica o quanto antes, para não haver "piscada" de cor no carregamento.
    aplicar();

    return { aplicar, perfilAtual, rotulo, PERFIL_TEMA };
})();
