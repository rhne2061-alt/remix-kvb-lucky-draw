# KVB Lucky Draw Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复当前启动即白屏的问题，并把“抽奖提交/邀请码核销/Google Sheets 同步/运营后台写入”迁移到 Vercel Functions，实现匿名用户参与、仅运营可读写数据的安全架构。

**Architecture:** 前端继续使用 Vite + React。参与者使用 Firebase Anonymous Auth 获取稳定 uid；参与者不再直接写 Firestore，而是通过 `/api/draw` 提交抽奖请求，由 Vercel Functions 使用 Firebase Admin 写入 Firestore 并（可选）同步到 Google Sheets。运营员通过服务端鉴权（PIN 或 Firebase 自定义 claims）访问运营 API，读取/修改配置与邀请码。

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind, Firebase (Auth+Firestore), Vercel Functions (Node), firebase-admin, Vitest (+ React Testing Library 可选), Playwright 可选

---

## Target State（落地后的关键约束）

- 参与者
  - 必须能打开页面、注册并抽奖
  - 使用 Firebase 匿名登录拿到 uid
  - 参与者客户端不具备 Firestore 直接写权限
  - 参与者不会接触任何运营 PIN、Google OAuth token、管理接口密钥
- 运营
  - 仅运营可读写配置、邀请码、抽奖日志
  - 运营操作走服务端 API，服务端用 Admin 权限写 Firestore
- 数据
  - Firestore rules 默认拒绝全部读写，仅对必要公开数据开放只读（如确有需要）

---

### Task 1: 修复启动白屏（阻断级）

**Files:**
- Modify: [App.tsx](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/App.tsx#L1-L5)

- [ ] **Step 1: 复现并确认错误**
  - Run: `npm run dev`
  - 访问: `http://localhost:3000/`
  - 预期: 控制台出现 `ReferenceError: useRef is not defined`，页面白屏

- [ ] **Step 2: 写最小修复**

将 import 改为（仅补齐 useRef）：

```ts
import React, { useEffect, useRef, useState } from "react";
```

- [ ] **Step 3: 验证**
  - Run: `npm run lint`
  - Expected: 不再出现 `Cannot find name 'useRef'`
  - 打开页面确认 UI 出现且可交互

---

### Task 2: 把抽奖评估逻辑抽成纯函数（为测试与服务端复用做准备）

**Files:**
- Create: `src/domain/evaluateSpin.ts`
- Modify: [App.tsx](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/App.tsx)（将 `handleSpinStartEvaluation` 内“概率与降级逻辑”迁移到纯函数）

- [ ] **Step 1: 新建纯函数文件**

```ts
import { Prize, RiskConfig } from "../types";

export type SpinEvaluation =
  | {
      ok: true;
      winningPrize: Prize;
      originalPrize?: Prize;
      isDowngraded: boolean;
      reason?: string;
    }
  | {
      ok: false;
      error: string;
    };

export function evaluateSpin(params: {
  prizes: Prize[];
  riskConfig: RiskConfig;
  isGoldenHour: boolean;
  roll?: number;
}): SpinEvaluation {
  const { prizes, riskConfig, isGoldenHour } = params;
  const roll = params.roll ?? Math.random();

  let adjustedPrizes = prizes.map((p) => ({ ...p }));

  adjustedPrizes = adjustedPrizes.map((p) => {
    if (["gold10g", "ninja250", "macbook", "iphone16"].includes(p.id)) {
      return { ...p, baseProbability: 0 };
    }
    return p;
  });

  if (riskConfig.timeReleaseEnabled) {
    if (isGoldenHour) {
      adjustedPrizes = adjustedPrizes.map((p) => {
        if (p.id === "gold10g") return { ...p, baseProbability: p.baseProbability * 2.5 };
        if (p.id === "ninja250") return { ...p, baseProbability: p.baseProbability * 10 };
        if (p.id === "macbook") return { ...p, baseProbability: p.baseProbability * 5 };
        return p;
      });
    } else {
      adjustedPrizes = adjustedPrizes.map((p) => {
        if (p.id === "gold10g") return { ...p, baseProbability: 0 };
        if (p.id === "ninja250") return { ...p, baseProbability: p.baseProbability * 0.1 };
        if (p.id === "macbook") return { ...p, baseProbability: p.baseProbability * 0.2 };
        return p;
      });
    }
  }

  const totalWeight = adjustedPrizes.reduce((sum, p) => sum + p.baseProbability, 0);
  const normalizedPrizes = adjustedPrizes.map((p) => ({
    ...p,
    prob: totalWeight > 0 ? p.baseProbability / totalWeight : 0,
  }));

  let cumulative = 0;
  let selectedPrize = normalizedPrizes[normalizedPrizes.length - 1];
  for (const p of normalizedPrizes) {
    cumulative += p.prob;
    if (roll <= cumulative) {
      selectedPrize = p;
      break;
    }
  }

  let actualPrize = prizes.find((p) => p.id === selectedPrize.id);
  if (!actualPrize) {
    return { ok: false, error: "Selected prize not found." };
  }

  let originalPrizeObj: Prize | undefined;
  let isDowngraded = false;
  let downgradeReason = "";

  if (
    riskConfig.stockCapEnabled &&
    ["gold10g", "ninja250", "macbook", "iphone16"].includes(actualPrize.id)
  ) {
    if (actualPrize.currentStock <= 0) {
      originalPrizeObj = { ...actualPrize };
      isDowngraded = true;
      downgradeReason = `Stok Habis / Limit Mingguan ${actualPrize.level} Tercapai.`;

      const alt5 = prizes.find((p) => p.id === "whitepaper");
      const alt6 = prizes.find((p) => p.id === "gold_guide");
      actualPrize = alt5 && alt5.currentStock > 0 ? alt5 : alt6 ?? actualPrize;
    }
  }

  return {
    ok: true,
    winningPrize: actualPrize,
    originalPrize: originalPrizeObj,
    isDowngraded,
    reason: downgradeReason || undefined,
  };
}
```

- [ ] **Step 2: 在 App.tsx 中调用 evaluateSpin**
  - 保持 UI/交互不变，只把“概率计算与降级”替换为调用 `evaluateSpin`

---

### Task 3: 引入 Vitest（为关键逻辑补回归测试）

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`（若需补 test 配置则修改现有文件）
- Create: `src/domain/evaluateSpin.test.ts`

- [ ] **Step 1: 安装依赖**
  - Run: `npm i -D vitest @vitest/coverage-v8`

- [ ] **Step 2: 添加测试脚本**

在 `package.json` 增加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 3: 写 1 个最小回归测试（覆盖降级分支）**

```ts
import { describe, expect, test } from "vitest";
import { evaluateSpin } from "./evaluateSpin";
import type { Prize, RiskConfig } from "../types";

test("downgrades premium prize when stock is 0", () => {
  const prizes: Prize[] = [
    {
      id: "gold10g",
      level: "Juara 1",
      levelZh: "一等奖",
      label: "Gold",
      labelZh: "Gold",
      iconName: "Gift",
      baseProbability: 1,
      initialStock: 0,
      currentStock: 0,
      weeklyCap: 0,
      color: "#000",
      textColor: "#fff",
    },
    {
      id: "whitepaper",
      level: "Juara 5",
      levelZh: "五等奖",
      label: "Whitepaper",
      labelZh: "Whitepaper",
      iconName: "FileText",
      baseProbability: 0,
      initialStock: 10,
      currentStock: 10,
      weeklyCap: 10,
      color: "#000",
      textColor: "#fff",
    },
    {
      id: "gold_guide",
      level: "Juara 6",
      levelZh: "六等奖",
      label: "Guide",
      labelZh: "Guide",
      iconName: "BookOpen",
      baseProbability: 0,
      initialStock: 10,
      currentStock: 10,
      weeklyCap: 10,
      color: "#000",
      textColor: "#fff",
    },
  ];

  const riskConfig: RiskConfig = {
    stockCapEnabled: true,
    timeReleaseEnabled: false,
    antiFraudEnabled: false,
    timeSlotStart: "19:30",
    timeSlotEnd: "21:00",
    simulatedHour: 20,
    simulatedMinute: 0,
    boostedMultiplier: 5,
  };

  const res = evaluateSpin({ prizes, riskConfig, isGoldenHour: true, roll: 0 });
  expect(res.ok).toBe(true);
  if (res.ok) {
    expect(res.isDowngraded).toBe(true);
    expect(res.originalPrize?.id).toBe("gold10g");
    expect(["whitepaper", "gold_guide"]).toContain(res.winningPrize.id);
  }
});
```

- [ ] **Step 4: 验证**
  - Run: `npm run test:run`
  - Expected: PASS

---

### Task 4: 参与者匿名登录（用于服务端校验与风控）

**Files:**
- Modify: [firebase.ts](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/firebase.ts)
- Modify: [App.tsx](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/App.tsx)

- [ ] **Step 1: 在 firebase.ts 提供确保匿名登录的方法**

```ts
export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}
```

- [ ] **Step 2: App 启动时调用并缓存 uid**
  - 在首次渲染 `useEffect` 中调用 `ensureAnonymousAuth()`
  - 将 uid 放入 state，后续提交抽奖时带上 ID token

---

### Task 5: Vercel Functions：/api/draw（抽奖提交 + 邀请码核销 + 写入日志）

**Files:**
- Create: `api/_lib/firebaseAdmin.ts`
- Create: `api/draw.ts`
- Modify: `package.json`（添加 firebase-admin 依赖）
- Modify: [App.tsx](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/App.tsx)（抽奖不再直接写 Firestore：调用 `/api/draw`）

- [ ] **Step 1: 安装服务端依赖**
  - Run: `npm i firebase-admin`

- [ ] **Step 2: 新建 Admin 初始化**

`api/_lib/firebaseAdmin.ts`

```ts
import admin from "firebase-admin";

function getPrivateKey() {
  const v = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  return v ? v.replace(/\\n/g, "\n") : undefined;
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials.");
  }
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminDb() {
  return admin.firestore(getAdminApp());
}

export async function verifyIdToken(idToken: string) {
  return admin.auth(getAdminApp()).verifyIdToken(idToken);
}
```

- [ ] **Step 3: 实现 /api/draw**

`api/draw.ts`

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb, verifyIdToken } from "./_lib/firebaseAdmin";

type Body = {
  participant: {
    name: string;
    whatsapp: string;
    invitationCode: string;
    deviceId: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const authz = req.headers.authorization || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  const decoded = await verifyIdToken(m[1]).catch(() => null);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  const body = req.body as Body;
  const code = body?.participant?.invitationCode?.trim()?.toUpperCase();
  if (!code) return res.status(400).json({ error: "invitationCode required" });

  const db = getAdminDb();

  const codeRef = db.collection("invitationCodes").doc(code);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) return res.status(400).json({ error: "Invalid invitation code" });
  const codeData = codeSnap.data() as { isUsed?: boolean } | undefined;
  if (codeData?.isUsed) return res.status(400).json({ error: "Invitation code already used" });

  await codeRef.set(
    {
      isUsed: true,
      usedByUid: decoded.uid,
      usedByName: body.participant.name,
      usedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const logId = `log-${Date.now()}`;
  await db.collection("draws").doc(logId).set({
    id: logId,
    createdAt: new Date().toISOString(),
    participantName: body.participant.name,
    participantWhatsapp: body.participant.whatsapp,
    participantKtp: code,
    deviceId: body.participant.deviceId,
    participantUid: decoded.uid,
    status: "PENDING",
  });

  return res.status(200).json({ ok: true, logId });
}
```

- [ ] **Step 4: 前端改为调用 /api/draw**
  - 注册时不再把邀请码标记 used（避免本地作弊），让服务端核销
  - 抽奖时先调用 `/api/draw`，成功后再在本地播放动画并展示结果

---

### Task 6: Firestore 规则收敛（仅运营可读写）

**Files:**
- Modify: [firestore.rules](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/firestore.rules)

- [ ] **Step 1: 拆分数据域**
  - `draws/*`：仅运营可读；客户端不写
  - `settings/*`：仅运营可读写
  - `invitationCodes/*`：仅运营可读写

- [ ] **Step 2: 更新规则（默认拒绝 + 最小放行）**

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOperator() {
      return isSignedIn() && request.auth.token.operator == true;
    }

    match /{document=**} {
      allow read, write: if false;
    }

    match /settings/{docId} {
      allow read, write: if isOperator();
    }

    match /draws/{drawId} {
      allow read, write: if isOperator();
    }

    match /invitationCodes/{codeId} {
      allow read, write: if isOperator();
    }
  }
}
```

---

### Task 7: 运营员鉴权（为 operator claim 建立闭环）

**Files:**
- Create: `api/operator/login.ts`（返回自定义 token 或设置 claims）
- Modify: [App.tsx](file:///c:/Users/admin/Desktop/remix-kvb-lucky-draw/src/App.tsx)（运营登录改为调用服务端）

- [ ] **Step 1: 选择一种运营员方案（推荐：Firebase custom claims）**
  - 维护一组运营员 Firebase UID 白名单（环境变量或 Firestore operatorOnly 文档）
  - 用 Admin SDK 给运营员用户设置 `operator: true` claim
  - 前端用 Firebase Auth 登录运营员账号（邮箱/密码或 magic link），拿到 claim 后才能展示后台

- [ ] **Step 2: 暂时过渡（如果现在没有运营员账号体系）**
  - `/api/operator/login` 校验 PIN 后返回一个短期有效的服务端 session（httpOnly cookie）
  - 所有运营 API 校验 cookie

---

### Task 8: Google Sheets 同步改造（敏感 token 不进前端）

**Files:**
- Modify: `src/utils/sheets.ts`（前端只发“请求同步”，不携带 token）
- Create: `api/sheets/sync.ts`（服务端执行 sync）

- [ ] **Step 1: 确认选型**
  - 优先：服务端使用 Service Account 写 Google Sheets（避免 OAuth token）
  - 备选：Apps Script Webhook（不保证可观测性，需补返回校验）

- [ ] **Step 2: 服务端同步接口**
  - 输入：logId / drawResult
  - 输出：success/failed，失败原因可观测

---

### Task 9: 第二轮浏览器回归清单（每次改动都跑）

**Checklist:**
- [ ] 首页可打开，无控制台 error
- [ ] 注册：姓名/whatsapp/邀请码校验正常，邀请码重复被拒绝
- [ ] 抽奖：能转动并出结果
- [ ] 刷新页面：状态合理（不泄露运营能力）
- [ ] 运营登录：未登录不可见控制台；登录后可见
- [ ] 后台改配置：能落库且参与者无权读写

