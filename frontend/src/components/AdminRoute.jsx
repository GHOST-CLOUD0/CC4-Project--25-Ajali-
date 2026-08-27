import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export function AdminRoute({ children }) {
  const { user, accessToken } = useSelector((state) => state.auth);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/feed" replace />;
  }

  return children ? children : <Outlet />;
}

export default AdminRoute;

