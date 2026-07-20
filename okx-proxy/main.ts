// OKX OnchainOS 反向代理 — Deno Deploy 版
// 部署：把本目录推到 GitHub，在 https://dash.deno.com 关联仓库即可
// 或本地：deno deploy --project=<your-project> main.ts
//
// 沙箱内使用：
//   onchainos wallet login --phase init --base-url https://<your-project>.deno.dev
//
// 安全：部署后请把 ACCESS_TOKEN 改成你自己的随机字符串（环境变量）

const OKX_BASE = "https://web3.okx.com";
const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN") ?? ""; // 留空则不鉴权（仅测试用）

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // 健康检查
    if (url.pathname === "/" || url.pathname === "/health") {
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

    // 透传到 OKX
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

      // 透传响应
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
