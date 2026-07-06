// Include right after supabaseClient.js + api.js on any page that requires a
// signed-in user. LG.requireAuth() also caches the profile as LG.profile.
window.LG = window.LG || {};

LG.requireAuth = async function requireAuth() {
  await LG.ready;
  if (!LG.session) {
    window.location.href = '/login.html';
    throw new Error('redirecting');
  }
  LG.profile = await LG.api('/api/profile/me');
  return LG.profile;
};

LG.requireAdmin = async function requireAdmin() {
  const profile = await LG.requireAuth();
  if (profile.role !== 'admin') {
    window.location.href = '/dashboard.html';
    throw new Error('redirecting');
  }
  return profile;
};
