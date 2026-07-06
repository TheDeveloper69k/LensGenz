window.LG = window.LG || {};

LG.getToken = async function getToken() {
  await LG.ready;
  const { data } = await LG.supabase.auth.getSession();
  return data.session?.access_token || null;
};

// `body` may be a plain object (sent as JSON) or a FormData instance (sent as-is, for uploads).
LG.api = async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  let payload = body;

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = await LG.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { method, headers, body: payload });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
};

LG.signOut = async function signOut() {
  await LG.ready;
  await LG.supabase.auth.signOut();
  window.location.href = '/login.html';
};
