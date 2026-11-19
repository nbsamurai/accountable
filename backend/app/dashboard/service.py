"""Dashboard figures and the activities that need attention."""

from datetime import date, datetime, timedelta

from sqlalchemy import Connection, func, select

from ..activities import timelines
from ..deals.stages import CLOSED_STAGES, FUNNEL_STAGES, OPEN_STAGES, round_cents
from ..tables import activities, deals


def month_from(today: date, offset: int) -> date:
    year, month = divmod(12 * today.year + today.month - 1 + offset, 12)
    return date(year, month + 1, 1)


def open_pipeline(conn: Connection) -> dict:
    d = deals.c
    rows = conn.execute(
        select(d.stage, func.count().label("count"), func.sum(d.value).label("value"),
               func.sum(d.value * d.probability).label("weighted"))
        .where(d.stage.in_(OPEN_STAGES)).group_by(d.stage)
    )
    grouped = {row.stage: row for row in rows}
    stages = [
        {"stage": stage, "value": (grouped[stage].value or 0) if stage in grouped else 0}
        for stage in OPEN_STAGES
    ]
    return {
        "count": sum(row.count for row in grouped.values()),
        "value": sum(item["value"] for item in stages),
        "expected_revenue": round_cents(sum(row.weighted or 0 for row in grouped.values())),
        "stages": stages,
    }


def closed_figures(conn: Connection, today: date) -> dict:
    d = deals.c
    months = [month_from(today, index).isoformat() for index in range(-11, 1)]
    month = func.strftime("%Y-%m-01", d.close_date)
    rows = conn.execute(
        select(month.label("month"), d.stage, func.count().label("count"), func.sum(d.value).label("value"))
        .where(d.stage.in_(CLOSED_STAGES), d.close_date >= month_from(today, -11), d.close_date < month_from(today, 1))
        .group_by(month, d.stage)
    ).all()
    won = {row.month: row for row in rows if row.stage == "won"}
    series = [
        {"month": key, "value": (won[key].value or 0) if key in won else 0,
         "count": won[key].count if key in won else 0}
        for key in months
    ]
    won_count = sum(row.count for row in won.values())
    closed_count = sum(row.count for row in rows)
    return {
        "months": series,
        "won_this_month": series[-1],
        "win_rate": {
            "won": won_count, "closed": closed_count,
            "percent": (won_count * 100 / closed_count) if closed_count else None,
        },
    }


def funnel(conn: Connection) -> list[dict]:
    d = deals.c
    aggregates = []
    for index, stage in enumerate(FUNNEL_STAGES):
        reaches = d.stage.in_(FUNNEL_STAGES[index:])
        aggregates.extend((
            func.count().filter(reaches).label(f"{stage}_count"),
            func.coalesce(func.sum(d.value).filter(reaches), 0).label(f"{stage}_value"),
        ))
    values = conn.execute(select(*aggregates).select_from(deals)).mappings().one()
    total = values["new_value"]
    return [
        {"stage": stage, "value": values[f"{stage}_value"], "count": values[f"{stage}_count"],
         "share": values[f"{stage}_value"] * 100 / total if total else 0}
        for stage in FUNNEL_STAGES
    ]


def dashboard(conn: Connection, today: date, now: datetime) -> dict:
    a = activities.c
    follow_ups = conn.execute(
        timelines.select_with_links()
        .where(a.follow_up_date < today + timedelta(days=7), a.done.is_(False))
        .order_by(a.follow_up_date, *timelines.NEWEST_FIRST)
    )
    recent = conn.execute(
        timelines.select_with_links().where(a.occurred_at <= now).order_by(*timelines.NEWEST_FIRST).limit(10)
    )
    return {
        "today": today,
        "pipeline": open_pipeline(conn),
        **closed_figures(conn, today),
        "funnel": funnel(conn),
        "follow_ups": [timelines.to_out(row) for row in follow_ups],
        "recent_activity": [timelines.to_out(row) for row in recent],
    }
