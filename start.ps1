# NOC Topology Discovery Center Startup Script
$ErrorActionPreference = "Stop"

# Setup local Node path
$NodeDir = "y:\Network_Management\node"
if (Test-Path "$NodeDir\node.exe") {
    $env:PATH = "$NodeDir;" + $env:PATH
    Write-Host "[NOC Startup] Using local portable Node environment: $NodeDir" -ForegroundColor Cyan
} else {
    Write-Host "[NOC Startup] WARNING: Local Node folder not found. Relying on system Node." -ForegroundColor Yellow
}

# Start backend server in a separate process
Write-Host "[NOC Startup] Launching Express backend server on port 3001..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "y:\Network_Management\server" -NoNewWindow -PassThru

# Start frontend dev server
Write-Host "[NOC Startup] Launching Vite React dev server on port 3000..." -ForegroundColor Green
Set-Location -Path "y:\Network_Management\client"
& npm run dev
