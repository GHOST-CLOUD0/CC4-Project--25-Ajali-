import { PhoneStatus, BottomNav } from "../components/ui";

export function Shell({ children, nav = false, className = "" }) {
  return (
    <div className={`app-shell ${className}`}>
      <PhoneStatus />
      {children}
      {nav && <BottomNav />}
    </div>
  );
}

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
