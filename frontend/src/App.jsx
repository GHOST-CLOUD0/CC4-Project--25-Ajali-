import { AppRouter } from "./router";

export default function App() {
	return <AppRouter />;
}

function App() {
  return (
    <Routes>
      {/* Public & Guest Routes */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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

export default App;
