import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { AppHeader, IncidentCard } from "../components/ui";
import { signOut } from "../features/auth/authSlice";
import { fetchAdminStats, fetchLiveIncidents } from "../utils/liveIncidents";
import { Shell } from "./shared";

function Stat({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone ?? ""}`}>
      <span className="lbl">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

export function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchLiveIncidents(), fetchAdminStats()]).then(([items, liveStats]) => {
      if (!active) return;
      setIncidents(items);
      setStats(liveStats);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const changeStatus = async (id, status) => {
    const previous = incidents.find((item) => item.id === id)?.status;
    setError("");
    setIncidents((items) => items.map((incident) => (incident.id === id ? { ...incident, status } : incident)));
    try {
      await api.patch(`/admin/incidents/${id}/status`, { status });
    } catch {
      setIncidents((items) => items.map((incident) => (incident.id === id ? { ...incident, status: previous } : incident)));
      setError("Couldn't update that report — check your connection and try again.");
    }
  };

  const pendingCount = incidents.filter((item) => item.status === "pending" || item.status === "draft").length;
  const resolvedCount = incidents.filter((item) => item.status === "resolved").length;
  const filtered = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);

  return (
    <Shell nav>
      <AppHeader
        title="Admin Panel"
        subtitle={`Responder Dashboard (${user?.username || "Admin"})`}
        right={<button type="button" className="btn btn-outline btn-sm" onClick={() => { dispatch(signOut()); navigate("/admin/login"); }}>Sign Out</button>}
      />
      <main className="screen screen-nav">
        <div className="stat-grid">
          <Stat label="Total Reports" value={stats?.total ?? incidents.length} />
          <Stat label="Pending / Draft" value={stats?.draft ?? pendingCount} tone="pending" />
          <Stat label="Resolved" value={stats?.resolved ?? resolvedCount} tone="resolved" />
        </div>
        {error && <p className="form-error" role="alert" style={{ color: "red", marginBottom: "12px" }}>{error}</p>}
        <h2 className="section-label">Filter by status</h2>
        <div className="chip-row">
          {[["all", "All"], ["pending", "Pending"], ["under-investigation", "Investigating"], ["resolved", "Resolved"], ["rejected", "Rejected"]].map(([value, label]) => (
            <button key={value} className={`chip ${filter === value ? "on" : ""}`} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <h2 className="section-label">Manage &amp; Triage Reports</h2>
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Loading reports...</p>
        ) : filtered.length === 0 ? (
          <p className="compact-meta" style={{ textAlign: "center", padding: "20px" }}>No reports under this filter.</p>
        ) : (
          filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} compact onStatusChange={changeStatus} />)
        )}
      </main>
    </Shell>
  );
}
