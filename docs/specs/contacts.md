# Contacts

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

### Contact

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| email | text | Must look like an email address |
| phone | text | Free text |
| job_title | text | |
| organization | link to an organization | Optional |
| status | `lead`, `qualified` or `customer` | Lead when not given |

## 4. Screens

### 4.5 Contacts

- **Table columns:** Name, Organization, Job title, Email, Phone and Status.
- **Search** covers name, email, phone, job title and organization name.
- **Status filter:** a segmented control above the table with "All 40", "Leads 16", "Qualified 10" and "Customers 14". The chosen one is a Midnight pill with white text. The counts follow the search.
- **A contact's page:**
  - **Header:** name, status pill, "Job title at Organization" (with a link), email as a `mailto:` link, phone as a `tel:` link, who added and last changed them (section 3.11), and Edit and Delete buttons.
  - **Left, 8 columns:** the log-activity form, then the timeline (section 4.9).
  - **Right, 4 columns:** a Deals panel with the deals where they're the main contact (name, stage pill, value, late badge), and an "Add deal" button with this contact and their organization filled in.
