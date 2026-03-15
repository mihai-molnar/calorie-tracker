from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.crypto import encrypt_api_key

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateApiKeyRequest(BaseModel):
    openai_api_key: str


@router.patch("/api-key")
async def update_api_key(
    body: UpdateApiKeyRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    encrypted = encrypt_api_key(body.openai_api_key)
    supabase.table("user_api_keys").update({
        "encrypted_key": encrypted,
    }).eq("user_id", user_id).execute()
    return {"message": "API key updated"}
