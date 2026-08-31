import { useParams } from "react-router-dom";
import { AppHeader, StatusBadge } from "../components/ui";
import { GoogleMap } from "../components/GoogleMap";
import { incidents as initialIncidents } from "../data/mockIncidents";
import { Shell } from "./shared";

export function IncidentDetail() {
  const { id } = useParams(); const incident = initialIncidents.find((item) => item.id === id) ?? initialIncidents[0];
  return <Shell nav><AppHeader title="Incident Details" back right="🔔" /><main className="screen screen-nav"><article className="detail-card"><div className="row-between"><h2>{incident.title}</h2><StatusBadge status={incident.status} /></div><p className="detail-byline">Reported by <strong>{incident.reporter}</strong> · {incident.category} {incident.type}</p><section className="detail-block"><h3>Incident Description</h3><p>{incident.description}</p></section><section className="detail-block"><h3>GPS Location</h3><GoogleMap incidents={[incident]} /><p className="coordinate-text">Coordinates: {incident.latitude}, {incident.longitude}</p></section><section className="detail-block"><h3>Media Evidence</h3><div className="media-thumbs"><div className="media-thumb">📷 Photo</div><div className="media-thumb">🎬 Video</div><div className="media-thumb plus">＋</div></div></section><div className="detail-actions"><button className="btn btn-soft">✏️ Edit</button><button className="btn btn-outline">🗑 Delete</button></div></article></main></Shell>;
}
