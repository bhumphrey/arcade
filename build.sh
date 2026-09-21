#!/bin/sh
# Stage the site for deploy: the page, its files, and each game's checkout,
# without any git bookkeeping. Cloudflare publishes dist/ (see wrangler.jsonc).
set -eu
rm -rf dist
mkdir -p dist
cp index.html style.css arcade.js games.js _headers dist/
rsync -a --exclude '.git*' --exclude '.claude' --exclude 'node_modules' --exclude '.DS_Store' games dist/
echo "staged $(find dist -type f | wc -l | tr -d ' ') files in dist/"
