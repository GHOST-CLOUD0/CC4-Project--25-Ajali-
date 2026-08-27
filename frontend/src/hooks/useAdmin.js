// frontend/src/hooks/useAdmin.js
import { useSelector } from "react-redux";

/**
 * useAdmin
 * --------
 * Admin capability helpers derived from the auth state. Mirrors the
 * server-side rule (JWT claim `role === "admin"`) enforced by
 * /api/v1/admin endpoints and the <AdminRoute /> guard.
 *
 * Usage:
 *   const { isAdmin, canManageIncidents } = useAdmin();
 *   if (canManageIncidents) renderAdminControls();
 */
const useAdmin = () => {
  const { user, accessToken } = useSelector((state) => state.auth);

  const isAdmin = user?.role === "admin";
  const isSignedIn = Boolean(accessToken && user);

  return {
    user,
    isSignedIn,
    isAdmin,
    /** True only for signed-in admins — gate admin UI with this. */
    canManageIncidents: isSignedIn && isAdmin,
  };
};

export default useAdmin;
