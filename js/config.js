// ============================================================================
// CORTEX aba - js/config.js
// Cole a chave anon (Dashboard > Settings > API > anon public)
// ============================================================================

const CORTEX_CONFIG = {
  SUPABASE_URL: 'https://fftmhjwnuvgzdaxpzwln.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdG1oandudXZnemRheHB6d2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzkzMjgsImV4cCI6MjEwMDk1NTMyOH0.jG2q2iOo1DcpyZZSo6LiInzljqDaogdVH-5wTb5BhBk'
};

const sb = window.supabase.createClient(
  CORTEX_CONFIG.SUPABASE_URL,
  CORTEX_CONFIG.SUPABASE_ANON_KEY
);
