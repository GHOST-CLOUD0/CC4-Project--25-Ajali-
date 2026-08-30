import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { PhoneStatus } from "../components/ui";

const CATEGORIES = [
  { id: "ambulance", icon: "🚑", label: "Ambulance", sub: "Medical emergency" },
  { id: "accident", icon: "🚗", label: "Accident", sub: "Road & traffic" },
  { id: "fire", icon: "🔥", label: "Fire", sub: "Fire & rescue" },
  { id: "crime", icon: "🚔", label: "Crime", sub: "Crime in progress" },
  { id: "flood", icon: "🌊", label: "Flood", sub: "Flood & rescue" },
  { id: "other", icon: "⚠️", label: "Other", sub: "Any emergency" },
];

const EMERGENCY_LINES = [
  { label: "Police", number: "999" },
  { label: "All services", number: "112" },
  { label: "Red Cross", number: "1199" },
];

function LocationPill({ status, accuracy, onRetry }) {
  if (status === "locating") {
    return <p className="sos-pill">📍 Locating you…</p>;
  }
  if (status === "locked") {
    return (
      <p className="sos-pill ok">
        ✅ Location locked{accuracy ? ` (±${Math.round(accuracy)}m)` : ""}
      </p>
    );
  }
  return (
    <p className="sos-pill warn">
      ⚠️ Couldn&apos;t get GPS — alert still sends.&nbsp;
      <button type="button" className="link" onClick={onRetry}>Retry</button>
    </p>
  );
}

function CallRow() {
  return (
    <div className="sos-call-row">
      {EMERGENCY_LINES.map((line) => (
        <a key={line.label} className="sos-call" href={`tel:${line.number}`}>
          📞 {line.label} · {line.number}
        </a>
      ))}
    </div>
  );
}

export function SOSFlow() {
  const [step, setStep] = useState("pick"); // pick -> confirm -> sent
  const [category, setCategory] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState("locating"); // locating | locked | failed
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("failed");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocStatus("locked");
      },
      () => setLocStatus("failed"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Trace the user's location the moment they land on the SOS screen.
  useEffect(() => {
    locate();
  }, []);

  const pickCategory = (item) => {
    setCategory(item);
    setError("");
    setStep("confirm");
  };

  const sendSOS = async () => {
    if (!category || sending) return;
    setSending(true);
    setError("");
    try {
      const payload = { category: category.id };
      if (note.trim()) payload.description = note.trim();
      if (coords) {
        payload.latitude = coords.lat;
        payload.longitude = coords.lng;
      }
      const response = await api.post("/sos", payload);
      setReference(response.data?.data?.incident?.id || "");
      setStep("sent");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not send the alert. Check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell">
      <PhoneStatus />

      {step === "sent" ? (
        <main className="sos-screen">
          <div className="sos-sent-mark">✅</div>
          <h1>Help is on the way</h1>
          <p className="sos-sub">
            Your {category?.label.toLowerCase()} alert was sent to responders
            {coords ? " with your live location" : ""}.
          </p>
          {reference && (
            <p className="sos-ref">REF · {reference.slice(0, 8).toUpperCase()}</p>
          )}
          <p className="sos-note-strong">Call now while you wait:</p>
          <CallRow />
          <Link className="btn btn-primary btn-block sos-done" to="/">
            Done
          </Link>
        </main>
      ) : (
        <main className="sos-screen">
          <Link className="sos-back" to="/">← Exit</Link>
          <h1>🚨 SOS Emergency</h1>
          <p className="sos-sub">
            No login needed.{" "}
            {step === "pick"
              ? "Tap the emergency you have."
              : "Press the panic button to alert responders."}
          </p>

          <LocationPill status={locStatus} accuracy={coords?.accuracy} onRetry={locate} />

          {step === "pick" ? (
            <div className="sos-grid">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="sos-tile"
                  onClick={() => pickCategory(item)}
                >
                  <span className="sos-tile-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="sos-tile sos-tile-active"
                onClick={() => setStep("pick")}
              >
                <span className="sos-tile-icon">{category.icon}</span>
                <strong>{category.label}</strong>
                <small>Tap to change</small>
              </button>

              <textarea
                className="input sos-note"
                rows="2"
                maxLength="500"
                placeholder="Briefly state the situation (optional) — e.g. two cars collided, one person trapped"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />

              {error && <p className="form-error" role="alert">{error}</p>}

              <button
                type="button"
                className="sos-panic"
                onClick={sendSOS}
                disabled={sending}
              >
                {sending ? "SENDING…" : "PANIC"}
              </button>

              <p className="sos-note-strong">Or call directly:</p>
              <CallRow />
            </>
          )}
        </main>
      )}
    </div>
  );
}
