import { afterEach, expect, test, vi } from "vitest";
import { api, ApiError, query, UnreachableError } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

test("a 422 gives each field its message", async () => {
  respond(422, { detail: [{ loc: ["body", "name"], msg: "Enter a name.", type: "x" }] });
  const error = (await api.post("/contacts", {}).catch((e) => e)) as ApiError;
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(422);
  expect(error.fields).toEqual({ name: "Enter a name." });
});

test("a 404 or 409 gives its message", async () => {
  respond(409, { detail: "Stage changes can't be changed." });
  const error = (await api.delete("/activities/1").catch((e) => e)) as ApiError;
  expect(error.message).toBe("Stage changes can't be changed.");
});

test("no answer, or the proxy's 502, means the server can't be reached", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
  );
  await expect(api.get("/health")).rejects.toBeInstanceOf(UnreachableError);
  respond(502);
  await expect(api.get("/health")).rejects.toBeInstanceOf(UnreachableError);
});

test("query strings leave out empty values", () => {
  expect(query({ q: "ann", status: undefined, page: 2, sort: "" })).toBe("?q=ann&page=2");
  expect(query({})).toBe("");
});
