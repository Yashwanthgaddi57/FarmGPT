"""Background scheduler: generates weather + market alerts for active users."""
import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings

logger = logging.getLogger("app.scheduler")
scheduler = AsyncIOScheduler(timezone="UTC")


async def generate_alerts() -> None:
    """Scan active users, create weather/market/profit notifications."""
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.services.notification_service import NotificationService
    from app.services.weather_service import WeatherService

    db = SessionLocal()
    try:
        users = db.query(User).filter(User.onboarding_completed.is_(True)).limit(200).all()
        wx_service = WeatherService(db)
        notif_service = NotificationService(db)

        for user in users:
            location = user.district or user.village
            if not location:
                continue
            try:
                wx = await wx_service.get_intelligence(str(user.id), location, save=False)
                for alert in wx.get("alerts", [])[:2]:
                    notif_service.create(
                        user_id=str(user.id),
                        type_="weather",
                        title="Weather alert",
                        body=alert,
                        link="/dashboard/weather",
                    )
            except Exception as e:
                logger.warning("Alert generation failed for user %s: %s", user.id, e)
        db.commit()
        logger.info("Alert generation pass complete for %d users", len(users))
    finally:
        db.close()


def start_scheduler() -> None:
    if not settings.SCHEDULER_ENABLED:
        return
    try:
        scheduler.add_job(
            generate_alerts,
            IntervalTrigger(minutes=settings.SCHEDULER_INTERVAL_MINUTES),
            id="generate_alerts",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Scheduler started (interval=%s min)", settings.SCHEDULER_INTERVAL_MINUTES)
    except Exception as e:
        # Scheduler is optional (e.g. restricted environments); never block startup.
        logger.warning("Scheduler disabled: %s", e)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
