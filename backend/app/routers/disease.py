"""Disease detection endpoints."""
import uuid as uuidlib
from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Form, UploadFile, File

from app.core.deps import CurrentUser, DBSession, Pagination
from app.models.disease_report import DiseaseReport
from app.services.activity_service import log_activity
from app.services.disease_service import DiseaseService

router = APIRouter(prefix="/disease", tags=["disease"])


@router.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    crop: str = Form(...),
    farm_id: str | None = Form(None),
    user: CurrentUser = None,
    db: DBSession = None,
):
    content = await image.read()
    report = await DiseaseService(db).analyze(
        user_id=str(user.id),
        crop=crop,
        image_bytes=content,
        media_type=image.content_type or "image/jpeg",
        farm_id=farm_id,
    )
    log_activity(db, str(user.id), "disease.analyzed", "disease_report", str(report.id), {"disease": report.disease_name})
    return report


@router.get("/reports")
async def list_reports(user: CurrentUser, db: DBSession, pagination: Pagination):
    q = (
        db.query(DiseaseReport)
        .filter(DiseaseReport.user_id == uuidlib.UUID(str(user.id)))
        .order_by(DiseaseReport.created_at.desc())
    )
    total = q.count()
    items = q.offset(pagination.offset).limit(pagination.page_size).all()
    return {"items": items, "total": total, "page": pagination.page, "page_size": pagination.page_size}


@router.get("/reports/{report_id}")
async def get_report(report_id: str, user: CurrentUser, db: DBSession):
    report = (
        db.query(DiseaseReport)
        .filter(
            DiseaseReport.id == uuidlib.UUID(report_id),
            DiseaseReport.user_id == uuidlib.UUID(str(user.id)),
        )
        .first()
    )
    if not report:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Report not found")
    return report


@router.get("/analytics")
async def analytics(user: CurrentUser, db: DBSession):
    uid = uuidlib.UUID(str(user.id))
    reports = (
        db.query(DiseaseReport)
        .filter(DiseaseReport.user_id == uid)
        .order_by(DiseaseReport.created_at.desc())
        .limit(500)
        .all()
    )
    by_disease = Counter(r.disease_name for r in reports if not r.is_healthy)
    by_crop = Counter(r.crop for r in reports)
    by_severity = Counter(r.severity for r in reports)
    now = date.today()
    monthly = Counter()
    for r in reports:
        key = r.created_at.strftime("%Y-%m")
        monthly[key] += 1

    return {
        "total_reports": len(reports),
        "healthy_count": sum(1 for r in reports if r.is_healthy),
        "diseased_count": sum(1 for r in reports if not r.is_healthy),
        "top_diseases": [{"name": k, "count": v} for k, v in by_disease.most_common(10)],
        "by_crop": [{"name": k, "count": v} for k, v in by_crop.most_common(10)],
        "by_severity": [{"name": k, "count": v} for k, v in by_severity.most_common()],
        "monthly_volume": [{"month": k, "count": v} for k, v in sorted(monthly.items())],
        "avg_confidence": (sum(float(r.confidence or 0) for r in reports) / len(reports)) if reports else 0,
    }
