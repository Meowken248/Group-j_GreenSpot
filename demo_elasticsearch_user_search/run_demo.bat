@echo off
title Demo Elasticsearch User Search
color 0A

echo ===================================================
echo   DEMO TIM KIEM USER VOI ELASTICSEARCH (PHP + ES)
echo ===================================================
echo.

echo 1. Dang kiem tra va khoi dong Elasticsearch Docker...
docker start ecoreport_elasticsearch >nul 2>&1

echo 2. Dang khoi dong Web Server PHP tai port 8090...
echo.
echo ===================================================
echo   TRINH DUYET SE TU DONG MO:
echo   http://localhost:8090/user_list.php
echo.
echo   * LUU Y: KHONG TAT CUA SO NAY KHI DANG TEST!
echo   * Thu nho (minimize) cua so nay xuong taskbar.
echo   * Nhan to hop phim Ctrl + C neu muon dung server.
echo ===================================================
echo.

:: Tu dong mo trinh duyet sau 1 giay
start "" http://localhost:8090/user_list.php

:: Chay PHP built-in server
php -S localhost:8090 -t "%~dp0"

pause
