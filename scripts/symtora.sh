#!/bin/bash
# Starts the whole Symtora stack in Docker and opens the app. Run via "Symtora.command";
# when it is already running, offers to open it again or stop it instead.
# Written for the bash 3.2 that ships with macOS.
set -u
cd "$(dirname "$0")/.."

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
fail() {
  printf '\n\033[31m%s\033[0m\n' "$1"
  read -r -p 'Press Enter to close'
  exit 1
}

# --- 1. Docker ------------------------------------------------------------------------------------
step 'Checking Docker'
# Docker Desktop installs the CLI here; a Finder-launched shell may not have it on PATH yet.
export PATH="$PATH:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin"
command -v docker >/dev/null 2>&1 ||
  fail 'Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and run this again.'

if ! docker info >/dev/null 2>&1; then
  echo 'Starting Docker Desktop...'
  open -a Docker 2>/dev/null || echo 'Please start Docker Desktop.'
  waited=0
  until docker info >/dev/null 2>&1; do
    [ "$waited" -ge 180 ] &&
      fail 'Docker did not start. Open Docker Desktop, wait for "Engine running", then run this again.'
    sleep 3
    waited=$((waited + 3))
  done
fi
echo 'Docker is running.'

open_app() {
  step 'Symtora is running'
  open http://localhost:8081
  echo 'Browser: http://localhost:8081  (the first load takes up to a minute)'

  if [ -n "$1" ]; then
    echo
    echo 'Phone: install Expo Go, join the same Wi-Fi as this computer, then scan this code'
    echo '(iPhone: with the Camera app; Android: inside Expo Go):'
    docker compose exec -T app node scripts/print-qr.js "exp://$1:8081"
  else
    echo 'No Wi-Fi/network address found, so the phone option is unavailable. The browser works.'
  fi

  echo
  echo 'Symtora keeps running in the background. To stop it, double-click "Symtora.command" again.'
  read -r -p 'Press Enter to close this window'
  exit 0
}

# --- Already running? -----------------------------------------------------------------------------
# Quietly: before the first start there is no .env yet, and compose complains about JWT_SECRET.
if [ -n "$(docker compose ps --status running -q app 2>/dev/null)" ]; then
  echo
  echo 'Symtora is already running.'
  echo '  [1] Open the app again (browser + phone QR code)'
  echo '  [2] Stop Symtora'
  echo '  [3] Close this window'
  read -r -p 'Choose 1, 2 or 3: ' choice
  case "$choice" in
    1)
      # The address the running app was started with, which is what the phone has to use.
      open_app "$(grep '^LAN_IP=' .env | head -n 1 | cut -d= -f2- | tr -d '[:space:]')"
      ;;
    2)
      step 'Stopping Symtora'
      docker compose down
      echo
      echo 'Symtora is stopped. Your accounts and entries are kept for next time.'
      read -r -p 'Press Enter to close this window'
      exit 0
      ;;
    *) exit 0 ;;
  esac
fi

# --- 2. Settings (.env) ---------------------------------------------------------------------------
step 'Preparing settings'
[ -f .env ] || cp .env.example .env

# Replaces KEY=... in .env, or appends it. awk rather than sed: the secret contains / and +.
set_env() {
  awk -v key="$1" -v value="$2" '
    index($0, key "=") == 1 { print key "=" value; done = 1; next }
    { print }
    END { if (!done) print key "=" value }
  ' .env > .env.tmp && mv .env.tmp .env
}

if [ -z "$(grep '^JWT_SECRET=' .env | cut -d= -f2-)" ]; then
  set_env JWT_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  echo 'Created a new secret key.'
fi

# The address of the interface that carries the default route (Wi-Fi or Ethernet).
iface="$(route -n get default 2>/dev/null | awk '/interface:/ { print $2 }')"
lan_ip="$(ipconfig getifaddr "${iface:-en0}" 2>/dev/null || true)"
set_env LAN_IP "$lan_ip"

# --- 3. Build and start ---------------------------------------------------------------------------
step 'Building Symtora (the first time takes a few minutes)'
docker compose build || fail 'Building failed. See the messages above.'

step 'Downloading the AI model if needed (about 2 GB the first time)'
docker compose run --rm model-init ||
  fail 'The AI model could not be downloaded. Check the internet connection and run this again.'

step 'Starting'
docker compose up -d || fail 'Starting failed. See the messages above.'

wait_for() {
  printf 'Waiting for the %s...' "$2"
  waited=0
  until curl -fs --max-time 5 "$1" >/dev/null; do
    [ "$waited" -ge 600 ] && fail "The $2 did not start. Run 'docker compose logs' in this folder to see why."
    printf '.'
    sleep 3
    waited=$((waited + 3))
  done
  echo ' ready.'
}
wait_for http://localhost:8080/health server
wait_for http://localhost:8081/status app

open_app "$lan_ip"
