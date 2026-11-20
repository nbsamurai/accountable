import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  contact,
  contacts,
  dashboard,
  deal,
  note,
  organization,
  page,
  pipeline,
  stageChange,
} from "../test/records";
import { makeQueryClient, routes } from "./App";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
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
  expect(
    await screen.findByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to the dashboard" })).toHaveAttribute("href", "/");
});

test("the skip link comes first", async () => {
  renderAt("/contacts");
  await screen.findByRole("heading", { level: 1, name: "Contacts" });
  const first = document.body.querySelector("a, button");
  expect(first).toHaveTextContent("Skip to main content");
});

type Handler = (url: URL, init: RequestInit) => unknown;

function serve(routes: Record<string, unknown>) {
  const fetch = vi.fn(async (path: string, init: RequestInit) => {
    const url = new URL(path, "http://localhost");
    const route = routes[`${init.method} ${url.pathname}`];
    const result = typeof route === "function" ? (route as Handler)(url, init) : route;
    if (result instanceof Response) return result;
    if (result !== undefined) return Response.json(result);
    return Response.json({ detail: "Record not found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function sent(fetch: ReturnType<typeof serve>, method: string, path: string) {
  return fetch.mock.calls
    .filter(([url, init]) => url === `/api${path}` && init.method === method)
    .map(([, init]) => init.body && JSON.parse(String(init.body)));
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("search, sorting and paging keep their state in the URL", async () => {
  const user = userEvent.setup();
  serve({ "GET /api/organizations": { items: [organization], total: 51 } });
  const router = renderAt("/organizations?page=2");
  expect(await screen.findByText("51–51 of 51")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Previous" }));
  expect(router.state.location.search).toBe("");
  await user.click(screen.getByRole("button", { name: "Name" }));
  expect(router.state.location.search).toBe("?dir=desc");
  expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await user.type(screen.getByRole("searchbox"), "Energy");
  await waitFor(() => expect(router.state.location.search).toBe("?dir=desc&q=Energy"));
});

test("creating an organization displays field errors and sends the corrected values", async () => {
  const user = userEvent.setup();
  let created = false;
  const fetch = serve({
    "GET /api/organizations": () => (created ? page(organization) : page()),
    "POST /api/organizations": (_url: URL, init: RequestInit) => {
      if (JSON.parse(String(init.body)).website === "bad.invalid") {
        return Response.json(
          { detail: [{ loc: ["body", "website"], msg: "Enter a valid website." }] },
          { status: 422 },
        );
      }
      created = true;
      return organization;
    },
  });
  renderAt("/organizations");
  const empty = await screen.findByText("No organizations yet.");
  expect(empty).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Add organization" })[0]!);
  const dialog = within(await screen.findByRole("dialog", { name: "Add organization" }));
  const name = dialog.getByRole("textbox", { name: /Name/ });
  await waitFor(() => expect(name).toHaveFocus());
  await user.type(name, organization.name);
  const website = dialog.getByRole("textbox", { name: "Website" });
  await user.type(website, "bad.invalid");
  await user.click(dialog.getByRole("button", { name: "Save" }));
  expect(await dialog.findByText("Enter a valid website.")).toBeInTheDocument();
  await waitFor(() => expect(website).toHaveFocus());
  await user.clear(website);
  await user.type(website, organization.website!);
  await user.click(dialog.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("link", { name: organization.name })).toBeInTheDocument();
  expect(sent(fetch, "POST", "/organizations").at(-1)).toMatchObject({
    name: organization.name,
    website: organization.website,
  });
});

test("opening an organization links to its records and can add a contact with the organization filled in", async () => {
  const user = userEvent.setup();
  const fetch = serve({
    "GET /api/organizations/1": organization,
    "GET /api/organizations": page(organization),
    "POST /api/contacts": contact,
  });
  renderAt("/organizations/1");
  expect(await screen.findByRole("link", { name: contact.name })).toHaveAttribute(
    "href",
    "/contacts/2",
  );
  expect(screen.getByRole("link", { name: deal.name })).toHaveAttribute("href", "/deals/3");
  expect(screen.getByText(organization.notes!)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add contact" }));
  const dialog = within(await screen.findByRole("dialog", { name: "Add contact" }));
  expect(dialog.getByRole("combobox", { name: "Organization" })).toHaveValue(organization.name);
  await user.type(dialog.getByRole("textbox", { name: /Name/ }), contact.name);
  await user.click(dialog.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(sent(fetch, "POST", "/contacts")).toEqual([
    expect.objectContaining({ name: contact.name, organization_id: 1, status: "lead" }),
  ]);
});

test("contact filters update the URL and an edited contact keeps the selected organization", async () => {
  const user = userEvent.setup();
  const fetch = serve({
    "GET /api/contacts": contacts,
    "GET /api/organizations": page(organization),
    "PATCH /api/contacts/2": contact,
  });
  const router = renderAt("/contacts");
  expect(await screen.findByRole("link", { name: contact.name })).toBeInTheDocument();
  await user.click(screen.getByText("Leads"));
  expect(router.state.location.search).toBe("?status=lead");
  await user.click(screen.getByRole("button", { name: `Edit ${contact.name}` }));
  const dialog = within(await screen.findByRole("dialog", { name: "Edit contact" }));
  await user.click(dialog.getByRole("radio", { name: "Qualified" }));
  await user.click(dialog.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(sent(fetch, "PATCH", "/contacts/2")).toEqual([
    expect.objectContaining({ name: contact.name, organization_id: 1, status: "qualified" }),
  ]);
});

test("a deal edit preserves the draft and cancelling starts over on the next open", async () => {
  const user = userEvent.setup();
  serve({
    "GET /api/deals": page(deal),
    "GET /api/organizations": page(organization),
    "GET /api/contacts": contacts,
  });
  renderAt("/deals");
  expect(await screen.findByRole("link", { name: deal.name })).toBeInTheDocument();
  const edit = screen.getByRole("button", { name: `Edit ${deal.name}` });
  await user.click(edit);
  const dialog = within(await screen.findByRole("dialog", { name: "Edit deal" }));
  const name = dialog.getByRole("textbox", { name: /Name/ });
  await user.clear(name);
  await user.type(name, "Temporary");
  await user.click(dialog.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(edit).toHaveFocus());
  await user.click(edit);
  expect(await screen.findByRole("textbox", { name: /Name/ })).toHaveValue(deal.name);
});

test("the deal stage path saves the selected stage and retains the activity timeline", async () => {
  const user = userEvent.setup();
  let currentDeal = deal;
  const fetch = serve({
    "GET /api/deals/3": () => currentDeal,
    "GET /api/deals/3/timeline": page(stageChange),
    "PATCH /api/deals/3": () => {
      currentDeal = { ...deal, stage: "qualified", probability: 25 };
      return { deal: currentDeal, contact: null };
    },
  });
  renderAt("/deals/3");
  expect(await screen.findByText(stageChange.description)).toBeInTheDocument();
  const qualified = screen.getByRole("radio", { name: "Qualified" });
  await user.click(qualified);
  await waitFor(() => expect(qualified).toHaveAttribute("aria-checked", "true"));
  expect(sent(fetch, "PATCH", "/deals/3")).toEqual([{ stage: "qualified" }]);
  expect(screen.queryByRole("button", { name: /Edit stage change/ })).not.toBeInTheDocument();
});

test("the contact timeline logs, edits and deletes activities through the real forms", async () => {
  const user = userEvent.setup();
  let notes = [note];
  const fetch = serve({
    "GET /api/contacts/2": contact,
    "GET /api/contacts/2/timeline": () => page(...notes, stageChange),
    "POST /api/activities": (_url: URL, init: RequestInit) => {
      const added = {
        ...note,
        id: 8,
        description: JSON.parse(String(init.body)).description,
        follow_up_date: "2026-11-18",
      };
      notes = [added, ...notes];
      return added;
    },
    "PATCH /api/activities/8": (_url: URL, init: RequestInit) => {
      const updated = { ...notes[0]!, ...JSON.parse(String(init.body)) };
      notes = [updated, ...notes.slice(1)];
      return updated;
    },
    "DELETE /api/activities/8": () => {
      notes = notes.filter((item) => item.id !== 8);
      return new Response(null, { status: 204 });
    },
  });
  renderAt("/contacts/2");
  const timeline = within(await screen.findByRole("region", { name: "Timeline" }));
  expect(await timeline.findByRole("link", { name: deal.name })).toHaveAttribute(
    "href",
    "/deals/3",
  );
  const log = within(screen.getByRole("region", { name: "Log activity" }));
  await user.type(log.getByRole("textbox", { name: /Description/ }), "Schedule demo");
  await user.click(log.getByRole("button", { name: "Log activity" }));
  const activity = within((await timeline.findByText("Schedule demo")).closest("li")!);
  expect(sent(fetch, "POST", "/activities")).toEqual([
    expect.objectContaining({ contact_id: 2, description: "Schedule demo" }),
  ]);
  await user.click(activity.getByRole("button", { name: "Edit note" }));
  const edit = within(await screen.findByRole("dialog", { name: "Edit activity" }));
  const description = edit.getByRole("textbox", { name: /Description/ });
  await user.clear(description);
  await user.type(description, "Schedule site visit");
  await user.click(edit.getByRole("button", { name: "Save" }));
  expect(await timeline.findByText("Schedule site visit")).toBeInTheDocument();
  await user.click(activity.getByRole("checkbox"));
  await waitFor(() => expect(activity.getByRole("checkbox")).toBeChecked());
  expect(sent(fetch, "PATCH", "/activities/8")).toEqual([
    expect.objectContaining({ description: "Schedule site visit" }),
    { done: true },
  ]);
  await user.click(activity.getByRole("button", { name: "Delete note" }));
  const confirm = within(await screen.findByRole("alertdialog"));
  await waitFor(() => expect(confirm.getByRole("button", { name: "Cancel" })).toHaveFocus());
  await user.click(confirm.getByRole("button", { name: /Delete/ }));
  await waitFor(() => expect(timeline.queryByText("Schedule site visit")).not.toBeInTheDocument());
  expect(timeline.getByText(note.description)).toBeInTheDocument();
});

test("the dashboard shows follow-ups and exposes the same chart figures in tables", async () => {
  const user = userEvent.setup();
  const fetch = serve({
    "GET /api/dashboard": () => ({
      ...dashboard,
      follow_ups: dashboard.follow_ups.filter(
        ({ id }) => id !== note.id || sent(fetch, "PATCH", "/activities/4").length === 0,
      ),
    }),
    "PATCH /api/activities/4": { ...note, done: true },
  });
  renderAt("/");
  const followUps = within(await screen.findByRole("region", { name: "Follow-ups" }));
  expect(followUps.getByText("1 overdue and 1 due in the next 7 days.")).toBeInTheDocument();
  expect(followUps.getByText("Call buyer")).toBeInTheDocument();
  for (const title of ["Revenue won by month", "Sales funnel", "Deals won by month"]) {
    const chart = within(screen.getByRole("region", { name: title }));
    await user.click(chart.getByRole("button", { name: "Show as table" }));
    expect(chart.getByRole("table")).toBeInTheDocument();
  }
  await user.click(
    within(followUps.getByText(note.description).closest("li")!).getByRole("checkbox"),
  );
  await waitFor(() => expect(followUps.queryByText(note.description)).not.toBeInTheDocument());
  expect(sent(fetch, "PATCH", "/activities/4")).toEqual([{ done: true }]);
  expect(screen.getByRole("region", { name: "Recent activity" })).toHaveTextContent(
    stageChange.description,
  );
});

test("a pipeline card can move between stages using its menu", async () => {
  const user = userEvent.setup();
  const moved = { ...deal, stage: "qualified" as const };
  let board = pipeline;
  const fetch = serve({
    "GET /api/pipeline": () => board,
    "POST /api/deals/3/move": () => {
      board = {
        ...pipeline,
        columns: pipeline.columns.map((column) => {
          if (column.stage === "new") return { ...column, count: 0, cards: [] };
          if (column.stage === "qualified") return { ...column, count: 1, cards: [moved] };
          return column;
        }),
      };
      return { deal: moved, contact: null };
    },
  });
  renderAt("/pipeline");
  const boardView = within(await screen.findByRole("region", { name: "Pipeline board" }));
  const from = within(boardView.getByRole("region", { name: "New" }));
  const destination = within(boardView.getByRole("region", { name: "Qualified" }));
  const menuName = `More actions for ${deal.name}`;
  await user.click(from.getByRole("button", { name: menuName }));
  await user.click(await screen.findByRole("menuitem", { name: "Qualified" }));
  expect(await destination.findByText(deal.name)).toBeInTheDocument();
  await waitFor(() => expect(destination.getByRole("button", { name: menuName })).toHaveFocus());
  expect(from.queryByText(deal.name)).not.toBeInTheDocument();
  expect(sent(fetch, "POST", "/deals/3/move")).toEqual([{ stage: "qualified", before_id: null }]);
});

test("adding a deal from the pipeline saves the column's default stage and probability", async () => {
  const user = userEvent.setup();
  const fetch = serve({
    "GET /api/pipeline": pipeline,
    "GET /api/organizations": page(organization),
    "GET /api/contacts": contacts,
    "POST /api/deals": { deal: { ...deal, stage: "proposal", probability: 50 }, contact: null },
  });
  renderAt("/pipeline");
  await user.click(await screen.findByRole("button", { name: "Add deal to Proposal" }));
  const form = within(await screen.findByRole("dialog", { name: "Add deal" }));
  expect(form.getByRole("textbox", { name: "Probability (%)" })).toHaveValue("50");
  await user.type(form.getByRole("textbox", { name: /Name/ }), "New proposal");
  await user.click(form.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(sent(fetch, "POST", "/deals")).toEqual([
    expect.objectContaining({ name: "New proposal", stage: "proposal", probability: 50 }),
  ]);
});

test("deleting an organization requires confirmation and removes it from the list", async () => {
  const user = userEvent.setup();
  let removed = false;
  const fetch = serve({
    "GET /api/organizations": () => (removed ? page() : page(organization)),
    "GET /api/organizations/1": organization,
    "DELETE /api/organizations/1": () => {
      removed = true;
      return new Response(null, { status: 204 });
    },
  });
  renderAt("/organizations");
  const trigger = await screen.findByRole("button", { name: `Delete ${organization.name}` });
  await user.click(trigger);
  const dialog = within(await screen.findByRole("alertdialog"));
  expect(dialog.getByText(/Its 1 contact and 1 deal will be kept/)).toBeInTheDocument();
  await user.click(dialog.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(sent(fetch, "DELETE", "/organizations/1")).toEqual([]);
  await user.click(trigger);
  await user.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Delete organization",
    }),
  );
  expect(await screen.findByText("No organizations yet.")).toBeInTheDocument();
});
