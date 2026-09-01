import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/ui";
import { GoogleMap } from "../components/GoogleMap";
import { fetchLiveIncidents } from "../utils/liveIncidents";
import { Shell } from "./shared";

export function MapView() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let active = true;
    fetchLiveIncidents().then((items) => {
      if (active) setIncidents(items);
    });
    return () => { active = false; };
  }, []);

  return (
    <Shell nav>
      <AppHeader title="Incident map" subtitle="Reports near you" right="🇰🇪" />
      <main className="screen screen-nav">
        <GoogleMap incidents={incidents} large />
        <div className="map-legend">
          {incidents.map((item) => (
            <Link key={item.id} to={`/incidents/${item.id}`}>
              <span>{item.type}</span>{item.title}
            </Link>
          ))}
        </div>
      </main>
    </Shell>
  );
}
