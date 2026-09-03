// ============================================================================
// CORTEX aba - js/config.js
// Cole a chave anon (Dashboard > Settings > API > anon public)
// ============================================================================

const CORTEX_CONFIG = {
  SUPABASE_URL: 'https://fftmhjwnuvgzdaxpzwln.supabase.co',
  SUPABASE_ANON_KEY: 'COLE_AQUI_A_CHAVE_ANON'
};

const sb = window.supabase.createClient(
  CORTEX_CONFIG.SUPABASE_URL,
  CORTEX_CONFIG.SUPABASE_ANON_KEY
);
