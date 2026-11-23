import { useEffect, useRef, useState, type FormEvent } from "react";
import { FieldError, Form, Input, Label, TextField } from "react-aria-components";
import { Button } from "../components/Button";
import { fieldStyles } from "../components/Field";
import { Logo } from "../components/Logo";
import { forgetFocusedPath } from "../components/PageHeader";
import { UNREACHABLE } from "../lib/api";
import {
  retrySession,
  SESSION_ENDED,
  signIn,
  signInLocal,
  type SessionState,
  type Teammate,
} from "../lib/session";
import { usePageTitle } from "../lib/usePageTitle";
import styles from "./SignInPage.module.css";

type Props = { session: Extract<SessionState, { status: "signed-out" | "unreachable" }> };

/**
 * The sign-in screen (spec 4.13), at whatever address was asked for, with no top bar.
 * On Supabase it has the email and password fields. A local copy lists its made-up teammates.
 */
export function SignInPage({ session }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  usePageTitle("Sign in");

  useEffect(() => {
    // The screen that opens after signing in takes focus too.
    forgetFocusedPath();
    heading.current?.focus();
  }, []);

  const ended = session.status === "signed-out" && session.ended;
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <div className={styles.wordmark}>
          <Logo />
          Accountable
        </div>
        <section className={styles.panel} aria-labelledby="sign-in-title">
          <h1 id="sign-in-title" ref={heading} tabIndex={-1} className={styles.title}>
            Sign in
          </h1>
          {ended && (
            <p className={styles.notice} role="status">
              {SESSION_ENDED}
            </p>
          )}
          {session.status === "unreachable" ? (
            <Unreachable />
          ) : session.config.mode === "local" ? (
            <LocalSignIn people={session.config.people} />
          ) : (
            <PasswordSignIn />
          )}
        </section>
      </div>
    </main>
  );
}

function Unreachable() {
  const [trying, setTrying] = useState(false);
  return (
    <>
      <p className={styles.error} role="alert">
        {UNREACHABLE}
      </p>
      <Button
        variant="primary"
        className={styles.wide}
        isPending={trying}
        onPress={() => {
          setTrying(true);
          void retrySession();
        }}
      >
        Try again
      </Button>
    </>
  );
}

function PasswordSignIn() {
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Focus moves to the first field with an error.
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fieldErrors]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const missing: Record<string, string> = {};
    if (!email.trim()) missing.email = "Enter your email.";
    if (!password) missing.password = "Enter your password.";
    setFieldErrors(missing);
    if (Object.keys(missing).length > 0) return;
    setPending(true);
    setError(null);
    const failed = await signIn(email.trim(), password);
    // On success the app replaces this screen, so only a failure needs the form again.
    if (failed) {
      setError(failed);
      setPending(false);
    }
  }

  return (
    <Form
      ref={form}
      onSubmit={submit}
      validationErrors={fieldErrors}
      validationBehavior="aria"
      className={styles.form}
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <TextField
        name="email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
        className={fieldStyles.field}
      >
        <Label className={fieldStyles.label}>Email</Label>
        <Input className={fieldStyles.input} />
        <FieldError className={fieldStyles.error} />
      </TextField>
      <TextField
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        className={fieldStyles.field}
      >
        <Label className={fieldStyles.label}>Password</Label>
        <Input className={fieldStyles.input} />
        <FieldError className={fieldStyles.error} />
      </TextField>
      <Button variant="primary" type="submit" isPending={pending} className={styles.wide}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className={styles.help}>
        Need an account or a new password? Ask whoever runs Accountable for your team.
      </p>
    </Form>
  );
}

function LocalSignIn({ people }: { people: Teammate[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(person: Teammate) {
    if (pending) return;
    setPending(person.id);
    setError(null);
    const failed = await signInLocal(person.id);
    if (failed) {
      setError(failed);
      setPending(null);
    }
  }

  return (
    <div className={styles.form}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p>This copy runs on this computer with made-up teammates.</p>
      {people.map((person) => (
        <Button
          key={person.id}
          variant="secondary"
          className={styles.wide}
          isPending={pending === person.id}
          onPress={() => void choose(person)}
        >
          Sign in as {person.name}
        </Button>
      ))}
    </div>
  );
}
