#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="$PATH:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin"
docker compose down
echo
echo 'Symtora is stopped. Your accounts and entries are kept for next time.'
read -r -p 'Press Enter to close this window'
