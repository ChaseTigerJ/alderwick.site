#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 launch.py
elif command -v node >/dev/null 2>&1; then
  exec node launch.mjs
else
  printf '\nAlderwick needs Python 3 or Node.js to start its local game server.\nInstall one, then run this launcher again. See READ-ME-FIRST.txt.\n'
  read -r answer
  exit 1
fi
