import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SearchResults } from "./queries";
import { SearchBox } from "./SearchBox";

const SEVEN: SearchResults = {
  organizations: [
    { id: 4, name: "Northpeak Energy", industry: "Energy" },
    { id: 9, name: "Peak Partners", industry: null },
  ],
  contacts: [
    { id: 3, name: "Jane Northpeak", organization: "Northpeak Energy" },
    { id: 7, name: "Pete Loner", organization: null },
  ],
  deals: [
    { id: 10, name: "Peak season", organization: "Northpeak Energy", stage: "proposal" },
    { id: 11, name: "Peak pilot", organization: null, stage: "new" },
    { id: 12, name: "Peak renewal", organization: "Peak Partners", stage: "won" },
  ],
};
const NONE: SearchResults = { organizations: [], contacts: [], deals: [] };

function serve(results: (q: string) => SearchResults) {
  const fetch = vi.fn(async (path: string) => {
    const q = new URL(path, "http://localhost").searchParams.get("q") ?? "";
    return Response.json(results(q));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderSearch() {
  const router = createMemoryRouter([{ path: "*", element: <SearchBox /> }], {
    initialEntries: ["/"],
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const box = () =>
  screen.getByRole("combobox", { name: "Search organizations, contacts and deals" });

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function typeAndWait(text: string) {
  await user.type(box(), text);
  await act(() => vi.advanceTimersByTimeAsync(250));
}

test("it sits in a search landmark, with Search as its placeholder", () => {
  serve(() => NONE);
  renderSearch();
  expect(screen.getByRole("search")).toContainElement(box());
  expect(box()).toHaveAttribute("placeholder", "Search");
});

test("it waits 250 ms after typing stops", async () => {
  // A clock that moves only when the test moves it, to the millisecond. Typing goes straight
  // to the input, since user-event waits on timers of its own.
  vi.useRealTimers();
  vi.useFakeTimers();
  const fetch = serve(() => SEVEN);
  renderSearch();
  fireEvent.change(box(), { target: { value: "p" } });
  await act(() => vi.advanceTimersByTimeAsync(200));
  fireEvent.change(box(), { target: { value: "pe" } });
  await act(() => vi.advanceTimersByTimeAsync(249));
  expect(fetch).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]![0]).toBe("/api/search?q=pe");
});

test("the groups come in order, each match with its detail or –, and empty groups are left out", async () => {
  serve((q) => (q === "peak" ? { ...SEVEN, contacts: [] } : SEVEN));
  renderSearch();
  await typeAndWait("pe");
  const list = await screen.findByRole("listbox");
  const groups = within(list).getAllByRole("group");
  expect(groups).toHaveLength(3);
  expect(within(groups[0]!).getByText("Organizations")).toBeInTheDocument();
  expect(within(groups[1]!).getByText("Contacts")).toBeInTheDocument();
  expect(within(groups[2]!).getByText("Deals")).toBeInTheDocument();

  const options = within(list).getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "Northpeak EnergyEnergy",
    "Peak Partners–",
    "Jane NorthpeakNorthpeak Energy",
    "Pete Loner–",
    "Peak seasonNorthpeak Energy · Proposal",
    "Peak pilot– · New",
    "Peak renewalPeak Partners · Won",
  ]);

  await typeAndWait("ak");
  await vi.waitFor(() => expect(screen.queryByText("Contacts")).not.toBeInTheDocument());
  expect(screen.getByText("Organizations")).toBeInTheDocument();
});

test("the live region says how many matches came", async () => {
  serve(() => SEVEN);
  renderSearch();
  await typeAndWait("pe");
  expect(await screen.findByText("7 matches.")).toBeInTheDocument();
});

test("no matches says so, in the list and the live region", async () => {
  serve(() => NONE);
  renderSearch();
  await typeAndWait("zz");
  const said = await screen.findAllByText('No matches for "zz".');
  expect(said).toHaveLength(2);
});

test("choosing a match opens its page and clears the box", async () => {
  serve(() => SEVEN);
  const router = renderSearch();
  await typeAndWait("pe");
  await user.click(await screen.findByRole("option", { name: /Pete Loner/ }));
  expect(router.state.location.pathname).toBe("/contacts/7");
  expect(box()).toHaveValue("");
});

test("the arrow keys move across the groups, and Enter opens a match", async () => {
  serve(() => SEVEN);
  const router = renderSearch();
  await typeAndWait("pe");
  await screen.findByRole("listbox");
  for (let i = 0; i < 5; i++) await user.keyboard("{ArrowDown}");
  expect(box()).toHaveAttribute(
    "aria-activedescendant",
    screen.getByRole("option", { name: /Peak season/ }).id,
  );
  await user.keyboard("{Enter}");
  expect(router.state.location.pathname).toBe("/deals/10");
  expect(box()).toHaveValue("");
});

test("Escape closes the list, then clears the box", async () => {
  serve(() => SEVEN);
  renderSearch();
  await typeAndWait("pe");
  await screen.findByRole("listbox");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(box()).toHaveValue("pe");
  await user.keyboard("{Escape}");
  expect(box()).toHaveValue("");
  // Clearing the box mustn't open the list again, with old matches or "Searching…".
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(box()).toHaveAttribute("aria-expanded", "false");
});
