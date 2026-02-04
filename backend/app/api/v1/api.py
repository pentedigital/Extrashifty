"""Main API router combining all v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, shifts, applications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
