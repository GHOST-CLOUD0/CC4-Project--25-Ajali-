import { Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import {
  AdminDashboard,
  AdminLogin,
  ForgotPassword,
  IncidentDetail,
  LiveFeed,
  Login,
  MapView,
  Register,
  ReportIncident,
  ResetPassword,
  Splash,
} from "./pages/screens";
import { SOSFlow } from "./pages/sos";

export default function App() {
  return (
    <Routes>
      {/* Public & Guest Routes */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Anonymous SOS panic flow — no login required */}
      <Route path="/sos" element={<SOSFlow />} />

      {/* Dedicated Admin Login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Citizen / User Routes */}
      <Route path="/feed" element={<LiveFeed />} />
      <Route path="/report" element={<ReportIncident />} />
      <Route path="/incidents/:id" element={<IncidentDetail />} />
      <Route path="/map" element={<MapView />} />

      {/* Protected Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Splash />} />
    </Routes>
  );
}
