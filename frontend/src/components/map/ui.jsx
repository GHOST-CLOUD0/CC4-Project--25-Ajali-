import { Link, NavLink, useLocation } from "react-router-dom";

const statusLabels = {
  pending: "Pending",
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
  const items = [
    ["/feed", "📰", "Feed"],
    ["/report", "🚨", "Report"],
    ["/map", "🗺️", "Map"],
    ["/admin", "🔑", "Admin"],
  ];
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

export function IncidentCard({ incident, compact = false }) {
  return (
    <article className={`feed-card ${compact ? "compact-card" : ""}`}>
      <div className="feed-top">
        {!compact && <div className="feed-emoji">{incident.type}</div>}
        <div className="feed-main">
          <div className="row-between"><h2 className="feed-title">{incident.title}</h2><StatusBadge status={incident.status} /></div>
          {!compact && <div className="feed-meta"><span>📍 {incident.location}</span><span>🧭 GPS: {incident.latitude}, {incident.longitude}</span></div>}
          {compact && <p className="compact-meta">By {incident.reporter} · {incident.age}</p>}
        </div>
      </div>
      {!compact && <footer className="feed-footer"><span>{incident.age} · {incident.reporter}</span><Link className="view-details" to={`/incidents/${incident.id}`}>VIEW DETAILS 👉</Link></footer>}
    </article>
  );
}