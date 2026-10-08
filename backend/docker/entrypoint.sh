#!/bin/sh
set -e

echo "[entrypoint] applying database migrations ..."
npx --no-install prisma migrate deploy

echo "[entrypoint] starting Grade Calculator and Study Planner"
exec "$@"