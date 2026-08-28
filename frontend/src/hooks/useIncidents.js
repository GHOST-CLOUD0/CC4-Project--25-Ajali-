// frontend/src/hooks/useIncidents.js
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../api/client";
import { setIncidents } from "../features/incidents/incidentsSlice";

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/**
 * useIncidents
 * ------------
 * CRUD + paginated listing for incidents.
 *
 * The paginated list is mirrored into the Redux store (`incidents.items`
 * and `incidents.pagination`) via `setIncidents`, so map/feed components
 * can read the same page of results without re-fetching.
 *
 * Usage:
 *   const { incidents, pagination, loading, fetchIncidents, addIncident } =
 *     useIncidents({ page: 1, perPage: 20 });
 *
 *   // filters are passed straight to the API:
 *   useIncidents({ filters: { status: "resolved", incident_type: "fire" } });
 */
const useIncidents = ({
  page = 1,
  perPage = 20,
  filters = null,
  autoFetch = true,
} = {}) => {
  const dispatch = useDispatch();

  // ── state from the store ───────────────────────────────────
  const incidents = useSelector((state) => state.incidents.items);
  const pagination = useSelector((state) => state.incidents.pagination);

  // ── request state local to the hook ────────────────────────
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Serialised once so the callbacks below stay referentially stable
  // even when callers pass an inline filters object.
  const filtersKey = JSON.stringify(filters ?? {});

  /**
   * GET /incidents?page=&per_page=&incident_type=&status=&author_id=
   * Response shape: { status, data: { incidents }, meta: { page, per_page,
   * total, pages, has_next, has_previous } }
   */
  const fetchIncidents = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          per_page: perPage,
          ...JSON.parse(filtersKey),
          ...overrides,
        };
        const { data } = await api.get("/incidents", { params });
        dispatch(
          setIncidents({
            items: data.data.incidents,
            pagination: data.meta,
          }),
        );
        return data;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load incidents."));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, page, perPage, filtersKey],
  );

  /**
   * GET /incidents/:incidentId
   * Loads a single incident (with media) into local hook state.
   */
  const fetchIncident = useCallback(async (incidentId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/incidents/${incidentId}`);
      setIncident(data.data.incident);
      return data.data.incident;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load the incident."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** POST /incidents */
  const createIncident = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post("/incidents", payload);
        return data.data.incident;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to report the incident."));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** PATCH /incidents/:incidentId — `payload`: { id, ...fields } */
  const updateIncident = useCallback(async ({ id, ...payload }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch(`/incidents/${id}`, payload);
      setIncident(data.data.incident);
      return data.data.incident;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update the incident."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** PATCH /incidents/:incidentId/location */
  const updateLocation = useCallback(async ({ id, latitude, longitude }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch(`/incidents/${id}/location`, {
        latitude,
        longitude,
      });
      setIncident(data.data.incident);
      return data.data.incident;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update the location."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** DELETE /incidents/:incidentId */
  const deleteIncident = useCallback(async (incidentId) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/incidents/${incidentId}`);
      setIncident(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete the incident."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── auto-fetch on mount / page / filter change ─────────────
  useEffect(() => {
    if (autoFetch) {
      fetchIncidents();
    }
  }, [autoFetch, fetchIncidents]);

  return {
    // state
    incidents,
    incident,
    pagination, // { page, per_page, total, pages, has_next, has_previous } | null
    loading,
    error,
    // actions
    fetchIncidents,
    fetchIncident,
    createIncident,
    updateIncident,
    updateLocation,
    deleteIncident,
  };
};

export default useIncidents;
