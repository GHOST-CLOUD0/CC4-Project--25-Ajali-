import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client";
import { AppHeader, IncidentCard, StatusBadge } from "../components/ui";
import { signOut } from "../features/auth/authSlice";
import { fetchAdminStats, fetchLiveIncidents } from "../utils/liveIncidents";
import { Shell } from "./shared";

function StatCard({ label, value, tone, icon }) {
  return (
    <div className={`stat-card ${tone ?? ""}`}>
      <div className="stat-card-header">
        <span className="lbl">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong className="num">{value}</strong>
    </div>
  );
}

export function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth?.user);

  const [activeTab, setActiveTab] = useState("triage"); // "triage" | "users" | "stats"
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reporterFilter, setReporterFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [incidentItems, liveStats] = await Promise.all([
        fetchLiveIncidents({ perPage: 100 }),
        fetchAdminStats(),
      ]);
      setIncidents(incidentItems || []);
      setStats(liveStats);
    } catch {
      setError("Failed to fetch incident reports from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data?.data?.users || []);
    } catch {
      // Fallback for demo/offline
      setUsers([
        {
          id: currentUser?.id || "admin-1",
          username: currentUser?.username || "admin",
          email: currentUser?.email || "admin@ajali.go.ke",
          role: "admin",
          created_at: new Date().toISOString(),
          reports_count: incidents.length,
        },
      ]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    if (activeTab === "users") loadUsers();
  };

  // Status Change Handler
  const changeStatus = async (id, status) => {
    const previous = incidents.find((item) => item.id === id)?.status;
    setError("");
    setSuccessMsg("");
    setIncidents((items) =>
      items.map((inc) => (inc.id === id ? { ...inc, status } : inc))
    );

    try {
      await api.patch(`/admin/incidents/${id}/status`, { status });
      setSuccessMsg(`Incident #${id.slice(0, 8)} status updated to ${status}.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      const updatedStats = await fetchAdminStats();
      if (updatedStats) setStats(updatedStats);
    } catch (err) {
      setIncidents((items) =>
        items.map((inc) => (inc.id === id ? { ...inc, status: previous } : inc))
      );
      setError(err.response?.data?.message || "Failed to update incident status.");
    }
  };

  // Delete Incident Handler
  const handleDeleteIncident = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete report: "${title}"?`)) {
      return;
    }
    setError("");
    try {
      await api.delete(`/incidents/${id}`);
      setIncidents((items) => items.filter((inc) => inc.id !== id));
      setSuccessMsg(`Incident "${title}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete incident report.");
    }
  };

  // Unique reporters list for filter dropdown
  const uniqueReporters = useMemo(() => {
    const map = new Map();
    incidents.forEach((inc) => {
      const name = inc.reporter || inc.author || "Citizen";
      const email = inc.reporter_email || inc.author_email || "";
      if (!map.has(name)) {
        map.set(name, { name, email, count: 1 });
      } else {
        map.get(name).count += 1;
      }
    });
    return Array.from(map.values());
  }, [incidents]);

  const viewCitizenReports = (citizenName) => {
    setReporterFilter(citizenName);
    setActiveTab("triage");
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        !searchQuery ||
        inc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.reporter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.reporter_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        inc.status === statusFilter ||
        (statusFilter === "pending" && (inc.status === "draft" || inc.status === "pending"));

      const incType = String(inc.incident_type || inc.type || "").toLowerCase();
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "red-flag" && incType.includes("red-flag")) ||
        (typeFilter === "intervention" && incType.includes("intervention")) ||
        (typeFilter === "sos" && incType.includes("sos"));

      const matchesReporter =
        reporterFilter === "all" ||
        (inc.reporter || inc.author) === reporterFilter ||
        (inc.reporter_email || inc.author_email) === reporterFilter;

      return matchesSearch && matchesStatus && matchesType && matchesReporter;
    });
  }, [incidents, searchQuery, statusFilter, typeFilter, reporterFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!userSearch) return true;
      const q = userSearch.toLowerCase();
      return (
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch]);

  // CSV Export Function
  const exportCSV = () => {
    const headers = [
      "ID",
      "Title",
      "Type",
      "Status",
      "Location",
      "Latitude",
      "Longitude",
      "Reporter",
      "Reporter Email",
      "Created At",
    ];

    const rows = filteredIncidents.map((inc) => [
      `"${inc.id}"`,
      `"${(inc.title || "").replace(/"/g, '""')}"`,
      `"${inc.incident_type || inc.type || ""}"`,
      `"${inc.status || ""}"`,
      `"${(inc.location_name || inc.location || "").replace(/"/g, '""')}"`,
      `"${inc.latitude || ""}"`,
      `"${inc.longitude || ""}"`,
      `"${inc.reporter || inc.author || "Citizen"}"`,
      `"${inc.reporter_email || inc.author_email || "N/A"}"`,
      `"${inc.created_at || inc.age || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ajali_incident_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = incidents.filter((i) => i.status === "pending" || i.status === "draft").length;
  const underInvCount = incidents.filter((i) => i.status === "under-investigation").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const rejectedCount = incidents.filter((i) => i.status === "rejected").length;

  return (
    <Shell nav>
      <AppHeader
        title="Admin Control Center"
        subtitle={`Responder Dashboard (${currentUser?.username || "Admin"})`}
        right={
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              dispatch(signOut());
              navigate("/admin/login");
            }}
          >
            Sign Out
          </button>
        }
      />

      <main className="screen screen-nav">
        {/* Navigation Tabs */}
        <div className="admin-nav-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === "triage" ? "active" : ""}`}
            onClick={() => setActiveTab("triage")}
          >
            📋 Incident Triage ({incidents.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Citizen Accounts ({stats?.total_users ?? users.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            📈 Overview &amp; Metrics
          </button>
        </div>

        {/* Global Alert Messages */}
        {error && <p className="form-error" role="alert">{error}</p>}
        {successMsg && (
          <p
            className="form-success"
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px",
            }}
          >
            ✅ {successMsg}
          </p>
        )}

        {/* TAB 1: INCIDENT TRIAGE & AUDIT */}
        {activeTab === "triage" && (
          <>
            {/* Quick Stat Highlights */}
            <div className="stat-grid" style={{ marginBottom: "18px" }}>
              <StatCard label="Total Reports" value={stats?.total ?? incidents.length} icon="📋" />
              <StatCard label="Pending Triage" value={stats?.draft ?? pendingCount} tone="pending" icon="⏳" />
              <StatCard label="Investigating" value={stats?.under_investigation ?? underInvCount} icon="🔍" />
              <StatCard label="Resolved" value={stats?.resolved ?? resolvedCount} tone="resolved" icon="✅" />
            </div>

            {/* Controls Bar: Search, Filters, View Mode, CSV Export */}
            <div className="admin-toolbar">
              <div className="admin-search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="input admin-search-input"
                  placeholder="Search by title, location, reporter username, or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="clear-search" onClick={() => setSearchQuery("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="admin-toolbar-actions">
                {/* View Mode Toggle */}
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
                    onClick={() => setViewMode("table")}
                    title="Audit Table View"
                  >
                    📊 Table
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${viewMode === "cards" ? "active" : ""}`}
                    onClick={() => setViewMode("cards")}
                    title="Card Grid View"
                  >
                    🗂️ Cards
                  </button>
                </div>

                {/* CSV Export Button */}
                <button
                  type="button"
                  className="btn btn-soft btn-sm export-btn"
                  onClick={exportCSV}
                  title="Export filtered reports as CSV"
                >
                  📥 Export CSV
                </button>

                {/* Refresh Button */}
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh data from server"
                >
                  {refreshing ? "🔄…" : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="admin-filter-bar">
              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <div className="chip-row">
                  {[
                    ["all", "All"],
                    ["pending", "Pending (Draft)"],
                    ["under-investigation", "Investigating"],
                    ["resolved", "Resolved"],
                    ["rejected", "Rejected"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip ${statusFilter === value ? "on" : ""}`}
                      onClick={() => setStatusFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Type:</span>
                <div className="chip-row">
                  {[
                    ["all", "All Types"],
                    ["red-flag", "🚩 Red Flags"],
                    ["intervention", "⚠️ Interventions"],
                    ["sos", "🚨 SOS Panic"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip ${typeFilter === value ? "on" : ""}`}
                      onClick={() => setTypeFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Citizen / Reporter Filter */}
              {uniqueReporters.length > 1 && (
                <div className="filter-group">
                  <span className="filter-label">Citizen:</span>
                  <div className="chip-row">
                    <button
                      type="button"
                      className={`chip ${reporterFilter === "all" ? "on" : ""}`}
                      onClick={() => setReporterFilter("all")}
                    >
                      All Citizens ({incidents.length})
                    </button>
                    {uniqueReporters.map((rep) => (
                      <button
                        key={rep.name}
                        type="button"
                        className={`chip ${reporterFilter === rep.name ? "on" : ""}`}
                        onClick={() => setReporterFilter(rep.name)}
                      >
                        👤 {rep.name} ({rep.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Active Citizen Filter Banner */}
            {reporterFilter !== "all" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#1d4ed8",
                }}
              >
                <span>
                  Filtering reports submitted specifically by <strong>👤 {reporterFilter}</strong> ({filteredIncidents.length} found)
                </span>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontWeight: "bold",
                    textDecoration: "underline",
                  }}
                  onClick={() => setReporterFilter("all")}
                >
                  ✕ Show All Citizens
                </button>
              </div>
            )}

            {/* Content Display: Table View or Cards View */}
            {loading ? (
              <p style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Loading incident audit reports…</p>
            ) : filteredIncidents.length === 0 ? (
              <div className="empty-state-card">
                <p>🔍 No incident reports match your search or filter criteria.</p>
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === "table" ? (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Incident / Title</th>
                      <th>Reporter &amp; Contact</th>
                      <th>Location &amp; Coordinates</th>
                      <th>Status</th>
                      <th>Reported</th>
                      <th>Triage Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((inc) => (
                      <tr key={inc.id}>
                        <td>
                          <div className="incident-table-cell">
                            <Link to={`/incidents/${inc.id}`} className="incident-link">
                              <strong>{inc.title}</strong>
                            </Link>
                            <span className="type-sub">{inc.incident_type || inc.type || "Incident"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="reporter-cell">
                            <strong>{inc.reporter || inc.author || "Citizen"}</strong>
                            {inc.reporter_email || inc.author_email ? (
                              <a href={`mailto:${inc.reporter_email || inc.author_email}`} className="email-badge">
                                ✉️ {inc.reporter_email || inc.author_email}
                              </a>
                            ) : (
                              <span className="email-na">No email provided</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="location-cell">
                            <span>📍 {inc.location_name || inc.location || "Kenya"}</span>
                            {inc.latitude && inc.longitude && (
                              <span className="coords-text">
                                🧭 {inc.latitude}, {inc.longitude}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={inc.status} />
                        </td>
                        <td>
                          <span className="time-text">{inc.age || inc.created_at || "Recent"}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <select
                              className="status-select"
                              value={inc.status === "draft" ? "pending" : inc.status}
                              onChange={(e) => changeStatus(inc.id, e.target.value)}
                            >
                              <option value="pending">⏳ Pending (Draft)</option>
                              <option value="under-investigation">🔍 Investigating</option>
                              <option value="resolved">✅ Resolved</option>
                              <option value="rejected">❌ Rejected</option>
                            </select>

                            <Link to={`/incidents/${inc.id}`} className="btn-icon" title="View Evidence & GPS">
                              👁️
                            </Link>
                            <button
                              type="button"
                              className="btn-icon btn-icon-del"
                              title="Delete Incident Report"
                              onClick={() => handleDeleteIncident(inc.id, inc.title)}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-cards-grid">
                {filteredIncidents.map((incident) => (
                  <div key={incident.id} className="admin-card-wrapper">
                    <IncidentCard incident={incident} compact onStatusChange={changeStatus} />
                    <div className="admin-card-footer">
                      <span className="reporter-contact">
                        Contact: <strong>{incident.reporter_email || incident.author_email || incident.reporter || "Citizen"}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-del"
                        onClick={() => handleDeleteIncident(incident.id, incident.title)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: REGISTERED USER DIRECTORY */}
        {activeTab === "users" && (
          <div className="admin-users-view">
            <div className="admin-toolbar">
              <div className="admin-search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="input admin-search-input"
                  placeholder="Search users by username, email, or role…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={loadUsers}
                disabled={usersLoading}
              >
                {usersLoading ? "Loading…" : "🔄 Refresh Users"}
              </button>
            </div>

            {usersLoading ? (
              <p style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Loading registered citizen accounts…</p>
            ) : filteredUsers.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px" }}>No user accounts found matching "{userSearch}".</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Citizen / User</th>
                      <th>Email Address</th>
                      <th>Account Role</th>
                      <th>Date Joined</th>
                      <th>Total Reports</th>
                      <th>Filter Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <span className="user-avatar-badge">{u.role === "admin" ? "🛡️" : "👤"}</span>
                            <strong>{u.username}</strong>
                          </div>
                        </td>
                        <td>
                          <a href={`mailto:${u.email}`} className="email-badge">
                            ✉️ {u.email}
                          </a>
                        </td>
                        <td>
                          <span className={`role-badge role-${u.role}`}>
                            {u.role === "admin" ? "🛡️ Responder (Admin)" : "👤 Citizen"}
                          </span>
                        </td>
                        <td>
                          <span className="time-text">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                          </span>
                        </td>
                        <td>
                          <strong>{u.reports_count ?? 0} reports</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-soft btn-sm"
                            onClick={() => viewCitizenReports(u.username)}
                            title={`Filter and view all reports by ${u.username}`}
                          >
                            📂 View Reports ({u.reports_count ?? 0})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM METRICS & OVERVIEW */}
        {activeTab === "stats" && (
          <div className="admin-metrics-view">
            <h2 className="section-label">System-Wide Incident Statistics</h2>
            <div className="stat-grid" style={{ marginBottom: "24px" }}>
              <StatCard label="Total Community Reports" value={stats?.total ?? incidents.length} icon="📋" />
              <StatCard label="Pending / Draft" value={stats?.draft ?? pendingCount} tone="pending" icon="⏳" />
              <StatCard label="Under Investigation" value={stats?.under_investigation ?? underInvCount} icon="🔍" />
              <StatCard label="Resolved Incidents" value={stats?.resolved ?? resolvedCount} tone="resolved" icon="✅" />
              <StatCard label="Rejected Reports" value={stats?.rejected ?? rejectedCount} icon="❌" />
              <StatCard label="Registered Users" value={stats?.total_users ?? users.length} icon="👥" />
            </div>

            <div className="admin-insights-card">
              <h3>🚨 Emergency Triage Guidelines</h3>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.7", color: "var(--ink-soft)", fontSize: "14px" }}>
                <li><strong>Pending (Draft):</strong> Freshly submitted citizen reports requiring immediate review.</li>
                <li><strong>Under Investigation:</strong> Incident verified; emergency responders or county authorities dispatched.</li>
                <li><strong>Resolved:</strong> Hazard cleared, medical aid rendered, or road obstruction removed.</li>
                <li><strong>Rejected:</strong> Duplicate report, spam, or unverifiable claim.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
