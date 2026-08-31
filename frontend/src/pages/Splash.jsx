import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { signOut } from "../features/auth/authSlice";
import { Shell } from "./shared";

export function Splash() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  return (
    <Shell className="splash">
      <div />
      <section className="splash-hero"><div className="siren-mark">🚨</div><h1>Ajali!</h1><strong>KENYA EMERGENCY PORTAL</strong><p>Report accidents &amp; emergencies<br />near you in seconds</p></section>
      <div className="splash-actions">
        <Link className="btn btn-sos btn-block" to="/report">⚠️ Emergency SOS</Link>
        {user ? <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <Link className="btn btn-white btn-block" to={user.role === "admin" ? "/admin" : "/feed"}>Continue as {user.username || user.email} &rarr;</Link>
          <button type="button" className="btn btn-soft btn-block" onClick={() => dispatch(signOut())}>Sign Out / Switch Account</button>
        </div> : <>
          <Link className="btn btn-white btn-block" to="/login">Citizen Log in</Link>
          <Link className="splash-register" to="/register">Create an account</Link>
          <Link className="btn btn-soft btn-block" style={{ marginTop: "10px" }} to="/admin/login">🛡️ Responder / Admin Login</Link>
        </>}
      </div>
      <div className="pill" aria-hidden="true" />
    </Shell>
  );
}
