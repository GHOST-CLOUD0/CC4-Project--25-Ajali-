import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { AppHeader, IncidentCard } from "../components/ui";
import { incidents as initialIncidents } from "../data/mockIncidents";
import { signOut } from "../features/auth/authSlice";
import { Shell } from "./shared";

function Stat({ label, value, tone }) { return <div className={`stat-card ${tone ?? ""}`}><span className="lbl">{label}</span><strong className="num">{value}</strong></div>; }
export function AdminDashboard() {
  const dispatch = useDispatch(); const navigate = useNavigate(); const user = useSelector((state) => state.auth?.user); const [incidents, setIncidents] = useState(initialIncidents); const [filter, setFilter] = useState("all"); const filtered = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  const changeStatus = async (id, status) => { try { await api.patch(`/admin/incidents/${id}/status`, { status }); } catch {} setIncidents((items) => items.map((incident) => incident.id === id ? { ...incident, status } : incident)); };
  const pending = incidents.filter((item) => item.status === "pending" || item.status === "draft").length; const resolved = incidents.filter((item) => item.status === "resolved").length;
  return <Shell nav><AppHeader title="Admin Panel" subtitle={`Responder Dashboard (${user?.username || "Admin"})`} right={<button type="button" className="btn btn-outline btn-sm" onClick={() => { dispatch(signOut()); navigate("/admin/login"); }}>Sign Out</button>} /><main className="screen screen-nav"><div className="stat-grid"><Stat label="Total Reports" value={incidents.length} /><Stat label="Pending / Draft" value={pending} tone="pending" /><Stat label="Resolved" value={resolved} tone="resolved" /></div><h2 className="section-label">Filter by status</h2><div className="chip-row">{[["all", "All"], ["pending", "Pending"], ["under-investigation", "Investigating"], ["resolved", "Resolved"], ["rejected", "Rejected"]].map(([value, label]) => <button key={value} className={`chip ${filter === value ? "on" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div><h2 className="section-label">Manage &amp; Triage Reports</h2>{filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} compact onStatusChange={changeStatus} />)}</main></Shell>;
}
