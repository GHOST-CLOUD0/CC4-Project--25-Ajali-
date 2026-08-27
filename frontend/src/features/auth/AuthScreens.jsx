import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PhoneStatus } from "../../components/map/ui";

function AuthShell({ children }) {
  return <div className="app-shell"><PhoneStatus />{children}</div>;
}

function AuthLayout({ register = false }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    navigate("/incidents");
  };

  return (
    <AuthShell>
      <main className="auth-screen">
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
      </main>
    </AuthShell>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export const Login = () => <AuthLayout />;
export const Register = () => <AuthLayout register />;
