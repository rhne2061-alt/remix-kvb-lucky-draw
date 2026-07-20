#!/usr/bin/env bash
# OKX OnchainOS 沙箱便捷调用脚本
# 用法：./okx.sh wallet login --phase init
#       ./okx.sh wallet status
#       ./okx.sh wallet balance

set -e

export PATH="/root/.local/bin:$PATH"

# ===== 在这里填你部署后的反代地址 =====
# Vercel:  https://-rhne7188.vercel.app/api
# Deno:    https://<project>.deno.dev
# 自定义:  https://你的域名
PROXY_URL="${OKX_PROXY_URL:-https://okx-proxy.example.com}"

# 如果反代设置了 ACCESS_TOKEN，在这里填
PROXY_TOKEN="${OKX_PROXY_TOKEN:-}"

# 健康检查
if [[ "$1" == "check" ]]; then
  echo "测试反代健康检查..."
  curl -s --max-time 10 "$PROXY_URL/health" 2>&1 | head -5
  echo ""
  echo "测试 OKX 通路..."
  curl -s --max-time 10 "$PROXY_URL/priapi/v5/wallet/agentic/auth/session/result" 2>&1 | head -5
  exit 0
fi

# 带 token 的请求头
TOKEN_HEADER=""
if [[ -n "$PROXY_TOKEN" ]]; then
  TOKEN_HEADER="-H x-proxy-token:$PROXY_TOKEN"
fi

# 调用 onchainos，自动注入 base-url
exec onchainos --base-url "$PROXY_URL" "$@"
