@echo off
title Syntax Software - Discord Bot & Web Ticket Bridge
chcp 65001 >nul
cls
echo =======================================================================
echo          SYNTAX SOFTWARE - DISCORD BOT & WEB TICKET BRIDGE
echo =======================================================================
echo.
echo [INFO] Python calistiriliyor ve Discord koprusu baslatiliyor...
echo [PORT] 5055 uzerinde Webhook & API dinleniyor...
echo.
python bot_bridge.py
pause
