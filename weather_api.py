"""
Fetch current weather via Open-Meteo (free tier, no API key).

Docs: https://open-meteo.com/en/docs
"""

from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request

import certifi


def _get_json(url: str, timeout_s: float):
    """
    Fetch JSON from URL.

    Uses certifi CA roots and bypasses system proxy vars so local/dev proxy
    settings do not break weather/geocoding requests.
    """
    req = urllib.request.Request(url, headers={"User-Agent": "allRunners/1.0"})
    ctx = ssl.create_default_context(cafile=certifi.where())
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=ctx),
    )
    with opener.open(req, timeout=timeout_s) as resp:
        return json.load(resp)


def _wmo_condition(code: int) -> str:
    """Short label for WMO Weather interpretation codes (subset)."""
    c = int(code)
    if c == 0:
        return "Clear"
    if c in (1, 2):
        return "Mostly clear"
    if c == 3:
        return "Overcast"
    if c in (45, 48):
        return "Fog"
    if c in (51, 53, 55):
        return "Drizzle"
    if c in (56, 57):
        return "Freezing drizzle"
    if c in (61, 63, 65):
        return "Rain"
    if c in (66, 67):
        return "Freezing rain"
    if c in (71, 73, 75):
        return "Snow"
    if c in (77,):
        return "Snow grains"
    if c in (80, 81, 82):
        return "Rain showers"
    if c in (85, 86):
        return "Snow showers"
    if c in (95,):
        return "Thunderstorm"
    if c in (96, 99):
        return "Thunderstorm · hail"
    return "Mixed conditions"


def fetch_current_weather(lat: float, lon: float, timeout_s: float = 12.0) -> dict[str, float | int | str]:
    params = urllib.parse.urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    payload = _get_json(url, timeout_s=timeout_s)
    cur = payload.get("current") or {}
    if not cur:
        raise ValueError("no current weather in response")
    code = int(cur.get("weather_code", 0))
    return {
        "temperature_f": round(float(cur.get("temperature_2m", 0))),
        "humidity": int(cur.get("relative_humidity_2m") or 0),
        "wind_mph": round(float(cur.get("wind_speed_10m") or 0)),
        "condition": _wmo_condition(code),
        "weather_code": code,
    }


def _label_from_open_meteo(result: dict, fallback: str) -> str:
    label = str(result.get("name") or fallback)
    admin = result.get("admin1")
    country = result.get("country_code")
    if admin:
        label = label + ", " + str(admin)
    if country:
        label = label + " (" + str(country) + ")"
    return label


def _geocode_open_meteo(query: str, timeout_s: float) -> tuple[float, float, str]:
    q = query.strip()
    params = urllib.parse.urlencode(
        {"name": q, "count": 3, "language": "en", "format": "json"}
    )
    url = f"https://geocoding-api.open-meteo.com/v1/search?{params}"
    payload = _get_json(url, timeout_s=timeout_s)
    results = payload.get("results") or []
    if not results:
        raise ValueError("open_meteo_not_found")
    r = results[0]
    lat = float(r["latitude"])
    lon = float(r["longitude"])
    label = _label_from_open_meteo(r, q)
    return lat, lon, label


def _geocode_nominatim(query: str, timeout_s: float) -> tuple[float, float, str]:
    # Fallback for ZIP/postcode and full address lookups.
    params = urllib.parse.urlencode({"q": query.strip(), "format": "jsonv2", "limit": 1})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    payload = _get_json(url, timeout_s=timeout_s)
    if not payload:
        raise ValueError("nominatim_not_found")
    top = payload[0]
    lat = float(top["lat"])
    lon = float(top["lon"])
    label = str(top.get("display_name") or query.strip())
    return lat, lon, label


def _geocode_photon(query: str, timeout_s: float) -> tuple[float, float, str]:
    params = urllib.parse.urlencode({"q": query.strip(), "limit": 1})
    url = f"https://photon.komoot.io/api/?{params}"
    payload = _get_json(url, timeout_s=timeout_s)
    features = payload.get("features") or []
    if not features:
        raise ValueError("photon_not_found")
    top = features[0]
    geom = top.get("geometry") or {}
    coords = geom.get("coordinates") or []
    if len(coords) < 2:
        raise ValueError("photon_invalid_geometry")
    lon = float(coords[0])
    lat = float(coords[1])
    props = top.get("properties") or {}
    parts = [
        props.get("name"),
        props.get("city"),
        props.get("state"),
        props.get("country"),
    ]
    label = ", ".join([str(p) for p in parts if p]) or query.strip()
    return lat, lon, label


def _looks_like_alphanumeric_postal(query: str) -> bool:
    q = query.strip()
    if "," in q:
        return False
    compact = q.replace(" ", "").replace("-", "")
    if not 3 <= len(compact) <= 10:
        return False
    if not any(ch.isdigit() for ch in compact):
        return False
    if not any(ch.isalpha() for ch in compact):
        return False
    return all(ch.isalnum() for ch in compact)


def _postal_query_variants(query: str) -> list[str]:
    q = query.strip()
    compact = q.replace(" ", "").replace("-", "")
    variants = []
    # Common Canadian format (A1A 1A1): try both spaced and compact forms.
    if (
        len(compact) == 6
        and compact[0].isalpha()
        and compact[1].isdigit()
        and compact[2].isalpha()
        and compact[3].isdigit()
        and compact[4].isalpha()
        and compact[5].isdigit()
    ):
        variants.append(compact[:3] + " " + compact[3:])
    variants.append(q)
    variants.append(compact)

    out = []
    for v in variants:
        if v and v not in out:
            out.append(v)
    return out


def geocode_place(query: str, timeout_s: float = 10.0) -> tuple[float, float, str]:
    """Resolve city/ZIP/address to coordinates; fallback when one provider fails."""
    q = query.strip()
    if len(q) < 2:
        raise ValueError("query too short")
    providers = []
    queries = [q]
    if _looks_like_alphanumeric_postal(q):
        # Alphanumeric postal codes (e.g., SW1A 1AA) work better with OSM-based geocoders.
        providers = [_geocode_nominatim, _geocode_photon, _geocode_open_meteo]
        queries = _postal_query_variants(q)
    else:
        # City names and numeric ZIP/postal codes generally resolve better here.
        providers = [_geocode_open_meteo, _geocode_nominatim, _geocode_photon]

    for candidate in queries:
        for provider in providers:
            try:
                return provider(candidate, timeout_s=timeout_s)
            except (ValueError, urllib.error.URLError):
                continue

    raise ValueError("place not found")


def fetch_weather_for_place(query: str) -> dict[str, float | int | str]:
    """Geocode a place name / ZIP, then return current weather plus a display label."""
    lat, lon, location_label = geocode_place(query)
    out = fetch_current_weather(lat, lon)
    out["location_label"] = location_label
    return out
