import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api/client";
import { GoogleMap } from "../components/GoogleMap";
import { AppHeader, StatusBadge } from "../components/ui";
import { incidents as initialIncidents, reportTypes } from "../data/mockIncidents";
import { adaptIncident } from "../utils/adaptIncident";
import { Field, Shell } from "./shared";

const API_BASE = (typeof process !== "undefined" && process.env?.VITE_API_URL)
  ? process.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "")
  : "http://localhost:5000";

export function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const currentUser = useSelector((state) => state.auth?.user);

  const [incident, setIncident] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location_name: "",
    incident_type: "red-flag",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch incident and media from backend API
  const fetchIncident = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/incidents/${id}`);
      const data = res.data?.data?.incident;
      if (data) {
        setIncident(adaptIncident(data));
        setEditForm({
          title: data.title || "",
          description: data.description || "",
          location_name: data.location_name || data.location || "",
          incident_type: data.incident_type || data.type || "red-flag",
        });
        setMediaList(data.media || []);
      }
    } catch (err) {
      // Fallback to local mock data if not in backend database
      const fallback = adaptIncident(initialIncidents.find((item) => String(item.id) === String(id)) || initialIncidents[0]);
      setIncident(fallback);
      setEditForm({
        title: fallback.title || "",
        description: fallback.description || "",
        location_name: fallback.location || "",
        incident_type: fallback.type || "red-flag",
      });
      setMediaList(fallback.media || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  // Upload new photo or video evidence
  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !id) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.post(`/incidents/${id}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newMedia = res.data?.data?.media;
      if (newMedia) {
        setMediaList((prev) => [...prev, newMedia]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload media evidence.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete an attached media item
  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm("Remove this evidence file?")) return;
    try {
      await api.delete(`/media/${mediaId}`);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove media file.");
    }
  };

  // Delete entire incident
  const handleDeleteIncident = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this incident report?")) {
      return;
    }
    try {
      await api.delete(`/incidents/${id}`);
      navigate("/feed");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete incident report.");
    }
  };

  // Save edits
  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
      const res = await api.patch(`/incidents/${id}`, editForm);
      const updated = res.data?.data?.incident;
      if (updated) {
        setIncident(updated);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update incident.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading && !incident) {
    return (
      <Shell nav>
        <AppHeader title="Incident Details" back right="🔔" />
        <main className="screen screen-nav">
          <p style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>Loading incident details…</p>
        </main>
      </Shell>
    );
  }

  const currentIncident = incident || initialIncidents[0];
  const canModify = !currentUser || currentUser.role === "admin" || currentUser.id === currentIncident.author_id;

  const resolveMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
      return url;
    }
    return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <Shell nav>
      <AppHeader title="Incident Details" back right="🔔" />
      <main className="screen screen-nav">
        <article className="detail-card">
          {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}

          {isEditing ? (
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <h3>Edit Incident Report</h3>
              <Field label="Incident Title">
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </Field>
              <Field label="Description & Details">
                <textarea
                  className="input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                  rows={4}
                />
              </Field>
              <Field label="Location Name / Landmark">
                <input
                  className="input"
                  value={editForm.location_name}
                  onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                />
              </Field>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn btn-primary" type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "💾 Save Changes"}
                </button>
                <button className="btn btn-soft" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="row-between">
                <h2>{currentIncident.title}</h2>
                <StatusBadge status={currentIncident.status} />
              </div>
              <p className="detail-byline">
                Reported by <strong>{currentIncident.reporter || currentIncident.author || "Citizen"}</strong> · {currentIncident.category || ""} {currentIncident.type || currentIncident.incident_type}
              </p>

              <section className="detail-block">
                <h3>Incident Description</h3>
                <p>{currentIncident.description}</p>
              </section>
            </>
          )}

          {/* GPS Location Section */}
          <section className="detail-block">
            <h3>GPS Location</h3>
            <GoogleMap incidents={[currentIncident]} center={{ lat: currentIncident.latitude, lng: currentIncident.longitude }} />
            <p className="coordinate-text">
              Coordinates: {currentIncident.latitude}, {currentIncident.longitude}
              {currentIncident.location_name || currentIncident.location ? ` (📍 ${currentIncident.location_name || currentIncident.location})` : ""}
            </p>
          </section>

          {/* Media Evidence Section */}
          <section className="detail-block">
            <div className="row-between" style={{ marginBottom: "8px" }}>
              <h3>Media Evidence</h3>
              {uploading && <span style={{ fontSize: "12px", color: "var(--brand-red)" }}>Uploading…</span>}
            </div>

            <div className="media-thumbs">
              {/* Render dynamic uploaded media */}
              {mediaList.map((media) => (
                <div key={media.id || media.url} className="media-thumb">
                  {media.media_type === "video" ? (
                    <video src={resolveMediaUrl(media.url)} controls />
                  ) : (
                    <img
                      src={resolveMediaUrl(media.url)}
                      alt={media.file_name || "Incident evidence"}
                      onClick={() => window.open(resolveMediaUrl(media.url), "_blank")}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                  {canModify && media.id && (
                    <button
                      type="button"
                      className="media-del-btn"
                      onClick={() => handleDeleteMedia(media.id)}
                      title="Delete evidence"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Add New Media Upload Button */}
              {canModify && (
                <div
                  className="media-thumb plus"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add photo or video evidence"
                >
                  <span>＋</span>
                  <span style={{ fontSize: "10px", marginTop: "2px", fontWeight: "bold" }}>Add</span>
                </div>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleFileUpload}
            />
          </section>

          {/* Actions: Edit and Delete */}
          {canModify && (
            <div className="detail-actions">
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "❌ Cancel Edit" : "✏️ Edit"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={handleDeleteIncident}
                style={{ color: "var(--brand-red)", borderColor: "var(--brand-red)" }}
              >
                🗑 Delete
              </button>
            </div>
          )}
        </article>
      </main>
    </Shell>
  );
}
