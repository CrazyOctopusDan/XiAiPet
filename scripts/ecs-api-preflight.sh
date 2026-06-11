#!/bin/sh
set -u

REPO_ROOT="${1:-/opt/xiaipet/repo}"
ENV_FILE="$REPO_ROOT/apps/api/.env.production"
SECRET_DIR="/opt/xiaipet/secrets/wechatpay"
MIN_ROOT_KB="${MIN_ROOT_KB:-1048576}"
MIN_OPT_KB="${MIN_OPT_KB:-524288}"
MIN_DOCKER_KB="${MIN_DOCKER_KB:-2097152}"

errors=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  errors=$((errors + 1))
}

warn() {
  printf 'WARN %s\n' "$1"
}

check_space() {
  path="$1"
  min_kb="$2"
  label="$3"

  if [ ! -e "$path" ]; then
    warn "$label path not found: $path"
    return
  fi

  available_kb="$(df -Pk "$path" | awk 'NR == 2 { print $4 }')"
  if [ -z "$available_kb" ]; then
    fail "could not read free space for $label at $path"
    return
  fi

  if [ "$available_kb" -lt "$min_kb" ]; then
    fail "$label has less than $((min_kb / 1024)) MB free at $path"
    return
  fi

  pass "$label free space is at least $((min_kb / 1024)) MB"
}

read_env_value() {
  key="$1"
  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    index($0, key "=") == 1 { value = substr($0, length(key) + 2) }
    END { print value }
  ' "$ENV_FILE" | sed 's/\r$//' | sed 's/^"//; s/"$//; s/^'"'"'//; s/'"'"'$//'
}

require_env() {
  key="$1"
  value="$(read_env_value "$key")"
  if [ -z "$value" ] || printf '%s' "$value" | grep -Eq '^<.*>$'; then
    fail "$key is missing or still a placeholder"
    return 1
  fi
  pass "$key is configured"
  return 0
}

check_secret_file() {
  path="$1"
  label="$2"
  marker="$3"

  if [ -z "$path" ]; then
    fail "$label path is empty"
    return
  fi
  if [ ! -f "$path" ]; then
    fail "$label file does not exist: $path"
    return
  fi
  if [ ! -r "$path" ]; then
    fail "$label file is not readable by the current user: $path"
    return
  fi
  if ! grep -q "$marker" "$path"; then
    fail "$label file does not look like expected PEM material"
    return
  fi
  pass "$label file is present and readable"
}

path_uid() {
  stat -c '%u' "$1" 2>/dev/null || stat -f '%u' "$1" 2>/dev/null || printf ''
}

path_mode() {
  stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1" 2>/dev/null || printf ''
}

mode_digit() {
  mode="$1"
  position="$2"
  printf '%s' "$mode" | awk -v position="$position" '{ print substr($0, length($0) - 3 + position, 1) }'
}

digit_has_read() {
  case "$1" in
    4|5|6|7) return 0 ;;
    *) return 1 ;;
  esac
}

digit_has_execute() {
  case "$1" in
    1|3|5|7) return 0 ;;
    *) return 1 ;;
  esac
}

check_node_user_access() {
  path="$1"
  label="$2"
  access="$3"

  if [ -z "$path" ] || [ ! -e "$path" ]; then
    return
  fi

  uid="$(path_uid "$path")"
  mode="$(path_mode "$path")"

  if [ -z "$uid" ] || [ -z "$mode" ]; then
    fail "could not inspect owner/mode for $label: $path"
    return
  fi

  owner_digit="$(mode_digit "$mode" 1)"
  other_digit="$(mode_digit "$mode" 3)"

  if [ "$access" = "read" ]; then
    if { [ "$uid" = "1000" ] && digit_has_read "$owner_digit"; } || digit_has_read "$other_digit"; then
      pass "$label is readable by the container node user"
      return
    fi
    fail "$label is not readable by container UID 1000; use chown 1000:1000 or chmod a+r"
    return
  fi

  if { [ "$uid" = "1000" ] && digit_has_execute "$owner_digit"; } || digit_has_execute "$other_digit"; then
    pass "$label is traversable by the container node user"
    return
  fi
  fail "$label is not traversable by container UID 1000; use chown 1000:1000 or chmod a+x"
}

printf 'XiAiPet ECS API preflight\n'
printf 'repo=%s\n' "$REPO_ROOT"

check_space "/" "$MIN_ROOT_KB" "root filesystem"
check_space "/opt" "$MIN_OPT_KB" "/opt filesystem"
check_space "/var/lib/docker" "$MIN_DOCKER_KB" "Docker storage"

if [ ! -d "$REPO_ROOT" ]; then
  fail "repository root does not exist: $REPO_ROOT"
else
  pass "repository root exists"
fi

if [ ! -f "$ENV_FILE" ]; then
  fail "production env file does not exist: $ENV_FILE"
else
  pass "production env file exists"
fi

if [ ! -d "$SECRET_DIR" ]; then
  fail "WeChat Pay secret directory does not exist: $SECRET_DIR"
else
  pass "WeChat Pay secret directory exists"
fi

if [ -f "$ENV_FILE" ]; then
  require_env API_PUBLIC_BASE_URL
  require_env DATABASE_URL
  require_env API_SESSION_SECRET
  require_env OSS_REGION
  require_env OSS_BUCKET
  require_env OSS_ENDPOINT
  require_env OSS_PUBLIC_BASE_URL
  require_env OSS_ACCESS_KEY_ID
  require_env OSS_ACCESS_KEY_SECRET
  require_env CUSTOMER_WECHAT_APP_ID
  require_env CUSTOMER_WECHAT_APP_SECRET
  require_env MERCHANT_WECHAT_APP_ID
  require_env MERCHANT_WECHAT_APP_SECRET
  require_env WECHAT_PAY_MCH_ID
  require_env WECHAT_PAY_MCH_SERIAL_NO
  require_env WECHAT_PAY_NOTIFY_URL
  require_env WECHAT_PAY_API_V3_KEY
  require_env WECHAT_PAY_PRIVATE_KEY_PATH
  require_env WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH

  api_v3_key="$(read_env_value WECHAT_PAY_API_V3_KEY)"
  if [ ${#api_v3_key} -ne 32 ]; then
    fail "WECHAT_PAY_API_V3_KEY must be exactly 32 characters"
  else
    pass "WECHAT_PAY_API_V3_KEY length is 32 characters"
  fi

  notify_url="$(read_env_value WECHAT_PAY_NOTIFY_URL)"
  case "$notify_url" in
    https://*) pass "WECHAT_PAY_NOTIFY_URL uses HTTPS" ;;
    *) fail "WECHAT_PAY_NOTIFY_URL must start with https://" ;;
  esac

  private_key_path="$(read_env_value WECHAT_PAY_PRIVATE_KEY_PATH)"
  public_key_path="$(read_env_value WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH)"
  check_secret_file "$private_key_path" "merchant private key" "PRIVATE KEY"
  check_secret_file "$public_key_path" "WeChat Pay platform public key" "BEGIN PUBLIC KEY"
  check_node_user_access "/opt/xiaipet/secrets" "secret parent directory" "execute"
  check_node_user_access "$SECRET_DIR" "WeChat Pay secret directory" "execute"
  check_node_user_access "$private_key_path" "merchant private key" "read"
  check_node_user_access "$public_key_path" "WeChat Pay platform public key" "read"
fi

if command -v docker >/dev/null 2>&1; then
  pass "docker command exists"
  if docker info >/dev/null 2>&1; then
    pass "Docker daemon is reachable"
  else
    fail "Docker daemon is not reachable"
  fi

  if docker compose version >/dev/null 2>&1; then
    pass "docker compose is available"
  else
    fail "docker compose is not available"
  fi

  if [ -d "$REPO_ROOT" ]; then
    if (cd "$REPO_ROOT" && docker compose config >/dev/null 2>&1); then
      pass "docker compose config is valid"
    else
      fail "docker compose config failed"
    fi
  fi
else
  fail "docker command is not installed"
fi

if [ "$errors" -eq 0 ]; then
  printf 'Preflight passed.\n'
  exit 0
fi

printf 'Preflight failed with %s issue(s).\n' "$errors"
exit 1
