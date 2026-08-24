import { Navigate, Route, Routes } from "react-router-dom";

function Page({ title }) {
  return (
    <main>
      <h1>{title}</h1>
    </main>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/incidents" replace />} />
      <Route path="/login" element={<Page title="Sign in" />} />
      <Route path="/register" element={<Page title="Create an account" />} />
      <Route path="/incidents" element={<Page title="Incidents" />} />
      <Route path="/incidents/new" element={<Page title="Report an incident" />} />
      <Route path="/incidents/:incidentId" element={<Page title="Incident details" />} />
      <Route path="/admin" element={<Page title="Administration" />} />
      <Route path="*" element={<Page title="Page not found" />} />
    </Routes>
  );
}