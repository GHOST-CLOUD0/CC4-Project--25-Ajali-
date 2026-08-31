import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { IncidentCard, AppHeader } from "../components/ui";
import { incidents as initialIncidents } from "../data/mockIncidents";
import { signOut } from "../features/auth/authSlice";
import { Shell } from "./shared";

const filters = [["all", "All"], ["pending", "Pending"], ["under-investigation", "Investigating"], ["resolved", "Resolved"]];

export function LiveFeed() {
  const dispatch = useDispatch(); const navigate = useNavigate(); const user = useSelector((state) => state.auth?.user); const [incidents, setIncidents] = useState([]); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState("all");
  useEffect(() => { let active = true; async function load() { try { const response = await api.get("/incidents?page=1&per_page=50"); const items = response.data?.data?.incidents || []; if (active) setIncidents(items.length ? items : initialIncidents); } catch { if (active) setIncidents(initialIncidents); } finally { if (active) setLoading(false); } } load(); return () => { active = false; }; }, []);
  const filtered = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  return <Shell nav><AppHeader title="Live incident feed" subtitle={user ? `Signed in as ${user.username || user.email}` : "Real-time updates across Kenya"} right={user ? <button type="button" className="btn btn-outline btn-sm" onClick={() => { dispatch(signOut()); navigate("/login"); }}>Sign Out</button> : <Link to="/login" className="btn btn-primary btn-sm">Log in</Link>} /><main className="screen screen-nav"><div className="chip-row filter-row">{filters.map(([value, label]) => <button key={value} className={`chip ${filter === value ? "on" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div>{loading ? <p style={{ textAlign: "center", padding: "20px" }}>Loading incidents...</p> : <div className="feed-list">{filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}</div>}<Link className="floating-report" to="/report">＋ Report</Link></main></Shell>;
}
