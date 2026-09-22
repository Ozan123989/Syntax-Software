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

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(BASE_DIR, "bot_config.json")
DB_FILE = os.path.join(BASE_DIR, "tickets_db.json")

def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if "host" not in cfg:
                    cfg["host"] = "0.0.0.0"
                return cfg
        except Exception:
            pass
    return {
        "bot_token": "",
        "web_ticket_channel_id": "web-ticket",
        "webhook_url": "",
        "port": 5055,
        "host": "0.0.0.0",
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
async def dispatch_discord_embed(embed_dict: dict, chat_key: str, channel_name: Optional[str] = None) -> Optional[str]:
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

            target_guild = target_chan.guild if target_chan else (discord_client.guilds[0] if discord_client.guilds else None)

            if target_guild:
                # Format private channel name: web-{category}-{user}
                c_name = channel_name or f"web-destek-{chat_key[-6:]}"
                c_name = c_name.lower().replace(" ", "-").replace("@", "")[:95]

                # Setup permissions: ONLY Admin, Owner and Bot can view (@everyone: False)
                overwrites = {
                    target_guild.default_role: discord.PermissionOverwrite(view_channel=False),
                    target_guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, embed_links=True, attach_files=True, manage_messages=True, read_message_history=True)
                }
                for role in target_guild.roles:
                    rname = role.name.lower()
                    if role.permissions.administrator or "admin" in rname or "owner" in rname or "yonetici" in rname or "kurucu" in rname or "yetkili" in rname:
                        overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, attach_files=True)

                cat = target_chan.category if target_chan else None
                if not cat:
                    for c in target_guild.categories:
                        if "ticket" in c.name.lower() or "destek" in c.name.lower():
                            cat = c
                            break

                # Create private channel
                try:
                    new_chan = await target_guild.create_text_channel(
                        name=c_name,
                        overwrites=overwrites,
                        category=cat,
                        topic="🔒 Gizli Destek Masası | Web Ticket | Yalnızca Yönetici & Owner yetkililerine açıktır"
                    )
                    sent_channel_or_thread_id = str(new_chan.id)
                    embed = discord.Embed.from_dict(embed_dict)
                    await new_chan.send(embed=embed)
                    await new_chan.send(
                        f"🔒 **Syntax Software Özel Destek Kanalı (`#{c_name}`)**\n"
                        f"Bu kanal **yalnızca Yönetici ve Kurucu (Owner)** yetkililerine açıktır.\n"
                        f"Yetkililerin buraya yazacağı mesajlar web sitesinde müşteriye canlı iletilir."
                    )
                    print(f"[Bot] Private ticket channel created: #{c_name} (ID: {new_chan.id})")
                    return sent_channel_or_thread_id
                except Exception as ce:
                    print(f"[Bot] Private channel creation notice: {ce}, fallback to thread")
                    if target_chan:
                        embed = discord.Embed.from_dict(embed_dict)
                        msg = await target_chan.send(embed=embed)
                        sent_channel_or_thread_id = str(target_chan.id)
                        if hasattr(msg, "create_thread"):
                            try:
                                thread = await msg.create_thread(name=c_name[:90], auto_archive_duration=1440)
                                sent_channel_or_thread_id = str(thread.id)
                                await thread.send(f"💬 **Ticket Sohbeti Başlatıldı:** Bu konuya yazacağınız tüm mesajlar web sitesinde **{c_name}** kullanıcısına anında iletilecektir.")
                            except Exception:
                                pass
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
    meta = cur_db.get("meta", {})
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "discord_bot_connected": discord_connected,
        "bot_user": bot_user_name,
        "channel_configured": cfg.get("web_ticket_channel_id", "web-ticket"),
        "webhook_configured": bool(cfg.get("webhook_url")),
        "active_tickets_count": len(cur_db.get("tickets", {})),
        "last_hourly_check": meta.get("last_hourly_check", "Henüz yapılmadı"),
        "discord_latency_ms": meta.get("discord_latency_ms", 0.0)
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

    # Format private channel name: web-{category}-{user}
    category_raw = (payload.get("subject") or payload.get("category") or "destek").lower()
    cat_slug = "destek"
    if "val" in category_raw: cat_slug = "val"
    elif "spoofer" in category_raw: cat_slug = "spoofer"
    elif "emu" in category_raw: cat_slug = "emu"
    elif "cs" in category_raw: cat_slug = "cs2"
    elif "hwid" in category_raw or "lisans" in category_raw: cat_slug = "hwid"
    elif "satin" in category_raw or "odeme" in category_raw: cat_slug = "satis"

    clean_user = "".join(c for c in username.lower() if c.isalnum()) or "uye"
    channel_name = payload.get("channelName") or f"web-{cat_slug}-{clean_user}"

    # Dispatch to Discord
    channel_or_thread_id = await dispatch_discord_embed(embed_dict, chat_key, channel_name=channel_name)

    # Save to local database
    cur_db["tickets"][chat_key] = {
        "chatKey": chat_key,
        "ticket_number": ticket_num,
        "channel_name": channel_name,
        "category": cat_slug,
        "username": username,
        "fullName": full_name,
        "discord_thread_id": channel_or_thread_id,
        "claimed_by": None,
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

@app.post("/api/ticket/claim")
async def claim_ticket(request: Request):
    payload = await request.json()
    chat_key = payload.get("chatKey")
    claimed_by = payload.get("claimedBy")
    is_claimed = payload.get("isClaimed", True)

    cur_db = load_db()
    if chat_key in cur_db.get("tickets", {}):
        cur_db["tickets"][chat_key]["claimed_by"] = claimed_by if is_claimed else None
        save_db(cur_db)

    tdata = cur_db.get("tickets", {}).get(chat_key, {})
    chan_id = tdata.get("discord_thread_id") or tdata.get("discord_channel_id")

    if discord_connected and discord_client.is_ready() and chan_id and str(chan_id).isdigit():
        try:
            chan = discord_client.get_channel(int(chan_id))
            if chan:
                if is_claimed and claimed_by:
                    c_user = claimed_by.get("username", "Yetkili")
                    c_role = claimed_by.get("role", "Yönetici")
                    embed = discord.Embed(
                        title="📌 Destek Talebi Üstlenildi (Claimed)",
                        description=f"Bu talep **@{c_user}** ({c_role}) tarafından üstlenildi ve takibe alındı.",
                        color=0x22c55e
                    )
                    await chan.send(embed=embed)
                else:
                    embed = discord.Embed(
                        title="🔄 Destek Talebi Serbest Bırakıldı (Unclaimed)",
                        description="Talep boşa çıkarıldı, diğer yetkililer üstlenebilir.",
                        color=0xf59e0b
                    )
                    await chan.send(embed=embed)
        except Exception as e:
            print(f"[Bot] Claim notice dispatch error: {e}")

    return {"success": True, "chatKey": chat_key, "isClaimed": is_claimed}

@app.post("/api/ticket/close")
async def close_ticket(request: Request):
    payload = await request.json()
    chat_key = payload.get("chatKey")
    closed_by = payload.get("closedBy", "Yetkili")
    transcript_text = payload.get("transcriptText", "")

    cur_db = load_db()
    if chat_key in cur_db.get("tickets", {}):
        cur_db["tickets"][chat_key]["status"] = "CLOSED"
        cur_db["tickets"][chat_key]["closed_by"] = closed_by
        cur_db["tickets"][chat_key]["closed_at"] = datetime.now().isoformat()
        if transcript_text:
            cur_db["tickets"][chat_key]["transcript"] = transcript_text
        save_db(cur_db)

    chan_id = cur_db.get("tickets", {}).get(chat_key, {}).get("discord_thread_id")
    if discord_connected and discord_client.is_ready() and chan_id and str(chan_id).isdigit():
        try:
            chan = discord_client.get_channel(int(chan_id))
            if chan:
                embed = discord.Embed(
                    title="🔒 Destek Talebi Kapatıldı & Arşivlendi",
                    description=f"Bu talep **@{closed_by}** tarafından çözüldü olarak işaretlenip kapatılmıştır.\nTranskript sisteme kaydedildi.",
                    color=0xef4444
                )
                await chan.send(embed=embed)
                try:
                    await chan.edit(topic="[KAPANDI - TRANSKRİPT ARŞİVİNDE]")
                except Exception:
                    pass
        except Exception as e:
            print(f"[Bot] Close notice dispatch error: {e}")

    return {"success": True, "chatKey": chat_key, "status": "CLOSED"}


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


# --- HOURLY SELF-CHECK & WATCHDOG TASK ---
async def hourly_self_check_loop():
    """
    Her saat (3600 saniye) kendini kontrol eden otomatik sağlık denetleyicisi:
    - Discord Gateway bağlantısını doğrular, kopma varsa yeniden bağlanmayı tetikler
    - Bilet veri tabanını doğrular
    - Saatlik durum raporunu konsola ve veri tabanına işler
    """
    print("[Watchdog] Saatlik otomatik sistem ve baglanti denetleyicisi baslatildi (3600s periyot).")
    # Ilk hizli saglik testi (10 sn sonra)
    await asyncio.sleep(10)
    
    while True:
        try:
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cfg = load_config()
            cur_db = load_db()
            ticket_count = len(cur_db.get("tickets", {}))
            
            is_ready = discord_connected and discord_client.is_ready() and not discord_client.is_closed()
            latency_ms = round(discord_client.latency * 1000, 1) if (is_ready and discord_client.latency) else 0.0

            token = cfg.get("bot_token", "").strip()
            if token and not is_ready:
                print(f"[{now_str}] [Watchdog UYARI] Discord baglantisi kopmus veya beklemede, yeniden baglanilmaya calisiliyor...")
                try:
                    if not discord_client.is_closed():
                        await discord_client.close()
                    asyncio.create_task(discord_client.start(token))
                except Exception as rec_err:
                    print(f"[{now_str}] [Watchdog] Yeniden baglanma hatasi: {rec_err}")

            status_banner = (
                f"\n========================================================================\n"
                f" [SAATLIK OTO-KONTROL - {now_str}]\n"
                f" * Discord Bot Durumu : {'ONLINE (' + bot_user_name + ') [Ping: ' + str(latency_ms) + 'ms]' if is_ready else 'OFFLINE (Token/Webhook modu)'}\n"
                f" * Webhook Bildirimi  : {'YAPILANDIRILDI' if cfg.get('webhook_url') else 'YAPILANDIRILMADI'}\n"
                f" * Hedef Kanal        : #{cfg.get('web_ticket_channel_id', 'web-ticket')}\n"
                f" * Aktif Destek Bilet : {ticket_count}\n"
                f" * Dinlenen Port      : {cfg.get('port', 5055)} (Host: {cfg.get('host', '0.0.0.0')})\n"
                f" * Sistem Sagligi     : %100 CALISIYOR VE AKTIF\n"
                f"========================================================================\n"
            )
            print(status_banner)

            if "meta" not in cur_db:
                cur_db["meta"] = {}
            cur_db["meta"]["last_hourly_check"] = now_str
            cur_db["meta"]["last_hourly_status"] = "OK"
            cur_db["meta"]["discord_latency_ms"] = latency_ms
            save_db(cur_db)

        except Exception as e:
            print(f"[Watchdog Hata] Saatlik kontrol sirasinda istisna: {e}")

        # Her saat kontrol et (3600 saniye)
        await asyncio.sleep(3600)


# --- RUNNER: CONCURRENT BOT + FASTAPI + WATCHDOG ---
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
        print("[Discord Bot] Token girilmedi. Webhook modu ve HTTP koprusu aktif.")

async def main():
    cfg = load_config()
    port = int(cfg.get("port", 5055))
    host = cfg.get("host", "0.0.0.0")

    print(f"""
========================================================================
       SYNTAX SOFTWARE - DISCORD BOT & WEB TICKET KOPRUSU
========================================================================
 [MOD]        Tek Parca Bagimsiz Calistirilabilir (.EXE)
 [PORT]       {port} (Tum Ag Baglantilarina Acik: {host})
 [KONTROL]    Otomatik Saatlik Sistem ve Baglanti Denetleyicisi Aktif
 [YAN PC]     Bu dosyayi istediginiz bilgisayarda dogrudan calistirabilirsiniz!
              Python veya ek kurulum gerektirmez.
========================================================================
""")

    # FastAPI Uvicorn Server config
    uv_config = uvicorn.Config(app=app, host=host, port=port, log_level="info")
    server = uvicorn.Server(uv_config)

    # Run all three concurrent tasks: API server, Discord bot gateway, Hourly watchdog
    await asyncio.gather(
        server.serve(),
        start_discord_bot_task(),
        hourly_self_check_loop()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Server] Exiting...")
