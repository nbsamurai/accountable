import { Menu as MenuIcon, X } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { Toaster } from "sonner";
import { useTheme } from "../lib/theme";
import styles from "./AppShell.module.css";
import { ServerBanner } from "./ServerBanner";
import { ThemeToggle } from "./ThemeToggle";

const SECTIONS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/organizations", label: "Organizations" },
  { to: "/contacts", label: "Contacts" },
  { to: "/deals", label: "Deals" },
  { to: "/pipeline", label: "Pipeline" },
];

function Wordmark() {
  return (
    <Link to="/" className={styles.wordmark}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="var(--primary)" />
        <path
          d="M8 14.5l4 4 8-9"
          fill="none"
          stroke="var(--on-bright)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Accountable
    </Link>
  );
}

function SectionLinks({
  className,
  onKeyDown,
}: {
  className: string;
  onKeyDown?: (event: KeyboardEvent) => void;
}) {
  return (
    <ul className={className}>
      {SECTIONS.map((section) => (
        <li key={section.to}>
          <NavLink to={section.to} end={section.end} className={styles.link} onKeyDown={onKeyDown}>
            {section.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** In narrow windows the sections move into a "Menu" button (spec 4.1). */
function NarrowMenu() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.current?.focus();
    }
  }

  return (
    <div className={styles.narrow}>
      <button
        ref={button}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={closeOnEscape}
      >
        {open ? <X size={18} aria-hidden="true" /> : <MenuIcon size={18} aria-hidden="true" />}
        Menu
      </button>
      <nav id={id} aria-label="Sections" hidden={!open} className={styles.narrowNav}>
        <SectionLinks className={styles.narrowList} onKeyDown={closeOnEscape} />
      </nav>
    </div>
  );
}

/** The top bar, the skip link, the main area and the messages. Every screen renders inside it. */
export function AppShell() {
  const main = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [theme] = useTheme();
  return (
    <>
      <a
        className={styles.skip}
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView();
        }}
      >
        Skip to main content
      </a>
      <header className={styles.topbar}>
        <div className={styles.inner}>
          <Wordmark />
          <nav aria-label="Sections" className={styles.wide}>
            <SectionLinks className={styles.list} />
          </nav>
          <div className={styles.end}>
            <NarrowMenu key={pathname} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        <ServerBanner />
        <Outlet />
      </main>
      <Toaster
        theme={theme}
        position="bottom-right"
        duration={5000}
        closeButton
        containerAriaLabel="Messages"
      />
      <ScrollRestoration />
    </>
  );
}
