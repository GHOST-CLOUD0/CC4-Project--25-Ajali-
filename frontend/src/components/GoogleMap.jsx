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
  showLiveLocation = true,
  onLocationSelect,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!API_KEY) return;

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
            const lat = Number(e.latLng.lat().toFixed(6));
            const lng = Number(e.latLng.lng().toFixed(6));
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
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
    };
  }, []);

  // 2. Track Live GPS User Location
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

  // 3. Render / Update User Location Blue Marker
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !userCoords || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userCoords);
    } else {
      userMarkerRef.current = new maps.Marker({
        position: userCoords,
        map,
        title: "Your Live GPS Location",
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#1a73e8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        },
      });
    }
  }, [userCoords, loaded]);

  // 4. Center to Current User Location Helper
  const handleRecenter = () => {
    if (userCoords && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(userCoords);
      mapInstanceRef.current.setZoom(15);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setUserCoords(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(coords);
          mapInstanceRef.current.setZoom(15);
        }
      });
    }
  };

  // 5. Render Incident Markers & Fit Camera Bounds
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
            <div style="font-family: sans-serif; padding: 4px; max-width: 220px;">
              <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #111;">${item.title}</h4>
              <p style="margin: 0 0 4px; font-size: 12px; color: #555;">${item.incident_type || item.type || ""} · <strong>${item.status || ""}</strong></p>
              ${item.location_name || item.location ? `<p style="margin: 0; font-size: 11px; color: #777;">📍 ${item.location_name || item.location}</p>` : ""}
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
    <div className={`map-container ${large ? "map-large" : ""}`} style={{ position: "relative" }}>
      {showLiveLocation && loaded && (
        <button
          type="button"
          onClick={handleRecenter}
          className="map-recenter-btn"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 5,
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
        <div ref={mapContainerRef} className="map-canvas" />
      )}
    </div>
  );
}
