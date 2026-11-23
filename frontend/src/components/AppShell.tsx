import { Menu as MenuIcon, X } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { Toaster } from "sonner";
import { useShownTheme } from "../lib/theme";
import { SearchBox } from "../search/SearchBox";
import styles from "./AppShell.module.css";
import { Logo } from "./Logo";
import { ServerBanner } from "./ServerBanner";
import { UserMenu } from "./UserMenu";

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
      <Logo />
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

/**
 * At 1,100 px and below the sections move into a "Menu" button, and at 640 px and below the
 * search box goes in it too, above the sections (spec 4.1).
 */
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
      <div id={id} hidden={!open} className={styles.narrowNav}>
        <SearchBox className={styles.menuSearch} />
        <nav aria-label="Sections">
          <SectionLinks className={styles.narrowList} onKeyDown={closeOnEscape} />
        </nav>
      </div>
    </div>
  );
}

/** The top bar, the skip link, the main area and the messages. Every screen renders inside it. */
export function AppShell() {
  const main = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const theme = useShownTheme();
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
            <SearchBox className={styles.barSearch} />
            <NarrowMenu key={pathname} />
            <UserMenu />
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
