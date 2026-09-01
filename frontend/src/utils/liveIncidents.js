// Live-data helpers shared by the feed, map and admin screens.
// Every helper falls back to the bundled mock incidents when the API is
// unreachable or returns nothing, so the UI can still demo offline.

import api from "../api/client";
import { incidents as mockIncidents } from "../data/mockIncidents";
import { adaptIncidents } from "./adaptIncident";

/** GET /incidents — adapted list, mock fallback when down or empty. */
export async function fetchLiveIncidents({ page = 1, perPage = 50 } = {}) {
  try {
    const response = await api.get("/incidents", {
      params: { page, per_page: perPage },
    });
    const items = response.data?.data?.incidents || [];
    return adaptIncidents(items.length ? items : mockIncidents);
  } catch {
    return adaptIncidents(mockIncidents);
  }
}

/** GET /admin/stats — real totals for the responder dashboard (null on failure). */
export async function fetchAdminStats() {
  try {
    const response = await api.get("/admin/stats");
    return response.data?.data ?? null;
  } catch {
    return null;
  }
}
