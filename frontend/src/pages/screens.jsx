import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import api from "../api/client";
import { setCredentials, signOut } from "../features/auth/authSlice";
import { incidents as initialIncidents, reportTypes } from "../data/mockIncidents";
import { AppHeader, BottomNav, IncidentCard, PhoneStatus, StatusBadge } from "../components/ui";
import { GoogleMap } from "../components/GoogleMap";

function Shell({ children, nav = false, className = "" }) {
  return (
    <div className={`app-shell ${className}`}>
      <PhoneStatus />
      {children}
      {nav && <BottomNav />}
    </div>
  );
}

export function Splash() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);

  const handleSignOut = () => {
    dispatch(signOut());
  };

  return (
    <Shell className="splash">
      <div />
      <section className="splash-hero">
        <div className="siren-mark">🚨</div>
        <h1>Ajali!</h1>
        <strong>KENYA EMERGENCY PORTAL</strong>
        <p>Report accidents &amp; emergencies<br />near you in seconds</p>
      </section>
      <div className="splash-actions">
        <Link className="btn btn-sos btn-block" to="/report">⚠️ Emergency SOS</Link>
        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
            <Link className="btn btn-white btn-block" to={user.role === "admin" ? "/admin" : "/feed"}>
              Continue as {user.username || user.email} &rarr;
            </Link>
            <button
              type="button"
              className="btn btn-soft btn-block"
              onClick={handleSignOut}
            >
              Sign Out / Switch Account
            </button>
          </div>
        ) : (
          <>
            <Link className="btn btn-white btn-block" to="/login">Citizen Log in</Link>
            <Link className="splash-register" to="/register">Create an account</Link>
            <Link className="btn btn-soft btn-block" style={{ marginTop: "10px" }} to="/admin/login">
              🛡️ Responder / Admin Login
            </Link>
          </>
        )}
      </div>
      <div className="pill" aria-hidden="true" />
    </Shell>
  );
}

function AuthLayout({ register = false }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (register) {
        await api.post("/auth/register", { username: form.name, email: form.email, password: form.password });
      }
      const response = await api.post("/auth/login", { email: form.email, password: form.password });
      const { access_token: accessToken, user } = response.data.data;
      dispatch(setCredentials({ accessToken, user }));

      if (user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/feed");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <main className="auth-screen">
        <div className="auth-brand"><span>👉</span><strong>🚨 Ajali! Citizen Portal</strong></div>
        <h1>{register ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-sub">
          {register
            ? "Join our civic network for fast, verified emergency reporting."
            : "Sign in to report incidents and track local response units."}
        </p>
        <form onSubmit={submit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          {register && (
            <Field label="Full Name">
              <input className="input" name="name" value={form.name} onChange={update} placeholder="Jane Wanjiku" required />
            </Field>
          )}
          <Field label="Email Address">
            <input className="input" type="email" name="email" value={form.email} onChange={update} placeholder="jane@example.com" required />
          </Field>
          {register && (
            <Field label="Phone Number">
              <div className="phone-input">
                <span>🇰🇪 +254</span>
                <input className="input" name="phone" value={form.phone} onChange={update} placeholder="712345678" />
              </div>
            </Field>
          )}
          <Field label="Password">
            <div className="input-wrap">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={update}
                placeholder="At least 8 characters"
                required
              />
              <button type="button" className="input-slot" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </Field>
          {!register && <Link className="forgot" to="/forgot-password">Forgot password?</Link>}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : register ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link>
        </p>
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <Link to="/admin/login" style={{ fontSize: "12px", color: "var(--muted, #666)" }}>
            🛡️ Responder / Admin Portal &rarr;
          </Link>
        </div>
        <div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div>
      </main>
    </Shell>
  );
}

export function AdminLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await api.post("/admin/login", {
        email: form.email,
        password: form.password,
      });
      const { access_token: accessToken, user } = response.data.data;
      dispatch(setCredentials({ accessToken, user }));
      navigate("/admin");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Invalid credentials or unauthorized.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <main className="auth-screen">
        <div className="auth-brand"><span>🛡️</span><strong>Ajali! Emergency Dispatch</strong></div>
        <h1>Responder Sign In</h1>
        <p className="auth-sub">
          Authorized personnel only. Access triage dashboard, verify red-flags, and dispatch response units.
        </p>
        <form onSubmit={submit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Field label="Admin Identifier (Email / Username)">
            <input
              className="input"
              name="email"
              value={form.email}
              onChange={update}
              placeholder="admin@ajali.go.ke"
              required
            />
          </Field>
          <Field label="Password">
            <div className="input-wrap">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={update}
                placeholder="Enter admin password"
                required
              />
              <button type="button" className="input-slot" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </Field>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? "Authenticating…" : "🔑 Access Control Console"}
          </button>
        </form>
        <p className="auth-switch">
          Not an administrator? <Link to="/login">Go to Citizen Portal</Link>
        </p>
        <div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div>
      </main>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data?.message || "Password reset instructions have been generated.");
      if (response.data?.data?.reset_token) {
        setResetToken(response.data.data.reset_token);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <main className="auth-screen">
        <div className="auth-brand"><span>🔑</span><strong>🚨 Ajali! Security</strong></div>
        <h1>Reset Password</h1>
        <p className="auth-sub">
          Enter your registered email address. We will generate a secure link to reset your account password.
        </p>
        {message ? (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p style={{ color: "#16a34a", marginBottom: "16px", fontWeight: "600" }}>{message}</p>
            {resetToken && (
              <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "8px" }}>Development Mode Token:</p>
                <Link
                  className="btn btn-primary btn-block"
                  to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                >
                  Click Here to Set New Password
                </Link>
              </div>
            )}
            <Link className="btn btn-outline btn-block" to="/login">Return to Log in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Field label="Email Address">
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </Field>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Instructions"}
            </button>
            <p className="auth-switch">
              Remember your password? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
        <div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div>
      </main>
    </Shell>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post("/auth/reset-password", { token, password });
      setSuccessMsg(response.data?.message || "Password reset successfully!");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password. Token may be expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <main className="auth-screen">
        <div className="auth-brand"><span>🔒</span><strong>🚨 Ajali! Security</strong></div>
        <h1>Create New Password</h1>
        <p className="auth-sub">
          Please enter your reset token and select a new secure password of at least 8 characters.
        </p>
        {successMsg ? (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p style={{ color: "#16a34a", fontWeight: "600", marginBottom: "16px" }}>{successMsg}</p>
            <p style={{ fontSize: "14px", color: "#666" }}>Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Field label="Reset Token">
              <input
                className="input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token"
                required
              />
            </Field>
            <Field label="New Password">
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
              />
            </Field>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
              {submitting ? "Updating password…" : "Update Password"}
            </button>
            <p className="auth-switch">
              Cancel and return to <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
        <div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div>
      </main>
    </Shell>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export const Login = () => <AuthLayout />;
export const Register = () => <AuthLayout register />;

export function LiveFeed() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? initialIncidents : initialIncidents.filter((item) => item.status === filter);
  const filters = [
    ["all", "All"],
    ["pending", "Pending"],
    ["under-investigation", "Investigating"],
    ["resolved", "Resolved"],
  ];

  const handleLogout = () => {
    dispatch(signOut());
    navigate("/login");
  };

  return (
    <Shell nav>
      <AppHeader
        title="Live incident feed"
        subtitle={user ? `Signed in as ${user.username || user.email}` : "Real-time updates across Kenya"}
        right={
          user ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleLogout}
              title="Sign Out"
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Log in
            </Link>
          )
        }
      />
      <main className="screen screen-nav">
        <div className="chip-row filter-row">
          {filters.map(([value, label]) => (
            <button key={value} className={`chip ${filter === value ? "on" : ""}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="feed-list">
          {filtered.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
        <Link className="floating-report" to="/report">＋ Report</Link>
      </main>
    </Shell>
  );
}

export function ReportIncident() {
  const navigate = useNavigate();
  const [type, setType] = useState("Road accident");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(-1.286389);
  const [longitude, setLongitude] = useState(36.817223);
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert("Unable to retrieve location: " + err.message);
      }
    );
  };

  const handleMapClick = ({ lat, lng }) => {
    setLatitude(Number(lat.toFixed(6)));
    setLongitude(Number(lng.toFixed(6)));
  };

  return (
    <Shell nav>
      <AppHeader title="Report an incident" right="🚨" />
      <main className="screen screen-nav">
        <form onSubmit={(event) => { event.preventDefault(); navigate("/feed"); }}>
          <h2 className="section-label">Select Incident Type</h2>
          <div className="type-grid">
            {reportTypes.map(([icon, label]) => (
              <button
                type="button"
                key={label}
                onClick={() => setType(label)}
                className={`type-option ${type === label ? "selected" : ""}`}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
          <Field label="Incident Title">
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Multi-car accident Mombasa Road"
              required
            />
          </Field>
          <Field label="Description & Details">
            <textarea
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Provide specifics (e.g. injuries, blocked lanes)..."
              required
            />
          </Field>
          <div className="section-title-row">
            <h2 className="section-label">Location (Click map or enter GPS)</h2>
            <button
              type="button"
              className="location-button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? "Locating…" : "📍 Use my current location"}
            </button>
          </div>
          <GoogleMap
            center={{ lat: latitude, lng: longitude }}
            zoom={14}
            interactive
            onLocationSelect={handleMapClick}
          />
          <div className="coordinate-grid">
            <input
              className="input"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value) || 0)}
            />
            <input
              className="input"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value) || 0)}
            />
          </div>
          <div className="upload-grid">
            <button type="button" className="btn btn-soft">📷 Add photo</button>
            <button type="button" className="btn btn-soft">🎬 Add video</button>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit">🚨 Submit report</button>
        </form>
      </main>
    </Shell>
  );
}

export function IncidentDetail() {
  const { id } = useParams();
  const incident = initialIncidents.find((item) => item.id === id) ?? initialIncidents[0];

  return (
    <Shell nav>
      <AppHeader title="Incident Details" back right="🔔" />
      <main className="screen screen-nav">
        <article className="detail-card">
          <div className="row-between">
            <h2>{incident.title}</h2>
            <StatusBadge status={incident.status} />
          </div>
          <p className="detail-byline">Reported by <strong>{incident.reporter}</strong> · {incident.category} {incident.type}</p>
          <section className="detail-block">
            <h3>Incident Description</h3>
            <p>{incident.description}</p>
          </section>
          <section className="detail-block">
            <h3>GPS Location</h3>
            <MapPreview incident={incident} />
            <p className="coordinate-text">Coordinates: {incident.latitude}, {incident.longitude}</p>
          </section>
          <section className="detail-block">
            <h3>Media Evidence</h3>
            <div className="media-thumbs">
              <div className="media-thumb">📷 Photo</div>
              <div className="media-thumb">🎬 Video</div>
              <div className="media-thumb plus">＋</div>
            </div>
          </section>
          <div className="detail-actions">
            <button className="btn btn-soft">✏️ Edit</button>
            <button className="btn btn-outline">🗑 Delete</button>
          </div>
        </article>
      </main>
    </Shell>
  );
}

export function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const [incidentsList, setIncidentsList] = useState(initialIncidents);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? incidentsList : incidentsList.filter((item) => item.status === filter);

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      await api.patch(`/admin/incidents/${incidentId}/status`, { status: newStatus });
    } catch {
      // Fallback local update for mock/offline data
    }
    setIncidentsList((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
    );
  };

  const handleLogout = () => {
    dispatch(signOut());
    navigate("/admin/login");
  };

  const totalCount = incidentsList.length;
  const pendingCount = incidentsList.filter((i) => i.status === "pending" || i.status === "draft").length;
  const resolvedCount = incidentsList.filter((i) => i.status === "resolved").length;

  return (
    <Shell nav>
      <AppHeader
        title="Admin Panel"
        subtitle={`Responder Dashboard (${user?.username || "Admin"})`}
        right={
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout} title="Sign Out">
            Sign Out
          </button>
        }
      />
      <main className="screen screen-nav">
        <div className="stat-grid">
          <Stat label="Total Reports" value={totalCount} />
          <Stat label="Pending / Draft" value={pendingCount} tone="pending" />
          <Stat label="Resolved" value={resolvedCount} tone="resolved" />
        </div>
        <h2 className="section-label">Filter by status</h2>
        <div className="chip-row">
          {[
            ["all", "All"],
            ["pending", "Pending"],
            ["under-investigation", "Investigating"],
            ["resolved", "Resolved"],
            ["rejected", "Rejected"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`chip ${filter === key ? "on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <h2 className="section-label">Manage &amp; Triage Reports</h2>
        {filtered.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            compact
            onStatusChange={handleStatusChange}
          />
        ))}
      </main>
    </Shell>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone ?? ""}`}>
      <span className="lbl">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

export function MapView() {
  return (
    <Shell nav>
      <AppHeader title="Incident map" subtitle="Reports near you" right="🇰🇪" />
      <main className="screen screen-nav">
        <GoogleMap incidents={initialIncidents} large />
        <div className="map-legend">
          {initialIncidents.map((item) => (
            <Link key={item.id} to={`/incidents/${item.id}`}>
              <span>{item.type}</span>{item.title}
            </Link>
          ))}
        </div>
      </main>
    </Shell>
  );
}

function MapPreview({ large = false, incident }) {
  return <GoogleMap incidents={incident ? [incident] : [initialIncidents[0]]} large={large} />;
}
