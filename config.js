// ============================================================================
// EQ ABA — Configuração Supabase
// ----------------------------------------------------------------------------
// Projeto próprio: cortex_aba (South America / São Paulo), separado do CORTEX.
// A anon key é pública e segura no frontend PORQUE o RLS está ligado em todas
// as tabelas desde a primeira migration. Nunca colar aqui a service_role key.
// ============================================================================

const SUPABASE_CONFIG = {
    url: 'https://fftmhjwnuvgzdaxpzwln.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdG1oandudXZnemRheHB6d2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzkzMjgsImV4cCI6MjEwMDk1NTMyOH0.jG2q2iOo1DcpyZZSo6LiInzljqDaogdVH-5wTb5BhBk',

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

// `const` não vira propriedade de window — checar com typeof, nunca window.X
if (typeof SUPABASE_CONFIG === 'undefined' || SUPABASE_CONFIG.url.includes('SUBSTITUA')) {
    console.error('EQ ABA: config.js não preenchido.');
}
