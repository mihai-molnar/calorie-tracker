import datetime as dt
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.calorie import calculate_daily_target

router = APIRouter(tags=["onboarding"])


class OnboardingRequest(BaseModel):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: str
    target_weight_kg: float
    daily_calorie_target: int | None = None
    timezone: str = "UTC"
    openai_api_key: str

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v not in ("male", "female", "other"):
            raise ValueError("gender must be male, female, or other")
        return v

    @field_validator("activity_level")
    @classmethod
    def validate_activity_level(cls, v: str) -> str:
        valid = ("sedentary", "light", "moderate", "active", "very_active")
        if v not in valid:
            raise ValueError(f"activity_level must be one of {valid}")
        return v

    @field_validator("target_weight_kg")
    @classmethod
    def validate_target_less_than_current(cls, v: float, info) -> float:
        if "weight_kg" in info.data and v >= info.data["weight_kg"]:
            raise ValueError("target_weight_kg must be less than current weight_kg (MVP supports weight loss only)")
        return v


class OnboardingResponse(BaseModel):
    daily_calorie_target: int
    message: str


@router.post("/onboarding", response_model=OnboardingResponse)
async def onboarding(
    body: OnboardingRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    calorie_target = body.daily_calorie_target or calculate_daily_target(
        weight_kg=body.weight_kg, height_cm=body.height_cm,
        age=body.age, gender=body.gender,
        activity_level=body.activity_level,
        target_weight_kg=body.target_weight_kg,
    )

    supabase.table("user_profiles").upsert({
        "user_id": user_id, "age": body.age, "gender": body.gender,
        "height_cm": body.height_cm, "weight_kg": body.weight_kg,
        "activity_level": body.activity_level,
        "target_weight_kg": body.target_weight_kg,
        "daily_calorie_target": calorie_target,
        "timezone": body.timezone, "onboarding_completed": True,
    }).execute()

    # Create a daily_log entry with the starting weight
    today = dt.datetime.now(ZoneInfo(body.timezone)).strftime("%Y-%m-%d")
    supabase.table("daily_logs").upsert(
        {"user_id": user_id, "date": today, "weight_kg": body.weight_kg, "total_calories": 0},
        on_conflict="user_id,date",
    ).execute()

    encrypted = encrypt_api_key(body.openai_api_key)
    supabase.table("user_api_keys").upsert({
        "user_id": user_id, "provider": "openai", "encrypted_key": encrypted,
    }).execute()

    return OnboardingResponse(
        daily_calorie_target=calorie_target,
        message="Onboarding complete! You're all set to start tracking.",
    )
