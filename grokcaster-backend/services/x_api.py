import os
from typing import Dict, Any
import httpx

X_API_BEARER_TOKEN = os.getenv("X_API_BEARER_TOKEN")
X_API_BASE = "https://api.x.com/2"

async def _fetch(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if not X_API_BEARER_TOKEN:
        return {}
    headers = {"Authorization": f"Bearer {X_API_BEARER_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers, params=params)
    if resp.status_code != 200:
        return {}
    return resp.json()

async def fetch_user_likes(user_id: str, max_results: int = 20) -> Dict[str, Any]:
    if not user_id:
        return {}
    url = f"{X_API_BASE}/users/{user_id}/liked_tweets"
    params = {"max_results": max_results, "tweet.fields": "text"}
    return await _fetch(url, params)

async def fetch_user_timeline(user_id: str, max_results: int = 20) -> Dict[str, Any]:
    if not user_id:
        return {}
    url = f"{X_API_BASE}/users/{user_id}/tweets"
    params = {"max_results": max_results, "tweet.fields": "text"}
    return await _fetch(url, params)

async def fetch_user_profile(user_id: str) -> Dict[str, Any]:
    if not user_id:
        return {}
    url = f"{X_API_BASE}/users/{user_id}"
    params = {"user.fields": "description,name,username"}
    return await _fetch(url, params)

async def fetch_user_signals(user_id: str) -> Dict[str, Any]:
    """Collect basic signals for interests. Gracefully degrades if no keys/user."""
    likes = await fetch_user_likes(user_id)
    posts = await fetch_user_timeline(user_id)
    profile = await fetch_user_profile(user_id)
    return {
        "likes": likes.get("data", []) if isinstance(likes, dict) else [],
        "posts": posts.get("data", []) if isinstance(posts, dict) else [],
        "profile": profile.get("data", {}) if isinstance(profile, dict) else {},
    }
