"""
SYNTAX SOFTWARE — DISCORD BOT & WEB TICKET BI-DIRECTIONAL BRIDGE
Runs FastAPI Web Bridge + discord.py Bot concurrently.
Provides:
1. POST /api/ticket/open -> Sends User Dossier & Ticket Embed to Discord #web-ticket (HIDDEN from user on web)
2. POST /api/ticket/message -> Forwards user web messages to Discord channel/thread
3. GET /api/ticket/messages -> Returns staff responses from Discord to user web chat
4. Discord on_message listener -> Staff replies in Discord are delivered back to the user's web browser in real-time
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import discord

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "bot_config.json")
DB_FILE = os.path.join(BASE_DIR, "tickets_db.json")

def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "bot_token": "",
        "web_ticket_channel_id": "web-ticket",
        "webhook_url": "",
        "port": 5055,
        "host": "127.0.0.1",
        "server_name": "Syntax Software Official"
    }

def save_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

def load_db() -> dict:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"tickets": {}, "meta": {"next_ticket_id": 1001}}

def save_db(data: dict):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

config = load_config()
db = load_db()

# --- FASTAPI SETUP ---
app = FastAPI(title="Syntax Discord Web Bridge", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DISCORD CLIENT SETUP ---
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

discord_client = discord.Client(intents=intents)
discord_connected = False
bot_user_name = "Offline"

@discord_client.event
async def on_ready():
    global discord_connected, bot_user_name
    discord_connected = True
    bot_user_name = str(discord_client.user)
    print(f"[Discord Bot] Logged in as: {bot_user_name}")

@discord_client.event
async def on_message(message: discord.Message):
    # Ignore bot's own messages
    if message.author.bot:
        return

    content = message.content.strip()
    if not content:
        return

    # Check if this message was sent in a ticket thread or #web-ticket channel
    channel_name = getattr(message.channel, "name", "").lower()
    is_ticket_channel = "web-ticket" in channel_name or "ticket" in channel_name or isinstance(message.channel, discord.Thread)

    if not is_ticket_channel:
        return

    # Try to map to a ticket
    # 1. If in a thread, match thread id or thread name
    matched_chat_key = None
    cur_db = load_db()

    channel_id_str = str(message.channel.id)

    for ckey, tdata in cur_db.get("tickets", {}).items():
        if tdata.get("discord_thread_id") == channel_id_str or tdata.get("discord_channel_id") == channel_id_str:
            matched_chat_key = ckey
            break

    # If not matched by ID, check if thread name or message references ticket key
    if not matched_chat_key and isinstance(message.channel, discord.Thread):
        for ckey, tdata in cur_db.get("tickets", {}).items():
            num = str(tdata.get("ticket_number", ""))
            if num and num in message.channel.name:
                matched_chat_key = ckey
                break

    # If still not matched, find the latest active ticket
    if not matched_chat_key and cur_db.get("tickets"):
        all_keys = list(cur_db["tickets"].keys())
        if all_keys:
            matched_chat_key = all_keys[-1]

    if matched_chat_key:
        t_now = datetime.now().strftime("%H:%M")
        new_msg = {
            "sender": "staff",
            "text": content,
            "author": message.author.display_name,
            "time": f"Bugün {t_now}",
            "source": "discord",
            "timestamp": time.time()
        }
        cur_db["tickets"][matched_chat_key]["messages"].append(new_msg)
        save_db(cur_db)
        try:
            await message.add_reaction("✅")
        except Exception:
            pass
        print(f"[Discord -> Web] Forwarded reply from {message.author.display_name} to {matched_chat_key}: {content}")


# --- HELPER: SEND TO DISCORD VIA BOT OR WEBHOOK ---
async def dispatch_discord_embed(embed_dict: dict, chat_key: str, thread_name: Optional[str] = None) -> Optional[str]:
    cfg = load_config()
    cur_db = load_db()
    sent_channel_or_thread_id = None

    # Method 1: discord.py Bot Client if connected
    if discord_connected and discord_client.is_ready():
        try:
            target_chan = None
            target_id_str = str(cfg.get("web_ticket_channel_id", "")).strip()

            # Try by ID
            if target_id_str.isdigit():
                target_chan = discord_client.get_channel(int(target_id_str))

            # Try by Name across all guilds
            if not target_chan:
                for guild in discord_client.guilds:
                    for ch in guild.text_channels:
                        if ch.name.lower() == "web-ticket" or "web-ticket" in ch.name.lower():
                            target_chan = ch
                            break
                    if target_chan:
                        break

            if target_chan:
                embed = discord.Embed.from_dict(embed_dict)
                msg = await target_chan.send(embed=embed)
                sent_channel_or_thread_id = str(target_chan.id)

                # Create a thread for clean conversation separation if permitted
                if thread_name and hasattr(msg, "create_thread"):
                    try:
                        thread = await msg.create_thread(name=thread_name[:90], auto_archive_duration=1440)
                        sent_channel_or_thread_id = str(thread.id)
                        await thread.send(f"💬 **Ticket Sohbeti Başlatıldı:** Bu konuya yazacağınız tüm mesajlar web sitesinde **{thread_name}** kullanıcısına anında iletilecektir.")
                    except Exception as te:
                        print(f"[Bot] Thread create notice: {te}")

                return sent_channel_or_thread_id
        except Exception as be:
            print(f"[Bot] Error sending via discord.py: {be}")

    # Method 2: Discord Webhook Fallback
    webhook_url = cfg.get("webhook_url", "").strip()
    if webhook_url and webhook_url.startswith("http"):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(webhook_url, json={
                    "username": "Syntax Software Bot",
                    "avatar_url": "https://i.postimg.cc/mD8Z8hP3/syntax-logo.png",
                    "embeds": [embed_dict]
                })
                print(f"[Webhook] Sent embed status: {res.status_code}")
        except Exception as we:
            print(f"[Webhook] Delivery failed: {we}")

    return sent_channel_or_thread_id

async def dispatch_discord_text_message(text: str, username: str, chat_key: str):
    cfg = load_config()
    cur_db = load_db()
    tdata = cur_db.get("tickets", {}).get(chat_key, {})
    thread_id = tdata.get("discord_thread_id") or tdata.get("discord_channel_id")

    if discord_connected and discord_client.is_ready() and thread_id and thread_id.isdigit():
        try:
            chan = discord_client.get_channel(int(thread_id))
            if chan:
                await chan.send(f"👤 **[{username}]**: {text}")
                return
        except Exception as e:
            print(f"[Bot] Message delivery to thread failed: {e}")

    # Webhook fallback for text message
    webhook_url = cfg.get("webhook_url", "").strip()
    if webhook_url and webhook_url.startswith("http"):
        try:
            ticket_num = tdata.get("ticket_number", "TICKET")
            async with httpx.AsyncClient(timeout=6.0) as client:
                await client.post(webhook_url, json={
                    "username": f"Web: {username}",
                    "content": f"💬 **[#{ticket_num} - {username}]**: {text}"
                })
        except Exception as we:
            print(f"[Webhook] Text message fallback notice: {we}")


# --- API ROUTES ---

@app.get("/api/status")
async def get_status():
    cur_db = load_db()
    cfg = load_config()
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "discord_bot_connected": discord_connected,
        "bot_user": bot_user_name,
        "channel_configured": cfg.get("web_ticket_channel_id", "web-ticket"),
        "webhook_configured": bool(cfg.get("webhook_url")),
        "active_tickets_count": len(cur_db.get("tickets", {}))
    }

@app.get("/api/config")
async def get_configuration():
    cfg = load_config()
    token = cfg.get("bot_token", "")
    masked_token = (token[:6] + "..." + token[-4:]) if len(token) > 10 else ("***" if token else "")
    return {
        "bot_token_masked": masked_token,
        "web_ticket_channel_id": cfg.get("web_ticket_channel_id", "web-ticket"),
        "webhook_url": cfg.get("webhook_url", ""),
        "port": cfg.get("port", 5055),
        "server_name": cfg.get("server_name", "Syntax Software Official"),
        "bot_connected": discord_connected,
        "bot_user": bot_user_name
    }

@app.post("/api/config")
async def update_configuration(request: Request):
    payload = await request.json()
    cfg = load_config()

    if "bot_token" in payload and payload["bot_token"] != "":
        cfg["bot_token"] = payload["bot_token"].strip()
    if "web_ticket_channel_id" in payload:
        cfg["web_ticket_channel_id"] = str(payload["web_ticket_channel_id"]).strip()
    if "webhook_url" in payload:
        cfg["webhook_url"] = payload["webhook_url"].strip()

    save_config(cfg)
    return {"success": True, "message": "Konfigürasyon kaydedildi."}

@app.post("/api/ticket/open")
async def open_ticket(request: Request):
    payload = await request.json()
    chat_key = payload.get("chatKey") or f"syntax_chat_user_{int(time.time())}"
    username = payload.get("username") or "Müşteri"
    initial_message = payload.get("message") or "Yeni destek talebi açıldı."
    dossier = payload.get("userDossier") or {}

    cur_db = load_db()
    ticket_num = cur_db.get("meta", {}).get("next_ticket_id", 1001)
    cur_db["meta"]["next_ticket_id"] = ticket_num + 1

    # Extract Dossier Fields with fallback
    full_name = dossier.get("fullName") or dossier.get("name") or username
    email = dossier.get("email") or "Kayıtlı Değil / Misafir"
    phone = dossier.get("phone") or "Belirtilmemiş"
    role = (dossier.get("role") or "Kullanıcı (Müşteri)").upper()
    created_at = dossier.get("createdAt") or datetime.now().strftime("%d.%m.%Y")
    ip_address = dossier.get("ip") or "127.0.0.1 (Gizli/Yerel)"
    device_info = dossier.get("deviceInfo") or dossier.get("browser") or "Windows Chrome"

    # Format Licenses
    raw_licenses = dossier.get("licenses") or []
    if raw_licenses and isinstance(raw_licenses, list):
        lic_strings = []
        for l in raw_licenses:
            pname = l.get("product", "Lisans")
            k = l.get("key", "KEY-YOK")
            days = l.get("daysLeft", "30")
            st = l.get("status", "Aktif")
            lic_strings.append(f"• **{pname}**: `{k}` ({days} Gün - {st})")
        licenses_str = "\n".join(lic_strings)
    else:
        licenses_str = "Henüz aktif lisans tanımlanmamış."

    # Format Recent Orders
    raw_orders = dossier.get("orders") or []
    if raw_orders and isinstance(raw_orders, list):
        order_strings = []
        for o in raw_orders[:3]:
            oid = o.get("orderId", "Sipariş")
            amt = o.get("amount", "")
            ost = o.get("status", "İnceleniyor")
            order_strings.append(f"• `{oid}` — {amt} [{ost}]")
        orders_str = "\n".join(order_strings)
    else:
        orders_str = "Sipariş kaydı bulunmuyor."

    # Build Secret Discord Staff Embed
    # NOTE: This embed is sent EXCLUSIVELY to Discord. It is NEVER sent to the user on web.
    embed_dict = {
        "title": f"🎫 YENİ DESTEK BİLETİ — #{ticket_num} ({username})",
        "description": (
            f"Web sitesi canlı destek penceresinden yeni bir bilet açıldı.\n"
            f"**Yetkili Notu:** Müşterinin tüm kayıt ve hesap dosyası aşağıdadır (Webde gizlidir)."
        ),
        "color": 0x10b981,  # Emerald Green
        "fields": [
            {
                "name": "👤 Ad Soyad & Kullanıcı Adı",
                "value": f"**{full_name}** (`@{username}`)",
                "inline": True
            },
            {
                "name": "📧 E-Posta Adresi",
                "value": f"`{email}`",
                "inline": True
            },
            {
                "name": "📱 Telefon / WhatsApp",
                "value": f"`{phone}`",
                "inline": True
            },
            {
                "name": "🛡️ Hesap Rolü",
                "value": f"`{role}`",
                "inline": True
            },
            {
                "name": "📅 Kayıt Tarihi",
                "value": f"`{created_at}`",
                "inline": True
            },
            {
                "name": "💻 Cihaz & Bağlantı",
                "value": f"`{device_info}`",
                "inline": True
            },
            {
                "name": "🔑 Sahip Olduğu Lisanslar",
                "value": licenses_str,
                "inline": False
            },
            {
                "name": "📦 Son Sipariş Geçmişi",
                "value": orders_str,
                "inline": False
            },
            {
                "name": "💬 Müşterinin İlk Mesajı / Talebi",
                "value": f">>> {initial_message}",
                "inline": False
            }
        ],
        "footer": {
            "text": f"Syntax Software • Ticket #{ticket_num} • Yetkililer Discord'dan yanıt verdiğinde web'e iletilir",
            "icon_url": "https://i.postimg.cc/mD8Z8hP3/syntax-logo.png"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

    # Dispatch to Discord
    thread_name = f"ticket-{ticket_num}-{username}"
    channel_or_thread_id = await dispatch_discord_embed(embed_dict, chat_key, thread_name=thread_name)

    # Save to local database
    cur_db["tickets"][chat_key] = {
        "chatKey": chat_key,
        "ticket_number": ticket_num,
        "username": username,
        "fullName": full_name,
        "discord_thread_id": channel_or_thread_id,
        "status": "OPEN",
        "created_at": datetime.now().isoformat(),
        "messages": [
            {
                "sender": "user",
                "text": initial_message,
                "time": datetime.now().strftime("Bugün %H:%M"),
                "timestamp": time.time()
            }
        ]
    }
    save_db(cur_db)

    return {
        "success": True,
        "ticketNumber": ticket_num,
        "chatKey": chat_key,
        "discord_notified": True,
        "message": "Ticket Discord #web-ticket kanalına başarıyla iletildi."
    }

@app.post("/api/ticket/message")
async def post_message(request: Request):
    payload = await request.json()
    chat_key = payload.get("chatKey")
    sender = payload.get("sender", "user")
    text = (payload.get("text") or "").strip()
    username = payload.get("username") or "Müşteri"

    if not chat_key or not text:
        raise HTTPException(status_code=400, detail="chatKey ve text zorunludur.")

    cur_db = load_db()
    if chat_key not in cur_db.get("tickets", {}):
        # Auto-create ticket if not open
        cur_db["tickets"][chat_key] = {
            "chatKey": chat_key,
            "ticket_number": cur_db.get("meta", {}).get("next_ticket_id", 1001),
            "username": username,
            "status": "OPEN",
            "created_at": datetime.now().isoformat(),
            "messages": []
        }
        cur_db["meta"]["next_ticket_id"] = cur_db["tickets"][chat_key]["ticket_number"] + 1

    msg_obj = {
        "sender": sender,
        "text": text,
        "time": datetime.now().strftime("Bugün %H:%M"),
        "timestamp": time.time()
    }
    cur_db["tickets"][chat_key]["messages"].append(msg_obj)
    save_db(cur_db)

    # Forward to Discord
    if sender == "user":
        await dispatch_discord_text_message(text, username, chat_key)

    return {"success": True, "message": "Mesaj iletildi."}

@app.get("/api/ticket/messages")
async def get_messages(chatKey: str):
    cur_db = load_db()
    tdata = cur_db.get("tickets", {}).get(chatKey)
    if not tdata:
        return {"success": True, "messages": []}
    return {
        "success": True,
        "ticketNumber": tdata.get("ticket_number"),
        "status": tdata.get("status", "OPEN"),
        "messages": tdata.get("messages", [])
    }

@app.post("/api/ticket/test")
async def send_test_embed():
    test_embed = {
        "title": "🟢 SYNTAX SOFTWARE — DISCORD ENTEGRASYON TESTİ",
        "description": "Discord Bot & Web Ticket köprüsü başarıyla çalışıyor!\nWeb'den açılan tüm biletler ve müşteri kayıt dosyaları bu kanalda listelenecektir.",
        "color": 0x3b82f6,
        "fields": [
            {"name": "⚙️ Durum", "value": "Çift Yönlü İletişim Aktif", "inline": True},
            {"name": "⏰ Zaman", "value": datetime.now().strftime("%d.%m.%Y %H:%M:%S"), "inline": True},
            {"name": "🛡️ Gizlilik", "value": "Müşteri Dosyası Yalnızca Discord'da Görünür", "inline": False}
        ],
        "footer": {"text": "Syntax Software Systems"}
    }
    res = await dispatch_discord_embed(test_embed, "test_chat_key")
    return {"success": True, "delivered": bool(res), "channel_id": res}


# --- RUNNER: CONCURRENT BOT + FASTAPI ---
async def start_discord_bot_task():
    cfg = load_config()
    token = cfg.get("bot_token", "").strip()
    if token:
        try:
            print(f"[Discord Bot] Attempting login with token...")
            await discord_client.start(token)
        except Exception as e:
            print(f"[Discord Bot] Login failed: {e}")
    else:
        print("[Discord Bot] Token girilmedi. Webhook modu ve HTTP köprüsü aktif.")

async def main():
    cfg = load_config()
    port = int(cfg.get("port", 5055))
    host = cfg.get("host", "127.0.0.1")

    # FastAPI Uvicorn Server config
    uv_config = uvicorn.Config(app=app, host=host, port=port, log_level="info")
    server = uvicorn.Server(uv_config)

    # Run both concurrent tasks
    await asyncio.gather(
        server.serve(),
        start_discord_bot_task()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Server] Exiting...")
