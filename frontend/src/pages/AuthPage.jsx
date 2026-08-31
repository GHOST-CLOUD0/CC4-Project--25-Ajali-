import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { setCredentials } from "../features/auth/authSlice";
import { Field, Shell } from "./shared";

export function AuthPage({ register = false }) {
  const navigate = useNavigate(); const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      if (register) await api.post("/auth/register", { username: form.name, email: form.email, password: form.password });
      const response = await api.post("/auth/login", { email: form.email, password: form.password });
      const { access_token: accessToken, user } = response.data.data;
      dispatch(setCredentials({ accessToken, user })); navigate(user?.role === "admin" ? "/admin" : "/feed");
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to sign in. Please try again."); }
    finally { setSubmitting(false); }
  };
  return <Shell><main className="auth-screen">
    <div className="auth-brand"><span>👉</span><strong>🚨 Ajali! Citizen Portal</strong></div>
    <h1>{register ? "Create your account" : "Welcome back"}</h1>
    <p className="auth-sub">{register ? "Join our civic network for fast, verified emergency reporting." : "Sign in to report incidents and track local response units."}</p>
    <form onSubmit={submit}>{error && <p className="form-error" role="alert">{error}</p>}
      {register && <Field label="Full Name"><input className="input" name="name" value={form.name} onChange={update} placeholder="Jane Wanjiku" required /></Field>}
      <Field label="Email Address"><input className="input" type="email" name="email" value={form.email} onChange={update} placeholder="jane@example.com" required /></Field>
      {register && <Field label="Phone Number"><div className="phone-input"><span>🇰🇪 +254</span><input className="input" name="phone" value={form.phone} onChange={update} placeholder="712345678" /></div></Field>}
      <Field label="Password"><div className="input-wrap"><input className="input" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="At least 8 characters" required /><button type="button" className="input-slot" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "HIDE" : "SHOW"}</button></div></Field>
      {!register && <Link className="forgot" to="/forgot-password">Forgot password?</Link>}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>{submitting ? "Please wait…" : register ? "Create account" : "Log in"}</button>
    </form>
    <p className="auth-switch">{register ? "Already have an account?" : "Don't have an account?"} <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
    <div style={{ textAlign: "center", marginTop: "16px" }}><Link to="/admin/login" style={{ fontSize: "12px", color: "var(--muted, #666)" }}>🛡️ Responder / Admin Portal &rarr;</Link></div><div className="home-indicator" aria-hidden="true"><div className="home-indicator__pill" /></div>
  </main></Shell>;
}
