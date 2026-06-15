# KVB Lucky Draw 2026 — Deployment Guide

## What's New (vs the original)

The prize image upload flow was rewritten end-to-end so the
uploaded photo now lives in **Firebase Storage** instead of being
pushed as a 100 KB base64 blob through Firestore. The downstream
effects:

- ✅ Operator can upload any prize photo up to **8 MB** (was 2 MB).
- ✅ Customers see the photo via Firebase's **CDN** (no per-customer
  bundle payload).
- ✅ `settings/global` document stays small (only metadata, no
  image bytes) — no more `FIRESTORE_DATA_SIZE_EXCEEDED` errors.
- ✅ Clearing a prize image also deletes the Storage object so the
  bucket doesn't fill up with orphans.

The legacy `customImageBase64` path is still wired up for offline
use, but the operator console now writes through Firebase Storage
by default.

## 1. Firebase Console setup (one time, ~3 minutes)

1. Open https://console.firebase.google.com/ and pick the existing
   project `ai-studio-applet-webapp-f2e41` (or create a new one).
2. Left sidebar → **Build → Storage** → **Get started**.
3. Pick **Production mode** → Next → pick a region → **Enable**.
4. Open the **Rules** tab and paste the contents of
   `storage.rules` (already in the repo). Click **Publish**.

> ⚠️ If you skip this step the upload will fail with a `403`
> because the default rules deny writes from browser clients.

## 2. Build the static bundle

```bash
npm install
npm run build
```

This produces `dist/` (a static SPA). You can host it anywhere
that serves static files.

## 3. Deploy

### Option A — CloudStudio (recommended, free, takes 2 minutes)

1. Go to https://ide.cloud.tencent.com/ and create a new static site.
2. Upload the entire `dist/` folder.
3. After deployment, open the generated URL. Done.

### Option B — Vercel / Netlify / GitHub Pages

These all expect a static build output. Just point the project
root at `dist/`. The Vite config already does the right thing.

### Option C — Self-hosted (Nginx / Apache)

```nginx
server {
  listen 80;
  server_name your.domain;
  root /var/www/kvb-lucky-draw/dist;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri /index.html;
  }

  # Cache static assets for a year
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

## 4. First time setup checklist

- [ ] Open the deployed URL.
- [ ] Scroll to the footer → click **INSIDER ZONE** → enter PIN `888000`.
- [ ] The **Gambar** tab opens by default. Pick any prize card and
      drop a PNG/JPG/WEBP/GIF (≤ 8 MB).
- [ ] You should see a green toast like
      `✅ Berhasil diunggah (180 KB, dipublikasikan ke CDN)`.
- [ ] Refresh the page; the photo should still be there.
- [ ] Open the same URL on a different device — it should also show
      the photo (it comes from Firebase Storage, not from your
      device's localStorage).

## 5. Optional: change the operator PIN

The PIN is now a SHA-256 hash, not a plain string. To change it:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_NEW_PIN').digest('hex'))"
```

Open `src/App.tsx` and replace the `EXPECTED_PIN_HASH` constant
with the output. Rebuild and redeploy.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Upload shows "上传失败: Storage permission denied" | Storage rules not published | Re-paste `storage.rules` in Firebase Console |
| Upload succeeds but `<img>` shows broken image | CORS on the Storage bucket | Firebase Storage CORS is open by default; double-check you didn't add a custom CORS block |
| Image visible in console but not in 8-cell grid | Browser cached the old HTML | Hard refresh (Ctrl+Shift+R) or change the cache header in your CDN |
| `Storage quota exceeded` | The default bucket is 5 GB free — you've used it | Upgrade to a paid plan or rotate to a new bucket |

## 7. What still depends on Firestore

- `settings/global` — risk config, metrics, sheets config, custom
  background/logo (as base64 — these are tiny)
- `draws/` — every recorded lucky draw

The prize photos are no longer routed through Firestore. If you
want to **remove** the `prizes` field from `settings/global`, open
Firebase Console → Firestore → `settings/global` → delete the
`prizes` key. New writes from the app will only re-create it if
the operator changes risk/metrics/sheets.

## 8. Cost expectations (Google free tier)

| Item | Free limit | KVB usage |
|---|---|---|
| Firestore reads | 50K/day | ~100/day |
| Firestore writes | 20K/day | ~200/day |
| Storage | 5 GB | ~10 MB (after months of uploads) |
| Storage download | 1 GB/day | ~100 MB/day (a few hundred customers) |

You're well within the free tier for a single-event launch.
