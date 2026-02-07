"""Scheduled task management for ExtraShifty.

This module sets up background tasks for:
- Weekly payouts (Fridays)
- Auto-approve shifts after 24hr timeout
- Auto-topup wallet checks
- Dispute deadline checks
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Callable, Coroutine

from sqlmodel import Session

from app.core.db import engine
from app.services.payment_service import PaymentService
from app.services.penalty_service import PenaltyService

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
            self.last_run = datetime.now(UTC)
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
    if datetime.now(UTC).weekday() != 4:  # 4 = Friday
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
                FundsHold.expires_at < datetime.now(UTC),
            )
        ).all()

        for hold in expired_holds:
            try:
                # Release the hold
                hold.status = FundsHoldStatus.EXPIRED
                hold.released_at = datetime.now(UTC)
                session.add(hold)

                # Return reserved funds to wallet
                wallet = session.get(Wallet, hold.wallet_id)
                if wallet:
                    wallet.reserved_balance -= hold.amount
                    wallet.updated_at = datetime.now(UTC)
                    session.add(wallet)

                logger.info(f"Expired funds hold {hold.id} for shift {hold.shift_id}")
            except Exception as e:
                logger.error(f"Failed to expire hold {hold.id}: {e}")

        session.commit()

        if expired_holds:
            logger.info(f"Expired {len(expired_holds)} funds holds")


async def dispute_deadline_check_job() -> None:
    """
    Check for disputes approaching the 3-day resolution deadline and auto-resolve overdue disputes.

    Runs hourly to:
    1. Alert admins of disputes that need resolution within the next 24 hours
    2. Auto-resolve overdue disputes in favor of the worker (per platform policy)
    """
    from sqlmodel import select

    from app.models.notification import Notification
    from app.models.user import User, UserType
    from app.services.dispute_service import dispute_service

    with Session(engine) as session:
        try:
            # STEP 1: Auto-resolve any overdue disputes
            auto_resolved = await dispute_service.auto_resolve_overdue_disputes(db=session)
            if auto_resolved:
                logger.warning(
                    f"Auto-resolved {len(auto_resolved)} overdue disputes in favor of workers: "
                    f"{[d.id for d in auto_resolved]}"
                )

                # Notify admins about auto-resolutions
                admins = session.exec(
                    select(User).where(
                        User.user_type == UserType.ADMIN,
                        User.is_active == True,
                    )
                ).all()

                for dispute in auto_resolved:
                    logger.warning(
                        f"DISPUTE AUTO-RESOLVED: Dispute #{dispute.id} "
                        f"(Shift: {dispute.shift_id}, Amount: {dispute.amount_disputed}) "
                        f"was auto-resolved in favor of worker due to exceeded deadline"
                    )
                    for admin in admins:
                        admin_notification = Notification(
                            user_id=admin.id,
                            type="dispute_auto_resolved",
                            title="Dispute Auto-Resolved",
                            message=(
                                f"Dispute #{dispute.id} (Shift #{dispute.shift_id}, "
                                f"€{dispute.amount_disputed}) auto-resolved in favor of worker"
                            ),
                            data={
                                "dispute_id": dispute.id,
                                "shift_id": dispute.shift_id,
                                "amount": str(dispute.amount_disputed),
                            },
                        )
                        session.add(admin_notification)

                session.commit()

            # STEP 2: Get disputes approaching deadline (within 24 hours)
            approaching = await dispute_service.get_disputes_approaching_deadline(
                db=session, hours=24
            )

            if approaching:
                logger.warning(
                    f"Found {len(approaching)} disputes approaching deadline: "
                    f"{[d.id for d in approaching]}"
                )

                # Get admin users for notification (reuse from above if already fetched)
                if not auto_resolved:
                    admins = session.exec(
                        select(User).where(
                            User.user_type == UserType.ADMIN,
                            User.is_active == True,
                        )
                    ).all()

                # Log alerts for each dispute
                for dispute in approaching:
                    hours_left = (
                        (dispute.resolution_deadline - datetime.now(UTC)).total_seconds() / 3600
                        if dispute.resolution_deadline else 0
                    )
                    logger.warning(
                        f"DISPUTE DEADLINE ALERT: Dispute #{dispute.id} "
                        f"(Shift: {dispute.shift_id}, Amount: {dispute.amount_disputed}) "
                        f"needs resolution within {hours_left:.1f} hours"
                    )
                    for admin in admins:
                        admin_notification = Notification(
                            user_id=admin.id,
                            type="dispute_deadline_approaching",
                            title="Dispute Deadline Approaching",
                            message=(
                                f"Dispute #{dispute.id} (Shift #{dispute.shift_id}) "
                                f"needs resolution within {hours_left:.1f} hours"
                            ),
                            data={
                                "dispute_id": dispute.id,
                                "shift_id": dispute.shift_id,
                                "hours_left": round(hours_left, 1),
                            },
                        )
                        session.add(admin_notification)

                session.commit()

            else:
                logger.debug("No disputes approaching deadline")

        except Exception as e:
            logger.error(f"Dispute deadline check job failed: {e}", exc_info=True)


async def reserve_upcoming_shift_days_job() -> None:
    """
    Process scheduled reserves for multi-day shifts.

    Runs every hour to find multi-day shifts where the next day
    starts within 48 hours and executes the reserve for that day.

    This ensures funds are reserved before each day of a multi-day
    shift, protecting both the company and worker.
    """

    with Session(engine) as session:
        payment_service = PaymentService(session)

        try:
            # Get all pending scheduled reserves that are due
            # (execute_at <= now + 1 hour to give buffer)
            pending_reserves = payment_service.get_pending_scheduled_reserves()

            if not pending_reserves:
                logger.debug("No pending scheduled reserves to process")
                return

            logger.info(f"Processing {len(pending_reserves)} scheduled reserves")

            successful = 0
            failed = 0

            for scheduled_reserve in pending_reserves:
                try:
                    result = await payment_service.execute_scheduled_reserve(
                        scheduled_reserve_id=scheduled_reserve.id
                    )
                    if result:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(
                        f"Error executing scheduled reserve {scheduled_reserve.id}: {e}"
                    )
                    failed += 1

            logger.info(
                f"Scheduled reserves job completed: "
                f"{successful} successful, {failed} failed"
            )

        except Exception as e:
            logger.error(f"Reserve upcoming shift days job failed: {e}", exc_info=True)


async def check_wallet_suspensions_job() -> None:
    """
    Check wallet grace periods and handle suspensions.

    Runs every hour to:
    1. Send 24-hour warning emails to wallets approaching suspension
    2. Suspend wallets whose grace period has expired
    3. Send suspension notification emails

    This job ensures timely communication with users about payment
    issues and enforces the 48-hour grace period policy.
    """
    with Session(engine) as session:
        payment_service = PaymentService(session)

        try:
            # First, send warnings to wallets approaching suspension (within 24 hours)
            warned_ids = await payment_service.send_suspension_warnings()
            if warned_ids:
                logger.info(
                    f"Sent suspension warnings to {len(warned_ids)} wallets: {warned_ids}"
                )

            # Then, suspend wallets whose grace period has expired
            suspended_ids = await payment_service.check_and_suspend_wallets()
            if suspended_ids:
                logger.warning(
                    f"Suspended {len(suspended_ids)} wallets due to expired grace period: "
                    f"{suspended_ids}"
                )

            if not warned_ids and not suspended_ids:
                logger.debug("No wallet suspension actions needed")

        except Exception as e:
            logger.error(f"Check wallet suspensions job failed: {e}", exc_info=True)


async def check_w9_reminders_job() -> None:
    """
    Send W9 reminder notifications to users who need to submit.

    Runs weekly to:
    1. Find users who crossed $600 threshold but haven't submitted W9
    2. Send reminder notifications via email and in-app

    This job ensures tax compliance by prompting users to submit
    their W9 information for 1099-NEC reporting.
    """
    from sqlmodel import select

    from app.models.tax import TaxFormStatus, TaxYear
    from app.models.user import User

    with Session(engine) as session:
        try:
            # Get current tax year
            current_year = datetime.now(UTC).year

            # Find users with pending W9 status
            pending_w9_records = session.exec(
                select(TaxYear, User)
                .join(User, TaxYear.user_id == User.id)
                .where(
                    TaxYear.tax_year == current_year,
                    TaxYear.threshold_reached == True,
                    TaxYear.status == TaxFormStatus.PENDING_W9,
                )
            ).all()

            if not pending_w9_records:
                logger.debug("No pending W9 reminders to send")
                return

            logger.info(f"Found {len(pending_w9_records)} users needing W9 reminders")

            # Send reminders
            reminded_count = 0
            for tax_year_record, user in pending_w9_records:
                try:
                    # Calculate days since threshold was reached
                    if tax_year_record.threshold_reached_at:
                        days_since = (datetime.now(UTC) - tax_year_record.threshold_reached_at).days
                    else:
                        days_since = 0

                    # Only send reminder if at least 7 days have passed
                    # This gives users time to submit before bothering them
                    if days_since >= 7:
                        # In production, send email and create notification
                        # await email_service.send_w9_reminder(
                        #     user_id=user.id,
                        #     tax_year=tax_year_record.tax_year,
                        #     total_earnings=tax_year_record.total_earnings,
                        # )
                        logger.info(
                            f"W9 reminder: User {user.id} ({user.email}) "
                            f"earned ${tax_year_record.total_earnings} in {current_year}, "
                            f"W9 pending for {days_since} days"
                        )
                        reminded_count += 1

                except Exception as e:
                    logger.error(f"Failed to send W9 reminder to user {user.id}: {e}")

            if reminded_count > 0:
                logger.info(f"Sent {reminded_count} W9 reminder notifications")

        except Exception as e:
            logger.error(f"W9 reminders job failed: {e}", exc_info=True)


async def process_pending_deletions_job() -> None:
    """
    Process deletion requests past grace period.

    Runs daily to find GDPR deletion requests that have passed the
    30-day grace period and processes them.
    """
    from app.services.gdpr_service import GDPRService

    with Session(engine) as session:
        gdpr_service = GDPRService(session)

        try:
            # Get deletion requests ready for processing
            ready_requests = await gdpr_service.get_ready_for_deletion()

            if not ready_requests:
                logger.debug("No deletion requests ready for processing")
                return

            logger.info(f"Processing {len(ready_requests)} deletion requests")

            successful = 0
            failed = 0

            for request in ready_requests:
                try:
                    await gdpr_service.process_deletion(request.id)
                    successful += 1
                    logger.info(f"Successfully processed deletion request {request.id}")
                except Exception as e:
                    failed += 1
                    logger.error(
                        f"Failed to process deletion request {request.id}: {e}"
                    )

            logger.info(
                f"Deletion processing completed: "
                f"{successful} successful, {failed} failed"
            )

        except Exception as e:
            logger.error(f"Process pending deletions job failed: {e}", exc_info=True)


async def cleanup_expired_exports_job() -> None:
    """
    Delete expired data export files.

    Runs daily to clean up data export files that have passed their
    48-hour expiration window.
    """
    from sqlmodel import select

    from app.models.gdpr import DeletionRequest

    with Session(engine) as session:
        try:
            # Find deletion requests with expired exports
            expired_exports = session.exec(
                select(DeletionRequest).where(
                    DeletionRequest.data_export_url.isnot(None),
                    DeletionRequest.data_export_expires_at < datetime.now(UTC),
                )
            ).all()

            if not expired_exports:
                logger.debug("No expired exports to clean up")
                return

            from app.services.storage_service import StorageService

            storage = StorageService()

            count = 0
            for request in expired_exports:
                if request.data_export_url:
                    storage.delete_export(request.data_export_url)

                # Clear the URL
                request.data_export_url = None
                request.data_export_expires_at = None
                request.updated_at = datetime.now(UTC)
                session.add(request)
                count += 1

            session.commit()
            logger.info(f"Cleaned up {count} expired data exports")

        except Exception as e:
            logger.error(f"Cleanup expired exports job failed: {e}", exc_info=True)


async def monthly_agency_invoice_generation_job() -> None:
    """
    Generate monthly invoices for Mode B (FULL_INTERMEDIARY) agency clients.

    Runs on the 1st of each month to generate invoices for the previous month.
    Only generates invoices for agencies operating in Mode B with active clients
    that have completed shifts during the period.
    """
    from sqlmodel import select

    from app.models.agency import AgencyMode, AgencyProfile
    from app.services.agency_billing_service import AgencyBillingService

    # Check if it's the 1st of the month
    today = datetime.now(UTC)
    if today.day != 1:
        logger.debug("Skipping monthly invoice generation - not the 1st of the month")
        return

    # Calculate the previous month's period
    if today.month == 1:
        year = today.year - 1
        month = 12
    else:
        year = today.year
        month = today.month - 1

    logger.info(f"Starting monthly invoice generation for {year}-{month:02d}")

    with Session(engine) as session:
        try:
            # Find all agencies in FULL_INTERMEDIARY mode
            mode_b_agencies = session.exec(
                select(AgencyProfile).where(
                    AgencyProfile.mode == AgencyMode.FULL_INTERMEDIARY
                )
            ).all()

            if not mode_b_agencies:
                logger.debug("No Mode B agencies found for monthly invoice generation")
                return

            total_invoices = 0
            total_skipped = 0

            for agency_profile in mode_b_agencies:
                try:
                    billing_service = AgencyBillingService(session)
                    created_invoices = await billing_service.generate_monthly_invoices(
                        agency_id=agency_profile.user_id,
                        year=year,
                        month=month,
                        auto_send=False,  # Create as draft, agency sends manually
                    )

                    total_invoices += len(created_invoices)
                    logger.info(
                        f"Agency {agency_profile.user_id}: Generated {len(created_invoices)} "
                        f"invoices for {year}-{month:02d}"
                    )

                except Exception as e:
                    total_skipped += 1
                    logger.error(
                        f"Failed to generate invoices for agency {agency_profile.user_id}: {e}"
                    )

            logger.info(
                f"Monthly invoice generation completed: "
                f"{total_invoices} invoices generated, {total_skipped} agencies skipped"
            )

        except Exception as e:
            logger.error(f"Monthly invoice generation job failed: {e}", exc_info=True)


async def check_noshow_job() -> None:
    """
    Check for no-shows and process penalties.

    Runs every 15 minutes to find shifts that:
    - Started 30+ minutes ago
    - Have an accepted worker
    - Worker has not clocked in (shift still FILLED, not IN_PROGRESS)

    For each no-show found:
    - Apply first-offense leniency if applicable (warning only)
    - Calculate 50% penalty of shift value
    - Add strike (with same-day cap check)
    - Check for 3-strike suspension threshold
    - Process 100% refund to company
    """
    with Session(engine) as session:
        penalty_service = PenaltyService(session)

        try:
            # Find shifts that need no-show checking
            shifts_to_check = penalty_service.get_shifts_needing_noshow_check()

            if not shifts_to_check:
                logger.debug("No shifts found for no-show check")
                return

            logger.info(f"Checking {len(shifts_to_check)} shifts for no-shows")

            processed = 0
            first_offense = 0
            penalties_applied = 0
            suspensions = 0

            for shift in shifts_to_check:
                try:
                    result = await penalty_service.process_noshow(shift.id)
                    if result:
                        processed += 1
                        if result.get("is_first_offense"):
                            first_offense += 1
                        else:
                            penalties_applied += 1
                        if result.get("suspended"):
                            suspensions += 1
                except Exception as e:
                    logger.error(f"Error processing no-show for shift {shift.id}: {e}")

            logger.info(
                f"No-show check completed: {processed} processed, "
                f"{first_offense} first-offense warnings, {penalties_applied} penalties, "
                f"{suspensions} suspensions"
            )

        except Exception as e:
            logger.error(f"No-show check job failed: {e}", exc_info=True)


async def check_strike_expiry_job() -> None:
    """
    Expire strikes past their 90-day expiration date.

    Runs daily to mark expired strikes as inactive.
    """
    with Session(engine) as session:
        penalty_service = PenaltyService(session)

        try:
            expired_count = penalty_service.expire_old_strikes()
            if expired_count > 0:
                logger.info(f"Expired {expired_count} strikes past 90-day window")
            else:
                logger.debug("No strikes to expire")
        except Exception as e:
            logger.error(f"Strike expiry job failed: {e}", exc_info=True)


async def check_inactivity_writeoffs_job() -> None:
    """
    Check for negative balances past 6 months of inactivity.

    Runs daily to:
    - Write off negative balances for users inactive 6+ months
    - Suspend affected accounts
    - Mark pending penalties as WRITTEN_OFF
    """
    with Session(engine) as session:
        penalty_service = PenaltyService(session)

        try:
            affected_user_ids = await penalty_service.check_inactivity_writeoffs()
            if affected_user_ids:
                logger.warning(
                    f"Wrote off negative balances for {len(affected_user_ids)} inactive users: "
                    f"{affected_user_ids}"
                )
            else:
                logger.debug("No inactive accounts for negative balance write-off")
        except Exception as e:
            logger.error(f"Inactivity writeoff job failed: {e}", exc_info=True)


async def mark_overdue_invoices_job() -> None:
    """
    Mark agency client invoices that are past due date as overdue.

    Runs daily to update invoice statuses for better tracking.
    """
    from sqlmodel import select

    from app.models.agency import AgencyMode, AgencyProfile
    from app.services.agency_billing_service import AgencyBillingService

    with Session(engine) as session:
        try:
            # Find all agencies in FULL_INTERMEDIARY mode
            mode_b_agencies = session.exec(
                select(AgencyProfile).where(
                    AgencyProfile.mode == AgencyMode.FULL_INTERMEDIARY
                )
            ).all()

            total_marked = 0
            for agency_profile in mode_b_agencies:
                try:
                    billing_service = AgencyBillingService(session)
                    marked_ids = billing_service.mark_overdue_invoices(
                        agency_id=agency_profile.user_id
                    )
                    total_marked += len(marked_ids)

                except Exception as e:
                    logger.error(
                        f"Failed to mark overdue invoices for agency {agency_profile.user_id}: {e}"
                    )

            if total_marked > 0:
                logger.info(f"Marked {total_marked} invoices as overdue")
            else:
                logger.debug("No invoices to mark as overdue")

        except Exception as e:
            logger.error(f"Mark overdue invoices job failed: {e}", exc_info=True)


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

    # Dispute deadline check job - runs every hour
    # Checks for approaching deadlines and auto-resolves overdue disputes
    scheduler.add_task(
        name="dispute_deadline_check",
        func=dispute_deadline_check_job,
        interval_seconds=3600,  # 1 hour
        run_on_startup=False,
    )

    # Reserve upcoming shift days job - runs every hour
    # Finds multi-day shifts where next day starts within 48hrs
    # and executes the scheduled reserve for that day
    scheduler.add_task(
        name="reserve_upcoming_shift_days",
        func=reserve_upcoming_shift_days_job,
        interval_seconds=3600,  # 1 hour
        run_on_startup=False,
    )

    # Wallet suspension check job - runs every hour
    # Sends 24hr warnings and suspends wallets past grace period
    scheduler.add_task(
        name="check_wallet_suspensions",
        func=check_wallet_suspensions_job,
        interval_seconds=3600,  # 1 hour
        run_on_startup=False,
    )

    # W9 reminder check job - runs weekly (every 7 days)
    # Sends reminders to users who crossed $600 threshold but haven't submitted W9
    scheduler.add_task(
        name="check_w9_reminders",
        func=check_w9_reminders_job,
        interval_seconds=604800,  # 7 days
        run_on_startup=False,
    )

    # GDPR deletion processing job - runs daily
    # Processes deletion requests that have passed the 30-day grace period
    scheduler.add_task(
        name="process_pending_deletions",
        func=process_pending_deletions_job,
        interval_seconds=86400,  # 24 hours
        run_on_startup=False,
    )

    # Cleanup expired exports job - runs daily
    # Removes data export files that have passed their 48-hour expiration
    scheduler.add_task(
        name="cleanup_expired_exports",
        func=cleanup_expired_exports_job,
        interval_seconds=86400,  # 24 hours
        run_on_startup=False,
    )

    # Monthly agency invoice generation job - runs daily, only processes on 1st
    # Generates invoices for Mode B agencies for the previous month
    scheduler.add_task(
        name="monthly_agency_invoice_generation",
        func=monthly_agency_invoice_generation_job,
        interval_seconds=86400,  # 24 hours (checks if it's the 1st)
        run_on_startup=False,
    )

    # Mark overdue invoices job - runs daily
    # Updates invoice status for invoices past due date
    scheduler.add_task(
        name="mark_overdue_invoices",
        func=mark_overdue_invoices_job,
        interval_seconds=86400,  # 24 hours
        run_on_startup=False,
    )

    # No-show check job - runs every 15 minutes
    # Finds shifts 30+ minutes past start with no clock-in and processes penalties
    scheduler.add_task(
        name="check_noshow",
        func=check_noshow_job,
        interval_seconds=900,  # 15 minutes
        run_on_startup=False,
    )

    # Strike expiry job - runs daily
    # Expires strikes past their 90-day window
    scheduler.add_task(
        name="check_strike_expiry",
        func=check_strike_expiry_job,
        interval_seconds=86400,  # 24 hours
        run_on_startup=False,
    )

    # Inactivity writeoff job - runs daily
    # Writes off negative balances for users inactive 6+ months
    scheduler.add_task(
        name="check_inactivity_writeoffs",
        func=check_inactivity_writeoffs_job,
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
