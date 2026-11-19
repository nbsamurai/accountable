import { useEffect } from "react";

/** Sets the page title: "Contacts · Accountable", or "Jane Doe · Accountable" on a record's page. */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Accountable` : "Accountable";
  }, [title]);
}
