import { useEffect, useRef, useState } from "react";

const NAIROBI = { lat: -1.286389, lng: 36.817223 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
let mapsScriptPromise;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: API_KEY, v: "weekly", libraries: "marker", loading: "async" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.append(script);
  });
  return mapsScriptPromise;
}

export function GoogleMap({ incidents = [], large = false }) {
  const elementRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!API_KEY) return undefined;
    let cancelled = false;
    let markers = [];
    async function initialiseMap() {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !elementRef.current) return;
        const locations = incidents
          .filter((incident) => incident.latitude != null && incident.longitude != null)
          .map((incident) => ({ ...incident, position: { lat: Number(incident.latitude), lng: Number(incident.longitude) } }))
          .filter((incident) => Number.isFinite(incident.position.lat) && Number.isFinite(incident.position.lng));
        const map = new maps.Map(elementRef.current, { center: locations[0]?.position ?? NAIROBI, zoom: locations.length > 1 ? 11 : 15, mapId: MAP_ID, streetViewControl: false, mapTypeControl: false, fullscreenControl: large });
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (cancelled) return;
        const bounds = new maps.LatLngBounds();
        markers = locations.map((incident) => {
          const marker = new AdvancedMarkerElement({ map, position: incident.position, title: incident.title, content: Object.assign(document.createElement("span"), { className: "map-marker", textContent: incident.incident_type || incident.type || "📍" }) });
          bounds.extend(incident.position);
          return marker;
        });
        if (locations.length > 1) map.fitBounds(bounds, 48);
      } catch (loadError) {
        mapsScriptPromise = undefined;
        if (!cancelled) setError(loadError.message);
      }
    }
    initialiseMap();
    return () => { cancelled = true; markers.forEach((marker) => { marker.map = null; }); };
  }, [incidents, large]);

  if (!API_KEY) return <div className={`map-preview map-unavailable ${large ? "map-large" : ""}`} role="status">Add <code>VITE_GOOGLE_MAPS_KEY</code> to enable Google Maps.</div>;
  if (error) return <div className={`map-preview map-unavailable ${large ? "map-large" : ""}`} role="alert">{error}</div>;
  return <div ref={elementRef} className={`map-preview google-map ${large ? "map-large" : ""}`} style={{ width: "100%", height: large ? "60vh" : 320 }} aria-label="Incident locations map" />;
}