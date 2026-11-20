// The requests to the backend, and its errors in FastAPI's shapes (spec 9.3):
// 422 has a list of { loc, msg }, and 404 and 409 have a message in `detail`.

import { useSyncExternalStore } from "react";

export type Params = Record<string, string | number | boolean | null | undefined>;

/** A page of a list: `{ items, total }`. */
export type Page<T> = { items: T[]; total: number };

/** A link to a record. */
export type Ref = { id: number; name: string };

/** The server answered with an error. `fields` holds the messages for each field of a 422. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/** The server didn't answer: it isn't running, or the frontend can't reach it. */
export class UnreachableError extends Error {
  constructor() {
    super("Can't reach Accountable. Check that it's still running, then try again.");
    this.name = "UnreachableError";
  }
}

// Whether the last request reached the server. The banner shows while it's false.
let reachable = true;
const listeners = new Set<() => void>();

function setReachable(value: boolean) {
  if (reachable === value) return;
  reachable = value;
  listeners.forEach((listener) => listener());
}

export function useServerReachable(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => reachable,
  );
}

type FastApiError = { loc: (string | number)[]; msg: string };

function errorFrom(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    for (const error of detail as FastApiError[]) {
      const field = String(error.loc.at(-1) ?? "");
      fields[field] ??= error.msg;
    }
    const first = (detail as FastApiError[])[0]?.msg ?? "Check the highlighted fields.";
    return new ApiError(status, first, fields);
  }
  if (typeof detail === "string") return new ApiError(status, detail);
  return new ApiError(status, "Something went wrong. Try again.");
}

export function query(params: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    setReachable(false);
    throw new UnreachableError();
  }
  // Vite's proxy answers 502 when the backend isn't running.
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    setReachable(false);
    throw new UnreachableError();
  }
  setReachable(true);
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFrom(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>("GET", `${path}${query(params)}`),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
