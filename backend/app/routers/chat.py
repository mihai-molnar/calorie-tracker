import json
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from sse_starlette.sse import EventSourceResponse
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.crypto import decrypt_api_key
from app.services.llm import build_system_prompt, parse_llm_response

router = APIRouter(tags=["chat"])

MAX_CHAT_HISTORY = 20
RATE_LIMIT_PER_MINUTE = 30

_rate_limit_store: dict[str, list[float]] = {}


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    if user_id not in _rate_limit_store:
        _rate_limit_store[user_id] = []
    _rate_limit_store[user_id] = [
        t for t in _rate_limit_store[user_id] if now - t < 60
    ]
    if len(_rate_limit_store[user_id]) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Max 30 messages per minute."
        )
    _rate_limit_store[user_id].append(now)


class ChatRequest(BaseModel):
    message: str


def _get_user_date(supabase: Client, user_id: str) -> str:
    profile = (
        supabase.table("user_profiles")
        .select("timezone")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    tz_name = profile.data.get("timezone", "UTC")
    import datetime as dt
    user_now = dt.datetime.now(ZoneInfo(tz_name))
    return user_now.strftime("%Y-%m-%d")


def _get_or_create_daily_log(supabase: Client, user_id: str, date: str) -> dict:
    result = (
        supabase.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date)
        .execute()
    )
    if result.data:
        return result.data[0]
    new_log = (
        supabase.table("daily_logs")
        .insert({"user_id": user_id, "date": date, "total_calories": 0})
        .execute()
    )
    return new_log.data[0]


def _recalculate_total_calories(supabase: Client, daily_log_id: str) -> int:
    entries = (
        supabase.table("food_entries")
        .select("estimated_calories")
        .eq("daily_log_id", daily_log_id)
        .eq("is_planned", False)
        .execute()
    )
    total = sum(e["estimated_calories"] for e in entries.data)
    supabase.table("daily_logs").update({"total_calories": total}).eq(
        "id", daily_log_id
    ).execute()
    return total


def _apply_data_changes(supabase: Client, user_id: str, daily_log_id: str, data) -> None:
    if data is None:
        return
    if data.weight_kg is not None:
        supabase.table("daily_logs").update({"weight_kg": data.weight_kg}).eq(
            "id", daily_log_id
        ).execute()
    for entry in data.food_entries:
        if entry.action == "add":
            supabase.table("food_entries").insert({
                "daily_log_id": daily_log_id, "user_id": user_id,
                "description": entry.description,
                "estimated_calories": entry.estimated_calories,
                "is_planned": entry.is_planned,
            }).execute()
        elif entry.action == "update" and entry.id:
            existing = (
                supabase.table("food_entries").select("id")
                .eq("id", entry.id).eq("daily_log_id", daily_log_id).execute()
            )
            if existing.data:
                supabase.table("food_entries").update({
                    "description": entry.description,
                    "estimated_calories": entry.estimated_calories,
                    "is_planned": entry.is_planned,
                }).eq("id", entry.id).execute()
        elif entry.action == "delete" and entry.id:
            existing = (
                supabase.table("food_entries").select("id")
                .eq("id", entry.id).eq("daily_log_id", daily_log_id).execute()
            )
            if existing.data:
                supabase.table("food_entries").delete().eq("id", entry.id).execute()
    _recalculate_total_calories(supabase, daily_log_id)


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    _check_rate_limit(user_id)

    profile = (
        supabase.table("user_profiles").select("*")
        .eq("user_id", user_id).single().execute()
    )
    if not profile.data or not profile.data.get("onboarding_completed"):
        raise HTTPException(status_code=400, detail="Onboarding not completed")

    api_key_row = (
        supabase.table("user_api_keys").select("encrypted_key")
        .eq("user_id", user_id).single().execute()
    )
    if not api_key_row.data:
        raise HTTPException(status_code=400, detail="No API key configured")

    api_key = decrypt_api_key(api_key_row.data["encrypted_key"])
    date = _get_user_date(supabase, user_id)
    daily_log = _get_or_create_daily_log(supabase, user_id, date)
    daily_log_id = daily_log["id"]

    food_entries = (
        supabase.table("food_entries")
        .select("id, description, estimated_calories, is_planned")
        .eq("daily_log_id", daily_log_id).order("created_at").execute()
    ).data

    chat_history = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("daily_log_id", daily_log_id)
        .order("created_at", desc=True)
        .limit(MAX_CHAT_HISTORY).execute()
    ).data
    chat_history.reverse()

    p = profile.data
    system_prompt = build_system_prompt(
        age=p["age"], gender=p["gender"], height_cm=p["height_cm"],
        latest_weight=daily_log.get("weight_kg") or p["weight_kg"],
        target_weight_kg=p["target_weight_kg"],
        daily_calorie_target=p["daily_calorie_target"],
        date=date, today_weight=daily_log.get("weight_kg"),
        food_entries=food_entries,
        total_calories=daily_log.get("total_calories", 0),
    )

    supabase.table("chat_messages").insert({
        "daily_log_id": daily_log_id, "role": "user", "content": body.message,
    }).execute()

    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.message})

    client = OpenAI(api_key=api_key)
    try:
        completion = client.chat.completions.create(model="gpt-4o", messages=messages)
        full_response = completion.choices[0].message.content
    except Exception as e:
        error_msg = f"OpenAI API error: {str(e)}"
        supabase.table("chat_messages").insert({
            "daily_log_id": daily_log_id, "role": "assistant", "content": error_msg,
        }).execute()
        raise HTTPException(status_code=502, detail=error_msg)

    text, data = parse_llm_response(full_response)
    _apply_data_changes(supabase, user_id, daily_log_id, data)
    display_text = text

    supabase.table("chat_messages").insert({
        "daily_log_id": daily_log_id, "role": "assistant", "content": full_response,
    }).execute()

    async def event_generator():
        yield {"event": "message", "data": json.dumps({
            "text": display_text,
            "data_applied": data is not None,
            "total_calories": _recalculate_total_calories(supabase, daily_log_id) if data else daily_log.get("total_calories", 0),
            "weight_kg": data.weight_kg if data else daily_log.get("weight_kg"),
        })}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
