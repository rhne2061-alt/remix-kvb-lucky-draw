// OKX OnchainOS 反向代理 — Vercel Edge Function 版
// 文件位置：api/_proxy.ts （Vercel 会自动识别 /api/* 路由）
//
// 部署：
//   1. 把 okx-proxy 目录推到你的 GitHub 仓库 rhne2061-alt/-rhne7188
//   2. Vercel 自动部署，得到 https://-rhne7188.vercel.app
//   3. 沙箱内执行：
//      onchainos wallet login --phase init --base-url https://-rhne7188.vercel.app/api
//
// 安全：在 Vercel 项目设置里加环境变量 ACCESS_TOKEN=你的随机字符串

export const config = { runtime: "edge" };

const OKX_BASE = "https://web3.okx.com";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? "";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 健康检查
  if (url.pathname === "/api" || url.pathname === "/api/" || url.pathname === "/api/health") {
    return new Response(JSON.stringify({ ok: true, service: "okx-onchainos-proxy", time: Date.now() }), {
      headers: { "content-type": "application/json" },
    });
  }

  // 可选鉴权
  if (ACCESS_TOKEN) {
    const auth = req.headers.get("x-proxy-token");
    if (auth !== ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
    }
  }

  // 去掉 /api 前缀，拼接到 OKX
  const okxPath = url.pathname.replace(/^\/api/, "") + url.search;
  const targetUrl = OKX_BASE + okxPath;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("x-proxy-token");
  headers.set("host", "web3.okx.com");

  try {
    const resp = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
      redirect: "manual",
    });

    const respHeaders = new Headers(resp.headers);
    respHeaders.delete("transfer-encoding");
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { "content-type": "application/json" } });
  }
}
