// ============================================================================
// CORTEX aba — Auditoria
// ----------------------------------------------------------------------------
// Registra quem fez o quê, quando. Equivalente ao CortexAudit do CORTEX.
//
// Uso:
//   await EqAudit.registrar('edicao', 'pacientes', id, { campos: ['status'] });
//
// Princípio: auditoria NUNCA derruba a operação. Se a gravação do log falhar,
// o erro vai para o console e a ação do usuário segue normalmente — perder um
// registro de log é ruim, impedir o aplicador de lançar a sessão é pior.
//
// Ações em uso: 'criacao' | 'edicao' | 'exclusao' | 'status' | 'acesso' | 'exportacao'
// ============================================================================

window.EqAudit = (function () {
    'use strict';

    async function registrar(acao, tabela, registroId, detalhes) {
        try {
            if (!window.eqClient) return;
            const prof = window.EqSessao && window.EqSessao.profissional;
            if (!prof) return;

            const { error } = await eqClient.from('auditoria').insert({
                profissional_id: prof.id,
                acao: acao,
                tabela: tabela,
                registro_id: registroId || null,
                detalhes: detalhes || null,
                pagina: window.location.pathname.split('/').slice(-1)[0] || null
            });
            if (error) console.warn('CORTEX aba: auditoria não gravada', error);

        } catch (e) {
            console.warn('CORTEX aba: auditoria falhou', e);
        }
    }

    // Comparação simples para registrar só o que mudou de fato
    function camposAlterados(antes, depois) {
        const mudou = {};
        Object.keys(depois || {}).forEach(k => {
            if (JSON.stringify(antes ? antes[k] : undefined) !== JSON.stringify(depois[k])) {
                mudou[k] = { de: antes ? antes[k] : null, para: depois[k] };
            }
        });
        return mudou;
    }

    return { registrar, camposAlterados };
})();
