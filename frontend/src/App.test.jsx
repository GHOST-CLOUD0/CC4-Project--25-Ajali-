import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "./app/store";
import App from "./App";

test("redirects the home route to the incidents feed", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </Provider>,
  );

  // "/" navigates to /incidents, whose page heading is "Incidents".
  expect(screen.getByRole("heading", { name: "Incidents" })).toBeInTheDocument();
});
