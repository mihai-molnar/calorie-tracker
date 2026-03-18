from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str


@router.post("/register", response_model=AuthResponse)
async def register(body: AuthRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
        if not result.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        return AuthResponse(
            access_token=result.session.access_token,
            user_id=result.user.id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return AuthResponse(
            access_token=result.session.access_token,
            user_id=result.user.id,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase)):
    return {"message": "Logged out"}
