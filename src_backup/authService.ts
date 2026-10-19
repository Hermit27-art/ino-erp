// src/authService.ts
// ============================================================
// Audit Fix (C1): Auth pindah sepenuhnya ke server (GAS).
// Klien hanya hash password sebelum kirim, lalu simpan token di sessionStorage.
// ============================================================

declare var google: any;
const isGasEnv = () => typeof google !== 'undefined' && typeof google.script !== 'undefined';

const SESSION_TOKEN_KEY = 'ino_session_token';
const SESSION_USER_KEY = 'ino_session_user';

export interface SessionUser {
  username: string;
  nama: string;
  role: 'Superadmin' | 'Admin' | 'Kasir';
}

export interface LoginResult {
  ok: boolean;
  token?: string;
  user?: SessionUser;
  error?: string;
}

/**
 * Hash password di sisi klien (SHA-256) sebelum kirim ke server.
 * Server menyimpan hash, bukan plaintext.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Login ke server GAS. Server memverifikasi credential dan mengembalikan session token.
 * Token disimpan di sessionStorage (hilang saat tab ditutup = lebih aman dari localStorage).
 */
export const loginToServer = async (username: string, password?: string): Promise<LoginResult> => {
  const passwordHash = await hashPassword((password || '').trim());

  if (isGasEnv()) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok && result.token) {
            sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
            sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(result.user));
            resolve(result);
          } else {
            resolve(result);
          }
        })
        .withFailureHandler((error: any) => {
          reject(new Error(error?.message || 'Login gagal.'));
        })
        .login(username.trim().toLowerCase(), passwordHash);
    });
  }

  // Fallback local dev: simulasi login berhasil tanpa server
  const localUsers = JSON.parse(localStorage.getItem('ino_setting_users') || '[]');
  const superUser = localStorage.getItem('ino_login_username') || '';
  const superPass = localStorage.getItem('ino_login_password') || '';

  const inputUser = username.trim().toLowerCase();

  // Cek superadmin
  if (inputUser === superUser.trim().toLowerCase() && passwordHash === superPass.trim()) {
    const fakeToken = crypto.randomUUID();
    const user: SessionUser = { username: inputUser, nama: 'Superadmin', role: 'Superadmin' };
    sessionStorage.setItem(SESSION_TOKEN_KEY, fakeToken);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    return { ok: true, token: fakeToken, user };
  }

  // Cek team members
  const matched = localUsers.find(
    (u: any) => 
      u.email && u.email.trim().toLowerCase() === inputUser &&
      u.pin && u.pin.trim() === passwordHash
  );

  if (matched) {
    const fakeToken = crypto.randomUUID();
    const user: SessionUser = { username: matched.email, nama: matched.nama || '', role: matched.role || 'Kasir' };
    sessionStorage.setItem(SESSION_TOKEN_KEY, fakeToken);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    return { ok: true, token: fakeToken, user };
  }

  return { ok: false, error: 'Email / Username atau password salah.' };
};

/**
 * Ambil session token yang tersimpan.
 */
export const getSessionToken = (): string | null => {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
};

/**
 * Ambil info user yang sedang login.
 */
export const getSessionUser = (): SessionUser | null => {
  const raw = sessionStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Validasi session masih aktif di server.
 */
export const validateCurrentSession = async (): Promise<{ ok: boolean; user?: SessionUser }> => {
  const token = getSessionToken();
  if (!token) return { ok: false };

  if (isGasEnv()) {
    return new Promise((resolve) => {
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok && result.user) {
            sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(result.user));
            resolve(result);
          } else {
            // Session expired — cleanup
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(SESSION_USER_KEY);
            resolve({ ok: false });
          }
        })
        .withFailureHandler(() => {
          resolve({ ok: false });
        })
        .validateSession(token);
    });
  }

  // Local dev: session always valid if token exists
  const user = getSessionUser();
  return user ? { ok: true, user } : { ok: false };
};

/**
 * Logout — invalidate token di server dan hapus dari sessionStorage.
 */
export const logoutFromServer = async (): Promise<void> => {
  const token = getSessionToken();

  if (isGasEnv() && token) {
    await new Promise<void>((resolve) => {
      google.script.run
        .withSuccessHandler(() => resolve())
        .withFailureHandler(() => resolve()) // Logout should not fail even if server errors
        .logoutSession(token);
    });
  }

  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
};
