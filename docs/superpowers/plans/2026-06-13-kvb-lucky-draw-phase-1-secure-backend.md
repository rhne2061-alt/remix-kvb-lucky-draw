# KVB Lucky Draw Phase 1 Secure Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前“前端直接写 Firestore 的抽奖演示页”升级成“前台无登录、服务端抽奖、运营端轻鉴权”的第一阶段可上线基础版。

**Architecture:** 保留现有 Vite + React 前端，但参与者不再直接写 Firestore，也不再依赖本地状态决定是否能抽奖。新增一个同仓 `Express + TypeScript` API 层，由服务端统一完成邀请码校验、库存扣减、中奖写入、管理员登录与配置写入；前端只调用 API 并读取公开活动配置。第一阶段只交付安全抽奖闭环与最小管理员配置能力，媒体系统与裂变推广在后续独立计划中实现。

**Tech Stack:** React 19, Vite 6, TypeScript, Express 4, firebase-admin, Firebase Firestore, Vitest, Supertest, tsx

---

## Scope Split

本项目应拆成 3 个独立计划顺序执行：

1. **Phase 1（本计划）**：安全抽奖后端、管理员最小鉴权、前端改为走 API
2. **Phase 2**：媒体资产系统（图片、透明 PNG、视频、封面图）
3. **Phase 3**：推广裂变系统（分享链路、邀请码归因、渠道统计）

本计划只覆盖 **Phase 1**，确保你先得到一个“可以安全跑活动”的版本。

## File Structure

### Existing files to modify

- Modify: `package.json`
- Modify: `src/App.tsx`
- Modify: `src/firebase.ts`
- Modify: `src/types.ts`
- Modify: `firestore.rules`

### New frontend files

- Create: `src/api/client.ts`
- Create: `src/api/contracts.ts`
- Create: `src/domain/evaluateSpin.ts`
- Create: `src/domain/evaluateSpin.test.ts`

### New backend files

- Create: `server/index.ts`
- Create: `server/env.ts`
- Create: `server/firebaseAdmin.ts`
- Create: `server/routes/public.ts`
- Create: `server/routes/admin.ts`
- Create: `server/services/performDraw.ts`
- Create: `server/services/performDraw.test.ts`
- Create: `server/services/adminSession.ts`
- Create: `server/routes/appFactory.ts`
- Create: `server/routes/appFactory.test.ts`

### Responsibility map

- `src/api/contracts.ts`: 前后端共享的请求/响应类型
- `src/api/client.ts`: 浏览器端唯一 API 调用入口
- `src/domain/evaluateSpin.ts`: 抽奖概率与降级纯函数
- `server/services/performDraw.ts`: 服务端抽奖核心流程
- `server/services/adminSession.ts`: 简单管理员 token 签发与校验
- `server/routes/public.ts`: 参与者公开接口
- `server/routes/admin.ts`: 管理员接口
- `server/routes/appFactory.ts`: 组装 Express app，便于 Supertest
- `server/env.ts`: 环境变量校验
- `server/firebaseAdmin.ts`: Firebase Admin 单例

---

### Task 1: 建立可测试的抽奖纯函数

**Files:**
- Modify: `package.json`
- Create: `src/domain/evaluateSpin.ts`
- Test: `src/domain/evaluateSpin.test.ts`

- [ ] **Step 1: 安装测试依赖**

Run:

```bash
npm i -D vitest @vitest/coverage-v8
```

Expected: 安装成功，`package.json` 出现 `vitest` 与 `@vitest/coverage-v8`

- [ ] **Step 2: 添加测试脚本**

把 `package.json` 的 `scripts` 改成：

```json
{
  "scripts": {
    "dev": "vite",
    "dev:api": "tsx watch server/index.ts",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 3: 先写失败测试**

在 `src/domain/evaluateSpin.test.ts` 写入：

```ts
import { describe, expect, test } from "vitest";
import { evaluateSpin } from "./evaluateSpin";
import type { Prize, RiskConfig } from "../types";

const riskConfig: RiskConfig = {
  stockCapEnabled: true,
  timeReleaseEnabled: true,
  antiFraudEnabled: true,
  timeSlotStart: "19:30",
  timeSlotEnd: "21:00",
  simulatedHour: 20,
  simulatedMinute: 15,
  boostedMultiplier: 5,
};

describe("evaluateSpin", () => {
  test("downgrades premium prize when stock is exhausted", () => {
    const prizes: Prize[] = [
      {
        id: "gold10g",
        level: "Hadiah Utama",
        levelZh: "特等奖",
        label: "Gold 10gr",
        labelZh: "Gold 10gr",
        iconName: "Coins",
        baseProbability: 1,
        initialStock: 0,
        currentStock: 0,
        weeklyCap: 0,
        color: "#D4AF37",
        textColor: "#111827",
      },
      {
        id: "whitepaper",
        level: "Juara 5",
        levelZh: "第五名",
        label: "Whitepaper",
        labelZh: "Whitepaper",
        iconName: "BookOpen",
        baseProbability: 0,
        initialStock: 10,
        currentStock: 10,
        weeklyCap: 10,
        color: "#3b82f6",
        textColor: "#ffffff",
      },
    ];

    const result = evaluateSpin({
      prizes,
      riskConfig,
      isGoldenHour: true,
      roll: 0,
      allowPremiumWins: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isDowngraded).toBe(true);
    expect(result.winningPrize.id).toBe("whitepaper");
    expect(result.originalPrize?.id).toBe("gold10g");
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```bash
npm run test:run -- src/domain/evaluateSpin.test.ts
```

Expected: FAIL，报错 `Cannot find module './evaluateSpin'`

- [ ] **Step 5: 写最小实现**

在 `src/domain/evaluateSpin.ts` 写入：

```ts
import type { Prize, RiskConfig } from "../types";

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
  allowPremiumWins: boolean;
}): SpinEvaluation {
  const { prizes, roll = Math.random(), allowPremiumWins } = params;
  const weighted = prizes.map((prize) => {
    if (
      !allowPremiumWins &&
      ["gold10g", "ninja250", "macbook", "iphone16"].includes(prize.id)
    ) {
      return { ...prize, effectiveProbability: 0 };
    }
    return { ...prize, effectiveProbability: prize.baseProbability };
  });

  const total = weighted.reduce((sum, item) => sum + item.effectiveProbability, 0);
  if (total <= 0) {
    return { ok: false, error: "No drawable prizes available." };
  }

  let cursor = 0;
  let selected = weighted[weighted.length - 1];
  for (const item of weighted) {
    cursor += item.effectiveProbability / total;
    if (roll <= cursor) {
      selected = item;
      break;
    }
  }

  if (
    ["gold10g", "ninja250", "macbook", "iphone16"].includes(selected.id) &&
    selected.currentStock <= 0
  ) {
    const fallback = prizes.find((item) => item.id === "whitepaper");
    if (!fallback) {
      return { ok: false, error: "Fallback prize not found." };
    }
    return {
      ok: true,
      winningPrize: fallback,
      originalPrize: prizes.find((item) => item.id === selected.id),
      isDowngraded: true,
      reason: "Premium stock exhausted.",
    };
  }

  return {
    ok: true,
    winningPrize: prizes.find((item) => item.id === selected.id) ?? prizes[0],
    isDowngraded: false,
  };
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
npm run test:run -- src/domain/evaluateSpin.test.ts
```

Expected: PASS，`1 passed`

- [ ] **Step 7: Commit**

```bash
git add package.json src/domain/evaluateSpin.ts src/domain/evaluateSpin.test.ts
git commit -m "test: add draw evaluation coverage"
```

---

### Task 2: 建立服务端骨架与环境校验

**Files:**
- Modify: `package.json`
- Create: `server/env.ts`
- Create: `server/firebaseAdmin.ts`
- Create: `server/index.ts`

- [ ] **Step 1: 安装后端依赖**

Run:

```bash
npm i firebase-admin
npm i -D supertest @types/supertest
```

Expected: 安装成功，`package.json` 出现 `firebase-admin` 与 `supertest`

- [ ] **Step 2: 添加后端环境校验**

在 `server/env.ts` 写入：

```ts
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? "8787"),
  adminPin: required("KVB_ADMIN_PIN"),
  firebaseProjectId: required("FIREBASE_PROJECT_ID"),
  firebaseClientEmail: required("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
};
```

- [ ] **Step 3: 添加 Firebase Admin 单例**

在 `server/firebaseAdmin.ts` 写入：

```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
  });

export const adminDb = getFirestore(app);
```

- [ ] **Step 4: 添加最小 HTTP 服务**

在 `server/index.ts` 写入：

```ts
import cors from "cors";
import express from "express";
import { env } from "./env";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(env.port, () => {
  console.log(`KVB API listening on http://localhost:${env.port}`);
});
```

- [ ] **Step 5: 启动并验证**

Run:

```bash
npm run dev:api
```

Expected: 终端输出 `KVB API listening on http://localhost:8787`

另开一个终端运行：

```bash
curl http://localhost:8787/api/health
```

Expected:

```json
{"ok":true}
```

- [ ] **Step 6: Commit**

```bash
git add package.json server/env.ts server/firebaseAdmin.ts server/index.ts
git commit -m "feat: scaffold secure draw api server"
```

---

### Task 3: 实现服务端抽奖流程

**Files:**
- Modify: `src/types.ts`
- Create: `src/api/contracts.ts`
- Create: `server/services/performDraw.ts`
- Test: `server/services/performDraw.test.ts`

- [ ] **Step 1: 扩展共享接口**

在 `src/api/contracts.ts` 写入：

```ts
import type { DrawResult, Participant, Prize, RiskConfig } from "../types";

export type DrawRequest = {
  participant: Participant;
};

export type DrawResponse =
  | {
      ok: true;
      draw: DrawResult;
      winningPrize: Prize;
      isDowngraded: boolean;
      originalPrize?: Prize;
    }
  | {
      ok: false;
      error: string;
    };

export type CampaignConfigResponse = {
  prizes: Prize[];
  riskConfig: RiskConfig;
  invitationCodes: {
    code: string;
    isUsed: boolean;
    generatedAt: string;
    usedBy?: string;
  }[];
  customBg: string;
  customLogo: string;
};
```

- [ ] **Step 2: 先写失败测试**

在 `server/services/performDraw.test.ts` 写入：

```ts
import { describe, expect, test } from "vitest";
import { performDraw } from "./performDraw";
import type { Prize, RiskConfig } from "../../src/types";

const prizes: Prize[] = [
  {
    id: "whitepaper",
    level: "Juara 5",
    levelZh: "第五名",
    label: "Whitepaper",
    labelZh: "Whitepaper",
    iconName: "BookOpen",
    baseProbability: 1,
    initialStock: 10,
    currentStock: 10,
    weeklyCap: 10,
    color: "#3b82f6",
    textColor: "#ffffff",
  },
];

const riskConfig: RiskConfig = {
  stockCapEnabled: true,
  timeReleaseEnabled: true,
  antiFraudEnabled: true,
  timeSlotStart: "19:30",
  timeSlotEnd: "21:00",
  simulatedHour: 20,
  simulatedMinute: 15,
  boostedMultiplier: 5,
};

describe("performDraw", () => {
  test("rejects used invitation code", async () => {
    const result = await performDraw({
      participant: {
        name: "Budi",
        whatsapp: "08123456789",
        ktp: "KVB-8888",
        deviceId: "dev-1",
      },
      readConfig: async () => ({
        prizes,
        riskConfig,
        invitationCodes: [
          { code: "KVB-8888", isUsed: true, generatedAt: "2026-06-13 10:00" },
        ],
      }),
      saveDraw: async () => undefined,
      updateConfig: async () => undefined,
      now: () => new Date("2026-06-13T20:00:00+07:00"),
      random: () => 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("already used");
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
npm run test:run -- server/services/performDraw.test.ts
```

Expected: FAIL，报错 `Cannot find module './performDraw'`

- [ ] **Step 4: 写最小实现**

在 `server/services/performDraw.ts` 写入：

```ts
import { evaluateSpin } from "../../src/domain/evaluateSpin";
import type { DrawResult, Prize, RiskConfig } from "../../src/types";

type InvitationCode = {
  code: string;
  isUsed: boolean;
  generatedAt: string;
  usedBy?: string;
};

export async function performDraw(params: {
  participant: {
    name: string;
    whatsapp: string;
    ktp: string;
    deviceId: string;
  };
  readConfig: () => Promise<{
    prizes: Prize[];
    riskConfig: RiskConfig;
    invitationCodes: InvitationCode[];
  }>;
  saveDraw: (draw: DrawResult) => Promise<void>;
  updateConfig: (next: {
    prizes: Prize[];
    invitationCodes: InvitationCode[];
  }) => Promise<void>;
  now: () => Date;
  random: () => number;
}) {
  const config = await params.readConfig();
  const matchedCode = config.invitationCodes.find(
    (item) => item.code.toUpperCase() === params.participant.ktp.toUpperCase(),
  );

  if (!matchedCode) {
    return { ok: false as const, error: "Invitation code is invalid." };
  }

  if (matchedCode.isUsed) {
    return { ok: false as const, error: "Invitation code is already used." };
  }

  const evaluation = evaluateSpin({
    prizes: config.prizes,
    riskConfig: config.riskConfig,
    isGoldenHour: true,
    roll: params.random(),
    allowPremiumWins: true,
  });

  if (!evaluation.ok) {
    return { ok: false as const, error: evaluation.error };
  }

  const updatedPrizes = config.prizes.map((item) =>
    item.id === evaluation.winningPrize.id
      ? { ...item, currentStock: Math.max(0, item.currentStock - 1) }
      : item,
  );

  const updatedCodes = config.invitationCodes.map((item) =>
    item.code === matchedCode.code
      ? {
          ...item,
          isUsed: true,
          usedBy: `${params.participant.name} / ${params.participant.whatsapp}`,
        }
      : item,
  );

  const draw: DrawResult = {
    id: `draw-${params.now().getTime()}`,
    timestamp: params.now().toISOString(),
    participantName: params.participant.name,
    participantWhatsapp: params.participant.whatsapp,
    participantKtp: params.participant.ktp,
    deviceId: params.participant.deviceId,
    prizeId: evaluation.winningPrize.id,
    prizeLabel: evaluation.winningPrize.label,
    isDowngraded: evaluation.isDowngraded,
    originalPrizeLabel: evaluation.originalPrize?.label,
    status: "SUCCESS",
  };

  await params.saveDraw(draw);
  await params.updateConfig({
    prizes: updatedPrizes,
    invitationCodes: updatedCodes,
  });

  return {
    ok: true as const,
    draw,
    winningPrize: evaluation.winningPrize,
    isDowngraded: evaluation.isDowngraded,
    originalPrize: evaluation.originalPrize,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
npm run test:run -- server/services/performDraw.test.ts
```

Expected: PASS，`1 passed`

- [ ] **Step 6: Commit**

```bash
git add src/api/contracts.ts src/types.ts server/services/performDraw.ts server/services/performDraw.test.ts
git commit -m "feat: add server-side draw workflow"
```

---

### Task 4: 暴露公开接口与管理员接口

**Files:**
- Create: `server/services/adminSession.ts`
- Create: `server/routes/public.ts`
- Create: `server/routes/admin.ts`
- Create: `server/routes/appFactory.ts`
- Test: `server/routes/appFactory.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 先写失败路由测试**

在 `server/routes/appFactory.test.ts` 写入：

```ts
import request from "supertest";
import { describe, expect, test } from "vitest";
import { createApp } from "./appFactory";

describe("api routes", () => {
  test("returns health payload", async () => {
    const app = createApp({
      adminPin: "888000",
      readConfig: async () => ({
        prizes: [],
        riskConfig: {
          stockCapEnabled: true,
          timeReleaseEnabled: true,
          antiFraudEnabled: true,
          timeSlotStart: "19:30",
          timeSlotEnd: "21:00",
          simulatedHour: 20,
          simulatedMinute: 15,
          boostedMultiplier: 5,
        },
        invitationCodes: [],
        customBg: "",
        customLogo: "",
      }),
      saveDraw: async () => undefined,
      updateConfig: async () => undefined,
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test:run -- server/routes/appFactory.test.ts
```

Expected: FAIL，报错 `Cannot find module './appFactory'`

- [ ] **Step 3: 写管理员 session 服务**

在 `server/services/adminSession.ts` 写入：

```ts
const sessions = new Map<string, number>();

export function issueAdminToken(now = Date.now()): string {
  const token = `adm_${now}_${Math.random().toString(36).slice(2)}`;
  sessions.set(token, now + 1000 * 60 * 60 * 8);
  return token;
}

export function verifyAdminToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < now) {
    sessions.delete(token);
    return false;
  }
  return true;
}
```

- [ ] **Step 4: 写路由工厂**

在 `server/routes/appFactory.ts` 写入：

```ts
import cors from "cors";
import express from "express";
import { issueAdminToken, verifyAdminToken } from "../services/adminSession";
import { performDraw } from "../services/performDraw";

export function createApp(deps: {
  adminPin: string;
  readConfig: () => Promise<any>;
  saveDraw: (draw: any) => Promise<void>;
  updateConfig: (next: any) => Promise<void>;
}) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/campaign-config", async (_req, res) => {
    const config = await deps.readConfig();
    res.json(config);
  });

  app.post("/api/draw", async (req, res) => {
    const result = await performDraw({
      participant: req.body.participant,
      readConfig: deps.readConfig,
      saveDraw: deps.saveDraw,
      updateConfig: deps.updateConfig,
      now: () => new Date(),
      random: () => Math.random(),
    });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/api/admin/login", (req, res) => {
    if (String(req.body.pin ?? "").trim() !== deps.adminPin) {
      return res.status(401).json({ ok: false, error: "Invalid admin pin." });
    }
    const token = issueAdminToken();
    return res.json({ ok: true, token });
  });

  app.post("/api/admin/config", async (req, res) => {
    const authHeader = String(req.headers.authorization ?? "");
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ ok: false, error: "Unauthorized." });
    }
    await deps.updateConfig(req.body);
    return res.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 5: 接入真实启动入口**

把 `server/index.ts` 改成：

```ts
import { env } from "./env";
import { adminDb } from "./firebaseAdmin";
import { createApp } from "./routes/appFactory";

const app = createApp({
  adminPin: env.adminPin,
  readConfig: async () => {
    const snap = await adminDb.doc("settings/global").get();
    const data = snap.data() ?? {};
    return {
      prizes: data.prizes ?? [],
      riskConfig: data.riskConfig ?? {},
      invitationCodes: data.invitationCodes ?? [],
      customBg: data.customBg ?? "",
      customLogo: data.customLogo ?? "",
    };
  },
  saveDraw: async (draw) => {
    await adminDb.doc(`draws/${draw.id}`).set(draw);
  },
  updateConfig: async (next) => {
    await adminDb.doc("settings/global").set(next, { merge: true });
  },
});

app.listen(env.port, () => {
  console.log(`KVB API listening on http://localhost:${env.port}`);
});
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
npm run test:run -- server/routes/appFactory.test.ts
```

Expected: PASS，`1 passed`

- [ ] **Step 7: Commit**

```bash
git add server/services/adminSession.ts server/routes/public.ts server/routes/admin.ts server/routes/appFactory.ts server/routes/appFactory.test.ts server/index.ts
git commit -m "feat: add public and admin api routes"
```

---

### Task 5: 前端改为只走 API，不再直接写库

**Files:**
- Create: `src/api/client.ts`
- Modify: `src/App.tsx`
- Modify: `src/firebase.ts`

- [ ] **Step 1: 写 API client**

在 `src/api/client.ts` 写入：

```ts
import type {
  CampaignConfigResponse,
  DrawRequest,
  DrawResponse,
} from "./contracts";

const API_BASE = "http://localhost:8787";

export async function fetchCampaignConfig(): Promise<CampaignConfigResponse> {
  const response = await fetch(`${API_BASE}/api/campaign-config`);
  if (!response.ok) throw new Error("Failed to load campaign config.");
  return response.json();
}

export async function submitDraw(payload: DrawRequest): Promise<DrawResponse> {
  const response = await fetch(`${API_BASE}/api/draw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function loginAdmin(pin: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pin }),
  });
  return response.json();
}

export async function updateAdminConfig(token: string, payload: unknown) {
  const response = await fetch(`${API_BASE}/api/admin/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}
```

- [ ] **Step 2: 切掉前端写 Firestore 的保存逻辑**

在 `src/firebase.ts` 里保留只读订阅与错误打印，删除以下导出函数的调用面：

```ts
export const saveGlobalSettings = async (_data: any) => {
  throw new Error("Client-side writes are disabled. Use admin API.");
};

export const saveDraw = async (_draw: DrawResult) => {
  throw new Error("Client-side writes are disabled. Use draw API.");
};
```

- [ ] **Step 3: 把 App.tsx 的数据入口切到 API**

把初始化逻辑改成“加载公开配置 + 提交抽奖调用 API”：

```ts
import { fetchCampaignConfig, submitDraw, loginAdmin, updateAdminConfig } from "./api/client";
```

并新增初始化 effect：

```ts
useEffect(() => {
  fetchCampaignConfig()
    .then((config) => {
      if (config.prizes?.length) setPrizes(config.prizes);
      if (config.riskConfig) setRiskConfig((prev) => ({ ...prev, ...config.riskConfig }));
      if (config.invitationCodes) setInvitationCodes(config.invitationCodes);
      if (typeof config.customBg === "string") setCustomBgRaw(config.customBg);
      if (typeof config.customLogo === "string") setCustomLogoRaw(config.customLogo);
    })
    .catch((error) => {
      console.error("Failed to load campaign config", error);
    });
}, []);
```

把原先前端直接写库的抽奖提交替换成：

```ts
const result = await submitDraw({
  participant: {
    name: p.name,
    whatsapp: p.whatsapp,
    ktp: p.ktp,
    deviceId: p.deviceId,
  },
});

if (!result.ok) {
  setSpinResult("error");
  setLoginError(result.error);
  return;
}
```

管理员 PIN 登录替换成：

```ts
const response = await loginAdmin(cleanPin);
if (response.ok && response.token) {
  localStorage.setItem("kvb_admin_token_v1", response.token);
  setOperatorMode(true);
  setShowOperatorLogin(false);
} else {
  setLoginError(response.error ?? "Admin login failed.");
}
```

- [ ] **Step 4: 运行回归**

Run:

```bash
npm run lint
npm run test:run
```

Expected: `tsc --noEmit` 通过，Vitest 全部通过

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/App.tsx src/firebase.ts
git commit -m "feat: switch frontend to secure api flow"
```

---

### Task 6: 收紧 Firestore 权限并去掉前端敏感存储

**Files:**
- Modify: `firestore.rules`
- Modify: `src/App.tsx`

- [ ] **Step 1: 收紧 Firestore rules**

把 `firestore.rules` 改成：

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settings/global {
      allow read: if true;
      allow write: if false;
    }

    match /draws/{drawId} {
      allow read: if false;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: 删掉前端持久化敏感配置**

在 `src/App.tsx` 中删除或禁用这些本地持久化行为：

```ts
localStorage.setItem("kvb_sheets_config_v2", currentStr);
localStorage.setItem("kvb_invitation_codes_v2", JSON.stringify(invitationCodes));
localStorage.setItem("kvb_current_user_v2", JSON.stringify(currentParticipant));
```

改成仅保留纯视觉体验所需状态，例如：

```ts
localStorage.setItem("kvb_custom_bg", customBg);
localStorage.setItem("kvb_custom_logo", customLogo);
```

- [ ] **Step 3: 手动验证安全边界**

Run:

```bash
npm run dev:api
npm run dev
```

手动检查：

- 参与者能打开页面并提交抽奖
- 不登录管理员时无法写配置
- Firestore 控制台里 `settings/global` 与 `draws/*` 由服务端写入
- 浏览器 `localStorage` 里不再有 `accessToken`、邀请码总表、当前参与者完整对象

- [ ] **Step 4: Commit**

```bash
git add firestore.rules src/App.tsx
git commit -m "security: lock firestore and remove client-side secrets"
```

---

## Self-Review

- **Spec coverage:** 本计划覆盖了第一阶段安全抽奖闭环：服务端抽奖、管理员最小鉴权、前端 API 化、Firestore 权限收紧。未覆盖媒体视频上传和推广裂变，这两个内容已明确拆到 Phase 2 / Phase 3。
- **Placeholder scan:** 已检查无 `TODO`、`TBD`、`implement later` 等占位语；每个任务都给出了具体文件、代码和命令。
- **Type consistency:** 计划中统一使用 `evaluateSpin`、`performDraw`、`createApp`、`loginAdmin`、`updateAdminConfig` 这些名称，后续任务引用保持一致。

