#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_ROOT="${ROOT_DIR}/tools/feishu2md"

os_raw="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch_raw="$(uname -m)"

case "${os_raw}" in
  linux)
    os="linux"
    ;;
  darwin)
    os="darwin"
    ;;
  *)
    echo "不支持的操作系统：${os_raw}。当前仅支持 Linux 和 macOS。"
    exit 1
    ;;
esac

case "${arch_raw}" in
  x86_64|amd64)
    arch="amd64"
    ;;
  arm64|aarch64)
    arch="arm64"
    ;;
  *)
    echo "不支持的 CPU 架构：${arch_raw}。当前仅支持 amd64 和 arm64。"
    exit 1
    ;;
esac

version="${1:-}"
if [[ -z "${version}" ]]; then
  installed_version=""
  if [[ -L "${INSTALL_ROOT}/current" && -x "${INSTALL_ROOT}/current/feishu2md" ]]; then
    installed_version="$(basename "$(readlink "${INSTALL_ROOT}/current")")"
  fi

  echo "正在检测 feishu2md 最新版本..."
  set +e
  latest_version="$(
    curl -fsSL "https://api.github.com/repos/Wsine/feishu2md/releases/latest" 2>/dev/null \
    | sed -n 's/.*"tag_name":[[:space:]]*"\(v[^"]*\)".*/\1/p' \
    | head -n 1
  )"
  set -e

  if [[ -n "${latest_version}" ]]; then
    version="${latest_version}"
  elif [[ -n "${installed_version}" ]]; then
    version="${installed_version}"
    echo "当前无法访问 GitHub，改用已安装版本 ${version}。"
  fi
fi

if [[ -z "${version}" ]]; then
  echo "无法确定 feishu2md 版本。"
  exit 1
fi

archive="feishu2md-${version}-${os}-${arch}.tar.gz"
download_url="https://github.com/Wsine/feishu2md/releases/download/${version}/${archive}"
tmp_archive="$(mktemp "/tmp/${archive}.XXXXXX")"
install_dir="${INSTALL_ROOT}/${version}"

mkdir -p "${install_dir}"
if [[ ! -x "${install_dir}/feishu2md" ]]; then
  trap 'rm -f "${tmp_archive}"' EXIT
  echo "正在安装 feishu2md ${version}（${os}/${arch}）..."
  curl -fL "${download_url}" -o "${tmp_archive}"
  tar -xzf "${tmp_archive}" -C "${install_dir}"
  chmod +x "${install_dir}/feishu2md"
else
  rm -f "${tmp_archive}"
  echo "feishu2md ${version} 已安装，跳过下载。"
fi

ln -sfn "${install_dir}" "${INSTALL_ROOT}/current"
ln -sfn "${install_dir}/feishu2md" "${INSTALL_ROOT}/feishu2md"

echo "安装完成，可执行文件：${INSTALL_ROOT}/current/feishu2md"
"${INSTALL_ROOT}/current/feishu2md" -v
