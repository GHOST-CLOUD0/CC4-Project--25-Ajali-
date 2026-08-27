import { useSelector } from "react-redux";
import { Link, NavLink, useLocation } from "react-router-dom";

const statusLabels = {
  pending: "Pending",
  draft: "Draft",
  "under-investigation": "Investigating",
  resolved: "Resolved",
  rejected: "Rejected",
};

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{statusLabels[status] ?? status}</span>;
}

export function PhoneStatus() {
  return <div className="statusbar"><span>9:41</span><span className="sb-right">▮▮▮ ◒ ▰</span></div>;
}

export function AppHeader({ title, subtitle, back = false, right }) {
  return (
    <header className="app-header">
      <div className="header-copy">
        {back && <Link className="back-link" to="/feed">👈</Link>}
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {right && <span className="header-right">{right}</span>}
    </header>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const user = useSelector((state) => state.auth?.user);

  const items = [
    ["/feed", "📰", "Feed"],
    ["/report", "🚨", "Report"],
    ["/map", "🗺️", "Map"],
  ];

  if (user?.role === "admin") {
    items.push(["/admin", "🔑", "Admin"]);
  }

  return (
    <nav className="bottomnav" aria-label="Primary navigation">
      {items.map(([to, icon, label]) => (
        <NavLink key={to} to={to} className={`nav-item ${pathname === to ? "active" : ""}`}>
          <span className="nav-icon">{icon}</span><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function IncidentCard({ incident, compact = false, onStatusChange }) {
  return (
    <article className={`feed-card ${compact ? "compact-card" : ""}`}>
      <div className="feed-top">
        {!compact && <div className="feed-emoji">{incident.type}</div>}
        <div className="feed-main">
          <div className="row-between">
            <h2 className="feed-title">{incident.title}</h2>
            <StatusBadge status={incident.status} />
          </div>
          {!compact && (
            <div className="feed-meta">
              <span>📍 {incident.location}</span>
              <span>🧭 GPS: {incident.latitude}, {incident.longitude}</span>
            </div>
          )}
          {compact && (
            <p className="compact-meta">
              By {incident.reporter || incident.author_id} · {incident.age || incident.created_at}
            </p>
          )}
          {compact && onStatusChange && (
            <div className="admin-status-actions" style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
              <button
                type="button"
                className={`btn btn-sm ${incident.status === "under-investigation" ? "btn-primary" : "btn-soft"}`}
                onClick={() => onStatusChange(incident.id, "under-investigation")}
              >
                Investigating
              </button>
              <button
                type="button"
                className={`btn btn-sm ${incident.status === "resolved" ? "btn-primary" : "btn-soft"}`}
                onClick={() => onStatusChange(incident.id, "resolved")}
              >
                Resolve
              </button>
              <button
                type="button"
                className={`btn btn-sm ${incident.status === "rejected" ? "btn-primary" : "btn-soft"}`}
                onClick={() => onStatusChange(incident.id, "rejected")}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <footer className="feed-footer">
          <span>{incident.age || "Recently"} · {incident.reporter || "Citizen"}</span>
          <Link className="view-details" to={`/incidents/${incident.id}`}>VIEW DETAILS 👉</Link>
        </footer>
      )}
    </article>
  );
}
