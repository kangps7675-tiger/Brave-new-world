from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import PhoneNumberInvalidError, SessionPasswordNeededError

ROOT = Path(__file__).resolve().parents[2]
SESSION_FILE = ROOT / "scripts" / "telegram-osint" / ".session" / "osint_command_center"


def load_dotenv_local() -> None:
    """Load ROOT/.env then ROOT/.env.local (local overrides)."""
    for name in (".env", ".env.local"):
        env_path = ROOT / name
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if name.endswith(".env.local"):
                os.environ[key] = value
            else:
                os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"ERROR: missing env var {name} (.env.local)")
        sys.exit(1)
    return value


def session_ready() -> bool:
    return SESSION_FILE.with_suffix(".session").exists()


def create_client() -> TelegramClient:
    load_dotenv_local()
    api_id = int(require_env("TELEGRAM_API_ID"))
    api_hash = require_env("TELEGRAM_API_HASH")
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    return TelegramClient(str(SESSION_FILE), api_id, api_hash)


def normalize_phone(raw: str) -> str:
    """010-1234-5678 / 8210... / +82 10-... -> +821012345678"""
    s = re.sub(r"[\s\-().]", "", raw.strip())
    if not s:
        return s

    if s.startswith("00"):
        s = "+" + s[2:]
    elif s.startswith("+"):
        pass
    elif s.startswith("010") and len(s) == 11:
        # Korea mobile: drop leading 0
        s = "+82" + s[1:]
    elif s.startswith("01") and len(s) == 11:
        s = "+82" + s[1:]
    elif s.startswith("82") and len(s) >= 11:
        s = "+" + s
    elif s.isdigit():
        if s.startswith("10") and len(s) == 10:
            s = "+82" + s
        else:
            s = "+" + s

    return s


def validate_phone(phone: str) -> bool:
    return bool(re.fullmatch(r"\+\d{8,15}", phone))


async def ensure_authorized(client: TelegramClient) -> None:
    await client.connect()
    if await client.is_user_authorized():
        me = await client.get_me()
        name = getattr(me, "first_name", None) or getattr(me, "username", None) or "user"
        print(f"[OK] Telegram login: {name}")
        return

    print("")
    print("=" * 56)
    print("  TELEGRAM LOGIN (terminal only — not in web UI)")
    print("=" * 56)
    print("1) Phone format examples:")
    print("     Korea 010-1234-5678  ->  +821012345678")
    print("     (drop the first 0, add +82)")
    print("2) Open Telegram app on your phone")
    print("3) Check chat named 'Telegram' (official) for login code")
    print("   -> Code often does NOT arrive by SMS")
    print("4) Paste the code here in this terminal window")
    print("=" * 56)
    print("")

    phone_raw = os.environ.get("TELEGRAM_PHONE", "").strip()
    if not phone_raw:
        phone_raw = input("Phone number: ").strip()
    if not phone_raw:
        print("ERROR: phone number required")
        sys.exit(1)

    phone = normalize_phone(phone_raw)
    if not validate_phone(phone):
        print("")
        print("ERROR: invalid phone format.")
        print(f"  You entered: {phone_raw!r}")
        print(f"  Normalized:  {phone!r}")
        print("")
        print("Korea example:")
        print("  010-1234-5678  ->  +821012345678")
        print("Must start with + and country code (no spaces).")
        sys.exit(1)

    print(f"\nUsing phone: {phone}")

    try:
        sent = await client.send_code_request(phone)
    except PhoneNumberInvalidError:
        print("")
        print("ERROR: Telegram rejected this phone number.")
        print(f"  Sent as: {phone}")
        print("")
        print("Check:")
        print("  - Registered on Telegram with this exact number?")
        print("  - Korea: 010-xxxx-xxxx -> +8210xxxxxxxx (one 0 removed)")
        print("  - No spaces, dashes, or quotes")
        sys.exit(1)
    print(f"\nCode sent (type: {sent.type}). Check Telegram app > 'Telegram' chat.\n")

    code = input("Login code from Telegram app: ").strip()
    if not code:
        print("ERROR: code required")
        sys.exit(1)

    try:
        await client.sign_in(phone=phone, code=code)
    except SessionPasswordNeededError:
        password = input("2FA password: ").strip()
        await client.sign_in(password=password)

    me = await client.get_me()
    name = getattr(me, "first_name", None) or getattr(me, "username", None) or "user"
    print(f"\n[OK] Login success: {name}")
    print(f"Session saved: {SESSION_FILE.with_suffix('.session')}")
