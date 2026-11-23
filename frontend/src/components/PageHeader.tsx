import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { usePageTitle } from "../lib/usePageTitle";
import styles from "./PageHeader.module.css";

// The address whose h1 last took focus. The first screen doesn't take focus,
// so the skip link stays the first thing to get it.
let focusedPath: string | null = typeof window === "undefined" ? null : window.location.pathname;

/** After the sign-in screen, the screen that opens takes focus, even at the same address. */
export function forgetFocusedPath() {
  focusedPath = null;
}

type Props = {
  title: string;
  /** Shown beside the title, such as the dashboard's tagline or a status pill. */
  aside?: ReactNode;
  /** The screen's main action, on the right. */
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * The screen's one h1, with its main action on the right. When a new screen opens,
 * focus moves to the h1 and the page title updates. Searching and paging don't move focus.
 */
export function PageHeader({ title, aside, actions, children }: Props) {
  const { pathname } = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  usePageTitle(title);

  useEffect(() => {
    if (focusedPath !== pathname) {
      focusedPath = pathname;
      heading.current?.focus();
    }
  }, [pathname]);

  return (
    <div className={styles.head}>
      <div className={styles.lede}>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        {aside}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
      {children}
    </div>
  );
}
