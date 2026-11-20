import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test } from "vitest";
import { makeQueryClient, routes } from "./App";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

test("the dashboard is the current section at /", async () => {
  renderAt("/");
  expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  const nav = screen.getAllByRole("navigation", { name: "Sections" })[0]!;
  const current = nav.querySelector('[aria-current="page"]');
  expect(current).toHaveTextContent("Dashboard");
  expect(document.title).toBe("Dashboard · Accountable");
});

test("an unknown address shows Page not found with a link to the dashboard", async () => {
  renderAt("/nowhere");
  expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to the dashboard" })).toHaveAttribute("href", "/");
});

test("the skip link comes first", async () => {
  renderAt("/contacts");
  await screen.findByRole("heading", { level: 1, name: "Contacts" });
  const first = document.body.querySelector("a, button");
  expect(first).toHaveTextContent("Skip to main content");
});
