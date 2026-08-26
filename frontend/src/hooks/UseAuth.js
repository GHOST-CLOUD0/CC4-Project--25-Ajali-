// frontend/src/hooks/useAuth.js
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUser,
  selectToken,
  selectAuthLoading,
  selectAuthError,
  login,
  register,
  logout,
  clearError,
} from '../features/auth/authSlice';

/**
 * useAuth
 * -------
 * Centralises every auth-related selector + action so components
 * never import the slice directly.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
const useAuth = () => {
  const dispatch = useDispatch();

  // ── selectors ──────────────────────────────────────────────
  const user = useSelector(selectUser);
  const token = useSelector(selectToken);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = Boolean(token && user);

  // ── actions ────────────────────────────────────────────────
  const handleLogin = useCallback(
    (credentials) => dispatch(login(credentials)).unwrap(),
    [dispatch],
  );

  const handleRegister = useCallback(
    (userData) => dispatch(register(userData)).unwrap(),
    [dispatch],
  );

  const handleLogout = useCallback(
    () => dispatch(logout()),
    [dispatch],
  );

  const handleClearError = useCallback(
    () => dispatch(clearError()),
    [dispatch],
  );

  return {
    // state
    user,
    token,
    loading,
    error,
    isAuthenticated,
    // actions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError: handleClearError,
  };
};

export default useAuth;