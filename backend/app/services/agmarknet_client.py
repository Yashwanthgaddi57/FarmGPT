"""Agmarknet mandi price client via data.gov.in (real market data).

Fetches variety-wise daily wholesale prices (min/max/modal, INR/quintal)
reported by APMC markets to AGMARKNET, published through data.gov.in.

Contract (verified against the live resource, 2026-09):
  GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
  params: api-key, format=json, offset, limit (<=1000)
  filters: filters[state.keyword]  (state needs the .keyword suffix)
           filters[district], filters[market], filters[commodity]

Record fields: state, district, market, commodity, variety, grade,
arrival_date (dd/mm/yyyy), min_price, max_price, modal_price (strings).

Fail-soft: every failure mode (no key, network, rate limit, bad rows)
returns [] so the synthetic baseline in market_service stays the fallback.
"""
import logging
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from app.core.cache import cache_get, cache_set

logger = logging.getLogger("app.market.agmarknet")

RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
_UA = {"User-Agent": "AgriSphereAI/1.0 (support@agrisphere.ai)"}

# Only map the exact spellings Agmarknet uses for the crops in BASE_PRICES.
# A wrong alias returns zero rows; unknown crops just fall back to baseline.
AGMARKNET_COMMODITY = {
    "wheat": "Wheat",
    "rice": "Rice",
    "paddy": "Paddy(Dhan)(Common)",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
    "maize": "Maize",
    "soybean": "Soyabean",
    "onion": "Onion",
    "potato": "Potato",
    "tomato": "Tomato",
    "gram": "Gram",
    "chickpea": "Chickpea",
    "mustard": "Mustard",
    "groundnut": "Groundnut",
    "turmeric": "Turmeric",
    "chilli": "Chilli(Dry)",
    "cumin": "Cumin Seed",
    "banana": "Banana",
    "mango": "Mango",
    "guava": "Guava",
    "barley": "Barley",
    "bajra": "Bajra(Pearl Millet/Cumbu)",
    "jowar": "Jowar(Sorghum)",
}

# How fresh a record must be to count as a live quote (markets report daily
# but the publication pipeline has gaps — a week is the honest ceiling).
FRESHNESS_DAYS = 7


def parse_arrival_date(raw: Any) -> date | None:
    """Agmarknet sends dd/mm/yyyy strings; tolerate a few variants."""
    if not raw:
        return None
    value = str(raw).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _to_float(raw: Any) -> float | None:
    try:
        value = float(str(raw).strip().replace(",", ""))
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _parse_rows(records: list[dict]) -> list[dict]:
    """Normalize raw records into price points; quarantine nonsense rows."""
    by_day: dict[str, float] = {}
    for rec in records:
        modal = _to_float(rec.get("modal_price"))
        if modal is None:
            continue
        min_p = _to_float(rec.get("min_price"))
        max_p = _to_float(rec.get("max_price"))
        # Modal should sit inside the reported band; if not, trust modal but
        # flag once — dropping wholesale rows distorts thin markets.
        if min_p is not None and max_p is not None and not (min_p <= modal <= max_p):
            logger.debug("Suspicious price band: %s", rec)
        day = parse_arrival_date(rec.get("arrival_date"))
        if day is None:
            continue
        # Several varieties report per day: average them into one price point.
        by_day.setdefault(day, []).append(modal)
    out = []
    for day, prices in by_day.items():
        out.append({"date": day.isoformat(), "price": round(sum(prices) / len(prices), 2)})
    out.sort(key=lambda p: p["date"])
    return out


def fetch_mandi_prices(
    crop: str,
    state: str | None = None,
    district: str | None = None,
    market: str | None = None,
    days: int = 90,
    api_key: str | None = None,
) -> list[dict]:
    """Real daily modal prices for one crop, newest last.

    Location filters are best-effort: unknown spellings yield zero rows, so
    callers should fall back to the state level and then to no filter.
    Returns [] on any failure — never raises.
    """
    from app.core.config import settings

    key = api_key or settings.DATA_GOV_API_KEY
    if not key:
        return []

    commodity = AGMARKNET_COMMODITY.get(crop.lower().strip())
    if not commodity:
        return []

    cache_key = f"agmarknet:{crop.lower().strip()}:{(state or '').lower()}:{(district or '').lower()}:{(market or '').lower()}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    # 90 calendar days back — enough for the weekly series the AI consumes.
    records: list[dict] = []
    try:
        with httpx.Client(timeout=15, headers=_UA) as client:
            filters: dict[str, str] = {"filters[commodity]": commodity}
            if state:
                filters["filters[state.keyword]"] = state
            if district:
                filters["filters[district]"] = district
            if market:
                filters["filters[market]"] = market
            for offset in (0, 1000):  # two pages cover ~2 months of a busy mandi
                resp = client.get(
                    RESOURCE_URL,
                    params={
                        "api-key": key,
                        "format": "json",
                        "offset": offset,
                        "limit": 1000,
                        **filters,
                    },
                )
                if resp.status_code == 403 or resp.status_code == 429:
                    logger.warning("Agmarknet API rejected key/rate limit (%s)", resp.status_code)
                    return []
                resp.raise_for_status()
                page = resp.json().get("records") or []
                records.extend(page)
                if len(page) < 1000:
                    break
    except Exception as e:
        logger.warning("Agmarknet fetch failed (%s); falling back to baseline", e)
        return []

    points = _parse_rows(records)
    cutoff = date.today() - timedelta(days=days)
    points = [p for p in points if datetime.strptime(p["date"], "%Y-%m-%d").date() >= cutoff]

    # Daily gaps (holidays, missed reporting): forward-fill for a continuous
    # series so trend math and the chart stay honest about coverage.
    filled: list[dict] = []
    for point in points:
        if filled:
            prev = datetime.strptime(filled[-1]["date"], "%Y-%m-%d").date()
            day = datetime.strptime(point["date"], "%Y-%m-%d").date()
            gap = (day - prev).days
            if 1 < gap <= 7:
                for missing in range(1, gap):
                    mid_date = prev + timedelta(days=missing)
                    filled.append({"date": mid_date.isoformat(), "price": filled[-1]["price"]})
            elif gap > 7:
                filled = []  # too sparse to bridge; start over at this point
        filled.append(point)

    if filled:
        cache_set(cache_key, filled, ttl_seconds=6 * 3600)  # daily data, 6h cache
    return filled


def latest_fresh_price(points: list[dict]) -> float | None:
    """Most recent price only if it is within FRESHNESS_DAYS of today."""
    if not points:
        return None
    last = datetime.strptime(points[-1]["date"], "%Y-%m-%d").date()
    if (date.today() - last).days > FRESHNESS_DAYS:
        return None
    return points[-1]["price"]


def market_data_points(records: list[dict]) -> dict:
    """Top mandis (by most recent record) for the UI's market source panel."""
    mandis: dict[str, dict] = {}
    for rec in records:
        name = str(rec.get("market") or "").strip()
        if not name:
            continue
        modal = _to_float(rec.get("modal_price"))
        day = parse_arrival_date(rec.get("arrival_date"))
        if modal is None or day is None:
            continue
        entry = mandis.setdefault(
            name,
            {
                "market": name,
                "district": str(rec.get("district") or "").strip() or None,
                "state": str(rec.get("state") or "").strip() or None,
                "modal_price": modal,
                "arrival_date": day.isoformat(),
            },
        )
        if day.isoformat() >= entry["arrival_date"]:
            entry.update({"modal_price": modal, "arrival_date": day.isoformat()})
    return mandis
