// ============================================================================
// CORTEX aba — Configurações do sistema
// ----------------------------------------------------------------------------
// Lê a tabela `configuracoes` uma vez por carregamento de página e guarda em
// memória. As telas consultam por chave, com valor padrão embutido — se o banco
// estiver fora do ar ou a chave não existir, nada quebra.
//
// Uso:
//   await EqConfig.carregar();
//   const dias = EqConfig.get('prazo_evolucao_dias', 2);
// ============================================================================

window.EqConfig = (function () {
    'use strict';

    const PADRAO = {
        clinica_nome: 'Equilibrium Med Center',
        clinica_setor: 'Setor ABA',
        clinica_telefone: '',
        sessao_duracao_padrao: 60,
        prazo_evolucao_dias: 2,
        janela_evolucao_dias: 7,
        faltas_para_tarefa: 2,
        inatividade_minutos: 0
    };

    let valores = null;
    let carregando = null;

    async function carregar(forcar) {
        if (valores && !forcar) return valores;
        if (carregando && !forcar) return carregando;

        carregando = (async function () {
            try {
                const { data, error } = await eqClient.from('configuracoes').select('chave, valor');
                if (error) throw error;
                const mapa = Object.assign({}, PADRAO);
                (data || []).forEach(c => { mapa[c.chave] = c.valor; });
                valores = mapa;
            } catch (e) {
                console.warn('CORTEX aba: configurações não carregadas, usando padrões', e);
                valores = Object.assign({}, PADRAO);
            }
            return valores;
        })();

        return carregando;
    }

    function get(chave, padrao) {
        if (valores && valores[chave] !== undefined && valores[chave] !== null) return valores[chave];
        if (PADRAO[chave] !== undefined) return PADRAO[chave];
        return padrao;
    }

    async function salvar(chave, valor, profId) {
        const { error } = await eqClient.from('configuracoes')
            .update({ valor: valor, atualizado_por: profId || null })
            .eq('chave', chave);
        if (error) throw error;
        if (valores) valores[chave] = valor;
    }

    return { carregar, get, salvar, PADRAO };
})();
