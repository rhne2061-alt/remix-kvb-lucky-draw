// OKX OnchainOS 反向代理 - Vercel Serverless Function
// 路径: /api/okx-proxy  (POST/GET 都走这里)
// 沙箱调用: onchainos --base-url https://remix-kvb-lucky-draw-alkr.vercel.app/api/okx-proxy

export const config = { runtime: "edge" };

const OKX_BASE = "https://web3.okx.com";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 健康检查
  if (url.pathname === "/api/okx-proxy" || url.pathname === "/api/okx-proxy/health") {
    return new Response(JSON.stringify({ ok: true, service: "okx-onchainos-proxy", time: Date.now() }), {
      headers: { "content-type": "application/json" },
    });
  }

  // 从 query 参数或 path 中提取 OKX 目标路径
  // 用法: /api/okx-proxy?path=/priapi/v5/wallet/agentic/auth/session/result
  //   或: /api/okx-proxy/priapi/v5/wallet/agentic/auth/session/result
  let okxPath = url.searchParams.get("path");
  if (!okxPath) {
    const match = url.pathname.match(/^\/api\/okx-proxy(.*)$/);
    okxPath = match ? match[1] : url.pathname;
  }
  if (!okxPath.startsWith("/")) okxPath = "/" + okxPath;

  const targetUrl = OKX_BASE + okxPath + (url.search.includes("path=") ? "" : url.search);

  const headers = new Headers(req.headers);
  headers.delete("host");
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
    return new Response(JSON.stringify({ error: String(e), target: targetUrl }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
