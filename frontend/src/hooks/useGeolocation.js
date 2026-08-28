// frontend/src/hooks/useGeolocation.js
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

/**
 * useGeolocation
 * --------------
 * Wraps the browser Geolocation API so the report form and the map can
 * capture an incident's latitude/longitude.
 *
 * Usage:
 *   const { coordinates, error, loading, getPosition } = useGeolocation();
 *   await getPosition();               // one-shot fix
 *   const { coordinates } = useGeolocation({ watch: true }); // live tracking
 */
const useGeolocation = (options = {}) => {
  const { watch = false } = options;

  const [coordinates, setCoordinates] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  const toCoordinates = (position) => ({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  });

  const isSupported =
    typeof navigator !== "undefined" && Boolean(navigator.geolocation);

  /** One-shot position request. Resolves with the coordinates. */
  const getPosition = useCallback(
    (overrides = {}) => {
      if (!isSupported) {
        const message = "Geolocation is not supported by this browser.";
        setError(message);
        return Promise.reject(new Error(message));
      }
      setLoading(true);
      setError(null);
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = toCoordinates(position);
            setCoordinates(next);
            setLoading(false);
            resolve(next);
          },
          (err) => {
            setError(err.message);
            setLoading(false);
            reject(
              err instanceof Error
                ? err
                : new Error(err.message || "Geolocation request failed."),
            );
          },
          { ...DEFAULT_OPTIONS, ...options, ...overrides },
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── optional continuous tracking ───────────────────────────
  useEffect(() => {
    if (!watch || !isSupported) {
      return undefined;
    }
    setLoading(true);
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoordinates(toCoordinates(position));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { ...DEFAULT_OPTIONS, ...options },
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  /** Clears the stored coordinates and any error. */
  const clear = useCallback(() => {
    setCoordinates(null);
    setError(null);
  }, []);

  return {
    coordinates,
    error,
    loading,
    supported: isSupported,
    getPosition,
    clear,
  };
};

export default useGeolocation;
