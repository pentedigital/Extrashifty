"""Server-side caching utilities for ExtraShifty."""

import threading
from typing import Any

from cachetools import TTLCache

# User lookup cache: avoids DB hit on every authenticated request
# Max 2048 users cached, 60-second TTL
_user_cache: TTLCache = TTLCache(maxsize=2048, ttl=60)
_user_cache_lock = threading.Lock()


def get_cached_user(user_id: int) -> Any | None:
    """Get a user from cache by ID."""
    with _user_cache_lock:
        return _user_cache.get(user_id)


def set_cached_user(user_id: int, user: Any) -> None:
    """Cache a user object."""
    with _user_cache_lock:
        _user_cache[user_id] = user


def invalidate_cached_user(user_id: int) -> None:
    """Remove a user from cache (call on password change, profile update, etc.)."""
    with _user_cache_lock:
        _user_cache.pop(user_id, None)


def clear_user_cache() -> None:
    """Clear entire user cache."""
    with _user_cache_lock:
        _user_cache.clear()


# Marketplace stats cache: avoids 3 aggregate queries per landing page view
# Single entry, 2-minute TTL
_marketplace_stats_cache: TTLCache = TTLCache(maxsize=1, ttl=120)
_marketplace_stats_lock = threading.Lock()


def get_cached_marketplace_stats() -> dict | None:
    """Get cached marketplace stats."""
    with _marketplace_stats_lock:
        return _marketplace_stats_cache.get("stats")


def set_cached_marketplace_stats(stats: dict) -> None:
    """Cache marketplace stats."""
    with _marketplace_stats_lock:
        _marketplace_stats_cache["stats"] = stats


# Refresh token JTI blacklist: enforces one-time use of refresh tokens.
# When a refresh token is used, its JTI is added here. If the same JTI
# appears again, it's a replay attack — all tokens for that user are revoked.
# TTL = 7 days (604800s), matching REFRESH_TOKEN_EXPIRE_DAYS in config.
_jti_blacklist: TTLCache = TTLCache(maxsize=10000, ttl=604800)
_jti_blacklist_lock = threading.Lock()


def is_jti_blacklisted(jti: str) -> bool:
    """Check if a refresh token JTI has been used (blacklisted)."""
    with _jti_blacklist_lock:
        return jti in _jti_blacklist


def blacklist_jti(jti: str) -> None:
    """Blacklist a refresh token JTI after use."""
    with _jti_blacklist_lock:
        _jti_blacklist[jti] = True


def clear_jti_blacklist() -> None:
    """Clear the JTI blacklist (for testing)."""
    with _jti_blacklist_lock:
        _jti_blacklist.clear()


# ---------------------------------------------------------------------------
# Generic response cache: reusable across endpoints for expensive queries.
# Three tiers with different TTLs for different data volatility levels.
# ---------------------------------------------------------------------------

_CACHE_TIERS: dict[str, TTLCache] = {
    "short": TTLCache(maxsize=200, ttl=30),    # 30s  - live/volatile data
    "medium": TTLCache(maxsize=500, ttl=120),   # 2min - moderately stable
    "long": TTLCache(maxsize=200, ttl=300),     # 5min - stable/slow-changing
}
_CACHE_LOCKS: dict[str, threading.Lock] = {
    k: threading.Lock() for k in _CACHE_TIERS
}


def get_cached(key: str, tier: str = "medium") -> Any | None:
    """Get a cached response by key and tier."""
    lock = _CACHE_LOCKS[tier]
    cache = _CACHE_TIERS[tier]
    with lock:
        return cache.get(key)


def set_cached(key: str, data: Any, tier: str = "medium") -> None:
    """Cache a response under key in the specified tier."""
    lock = _CACHE_LOCKS[tier]
    cache = _CACHE_TIERS[tier]
    with lock:
        cache[key] = data


def invalidate_cached(key: str, tier: str = "medium") -> None:
    """Remove a single key from a cache tier."""
    lock = _CACHE_LOCKS[tier]
    cache = _CACHE_TIERS[tier]
    with lock:
        cache.pop(key, None)


def invalidate_cache_prefix(prefix: str) -> None:
    """Remove all keys starting with prefix from ALL tiers."""
    for tier_name, cache in _CACHE_TIERS.items():
        lock = _CACHE_LOCKS[tier_name]
        with lock:
            keys_to_remove = [k for k in cache if isinstance(k, str) and k.startswith(prefix)]
            for k in keys_to_remove:
                cache.pop(k, None)
