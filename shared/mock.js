// ============================================================================
// EQ ABA — Dados fictícios (Sprint 0)
// ----------------------------------------------------------------------------
// Existe só para o esqueleto ser navegável antes do banco. Nenhum dado real
// de paciente ou de equipe entra aqui, em nenhuma hipótese.
// Sprint 1: cada bloco vira consulta ao Supabase e este arquivo é apagado.
// ============================================================================

window.EqMock = {

    usuario: {
        nome: 'Coordenação demo',
        perfil: 'coordenador_aba',
        equipe: 'turno tarde'
    },

    painel: {
        kpis: [
            { n: 7,  t: 'evoluções de ontem não lançadas', cor: 'var(--st-bad)' },
            { n: 3,  t: 'pacientes com 2 faltas seguidas',  cor: 'var(--st-warn)' },
            { n: 12, t: 'programas no critério de domínio', cor: 'var(--st-ok)' },
            { n: 5,  t: 'PEIs vencendo revisão neste mês',  cor: 'var(--acao)' }
        ],
        compliance: [
            { nome: 'Aplicadora A',  pct: 100 },
            { nome: 'Aplicadora B',  pct: 92 },
            { nome: 'Aplicador C',   pct: 64 },
            { nome: 'Estagiária D',  pct: 41 }
        ],
        tarefas: [
            { texto: 'Contatar responsável — duas faltas seguidas', prazo: 'hoje',   cor: 'var(--st-bad)' },
            { texto: 'Revisar PEI antes da reunião',                prazo: 'amanhã', cor: 'var(--st-warn)' },
            { texto: 'Supervisionar sessão da estagiária',          prazo: 'quinta', cor: 'var(--acao)' },
            { texto: 'Aprovar relatórios mensais',                  prazo: 'dia 5',  cor: 'var(--st-ok)' }
        ],
        agendaHoje: [
            { hora: '13h00', paciente: 'Théo',  aplicador: 'Aplicadora A', status: 'realizada' },
            { hora: '14h00', paciente: 'Lia',   aplicador: 'Aplicadora A', status: 'em andamento' },
            { hora: '14h00', paciente: 'Bento', aplicador: 'Aplicador C',  status: 'falta sem aviso' },
            { hora: '15h00', paciente: 'Íris',  aplicador: 'Estagiária D', status: 'agendada' },
            { hora: '16h00', paciente: 'Théo',  aplicador: 'Itinerante',   status: 'cobertura' }
        ]
    },

    pacientes: [
        { nome: 'Théo',  idade: '7 anos', aplicador: 'Aplicadora A', sessoes: '4x/semana', prog: 9,  faltas: 1, status: 'ativo' },
        { nome: 'Lia',   idade: '5 anos', aplicador: 'Aplicadora A', sessoes: '5x/semana', prog: 12, faltas: 0, status: 'ativo' },
        { nome: 'Bento', idade: '9 anos', aplicador: 'Aplicador C',  sessoes: '3x/semana', prog: 7,  faltas: 3, status: 'atenção' },
        { nome: 'Íris',  idade: '4 anos', aplicador: 'Estagiária D', sessoes: '2x/semana', prog: 5,  faltas: 0, status: 'ativo' },
        { nome: 'Noah',  idade: '6 anos', aplicador: '—',            sessoes: 'a definir',  prog: 0,  faltas: 0, status: 'fila de espera' }
    ],

    // Sessão do aplicador — programas do PEI do dia
    sessao: {
        paciente: 'Théo', hora: '14h00', duracao: '60 min', status: 'em andamento',
        seguranca: 'Alergia a amendoim · gatilho: mudança brusca de atividade · avisar 2 min antes da transição',
        programas: [
            { id:'p1', nome:'Nomear alimentos',        area:'expressiva', alvo:'banana',        tentativas:10, feitas:3, indep:1 },
            { id:'p2', nome:'Pedir ajuda (mando)',     area:'expressiva', alvo:'situação nova', tentativas:8,  feitas:8, indep:7 },
            { id:'p3', nome:'Seguir instrução de 2 passos', area:'receptiva', alvo:'guardar e sentar', tentativas:10, feitas:6, indep:4 },
            { id:'p4', nome:'Esperar a vez no jogo',   area:'social',     alvo:'jogo de mesa',  tentativas:6,  feitas:2, indep:1 }
        ]
    },

    areas: {
        receptiva:   { rotulo: 'Ling. receptiva',  cor: 'var(--area-receptiva)' },
        expressiva:  { rotulo: 'Ling. expressiva', cor: 'var(--area-expressiva)' },
        cognicao:    { rotulo: 'Cognição',         cor: 'var(--area-cognicao)' },
        motora:      { rotulo: 'Motricidade',      cor: 'var(--area-motora)' },
        social:      { rotulo: 'Socialização',     cor: 'var(--area-social)' },
        autocuidado: { rotulo: 'Autocuidado',      cor: 'var(--area-autocuidado)' }
    },

    portal: {
        crianca: 'Théo',
        atividade: 'Pedir escolha entre dois itens no lanche, 3 vezes ao dia.',
        relatorio: 'Relatório de julho · liberado pela coordenação',
        pendencias: 1
    }
};
