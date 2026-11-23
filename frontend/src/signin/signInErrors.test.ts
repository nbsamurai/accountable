import { expect, test } from "vitest";
import { COULDNT_SIGN_IN, NO_ANSWER, signInError, WRONG_PASSWORD } from "./signInErrors";

test("a wrong email or password", () => {
  expect(signInError({ name: "AuthApiError", code: "invalid_credentials", status: 400 })).toBe(
    "That email and password don't match. Try again.",
  );
  expect(WRONG_PASSWORD).toBe("That email and password don't match. Try again.");
});

test("no answer from Supabase", () => {
  expect(signInError({ name: "AuthRetryableFetchError", status: 0 })).toBe(
    "Can't reach the sign-in service. Check your internet connection, then try again.",
  );
  expect(signInError(new TypeError("Failed to fetch"))).toBe(NO_ANSWER);
});

test("too many attempts, or anything else", () => {
  expect(signInError({ name: "AuthApiError", code: "over_request_rate_limit", status: 429 })).toBe(
    "Couldn't sign in. Try again in a few minutes.",
  );
  expect(signInError(new Error("Something else"))).toBe(COULDNT_SIGN_IN);
  expect(signInError(null)).toBe(COULDNT_SIGN_IN);
});
