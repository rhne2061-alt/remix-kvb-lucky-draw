import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  Gift,
  AlertTriangle,
  Award,
  Info,
  X,
  Heart,
  Sparkles,
  CheckCircle,
  Unlock,
  Lock,
  KeyRound,
  ImagePlus,
} from "lucide-react";
import KvbHeader from "./components/KvbHeader";
import GridLottery from "./components/GridLottery";
import RegistrationForm from "./components/RegistrationForm";
import SecurityConsole from "./components/SecurityConsole";
import {
  Prize,
  Participant,
  RiskConfig,
  DrawResult,
  SecurityMetric,
  GoogleSheetsConfig,
} from "./types";
import { INITIAL_PRIZES, generateMockDrawHistory } from "./data";
import { audio } from "./utils/audio";
import { TRANSLATIONS } from "./translations";
import { syncSingleDrawToSheets } from "./utils/sheets";
import ConfettiEffect from "./components/ConfettiEffect";
import { PrizeGraphic } from "./components/PrizeGraphic";
import { subscribeToGlobalSettings, saveGlobalSettings, subscribeToDraws, saveDraw } from "./firebase";
import { idbGet, idbSet, idbDel, lsSet, lsRemove } from "./utils/persist";

// =========================================================================
// 💡 全局默认配置（全局同步器）：如果您已经拿到了 Google Apps Script 网页应用连接（即 /exec 结尾的长链接）
// 可以直接贴在这里。这样，无需任何额外配置，WhatsApp 群里所有任何人通过浏览器参加抽奖时，
// 所有人提交的中奖纪录都会自动、实时汇总保存到您的这同一个谷歌表格中！
// =========================================================================
export const DEFAULT_WEBAPP_URL = "";

// Helper functions to mask user data for privacy in live stream
const maskName = (name: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex > 0) {
    return trimmed.substring(0, spaceIndex) + " xxx";
  }
  if (trimmed.length > 3) {
    return trimmed.substring(0, 3) + "xxx";
  }
  return trimmed + " xxx";
};

const maskWhatsapp = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.trim().replace(/\s+/g, "");
  if (cleaned.length > 5) {
    const visible = cleaned.substring(0, 5);
    const maskedLength = Math.max(4, cleaned.length - 5);
    return visible + "X".repeat(maskedLength);
  }
  return cleaned;
};

const maskCode = (code: string) => {
  if (!code) return "";
  const trimmed = code.trim();
  if (trimmed.startsWith("KVB-")) {
    if (trimmed.length > 6) {
      return trimmed.substring(0, 6) + "XX";
    }
    return trimmed.substring(0, 4) + "XX";
  }
  if (trimmed.length > 8) {
    return trimmed.substring(0, 6) + "X".repeat(trimmed.length - 6);
  }
  if (trimmed.length > 4) {
    return trimmed.substring(0, 3) + "X".repeat(trimmed.length - 3);
  }
  return trimmed + "XX";
};

const stripBase64FromPrize = (p: Prize): Prize => {
  const cleaned = { ...p };
  if (cleaned.customImageBase64?.startsWith("data:") || cleaned.customImageBase64?.startsWith("blob:")) {
    cleaned.customImageBase64 = undefined;
  }
  if (cleaned.customImageLargeBase64?.startsWith("data:") || cleaned.customImageLargeBase64?.startsWith("blob:")) {
    cleaned.customImageLargeBase64 = undefined;
  }
  return cleaned;
};

export default function App() {
  // Symmetrical Multi-language State
  const lang = "id" as "zh" | "id";

  const t = TRANSLATIONS[lang];

  // State variables synchronized with LocalStorage for flawless demonstration
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    try {
      const saved = localStorage.getItem("kvb_prizes_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === INITIAL_PRIZES.length) {
          // 清理上一会话残留的 blob URL（跨会话无效），避免刷新后闪裂图
          return parsed.map((p: Prize) => ({
            ...p,
            customImageBase64: p.customImageBase64?.startsWith("blob:") ? undefined : p.customImageBase64,
            customImageLargeBase64: p.customImageLargeBase64?.startsWith("blob:") ? undefined : p.customImageLargeBase64,
          }));
        }
      }
    } catch (_) {}
    return INITIAL_PRIZES;
  });

  // 跟踪从 IndexedDB 恢复的 blob URL，用于卸载时统一释放
  const restoredBlobUrlsRef = useRef<Map<string, { thumb?: string; large?: string }>>(new Map());
  useEffect(() => {
    const map = restoredBlobUrlsRef.current;
    return () => {
      for (const entry of map.values()) {
        if (entry.thumb) URL.revokeObjectURL(entry.thumb);
        if (entry.large) URL.revokeObjectURL(entry.large);
      }
      map.clear();
    };
  }, []);

  // 启动时从 IndexedDB 恢复奖品图（即使 Cloudinary 失败或 blob URL 已过期）
  useEffect(() => {
    const PRIZE_IDS = INITIAL_PRIZES.map(p => p.id);
    Promise.all(
      PRIZE_IDS.flatMap(id => [
        idbGet(`prize_img_thumb_${id}`).then(blob => ({ id, kind: "thumb" as const, blob })),
        idbGet(`prize_img_large_${id}`).then(blob => ({ id, kind: "large" as const, blob })),
      ]),
    ).then((results) => {
      setPrizes(prev => {
        let changed = false;
        const updated = prev.map(p => {
          const thumbResult = results.find(r => r.id === p.id && r.kind === "thumb");
          const largeResult = results.find(r => r.id === p.id && r.kind === "large");
          let copy = { ...p };
          const entry = restoredBlobUrlsRef.current.get(p.id) ?? {};
          if (thumbResult?.blob instanceof Blob && !copy.customImageBase64) {
            if (entry.thumb) URL.revokeObjectURL(entry.thumb);
            copy.customImageBase64 = URL.createObjectURL(thumbResult.blob);
            entry.thumb = copy.customImageBase64;
            changed = true;
          }
          if (largeResult?.blob instanceof Blob && !copy.customImageLargeBase64) {
            if (entry.large) URL.revokeObjectURL(entry.large);
            copy.customImageLargeBase64 = URL.createObjectURL(largeResult.blob);
            entry.large = copy.customImageLargeBase64;
            changed = true;
          }
          restoredBlobUrlsRef.current.set(p.id, entry);
          return copy;
        });
        return changed ? updated : prev;
      });
    }).catch(() => {});
  }, []);

  const [recentDraws, setRecentDraws] = useState<DrawResult[]>(() => {
    try {
      const saved = localStorage.getItem("kvb_draws_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return generateMockDrawHistory();
  });

  const [currentParticipant, setCurrentParticipant] =
    useState<Participant | null>(() => {
      try {
        const saved = localStorage.getItem("kvb_current_user_v2");
        if (saved) return JSON.parse(saved);
      } catch (_) {}
      return null;
    });

  const [riskConfig, setRiskConfig] = useState<RiskConfig>(() => {
    const fallback = {
      stockCapEnabled: true,
      timeReleaseEnabled: true,
      antiFraudEnabled: true,
      timeSlotStart: "19:30",
      timeSlotEnd: "21:00",
      simulatedHour: 20, // default Golden hour
      simulatedMinute: 15,
      boostedMultiplier: 5,
    };
    try {
      const saved = localStorage.getItem("kvb_risk_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...fallback, ...parsed };
        }
      }
    } catch (_) {}
    return fallback;
  });

  const [metrics, setMetrics] = useState<SecurityMetric>(() => {
    const fallback = {
      totalDraws: 342,
      blockedAttempts: 41,
      successfulDraws: 285,
      downgradedDraws: 14, // Failsafe triggered
    };
    try {
      const saved = localStorage.getItem("kvb_metrics_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...fallback, ...parsed };
        }
      }
    } catch (_) {}
    return fallback;
  });

  // Google Sheets configurations state
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    const fallback = {
      syncMethod: "webapp" as const,
      spreadsheetId: "",
      webappUrl: DEFAULT_WEBAPP_URL,
      accessToken: "",
      autoSync: true,
      isConnected: !!DEFAULT_WEBAPP_URL,
      fields: [
        "timestamp",
        "participantName",
        "participantWhatsapp",
        "participantKtp",
        "deviceId",
        "prizeLabel",
        "status",
      ],
    };
    try {
      const saved = localStorage.getItem("kvb_sheets_config_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...fallback,
            ...parsed,
            webappUrl: parsed.webappUrl || DEFAULT_WEBAPP_URL,
            isConnected: !!(parsed.webappUrl || DEFAULT_WEBAPP_URL),
          };
        }
      }
    } catch (_) {}
    return fallback;
  });

  const [lastWinAlert, setLastWinAlert] = useState<{
    prize: Prize;
    originalPrize?: Prize;
    isDowngraded: boolean;
    reason?: string;
  } | null>(null);
  const [resultRevealOpen, setResultRevealOpen] = useState(false);

  const [userHasDrawn, setUserHasDrawn] = useState<boolean>(() => {
    return localStorage.getItem("kvb_user_has_drawn_v2") === "true";
  });

  const [invitationCodes, setInvitationCodes] = useState(() => {
    try {
      const saved = localStorage.getItem("kvb_invitation_codes_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { code: "KVB-8888", isUsed: false, generatedAt: "2026-06-11 12:00" },
      { code: "KVB-6666", isUsed: false, generatedAt: "2026-06-11 12:05" },
      { code: "KVB-9999", isUsed: false, generatedAt: "2026-06-11 12:10" },
      { code: "KVB-5555", isUsed: false, generatedAt: "2026-06-11 12:15" },
    ];
  });

  useEffect(() => {
    lsSet("kvb_invitation_codes_v2", JSON.stringify(invitationCodes));
  }, [invitationCodes]);

  const handleAddInvitationCode = (code: string) => {
    setInvitationCodes((prev) => {
      if (prev.some((c) => c.code === code)) return prev;
      return [
        ...prev,
        {
          code,
          isUsed: false,
          generatedAt: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 16),
        },
      ];
    });
  };

  const handleAddBulkInvitationCodes = (codes: string[]) => {
    setInvitationCodes((prev) => {
      const now = new Date().toISOString().replace("T", " ").substring(0, 16);
      const newCodes = codes
        .filter((code) => !prev.some((c) => c.code === code))
        .map((code) => ({ code, isUsed: false, generatedAt: now }));
      return [...prev, ...newCodes];
    });
  };

  const handleDeleteInvitationCode = (code: string) => {
    setInvitationCodes((prev) => prev.filter((c) => c.code !== code));
  };

  // Operator / Insider privilege controls (hides / shows sensitive probability displays and control consoles)
  const [operatorMode, setOperatorMode] = useState<boolean>(false);
  const [showOperatorLogin, setShowOperatorLogin] = useState<boolean>(false);
  const [operatorPinInput, setOperatorPinInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  
  const [customBg, setCustomBgRaw] = useState<string>("");
  const customBgBlobRef = useRef<string | null>(null);
  const customBgCloudRef = useRef<string | null>(null);

  useEffect(() => {
    idbGet("bg").then((blob) => {
      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        customBgBlobRef.current = url;
        setCustomBgRaw(url);
      }
    }).catch(() => {});
  }, []);

  const customBgHistoryRef = useRef<string[]>([]);
  const customBgFutureRef = useRef<string[]>([]);
  const customLogoHistoryRef = useRef<string[]>([]);
  const customLogoFutureRef = useRef<string[]>([]);
  const prizeImageHistoryRef = useRef<
    Record<string, { past: string[]; future: string[] }>
  >({});
  const handleUpdateCustomBg = (url: string) => {
    if (!url) {
      if (customBgBlobRef.current) {
        URL.revokeObjectURL(customBgBlobRef.current);
        customBgBlobRef.current = null;
      }
      idbDel("bg").catch(() => {});
      customBgCloudRef.current = null;
    } else if (url.startsWith("blob:")) {
      if (customBgBlobRef.current && customBgBlobRef.current !== url) {
        URL.revokeObjectURL(customBgBlobRef.current);
      }
      customBgBlobRef.current = url;
    } else {
      if (customBgBlobRef.current) {
        URL.revokeObjectURL(customBgBlobRef.current);
        customBgBlobRef.current = null;
      }
      customBgCloudRef.current = url;
    }
    setCustomBgRaw((prev) => {
      if (prev === url) return prev;
      customBgHistoryRef.current.push(prev);
      customBgFutureRef.current = [];
      return url;
    });
  };

  const handleUndoCustomBg = () => {
    setCustomBgRaw((prev) => {
      const past = customBgHistoryRef.current;
      if (!past.length) return prev;
      const next = past.pop() ?? "";
      customBgFutureRef.current.push(prev);
      return next;
    });
  };

  const handleRedoCustomBg = () => {
    setCustomBgRaw((prev) => {
      const future = customBgFutureRef.current;
      if (!future.length) return prev;
      const next = future.pop() ?? "";
      customBgHistoryRef.current.push(prev);
      return next;
    });
  };

  useEffect(() => {
    if (customBg && customBg.startsWith("blob:")) {
      fetch(customBg)
        .then((r) => r.blob())
        .then((blob) => idbSet("bg", blob))
        .catch(() => {});
    }
  }, [customBg]);

  const [customLogo, setCustomLogoRaw] = useState<string>("");
  const logoBlobRef = useRef<string | null>(null);

  useEffect(() => {
    idbGet("logo").then((blob) => {
      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        logoBlobRef.current = url;
        setCustomLogoRaw(url);
      } else {
        const saved = localStorage.getItem("kvb_custom_logo");
        if (saved) setCustomLogoRaw(saved);
      }
    }).catch(() => {
      const saved = localStorage.getItem("kvb_custom_logo");
      if (saved) setCustomLogoRaw(saved);
    });
  }, []);

  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const lastCloudDocs = useRef<any>({});
  const resultRevealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubGlobal = subscribeToGlobalSettings((data) => {
      if (data.prizes) {
        lastCloudDocs.current.prizes = JSON.stringify(data.prizes);
        setPrizes(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.prizes)) return prev;
          const merged = data.prizes.map((firebasePrize: Prize) => {
            const local = prev.find((lp: Prize) => lp.id === firebasePrize.id);
            const restored = { ...firebasePrize };
            const mergeImg = (cloudVal: string | undefined, localVal: string | undefined) => {
              // 本地 blob URL 是当前会话才有效，跨会话来自 localStorage 的是死链，直接忽略
              if (localVal?.startsWith("blob:")) return cloudVal || undefined;
              if (!cloudVal && localVal) return localVal;
              if (cloudVal?.startsWith("data:") || cloudVal?.startsWith("blob:")) {
                if (localVal?.startsWith("https://")) return localVal;
                return localVal || undefined;
              }
              return cloudVal || localVal || undefined;
            };
            restored.customImageBase64 = mergeImg(firebasePrize.customImageBase64, local?.customImageBase64);
            restored.customImageLargeBase64 = mergeImg(firebasePrize.customImageLargeBase64, local?.customImageLargeBase64);
            return restored;
          });
          return merged;
        });
      }
      if (data.riskConfig) {
        lastCloudDocs.current.riskConfig = JSON.stringify(data.riskConfig);
        setRiskConfig(prev => JSON.stringify(prev) === JSON.stringify(data.riskConfig) ? prev : data.riskConfig);
      }
      if (data.metrics) {
        lastCloudDocs.current.metrics = JSON.stringify(data.metrics);
        setMetrics(prev => JSON.stringify(prev) === JSON.stringify(data.metrics) ? prev : data.metrics);
      }
      if (data.sheetsConfig) {
        lastCloudDocs.current.sheetsConfig = JSON.stringify(data.sheetsConfig);
        setSheetsConfig(prev => JSON.stringify(prev) === JSON.stringify(data.sheetsConfig) ? prev : data.sheetsConfig);
      }
      if (data.invitationCodes) {
        lastCloudDocs.current.invitationCodes = JSON.stringify(data.invitationCodes);
        setInvitationCodes(prev => JSON.stringify(prev) === JSON.stringify(data.invitationCodes) ? prev : data.invitationCodes);
      }
      if (data.customBg !== undefined) {
        lastCloudDocs.current.customBg = data.customBg;
        setCustomBgRaw((prev) => {
          if (prev && !data.customBg) return prev;
          if (prev && data.customBg && customBgCloudRef.current === data.customBg) return prev;
          if (prev.startsWith("blob:") && !data.customBg.startsWith("https://")) return prev;
          if (data.customBg.startsWith("https://")) {
            customBgCloudRef.current = data.customBg;
          }
          return prev === data.customBg ? prev : data.customBg;
        });
      }
      if (data.customLogo !== undefined) {
        lastCloudDocs.current.customLogo = data.customLogo;
        setCustomLogoRaw((prev) => {
          if (prev && !data.customLogo) return prev;
          if (prev.startsWith("blob:") && !data.customLogo.startsWith("https://")) return prev;
          return prev === data.customLogo ? prev : data.customLogo;
        });
      }
      setIsFirebaseLoaded(true);
    });

    const unsubDraws = subscribeToDraws((draws) => {
      if (draws.length > 0) {
        setRecentDraws(prev => JSON.stringify(prev) === JSON.stringify(draws) ? prev : draws);
      }
    });

    return () => {
      unsubGlobal();
      unsubDraws();
    };
  }, []);

  const handleUpdateCustomLogo = (base64: string) => {
    setCustomLogoRaw((prev) => {
      if (prev === base64) return prev;
      // 清除旧 blob URL 防止泄漏
      if (!base64 && logoBlobRef.current) {
        URL.revokeObjectURL(logoBlobRef.current);
        logoBlobRef.current = null;
      }
      customLogoHistoryRef.current.push(prev);
      customLogoFutureRef.current = [];
      return base64;
    });
    if (base64) {
      if (!base64.startsWith("blob:")) {
        lsSet("kvb_custom_logo", base64);
      }
    } else {
      lsRemove("kvb_custom_logo");
      idbDel("logo").catch(() => {});
    }
  };

  const handleUndoCustomLogo = () => {
    setCustomLogoRaw((prev) => {
      const past = customLogoHistoryRef.current;
      if (!past.length) return prev;
      const next = past.pop() ?? "";
      customLogoFutureRef.current.push(prev);
      return next;
    });
  };

  const handleRedoCustomLogo = () => {
    setCustomLogoRaw((prev) => {
      const future = customLogoFutureRef.current;
      if (!future.length) return prev;
      const next = future.pop() ?? "";
      customLogoHistoryRef.current.push(prev);
      return next;
    });
  };

  // 仅在非 blob URL 时持久化到 localStorage（云端 URL 或空字符串）
  useEffect(() => {
    if (customLogo) {
      if (!customLogo.startsWith("blob:")) {
        lsSet("kvb_custom_logo", customLogo);
      }
    } else {
      lsRemove("kvb_custom_logo");
    }
  }, [customLogo]);

  useEffect(() => {
    lsRemove("kvb_operator_mode_v2");
  }, []);

  // Handle toggling of Operator mode via code
  const handleOperatorToggleClick = () => {
    if (operatorMode) {
      // If already active, IMMEDIATELY lock (exit session) for quick testing of public layout
      setOperatorMode(false);
      setOperatorPinInput("");
      setLoginError("");
    } else {
      // If locked, show the PIN popup
      setOperatorPinInput("");
      setLoginError("");
      setShowOperatorLogin(true);
    }
  };

  const handleOperatorLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = operatorPinInput.trim();
    if (cleanPin === "888000") {
      setOperatorMode(true);
      setShowOperatorLogin(false);
      setOperatorPinInput("");
      setLoginError("");
    } else {
      setLoginError("🔑 PIN salah. Gunakan PIN Kepatuhan KVB!");
    }
  };

  // Keep states persistent
  useEffect(() => {
    lsSet("kvb_lang_v2", lang);
  }, [lang]);

  useEffect(() => {
    try {
      const currentStr = JSON.stringify(prizes);
      lsSet("kvb_prizes_v3", currentStr);
      if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.prizes) {
        lastCloudDocs.current.prizes = currentStr;
        const firestorePrizes = prizes.map(stripBase64FromPrize);
        saveGlobalSettings({ prizes: firestorePrizes });
      }
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }, [prizes, isFirebaseLoaded]);

  useEffect(() => {
    lsSet("kvb_draws_v2", JSON.stringify(recentDraws));
  }, [recentDraws]);

  useEffect(() => {
    lsSet(
      "kvb_current_user_v2",
      JSON.stringify(currentParticipant),
    );
  }, [currentParticipant]);

  useEffect(() => {
    const currentStr = JSON.stringify(riskConfig);
    lsSet("kvb_risk_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.riskConfig) {
      lastCloudDocs.current.riskConfig = currentStr;
      saveGlobalSettings({ riskConfig });
    }
  }, [riskConfig, isFirebaseLoaded]);

  useEffect(() => {
    const currentStr = JSON.stringify(metrics);
    lsSet("kvb_metrics_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.metrics) {
      lastCloudDocs.current.metrics = currentStr;
      saveGlobalSettings({ metrics });
    }
  }, [metrics, isFirebaseLoaded]);

  useEffect(() => {
    lsSet(
      "kvb_user_has_drawn_v2",
      userHasDrawn ? "true" : "false",
    );
  }, [userHasDrawn]);

  useEffect(() => {
    const currentStr = JSON.stringify(sheetsConfig);
    lsSet("kvb_sheets_config_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.sheetsConfig) {
      lastCloudDocs.current.sheetsConfig = currentStr;
      saveGlobalSettings({ sheetsConfig });
    }
  }, [sheetsConfig, isFirebaseLoaded]);

  useEffect(() => {
    if (isFirebaseLoaded && customBg && !customBg.startsWith("blob:") && customBg !== lastCloudDocs.current.customBg) {
      lastCloudDocs.current.customBg = customBg;
      saveGlobalSettings({ customBg });
    }
  }, [customBg, isFirebaseLoaded]);
  
  useEffect(() => {
    if (isFirebaseLoaded && customLogo && !customLogo.startsWith("blob:") && customLogo !== lastCloudDocs.current.customLogo) {
      lastCloudDocs.current.customLogo = customLogo;
      saveGlobalSettings({ customLogo });
    }
  }, [customLogo, isFirebaseLoaded]);
  
  useEffect(() => {
    const currentStr = JSON.stringify(invitationCodes);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.invitationCodes) {
      lastCloudDocs.current.invitationCodes = currentStr;
      saveGlobalSettings({ invitationCodes });
    }
  }, [invitationCodes, isFirebaseLoaded]);

  // Evaluates simulated golden hour status
  const isGoldenHour = (() => {
    const totalMinutes =
      riskConfig.simulatedHour * 60 + riskConfig.simulatedMinute;
    const startMins = 19 * 60 + 30; // 19:30
    const endMins = 21 * 60; // 21:00
    return totalMinutes >= startMins && totalMinutes <= endMins;
  })();

  const handleParticipantRegister = (p: Participant) => {
    setCurrentParticipant(p);

    // Mark invitation code as used in local state
    setInvitationCodes((prev) =>
      prev.map((item) => {
        if (item.code.toUpperCase() === p.ktp.toUpperCase()) {
          return {
            ...item,
            isUsed: true,
            usedBy: p.name,
          };
        }
        return item;
      }),
    );
  };

  // Reset the database & offline logs to clean slate
  const handleResetDatabase = () => {
    lsRemove("kvb_prizes_v3");
    lsRemove("kvb_draws_v2");
    lsRemove("kvb_current_user_v2");
    lsRemove("kvb_user_has_drawn_v2");
    lsRemove("kvb_metrics_v2");
    lsRemove("kvb_risk_v2");
    lsRemove("kvb_sheets_config_v2");
    lsRemove("kvb_invitation_codes_v2");

    if (resultRevealTimerRef.current !== null) {
      window.clearTimeout(resultRevealTimerRef.current);
      resultRevealTimerRef.current = null;
    }

    setPrizes(INITIAL_PRIZES);
    setRecentDraws(generateMockDrawHistory());
    setCurrentParticipant(null);
    setUserHasDrawn(false);
    setLastWinAlert(null);
    setResultRevealOpen(false);
    
    const initCodes = [
      { code: "KVB-8888", isUsed: false, generatedAt: "2026-06-11 12:00" },
      { code: "KVB-6666", isUsed: false, generatedAt: "2026-06-11 12:05" },
      { code: "KVB-9999", isUsed: false, generatedAt: "2026-06-11 12:10" },
      { code: "KVB-5555", isUsed: false, generatedAt: "2026-06-11 12:15" },
    ];
    setInvitationCodes(initCodes);
    
    const initRisk = {
      stockCapEnabled: true,
      timeReleaseEnabled: true,
      antiFraudEnabled: true,
      timeSlotStart: "19:30",
      timeSlotEnd: "21:00",
      simulatedHour: 20,
      simulatedMinute: 15,
      boostedMultiplier: 5,
    };
    setRiskConfig(initRisk);
    
    const initMetrics = {
      totalDraws: 20,
      blockedAttempts: 0,
      successfulDraws: 20,
      downgradedDraws: 0,
    };
    setMetrics(initMetrics);
    
    const initSheets = {
      syncMethod: "webapp" as const,
      spreadsheetId: "",
      webappUrl: "",
      accessToken: "",
      autoSync: true,
      isConnected: false,
      fields: [
        "timestamp",
        "participantName",
        "participantWhatsapp",
        "participantKtp",
        "deviceId",
        "prizeLabel",
        "status",
      ],
    };
    setSheetsConfig(initSheets);

    setCustomBgRaw("");
    setCustomLogoRaw("");
    idbDel("bg").catch(() => {});
    idbDel("logo").catch(() => {});
    INITIAL_PRIZES.forEach((p) => {
      idbDel(`prize_img_thumb_${p.id}`).catch(() => {});
      idbDel(`prize_img_large_${p.id}`).catch(() => {});
    });
    customBgHistoryRef.current = [];
    customBgFutureRef.current = [];
    customLogoHistoryRef.current = [];
    customLogoFutureRef.current = [];
    prizeImageHistoryRef.current = {};

    if (isFirebaseLoaded) {
      saveGlobalSettings({
        prizes: INITIAL_PRIZES,
        riskConfig: initRisk,
        metrics: initMetrics,
        sheetsConfig: initSheets,
        invitationCodes: initCodes,
        customBg: "",
        customLogo: ""
      });
    }

    audio.playTick();
  };

  useEffect(() => {
    return () => {
      if (resultRevealTimerRef.current !== null) {
        window.clearTimeout(resultRevealTimerRef.current);
      }
    };
  }, []);

  const closeWinReveal = () => {
    if (resultRevealTimerRef.current !== null) {
      window.clearTimeout(resultRevealTimerRef.current);
      resultRevealTimerRef.current = null;
    }

    setResultRevealOpen(false);
    setLastWinAlert(null);
    audio.reset();
  };

  const handleUpdateRiskConfig = (newConfig: Partial<RiskConfig>) => {
    setRiskConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleUpdatePrizeStock = (prizeId: string, newStock: number) => {
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id === prizeId) {
          return { ...p, currentStock: Math.max(0, newStock) };
        }
        return p;
      }),
    );
  };

  const handleUpdatePrizeImage = (prizeId: string, base64: string) => {
    if (!base64) {
      idbDel(`prize_img_thumb_${prizeId}`).catch(() => {});
    }
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id !== prizeId) return p;
        const prevVal = p.customImageBase64 || "";
        if (prevVal === base64) return p;
        if (!base64 && prevVal.startsWith("blob:")) {
          URL.revokeObjectURL(prevVal);
        }
        const entry =
          prizeImageHistoryRef.current[prizeId] ?? (prizeImageHistoryRef.current[
            prizeId
          ] = { past: [], future: [] });
        entry.past.push(prevVal);
        entry.future = [];
          return { ...p, customImageBase64: base64 };
      }),
    );
  };

  const handleUpdatePrizeLargeImage = (prizeId: string, base64: string) => {
    if (!base64) {
      idbDel(`prize_img_large_${prizeId}`).catch(() => {});
    }
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id !== prizeId) return p;
        const prevVal = p.customImageLargeBase64 || "";
        if (!base64 && prevVal.startsWith("blob:")) {
          URL.revokeObjectURL(prevVal);
        }
        return { ...p, customImageLargeBase64: base64 };
      }),
    );
  };

  const handleUndoPrizeImage = (prizeId: string) => {
    setPrizes((prev) => {
      const entry = prizeImageHistoryRef.current[prizeId];
      if (!entry?.past.length) return prev;
      const next = entry.past.pop() ?? "";
      return prev.map((p) => {
        if (p.id !== prizeId) return p;
        entry.future.push(p.customImageBase64 || "");
          return { ...p, customImageBase64: next };
      });
    });
  };

  const handleRedoPrizeImage = (prizeId: string) => {
    setPrizes((prev) => {
      const entry = prizeImageHistoryRef.current[prizeId];
      if (!entry?.future.length) return prev;
      const next = entry.future.pop() ?? "";
      return prev.map((p) => {
        if (p.id !== prizeId) return p;
        entry.past.push(p.customImageBase64 || "");
          return { ...p, customImageBase64: next };
      });
    });
  };

  const canUndoCustomBg = customBgHistoryRef.current.length > 0;
  const canRedoCustomBg = customBgFutureRef.current.length > 0;
  const canUndoCustomLogo = customLogoHistoryRef.current.length > 0;
  const canRedoCustomLogo = customLogoFutureRef.current.length > 0;
  const canUndoPrizeImage = (prizeId: string) =>
    (prizeImageHistoryRef.current[prizeId]?.past.length ?? 0) > 0;
  const canRedoPrizeImage = (prizeId: string) =>
    (prizeImageHistoryRef.current[prizeId]?.future.length ?? 0) > 0;

  const handleUpdateSheetsConfig = (newConfig: Partial<GoogleSheetsConfig>) => {
    setSheetsConfig((prev) => ({ ...prev, ...newConfig }));
  };

  // Manual Trigger to upload all locally stored draws to Google Spreadsheet
  const handleSyncExistingLogs = async () => {
    let successCount = 0;
    let failedCount = 0;

    // Filter success status logs to push
    const successfulLogs = recentDraws.filter((d) => d.status === "SUCCESS");

    for (const draw of successfulLogs) {
      const result = await syncSingleDrawToSheets(draw, sheetsConfig);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    if (successCount > 0) {
      setSheetsConfig((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncedAt: new Date().toLocaleTimeString(),
      }));
    }

    return { successCount, failedCount };
  };

  // Google Sheets Test Row Generation
  const handleTestSync = async () => {
    const mockTestDraw: DrawResult = {
      id: `test-draw-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      participantName: "KVB Test Investor",
      participantWhatsapp: "081299998888",
      participantKtp: "1234567890123456",
      deviceId: "DEVICE-UNIT-TEST-OK",
      prizeId: "test_gold_bar",
      prizeLabel: "5g Emas Batangan Fisik (Testing Link)",
      isDowngraded: false,
      status: "SUCCESS",
    };

    const res = await syncSingleDrawToSheets(mockTestDraw, sheetsConfig);
    if (res.success) {
      setSheetsConfig((prev) => ({ ...prev, isConnected: true }));
    }
    return res;
  };

  // Evaluate the spin on the secure client system
  const handleSpinStartEvaluation = () => {
    if (!currentParticipant) return null;

    // 1. Anti-Fraud block evaluation (Multiple registration lookup based on credentials)
    const isDuplicate = recentDraws.some(
      (log) =>
        log.status === "SUCCESS" &&
        (log.participantKtp === currentParticipant.ktp ||
          log.participantWhatsapp === currentParticipant.whatsapp ||
          log.deviceId === currentParticipant.deviceId),
    );

    if (riskConfig.antiFraudEnabled && (isDuplicate || userHasDrawn)) {
      // Record blocked attack in audit database
      const timestampF = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const newBlockedLog: DrawResult = {
        id: `log-${Date.now()}`,
        timestamp: timestampF,
        participantName: currentParticipant.name,
        participantWhatsapp: currentParticipant.whatsapp,
        participantKtp: currentParticipant.ktp,
        deviceId: currentParticipant.deviceId,
        prizeId: "cobalagi",
        prizeLabel: "Coba Lagi Besok!",
        isDowngraded: false,
        status: "BLOCKED",
        blockReason:
          "Deteksi Multi-Daftar: WhatsApp, KTP, atau Perangkat Sudah Mengambil Hadiah.",
      };

      setRecentDraws((prev) => [newBlockedLog, ...prev]);
      setMetrics((prev) => ({
        ...prev,
        totalDraws: prev.totalDraws + 1,
        blockedAttempts: prev.blockedAttempts + 1,
      }));

      // Firebase save
      saveDraw(newBlockedLog);

      // Fire sheet sync even for blocked ones if auto-sync is on
      if (
        sheetsConfig.autoSync &&
        (sheetsConfig.webappUrl || sheetsConfig.spreadsheetId)
      ) {
        syncSingleDrawToSheets(newBlockedLog, sheetsConfig);
      }

      audio.playDecline();
      return {
        winningPrize: prizes[0], // early fallback object, error will catch it
        isDowngraded: false,
        error:
          "Sistem KVB mendeteksi Anda telah melakukan pendaftaran ganda menggunakan dokumen KTP, perangkat, atau nomor WhatsApp yang sama. Putaran ditolak.",
      };
    }

    // 2. Base Mathematical Selection based on active configuration
    let adjustedPrizes = prizes.map((p) => ({ ...p }));

    // Enforce 0% chance for premium prizes as requested by user
    adjustedPrizes = adjustedPrizes.map((p) => {
      if (["gold10g", "ninja250", "macbook", "iphone16"].includes(p.id)) {
        return { ...p, baseProbability: 0 };
      }
      return p;
    });

    // Apply Time-Release slot scaling
    if (riskConfig.timeReleaseEnabled) {
      if (isGoldenHour) {
        // Boost potential value chances during group peak times for active elements
        adjustedPrizes = adjustedPrizes.map((p) => {
          if (p.id === "gold10g")
            return { ...p, baseProbability: p.baseProbability * 2.5 };
          if (p.id === "ninja250")
            return { ...p, baseProbability: p.baseProbability * 10 };
          if (p.id === "macbook")
            return { ...p, baseProbability: p.baseProbability * 5 };
          return p;
        });
      } else {
        // Strict low probability windows
        adjustedPrizes = adjustedPrizes.map((p) => {
          if (p.id === "gold10g") return { ...p, baseProbability: 0 };
          if (p.id === "ninja250")
            return { ...p, baseProbability: p.baseProbability * 0.1 };
          if (p.id === "macbook")
            return { ...p, baseProbability: p.baseProbability * 0.2 };
          return p;
        });
      }
    }

    // Re-normalize rates so they sum to 100%
    const totalWeight = adjustedPrizes.reduce(
      (sum, p) => sum + p.baseProbability,
      0,
    );
    const normalizedPrizes = adjustedPrizes.map((p) => ({
      ...p,
      prob: totalWeight > 0 ? p.baseProbability / totalWeight : 0,
    }));

    // Draw selection sweep
    const roll = Math.random();
    let cumulative = 0;
    let selectedPrize = normalizedPrizes[normalizedPrizes.length - 1]; // fallback

    for (const p of normalizedPrizes) {
      cumulative += p.prob;
      if (roll <= cumulative) {
        selectedPrize = p;
        break;
      }
    }

    // Reference real main prize object
    let actualPrize = prizes.find((p) => p.id === selectedPrize.id)!;
    let originalPrizeObj: Prize | undefined = undefined;
    let isDowngraded = false;
    let downgradeReason = "";

    // 3. Stock Cap Failsafe Trigger Evaluation
    if (
      riskConfig.stockCapEnabled &&
      ["gold10g", "ninja250", "macbook", "iphone16"].includes(actualPrize.id)
    ) {
      if (actualPrize.currentStock <= 0) {
        // Failsafe redirection activated!
        originalPrizeObj = { ...actualPrize };
        isDowngraded = true;
        downgradeReason = `Stok Habis / Limit Mingguan ${actualPrize.level} Tercapai.`;

        // Downgrade path: Shift to Juara 5 (Whitepaper) or Juara 6 (Guide) dependent on stock availability
        const alt5 = prizes.find((p) => p.id === "whitepaper")!;
        const alt6 = prizes.find((p) => p.id === "gold_guide")!;

        actualPrize = alt5.currentStock > 0 ? alt5 : alt6;
      }
    }

    return {
      winningPrize: actualPrize,
      originalPrize: originalPrizeObj,
      isDowngraded,
      reason: downgradeReason,
    };
  };

  // Spin animation holds, stopped, and finishes
  const handleSpinComplete = (
    wonPrize: Prize,
    originalPrize?: Prize,
    isDowngraded?: boolean,
    downgradeReason?: string,
  ) => {
    if (!currentParticipant) return;

    // Decrement the active prize stock
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id === wonPrize.id) {
          return { ...p, currentStock: Math.max(0, p.currentStock - 1) };
        }
        return p;
      }),
    );

    // Record draw log
    const timestampF = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newLog: DrawResult = {
      id: `log-${Date.now()}`,
      timestamp: timestampF,
      participantName: currentParticipant.name,
      participantWhatsapp: currentParticipant.whatsapp,
      participantKtp: currentParticipant.ktp,
      deviceId: currentParticipant.deviceId,
      prizeId: wonPrize.id,
      prizeLabel: wonPrize.label,
      originalPrizeId: originalPrize?.id,
      originalPrizeLabel: originalPrize?.label,
      isDowngraded: !!isDowngraded,
      downgradeReason,
      status: "SUCCESS",
    };

    setRecentDraws((prev) => [newLog, ...prev]);
    setUserHasDrawn(true);
    
    // Firebase save
    saveDraw(newLog);

    // Update global server metrics
    setMetrics((prev) => ({
      ...prev,
      totalDraws: prev.totalDraws + 1,
      successfulDraws: prev.successfulDraws + 1,
      downgradedDraws: isDowngraded
        ? prev.downgradedDraws + 1
        : prev.downgradedDraws,
    }));

    // Trigger Google Sheets Sync dynamically (Auto-Sync)
    if (sheetsConfig.autoSync) {
      syncSingleDrawToSheets(newLog, sheetsConfig).then((res) => {
        if (res.success) {
          console.log("[Google Sheets] Auto-sync uploaded successfully!");
        } else {
          console.warn("[Google Sheets] Auto-sync failed:", res.error);
        }
      });
    }

    if (resultRevealTimerRef.current !== null) {
      window.clearTimeout(resultRevealTimerRef.current);
    }

    // Trigger Winning Popup alert
    setLastWinAlert({
      prize: wonPrize,
      originalPrize,
      isDowngraded: !!isDowngraded,
      reason: downgradeReason,
    });
    setResultRevealOpen(false);
    resultRevealTimerRef.current = window.setTimeout(() => {
      setResultRevealOpen(true);
      resultRevealTimerRef.current = null;
    }, 220);
  };

  // Bot attack simulator inside SecurityConsole
  const handleRunBotAttackSimulation = () => {
    const now = new Date();
    const newLogs: DrawResult[] = [];

    for (let i = 0; i < 100; i++) {
      const randomMin = Math.floor(Math.random() * 60);
      const formattedT = `${now.getHours().toString().padStart(2, "0")}:${randomMin.toString().padStart(2, "0")}`;

      const botLog = {
        id: `bot-attack-${i}-${Date.now()}`,
        timestamp: formattedT,
        participantName: `ScriptBot ${1000 + i}`,
        participantWhatsapp: `0812${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`,
        participantKtp: `3201${Math.floor(100000 + Math.random() * 900000)}${Math.floor(100000 + Math.random() * 900000)}`,
        deviceId: `ID-FARM-BOT-${i}-SANDBOX`,
        prizeId: "cobalagi",
        prizeLabel: "Coba Lagi Besok!",
        status: "BLOCKED" as const,
        isDowngraded: false,
        blockReason:
          "Device Fingerprint / KTP terdaftar teridentifikasi sebagai BOT farm scraper.",
      };
      
      newLogs.push(botLog);
      // Batch firing to Firebase (async, but no await so we don't stall UI)
      saveDraw(botLog);
    }

    setRecentDraws((prev) => [...newLogs, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalDraws: prev.totalDraws + 100,
      blockedAttempts: prev.blockedAttempts + 100,
    }));

    // Push first blocked one to Sheets if autoSync is active
    if (sheetsConfig.autoSync && newLogs.length > 0) {
      syncSingleDrawToSheets(newLogs[0], sheetsConfig);
    }
  };

  const prizeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of prizes) map.set(p.id, p.label);
    return map;
  }, [prizes]);

  const marqueeWinners = useMemo(() => {
    const top = recentDraws
      .filter((d) => d.status === "SUCCESS")
      .slice(0, 10);
    const doubled = [...top, ...top];
    return doubled.map((draw, i) => {
      const wonLabel = prizeMap.get(draw.prizeId) || draw.prizeLabel;
      return (
        <div
          key={draw.id + "-" + i}
          className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors"
        >
          <div className="flex flex-col text-left">
            <span className="font-bold text-slate-200 font-sans">
              {maskName(draw.participantName)}
            </span>
            <span className="text-slate-500 text-[10px] mt-0.5">
              {maskWhatsapp(draw.participantWhatsapp)} • Code{" "}
              {maskCode(draw.participantKtp)}
            </span>
          </div>
          <div className="text-right flex flex-col shrink-0 pl-2">
            <span className="text-blue-600 font-bold font-display text-xs">
              {wonLabel}
            </span>
            <span className="text-[9px] text-slate-500 font-mono mt-0.5">
              {draw.timestamp} WIB
            </span>
          </div>
        </div>
      );
    });
  }, [recentDraws, prizeMap]);

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden text-slate-100 flex flex-col font-sans select-none antialiased bg-transparent`}
    >
      {/* Fixed Background Image Layer */}
      <div className="fixed inset-0 z-[-1] w-full h-full bg-[#030712] pointer-events-none">
        <img
          src={customBg || ""}
          alt=""
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${customBg ? "opacity-100" : "opacity-0"}`}
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Subtle dark overlay gradient for readability and design premium finish */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/30 to-[#030712]/80" />
      </div>

      {/* Dynamic Header */}
      <KvbHeader lang={lang} customLogo={customLogo} />

      {/* Main Campaign Hero Section */}
      <div className="relative mx-4 lg:mx-auto max-w-7xl rounded-3xl mt-6 py-10 md:py-16 panel-premium overflow-hidden select-none">
        {/* Soft atmospheric amber & crystal flare grids */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-300/14 to-transparent rounded-full blur-[110px] pointer-events-none"></div>
        <div className="absolute -top-12 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-sky-400/14 to-transparent rounded-full blur-[95px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-12 space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 to-amber-500/5 border border-amber-400/20 text-amber-300 text-xs font-semibold tracking-wide uppercase font-sans shadow-lg shadow-amber-400/5">
              <Award className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="tracking-widest">
                Kampanye Resmi Terakreditasi
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] font-display text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-amber-200">
              {t.campaignTitle}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-3xl leading-relaxed mx-auto md:mx-0 font-sans font-light">
              {t.campaignDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Main Panel Content (Wheel, Register, Sheets Integration info) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Lucky Wheel and descriptions */}
        <div className="lg:col-span-7 flex flex-col gap-6 justify-center">
          <GridLottery
            prizes={prizes}
            onSpinComplete={handleSpinComplete}
            onSpinStart={handleSpinStartEvaluation}
            participant={currentParticipant}
            lang={lang}
            showProbability={operatorMode}
          />

          {/* Interactive descriptions */}
          <div className="p-6 rounded-3xl panel-premium text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <h4 className="font-bold text-sm text-yellow-600 mb-3 flex items-center gap-1.5 uppercase font-display tracking-wider">
              <Info className="h-4 w-4 text-yellow-600" />
              <span>{t.prizesDetailTitle}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-700 font-bold font-sans leading-relaxed">
              <div className="space-y-1.5 transition-all">
                <p className="hover:text-amber-600">{t.grandPrizeDesc}</p>
                <p className="hover:text-amber-600">{t.juara1Desc}</p>
                <p className="hover:text-amber-600">{t.juara2Desc}</p>
                <p className="hover:text-amber-600">{t.juara3Desc}</p>
              </div>
              <div className="space-y-1.5 transition-all">
                <p className="hover:text-amber-600">{t.juara4Desc}</p>
                <p className="hover:text-amber-600">{t.juara5Desc}</p>
                <p className="hover:text-amber-600">{t.juara6Desc}</p>
                <p className="text-rose-600 font-black">{t.bonusDesc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Registration form and live draw list */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <RegistrationForm
            onSubmit={handleParticipantRegister}
            onLogout={() => {
              setCurrentParticipant(null);
              setUserHasDrawn(false);
            }}
            currentParticipant={currentParticipant}
            blockedDetails={
              recentDraws.find(
                (d) =>
                  d.participantKtp === currentParticipant?.ktp &&
                  d.status === "BLOCKED",
              ) || null
            }
            lang={lang}
            invitationCodes={invitationCodes}
          />

          {/* Live Feed ticker */}
          <div className="bg-slate-950/82 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex-1 flex flex-col text-left shadow-[0_18px_60px_rgba(2,6,23,0.35)] relative overflow-hidden">
            <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 shrink-0">
              <h4 className="font-bold text-xs text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-display">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                <span className="text-blue-100">{t.recentWinners}</span>
              </h4>
              <span className="text-[9px] text-blue-300 font-mono bg-blue-900/40 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight border border-blue-500/20">
                Active Stream
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-hidden relative max-h-[295px]">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                {/* Optional fade top/bottom if desired */}
                <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-zinc-950/85 to-transparent"></div>
                <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-zinc-950/85 to-transparent"></div>
              </div>
              <div className="font-mono text-[11px] animate-marquee-vertical hover:[animation-play-state:paused] flex flex-col gap-2.5">
                {marqueeWinners}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Embedded Operations Security & Sheets Console (Bottom row - ONLY shown to internal authorized operators) */}
      {operatorMode && (
        <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 animate-fade-in">
          <SecurityConsole
            prizes={prizes}
            riskConfig={riskConfig}
            metrics={metrics}
            sheetsConfig={sheetsConfig}
            onUpdateRiskConfig={handleUpdateRiskConfig}
            onUpdatePrizeStock={handleUpdatePrizeStock}
            onUpdatePrizeImage={handleUpdatePrizeImage}
            onUpdatePrizeLargeImage={handleUpdatePrizeLargeImage}
            onUpdateCustomBg={handleUpdateCustomBg}
            onUndoCustomBg={handleUndoCustomBg}
            onRedoCustomBg={handleRedoCustomBg}
            canUndoCustomBg={canUndoCustomBg}
            canRedoCustomBg={canRedoCustomBg}
            customBg={customBg}
            onUpdateCustomLogo={handleUpdateCustomLogo}
            onUndoCustomLogo={handleUndoCustomLogo}
            onRedoCustomLogo={handleRedoCustomLogo}
            canUndoCustomLogo={canUndoCustomLogo}
            canRedoCustomLogo={canRedoCustomLogo}
            customLogo={customLogo}
            onUndoPrizeImage={handleUndoPrizeImage}
            onRedoPrizeImage={handleRedoPrizeImage}
            canUndoPrizeImage={canUndoPrizeImage}
            canRedoPrizeImage={canRedoPrizeImage}
            onResetDatabase={handleResetDatabase}
            onRunBotAttack={handleRunBotAttackSimulation}
            recentDraws={recentDraws}
            lang={lang}
            onUpdateSheetsConfig={handleUpdateSheetsConfig}
            onSyncExistingLogs={handleSyncExistingLogs}
            onTestSync={handleTestSync}
            invitationCodes={invitationCodes}
            onAddInvitationCode={handleAddInvitationCode}
            onDeleteInvitationCode={handleDeleteInvitationCode}
            onAddBulkInvitationCodes={handleAddBulkInvitationCodes}
          />
        </div>
      )}

      {/* Brand Footer */}
      <footer className="relative mt-auto border-t border-white/10 py-8 px-6 text-center text-xs text-slate-400 font-sans overflow-hidden bg-white/5 backdrop-blur-sm shadow-[0_-8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-2 text-left">
            <span className="font-bold text-slate-400">KVB Global Markets</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Regulated Broker A++ Grade 2026
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center justify-center gap-1.5 text-center">
              <span>
                Dibuat dengan jaminan keamanan & AML Finansial untuk Komunitas
                Indonesia
              </span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 inline animate-pulse shrink-0" />
            </div>

            <div className="flex items-center flex-wrap justify-center gap-2">
              {/* Operator Lock Toggle */}
              <button
                onClick={handleOperatorToggleClick}
                className={`py-1.5 px-3 rounded-lg border flex items-center gap-1.5 text-[10px] font-bold tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm ${
                  operatorMode
                    ? "border-blue-500/50 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                    : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                }`}
                title="Klik untuk toggle panel kepatuhan (Operator saja)"
              >
                {operatorMode ? (
                  <Unlock className="h-3 w-3 inline text-blue-600" />
                ) : (
                  <Lock className="h-3 w-3 inline text-slate-500" />
                )}
                <span>{operatorMode ? "OPERATOR ACTIVE" : "INSIDER ZONE"}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* PRESTIDIGIOUS WINNER LIGHTBOX DIALOG */}
      {lastWinAlert && (
        <>
          <ConfettiEffect active={resultRevealOpen} />

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 text-left backdrop-blur-md animate-fade-in">
            <div
              className={`relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-200/16 bg-[linear-gradient(180deg,rgba(10,18,35,0.96),rgba(6,10,20,0.96))] px-6 py-7 text-center shadow-[0_28px_120px_rgba(2,6,23,0.6)] transition-all duration-300 ${
                resultRevealOpen
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-4 scale-[0.96] opacity-0"
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_70%)]" />
              <button
                onClick={closeWinReveal}
                aria-label={lang === "zh" ? "关闭中奖弹窗" : "Tutup hasil undian"}
                className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-amber-200">
                <Sparkles className="h-7 w-7" />
              </div>

              <p className="text-gold-soft text-[11px] font-bold uppercase tracking-[0.35em]">
                {lang === "zh" ? "中奖结果" : "Hasil Undian"}
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                {t.winTitle}
              </h3>

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute h-64 w-64 rounded-full bg-amber-300/18 blur-3xl" />
                <div
                  className={`absolute h-72 w-72 rounded-full border border-amber-200/18 ${
                    resultRevealOpen ? "animate-win-ring" : "opacity-0"
                  }`}
                />
                <PrizeGraphic
                  prizeId={lastWinAlert.prize.id}
                  imageUrl={lastWinAlert.prize.imageUrl}
                  customImageBase64={lastWinAlert.prize.customImageLargeBase64 || lastWinAlert.prize.customImageBase64}
                  className="relative z-10 h-[280px] w-[280px]"
                  emphasize
                />
              </div>

              <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/90">
                  {lang === "zh"
                    ? lastWinAlert.prize.levelZh
                    : lastWinAlert.prize.level}
                </p>
                <p className="mt-2 text-xl font-black text-white">
                  {lang === "zh"
                    ? lastWinAlert.prize.labelZh
                    : lastWinAlert.prize.label}
                </p>
                <p className="mt-2 text-[11px] font-mono text-emerald-300">
                  {t.winStatus}
                </p>
              </div>

              {lastWinAlert.isDowngraded && (
                <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-left text-xs leading-relaxed text-amber-200">
                  <div className="mb-1 flex items-center gap-1 font-bold text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>SOP Operasional Berhasil Dipicu</span>
                  </div>
                  {t.winDowngradeWarn
                    .replace(
                      "{original}",
                      lang === "zh"
                        ? lastWinAlert.originalPrize?.labelZh || ""
                        : lastWinAlert.originalPrize?.label || "",
                    )
                    .replace(
                      "{won}",
                      lang === "zh"
                        ? lastWinAlert.prize.labelZh
                        : lastWinAlert.prize.label,
                    )}
                </div>
              )}

              <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-slate-300">
                {t.winDesc.replace(
                  "{whatsapp}",
                  currentParticipant?.whatsapp || "",
                )}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={closeWinReveal}
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-4 py-3 text-xs font-extrabold text-slate-950 transition-transform active:scale-95"
                >
                  {t.confirmClaim}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* INTERNAL COMPLIANCE OFFICER LOGIN MODAL */}
      {showOperatorLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
          <div className="w-full max-w-sm bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowOperatorLogin(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mb-4">
              <KeyRound className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              {lang === "zh" ? "内部合规审计官登入" : "Internal Operator Login"}
            </h3>
            <p className="text-[11px] text-slate-400 text-center mb-5 leading-relaxed">
              {lang === "zh"
                ? "请输入 KVB 内部特许密钥以激活风控精算概率指示牌与数据同步控制台"
                : "Masukkan PIN Kepatuhan KVB untuk mengaktifkan setelan premium & sinkronisasi database"}
            </p>

            <form onSubmit={handleOperatorLoginSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder={
                    lang === "zh"
                      ? "请输入合规安全密钥"
                      : "Masukkan PIN Kepatuhan"
                  }
                  value={operatorPinInput}
                  onChange={(e) => {
                    setOperatorPinInput(e.target.value);
                    setLoginError("");
                  }}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl p-3 text-sm text-slate-100 text-center placeholder-slate-500 outline-none font-mono tracking-widest"
                />
                {loginError && (
                  <p className="text-red-400 mt-2 text-xs text-center font-bold">
                    {loginError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOperatorLogin(false)}
                  className="w-1/2 bg-slate-900 border border-slate-800 hover:bg-slate-850 py-2.5 px-4 rounded-xl text-xs text-slate-400 font-bold cursor-pointer"
                >
                  {lang === "zh" ? "取消" : "Batal"}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
                >
                  {lang === "zh" ? "验证授权" : "Verifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
