// frontend/src/hooks/useAuth.js
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../api/client";
import { setCredentials, signOut } from "../features/auth/authSlice";

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/**
 * useAuth
 * -------
 * Single access point for everything authentication-related. Components
 * never talk to the auth slice or the API client directly.
 *
 * Usage:
 *   const { user, isAuthenticated, loading, error, login, logout } = useAuth();
 */
const useAuth = () => {
  const dispatch = useDispatch();

  // ── state from the store ───────────────────────────────────
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.accessToken);

  // ── request state local to the hook ────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === "admin";

  const clearError = useCallback(() => setError(null), []);

  /**
   * POST /auth/login
   * `credentials`: { email (or username), password }
   * On success the slice persists the token + user in localStorage.
   */
  const login = useCallback(
    async (credentials) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post("/auth/login", credentials);
        dispatch(
          setCredentials({
            user: data.data.user,
            accessToken: data.data.access_token,
          }),
        );
        return data.data.user;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to sign in."));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  /**
   * POST /auth/register
   * `payload`: { username, email, password }
   * The API does not return a token on registration, so the user stays
   * signed out and is redirected to login by the caller. If a future
   * backend version returns an access_token it is honoured automatically.
   */
  const register = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post("/auth/register", payload);
        // The API returns the bare user dict (no token) on registration.
        const accessToken = data.data.access_token ?? null;
        const user = data.data.user ?? data.data;
        if (accessToken) {
          dispatch(setCredentials({ user, accessToken }));
        }
        return user;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to create the account."));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  /** Clears the credentials from the store and localStorage. */
  const logout = useCallback(() => {
    dispatch(signOut());
    setError(null);
  }, [dispatch]);

  return {
    // state
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    // actions
    login,
    register,
    logout,
    clearError,
  };
};

export default useAuth;
