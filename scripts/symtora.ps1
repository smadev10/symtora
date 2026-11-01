# Starts the whole Symtora stack in Docker and opens the app. Run via "Symtora.bat";
# when it is already running, offers to open it again or stop it instead.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less files as ANSI.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
[Console]::OutputEncoding = [Text.Encoding]::UTF8

function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Fail($text) {
  Write-Host ''
  Write-Host $text -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}

# --- 1. Docker ----------------------------------------------------------------------------------
Step 'Checking Docker'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail 'Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and run this again.'
}

# Through cmd: in PowerShell 5.1, redirecting a native command's stderr under 'Stop' throws.
function DockerRunning { cmd /c 'docker info >nul 2>&1'; return $LASTEXITCODE -eq 0 }

if (-not (DockerRunning)) {
  $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $desktop) {
    Write-Host 'Starting Docker Desktop...'
    Start-Process $desktop
  } else {
    Write-Host 'Please start Docker Desktop.'
  }
  $deadline = (Get-Date).AddMinutes(3)
  while (-not (DockerRunning)) {
    if ((Get-Date) -gt $deadline) { Fail 'Docker did not start. Open Docker Desktop, wait for "Engine running", then run this again.' }
    Start-Sleep -Seconds 3
  }
}
Write-Host 'Docker is running.'

function Open-App($ip) {
  Step 'Symtora is running'
  Start-Process 'http://localhost:8081'
  Write-Host 'Browser: http://localhost:8081  (the first load takes up to a minute)'

  if ($ip) {
    Write-Host ''
    Write-Host 'Phone: install Expo Go, join the same Wi-Fi as this computer, then scan this code'
    Write-Host '(iPhone: with the Camera app; Android: inside Expo Go):'
    docker compose exec -T app node scripts/print-qr.js "exp://${ip}:8081"
  } else {
    Write-Host 'No Wi-Fi/network address found, so the phone option is unavailable. The browser works.'
  }

  Write-Host ''
  Write-Host 'Symtora keeps running in the background. To stop it, double-click "Symtora.bat" again.'
  Read-Host 'Press Enter to close this window'
  exit 0
}

# --- Already running? ---------------------------------------------------------------------------
# Quietly: before the first start there is no .env yet, and compose complains about JWT_SECRET.
if (cmd /c "docker compose ps --status running -q app 2>nul") {
  Write-Host ''
  Write-Host 'Symtora is already running.'
  Write-Host '  [1] Open the app again (browser + phone QR code)'
  Write-Host '  [2] Stop Symtora'
  Write-Host '  [3] Close this window'
  $choice = Read-Host 'Choose 1, 2 or 3'
  switch ($choice) {
    '1' {
      # The address the running app was started with, which is what the phone has to use.
      $ip = (Get-Content .env | Where-Object { $_ -match '^LAN_IP=' } | Select-Object -First 1) -replace '^LAN_IP=', ''
      Open-App $ip.Trim()
    }
    '2' {
      Step 'Stopping Symtora'
      docker compose down
      Write-Host ''
      Write-Host 'Symtora is stopped. Your accounts and entries are kept for next time.'
      Read-Host 'Press Enter to close this window'
      exit 0
    }
    default { exit 0 }
  }
}


# --- 2. Settings (.env) ---------------------------------------------------------------------------
Step 'Preparing settings'
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$lines = [Collections.Generic.List[string]](Get-Content .env)

function Set-EnvValue($key, $value) {
  $i = $lines.FindIndex({ param($l) $l -match "^$key=" })
  if ($i -ge 0) { $lines[$i] = "$key=$value" } else { $lines.Add("$key=$value") }
}
function Get-EnvValue($key) {
  $line = $lines | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if ($line) { return $line.Substring($key.Length + 1).Trim() } else { return '' }
}

if (-not (Get-EnvValue 'JWT_SECRET')) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-EnvValue 'JWT_SECRET' ([Convert]::ToBase64String($bytes))
  Write-Host 'Created a new secret key.'
}

# The address of the network adapter that carries the default route, i.e. the real Wi-Fi/Ethernet
# one rather than a WSL/Hyper-V/VPN adapter.
$lanIp = ''
try {
  $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
    Sort-Object { $_.RouteMetric + $_.InterfaceMetric } | Select-Object -First 1
  $lanIp = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop |
    Select-Object -First 1).IPAddress
} catch { }
Set-EnvValue 'LAN_IP' $lanIp

# Without a BOM: docker compose would read it as part of the first key.
[IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $lines, (New-Object Text.UTF8Encoding $false))

# --- 3. Build and start -------------------------------------------------------------------------
Step 'Building Symtora (the first time takes a few minutes)'
docker compose build
if ($LASTEXITCODE -ne 0) { Fail 'Building failed. See the messages above.' }

Step 'Downloading the AI model if needed (about 2 GB the first time)'
docker compose run --rm model-init
if ($LASTEXITCODE -ne 0) { Fail 'The AI model could not be downloaded. Check the internet connection and run this again.' }

Step 'Starting'
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail 'Starting failed. See the messages above.' }

function WaitFor($url, $what) {
  Write-Host "Waiting for the $what..." -NoNewline
  $deadline = (Get-Date).AddMinutes(10)
  while ($true) {
    try {
      Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5 | Out-Null
      Write-Host ' ready.'
      return
    } catch {
      if ((Get-Date) -gt $deadline) { Fail "The $what did not start. Run 'docker compose logs' in this folder to see why." }
      Write-Host '.' -NoNewline
      Start-Sleep -Seconds 3
    }
  }
}
WaitFor 'http://localhost:8080/health' 'server'
WaitFor 'http://localhost:8081/status' 'app'

Open-App $lanIp
