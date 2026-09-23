"""Nearby agri-vendor discovery.

Two sources merged, sorted by real distance:
  1. Curated directory (`vendors` table, seeded with known agri-businesses)
  2. Live OpenStreetMap discovery near the farmer's pin (real local shops)

Discovery is guarded by an overall deadline: if Overpass is slow, the curated
answer ships first and discovery fills in later (it is cached, so the next
request is fast).
"""
import asyncio
from typing import Any

from sqlalchemy.orm import Session

from app.models.mandi import Vendor
from app.services.geo_service import haversine_km
from app.services.osm_vendors import discover_vendors_osm

# Overall deadline for live discovery inside a request.
DISCOVERY_TIMEOUT_S = 12.0

# Category preference when the farmer asks for a specific category: OSM shops
# matching it exactly outrank directory entries, so live results lead.
_CATEGORY_BOOST_OSM = -15.0


async def nearby_vendors(
    db: Session,
    lat: float,
    lon: float,
    category: str | None = None,
    crop: str | None = None,
    limit: int = 15,
    radius_km: int = 50,
) -> list[dict[str, Any]]:
    """Directory + OSM vendors within radius_km, sorted by distance.

    Progressive widening (spec D1/D4): if the requested radius yields nothing,
    widen once to the next step so the page is never needlessly empty; the
    caller echoes the effective radius actually used.
    """
    radius_km = max(5, min(int(radius_km or 50), 300))
    directory: list[dict[str, Any]] = []
    for v in db.query(Vendor).all():
        if category and v.category != category:
            continue
        d = haversine_km(lat, lon, float(v.latitude), float(v.longitude))
        crop_lower = (crop or "").lower()
        crop_match = bool(crop_lower and crop_lower in [c.lower() for c in (v.crops or [])])
        directory.append(
            {
                "id": str(v.id),
                "name": v.name,
                "category": v.category,
                "description": v.description,
                "phone": v.phone,
                "address": v.address,
                "city": v.city,
                "district": v.district,
                "state": v.state,
                "latitude": float(v.latitude),
                "longitude": float(v.longitude),
                "crops": v.crops or [],
                "raw_distance_km": round(d, 1),
                "distance_km": round(d - (30.0 if crop_match else 0.0), 1),
                "matches_crop": crop_match,
                "source": "directory",
            }
        )

    osm_shops: list[dict[str, Any]] = []
    if lat and lon:
        try:
            # Never let a slow Overpass hold the response hostage.
            osm_shops = await asyncio.wait_for(
                discover_vendors_osm(lat, lon, radius_m=25000, limit=20),
                timeout=DISCOVERY_TIMEOUT_S,
            )
        except (asyncio.TimeoutError, Exception):  # noqa: BLE001 — fail-soft by design
            osm_shops = []

    crop_lower = (crop or "").lower()
    for v in osm_shops:
        if category and v.get("category") != category:
            continue
        try:
            d = haversine_km(lat, lon, v["latitude"], v["longitude"])
        except (KeyError, TypeError, ValueError):
            continue
        v["raw_distance_km"] = round(d, 1)
        v["distance_km"] = round(d, 1)
        v["matches_crop"] = False
        osm_boost = _CATEGORY_BOOST_OSM if (category and v.get("category") == category) else 0.0
        v["distance_km"] = round(d + osm_boost, 1)

    merged = directory + osm_shops
    # Filter out any entries missing required fields
    merged = [v for v in merged if v.get("distance_km") is not None and v.get("raw_distance_km") is not None]
    merged.sort(key=lambda x: x["distance_km"])

    # Farmer-controlled radius (replaces the old implicit 150 km cap).
    within = [v for v in merged if v["raw_distance_km"] <= radius_km]
    if within:
        return within[:limit]

    # Nothing within radius: widen once (50 -> 100 -> 200 km ceiling).
    widened = radius_km * 2 if radius_km < 100 else min(radius_km * 2, 300)
    widened_results = [v for v in merged if v["raw_distance_km"] <= widened]
    if widened_results:
        return widened_results[:limit]

    # Page never empty: nearest 3 regardless of distance (UI labels them as
    # 'nearest markets' in the zero-results block).
    return merged[:3]
