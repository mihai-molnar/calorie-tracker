from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Calorie Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, onboarding, chat, dashboard, food_entries

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(food_entries.router)



@app.get("/health")
async def health():
    return {"status": "ok"}
