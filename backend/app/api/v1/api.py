"""Main API router combining all v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    agency,
    applications,
    auth,
    company,
    marketplace,
    notifications,
    reviews,
    shifts,
    staff,
    users,
    wallet,
    websocket,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(agency.router, prefix="/agency", tags=["agency"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(company.router, prefix="/company", tags=["company"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(websocket.router, tags=["websocket"])
