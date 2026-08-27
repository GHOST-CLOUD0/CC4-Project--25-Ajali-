// frontend/src/hooks/useIncidents.js
import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectAllIncidents,
  selectIncidentById,
  selectIncidentsLoading,
  selectIncidentsError,
  selectIncidentsMeta,          // { page, pages, total }
  fetchIncidents,
  fetchIncident,
  createIncident,
  updateIncident,
  deleteIncident,
} from '../features/incidents/incidentsSlice';

/**
 * useIncidents
 * ------------
 * CRUD + paginated listing for incidents.
 *
 * Usage:
 *   const { incidents, meta, loading, getIncidents, addIncident } = useIncidents();
 *   // or grab a single one:
 *   const { incident } = useIncidents({ id: 42 });
 */
const useIncidents = ({ id = null, page = 1, perPage = 10, autoFetch = true } = {}) => {
  const dispatch = useDispatch();

  // ── selectors ──────────────────────────────────────────────
  const incidents = useSelector(selectAllIncidents);
  const incident = useSelector((state) =>
    id ? selectIncidentById(state, id) : null,
  );
  const loading = useSelector(selectIncidentsLoading);
  const error = useSelector(selectIncidentsError);
  const meta = useSelector(selectIncidentsMeta);

  // ── auto-fetch on mount / page change ──────────────────────
  useEffect(() => {
    if (autoFetch && !id) {
      dispatch(fetchIncidents({ page, perPage }));
    }
    if (autoFetch && id) {
      dispatch(fetchIncident(id));
    }
  }, [dispatch, id, page, perPage, autoFetch]);

  // ── actions ────────────────────────────────────────────────
  const getIncidents = useCallback(
    (params) => dispatch(fetchIncidents(params)).unwrap(),
    [dispatch],
  );

  const getIncident = useCallback(
    (incidentId) => dispatch(fetchIncident(incidentId)).unwrap(),
    [dispatch],
  );

  const addIncident = useCallback(
    (data) => dispatch(createIncident(data)).unwrap(),
    [dispatch],
  );

  const editIncident = useCallback(
    ({ incidentId, ...data }) =>
      dispatch(updateIncident({ id: incidentId, ...data })).unwrap(),
    [dispatch],
  );

  const removeIncident = useCallback(
    (incidentId) => dispatch(deleteIncident(incidentId)).unwrap(),
    [dispatch],
  );

  return {
    // state
    incidents,
    incident,
    loading,
    error,
    meta,           // { page, pages, total, perPage }
    // actions
    getIncidents,
    getIncident,
    addIncident,
    editIncident,
    removeIncident,
  };
};

export default useIncidents;