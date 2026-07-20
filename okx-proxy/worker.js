// OKX OnchainOS 反向代理 — Cloudflare Workers 版
// 注意：workers.dev 域名被沙箱拦截，必须绑定自定义域名才能使用
// 部署：npx wrangler deploy worker.js --name okx-proxy
// 然后在 Cloudflare Dashboard → Workers → 你的 Worker → Triggers → Custom Domains 绑定域名

const OKX_BASE = "https://web3.okx.com";
const ACCESS_TOKEN = env.ACCESS_TOKEN ?? "";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "okx-onchainos-proxy", time: Date.now() }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (ACCESS_TOKEN) {
      const auth = req.headers.get("x-proxy-token");
      if (auth !== ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
      }
    }

    const targetUrl = OKX_BASE + url.pathname + url.search;
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
  },
};
