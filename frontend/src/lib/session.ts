// The browser's session (spec 3.10): how to sign in, the access token for the API, and
// signing out.
//
// - On Supabase, Supabase's client signs in with an email and password, keeps the session in
//   localStorage and renews its token before it runs out. It's loaded only on Supabase.
// - A local copy never loads it, so it makes no request beyond 127.0.0.1. Its sign-in screen
//   lists made-up teammates, and the token the backend gives one is kept in localStorage.

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COULDNT_SIGN_IN, signInError } from "../signin/signInErrors";

export type Teammate = { id: string; name: string; email: string };

export type AuthConfig =
  | { mode: "local"; people: Teammate[] }
  | { mode: "supabase"; supabase_url: string; publishable_key: string };

export type SessionState =
  | { status: "loading" }
  /** /api/auth/config got no answer, so the app can't tell how to sign in. */
  | { status: "unreachable" }
  /** `ended` is true when the session ended by itself, not by signing out. */
  | { status: "signed-out"; config: AuthConfig; ended: boolean }
  | { status: "signed-in"; config: AuthConfig };

export const SESSION_ENDED = "Your session has ended. Sign in again.";
/** Where a local copy keeps its token. The theme's own key stays when it's removed. */
export const LOCAL_TOKEN_KEY = "accountable-local-session";

let state: SessionState = { status: "loading" };
let starting: Promise<void> | null = null;
let supabase: SupabaseClient | null = null;
let signingOut = false;
// The local token, when the browser blocks storage.
let memoryToken: string | null = null;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

function readLocalToken(): string | null {
  try {
    return localStorage.getItem(LOCAL_TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

function writeLocalToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(LOCAL_TOKEN_KEY, token);
    else localStorage.removeItem(LOCAL_TOKEN_KEY);
  } catch {
    // Storage is blocked: the token lives in memory until the page reloads.
  }
}

async function startSupabase(config: Extract<AuthConfig, { mode: "supabase" }>) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(config.supabase_url, config.publishable_key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  supabase = client;
  const { data } = await client.auth.getSession();
  client.auth.onAuthStateChange((event) => {
    // The session ended by itself, such as when its token couldn't be renewed.
    if (event === "SIGNED_OUT" && !signingOut && state.status === "signed-in") {
      set({ status: "signed-out", config, ended: true });
    }
  });
  set(
    data.session ? { status: "signed-in", config } : { status: "signed-out", config, ended: false },
  );
}

async function start() {
  let config: AuthConfig;
  try {
    const response = await fetch("/api/auth/config");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    config = (await response.json()) as AuthConfig;
  } catch {
    set({ status: "unreachable" });
    return;
  }
  if (config.mode === "supabase") {
    try {
      await startSupabase(config);
    } catch {
      set({ status: "unreachable" });
    }
    return;
  }
  set(
    readLocalToken()
      ? { status: "signed-in", config }
      : { status: "signed-out", config, ended: false },
  );
}

/** Asks the backend how to sign in, and picks up a session kept from before. Runs once. */
export function startSession(): Promise<void> {
  starting ??= start();
  return starting;
}

/** Asks again, after /api/auth/config got no answer. */
export function retrySession(): Promise<void> {
  starting = null;
  set({ status: "loading" });
  return startSession();
}

/**
 * The access token to send with each API request, renewed first when it's about to run out.
 * Throws when the token ran out and Supabase didn't answer to renew it.
 */
export async function getAccessToken(): Promise<string | null> {
  if (state.status !== "signed-in") return null;
  if (state.config.mode === "local") return readLocalToken();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  // Supabase keeps the session after a renewal that got no answer, and renews it later.
  // A request without a token would get a 401 and end it, so none is sent (spec 3.10).
  if (error?.name === "AuthRetryableFetchError") {
    throw new Error("Can't reach the sign-in service to renew the session.");
  }
  return data.session?.access_token ?? null;
}

/** Signs in with an email and password. Returns the message to show when it fails. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (state.status !== "signed-out" || !supabase) return COULDNT_SIGN_IN;
  const config = state.config;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return signInError(error);
  } catch (error) {
    return signInError(error);
  }
  set({ status: "signed-in", config });
  return null;
}

/** Signs in as a made-up teammate on a local copy. Returns the message to show when it fails. */
export async function signInLocal(personId: string): Promise<string | null> {
  if (state.status !== "signed-out") return COULDNT_SIGN_IN;
  const config = state.config;
  try {
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: personId }),
    });
    if (!response.ok) return COULDNT_SIGN_IN;
    const { access_token } = (await response.json()) as { access_token: string };
    writeLocalToken(access_token);
  } catch (error) {
    return signInError(error);
  }
  set({ status: "signed-in", config });
  return null;
}

async function forget(ended: boolean) {
  if (state.status !== "signed-in") return;
  const config = state.config;
  writeLocalToken(null);
  set({ status: "signed-out", config, ended });
  if (!supabase) return;
  signingOut = true;
  try {
    // Only this browser's session. The theme and everything else in storage stay.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The session is gone from this browser either way.
  } finally {
    signingOut = false;
  }
}

/** Signs out in this browser. The theme stays. */
export function signOut(): Promise<void> {
  return forget(false);
}

/** The API answered 401: the session ended or the person was removed. */
export function endSession(): Promise<void> {
  return forget(true);
}

/** Starts again from nothing, for tests. */
export function resetSession() {
  state = { status: "loading" };
  starting = null;
  supabase = null;
  signingOut = false;
  memoryToken = null;
}
