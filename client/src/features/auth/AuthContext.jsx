import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../../api/client.js';

const AuthContext = createContext(null);

// Loads the current session once on mount (GET /api/auth/me relies on the httpOnly cookie),
// so refresh/second-tab keeps the user signed in. status distinguishes "still checking" from
// "checked, nobody's signed in" - routing guards need that to avoid a flash of the login page.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setStatus('ready'));
  }, []);

  // Any other call getting a 401 means a session that WAS valid just stopped being (expired,
  // or the account was reset) - clearing user here lets RequireAuth's existing redirect send
  // the student/teacher/admin back to /login instead of leaving them stuck on a dead screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
