import { act, renderHook } from "@testing-library/react";

import useGeolocation from "./useGeolocation";

const geolocationStub = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

beforeAll(() => {
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: geolocationStub,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test("reports that geolocation is supported", () => {
  const { result } = renderHook(() => useGeolocation());
  expect(result.current.supported).toBe(true);
  expect(result.current.coordinates).toBeNull();
});

test("getPosition resolves with coordinates", async () => {
  geolocationStub.getCurrentPosition.mockImplementation((onSuccess) =>
    onSuccess({
      coords: { latitude: -1.292066, longitude: 36.821946, accuracy: 12 },
      timestamp: 1724700000000,
    }),
  );

  const { result } = renderHook(() => useGeolocation());
  let coords;
  await act(async () => {
    coords = await result.current.getPosition();
  });

  expect(coords.latitude).toBe(-1.292066);
  expect(coords.longitude).toBe(36.821946);
  expect(result.current.coordinates.latitude).toBe(-1.292066);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});

test("getPosition surfaces geolocation errors", async () => {
  geolocationStub.getCurrentPosition.mockImplementation((onSuccess, onError) =>
    onError({ message: "User denied Geolocation" }),
  );

  const { result } = renderHook(() => useGeolocation());
  await act(async () => {
    await expect(result.current.getPosition()).rejects.toThrow(
      "User denied Geolocation",
    );
  });

  expect(result.current.error).toBe("User denied Geolocation");
  expect(result.current.coordinates).toBeNull();
});

test("rejects when the browser has no geolocation support", async () => {
  const original = global.navigator.geolocation;
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });

  try {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.supported).toBe(false);
    await act(async () => {
      await expect(result.current.getPosition()).rejects.toThrow(
        /not supported/i,
      );
    });
  } finally {
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: original,
    });
  }
});
