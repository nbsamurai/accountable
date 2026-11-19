"""The sample data (spec 8), written by hand so it reads like a real business.

Every date below is written as it reads on the reference day, Thursday November 19, 2026.
When the data loads, each date moves by the number of days between the reference day and
today, so the screens look the same whenever it's loaded. Times of day are local times.

- 15 organizations, in ten industries.
- 40 contacts: 16 leads, 10 qualified and 14 customers. Four have no organization.
- 30 deals: 5 New, 4 Qualified, 4 Proposal, 3 Negotiation (16 open, 3 late),
  10 Won (2 in the last 30 days) and 4 Lost (1 in the last 30 days).
- 80 notes, calls and emails: 4 overdue follow-ups, 5 due in the next 7 days (one today)
  and 3 done. Each deal past New also has one stage change, for its last move.
"""

from datetime import UTC, date, datetime, time

from sqlalchemy import Connection, insert

from ..deals.stages import NAMES, PROBABILITY
from ..tables import activities, contacts, deals, organizations

REFERENCE = date(2026, 11, 19)

# name, industry, website, notes
ORGANIZATIONS = [
    ("Brightlane Retail", "Retail", "brightlane.example", "Twelve stores and a growing online shop."),
    ("Harbor & Pine Logistics", "Logistics", "harborpine.example", "Runs 140 trucks from two depots."),
    ("Larkspur Health", "Healthcare", "larkspurhealth.example", "Four clinics. Moving away from paper."),
    ("Northpeak Energy", "Energy", "northpeak.example", None),
    ("Elmstead College", "Education", "elmstead.example", "About 6,000 students."),
    ("Tallgrass Builders", "Construction", "tallgrass.example", "Commercial building, 12 active sites."),
    ("Saltmarsh Hotels", "Hospitality", "saltmarsh.example", "Three coastal hotels."),
    ("Quillon Mutual", "Financial services", "quillon.example", "Regional insurer."),
    ("Ironvale Manufacturing", "Manufacturing", "ironvale.example", "Three plants making steel parts."),
    ("Cobalt Ridge Software", "Software", "cobaltridge.example", None),
    ("Fernhill Analytics", "Software", "fernhill.example", "Payroll and finance analytics."),
    ("Granite Bay Foods", "Manufacturing", "granitebay.example", "Packaged foods, two factories."),
    ("Westbrook Clinics", "Healthcare", "westbrook.example", None),
    ("Maple & Main Outfitters", "Retail", "mapleandmain.example", "Outdoor clothing, eight stores."),
    ("Juniper Credit Union", "Financial services", "junipercu.example", None),
]

# name, organization, job title, status. Emails and phones are made from them.
CONTACTS = [
    # Customers (14)
    ("Leila Haddad", "Saltmarsh Hotels", "Director of operations", "customer"),
    ("Owen Fletcher", "Tallgrass Builders", "Safety manager", "customer"),
    ("Tom Becker", "Ironvale Manufacturing", "Plant manager", "customer"),
    ("Helen Park", "Westbrook Clinics", "Practice manager", "customer"),
    ("Marcus Bell", "Juniper Credit Union", "VP of member services", "customer"),
    ("Nina Alvarez", "Cobalt Ridge Software", "Head of data", "customer"),
    ("Peter Lindqvist", "Granite Bay Foods", "Procurement lead", "customer"),
    ("Rosa Martinez", "Maple & Main Outfitters", "Ecommerce manager", "customer"),
    ("Dean Whitaker", "Elmstead College", "IT director", "customer"),
    ("Ivy Chen", "Fernhill Analytics", "Chief financial officer", "customer"),
    ("Hannah Moore", "Saltmarsh Hotels", "General manager", "customer"),
    ("Ravi Shah", "Ironvale Manufacturing", "Operations director", "customer"),
    ("Elena Petrova", None, "Freelance consultant", "customer"),
    ("Chris Duncan", "Tallgrass Builders", "Project manager", "customer"),
    # Qualified (10)
    ("Sam Okafor", "Quillon Mutual", "Head of claims", "qualified"),
    ("Grace Liu", "Northpeak Energy", "Marketing director", "qualified"),
    ("Daniel Reyes", "Harbor & Pine Logistics", "Fleet manager", "qualified"),
    ("Ana Lopez", "Brightlane Retail", "Head of digital", "qualified"),
    ("Priya Nair", "Larkspur Health", "Clinical systems lead", "qualified"),
    ("Carla Diaz", "Juniper Credit Union", "Product owner", "qualified"),
    ("Victor Hale", "Northpeak Energy", "Facilities manager", "qualified"),
    ("Marta Kowalski", "Elmstead College", "Registrar", "qualified"),
    ("Jonas Weber", "Granite Bay Foods", "Quality manager", "qualified"),
    ("Aisha Bello", "Westbrook Clinics", "Operations lead", "qualified"),
    # Leads (16)
    ("Ben Foster", "Maple & Main Outfitters", "Store operations manager", "lead"),
    ("Lucy Grant", "Brightlane Retail", "Merchandising analyst", "lead"),
    ("Omar Farouk", "Harbor & Pine Logistics", "Warehouse supervisor", "lead"),
    ("Mia Thompson", "Larkspur Health", "Nurse informatics lead", "lead"),
    ("Kenji Sato", "Cobalt Ridge Software", "Engineering manager", "lead"),
    ("Sofia Rossi", "Fernhill Analytics", "Data analyst", "lead"),
    ("Liam O'Brien", "Quillon Mutual", "Underwriting manager", "lead"),
    ("Ella Novak", "Elmstead College", "Admissions officer", "lead"),
    ("Noah Kim", "Northpeak Energy", "Energy analyst", "lead"),
    ("Zoe Adams", "Saltmarsh Hotels", "Front office manager", "lead"),
    ("Felix Wagner", "Ironvale Manufacturing", "Maintenance planner", "lead"),
    ("Isla Murray", "Juniper Credit Union", "Marketing manager", "lead"),
    ("Hugo Laurent", None, "Independent retailer", "lead"),
    ("Maya Patel", None, "Startup founder", "lead"),
    ("Ryan Cole", None, None, "lead"),
    ("Tara Singh", "Tallgrass Builders", "Estimator", "lead"),
]

# name, organization, main contact, stage, value, close date, and for deals past New the
# stage they came from and when they moved. Each column lists its cards top to bottom.
DEALS = [
    # New
    ("Loyalty app discovery", "Brightlane Retail", "Ana Lopez", "new", 18000, "2027-01-15", None),
    ("Dock scheduling", "Harbor & Pine Logistics", "Daniel Reyes", "new", 24000, "2027-02-02", None),
    ("Patient portal refresh", "Larkspur Health", "Priya Nair", "new", 36000, "2027-02-20", None),
    ("Energy audit software", "Northpeak Energy", "Grace Liu", "new", 9500, "2027-03-06", None),
    ("Course catalog site", "Elmstead College", "Marta Kowalski", "new", 12000, "2027-01-29", None),
    # Qualified
    ("Inventory forecasting", "Brightlane Retail", "Ana Lopez", "qualified", 42000, "2026-12-18",
     ("new", "2026-09-30 10:00")),
    ("Site safety app", "Tallgrass Builders", "Owen Fletcher", "qualified", 28000, "2026-11-12",
     ("new", "2026-10-05 11:00")),
    ("Guest Wi-Fi upgrade", "Saltmarsh Hotels", "Leila Haddad", "qualified", 16500, "2027-01-08",
     ("new", "2026-10-25 09:30")),
    ("Claims workflow", "Quillon Mutual", "Sam Okafor", "qualified", 54000, "2026-12-30",
     ("new", "2026-11-17 15:48")),
    # Proposal
    ("Website redesign", "Northpeak Energy", "Grace Liu", "proposal", 48000, "2026-12-10",
     ("qualified", "2026-09-28 16:00")),
    ("Route optimization", "Harbor & Pine Logistics", "Daniel Reyes", "proposal", 65000, "2026-11-30",
     ("qualified", "2026-10-12 14:30")),
    ("Lab results integration", "Larkspur Health", "Priya Nair", "proposal", 38000, "2026-11-06",
     ("qualified", "2026-09-14 13:30")),
    ("Student CRM", "Elmstead College", "Marta Kowalski", "proposal", 22000, "2026-12-22",
     ("qualified", "2026-10-19 14:40")),
    # Negotiation
    ("Plant maintenance suite", "Ironvale Manufacturing", "Tom Becker", "negotiation", 120000, "2026-12-04",
     ("proposal", "2026-09-20 10:30")),
    ("Payments gateway", "Quillon Mutual", "Sam Okafor", "negotiation", 57000, "2026-11-26",
     ("proposal", "2026-11-19 10:42")),
    ("Fleet telematics phase 2", "Harbor & Pine Logistics", "Daniel Reyes", "negotiation", 22000, "2026-11-16",
     ("proposal", "2026-09-07 10:30")),
    # Won, newest first
    ("Hotel booking engine", "Saltmarsh Hotels", "Leila Haddad", "won", 42000, "2026-10-27",
     ("negotiation", "2026-10-27 16:30")),
    ("Safety training licenses", "Tallgrass Builders", "Owen Fletcher", "won", 18000, "2026-11-12",
     ("negotiation", "2026-11-12 17:02")),
    ("Payroll integration", "Fernhill Analytics", "Ivy Chen", "won", 31000, "2026-09-18",
     ("negotiation", "2026-09-18 16:30")),
    ("Learning platform pilot", "Elmstead College", "Dean Whitaker", "won", 27500, "2026-07-17",
     ("negotiation", "2026-07-17 16:30")),
    ("Production line monitoring", "Ironvale Manufacturing", "Tom Becker", "won", 96000, "2026-06-22",
     ("negotiation", "2026-06-22 16:30")),
    ("Store analytics", "Maple & Main Outfitters", "Rosa Martinez", "won", 12000, "2026-04-21",
     ("negotiation", "2026-04-21 16:30")),
    ("Supplier portal", "Granite Bay Foods", "Peter Lindqvist", "won", 26000, "2026-03-26",
     ("negotiation", "2026-03-26 16:30")),
    ("Data warehouse setup", "Cobalt Ridge Software", "Nina Alvarez", "won", 35000, "2026-03-19",
     ("negotiation", "2026-03-19 16:30")),
    ("Branch kiosk pilot", "Juniper Credit Union", "Marcus Bell", "won", 24500, "2026-01-23",
     ("negotiation", "2026-01-23 16:30")),
    ("Clinic scheduling", "Westbrook Clinics", "Helen Park", "won", 38000, "2025-12-24",
     ("negotiation", "2025-12-24 16:30")),
    # Lost, newest first
    ("Kiosk network", "Brightlane Retail", "Ana Lopez", "lost", 22000, "2026-11-03",
     ("proposal", "2026-11-03 11:00")),
    ("Loyalty card relaunch", "Maple & Main Outfitters", "Ben Foster", "lost", 15000, "2026-08-16",
     ("qualified", "2026-08-16 11:00")),
    ("Claims portal", "Juniper Credit Union", "Carla Diaz", "lost", 46000, "2026-05-23",
     ("negotiation", "2026-05-23 11:00")),
    ("Energy dashboard add-on", "Northpeak Energy", "Victor Hale", "lost", 2000, "2026-03-04",
     ("proposal", "2026-03-04 11:00")),
]

# when, type, the record ("deal" or "contact", and its name), description,
# and the follow-up date and whether it's done, when there is one.
ACTIVITIES = [
    # The newest, as on the dashboard's recent activity
    ("2026-11-19 09:15", "call", "deal", "Payments gateway", "Pricing walkthrough with Sam", None, False),
    ("2026-11-18 16:30", "email", "deal", "Website redesign", "Sent the revised proposal", None, False),
    ("2026-11-18 14:05", "note", "contact", "Ana Lopez", "Budget approved for Q1", None, False),
    ("2026-11-18 11:20", "call", "deal", "Dock scheduling", "Discovery call: 3 sites in scope", None, False),
    ("2026-11-17 15:30", "email", "deal", "Claims workflow", "Shared the security questionnaire", None, False),
    ("2026-11-16 10:00", "note", "contact", "Priya Nair", "Prefers email to calls", None, False),
    ("2026-11-16 09:10", "call", "contact", "Tom Becker", "Left a voicemail about the renewal", None, False),
    # Follow-ups: 4 overdue, 5 in the next 7 days (one today), and 3 done
    ("2026-11-07 14:00", "note", "deal", "Lab results integration", "Send revised quote", "2026-11-13", False),
    ("2026-11-09 11:00", "call", "contact", "Priya Nair", "Call about the site visit", "2026-11-16", False),
    ("2026-11-10 15:30", "email", "deal", "Fleet telematics phase 2", "Chase the signed order form",
     "2026-11-17", False),
    ("2026-11-08 10:15", "note", "contact", "Tom Becker", "Check budget timing", "2026-11-18", False),
    ("2026-11-11 09:00", "note", "deal", "Plant maintenance suite", "Prepare for the negotiation call",
     "2026-11-19", False),
    ("2026-11-05 10:00", "email", "deal", "Website redesign", "Send case studies", "2026-11-20", False),
    ("2026-11-09 16:00", "call", "contact", "Marta Kowalski", "Demo follow-up call", "2026-11-23", False),
    ("2026-11-10 11:30", "call", "deal", "Route optimization", "Confirm the pilot scope", "2026-11-24", False),
    ("2026-11-07 09:20", "email", "deal", "Loyalty app discovery", "Book an intro meeting", "2026-11-25", False),
    ("2026-10-20 10:00", "call", "deal", "Hotel booking engine", "Confirm the go-live date", "2026-10-25", True),
    ("2026-09-30 13:00", "email", "contact", "Helen Park", "Send the renewal quote", "2026-10-06", True),
    ("2026-10-10 11:00", "call", "deal", "Claims workflow", "Book a demo with the claims team", "2026-10-17", True),
    # Open deals
    ("2026-10-10 10:15", "call", "deal", "Loyalty app discovery",
     "Intro call: they want points that work in store and online", None, False),
    ("2026-10-17 14:00", "email", "deal", "Loyalty app discovery", "Sent the discovery questionnaire", None, False),
    ("2026-10-29 09:30", "email", "deal", "Dock scheduling", "Shared a one-page overview of dock scheduling",
     None, False),
    ("2026-10-22 11:00", "note", "deal", "Patient portal refresh",
     "The portal is 8 years old, and patients complain about signing in", None, False),
    ("2026-11-05 15:20", "call", "deal", "Patient portal refresh", "Walked through the portal's pain points",
     None, False),
    ("2026-10-31 13:10", "email", "deal", "Energy audit software", "Sent pricing for the audit module", None, False),
    ("2026-10-24 10:40", "call", "deal", "Course catalog site",
     "The catalog lives in PDFs today. Marta wants a searchable site", None, False),
    ("2026-09-05 09:45", "call", "deal", "Inventory forecasting", "Talked through stockouts in the spring season",
     None, False),
    ("2026-09-19 16:00", "email", "deal", "Inventory forecasting",
     "Sent a sample forecast built on their sales export", None, False),
    ("2026-10-06 11:30", "note", "deal", "Inventory forecasting", "Finance wants payback within 3 months",
     None, False),
    ("2026-09-25 08:50", "call", "deal", "Site safety app", "Owen wants incident reports from phones on site",
     None, False),
    ("2026-10-20 14:25", "email", "deal", "Site safety app", "Sent the pilot plan for two sites", None, False),
    ("2026-10-14 10:05", "note", "deal", "Guest Wi-Fi upgrade", "Guests complain about Wi-Fi in the east wing",
     None, False),
    ("2026-10-28 15:45", "call", "deal", "Guest Wi-Fi upgrade", "Agreed on a survey of all three floors",
     None, False),
    ("2026-10-02 09:20", "call", "deal", "Claims workflow", "The claims team handles 400 claims a week by email",
     None, False),
    ("2026-10-23 13:35", "email", "deal", "Claims workflow", "Sent the case study from a similar insurer",
     None, False),
    ("2026-08-21 10:00", "call", "deal", "Website redesign", "Kick-off call: a new site before the spring campaign",
     None, False),
    ("2026-09-10 11:15", "email", "deal", "Website redesign", "Sent the sitemap and wireframes", None, False),
    ("2026-09-28 16:30", "note", "deal", "Website redesign", "Proposal sent: $48,000 for design and build",
     None, False),
    ("2026-11-04 09:40", "call", "deal", "Website redesign", "Grace asked for case studies from energy firms",
     None, False),
    ("2026-08-27 14:00", "call", "deal", "Route optimization", "Daniel wants to cut fuel costs by a tenth",
     None, False),
    ("2026-09-17 10:20", "email", "deal", "Route optimization", "Sent the route analysis for March", None, False),
    ("2026-10-12 15:00", "note", "deal", "Route optimization", "The proposal covers 40 vehicles in phase 1",
     None, False),
    ("2026-08-11 09:00", "call", "deal", "Lab results integration", "Lab results arrive by fax at two clinics",
     None, False),
    ("2026-09-14 13:45", "email", "deal", "Lab results integration", "Sent the integration proposal", None, False),
    ("2026-10-15 11:10", "call", "deal", "Lab results integration",
     "Priya asked for a lower price on the second clinic", None, False),
    ("2026-09-22 10:30", "call", "deal", "Student CRM", "Admissions tracks applicants in spreadsheets", None, False),
    ("2026-10-19 14:50", "email", "deal", "Student CRM", "Sent the proposal and a demo link", None, False),
    ("2026-07-22 09:15", "call", "deal", "Plant maintenance suite", "Ironvale wants planned maintenance for 3 plants",
     None, False),
    ("2026-08-15 15:30", "email", "deal", "Plant maintenance suite", "Sent the proposal for all three plants",
     None, False),
    ("2026-09-20 10:45", "note", "deal", "Plant maintenance suite", "Their legal team is reviewing the contract",
     None, False),
    ("2026-10-26 13:00", "call", "deal", "Plant maintenance suite", "Agreed on a 3-year term. The price is still open",
     None, False),
    ("2026-09-02 11:40", "call", "deal", "Payments gateway", "Quillon wants card payments for premiums", None, False),
    ("2026-10-04 09:55", "email", "deal", "Payments gateway", "Sent the security documents", None, False),
    ("2026-08-01 14:10", "call", "deal", "Fleet telematics phase 2", "Phase 1 went well. Phase 2 adds 60 trucks",
     None, False),
    ("2026-09-07 10:35", "email", "deal", "Fleet telematics phase 2", "Sent the phase 2 proposal", None, False),
    ("2026-10-09 16:20", "note", "deal", "Fleet telematics phase 2", "Waiting on their finance sign-off", None, False),
    # Closed deals
    ("2026-08-16 10:00", "call", "deal", "Hotel booking engine", "Saltmarsh wants direct bookings, not agencies",
     None, False),
    ("2026-09-20 14:30", "email", "deal", "Hotel booking engine", "Sent the contract for signature", None, False),
    ("2026-10-10 09:10", "email", "deal", "Safety training licenses", "Sent a quote for 120 licenses", None, False),
    ("2026-08-01 11:00", "call", "deal", "Payroll integration", "Ivy wants payroll to feed the ledger every night",
     None, False),
    ("2026-08-31 15:15", "email", "deal", "Payroll integration", "Sent the statement of work", None, False),
    ("2026-09-30 13:20", "call", "deal", "Kiosk network", "Brightlane is comparing three kiosk vendors", None, False),
    ("2026-11-01 10:10", "note", "deal", "Kiosk network", "They chose a cheaper vendor", None, False),
    ("2026-07-12 11:25", "call", "deal", "Loyalty card relaunch", "Ben wants to relaunch the loyalty card",
     None, False),
    # Contacts
    ("2026-09-15 09:00", "note", "contact", "Ana Lopez", "Prefers short calls before 10 AM", None, False),
    ("2026-08-23 15:40", "note", "contact", "Daniel Reyes", "Met Daniel at the logistics trade show", None, False),
    ("2026-10-05 10:00", "email", "contact", "Priya Nair", "Sent the list of clinic references", None, False),
    ("2026-08-11 13:00", "note", "contact", "Grace Liu", "Grace leads marketing and owns the website budget",
     None, False),
    ("2026-09-30 11:45", "call", "contact", "Marta Kowalski", "Marta is looking at tools for admissions too",
     None, False),
    ("2026-09-10 10:20", "note", "contact", "Owen Fletcher", "Owen manages safety across 12 sites", None, False),
    ("2026-07-02 14:00", "note", "contact", "Leila Haddad", "Leila signs off on all IT spending", None, False),
    ("2026-06-22 09:30", "note", "contact", "Sam Okafor", "Referred by Marcus Bell at Juniper Credit Union",
     None, False),
    ("2026-06-02 10:50", "call", "contact", "Tom Becker", "Quarterly check-in. Happy with the line monitoring",
     None, False),
    ("2026-08-21 11:10", "call", "contact", "Helen Park", "Helen asked about adding two more clinics", None, False),
    ("2026-09-20 16:05", "email", "contact", "Marcus Bell", "Sent the yearly usage report", None, False),
    ("2026-07-22 13:30", "call", "contact", "Nina Alvarez", "Nina wants a reporting module next year", None, False),
    ("2026-10-05 14:45", "call", "contact", "Hannah Moore", "Hannah wants the spa on the booking engine too",
     None, False),
    ("2026-11-02 16:15", "call", "contact", "Maya Patel", "Maya's startup needs a simple CRM", None, False),
    ("2026-10-08 13:50", "call", "contact", "Jonas Weber", "Jonas wants batch tracing for recalls", None, False),
    ("2026-10-13 10:25", "call", "contact", "Aisha Bello", "Aisha asked for a demo next month", None, False),
]


def _email(name: str, organization: str | None) -> str:
    first, *rest = name.lower().replace("'", "").split()
    if organization is None:
        return f"{first}@{rest[-1]}.example"
    website = next(o[2] for o in ORGANIZATIONS if o[0] == organization)
    return f"{first}@{website}"


def _phone(index: int) -> str:
    # 555-01xx numbers are set aside for fiction.
    return f"+1 555 01{index:02d}"


def load(conn: Connection, today: date) -> None:
    """Loads the sample data, with its dates moved to match `today`."""
    shift = today - REFERENCE
    now = datetime.now(UTC)

    def day(text: str) -> date:
        return date.fromisoformat(text) + shift

    def moment(text: str) -> datetime:
        written = datetime.fromisoformat(text)
        local = datetime.combine(written.date() + shift, time(written.hour, written.minute))
        return local.astimezone().astimezone(UTC)

    org_ids: dict[str, int] = {}
    for name, industry, website, notes in ORGANIZATIONS:
        org_ids[name] = conn.execute(
            insert(organizations).values(
                name=name,
                industry=industry,
                website=f"https://{website}",
                notes=notes,
                created_at=now,
                updated_at=now,
            )
        ).inserted_primary_key[0]

    contact_ids: dict[str, int] = {}
    for index, (name, organization, job_title, status) in enumerate(CONTACTS):
        contact_ids[name] = conn.execute(
            insert(contacts).values(
                name=name,
                email=_email(name, organization),
                phone=_phone(index),
                job_title=job_title,
                organization_id=org_ids[organization] if organization else None,
                status=status,
                created_at=now,
                updated_at=now,
            )
        ).inserted_primary_key[0]

    deal_ids: dict[str, int] = {}
    positions: dict[str, int] = {}
    for name, organization, contact, stage, value, close_date, last_move in DEALS:
        positions[stage] = positions.get(stage, 0) + 1
        deal_id = conn.execute(
            insert(deals).values(
                name=name,
                organization_id=org_ids[organization],
                contact_id=contact_ids[contact],
                stage=stage,
                value=value,
                probability=PROBABILITY[stage],
                close_date=day(close_date),
                board_position=float(positions[stage]),
                created_at=now,
                updated_at=now,
            )
        ).inserted_primary_key[0]
        deal_ids[name] = deal_id
        if last_move is not None:
            came_from, when = last_move
            conn.execute(
                insert(activities).values(
                    type="stage_change",
                    deal_id=deal_id,
                    description=f"Moved from {NAMES[came_from]} to {NAMES[stage]}",
                    occurred_at=moment(when),
                    done=False,
                    created_at=moment(when),
                    updated_at=moment(when),
                )
            )

    for when, kind, record, record_name, description, follow_up, done in ACTIVITIES:
        conn.execute(
            insert(activities).values(
                type=kind,
                contact_id=contact_ids[record_name] if record == "contact" else None,
                deal_id=deal_ids[record_name] if record == "deal" else None,
                description=description,
                occurred_at=moment(when),
                follow_up_date=day(follow_up) if follow_up else None,
                done=done,
                created_at=moment(when),
                updated_at=moment(when),
            )
        )
