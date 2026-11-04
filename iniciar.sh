#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if [ ! -d node_modules ]; then npm ci || exit 1; fi
exec npm start
