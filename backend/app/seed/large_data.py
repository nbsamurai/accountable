"""The large data set, for the performance test only (spec 8).

About 1,000 organizations, 5,000 contacts, 2,000 deals and 20,000 activities, made by a
generator with a fixed random seed, so the same seed and the same day make the same data.
Half the deals are open, and the rest closed over the last two years.
"""

import random
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import Connection, insert

from ..deals.stages import OPEN_STAGES, PROBABILITY
from ..tables import activities, contacts, deals, organizations

SEED = 20261119
COUNTS = {"organizations": 1000, "contacts": 5000, "deals": 2000, "activities": 20000}

PREFIXES = [
    "Alder", "Birch", "Cedar", "Delta", "Ember", "Falcon", "Granite", "Harbor", "Iris", "Juniper",
    "Kestrel", "Linden", "Maple", "Nimbus", "Oakridge", "Pioneer", "Quarry", "Riverside", "Summit", "Tidewater",
    "Upland", "Vista", "Willow", "Yarrow", "Zephyr",
]
SUFFIXES = [
    ("Logistics", "Logistics"), ("Health", "Healthcare"), ("Retail", "Retail"), ("Software", "Software"),
    ("Manufacturing", "Manufacturing"), ("Energy", "Energy"), ("College", "Education"), ("Builders", "Construction"),
    ("Hotels", "Hospitality"), ("Mutual", "Financial services"),
]
FIRST = [
    "Ana", "Ben", "Carla", "Daniel", "Elena", "Felix", "Grace", "Hugo", "Isla", "Jonas", "Kenji", "Leila",
    "Marta", "Noah", "Owen", "Priya", "Quinn", "Ravi", "Sofia", "Tom", "Uma", "Victor", "Wendy", "Yusuf", "Zoe",
]
LAST = [
    "Adams", "Bello", "Chen", "Diaz", "Evans", "Foster", "Grant", "Haddad", "Ito", "Jensen", "Kim", "Lopez",
    "Murray", "Nair", "Okafor", "Park", "Rossi", "Shah", "Tanaka", "Weber",
]
TITLES = ["Operations manager", "Head of IT", "Finance director", "Buyer", "Office manager", None]
WORK = ["Rollout", "Upgrade", "Pilot", "Integration", "Renewal", "Analytics", "Portal", "Automation"]
NOTES = [
    "Called about pricing", "Sent the proposal", "Asked for references", "Shared the roadmap",
    "Booked a demo", "Followed up on the contract", "Checked in after the pilot", "Sent the invoice",
]


def generate(today: date, now: datetime, seed: int = SEED) -> dict[str, list[dict[str, Any]]]:
    """The rows for each table. The same seed, today and now always give the same rows."""
    rng = random.Random(seed)
    stamp = {"created_at": now, "updated_at": now}

    orgs = []
    for org_id in range(1, COUNTS["organizations"] + 1):
        suffix, industry = rng.choice(SUFFIXES)
        name = f"{rng.choice(PREFIXES)} {rng.choice(PREFIXES)} {suffix}"
        orgs.append({
            "id": org_id, "name": name, "industry": industry,
            "website": f"https://org{org_id}.example", "notes": None, **stamp,
        })

    people = []
    by_org: dict[int | None, list[int]] = {}
    for contact_id in range(1, COUNTS["contacts"] + 1):
        org_id = rng.randint(1, COUNTS["organizations"]) if rng.random() > 0.1 else None
        first, last = rng.choice(FIRST), rng.choice(LAST)
        people.append({
            "id": contact_id, "name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{contact_id}@mail.example",
            "phone": f"+1 555 01{contact_id % 100:02d}", "job_title": rng.choice(TITLES),
            "organization_id": org_id, "status": rng.choice(["lead", "lead", "qualified", "customer"]), **stamp,
        })
        by_org.setdefault(org_id, []).append(contact_id)

    deal_rows = []
    positions: dict[str, int] = {}
    for deal_id in range(1, COUNTS["deals"] + 1):
        org_id = rng.randint(1, COUNTS["organizations"])
        candidates = by_org.get(org_id, [])
        contact_id = rng.choice(candidates) if candidates and rng.random() > 0.15 else None
        if deal_id % 2:
            stage = rng.choice(OPEN_STAGES)
            close_date = today + timedelta(days=rng.randint(-20, 150))
        else:
            stage = "won" if rng.random() < 0.6 else "lost"
            close_date = today - timedelta(days=rng.randint(0, 730))
        positions[stage] = positions.get(stage, 0) + 1
        deal_rows.append({
            "id": deal_id, "name": f"{orgs[org_id - 1]['name'].split()[0]} {rng.choice(WORK)} {deal_id}",
            "organization_id": org_id, "contact_id": contact_id, "stage": stage,
            "value": rng.randrange(2000, 120001, 500), "probability": PROBABILITY[stage],
            "close_date": close_date, "board_position": float(positions[stage]), **stamp,
        })

    activity_rows = []
    for activity_id in range(1, COUNTS["activities"] + 1):
        on_deal = rng.random() < 0.5
        local = datetime.combine(today - timedelta(days=rng.randint(1, 730)), time(rng.randint(8, 17), rng.randint(0, 59)))
        occurred_at = local.replace(tzinfo=UTC)
        follow_up = today + timedelta(days=rng.randint(-30, 30)) if rng.random() < 0.1 else None
        activity_rows.append({
            "id": activity_id, "type": rng.choice(["note", "call", "email"]),
            "contact_id": None if on_deal else rng.randint(1, COUNTS["contacts"]),
            "deal_id": rng.randint(1, COUNTS["deals"]) if on_deal else None,
            "description": rng.choice(NOTES), "occurred_at": occurred_at,
            "follow_up_date": follow_up, "done": bool(follow_up) and rng.random() < 0.5,
            "created_at": occurred_at, "updated_at": occurred_at,
        })

    return {"organizations": orgs, "contacts": people, "deals": deal_rows, "activities": activity_rows}


def load(conn: Connection, today: date) -> None:
    rows = generate(today, datetime.now(UTC))
    for table in (organizations, contacts, deals, activities):
        conn.execute(insert(table), rows[table.name])
