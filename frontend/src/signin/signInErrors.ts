// The sign-in screen's messages for errors from Supabase Auth (spec 4.13). It reads the
// error's code and name, so it never imports Supabase's client, which a local copy never loads.

export const WRONG_PASSWORD = "That email and password don't match. Try again.";
export const NO_ANSWER =
  "Can't reach the sign-in service. Check your internet connection, then try again.";
export const COULDNT_SIGN_IN = "Couldn't sign in. Try again in a few minutes.";

/** The message for an error from signing in: a wrong password, no answer, or anything else. */
export function signInError(error: unknown): string {
  const found = (error ?? {}) as { code?: unknown; name?: unknown };
  if (found.code === "invalid_credentials") return WRONG_PASSWORD;
  // Supabase's client gives AuthRetryableFetchError when its request gets no answer.
  // A plain fetch that fails throws a TypeError.
  if (found.name === "AuthRetryableFetchError" || error instanceof TypeError) return NO_ANSWER;
  return COULDNT_SIGN_IN;
}
