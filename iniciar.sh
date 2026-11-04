#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Instala Node.js 24 LTS desde https://nodejs.org y vuelve a intentarlo."
  exit 1
fi
exec node iniciar.mjs "$@"
