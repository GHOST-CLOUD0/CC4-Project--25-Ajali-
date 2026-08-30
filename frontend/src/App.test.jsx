import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "./app/store";
import App from "./App";

test("shows the splash screen on the home route", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </Provider>,
  );

  // "/" renders the Splash screen with the Ajali! heading and SOS entry point.
  expect(screen.getByRole("heading", { name: "Ajali!" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Emergency SOS/i })).toHaveAttribute("href", "/sos");
});
