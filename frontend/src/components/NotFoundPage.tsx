import { Link } from "react-router";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";

/** Any address the app doesn't know, or a record that no longer exists. */
export function NotFoundPage({
  title = "Page not found",
  message = "There's nothing at this address.",
  linkTo = "/",
  linkLabel = "Go to the dashboard",
}: {
  title?: string;
  message?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <Panel as="div">
        <p>{message}</p>
        <p style={{ marginTop: "var(--space-3)" }}>
          <Link to={linkTo}>{linkLabel}</Link>
        </p>
      </Panel>
    </>
  );
}
