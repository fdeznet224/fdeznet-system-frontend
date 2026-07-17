#!/bin/bash
set -e

cd /opt/fdeznet/frontend

git fetch origin
git reset --hard origin/main

cat > .env.production <<'ENV'
VITE_VSOL_API_BASE=/api
ENV

npm install
npm run build

nginx -t
systemctl reload nginx

echo "Frontend OK"
