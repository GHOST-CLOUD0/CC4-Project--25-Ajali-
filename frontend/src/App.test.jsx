// frontend/src/App.test.jsx
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "./app/store";
import App from "./App";

test("renders the Splash landing page on root route", () => {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

  // Verifies the Splash hero heading
  expect(screen.getByRole("heading", { name: /ajali!/i })).toBeInTheDocument();
  expect(screen.getByText(/kenya emergency portal/i)).toBeInTheDocument();
});