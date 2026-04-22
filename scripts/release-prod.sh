#!/usr/bin/env sh
set -eu

ENV_NAME="${1:-}"
CONFIRM_TOKEN="${2:-}"

if [ "$ENV_NAME" != "prod" ]; then
  echo "必须显式传入 prod 参数，禁止默认发布到正式环境" >&2
  exit 1
fi

if [ "$CONFIRM_TOKEN" != "confirm-prod-release" ]; then
  echo "正式发布需要人工确认。请传入 confirm-prod-release 作为第二个参数。" >&2
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
pnpm --filter @xiaipet/cloud-functions render:prod

(
  cd apps/cloud-functions/dist
  "$CLOUDBASE_CLI" fn deploy --config-file cloudbaserc.json
)

echo "[prod] apply collections, indexes, and security after final review"
echo "[prod] upload miniapp packages manually after smoke test"
