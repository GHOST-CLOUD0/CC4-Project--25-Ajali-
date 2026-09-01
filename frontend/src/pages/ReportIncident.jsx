import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { AppHeader } from "../components/ui";
import { reportTypes } from "../data/mockIncidents";
import useGeolocation from "../hooks/useGeolocation";
import useMediaUpload from "../hooks/useMediaUpload";
import { Field, Shell } from "./shared";

// UI label → API incident_type. Reports that need emergency response are
// interventions; red flags report crime and wrongdoing.
const TYPE_MAP = {
  "Road accident": "intervention",
  Fire: "intervention",
  Medical: "intervention",
  Crime: "red-flag",
  Disaster: "intervention",
  Other: "intervention",
};

const FALLBACK_COORDS = { latitude: -1.286389, longitude: 36.817223 }; // Nairobi CBD

export function ReportIncident() {
  const navigate = useNavigate();
  const [type, setType] = useState("Road accident");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { file, preview, uploading, error: uploadError, selectFile, clearFile, upload } = useMediaUpload();
  const { coordinates, error: geoError, loading: locating, getPosition } = useGeolocation();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    let incidentCreated = false;
    try {
      const response = await api.post("/incidents", {
        title,
        description,
        incident_type: TYPE_MAP[type] || "intervention",
        location_name: locationName || "Nairobi",
        latitude: coordinates?.latitude ?? FALLBACK_COORDS.latitude,
        longitude: coordinates?.longitude ?? FALLBACK_COORDS.longitude,
      });
      const incident = response.data?.data?.incident;
      incidentCreated = Boolean(incident?.id);
      if (file && incident?.id) await upload(incident.id);
      navigate("/feed");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
          || (incidentCreated
            ? "Your report was saved, but the evidence file could not be uploaded."
            : "Your report could not be submitted. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell nav>
      <AppHeader title="Report an incident" right="🚨" />
      <main className="screen screen-nav">
        <form onSubmit={submit}>
          {(error || uploadError) && <p className="form-error" role="alert">{error || uploadError}</p>}
          <h2 className="section-label">Select Incident Type</h2>
          <div className="type-grid">
            {reportTypes.map(([icon, label]) => (
              <button type="button" key={label} onClick={() => setType(label)} className={`type-option ${type === label ? "selected" : ""}`}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
          <Field label="Incident Title">
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Multi-car accident Mombasa Road" required />
          </Field>
          <Field label="Description & Details">
            <textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Provide specifics (e.g. injuries, blocked lanes)..." required />
          </Field>
          <Field label="Location Name / Landmark">
            <input className="input" value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="e.g. Near Bellevue, Mombasa Road" />
          </Field>
          <Field label="Photo or video evidence">
            <input className="input" type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => selectFile(event.target.files?.[0])} />
          </Field>
          {file && (
            <div className="media-selection">
              {preview ? <img src={preview} alt="Selected evidence preview" /> : <span>🎬</span>}
              <div><strong>{file.name}</strong><button type="button" className="link" onClick={clearFile}>Remove</button></div>
            </div>
          )}
          <button type="button" className="btn btn-soft btn-block" onClick={() => getPosition().catch(() => {})} disabled={locating}>
            {locating ? "📍 Locating you…" : coordinates ? `✅ Location locked (±${Math.round(coordinates.accuracy ?? 0)}m)` : "📍 Use my current location"}
          </button>
          <p className="compact-meta" style={{ margin: "8px 0 14px" }}>
            {geoError
              ? "⚠️ Couldn't get GPS — the report will pin to Nairobi CBD."
              : coordinates
                ? "Your GPS position will be attached to this report."
                : "Optional: without GPS the report pins to Nairobi CBD."}
          </p>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting || uploading}>
            {submitting || uploading ? "Submitting Report…" : "🚨 Submit report"}
          </button>
        </form>
      </main>
    </Shell>
  );
}
