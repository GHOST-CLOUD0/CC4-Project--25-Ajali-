import { Link } from "react-router-dom";
import { AppHeader } from "../components/ui";
import { GoogleMap } from "../components/GoogleMap";
import { incidents as initialIncidents } from "../data/mockIncidents";
import { Shell } from "./shared";

export function MapView() { return <Shell nav><AppHeader title="Incident map" subtitle="Reports near you" right="🇰🇪" /><main className="screen screen-nav"><GoogleMap incidents={initialIncidents} large /><div className="map-legend">{initialIncidents.map((item) => <Link key={item.id} to={`/incidents/${item.id}`}><span>{item.type}</span>{item.title}</Link>)}</div></main></Shell>; }
