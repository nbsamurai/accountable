# People and sign-in

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

### Person

A person is someone on the team. People are added and removed in Supabase's dashboard, not in Accountable, and there's no sign-up page. Accountable keeps its own row for each person who has signed in, so it can show who added and changed each record.

| Field | Type | Notes |
|---|---|---|
| id | the person's Supabase user id | From their token |
| email | text | From their token |
| name | text | The `full_name` in their Supabase user metadata, or `name` when there's no `full_name`. Empty when there's neither |

- The backend keeps the row up to date from the token on each request. A new name shows once the person's next token arrives, within the hour.
- A person removed in Supabase can't sign in any more, but their row stays, so the records they added still show their name. People's rows are never deleted.
- The sample data adds three made-up teammates (section 8). They have rows but no Supabase account, so they can't sign in to the shared app.

**How a person shows:** their name, or their email when they have no name.

**Initials:** up to two capital letters, from the same name or email. A name gives the first letters of its first and last words, so "Alex Rivera" gives "AR" and "Cher" gives "C". An email gives the first letters of the first two parts before the @, split at dots, dashes and underscores, so `jo.lee@team.example` gives "JL" and `sam@team.example` gives "S".

## 3. Rules

### 3.10 Signing in

- Everyone on the team signs in with their email and password, through Supabase Auth. There's no sign-up, password reset, magic link or Google sign-in.
- Everyone who can sign in can see and do everything. There are no roles.
- Signed out, every address shows the sign-in screen (section 4.13). Every API route answers 401, apart from the three that section 9.4 leaves open, which hold no records.
- The browser holds the session and sends its access token with every API request. The backend checks the token on every request (section 9.7) and takes the person from it, never from the request's body, address or other headers.
- Supabase's client renews the token before it runs out, so a person stays signed in across reloads and restarts until they sign out.
- If the API answers 401 during a session, because the session ended or the person was removed, the app shows the sign-in screen with "Your session has ended. Sign in again." After signing in, the person is back on the same page.
- **Signing out** ends the session in that browser, clears the records the browser holds, and shows the sign-in screen. The theme stays.
- **Two people at once:** when two people change the same record, the later save wins. Another person's changes show when a screen next loads its data: when it opens, when the browser tab comes back into focus, or after a reload. Nothing updates live.

**Local sign-in.** A copy that runs without the Supabase settings (section 9.8) uses a SQLite database and the made-up teammates. Its sign-in screen lists them, and choosing one signs in as them with no password. The backend signs those tokens itself, so restarting a local copy signs everyone out. Local sign-in works only when none of the Supabase settings is set and the backend listens on `127.0.0.1`. The tests, the hands-on check and ui-check use it, so they never touch Supabase or need anyone's password.

### 3.11 Who added and changed a record

- Each organization, contact, deal and activity records who added it, `created_by`, and who last changed it, `updated_by`, as well as when, `created_at` and `updated_at`.
- Adding a record sets both people to the signed-in person.
- Any change saved to a record sets `updated_by` and `updated_at`. That includes an edit, a stage change, a card moved on the board, a follow-up marked done or not done, and a contact made a customer by a Won deal, which counts as a change by the person who won it.
- Changes the database makes itself when a linked record is deleted (section 3.7) don't count. Logging an activity on a record changes the activity, not the record.
- A stage change is an activity, so it records who moved the deal.
- A record in a local database from before this change has no one recorded, and shows "–" in place of a name (section 3.9).

**On a record's page,** a caption under the name says who added the record and when: "Added by Alex Rivera on Nov 3, 2026." Once the record has changed, it goes on: "Last changed by Jordan Blake on Nov 19, 2026." The caption is 13 px, in `--ink-muted`.

**In a timeline,** each entry names who logged it (section 4.9).

## 4. Screens

### 4.13 The sign-in screen

- Signed out, the sign-in screen shows at whatever address was asked for, with no top bar or sections. After signing in, that address opens. The page title is "Sign in · Accountable".
- The wordmark sits above a panel, centered on the page background. The panel is 400 px wide, or the window's width less 32 px side margins when that's narrower.
- The panel has the `h1` "Sign in", then the Email and Password fields with their labels above them, then a primary "Sign in" button across the panel's width. Enter signs in. While it waits, the button says "Signing in…" and ignores more clicks.
- Under the button, in `--ink-muted`: "Need an account or a new password? Ask whoever runs Accountable for your team."
- **Errors** follow section 4.8. An empty field says "Enter your email." or "Enter your password." under it. Other errors show at the top of the form:
  - Wrong email or password: "That email and password don't match. Try again."
  - No answer from Supabase: "Can't reach the sign-in service. Check your internet connection, then try again."
  - Anything else, such as too many attempts: "Couldn't sign in. Try again in a few minutes."
- When a session has ended (section 3.10), "Your session has ended. Sign in again." shows at the top of the form until the person signs in.
- If Accountable itself doesn't answer, so the screen can't tell how to sign in, the panel says "Can't reach Accountable. Check your internet connection, then try again." with a primary "Try again" button in place of the form.
- **Local sign-in** (section 3.10) uses the same panel and `h1`, with "This copy runs on this computer with made-up teammates." and a secondary button for each teammate, such as "Sign in as Alex Rivera", in place of the fields.

### 4.14 The user menu

- **The button** is the signed-in person's initials in a circle at the right end of the top bar, at every width (section 5.6). Its tooltip says "Account: Alex Rivera", or the email when the person has no name. Its accessible name adds the initials it shows, "Account: Alex Rivera, AR", so someone using speech input can say either label they see (WCAG 2.5.3).
- While the person loads, a plain circle holds the button's place. If they can't be loaded, the button shows a Lucide user icon and is named "Account", so signing out still works.
- **The menu** opens under the button, lined up with its right edge (section 5.6, Menus). It has three groups:
  1. The person's name and email, as text, not as menu items. A person with no name shows the email once.
  2. "Theme", then "Light", "Dark" and "System", each with its Lucide icon (sun, moon and monitor). A check marks the current choice. Choosing one applies it at once (section 4.1) and closes the menu.
  3. "Sign out", with the Lucide log-out icon.
- After signing out, the sign-in screen shows, with focus on its `h1`.
