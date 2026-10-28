/*
 * Test-only authentication helper for container-checklist-test.
 * Uses the Supabase publishable key only. Never place service_role keys in browser code.
 */
(function () {
  'use strict';
  const URL = 'https://nvmhdvmwwxsfvhdmopyh.supabase.co';
  const KEY = 'sb_publishable_xTrQflkrs7S01k1GfFExvw_9RDURAS5';
  const SESSION_KEY = 'ctr-auth-v2';
  const EMAIL_SUFFIX = '@users.container-checklist.invalid';
  const nativeFetch = window.fetch.bind(window);

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function writeSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    // Clear the legacy marker so it cannot be mistaken for a valid login.
    sessionStorage.removeItem('ctr-auth');
    localStorage.removeItem('ctr-auth');
  }
  async function refreshIfNeeded() {
    let s = readSession();
    if (!s || !s.refresh_token || !s.access_token) return s;
    if (Number(s.expires_at || 0) > Math.floor(Date.now() / 1000) + 60) return s;
    const r = await nativeFetch(URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    });
    if (!r.ok) { clearSession(); return null; }
    const data = await r.json();
    s = { ...s, access_token: data.access_token, refresh_token: data.refresh_token || s.refresh_token,
      expires_at: data.expires_at || (Math.floor(Date.now()/1000) + (data.expires_in || 3600)),
      userId: data.user?.id || s.userId };
    writeSession(s);
    return s;
  }

  // Existing pages use direct REST fetch calls. Inject the test project's publishable key
  // and the current Auth access token only for this project's requests.
  window.fetch = async function (input, init) {
    let url = '';
    try { url = typeof input === 'string' ? input : input.url; } catch (_) {}
    if (!url || !url.startsWith(URL + '/')) return nativeFetch(input, init);
    const options = { ...(init || {}) };
    const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('apikey', KEY);
    if (url.includes('/rest/v1/') || url.includes('/auth/v1/user')) {
      const s = await refreshIfNeeded();
      if (s?.access_token) headers.set('Authorization', 'Bearer ' + s.access_token);
      else headers.delete('Authorization');
    }
    options.headers = headers;
    return nativeFetch(input, options);
  };

  async function login(username, password) {
    const normalized = String(username || '').trim().toLowerCase();
    if (!normalized || !password) throw new Error('請輸入帳號和密碼');
    const email = normalized.includes('@') ? normalized : normalized + EMAIL_SUFFIX;
    const res = await nativeFetch(URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token || !data.user?.id) throw new Error('帳號或密碼錯誤，或測試帳號尚未確認');
    const profileRes = await nativeFetch(URL + '/rest/v1/profiles?select=id,username,display_name,role&id=eq.' + encodeURIComponent(data.user.id), {
      headers: { apikey: KEY, Authorization: 'Bearer ' + data.access_token }
    });
    const profiles = await profileRes.json().catch(() => []);
    if (!profileRes.ok || !profiles.length) {
      await nativeFetch(URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + data.access_token } }).catch(() => {});
      throw new Error('帳號尚未設定系統角色，請聯絡管理者');
    }
    const profile = profiles[0];
    if (profile.username !== normalized.replace(/@users\.container-checklist\.invalid$/, '')) {
      throw new Error('登入帳號與系統角色資料不一致');
    }
    const session = {
      username: profile.username, displayName: profile.display_name || profile.username,
      role: profile.role, userId: data.user.id, access_token: data.access_token,
      refresh_token: data.refresh_token, expires_at: data.expires_at || (Math.floor(Date.now()/1000)+(data.expires_in||3600)),
      loginAt: new Date().toISOString()
    };
    writeSession(session);
    return session;
  }

  function requireRoles(roles, loginPage) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const s = readSession();
    if (!s || !s.access_token || !s.userId) {
      window.location.replace(loginPage || 'index.html');
      return null;
    }
    if (!allowedRoles.includes(s.role)) {
      window.location.replace(s.role === 'field' ? 'container-checklist.html' : 'console.html');
      return null;
    }
    window._currentUser = s.username;
    window._currentRole = s.role;
    return s;
  }

  function requireRole(role, loginPage) {
    return requireRoles([role], loginPage);
  }

  async function logout(redirect) {
    const s = readSession();
    if (s?.access_token) {
      try { await nativeFetch(URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token } }); } catch (_) {}
    }
    clearSession();
    window.location.replace(redirect || 'index.html');
  }

  async function changePassword(oldPassword, newPassword) {
    const current = readSession();
    if (!current) throw new Error('登入狀態已失效，請重新登入');
    const verified = await login(current.username, oldPassword);
    if (verified.userId !== current.userId) throw new Error('目前密碼輸入錯誤');
    const s = readSession();
    const r = await nativeFetch(URL + '/auth/v1/user', {
      method: 'PUT', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || body.msg || '密碼更新失敗');
    return true;
  }

  window.CTRAuth = { login, requireRole, requireRoles, logout, changePassword, readSession, clearSession, URL, KEY };
})();
