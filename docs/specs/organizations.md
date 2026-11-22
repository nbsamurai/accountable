# Organizations

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 2. Records

### Organization

| Field | Type | Notes |
|---|---|---|
| name | text, required | Up to 200 characters |
| website | text | An `http` or `https` address. `northpeak.example` is saved as `https://northpeak.example` |
| industry | text | Free text |
| notes | long text | |

## 4. Screens

### 4.4 Organizations

- **Table columns:** Name, Industry, Website, Contacts (a count), Open deals (a count) and Open pipeline (US$).
- **Search** covers name, industry and website.
- **An organization's page:**
  - **Header:** name, industry, the website as a link that opens in a new tab and says so, and Edit and Delete buttons.
  - **Figures:** open pipeline, expected revenue, and won to date.
  - **Notes,** when there are any.
  - **Contacts panel:** name, job title, status, email, and an "Add contact" button with this organization filled in.
  - **Deals panel:** name, stage, value, close date with the late badge, and an "Add deal" button with this organization filled in.
  - No timeline.
