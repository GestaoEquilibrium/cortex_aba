// ============================================================================
// EQ ABA — Configuração Supabase
// ----------------------------------------------------------------------------
// Projeto PRÓPRIO, separado do CORTEX (isolamento LGPD e volume de dados).
// Preencher com Project Settings → API do projeto novo.
// A anon key é pública e segura no frontend porque o RLS protege os dados.
// NUNCA colar aqui a service_role key.
//
// Sprint 0 não usa este arquivo — as telas rodam com shared/mock.js.
// Sprint 1 liga a autenticação e as consultas.
// ============================================================================

const SUPABASE_CONFIG = {
    url: 'https://SUBSTITUA-AQUI.supabase.co',
    anonKey: 'SUBSTITUA-AQUI',

    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            // Mesmo padrão do CORTEX (Sprint 81): sessão presa à aba.
            storage: window.sessionStorage
        }
    }
};

if (SUPABASE_CONFIG.url.includes('SUBSTITUA-AQUI')) {
    console.warn('EQ ABA: config.js ainda com placeholder — normal no Sprint 0.');
}
