// ============================================================================
// CORTEX aba — Auth Guard do portal do responsável
// ----------------------------------------------------------------------------
// Separado do guard da equipe de propósito: responsável não tem linha em
// `profissionais`, e uma conta de família jamais deve passar pelo caminho que
// libera as telas clínicas.
//
// Publica window.EqFamilia = { usuario, responsavel, pacientes[] }
// e dispara 'eq:familia-pronto'.
// ============================================================================

window.EqFamilia = null;

(async function () {
    'use strict';

    if (!window.eqClient) { console.error('CORTEX aba: eqClient não inicializado.'); return; }

    async function paraLogin(motivo, query) {
        console.warn('CORTEX aba: ' + motivo);
        try { await window.eqClient.auth.signOut(); } catch (e) {}
        setTimeout(() => { window.location.href = '../index.html' + (query || ''); }, 50);
    }

    try {
        const { data: { session } } = await window.eqClient.auth.getSession();
        if (!session) { paraLogin('sem sessão'); return; }

        const { data: resp, error } = await window.eqClient
            .from('responsaveis')
            .select('id, nome, email, telefone, ativo')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

        if (error) console.error('CORTEX aba: erro ao ler responsaveis', error);

        if (!resp) {
            // pode ser alguém da equipe que caiu aqui por engano
            const { data: prof } = await window.eqClient
                .from('profissionais').select('id').eq('auth_user_id', session.user.id).maybeSingle();
            if (prof) { window.location.href = '../dashboard.html'; return; }
            paraLogin('conta sem vínculo de responsável');
            return;
        }
        if (!resp.ativo) { paraLogin('responsável inativo'); return; }

        const { data: vinculos } = await window.eqClient
            .from('responsaveis_pacientes')
            .select('parentesco, paciente:pacientes(id, nome_completo, data_nascimento, foto_url)')
            .eq('responsavel_id', resp.id);

        window.EqFamilia = {
            usuario: session.user,
            responsavel: resp,
            pacientes: (vinculos || []).map(v => Object.assign({}, v.paciente, { parentesco: v.parentesco }))
                                        .filter(p => p && p.id)
        };

        document.dispatchEvent(new CustomEvent('eq:familia-pronto', { detail: window.EqFamilia }));

    } catch (e) {
        console.error('CORTEX aba: falha no guard do portal', e);
        paraLogin('erro inesperado');
    }
})();
