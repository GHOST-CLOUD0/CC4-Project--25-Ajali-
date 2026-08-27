import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import useAdmin from "./useAdmin";

const buildWrapper = (preloadedAuth) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedAuth },
  });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return wrapper;
};

test("flags a signed-in admin", () => {
  const wrapper = buildWrapper({
    user: { id: 1, username: "chief", role: "admin" },
    accessToken: "jwt-token",
  });
  const { result } = renderHook(() => useAdmin(), { wrapper });

  expect(result.current.isAdmin).toBe(true);
  expect(result.current.isSignedIn).toBe(true);
  expect(result.current.canManageIncidents).toBe(true);
});

test("citizens never get admin capabilities", () => {
  const wrapper = buildWrapper({
    user: { id: 2, username: "jane", role: "citizen" },
    accessToken: "jwt-token",
  });
  const { result } = renderHook(() => useAdmin(), { wrapper });

  expect(result.current.isAdmin).toBe(false);
  expect(result.current.canManageIncidents).toBe(false);
});

test("guests cannot manage incidents even with a falsy role", () => {
  const wrapper = buildWrapper({ user: null, accessToken: null });
  const { result } = renderHook(() => useAdmin(), { wrapper });

  expect(result.current.user).toBeNull();
  expect(result.current.isSignedIn).toBe(false);
  expect(result.current.canManageIncidents).toBe(false);
});
