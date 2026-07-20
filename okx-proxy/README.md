# OKX OnchainOS 反向代理

解决沙箱环境无法直连 `web3.okx.com` 的问题。沙箱的 ZeroProxy 透明代理在 SNI 层封锁了 OKX 全系域名，所有出站 HTTPS 必经其检查。

本反代部署在沙箱可访问的 Serverless 平台（Vercel / Deno Deploy / Render），把 OKX API 包一层白名单域名。

## 🚀 部署（三选一）

### 方案 1：Vercel（推荐，你已有仓库）

```bash
# 1. 把本目录推到 GitHub 仓库 rhne2061-alt/-rhne7188 的 okx-proxy 子目录
cd okx-proxy
git init && git add . && git commit -m "okx onchainos proxy"
git remote add origin https://github.com/rhne2061-alt/-rhne7188.git
git push origin main

# 2. 在 Vercel 后台关联仓库，Root Directory 选 okx-proxy
# 3. 部署后得到：https://-rhne7188.vercel.app
# 4. （可选）在 Vercel 项目设置 → Environment Variables 加：
#    ACCESS_TOKEN = <你生成的随机字符串>
```

### 方案 2：Deno Deploy

```bash
# 访问 https://dash.deno.com → New Project → 关联 GitHub 仓库
# 入口文件选 main.ts，部署后得到 https://<project>.deno.dev
```

### 方案 3：Cloudflare Workers（需自定义域名）

```bash
# workers.dev 被沙箱拦截，需绑定自定义域名
npx wrangler deploy worker.js --name okx-proxy
```

## 🔑 生成访问令牌（保护你的反代不被滥用）

```bash
openssl rand -hex 32
# 输出类似：a3f5b8c1d2e4... 把它设为平台的 ACCESS_TOKEN 环境变量
```

## ✅ 验证反代可用

部署完成后，在沙箱内测试：

```bash
# 健康检查（应返回 ok:true）
curl https://<your-domain>/api/health
# 或 Deno：curl https://<project>.deno.dev/health

# 测试 OKX 通路（应返回 OKX 的 JSON 响应，而非超时）
curl https://<your-domain>/api/priapi/v5/wallet/agentic/auth/session/result
```

## 🎯 配置 onchainos CLI 使用反代

```bash
# 启动邮箱登录（注意 --base-url 指向反代）
onchainos wallet login --phase init --base-url https://<your-domain>/api
# Vercel Edge Function 路径为 /api，Deno Deploy 为根路径

# 拿到 loginUrl 后在浏览器完成邮箱登录

# 轮询登录结果
onchainos wallet login --phase poll \
  --session-id <authSessionId> \
  --base-url https://<your-domain>/api
```

## ⚠️ 安全提示

- **务必设置 ACCESS_TOKEN**，否则你的反代会变成公开 OKX 代理
- 反代日志可能记录请求路径（含 authSessionId），建议部署平台关闭日志或自行脱敏
- `authSessionId` 有效期约 5 分钟，过期需重新 `init`
- 凭证持久化在沙箱 `~/.onchainos/keyring.enc`，重启后可能丢失，重要操作当场完成

## 📋 文件说明

| 文件 | 用途 |
|------|------|
| `api/proxy.ts` | Vercel Edge Function 版反代 |
| `main.ts` | Deno Deploy 版反代 |
| `worker.js` | Cloudflare Workers 版（需自定义域名） |
