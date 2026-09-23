"""Analytics endpoints."""
import uuid as uuidlib

from fastapi import APIRouter

from app.core.deps import CurrentUser, DBSession, Pagination
from app.models.activity import Activity
from app.services.analytics_service import get_kpis

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/kpis")
async def kpis(user: CurrentUser, db: DBSession):
    return get_kpis(db, str(user.id))


@router.get("/activities")
async def activities(user: CurrentUser, db: DBSession, pagination: Pagination):
    q = (
        db.query(Activity)
        .filter(Activity.user_id == uuidlib.UUID(str(user.id)))
        .order_by(Activity.created_at.desc())
    )
    total = q.count()
    items = q.offset(pagination.offset).limit(pagination.page_size).all()
    return {"items": items, "total": total, "page": pagination.page, "page_size": pagination.page_size}
