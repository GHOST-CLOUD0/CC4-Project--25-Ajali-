import { TopNavbar, BottomNav } from "../components/ui";

export function Shell({ children, nav = false, className = "" }) {
  return (
    <div className={`app-shell ${nav ? "app-shell--authenticated" : ""} ${className}`}>
      <TopNavbar />
      {children}
      {nav && <BottomNav />}
    </div>
  );
}

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
