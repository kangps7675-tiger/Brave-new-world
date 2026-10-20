"""
Telegram OSINT collector — run AFTER auth.py login.
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

sys.path.insert(0, str(Path(__file__).resolve().parent))

from telethon import events

from auth_common import create_client, ensure_authorized, load_dotenv_local, session_ready

ROOT = Path(__file__).resolve().parents[2]
LIVE_DIR = ROOT / "public" / "data" / "live"
LIVE_FILE = LIVE_DIR / "telegram-alerts.json"

TARGET_CHANNELS = [
    "kpszsu",
    "DeepStateUA",
    "osintdefender",
    "warfareanalysis",
]

REGION_BY_CHANNEL = {
    "kpszsu": "ukraine",
    "deepstateua": "ukraine",
    "osintdefender": "middle-east",
    "warfareanalysis": "middle-east",
}

MAX_ALERTS = 120
BACKFILL_PER_CHANNEL = 20


def persist_local(alert: dict) -> None:
    LIVE_DIR.mkdir(parents=True, exist_ok=True)
    alerts: list[dict] = []
    if LIVE_FILE.exists():
        try:
            payload = json.loads(LIVE_FILE.read_text(encoding="utf-8"))
            alerts = payload.get("alerts", [])
        except json.JSONDecodeError:
            alerts = []
    alerts = [alert, *[a for a in alerts if a.get("id") != alert["id"]]][:MAX_ALERTS]
    LIVE_FILE.write_text(
        json.dumps(
            {
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "live": True,
                "alerts": alerts,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def post_ingest(alert: dict) -> None:
    import os

    load_dotenv_local()
    secret = os.environ.get("TELEGRAM_INGEST_SECRET", "").strip()
    if not secret:
        return
    url = os.environ.get(
        "TELEGRAM_INGEST_URL", "http://127.0.0.1:3000/api/telegram-alerts/ingest"
    ).strip()
    body = json.dumps(alert).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=8) as resp:
            if resp.status >= 400:
                body = resp.read(300).decode("utf-8", errors="replace")
                print(f"WARN: ingest HTTP {resp.status} @ {url} — {body[:120]}")
    except error.URLError as exc:
        print(f"WARN: ingest failed @ {url} (dev 포트·URL 확인): {exc}")


def build_alert(message, username: str, title: str) -> dict | None:
    text = (message.message or "").strip()
    if not text:
        return None
    region = REGION_BY_CHANNEL.get(username.lower(), "global")
    msg_date = message.date
    if msg_date and msg_date.tzinfo is None:
        msg_date = msg_date.replace(tzinfo=timezone.utc)
    received_at = (msg_date or datetime.now(timezone.utc)).isoformat()
    return {
        "id": f"tg-{message.id}-{username}",
        "channelUsername": username,
        "channelTitle": title,
        "region": region,
        "text": text[:4000],
        "receivedAt": received_at,
        "messageUrl": f"https://t.me/{username}/{message.id}" if username else None,
    }


def publish_alert(alert: dict, *, quiet: bool = False) -> None:
    if not quiet:
        print(f"\n[ALERT] @{alert['channelUsername']} - {alert['channelTitle']}")
        print(f"MSG: {alert['text'][:280]}{'...' if len(alert['text']) > 280 else ''}")
    persist_local(alert)
    # 백필은 파일만 쓰고 GET이 파일을 읽음 — 동시 ingest 71건으로 dev 500 방지
    if not quiet:
        post_ingest(alert)


async def backfill_recent(client) -> int:
    total = 0
    print(f"[BACKFILL] Loading last {BACKFILL_PER_CHANNEL} messages per channel...")
    for channel in TARGET_CHANNELS:
        try:
            entity = await client.get_entity(channel)
            username = getattr(entity, "username", None) or channel
            title = getattr(entity, "title", None) or username
            messages = await client.get_messages(entity, limit=BACKFILL_PER_CHANNEL)
            for message in reversed(messages):
                alert = build_alert(message, username, title)
                if alert:
                    publish_alert(alert, quiet=True)
                    total += 1
            print(f"  - @{username}: {len(messages)} msgs")
        except Exception as exc:
            print(f"  - WARN @{channel}: {exc}")
    print(f"[BACKFILL] Done. {total} messages loaded.")
    return total


async def main() -> None:
    if not session_ready():
        print("")
        print("ERROR: Telegram not logged in yet.")
        print("Run this FIRST in your terminal:")
        print("  python scripts/telegram-osint/auth.py")
        print("")
        sys.exit(1)

    client = create_client()
    print("[OSINT] Telegram collector starting...")
    print(f"   Channels: {', '.join(TARGET_CHANNELS)}")

    @client.on(events.NewMessage(chats=TARGET_CHANNELS))
    async def handle_new_message(event: events.NewMessage.Event) -> None:
        chat = await event.get_chat()
        username = getattr(chat, "username", None) or ""
        title = getattr(chat, "title", None) or username or "unknown"
        alert = build_alert(event.message, username, title)
        if alert:
            publish_alert(alert)

    await ensure_authorized(client)
    await backfill_recent(client)
    print("[OK] Collector running. Waiting for new messages...")
    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
