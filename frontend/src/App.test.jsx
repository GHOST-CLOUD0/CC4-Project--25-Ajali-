import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "./app/store";
import App from "./App";

test("renders the Ajali home page", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </Provider>,
  );

  expect(screen.getByRole("heading", { name: "Ajali!" })).toBeInTheDocument();
});
