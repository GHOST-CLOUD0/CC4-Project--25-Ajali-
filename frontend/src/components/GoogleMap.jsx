import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = { lat: -1.286389, lng: 36.817223 }; // Nairobi

const API_KEY = (typeof process !== "undefined" && process.env?.VITE_GOOGLE_MAPS_KEY) || "";

let mapsScriptPromise = null;

function loadGoogleMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      if (window.google?.maps) return resolve(window.google.maps);
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Failed to load Google Maps. Please check your API key or network connection."));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function GoogleMap({
  incidents = [],
  center,
  zoom,
  large = false,
  interactive = false,
  onLocationSelect,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!API_KEY) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(API_KEY)
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return;

        const initialCenter = center
          ? { lat: Number(center.lat), lng: Number(center.lng) }
          : incidents[0]?.latitude && incidents[0]?.longitude
          ? { lat: Number(incidents[0].latitude), lng: Number(incidents[0].longitude) }
          : DEFAULT_CENTER;

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: zoom || (incidents.length === 1 ? 14 : 12),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new maps.InfoWindow();
        setLoaded(true);

        if (interactive && onLocationSelect) {
          map.addListener("click", (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onLocationSelect({ lat, lng });
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Update Markers & Bounds when incidents or center change
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const validIncidents = incidents.filter(
      (item) => item && item.latitude && item.longitude
    );

    if (validIncidents.length === 0) {
      if (center) {
        const marker = new maps.Marker({
          position: { lat: Number(center.lat), lng: Number(center.lng) },
          map,
          animation: maps.Animation.DROP,
        });
        markersRef.current.push(marker);
        map.setCenter({ lat: Number(center.lat), lng: Number(center.lng) });
      }
      return;
    }

    const bounds = new maps.LatLngBounds();

    validIncidents.forEach((item) => {
      const position = {
        lat: Number(item.latitude),
        lng: Number(item.longitude),
      };

      const marker = new maps.Marker({
        position,
        map,
        title: item.title,
        animation: validIncidents.length === 1 ? maps.Animation.DROP : undefined,
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          const content = `
            <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
              <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #111;">${item.title}</h4>
              <p style="margin: 0 0 4px; font-size: 12px; color: #555;">${item.type || ""} · <strong>${item.status || ""}</strong></p>
              ${item.location ? `<p style="margin: 0; font-size: 11px; color: #777;">📍 ${item.location}</p>` : ""}
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (validIncidents.length > 1) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } else if (validIncidents.length === 1) {
      map.setCenter({
        lat: Number(validIncidents[0].latitude),
        lng: Number(validIncidents[0].longitude),
      });
      map.setZoom(14);
    }
  }, [incidents, center, loaded]);

  if (!API_KEY) {
    return (
      <div className={`map-preview ${large ? "map-large" : ""}`}>
        <span className="map-road road-one" />
        <span className="map-road road-two" />
        <span className="map-pin">📍</span>
      </div>
    );
  }

  return (
    <div className={`map-container ${large ? "map-large" : ""}`}>
      {error ? (
        <p className="map-error">{error}</p>
      ) : (
        <div ref={mapContainerRef} className="map-canvas" />
      )}
    </div>
  );
}
