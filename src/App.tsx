import React, { useEffect, useRef, useState } from "react";
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
import { hashString, safeStringEqual } from "./utils/secretHash";
import ConfettiEffect from "./components/ConfettiEffect";
import { PrizeGraphic } from "./components/PrizeGraphic";
import { subscribeToGlobalSettings, saveGlobalSettings, subscribeToDraws, saveDraw, deletePrizeImage, deleteCustomImage } from "./firebase";

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

export default function App() {
  // Symmetrical Multi-language State
  const [lang, setLang] = useState<"zh" | "id">(() => {
    try {
      const saved = localStorage.getItem("kvb_lang_v2");
      if (saved === "zh" || saved === "id") return saved;
    } catch (_) {}
    return "id";
  });

  const t = TRANSLATIONS[lang];

  // State variables synchronized with LocalStorage for flawless demonstration
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    try {
      const saved = localStorage.getItem("kvb_prizes_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === INITIAL_PRIZES.length)
          return parsed;
      }
    } catch (_) {}
    return INITIAL_PRIZES;
  });

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
  // === FIX: proper {isBlocked, reason} shape for the RegistrationForm warning ===
  const [blockedNotice, setBlockedNotice] = useState<
    { isBlocked: boolean; reason?: string } | null
  >(null);

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
    localStorage.setItem(
      "kvb_invitation_codes_v2",
      JSON.stringify(invitationCodes),
    );
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
  
  const [customBg, setCustomBgRaw] = useState<string>(() => {
    return localStorage.getItem("kvb_custom_bg") || "";
  });

  const customBgHistoryRef = useRef<string[]>([]);
  const customBgFutureRef = useRef<string[]>([]);
  const customLogoHistoryRef = useRef<string[]>([]);
  const customLogoFutureRef = useRef<string[]>([]);
  // === FIX: history stack now stores per-image snapshots instead of a
  //             single base64 string, so URL uploads and base64 uploads
  //             don't clobber each other. ===
  type PrizeImageSnapshot = { url?: string; base64?: string };
  const prizeImageHistoryRef = useRef<
    Record<string, { past: PrizeImageSnapshot[]; future: PrizeImageSnapshot[] }>
  >({});
  const [imageHistoryTick, setImageHistoryTick] = useState(0);

  // Apply a history snapshot to a prize — strips the image fields if
  // both URL and base64 are absent.
  function applyImageSnapshot(
    p: typeof prizes[number],
    snap: PrizeImageSnapshot,
  ): typeof prizes[number] {
    const hasUrl = !!snap.url;
    const hasBase64 = !!snap.base64;
    if (!hasUrl && !hasBase64) {
      const { customImageUrl: _u, customImageBase64: _b, ...rest } = p;
      return rest as typeof prizes[number];
    }
    return {
      ...p,
      customImageUrl: snap.url,
      customImageBase64: snap.base64,
    };
  }

  // Reverse-engineer a Firebase Storage download URL back to its
  // object path so the operator console can delete the orphan file
  // when the prize image is cleared.
  function decodeStoragePathFromUrl(downloadUrl: string): string | null {
    try {
      // Firebase Storage URLs look like:
      //   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?...
      const u = new URL(downloadUrl);
      const match = u.pathname.match(/\/o\/(.+)$/);
      if (!match) return null;
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  // Extract storage path from a custom bg/logo URL for cleanup
  function decodeCustomStoragePath(downloadUrl: string): string | null {
    const path = decodeStoragePathFromUrl(downloadUrl);
    if (!path) return null;
    // Only delete if it's a custom bg/logo file (not prize images)
    if (path.startsWith("custom/")) return path;
    return null;
  }

  const handleUpdateCustomBg = (urlOrBase64: string) => {
    // If clearing the bg and previous value was a Storage URL, delete the orphan file
    if (!urlOrBase64 && customBg) {
      const path = decodeCustomStoragePath(customBg);
      if (path) void deleteCustomImage(path);
    }
    setCustomBgRaw((prev) => {
      if (prev === urlOrBase64) return prev;
      customBgHistoryRef.current.push(prev);
      customBgFutureRef.current = [];
      setImageHistoryTick((t) => t + 1);
      return urlOrBase64;
    });
    if (urlOrBase64) {
      localStorage.setItem("kvb_custom_bg", urlOrBase64);
    } else {
      localStorage.removeItem("kvb_custom_bg");
    }
  };

  const handleUndoCustomBg = () => {
    setCustomBgRaw((prev) => {
      const past = customBgHistoryRef.current;
      if (!past.length) return prev;
      const next = past.pop() ?? "";
      customBgFutureRef.current.push(prev);
      setImageHistoryTick((t) => t + 1);
      return next;
    });
  };

  const handleRedoCustomBg = () => {
    setCustomBgRaw((prev) => {
      const future = customBgFutureRef.current;
      if (!future.length) return prev;
      const next = future.pop() ?? "";
      customBgHistoryRef.current.push(prev);
      setImageHistoryTick((t) => t + 1);
      return next;
    });
  };

  useEffect(() => {
    if (customBg) {
      localStorage.setItem("kvb_custom_bg", customBg);
    } else {
      localStorage.removeItem("kvb_custom_bg");
    }
  }, [customBg]);

  const [customLogo, setCustomLogoRaw] = useState<string>(() => {
    return localStorage.getItem("kvb_custom_logo") || "";
  });

  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const lastCloudDocs = useRef<any>({});
  const resultRevealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubGlobal = subscribeToGlobalSettings((data) => {
      if (data.prizes) {
        lastCloudDocs.current.prizes = JSON.stringify(data.prizes);
        setPrizes((prev) => {
          // === FIX: when the cloud sends back a stale prize record
          //             (e.g. an older client that never had the
          //             `customImageUrl` field), preserve the
          //             operator's local image. The Storage URL is
          //             the source of truth for image assets; the
          //             settings doc is only a metadata mirror. ===
          const merged = data.prizes.map((incoming: typeof prev[number]) => {
            const local = prev.find((p) => p.id === incoming.id);
            return {
              ...incoming,
              customImageUrl: incoming.customImageUrl ?? local?.customImageUrl,
              customImageBase64:
                incoming.customImageBase64 ?? local?.customImageBase64,
            };
          });
          return JSON.stringify(prev) === JSON.stringify(merged)
            ? prev
            : merged;
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
        setCustomBgRaw((prev) => (prev === data.customBg ? prev : data.customBg));
      }
      if (data.customLogo !== undefined) {
        lastCloudDocs.current.customLogo = data.customLogo;
        setCustomLogoRaw((prev) =>
          prev === data.customLogo ? prev : data.customLogo,
        );
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

  const handleUpdateCustomLogo = (urlOrBase64: string) => {
    // If clearing the logo and previous value was a Storage URL, delete the orphan file
    if (!urlOrBase64 && customLogo) {
      const path = decodeCustomStoragePath(customLogo);
      if (path) void deleteCustomImage(path);
    }
    setCustomLogoRaw((prev) => {
      if (prev === urlOrBase64) return prev;
      customLogoHistoryRef.current.push(prev);
      customLogoFutureRef.current = [];
      setImageHistoryTick((t) => t + 1);
      return urlOrBase64;
    });
    if (urlOrBase64) {
      localStorage.setItem("kvb_custom_logo", urlOrBase64);
    } else {
      localStorage.removeItem("kvb_custom_logo");
    }
  };

  const handleUndoCustomLogo = () => {
    setCustomLogoRaw((prev) => {
      const past = customLogoHistoryRef.current;
      if (!past.length) return prev;
      const next = past.pop() ?? "";
      customLogoFutureRef.current.push(prev);
      setImageHistoryTick((t) => t + 1);
      return next;
    });
  };

  const handleRedoCustomLogo = () => {
    setCustomLogoRaw((prev) => {
      const future = customLogoFutureRef.current;
      if (!future.length) return prev;
      const next = future.pop() ?? "";
      customLogoHistoryRef.current.push(prev);
      setImageHistoryTick((t) => t + 1);
      return next;
    });
  };

  useEffect(() => {
    if (customLogo) {
      localStorage.setItem("kvb_custom_logo", customLogo);
    } else {
      localStorage.removeItem("kvb_custom_logo");
    }
  }, [customLogo]);

  useEffect(() => {
    localStorage.removeItem("kvb_operator_mode_v2");
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

  const handleOperatorLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = operatorPinInput.trim();
    // === FIX: compare against a SHA-256 digest so the hard-coded PIN
    //             does not show up in the bundle as a plain string. The
    //             digest below corresponds to the original PIN ("888000").
    //             Use a new PIN by hashing it with the helper in
    //             `utils/secretHash.ts` and pasting the result here. ===
    const EXPECTED_PIN_HASH =
      "d6d6431118812be430985d898c79d98014c1ca7a7f35db26c836f0a2b7d07d12";
    try {
      const inputHash = await hashString(cleanPin);
      if (safeStringEqual(inputHash, EXPECTED_PIN_HASH)) {
        setOperatorMode(true);
        setShowOperatorLogin(false);
        setOperatorPinInput("");
        setLoginError("");
      } else {
        setLoginError("🔑 PIN salah. Gunakan PIN Kepatuhan KVB!");
      }
    } catch (err: any) {
      setLoginError("🔑 Verifikasi PIN gagal. Coba lagi.");
    }
  };

  // Keep states persistent
  useEffect(() => {
    localStorage.setItem("kvb_lang_v2", lang);
  }, [lang]);

  useEffect(() => {
    try {
      // === FIX: only sync the SAFE prize metadata to Firestore —
      //             skip the giant image blobs (customImageBase64 is
      //             already gone, but customImageUrl points at a
      //             Firebase Storage download URL that we don't need
      //             to replicate in the settings doc because all
      //             clients read the same Storage bucket anyway). ===
      const litePrizes = prizes.map((p) => ({
        ...p,
        customImageBase64: undefined,
      }));
      const currentStr = JSON.stringify(litePrizes);
      localStorage.setItem("kvb_prizes_v3", currentStr);
      if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.prizes) {
        lastCloudDocs.current.prizes = currentStr;
        saveGlobalSettings({ prizes: litePrizes });
      }
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }, [prizes, isFirebaseLoaded]);

  useEffect(() => {
    localStorage.setItem("kvb_draws_v2", JSON.stringify(recentDraws));
  }, [recentDraws]);

  useEffect(() => {
    localStorage.setItem(
      "kvb_current_user_v2",
      JSON.stringify(currentParticipant),
    );
  }, [currentParticipant]);

  useEffect(() => {
    const currentStr = JSON.stringify(riskConfig);
    localStorage.setItem("kvb_risk_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.riskConfig) {
      lastCloudDocs.current.riskConfig = currentStr;
      saveGlobalSettings({ riskConfig });
    }
  }, [riskConfig, isFirebaseLoaded]);

  useEffect(() => {
    const currentStr = JSON.stringify(metrics);
    localStorage.setItem("kvb_metrics_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.metrics) {
      lastCloudDocs.current.metrics = currentStr;
      saveGlobalSettings({ metrics });
    }
  }, [metrics, isFirebaseLoaded]);

  useEffect(() => {
    localStorage.setItem(
      "kvb_user_has_drawn_v2",
      userHasDrawn ? "true" : "false",
    );
  }, [userHasDrawn]);

  useEffect(() => {
    const currentStr = JSON.stringify(sheetsConfig);
    localStorage.setItem("kvb_sheets_config_v2", currentStr);
    if (isFirebaseLoaded && currentStr !== lastCloudDocs.current.sheetsConfig) {
      lastCloudDocs.current.sheetsConfig = currentStr;
      saveGlobalSettings({ sheetsConfig });
    }
  }, [sheetsConfig, isFirebaseLoaded]);

  useEffect(() => {
    if (isFirebaseLoaded && customBg !== lastCloudDocs.current.customBg) {
      lastCloudDocs.current.customBg = customBg;
      // Only sync URL to Firestore - base64 is too large for Firestore doc limit
      // URL points to Firebase Storage which all clients can access
      const syncValue = customBg && !customBg.startsWith("data:") ? customBg : "";
      saveGlobalSettings({ customBg: syncValue });
    }
  }, [customBg, isFirebaseLoaded]);
  
  useEffect(() => {
    if (isFirebaseLoaded && customLogo !== lastCloudDocs.current.customLogo) {
      lastCloudDocs.current.customLogo = customLogo;
      // Only sync URL to Firestore - base64 is too large for Firestore doc limit
      const syncValue = customLogo && !customLogo.startsWith("data:") ? customLogo : "";
      saveGlobalSettings({ customLogo: syncValue });
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

    // === FIX: ktp field is also the invitation code in this app, so normalize
    //             both sides to upper-case to avoid mismatches like "kvb-8888" vs "KVB-8888" ===
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

    setBlockedNotice(null);
  };

  // Reset the database & offline logs to clean slate
  const handleResetDatabase = () => {
    localStorage.removeItem("kvb_prizes_v3");
    localStorage.removeItem("kvb_draws_v2");
    localStorage.removeItem("kvb_current_user_v2");
    localStorage.removeItem("kvb_user_has_drawn_v2");
    localStorage.removeItem("kvb_metrics_v2");
    localStorage.removeItem("kvb_risk_v2");
    localStorage.removeItem("kvb_sheets_config_v2");
    localStorage.removeItem("kvb_invitation_codes_v2");
    localStorage.removeItem("kvb_fraud_fingerprints_v2");

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
    customBgHistoryRef.current = [];
    customBgFutureRef.current = [];
    customLogoHistoryRef.current = [];
    customLogoFutureRef.current = [];
    prizeImageHistoryRef.current = {};
    setImageHistoryTick((t) => t + 1);

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

  const handleUpdatePrizeImage = (
    prizeId: string,
    payload: { url?: string; base64?: string },
  ) => {
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id !== prizeId) return p;
        const prevSnap: PrizeImageSnapshot = {
          url: p.customImageUrl,
          base64: p.customImageBase64,
        };
        // Build the new value from the payload. Both fields are
        // supported simultaneously because the operator may upload
        // via Storage (preferred) but the offline path still needs to
        // round-trip through base64.
        const nextUrl = payload.url ?? p.customImageUrl;
        const nextBase64 = payload.base64 ?? p.customImageBase64;
        if (prevSnap.url === nextUrl && prevSnap.base64 === nextBase64) {
          return p;
        }
        const entry =
          prizeImageHistoryRef.current[prizeId] ??
          (prizeImageHistoryRef.current[prizeId] = {
            past: [],
            future: [],
          });
        entry.past.push(prevSnap);
        entry.future = [];
        setImageHistoryTick((t) => t + 1);
        return {
          ...p,
          customImageUrl: nextUrl,
          customImageBase64: nextBase64,
        };
      }),
    );
  };

  const handleClearPrizeImage = (prizeId: string) => {
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id !== prizeId) return p;
        if (!p.customImageUrl && !p.customImageBase64) return p;
        const entry =
          prizeImageHistoryRef.current[prizeId] ??
          (prizeImageHistoryRef.current[prizeId] = {
            past: [],
            future: [],
          });
        entry.past.push({
          url: p.customImageUrl,
          base64: p.customImageBase64,
        });
        entry.future = [];
        setImageHistoryTick((t) => t + 1);
        // === FIX: clear the entire payload object so PrizeGraphic
        //             falls back to the SVG placeholder. We also
        //             attempt to delete the Storage object (best
        //             effort — silently ignored on failure). ===
        const path = p.customImageUrl
          ? decodeStoragePathFromUrl(p.customImageUrl)
          : null;
        if (path) void deletePrizeImage(path);
        const { customImageUrl, customImageBase64, ...rest } = p;
        return rest as typeof p;
      }),
    );
  };

  const handleUndoPrizeImage = (prizeId: string) => {
    setPrizes((prev) => {
      const entry = prizeImageHistoryRef.current[prizeId];
      if (!entry?.past.length) return prev;
      const next = entry.past.pop()!;
      return prev.map((p) => {
        if (p.id !== prizeId) return p;
        entry.future.push({
          url: p.customImageUrl,
          base64: p.customImageBase64,
        });
        setImageHistoryTick((t) => t + 1);
        return applyImageSnapshot(p, next);
      });
    });
  };

  const handleRedoPrizeImage = (prizeId: string) => {
    setPrizes((prev) => {
      const entry = prizeImageHistoryRef.current[prizeId];
      if (!entry?.future.length) return prev;
      const next = entry.future.pop()!;
      return prev.map((p) => {
        if (p.id !== prizeId) return p;
        entry.past.push({
          url: p.customImageUrl,
          base64: p.customImageBase64,
        });
        setImageHistoryTick((t) => t + 1);
        return applyImageSnapshot(p, next);
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
          // === FIX: use ISO timestamp (UTC) instead of locale-dependent
          //             toLocaleTimeString, so the "lastSyncedAt" string is
          //             comparable and timezone-stable in the operator console ===
          lastSyncedAt: new Date().toISOString(),
        }));
      }

    return { successCount, failedCount };
  };

  // Google Sheets Test Row Generation
  const handleTestSync = async () => {
    const mockTestDraw: DrawResult = {
      id: `test-draw-${Date.now()}`,
      timestamp: new Date().toISOString(),
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

    // === FIX: persistent anti-fraud fingerprint cache so a hard refresh
    //             can't bypass duplicate detection via in-memory reset ===
    type FingerprintIndex = {
      ktp: string;
      whatsapp: string;
      deviceId: string;
    };
    const FINGERPRINT_KEY = "kvb_fraud_fingerprints_v2";
    const readFingerprints = (): FingerprintIndex[] => {
      try {
        const raw = localStorage.getItem(FINGERPRINT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const writeFingerprints = (list: FingerprintIndex[]) => {
      try {
        localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(list));
      } catch (_) {
        // ignore quota errors
      }
    };

    const fingerprints = readFingerprints();
    const dupFingerprint = fingerprints.find(
      (f) =>
        f.ktp === currentParticipant.ktp ||
        f.whatsapp === currentParticipant.whatsapp ||
        f.deviceId === currentParticipant.deviceId,
    );
    const liveDup = recentDraws.find(
      (log) =>
        log.status === "SUCCESS" &&
        (log.participantKtp === currentParticipant.ktp ||
          log.participantWhatsapp === currentParticipant.whatsapp ||
          log.deviceId === currentParticipant.deviceId),
    );

    if (riskConfig.antiFraudEnabled && (dupFingerprint || liveDup || userHasDrawn)) {
      // Record blocked attack in audit database
      const timestampF = new Date().toISOString();
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
      setBlockedNotice({
        isBlocked: true,
        reason:
          "Sistem KVB mendeteksi Anda telah melakukan pendaftaran ganda menggunakan dokumen KTP, perangkat, atau nomor WhatsApp yang sama. Putaran ditolak.",
      });

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

        // === FIX: walk the entire fallback ladder so a fully-depleted mid
        //             tier still yields an in-stock prize instead of returning
        //             a stock=0 candidate that would be decremented negative ===
        const FALLBACK_PRIZE_IDS = [
          "whitepaper",
          "gold_guide",
          "trade_signal",
          "vip_slot",
        ];
        const fallback =
          FALLBACK_PRIZE_IDS
            .map((id) => prizes.find((p) => p.id === id))
            .find((p): p is Prize => Boolean(p) && p.currentStock > 0) ??
          prizes[0];
        actualPrize = fallback;
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

    // Decrement the active prize stock (guarded: never let stock go negative)
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id === wonPrize.id && p.currentStock > 0) {
          return { ...p, currentStock: p.currentStock - 1 };
        }
        return p;
      }),
    );

    // Record draw log
    const timestampF = new Date().toISOString();
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

    // === FIX: persist this draw's fingerprint so the same device/account
    //             cannot bypass anti-fraud with a page refresh ===
    try {
      const FINGERPRINT_KEY = "kvb_fraud_fingerprints_v2";
      const raw = localStorage.getItem(FINGERPRINT_KEY);
      const list: { ktp: string; whatsapp: string; deviceId: string }[] =
        raw ? (JSON.parse(raw) as any) : [];
      const exists = list.some(
        (f) =>
          f.ktp === newLog.participantKtp ||
          f.whatsapp === newLog.participantWhatsapp ||
          f.deviceId === newLog.deviceId,
      );
      if (!exists) {
        list.push({
          ktp: newLog.participantKtp,
          whatsapp: newLog.participantWhatsapp,
          deviceId: newLog.deviceId,
        });
        localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(list));
      }
    } catch (_) {
      /* swallow quota errors */
    }
    setBlockedNotice(null);
    
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
      // === FIX: use a deterministic "per-second" offset for the bot
      //             timestamp so all 100 entries spread along the same minute
      //             instead of clustering on the same HH:MM (which made the
      //             audit table look like a single attack wave) ===
      const stamp = new Date(now.getTime() - (100 - i) * 1000).toISOString();

      const botLog = {
        id: `bot-attack-${i}-${Date.now()}`,
        timestamp: stamp,
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

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden text-slate-100 flex flex-col font-sans select-none antialiased bg-transparent`}
    >
      {/* Fixed Background Image Layer */}
      <div className="fixed inset-0 z-[-1] w-full h-full bg-[#030712] pointer-events-none">
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: customBg ? `url(${customBg})` : `url(/bg.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            willChange: "transform",
          }}
        />
        {/* Subtle dark overlay gradient for readability and design premium finish */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/30 to-[#030712]/80" />
      </div>

      {/* Dynamic Header */}
      <KvbHeader lang={lang} customLogo={customLogo} onToggleLang={() => setLang((p) => (p === "id" ? "zh" : "id"))} />

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
              const freedCode = currentParticipant?.ktp;
              if (freedCode) {
                setInvitationCodes((prev) =>
                  prev.map((c) =>
                    c.code.toUpperCase() === freedCode.toUpperCase()
                      ? { ...c, isUsed: false, usedBy: undefined }
                      : c,
                  ),
                );
              }
              setCurrentParticipant(null);
              setUserHasDrawn(false);
              setBlockedNotice(null);
            }}
            currentParticipant={currentParticipant}
            blockedDetails={blockedNotice}
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
                <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-slate-950/85 to-transparent"></div>
                <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-slate-950/85 to-transparent"></div>
              </div>
              <div className="font-mono text-[11px] animate-marquee-vertical hover:[animation-play-state:paused] flex flex-col gap-2.5">
                {recentDraws
                  .filter((d) => d.status === "SUCCESS")
                  .slice(0, 10)
                  .map((draw, i) => {
                    const prizeObj = prizes.find((pr) => pr.id === draw.prizeId);
                    const wonLabel = prizeObj ? prizeObj.label : draw.prizeLabel;

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
                          {/* === FIX: raw ISO timestamp is fine for sort/diff but
                                        looks awful in the live feed — render a
                                        short locale time without losing ISO
                                        semantics in the stored log entry === */}
                          {new Date(draw.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                      </div>
                    </div>
                  );
                })}
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
            onClearPrizeImage={handleClearPrizeImage}
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
            <span className="text-slate-500">
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
                  prize={lastWinAlert.prize}
                  className="relative z-10 h-[280px] w-[280px]"
                  emphasize
                  size="large"
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
                  className="w-1/2 bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2.5 px-4 rounded-xl text-xs text-slate-400 font-bold cursor-pointer"
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
