import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { startSession, useSession } from "../lib/session";
import { SignInPage } from "./SignInPage";

/**
 * Signed out, the sign-in screen shows at the same address. Signed in, the app shows
 * (spec 3.10). When the session ends, the records the browser holds are cleared.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const client = useQueryClient();
  const signedIn = session.status === "signed-in";

  useEffect(() => {
    void startSession();
  }, []);

  useEffect(() => {
    if (!signedIn) client.clear();
  }, [signedIn, client]);

  if (session.status === "loading") return null;
  if (session.status === "signed-in") return children;
  return <SignInPage session={session} />;
}
