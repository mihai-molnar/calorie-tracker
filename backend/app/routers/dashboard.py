from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase

router = APIRouter(tags=["dashboard"])


class TodaySummary(BaseModel):
    date: str
    weight_kg: float | None
    total_calories: int
    daily_calorie_target: int
    calories_remaining: int


class DailyLogEntry(BaseModel):
    date: str
    weight_kg: float | None
    total_calories: int


class DashboardResponse(BaseModel):
    today: TodaySummary
    history: list[DailyLogEntry]
    has_more: bool


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=30, ge=1, le=90),
):
    from app.routers.chat import _get_user_date, _get_or_create_daily_log

    profile = (
        supabase.table("user_profiles")
        .select("daily_calorie_target, timezone")
        .eq("user_id", user_id).single().execute()
    )
    target = profile.data["daily_calorie_target"]
    date = _get_user_date(supabase, user_id)
    daily_log = _get_or_create_daily_log(supabase, user_id, date)

    today = TodaySummary(
        date=date, weight_kg=daily_log.get("weight_kg"),
        total_calories=daily_log.get("total_calories", 0),
        daily_calorie_target=target,
        calories_remaining=max(0, target - daily_log.get("total_calories", 0)),
    )

    history_data = (
        supabase.table("daily_logs")
        .select("date, weight_kg, total_calories")
        .eq("user_id", user_id).order("date", desc=True)
        .range(offset, offset + limit).execute()
    )
    # Fetch limit+1 rows to determine has_more
    has_more = len(history_data.data) > limit
    rows = history_data.data[:limit]
    history = [
        DailyLogEntry(date=d["date"], weight_kg=d.get("weight_kg"),
                      total_calories=d.get("total_calories", 0))
        for d in rows
    ]

    return DashboardResponse(today=today, history=history, has_more=has_more)


@router.get("/daily-logs", response_model=list[DailyLogEntry])
async def daily_logs(
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(default=30, le=365),
    offset: int = Query(default=0, ge=0),
):
    result = (
        supabase.table("daily_logs")
        .select("date, weight_kg, total_calories")
        .eq("user_id", user_id).order("date", desc=True)
        .range(offset, offset + limit - 1).execute()
    )
    return [
        DailyLogEntry(date=d["date"], weight_kg=d.get("weight_kg"),
                      total_calories=d.get("total_calories", 0))
        for d in result.data
    ]
