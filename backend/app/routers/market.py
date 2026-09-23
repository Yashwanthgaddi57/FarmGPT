"""Market intelligence endpoints."""
import uuid as uuidlib

from fastapi import APIRouter

from app.core.deps import CurrentUser, DBSession, Pagination
from app.models.market_prediction import MarketPrediction
from app.schemas.ai_features import MarketPredictionRequest
from app.services.activity_service import log_activity
from app.services.location_service import resolve_location_async
from app.services.market_service import MarketService

router = APIRouter(prefix="/market", tags=["market"])


@router.post("/analyze")
async def analyze(payload: MarketPredictionRequest, user: CurrentUser, db: DBSession):
    loc = await resolve_location_async(db, user)
    pred = await MarketService(db).analyze(str(user.id), payload, farmer_loc=loc.to_dict())
    log_activity(db, str(user.id), "market.analyzed", "market_prediction", str(pred.id), {"crop": payload.crop})
    return pred


@router.get("/predictions")
async def list_predictions(user: CurrentUser, db: DBSession, pagination: Pagination):
    q = (
        db.query(MarketPrediction)
        .filter(MarketPrediction.user_id == uuidlib.UUID(str(user.id)))
        .order_by(MarketPrediction.created_at.desc())
    )
    total = q.count()
    items = q.offset(pagination.offset).limit(pagination.page_size).all()
    return {"items": items, "total": total, "page": pagination.page, "page_size": pagination.page_size}


@router.get("/history")
async def history(crop: str, user: CurrentUser, db: DBSession, limit: int = 30):
    """Latest stored predictions for a crop (trend over time of AI views)."""
    q = (
        db.query(MarketPrediction)
        .filter(
            MarketPrediction.user_id == uuidlib.UUID(str(user.id)),
            MarketPrediction.crop.ilike(crop),
        )
        .order_by(MarketPrediction.created_at.desc())
        .limit(limit)
    )
    return {"items": q.all()}
