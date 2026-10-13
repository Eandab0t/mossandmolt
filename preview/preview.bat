@echo off
REM Moss & Molt local theme preview (no Shopify login required).
REM Starts the LiquidJS renderer on http://localhost:3000 and opens it.
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing preview dependencies...
  call npm install
)
start "" "http://localhost:3000"
echo Starting preview server (close this window or press Ctrl+C to stop)...
node server.js
