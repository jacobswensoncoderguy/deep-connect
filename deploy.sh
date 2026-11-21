#!/bin/sh
# Stamps a new build and pushes. Run after editing index.html.
B=$(date +%Y%m%d-%H%M%S)
sed -i.bak "s/var BUILD='[^']*'/var BUILD='$B'/" index.html && rm -f index.html.bak
printf '{"build": "%s"}' "$B" > version.json
git add -A && git commit -q -m "deploy $B" && git push -q
echo "deployed $B"
