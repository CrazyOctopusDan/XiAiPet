#!/usr/bin/env sh
set -eu

ENV_NAME="${1:-dev}"

if [ "$ENV_NAME" != "dev" ]; then
  echo "release-dev.sh 只允许 dev 环境" >&2
  exit 1
fi

if command -v tcb >/dev/null 2>&1; then
  CLOUDBASE_CLI="tcb"
elif command -v cloudbase >/dev/null 2>&1; then
  CLOUDBASE_CLI="cloudbase"
else
  echo "未找到 CloudBase CLI，请先安装 @cloudbase/cli 并执行 tcb login" >&2
  exit 1
fi

pnpm --filter @xiaipet/cloud-functions build
pnpm --filter @xiaipet/cloud-functions render:dev

(
  cd apps/cloud-functions/dist
  "$CLOUDBASE_CLI" fn deploy --config-file cloudbaserc.json
)

echo "[dev] apply collections config"
echo "[dev] apply indexes config"
echo "[dev] apply security config"
echo "[dev] upload customer miniapp manually in WeChat DevTools"
echo "[dev] upload merchant miniapp manually in WeChat DevTools"
