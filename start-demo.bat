@echo off
setlocal
title Transparent Flow - demo launcher
cd /d "%~dp0"

echo ============================================
echo   Transparent Flow - starting demo
echo ============================================
echo.

if not exist "%~dp0cloudflared.exe" (
  echo [ERROR] cloudflared.exe not found next to this .bat
  echo Download it from https://github.com/cloudflare/cloudflared/releases
  echo Save as cloudflared.exe in this folder and re-run.
  echo.
  pause
  exit /b 1
)

echo [1/4] Starting Postgres...
REM Check whether the transparent-flow-db container already exists (e.g. created by the main repo).
docker container inspect transparent-flow-db >nul 2>&1
if errorlevel 1 (
  echo   Container does not exist - creating via docker compose...
  docker compose up -d
  if errorlevel 1 (
    echo.
    echo [ERROR] docker compose failed. Is Docker Desktop running?
    pause
    exit /b 1
  )
) else (
  echo   Container already exists - starting it...
  docker start transparent-flow-db >nul
  if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start container. Is Docker Desktop running?
    pause
    exit /b 1
  )
)
echo.

echo [2/4] API in a new window  [TFlow API]  port 3001
start "TFlow API" cmd /k "cd /d %~dp0api && npm run dev"

echo [3/4] Vite in a new window [TFlow Web]  port 5173
start "TFlow Web" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Waiting 8 seconds for API and Vite to come up...
timeout /t 8 /nobreak >nul
echo.

echo [4/4] Cloudflared tunnel in a new window [TFlow Tunnel]
echo.
echo IMPORTAnT: in ~10 seconds the tunnel window will show a line like
echo     https://xxx-yyy-zzz.trycloudflare.com
echo That is your public demo link. Copy it and send to whoever you show.
echo.
start "TFlow Tunnel - your demo link" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://localhost:5173 --protocol http2 --edge-ip-version 4"

echo ============================================
echo   All services started! 3 new windows open:
echo     - TFlow API     (backend)
echo     - TFlow Web     (frontend)
echo     - TFlow Tunnel  (public link will appear here)
echo.
echo   Local URLs:
echo     PM:    http://localhost:5173
echo     Login: admin@adena.local / admin123
echo.
echo   To stop: close the corresponding windows.
echo   Postgres (Docker) keeps running in the background.
echo ============================================
echo.
pause
