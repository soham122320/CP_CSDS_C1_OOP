#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "${EMSDK:-}" && -f "$EMSDK/emsdk_env.sh" ]]; then source "$EMSDK/emsdk_env.sh"; fi
if ! command -v emcmake >/dev/null; then echo 'Install and activate Emscripten first: https://emscripten.org/docs/getting_started/downloads.html' >&2; exit 1; fi
emcmake cmake -S cpp-engine -B build/wasm -DCMAKE_BUILD_TYPE=Release
cmake --build build/wasm --parallel 2
