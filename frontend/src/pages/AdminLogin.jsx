import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { setCredentials } from "../features/auth/authSlice";
import { Field, Shell } from "./shared";

export function AdminLogin() {
  const navigate = useNavigate(); const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false); const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => { event.preventDefault(); setError(""); setSubmitting(true); try {
    const response = await api.post("/admin/login", form); const { access_token: accessToken, user } = response.data.data;
    dispatch(setCredentials({ accessToken, user })); navigate("/admin");
  } catch (requestError) {
    setError(
      requestError.response?.data?.message ||
      "Cannot reach backend server. Please ensure the backend is running on port 5000."
    );
  } finally { setSubmitting(false); } };
  return <Shell><main className="auth-screen"><div className="auth-brand"><span>🛡️</span><strong>Ajali! Emergency Dispatch</strong></div><h1>Responder Sign In</h1><p className="auth-sub">Authorized personnel only. Access triage dashboard, verify red-flags, and dispatch response units.</p><form onSubmit={submit}>{error && <p className="form-error" role="alert">{error}</p>}<Field label="Admin Identifier (Email / Username)"><input className="input" name="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@ajali.go.ke" required /></Field><Field label="Password"><div className="input-wrap"><input className="input" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter admin password" required /><button type="button" className="input-slot" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "HIDE" : "SHOW"}</button></div></Field><button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>{submitting ? "Authenticating…" : "🔑 Access Control Console"}</button></form><p className="auth-switch">Not an administrator? <Link to="/login">Go to Citizen Portal</Link></p><div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div></main></Shell>;
}
