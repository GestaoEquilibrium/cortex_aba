// ============================================================================
// CORTEX aba — Cliente Supabase compartilhado
// Incluir DEPOIS do CDN do supabase-js e do config.js.
// ============================================================================

(function () {
    'use strict';

    if (typeof supabase === 'undefined') {
        console.error('CORTEX aba: supabase-js não carregado. Inclua o CDN antes deste script.');
        return;
    }
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('CORTEX aba: config.js não carregado. Inclua-o antes deste script.');
        return;
    }

    if (!window.eqClient) {
        window.eqClient = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            SUPABASE_CONFIG.options
        );
    }
})();
