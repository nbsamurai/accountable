# Sample data

Part of the [Accountable product spec](../spec.md). Sections keep their numbers from the whole spec.

## 8. Sample data

The sample data is written by hand, so it reads like a real business. It's the same every time, apart from its dates, which are set relative to the day it's loaded. It loads when the tables are empty after the migrations have run, on a local SQLite file or on Supabase, and whenever `npm run seed` resets a local database. The shared app on Supabase starts with it.

- **3 made-up teammates:** Alex Rivera, Jordan Blake and Casey Morgan, with emails at `team.example`. Between them they added and last changed every sample record and logged every sample activity, so each record's page and each timeline entry names someone. They have no Supabase accounts, so they can't sign in to the shared app. A local copy offers them on its sign-in screen (section 3.10).
- **15 organizations** across software, manufacturing, healthcare, retail, logistics, financial services, education, hospitality, construction and energy. The names are made up, and websites and emails use the reserved `.example` domain, such as `northpeak.example`, so no real company or person appears.
- **40 contacts:** 16 leads, 10 qualified and 14 customers. Four have no organization.
- **30 deals,** from $2,000 to $120,000:
  - 5 New, 4 Qualified, 4 Proposal and 3 Negotiation. That's 16 open, 3 of them late.
  - 10 Won, spread over the last 12 months, 2 of them in the last 30 days.
  - 4 Lost, 1 of them in the last 30 days.
  - Every Won deal's main contact is a customer.
- **80 activities** (notes, calls and emails over the last six months), on both contacts and deals:
  - 4 overdue follow-ups.
  - 5 follow-ups due in the next 7 days, one of them today.
  - 3 follow-ups already done.
- **Stage changes:** each deal past New also has one stage change, for its last move.

**The large data set,** for the performance test only, is made by a generator with a fixed random seed. It has about 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities. Half the deals are open, and the rest closed over the last two years. The same three teammates added and changed its records. The seed command loads it into a local database with `--large`.
