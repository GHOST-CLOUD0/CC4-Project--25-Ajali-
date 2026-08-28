import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import api from "../api/client";
import useAuth from "./useAuth";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const buildWrapper = (preloadedAuth = { user: null, accessToken: null }) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedAuth },
  });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return { store, wrapper };
};

const CITIZEN = { id: 1, username: "jane", email: "jane@example.com", role: "citizen" };

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test("login stores credentials in the store and localStorage", async () => {
  api.post.mockResolvedValue({
    data: {
      status: "success",
      data: { access_token: "jwt-token", user: CITIZEN },
    },
  });
  const { store, wrapper } = buildWrapper();
  const { result } = renderHook(() => useAuth(), { wrapper });

  let user;
  await act(async () => {
    user = await result.current.login({ email: "jane@example.com", password: "secret123" });
  });

  expect(api.post).toHaveBeenCalledWith("/auth/login", {
    email: "jane@example.com",
    password: "secret123",
  });
  expect(user.username).toBe("jane");
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.token).toBe("jwt-token");
  expect(store.getState().auth.accessToken).toBe("jwt-token");
  expect(localStorage.getItem("accessToken")).toBe("jwt-token");
});

test("login surfaces the API error message", async () => {
  api.post.mockRejectedValue({
    response: { data: { message: "Invalid email/username or password." } },
  });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useAuth(), { wrapper });

  await act(async () => {
    await expect(
      result.current.login({ email: "jane@example.com", password: "wrong" }),
    ).rejects.toBeDefined();
  });

  expect(result.current.error).toBe("Invalid email/username or password.");
  expect(result.current.isAuthenticated).toBe(false);
});

test("clearError resets the error state", async () => {
  api.post.mockRejectedValue({ response: { data: { message: "boom" } } });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useAuth(), { wrapper });

  await act(async () => {
    await result.current.login({ email: "jane@example.com", password: "nope" }).catch(() => {});
  });
  expect(result.current.error).toBe("boom");

  act(() => result.current.clearError());
  expect(result.current.error).toBeNull();
});

test("register keeps the user signed out when no token is returned", async () => {
  api.post.mockResolvedValue({
    data: { status: "success", data: { ...CITIZEN, id: 2 } },
  });
  const { store, wrapper } = buildWrapper();
  const { result } = renderHook(() => useAuth(), { wrapper });

  let user;
  await act(async () => {
    user = await result.current.register({
      username: "jane",
      email: "jane@example.com",
      password: "secret123",
    });
  });

  expect(user.id).toBe(2);
  expect(result.current.isAuthenticated).toBe(false);
  expect(store.getState().auth.user).toBeNull();
});

test("register signs the user in when the API returns a token", async () => {
  api.post.mockResolvedValue({
    data: {
      status: "success",
      data: { access_token: "jwt-token", user: CITIZEN },
    },
  });
  const { wrapper } = buildWrapper();
  const { result } = renderHook(() => useAuth(), { wrapper });

  await act(async () => {
    await result.current.register({ username: "jane", email: "jane@example.com", password: "secret123" });
  });

  expect(result.current.isAuthenticated).toBe(true);
});

test("logout clears the credentials everywhere", () => {
  const { store, wrapper } = buildWrapper({
    user: CITIZEN,
    accessToken: "jwt-token",
  });
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.isAuthenticated).toBe(true);

  act(() => result.current.logout());

  expect(result.current.isAuthenticated).toBe(false);
  expect(store.getState().auth.accessToken).toBeNull();
  expect(localStorage.getItem("accessToken")).toBeNull();
});

test("flags admin users", () => {
  const { wrapper } = buildWrapper({
    user: { ...CITIZEN, role: "admin" },
    accessToken: "jwt-token",
  });
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.isAdmin).toBe(true);
});
