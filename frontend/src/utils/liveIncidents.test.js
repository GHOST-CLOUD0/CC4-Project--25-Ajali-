import api from "../api/client";
import { incidents as mockIncidents } from "../data/mockIncidents";
import { fetchAdminStats, fetchLiveIncidents } from "./liveIncidents";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const apiIncident = {
  id: 42,
  title: "SOS - Fire",
  description: "Fire reported anonymously",
  incident_type: "sos",
  status: "draft",
  location_name: "Githurai",
  latitude: -1.2052,
  longitude: 36.9113,
  author_id: null,
  author: "Anonymous",
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  api.get.mockReset();
});

describe("fetchLiveIncidents", () => {
  it("returns adapted incidents from the API", async () => {
    api.get.mockResolvedValue({ data: { data: { incidents: [apiIncident] } } });
    const items = await fetchLiveIncidents();
    expect(api.get).toHaveBeenCalledWith("/incidents", { params: { page: 1, per_page: 50 } });
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("SOS Alert");
    expect(items[0].status).toBe("pending");
    expect(items[0].reporter).toBe("Anonymous · SOS");
  });

  it("falls back to the bundled mock incidents when the API is unreachable", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    const items = await fetchLiveIncidents();
    expect(items.map((item) => item.id)).toEqual(mockIncidents.map((item) => item.id));
  });

  it("falls back to the mock incidents when the API returns an empty page", async () => {
    api.get.mockResolvedValue({ data: { data: { incidents: [] } } });
    const items = await fetchLiveIncidents();
    expect(items).toHaveLength(mockIncidents.length);
  });
});

describe("fetchAdminStats", () => {
  it("returns the stats payload on success", async () => {
    const stats = { total: 9, draft: 2, under_investigation: 3, resolved: 3, rejected: 1 };
    api.get.mockResolvedValue({ data: { data: stats } });
    await expect(fetchAdminStats()).resolves.toEqual(stats);
  });

  it("returns null on failure", async () => {
    api.get.mockRejectedValue(new Error("nope"));
    await expect(fetchAdminStats()).resolves.toBeNull();
  });
});
