"""One-time Telegram login. Run in your own terminal (interactive)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from auth_common import create_client, ensure_authorized


async def main() -> None:
    client = create_client()
    try:
        await ensure_authorized(client)
        print("\nNext step:")
        print("  python scripts/telegram-osint/collector.py")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
