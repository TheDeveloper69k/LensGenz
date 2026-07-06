// Loaded after the Supabase UMD script. Fetches the public URL/anon key from our
// own server (server/index.js -> GET /api/config) so no secrets are hardcoded here.
window.LG = window.LG || {};

LG.ready = (async function initSupabase() {
  const res = await fetch('/api/config');
  const { supabaseUrl, supabaseAnonKey } = await res.json();
  LG.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await LG.supabase.auth.getSession();
  LG.session = data.session || null;
  LG.supabase.auth.onAuthStateChange((_event, session) => {
    LG.session = session;
    document.dispatchEvent(new CustomEvent('lg:auth-change', { detail: session }));
  });
  return LG.supabase;
})();
