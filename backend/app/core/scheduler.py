"""Scheduled task management for ExtraShifty.

This module sets up background tasks for:
- Weekly payouts (Fridays)
- Auto-approve shifts after 24hr timeout
- Auto-topup wallet checks
- Dispute deadline checks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable, Coroutine

from sqlmodel import Session

from app.core.db import engine
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)


class ScheduledTask:
    """Represents a scheduled background task."""

    def __init__(
        self,
        name: str,
        func: Callable[[], Coroutine],
        interval_seconds: int,
        run_on_startup: bool = False,
    ):
        self.name = name
        self.func = func
        self.interval_seconds = interval_seconds
        self.run_on_startup = run_on_startup
        self.last_run: datetime | None = None
        self._task: asyncio.Task | None = None
        self._running = False

    async def run(self) -> None:
        """Execute the scheduled task."""
        try:
            logger.info(f"Running scheduled task: {self.name}")
            await self.func()
            self.last_run = datetime.utcnow()
            logger.info(f"Completed scheduled task: {self.name}")
        except Exception as e:
            logger.error(f"Error in scheduled task {self.name}: {e}", exc_info=True)

    async def start(self) -> None:
        """Start the task scheduler loop."""
        self._running = True

        # Run on startup if configured
        if self.run_on_startup:
            await self.run()

        while self._running:
            await asyncio.sleep(self.interval_seconds)
            if self._running:
                await self.run()

    def stop(self) -> None:
        """Stop the task scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()


class Scheduler:
    """Background task scheduler for ExtraShifty."""

    def __init__(self):
        self.tasks: list[ScheduledTask] = []
        self._started = False

    def add_task(
        self,
        name: str,
        func: Callable[[], Coroutine],
        interval_seconds: int,
        run_on_startup: bool = False,
    ) -> None:
        """Add a task to the scheduler."""
        task = ScheduledTask(
            name=name,
            func=func,
            interval_seconds=interval_seconds,
            run_on_startup=run_on_startup,
        )
        self.tasks.append(task)
        logger.info(f"Registered scheduled task: {name} (interval: {interval_seconds}s)")

    async def start_all(self) -> None:
        """Start all scheduled tasks."""
        if self._started:
            logger.warning("Scheduler already started")
            return

        self._started = True
        logger.info(f"Starting scheduler with {len(self.tasks)} tasks")

        for task in self.tasks:
            task._task = asyncio.create_task(task.start())

    def stop_all(self) -> None:
        """Stop all scheduled tasks."""
        logger.info("Stopping scheduler")
        self._started = False

        for task in self.tasks:
            task.stop()


# ==================== Scheduled Job Functions ====================


async def weekly_payout_job() -> None:
    """
    Process weekly payouts for all eligible wallets.

    Runs every Friday. Only processes payouts for wallets
    with balance >= $50.
    """
    # Check if today is Friday
    if datetime.utcnow().weekday() != 4:  # 4 = Friday
        logger.debug("Skipping weekly payout job - not Friday")
        return

    with Session(engine) as session:
        payment_service = PaymentService(session)

        try:
            payouts = await payment_service.process_weekly_payouts()
            logger.info(f"Weekly payout job completed: {len(payouts)} payouts processed")
        except Exception as e:
            logger.error(f"Weekly payout job failed: {e}", exc_info=True)


async def auto_approve_shifts_job() -> None:
    """
    Auto-approve shifts that are past 24hr timeout.

    Runs periodically to find shifts that completed > 24 hours ago
    and automatically settles them with full hours.
    """
    from app.services.verification_service import verification_service

    with Session(engine) as session:
        try:
            # Use the verification service for auto-approval
            approved_ids = await verification_service.check_auto_approve_shifts(
                db=session
            )
            if approved_ids:
                logger.info(f"Auto-approved {len(approved_ids)} shifts: {approved_ids}")
        except Exception as e:
            logger.error(f"Auto-approve shifts job failed: {e}", exc_info=True)


async def auto_topup_check_job() -> None:
    """
    Check wallets and trigger auto-topup if needed.

    Runs periodically to find company wallets that have fallen
    below their configured threshold and tops them up automatically.
    """
    with Session(engine) as session:
        payment_service = PaymentService(session)

        try:
            transactions = await payment_service.check_auto_topup()
            if transactions:
                logger.info(f"Auto-topup job completed: {len(transactions)} wallets topped up")
        except Exception as e:
            logger.error(f"Auto-topup check job failed: {e}", exc_info=True)


async def expire_funds_holds_job() -> None:
    """
    Expire funds holds that have passed their expiration time.

    Runs periodically to release holds that have expired without
    being settled (e.g., cancelled shifts, no-shows).
    """
    from sqlmodel import select

    from app.models.payment import FundsHold, FundsHoldStatus
    from app.models.wallet import Wallet

    with Session(engine) as session:
        # Find expired holds
        expired_holds = session.exec(
            select(FundsHold).where(
                FundsHold.status == FundsHoldStatus.ACTIVE,
                FundsHold.expires_at < datetime.utcnow(),
            )
        ).all()

        for hold in expired_holds:
            try:
                # Release the hold
                hold.status = FundsHoldStatus.EXPIRED
                hold.released_at = datetime.utcnow()
                session.add(hold)

                # Return reserved funds to wallet
                wallet = session.get(Wallet, hold.wallet_id)
                if wallet:
                    wallet.reserved_balance -= hold.amount
                    wallet.updated_at = datetime.utcnow()
                    session.add(wallet)

                logger.info(f"Expired funds hold {hold.id} for shift {hold.shift_id}")
            except Exception as e:
                logger.error(f"Failed to expire hold {hold.id}: {e}")

        session.commit()

        if expired_holds:
            logger.info(f"Expired {len(expired_holds)} funds holds")


async def dispute_deadline_check_job() -> None:
    """
    Check for disputes approaching the 3-day resolution deadline.

    Runs daily to alert admins of disputes that need resolution
    within the next 24 hours.
    """
    from app.services.dispute_service import dispute_service
    from app.models.user import User, UserType
    from sqlmodel import select

    with Session(engine) as session:
        try:
            # Get disputes approaching deadline
            approaching = await dispute_service.check_dispute_deadlines(db=session)

            if approaching:
                logger.warning(
                    f"Found {len(approaching)} disputes approaching deadline: "
                    f"{[d.id for d in approaching]}"
                )

                # Get admin users for notification
                admins = session.exec(
                    select(User).where(
                        User.user_type == UserType.ADMIN,
                        User.is_active == True,
                    )
                ).all()

                # Log alerts for each dispute
                for dispute in approaching:
                    logger.warning(
                        f"DISPUTE DEADLINE ALERT: Dispute #{dispute.id} "
                        f"(Shift: {dispute.shift_id}, Amount: {dispute.amount_disputed}) "
                        f"needs resolution within 24 hours"
                    )

                    # In production, create notifications for each admin
                    # for admin in admins:
                    #     await notification_service.create(
                    #         user_id=admin.id,
                    #         type="dispute_deadline",
                    #         title="Urgent: Dispute Approaching Deadline",
                    #         message=f"Dispute #{dispute.id} needs resolution",
                    #     )

            else:
                logger.debug("No disputes approaching deadline")

        except Exception as e:
            logger.error(f"Dispute deadline check job failed: {e}", exc_info=True)


# ==================== Scheduler Setup ====================


def create_scheduler() -> Scheduler:
    """Create and configure the scheduler with all payment jobs."""
    scheduler = Scheduler()

    # Weekly payout job - runs every hour, but only processes on Fridays
    scheduler.add_task(
        name="weekly_payout",
        func=weekly_payout_job,
        interval_seconds=3600,  # 1 hour
        run_on_startup=False,
    )

    # Auto-approve shifts job - runs every 15 minutes
    scheduler.add_task(
        name="auto_approve_shifts",
        func=auto_approve_shifts_job,
        interval_seconds=900,  # 15 minutes
        run_on_startup=False,
    )

    # Auto-topup check job - runs every 5 minutes
    scheduler.add_task(
        name="auto_topup_check",
        func=auto_topup_check_job,
        interval_seconds=300,  # 5 minutes
        run_on_startup=False,
    )

    # Expire funds holds job - runs every 30 minutes
    scheduler.add_task(
        name="expire_funds_holds",
        func=expire_funds_holds_job,
        interval_seconds=1800,  # 30 minutes
        run_on_startup=False,
    )

    # Dispute deadline check job - runs every 24 hours
    scheduler.add_task(
        name="dispute_deadline_check",
        func=dispute_deadline_check_job,
        interval_seconds=86400,  # 24 hours
        run_on_startup=False,
    )

    return scheduler


# Global scheduler instance
scheduler = create_scheduler()


async def start_scheduler() -> None:
    """Start the global scheduler. Call this on application startup."""
    await scheduler.start_all()


def stop_scheduler() -> None:
    """Stop the global scheduler. Call this on application shutdown."""
    scheduler.stop_all()
