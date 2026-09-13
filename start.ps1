# NOC Topology Discovery Center Startup Script
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
if (-not $Root) {
    $Root = (Get-Location).Path
}

# Setup local Node path if available
$NodeDir = Join-Path $Root "node"
if (Test-Path "$NodeDir\node.exe") {
    $env:PATH = "$NodeDir;" + $env:PATH
    Write-Host "[NOC Startup] Using local portable Node environment: $NodeDir" -ForegroundColor Cyan
} else {
    Write-Host "[NOC Startup] Relying on system Node." -ForegroundColor Cyan
}

# Start backend server in a separate process
Write-Host "[NOC Startup] Launching Express backend server on port 5051..." -ForegroundColor Green
$BackendDir = Join-Path $Root "server"
$BackendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $BackendDir -NoNewWindow -PassThru

# Start frontend dev server
Write-Host "[NOC Startup] Launching Vite React dev server on port 5050..." -ForegroundColor Green
$ClientDir = Join-Path $Root "client"
Set-Location -Path $ClientDir
& npm.cmd run dev
