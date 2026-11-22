#!/bin/sh
# Runs the full test suite in a real DOM. Refuses to deploy if anything fails.
set -e
node run-test.js || { echo "TESTS FAILED — not deploying"; exit 1; }
B=$(date +%Y%m%d-%H%M%S)
sed -i.bak "s/var BUILD='[^']*'/var BUILD='$B'/" index.html && rm -f index.html.bak
printf '{"build": "%s"}' "$B" > version.json
git add -A && git commit -q -m "deploy $B" && git push -q
echo "deployed $B"
