import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = [-1.286389, 36.817223]; // Nairobi [lat, lng]

let leafletPromise = null;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    // 1. Inject Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS
    const existing = document.querySelector('script[src*="leaflet"]');
    if (existing) {
      if (window.L) return resolve(window.L);
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet script.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet map library."));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

export function GoogleMap({
  incidents = [],
  center,
  zoom,
  large = false,
  interactive = false,
  showLiveLocation = true,
  onLocationSelect,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return; // already initialized

        const initialLat = center?.lat ?? incidents[0]?.latitude ?? DEFAULT_CENTER[0];
        const initialLng = center?.lng ?? incidents[0]?.longitude ?? DEFAULT_CENTER[1];

        const map = L.map(mapContainerRef.current, {
          center: [Number(initialLat), Number(initialLng)],
          zoom: zoom || (incidents.length === 1 ? 14 : 12),
          zoomControl: true,
        });

        // Add OpenStreetMap tile layer (100% free & open)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        setLoaded(true);

        if (interactive && onLocationSelect) {
          map.on("click", (e) => {
            const lat = Number(e.latlng.lat.toFixed(6));
            const lng = Number(e.latlng.lng.toFixed(6));
            onLocationSelect({ lat, lng });
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Track Real-time User GPS Location
  useEffect(() => {
    if (!showLiveLocation || typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      (err) => {
        console.warn("Live GPS unavailable:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [showLiveLocation]);

  // 3. Render Blue Pulsating Marker for User Location
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !userCoords || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userMarkerRef.current = L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8,
        fillColor: "#1a73e8",
        fillOpacity: 1,
        color: "#ffffff",
        weight: 2.5,
      })
        .addTo(map)
        .bindPopup("<strong>📍 Your Current GPS Location</strong>");
    }
  }, [userCoords, loaded]);

  // 4. Center to Current User Location Helper
  const handleRecenter = () => {
    if (userCoords && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setUserCoords(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
        }
      });
    }
  };

  // 5. Render Incident Markers & Fit Camera Bounds
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !markersLayerRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    markersLayer.clearLayers();

    const validIncidents = incidents.filter(
      (item) => item && item.latitude && item.longitude
    );

    if (validIncidents.length === 0) {
      if (center) {
        const singlePin = L.marker([Number(center.lat), Number(center.lng)]);
        markersLayer.addLayer(singlePin);
        map.setView([Number(center.lat), Number(center.lng)], zoom || 14);
      }
      return;
    }

    const latlngs = [];

    // Create a custom emergency icon
    const createEmergencyIcon = (type) => {
      const isIntervention = String(type || "").toLowerCase().includes("intervention");
      const bg = isIntervention ? "#2563eb" : "#e11d48";
      return L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background:${bg}; width:28px; height:28px; border-radius:50%; border:2px solid #fff; display:grid; place-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-size:14px;">🚨</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
    };

    validIncidents.forEach((item) => {
      const position = [Number(item.latitude), Number(item.longitude)];
      latlngs.push(position);

      const marker = L.marker(position, {
        icon: createEmergencyIcon(item.incident_type || item.type),
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 2px 4px; min-width: 160px; max-width: 220px;">
          <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #111;">${item.title}</h4>
          <p style="margin: 0 0 4px; font-size: 12px; color: #555;">${item.incident_type || item.type || ""} · <strong>${item.status || ""}</strong></p>
          ${item.location_name || item.location ? `<p style="margin: 0; font-size: 11px; color: #777;">📍 ${item.location_name || item.location}</p>` : ""}
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 14);
    }
  }, [incidents, center, loaded]);

  return (
    <div className={`map-container ${large ? "map-large" : ""}`} style={{ position: "relative" }}>
      {showLiveLocation && (
        <button
          type="button"
          onClick={handleRecenter}
          className="map-recenter-btn"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 1000,
            background: "#ffffff",
            border: "1px solid #d0d5dd",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "#1d2939",
          }}
        >
          📍 Center to My GPS
        </button>
      )}
      {error ? (
        <p className="map-error">{error}</p>
      ) : (
        <div ref={mapContainerRef} className="map-canvas" style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}

// Aliases for modern naming
export const LeafletMap = GoogleMap;
export const IncidentMap = GoogleMap;
