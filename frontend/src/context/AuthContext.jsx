import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'fitbitStrengthToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearAuthSession = () => {
    clearAuthSession();
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await authService.getCurrentUser();
        setUser(data.user);
      } catch (error) {
        clearAuthSession();
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthSession();
      setLoading(false);
    };

    window.addEventListener('fitbit-strength:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('fitbit-strength:unauthorized', handleUnauthorized);
    };
  }, []);

  const setAuthSession = (authData) => {
    setUser(authData.user || null);
    setToken(authData.token);
    localStorage.setItem(TOKEN_KEY, authData.token);
  };

  const register = async (userData) => {
    const authData = await authService.register(userData);
    setAuthSession(authData);
    return authData;
  };

  const login = async (credentials) => {
    const authData = await authService.login(credentials);
    setAuthSession(authData);
    return authData;
  };

  const updateProfile = async (profileData) => {
    const data = await authService.updateProfile(profileData);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Token-based logout is completed client-side even if the server request fails.
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      register,
      login,
      logout,
      updateProfile,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
