"""Shared CRINK infra category lists — keep extract / merge / clip in sync."""
from __future__ import annotations

DEFAULT_CATEGORIES = ("aeroway", "harbour", "border", "dam", "power", "checkpoint")
TRANSPORT_CATEGORIES = ("rail", "road")
ALL_CATEGORIES = DEFAULT_CATEGORIES + TRANSPORT_CATEGORIES

# Rail/road mesh is for CRINK Eurasian land corridors (strategicCorridors.ts).
# Western Hemisphere spokes (CUB|PRK sea incident etc.) are not part of that mesh.
TRANSPORT_SKIP_REGIONS = frozenset({"cuba", "venezuela"})

RAIL_TYPES = frozenset({"rail", "light_rail", "subway", "narrow_gauge"})
RAIL_SKIP_SERVICE = frozenset({"yard", "siding", "spur"})
ROAD_TYPES = frozenset(
    {
        "motorway",
        "trunk",
        "primary",
        "motorway_link",
        "trunk_link",
        "primary_link",
    }
)


def parse_categories(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return DEFAULT_CATEGORIES
    if raw.strip().lower() in ("all", "*"):
        return ALL_CATEGORIES
    out: list[str] = []
    for part in raw.split(","):
        cat = part.strip()
        if not cat:
            continue
        if cat not in ALL_CATEGORIES:
            raise ValueError(f"Unknown category: {cat} (valid: {', '.join(ALL_CATEGORIES)})")
        if cat not in out:
            out.append(cat)
    if not out:
        raise ValueError("No categories selected")
    return tuple(out)
