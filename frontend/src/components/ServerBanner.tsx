import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { api, UNREACHABLE, useServerReachable } from "../lib/api";
import { Button } from "./Button";
import styles from "./ServerBanner.module.css";

/** At the top of the main area while the server can't be reached (spec 4.11). */
export function ServerBanner() {
  const reachable = useServerReachable();
  const client = useQueryClient();
  const [trying, setTrying] = useState(false);

  if (reachable) return null;

  async function tryAgain() {
    setTrying(true);
    try {
      await api.get("/health");
      await client.refetchQueries({ type: "active" });
    } catch {
      // Still unreachable: the banner stays.
    } finally {
      setTrying(false);
    }
  }

  return (
    <div className={styles.banner} role="alert">
      <p>{UNREACHABLE}</p>
      <Button
        variant="secondary"
        icon={<RefreshCw size={16} aria-hidden="true" />}
        onPress={tryAgain}
        isPending={trying}
      >
        Try again
      </Button>
    </div>
  );
}
