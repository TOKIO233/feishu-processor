#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

PORT_VALUE="${PORT:-3000}"
ENV_FILE="${ROOT_DIR}/.env"
ENV_LOCAL_FILE="${ROOT_DIR}/.env.local"

is_placeholder_value() {
  local value="${1:-}"
  [[ "${value}" =~ ^your_ ]]
}

is_missing_value() {
  local value="${1:-}"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  if is_placeholder_value "${value}"; then
    return 0
  fi
  return 1
}

load_env_file() {
  local file_path="$1"
  if [[ -f "${file_path}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${file_path}"
    set +a
  fi
}

load_env_files() {
  load_env_file "${ENV_FILE}"
  load_env_file "${ENV_LOCAL_FILE}"
}

upsert_env_key() {
  local file_path="$1"
  local key="$2"
  local value="$3"

  touch "${file_path}"
  chmod 600 "${file_path}" || true

  local escaped
  escaped="$(printf '%q' "${value}")"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v k="${key}" -v v="${escaped}" '
    BEGIN { updated = 0 }
    $0 ~ ("^" k "=") {
      print k "=" v
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print k "=" v
      }
    }
  ' "${file_path}" > "${tmp_file}"

  mv "${tmp_file}" "${file_path}"
}

prompt_credentials_if_needed() {
  local need_feishu="false"
  local need_wechat="false"

  if is_missing_value "${FEISHU_APP_ID:-}" || is_missing_value "${FEISHU_APP_SECRET:-}"; then
    need_feishu="true"
  fi

  if is_missing_value "${WECHAT_APP_ID:-}" || is_missing_value "${WECHAT_APP_SECRET:-}"; then
    need_wechat="true"
  fi

  if [[ "${need_feishu}" == "false" && "${need_wechat}" == "false" ]]; then
    return 0
  fi

  if [[ ! -t 0 || ! -t 1 ]]; then
    echo "检测到凭证未配置。请先参考 README 的“如何获取凭证”，然后在 .env.local 手动配置后重试。"
    return 0
  fi

  echo "检测到以下凭证未配置："
  if [[ "${need_feishu}" == "true" ]]; then
    echo "  - 飞书凭证：FEISHU_APP_ID / FEISHU_APP_SECRET"
  fi
  if [[ "${need_wechat}" == "true" ]]; then
    echo "  - 公众号图床凭证：WECHAT_APP_ID / WECHAT_APP_SECRET"
  fi
  echo "请先参考 README.md 中“如何获取凭证”章节。"
  echo "请选择配置方式："
  echo "  1) 交互输入（推荐）"
  echo "  2) 手动编辑 .env.local 后重试"
  read -r -p "请输入选项 [1/2]（默认 1）: " setup_mode
  setup_mode="${setup_mode:-1}"

  if [[ "${setup_mode}" == "2" ]]; then
    echo "请先在 .env.local 中配置以下字段后重新运行："
    echo "  FEISHU_APP_ID=..."
    echo "  FEISHU_APP_SECRET=..."
    echo "  WECHAT_APP_ID=..."
    echo "  WECHAT_APP_SECRET=..."
    exit 1
  fi

  local changed_env="false"

  if [[ "${need_feishu}" == "true" ]]; then
    echo
    echo "开始配置飞书凭证（用于文档下载）"
    read -r -p "请输入 FEISHU_APP_ID: " FEISHU_APP_ID
    read -r -s -p "请输入 FEISHU_APP_SECRET: " FEISHU_APP_SECRET
    echo
    if is_missing_value "${FEISHU_APP_ID:-}" || is_missing_value "${FEISHU_APP_SECRET:-}"; then
      echo "飞书凭证仍不完整，后续 /api/download 与 /api/process 可能不可用。"
    else
      changed_env="true"
    fi
  fi

  if [[ "${need_wechat}" == "true" ]]; then
    echo
    read -r -p "是否现在配置公众号图床凭证？[y/N]: " should_setup_wechat
    if [[ "${should_setup_wechat:-}" =~ ^[Yy]$ ]]; then
      read -r -p "请输入 WECHAT_APP_ID: " WECHAT_APP_ID
      read -r -s -p "请输入 WECHAT_APP_SECRET: " WECHAT_APP_SECRET
      echo
      if ! is_missing_value "${WECHAT_APP_ID:-}" && ! is_missing_value "${WECHAT_APP_SECRET:-}"; then
        WECHAT_ENABLED="true"
        changed_env="true"
      else
        echo "公众号图床凭证不完整，本次不启用公众号图床。"
      fi
    fi
  fi

  if [[ "${changed_env}" == "true" ]]; then
    read -r -p "是否将本次输入写入 .env.local（下次可直接启动）？[Y/n]: " save_choice
    if [[ ! "${save_choice:-}" =~ ^[Nn]$ ]]; then
      if ! is_missing_value "${FEISHU_APP_ID:-}"; then
        upsert_env_key "${ENV_LOCAL_FILE}" "FEISHU_APP_ID" "${FEISHU_APP_ID}"
      fi
      if ! is_missing_value "${FEISHU_APP_SECRET:-}"; then
        upsert_env_key "${ENV_LOCAL_FILE}" "FEISHU_APP_SECRET" "${FEISHU_APP_SECRET}"
      fi
      if ! is_missing_value "${WECHAT_APP_ID:-}"; then
        upsert_env_key "${ENV_LOCAL_FILE}" "WECHAT_APP_ID" "${WECHAT_APP_ID}"
      fi
      if ! is_missing_value "${WECHAT_APP_SECRET:-}"; then
        upsert_env_key "${ENV_LOCAL_FILE}" "WECHAT_APP_SECRET" "${WECHAT_APP_SECRET}"
      fi
      if [[ "${WECHAT_ENABLED:-}" == "true" ]]; then
        upsert_env_key "${ENV_LOCAL_FILE}" "WECHAT_ENABLED" "true"
      fi
      echo "已写入 ${ENV_LOCAL_FILE}"
    fi
  fi
}

echo "步骤 1/4：加载环境变量文件（.env、.env.local）..."
load_env_files

echo "步骤 2/4：安装 npm 依赖..."
npm install

echo "步骤 3/4：安装项目内置 feishu2md..."
bash "${ROOT_DIR}/scripts/install-feishu2md.sh"

FEISHU2MD_BIN="${ROOT_DIR}/tools/feishu2md/current/feishu2md"
if [[ ! -x "${FEISHU2MD_BIN}" ]]; then
  echo "未找到 feishu2md 可执行文件：${FEISHU2MD_BIN}"
  exit 1
fi

prompt_credentials_if_needed

if ! is_missing_value "${FEISHU_APP_ID:-}" && ! is_missing_value "${FEISHU_APP_SECRET:-}"; then
  echo "正在配置 feishu2md..."
  "${FEISHU2MD_BIN}" config --appId "${FEISHU_APP_ID}" --appSecret "${FEISHU_APP_SECRET}"
else
  echo "未提供 FEISHU_APP_ID/FEISHU_APP_SECRET，跳过 feishu2md 初始化配置。"
  echo "建议在 .env.local 中设置："
  echo "  FEISHU_APP_ID=xxx"
  echo "  FEISHU_APP_SECRET=yyy"
fi

echo "步骤 4/4：构建并启动服务..."
npm run build

if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"${PORT_VALUE}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "端口 ${PORT_VALUE} 已被占用，可尝试："
    echo "  PORT=3100 npm run start:all"
    exit 1
  fi
fi

export FEISHU2MD_BIN
export PATH="${ROOT_DIR}/tools/feishu2md/current:${PATH}"
PORT="${PORT_VALUE}" npm start
