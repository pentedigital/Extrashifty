"""Main API router combining all v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    agency,
    applications,
    auth,
    company,
    disputes,
    gdpr,
    invoices,
    marketplace,
    notifications,
    payments,
    reviews,
    shifts,
    staff,
    stripe_webhooks,
    tax,
    users,
    verification,
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
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(stripe_webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(verification.router, prefix="/verification", tags=["verification"])
api_router.include_router(disputes.router, prefix="/disputes", tags=["disputes"])
api_router.include_router(tax.router, prefix="/tax", tags=["tax"])
api_router.include_router(gdpr.router, prefix="/gdpr", tags=["gdpr"])
api_router.include_router(websocket.router, tags=["websocket"])
