"""Live vendor discovery from OpenStreetMap via the Overpass API.

Two-tier strategy tuned for Indian OSM coverage:
  Tier 1 — strictly agri-tagged shops (shop=agriculture/seeds/fertilizer,
           agricultural machinery, agri vending).
  Tier 2 — when tier 1 is empty: hardware/trade shops whose NAME matches agri
           keywords (kisan, agro, seed, fertilizer, tractor, pump, ...).
           Most Indian agri-input shops are tagged `shop=hardware`; the name
           filter keeps generic electrical/electronics shops out.

Cached 24h, fail-soft: on Overpass failure we return [] and the curated
directory still answers the request.
"""
import logging
from typing import Any

import httpx

from app.core.cache import cache_get, cache_set

logger = logging.getLogger("app.geo")

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
_UA = {"User-Agent": "AgriSphereAI/1.0 (support@agrisphere.ai)"}

# Tier 1: unambiguous agri shop tags
_AGRI_SHOP_RE = "^(agriculture|agrarian|seeds|farm|agricultural_machinery|fertilizer)$"

# Tier 2: generic shop types whose *name* must match agri keywords
# (case-insensitive). Covers how Indian agri-input shops are actually tagged.
# Includes wholesale/trade for produce buyers.
_NAME_KEYWORDS = (
    "agri|agro|kisan|krishi|seed|beej|fertiliz|fertili|khaad|khad|"
    "pesticide|dawa|insecticide|tractor|harvester|pump|sprayer|tillier|"
    "farm|organic manure|bio |buyer|procurement|collection|aggregator|trader|mandi|market|mills|oil|crushing|ginning|export|wholesale"
)
_TIER2_SHOP_RE = "^(hardware|trade|doityourself|garden_centre|wholesale)$"


def _tier1_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""
[out:json][timeout:20];
(
  node["shop"~"{_AGRI_SHOP_RE}"](around:{radius_m},{lat},{lon});
  way["shop"~"{_AGRI_SHOP_RE}"](around:{radius_m},{lat},{lon});
  node["craft"="agricultural_engines"](around:{radius_m},{lat},{lon});
  way["craft"="agricultural_engines"](around:{radius_m},{lat},{lon});
  node["vending"~"^(fertilizer|seeds)$"](around:{radius_m},{lat},{lon});
);
out center tags 60;
"""


def _tier2_query(lat: float, lon: float, radius_m: int) -> str:
    # NOTE: no name-regex here — regex + tag filters make Overpass scan and
    # time out. We fetch hardware/trade shops (index-backed, fast) and filter
    # by name in Python instead.
    return f"""
[out:json][timeout:20];
(
  node["shop"~"{_TIER2_SHOP_RE}"](around:{radius_m},{lat},{lon});
  way["shop"~"{_TIER2_SHOP_RE}"](around:{radius_m},{lat},{lon});
);
out center tags 80;
"""


def _name_is_agri(name: str) -> bool:
    import re

    return bool(re.search(_NAME_KEYWORDS, name.lower()))


def _categorize(tags: dict[str, Any], name_lower: str = "") -> str | None:
    """OSM tags -> our vendor category. None = not agri-relevant."""
    shop = tags.get("shop", "")
    if shop in ("agriculture", "agrarian", "seeds", "farm"):
        return "seeds"
    if shop == "fertilizer":
        return "fertilizer"
    if shop == "agricultural_machinery" or tags.get("craft") == "agricultural_engines":
        return "equipment"
    if tags.get("vending") in ("fertilizer", "seeds"):
        return "seeds" if tags["vending"] == "seeds" else "fertilizer"
    # Tier 2 (name-keyword shops): categorize by dominant keyword
    if any(k in name_lower for k in ("seed", "beej")):
        return "seeds"
    if any(k in name_lower for k in ("fertiliz", "fertili", "khaad", "khad", "manure")):
        return "fertilizer"
    if any(k in name_lower for k in ("tractor", "harvester", "pump", "sprayer", "machin")):
        return "equipment"
    if any(k in name_lower for k in ("pesticide", "insecticide", "dawa")):
        return "pesticide"
    if any(k in name_lower for k in ("buyer", "procurement", "collection", "aggregator", "trader", "mandi", "market", "mills", "oil", "crushing", "ginning", "export")):
        return "produce_buyer"
    if any(k in name_lower for k in ("agri", "agro", "kisan", "krishi", "farm")):
        return "seeds"  # general agri-input shop
    return None


async def _run_query(client: httpx.AsyncClient, query: str) -> list[dict]:
    """POST to Overpass with mirror failover. Raises on total failure."""
    last_err: Exception | None = None
    for url in OVERPASS_URLS:
        try:
            resp = await client.post(url, data={"data": query}, headers=_UA)
            resp.raise_for_status()
            return resp.json().get("elements", [])
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Overpass failed on all mirrors: {last_err}")


def _parse(elements: list[dict], default_category: str | None = None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for el in elements:
        tags = el.get("tags", {}) or {}
        lat_c = float(el.get("lat") or (el.get("center") or {}).get("lat") or 0)
        lon_c = float(el.get("lon") or (el.get("center") or {}).get("lon") or 0)
        if not lat_c or not lon_c:
            continue
        name = tags.get("name")
        if not name:
            continue
        category = _categorize(tags, name.lower()) or default_category
        if not category:
            continue

        phone = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:mobile")
        out.append(
            {
                "id": f"osm-{el.get('type', 'node')}-{el.get('id')}",
                "name": name,
                "category": category,
                "description": tags.get("description")
                or tags.get("operator")
                or tags.get("brand")
                or "Agri shop on OpenStreetMap",
                "phone": phone,
                "address": tags.get("addr:street") or tags.get("addr:place"),
                "city": tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village"),
                "district": tags.get("addr:district"),
                "state": tags.get("addr:state"),
                "latitude": lat_c,
                "longitude": lon_c,
                "crops": [],
                "source": "osm",
            }
        )

    seen: set[tuple] = set()
    unique: list[dict[str, Any]] = []
    for v in out:
        key = (v["name"].lower(), round(v["latitude"], 4), round(v["longitude"], 4))
        if key not in seen:
            seen.add(key)
            unique.append(v)
    return unique


async def discover_vendors_osm(
    lat: float,
    lon: float,
    radius_m: int = 25000,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Agri shops near the pin. Two tiers, radius escalation, cached 24h."""
    cache_key = f"osm:v2:{round(lat, 2)}:{round(lon, 2)}:{radius_m}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    results: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            # Tier 1 at the requested radius
            try:
                results = _parse(await _run_query(client, _tier1_query(lat, lon, radius_m)))
            except RuntimeError as e:
                logger.warning("Overpass vendor discovery failed: %s", e)
                cache_set(cache_key, [], ttl_seconds=600)
                return []

            # Tier 2: hardware/trade shops with agri names (filtered locally)
            if not results:
                try:
                    elements = await _run_query(client, _tier2_query(lat, lon, radius_m))
                    agri_named = [
                        el for el in elements
                        if _name_is_agri((el.get("tags", {}) or {}).get("name", ""))
                    ]
                    results = _parse(agri_named)
                except RuntimeError as e:
                    logger.warning("Overpass tier-2 discovery failed: %s", e)

            # Radius escalation: nothing found nearby -> try one wider ring.
            # Capped at 45km: larger radii time out on free Overpass servers.
            if not results and radius_m < 45000:
                wider = await discover_vendors_osm(lat, lon, radius_m=45000, limit=limit)
                if wider:
                    cache_set(cache_key, wider, ttl_seconds=86400)
                    return wider
    except Exception as e:
        logger.warning("Vendor discovery error: %s", e)
        cache_set(cache_key, [], ttl_seconds=600)
        return []

    results = results[:limit]
    cache_set(cache_key, results, ttl_seconds=86400)
    return results
