import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import incidentsReducer from "../features/incidents/incidentsSlice";
import api from "../api/client";
import useIncidents from "./useIncidents";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const buildWrapper = () => {
  const store = configureStore({
    reducer: { incidents: incidentsReducer },
  });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return { store, wrapper };
};

const META = {
  page: 1,
  per_page: 20,
  total: 2,
  pages: 1,
  has_next: false,
  has_previous: false,
};

const INCIDENTS = [
  { id: 1, title: "Fire", status: "under_investigation" },
  { id: 2, title: "Crash", status: "draft" },
];

beforeEach(() => {
  jest.clearAllMocks();
});

test("auto-fetches the first page on mount and mirrors it into the store", async () => {
  api.get.mockResolvedValue({
    data: { status: "success", data: { incidents: INCIDENTS }, meta: META },
  });
  const { store, wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents(), { wrapper });

  await act(async () => {});

  expect(api.get).toHaveBeenCalledWith("/incidents", {
    params: { page: 1, per_page: 20 },
  });
  expect(result.current.incidents).toHaveLength(2);
  expect(store.getState().incidents.items).toHaveLength(2);
  expect(result.current.pagination.total).toBe(2);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});

test("fetchIncidents forwards page, per_page and filters", async () => {
  api.get.mockResolvedValue({
    data: { status: "success", data: { incidents: [] }, meta: META },
  });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(
    () => useIncidents({ autoFetch: false, perPage: 10, filters: { status: "draft" } }),
    { wrapper },
  );

  await act(async () => {
    await result.current.fetchIncidents({ page: 3 });
  });

  expect(api.get).toHaveBeenCalledWith("/incidents", {
    params: { page: 3, per_page: 10, status: "draft" },
  });
});

test("fetchIncidents surfaces API errors", async () => {
  api.get.mockRejectedValue({ response: { data: { message: "Server exploded" } } });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents({ autoFetch: false }), { wrapper });

  await act(async () => {
    await expect(result.current.fetchIncidents()).rejects.toBeDefined();
  });

  expect(result.current.error).toBe("Server exploded");
});

test("fetchIncident stores the single incident", async () => {
  api.get.mockResolvedValue({
    data: { status: "success", data: { incident: INCIDENTS[0] } },
  });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents({ autoFetch: false }), { wrapper });

  let incident;
  await act(async () => {
    incident = await result.current.fetchIncident(1);
  });

  expect(api.get).toHaveBeenCalledWith("/incidents/1");
  expect(incident.title).toBe("Fire");
  expect(result.current.incident.id).toBe(1);
});

test("createIncident posts the payload and returns the new record", async () => {
  api.post.mockResolvedValue({
    data: { status: "success", data: { incident: { id: 9, title: "Flood" } } },
  });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents({ autoFetch: false }), { wrapper });

  let created;
  await act(async () => {
    created = await result.current.createIncident({ title: "Flood", latitude: -1.3, longitude: 36.8 });
  });

  expect(api.post).toHaveBeenCalledWith("/incidents", {
    title: "Flood",
    latitude: -1.3,
    longitude: 36.8,
  });
  expect(created.id).toBe(9);
});

test("updateIncident patches and updateLocation hits the location endpoint", async () => {
  api.patch
    .mockResolvedValueOnce({
      data: { status: "success", data: { incident: { id: 1, title: "Fire (edited)" } } },
    })
    .mockResolvedValueOnce({
      data: { status: "success", data: { incident: { id: 1, latitude: -1.4, longitude: 36.9 } } },
    });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents({ autoFetch: false }), { wrapper });

  await act(async () => {
    await result.current.updateIncident({ id: 1, title: "Fire (edited)" });
  });
  expect(api.patch).toHaveBeenCalledWith("/incidents/1", { title: "Fire (edited)" });
  expect(result.current.incident.title).toBe("Fire (edited)");

  await act(async () => {
    await result.current.updateLocation({ id: 1, latitude: -1.4, longitude: 36.9 });
  });
  expect(api.patch).toHaveBeenCalledWith("/incidents/1/location", {
    latitude: -1.4,
    longitude: 36.9,
  });
});

test("deleteIncident calls DELETE and clears the selected incident", async () => {
  api.delete.mockResolvedValue({ data: { status: "success", message: "Deleted." } });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useIncidents({ autoFetch: false }), { wrapper });

  await act(async () => {
    await result.current.fetchIncident(1);
  });
  await act(async () => {
    await result.current.deleteIncident(1);
  });

  expect(api.delete).toHaveBeenCalledWith("/incidents/1");
  expect(result.current.incident).toBeNull();
});
