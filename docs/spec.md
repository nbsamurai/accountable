# Accountable product spec

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. That makes it hard to see at a glance which companies it deals with, who its contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## 1. Scope

Accountable is a sales CRM that a small sales team shares on the web. It brings organizations, contacts, deals and activities together in five sections. The Dashboard shows sales figures, recent activity and follow-ups. Organizations, Contacts and Deals are where the team finds and manages records. The Pipeline shows deals by stage and lets the team move and reorder them. A search box in the top bar finds any organization, contact or deal by name.

Everyone signs in with an email and password. People are added in Supabase's dashboard, there's no sign-up page, and everyone can do everything. Each record and activity shows who added it. A menu under the person's initials holds the theme, Light, Dark or System, and signing out. Light is the default.

The app uses a desktop layout. It uses US dollars and a fixed set of sales stages and record fields. The team logs notes, calls and emails in the app. Sales reporting is on the dashboard.

The data lives in Postgres on Supabase, so Accountable needs an internet connection. The app runs on Render as one web service (section 9.9). On a developer's computer, `npm run dev` uses the database the settings point at. Without the Supabase settings it runs as a local copy, with a SQLite file and made-up teammates, which is how the tests run (section 9.8). The first run installs dependencies and opens the app with sample data. Section 9.6 covers the commands. See the [setup instructions](STATUS.md#install-once) and [technical stack](TECH_STACK.md).

## Index

This file is the summary. The detail lives in one file for each product area, in `specs/`. Each file keeps its sections' numbers and headings, so "section 3.2" or "spec 10.4" points to the same section wherever it appears. Find a section by its number in the table.

| File | What it covers | Sections |
|---|---|---|
| [Organizations](specs/organizations.md) | The organization record, its table and its page | 2 (Organization), 4.4 |
| [Contacts](specs/contacts.md) | The contact record, its table, the status filter and a contact's page | 2 (Contact), 4.5 |
| [Deals](specs/deals.md) | The deal record, stages and probability, changing a stage, late deals, a deal's organization and main contact, the deals table and a deal's page | 2 (Deal), 3.1 to 3.4, 4.6 |
| [Pipeline](specs/pipeline.md) | The board: its summary, columns, cards, dragging and the "More" menu | 4.7 |
| [Activities and follow-ups](specs/activities.md) | The activity record, follow-ups, timelines and the log-activity form | 2 (Activity), 3.5, 3.6, 4.9 |
| [Dashboard](specs/dashboard.md) | The figures, which the board's totals also use, and the Dashboard screen | 3.8, 4.2 |
| [Shared rules and screens](specs/shared.md) | What every record has, deleting, formats, the app shell and its theme, tables, forms, delete confirmations, messages and errors, and search in the top bar | 2 (opening), 3.7, 3.9, 4.1, 4.3, 4.8, 4.10, 4.11, 4.12 |
| [People and sign-in](specs/people.md) | The team's people, signing in and out, local sign-in, who added and changed each record, the sign-in screen and the user menu | 2 (Person), 3.10, 3.11, 4.13, 4.14 |
| [Visual design](specs/visual-design.md) | Color tokens, stage and status colors, type, space, components, charts and words | 5 |
| [Accessibility](specs/accessibility.md) | WCAG 2.2 AA: structure, the keyboard, the board with a keyboard, contrast and reflow | 6 |
| [Performance](specs/performance.md) | The one-second target and how it's measured | 7 |
| [Sample data](specs/sample-data.md) | The sample data and the large data set | 8 |
| [Architecture](specs/architecture.md) | The repository, frontend, backend, API, database, commands, security, settings and deploying to Render | 9 |
| [Testing](specs/testing.md) | Backend, frontend and end-to-end tests, and the hands-on check | 10 |
