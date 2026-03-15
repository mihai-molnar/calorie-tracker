from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase

router = APIRouter(tags=["food_entries"])


class FoodEntryPatch(BaseModel):
    estimated_calories: int


@router.patch("/food-entries/{entry_id}")
async def patch_food_entry(
    entry_id: str, body: FoodEntryPatch,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("food_entries").select("id, daily_log_id")
        .eq("id", entry_id).eq("user_id", user_id).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Food entry not found")

    supabase.table("food_entries").update({
        "estimated_calories": body.estimated_calories,
    }).eq("id", entry_id).execute()

    from app.routers.chat import _recalculate_total_calories
    daily_log_id = existing.data[0]["daily_log_id"]
    new_total = _recalculate_total_calories(supabase, daily_log_id)

    return {"message": "Updated", "new_total_calories": new_total}
