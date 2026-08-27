import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const { user, accessToken } = useSelector((state) => state.auth);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;

