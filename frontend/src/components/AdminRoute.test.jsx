import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import authReducer from "../features/auth/authSlice";
import { AdminRoute } from "./AdminRoute";

function renderWithStore(initialAuthState, initialRoute = "/admin") {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: initialAuthState,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/feed" element={<div>Feed Page</div>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div>Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

test("redirects unauthenticated user to /login", () => {
  renderWithStore({ user: null, accessToken: null });
  expect(screen.getByText("Login Page")).toBeInTheDocument();
  expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
});

test("redirects regular citizen user to /feed", () => {
  renderWithStore({
    user: { id: "1", username: "citizen1", role: "citizen" },
    accessToken: "valid-token",
  });
  expect(screen.getByText("Feed Page")).toBeInTheDocument();
  expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
});

test("allows admin user to access /admin", () => {
  renderWithStore({
    user: { id: "2", username: "admin1", role: "admin" },
    accessToken: "valid-admin-token",
  });
  expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
});

