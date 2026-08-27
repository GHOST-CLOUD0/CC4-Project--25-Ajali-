import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { incidents, reportTypes } from "../data/mockIncidents";
import { AppHeader, BottomNav, IncidentCard, PhoneStatus, StatusBadge } from "../components/ui";

function Shell({ children, nav = false, className = "" }) {
  return <div className={`app-shell ${className}`}><PhoneStatus />{children}{nav && <BottomNav />}</div>;
}

export function Splash() {
  return (
    <Shell className="splash">
      <div />
      <section className="splash-hero">
        <div className="siren-mark">🚨</div><h1>Ajali!</h1><strong>KENYA EMERGENCY PORTAL</strong>
        <p>Report accidents &amp; emergencies<br />near you in seconds</p>
      </section>
      <div className="splash-actions">
        <Link className="btn btn-sos btn-block" to="/report">⚠️ Emergency SOS</Link>
        <Link className="btn btn-white btn-block" to="/login">Log in</Link>
        <Link className="splash-register" to="/register">Create an account</Link>
      </div>
    </Shell>
  );
}

function AuthLayout({ register = false }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => { event.preventDefault(); navigate("/feed"); };
  return (
    <Shell><main className="auth-screen">
      <div className="auth-brand"><span>👉</span><strong>🚨 Ajali!</strong></div>
      <h1>{register ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-sub">{register ? "Join our civic network for fast, verified emergency reporting." : "Sign in to report incidents and track local response units."}</p>
      <form onSubmit={submit}>
        {register && <Field label="Full Name"><input className="input" name="name" value={form.name} onChange={update} placeholder="Jane Wanjiku" required /></Field>}
        <Field label="Email Address"><input className="input" type="email" name="email" value={form.email} onChange={update} placeholder="jane@example.com" required /></Field>
        {register && <Field label="Phone Number"><div className="phone-input"><span>🇰🇪 +254</span><input className="input" name="phone" value={form.phone} onChange={update} placeholder="712345678" /></div></Field>}
        <Field label="Password"><div className="input-wrap"><input className="input" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="At least 8 characters" required /><button type="button" className="input-slot" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "HIDE" : "SHOW"}</button></div></Field>
        {!register && <Link className="forgot" to="/login">Forgot password?</Link>}
        <button className="btn btn-primary btn-block btn-lg" type="submit">{register ? "Create account" : "Log in"}</button>
      </form>
      <p className="auth-switch">{register ? "Already have an account?" : "Don't have an account?"} <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
    </main></Shell>
  );
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
export const Login = () => <AuthLayout />;
export const Register = () => <AuthLayout register />;

export function LiveFeed() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  const filters = [["all", "All"], ["pending", "Pending"], ["under-investigation", "Investigating"], ["resolved", "Resolved"]];
  return <Shell nav><AppHeader title="Live incident feed" subtitle="Real-time updates across Kenya" right="🇰🇪" /><main className="screen screen-nav">
    <div className="chip-row filter-row">{filters.map(([value, label]) => <button key={value} className={`chip ${filter === value ? "on" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="feed-list">{filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}</div>
    <Link className="floating-report" to="/report">＋ Report</Link>
  </main></Shell>;
}

export function ReportIncident() {
  const navigate = useNavigate();
  const [type, setType] = useState("Road accident");
  const [title, setTitle] = useState("");
  return <Shell nav><AppHeader title="Report an incident" right="🚨" /><main className="screen screen-nav"><form onSubmit={(event) => { event.preventDefault(); navigate("/feed"); }}>
    <h2 className="section-label">Select Incident Type</h2><div className="type-grid">{reportTypes.map(([icon, label]) => <button type="button" key={label} onClick={() => setType(label)} className={`type-option ${type === label ? "selected" : ""}`}><span>{icon}</span>{label}</button>)}</div>
    <Field label="Incident Title"><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Multi-car accident Mombasa Road" required /></Field>
    <Field label="Description & Details"><textarea className="input" placeholder="Provide specifics (e.g. injuries, blocked lanes)..." required /></Field>
    <div className="section-title-row"><h2 className="section-label">Location</h2><button type="button" className="location-button">📍 Use my current location</button></div>
    <MapPreview /><div className="coordinate-grid"><input className="input" placeholder="Latitude" defaultValue="-1.3033" /><input className="input" placeholder="Longitude" defaultValue="36.8374" /></div>
    <div className="upload-grid"><button type="button" className="btn btn-soft">📷 Add photo</button><button type="button" className="btn btn-soft">🎬 Add video</button></div>
    <button className="btn btn-primary btn-block btn-lg" type="submit">🚨 Submit report</button>
  </form></main></Shell>;
}

export function IncidentDetail() {
  const { id } = useParams(); const incident = incidents.find((item) => item.id === id) ?? incidents[0];
  return <Shell nav><AppHeader title="Incident Details" back right="🔔" /><main className="screen screen-nav"><article className="detail-card">
    <div className="row-between"><h2>{incident.title}</h2><StatusBadge status={incident.status} /></div><p className="detail-byline">Reported by <strong>{incident.reporter}</strong> · {incident.category} {incident.type}</p>
    <section className="detail-block"><h3>Incident Description</h3><p>{incident.description}</p></section><section className="detail-block"><h3>GPS Location</h3><MapPreview /><p className="coordinate-text">Coordinates: {incident.latitude}, {incident.longitude}</p></section>
    <section className="detail-block"><h3>Media Evidence</h3><div className="media-thumbs"><div className="media-thumb">📷 Photo</div><div className="media-thumb">🎬 Video</div><div className="media-thumb plus">＋</div></div></section>
    <div className="detail-actions"><button className="btn btn-soft">✏️ Edit</button><button className="btn btn-outline">🗑 Delete</button></div>
  </article></main></Shell>;
}

export function AdminDashboard() {
  const [filter, setFilter] = useState("all"); const filtered = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  return <Shell nav><AppHeader title="Admin Panel" subtitle="Responder Control Dashboard" right={<span className="admin-avatar">AD</span>} /><main className="screen screen-nav">
    <div className="stat-grid"><Stat label="Total Reports" value="142" /><Stat label="Pending" value="18" tone="pending" /><Stat label="Resolved" value="114" tone="resolved" /></div>
    <h2 className="section-label">Filter by status</h2><div className="chip-row">{[["all", "All"], ["pending", "Pending"], ["under-investigation", "Investigating"], ["resolved", "Resolved"]].map(([key, label]) => <button className={`chip ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div>
    <h2 className="section-label">Manage Active Reports</h2>{filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} compact />)}
  </main></Shell>;
}

function Stat({ label, value, tone }) { return <div className={`stat-card ${tone ?? ""}`}><span className="lbl">{label}</span><strong className="num">{value}</strong></div>; }
export function MapView() { return <Shell nav><AppHeader title="Incident map" subtitle="Reports near you" right="🇰🇪" /><main className="screen screen-nav"><MapPreview large /><div className="map-legend">{incidents.map((item) => <Link key={item.id} to={`/incidents/${item.id}`}><span>{item.type}</span>{item.title}</Link>)}</div></main></Shell>; }
function MapPreview({ large = false }) { return <div className={`map-preview ${large ? "map-large" : ""}`}><span className="map-road road-one" /><span className="map-road road-two" /><span className="map-pin">📍</span></div>; }
