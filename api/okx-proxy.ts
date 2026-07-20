// OKX OnchainOS 反向代理 - Vercel Edge Function
// 沙箱调用: onchainos --base-url https://remix-kvb-lucky-draw-alkr.vercel.app/api/okx-proxy

export const config = { runtime: "edge" };

const OKX_BASE = "https://web3.okx.com";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 健康检查：只在没有 path 参数且 GET 请求时返回
  const hasPathParam = url.searchParams.has("path");
  const isHealthCheck = (pathname === "/api/okx-proxy" || pathname === "/api/okx-proxy/") 
    && !hasPathParam && req.method === "GET";
  
  if (isHealthCheck) {
    return new Response(JSON.stringify({ ok: true, service: "okx-onchainos-proxy", time: Date.now() }), {
      headers: { "content-type": "application/json" },
    });
  }

  // 提取 OKX 目标路径
  // 方式1: ?path=/priapi/...
  // 方式2: /api/okx-proxy/priapi/...
  let okxPath = url.searchParams.get("path");
  if (!okxPath) {
    const match = pathname.match(/^\/api\/okx-proxy\/(.+)$/);
    okxPath = match ? "/" + match[1] : "";
  }
  if (okxPath && !okxPath.startsWith("/")) okxPath = "/" + okxPath;
  if (!okxPath) okxPath = "/";

  // 构造目标 URL：保留除 path 外的 query 参数
  const targetParams = new URLSearchParams(url.search);
  targetParams.delete("path");
  const targetUrl = OKX_BASE + okxPath + (targetParams.toString() ? "?" + targetParams.toString() : "");

  const headers = new Headers();
  // 透传必要的请求头
  const passHeaders = ["content-type", "accept", "user-agent", "authorization", "x-api-key", "ok-access-key", "ok-access-passphrase", "ok-access-sign", "ok-access-timestamp"];
  for (const h of passHeaders) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
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
    // 允许 CORS（沙箱 CLI 可能需要）
    respHeaders.set("access-control-allow-origin", "*");
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), target: targetUrl }), {
      status: 502,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }
}
