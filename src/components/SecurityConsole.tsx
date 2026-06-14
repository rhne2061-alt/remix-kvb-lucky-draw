import React, { useState } from "react";
import {
  ShieldAlert,
  Database,
  Clock,
  Ban,
  Server,
  AlertOctagon,
  RefreshCw,
  Users,
  CheckCircle,
  Table,
  FileSpreadsheet,
  Copy,
  Check,
  Award,
  Key,
  Trash2,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  Prize,
  RiskConfig,
  DrawResult,
  SecurityMetric,
  GoogleSheetsConfig,
  InvitationCode,
} from "../types";
import { PrizeGraphic } from "./PrizeGraphic";
import { PrizeUploadCard } from "./PrizeUploadCard";
import { TRANSLATIONS, GET_APPSCRIPT_TEMPLATE } from "../translations";
import {
  compressImageFileToDataUrl,
  validateImageUploadFile,
} from "../utils/images";

interface SecurityConsoleProps {
  prizes: Prize[];
  riskConfig: RiskConfig;
  metrics: SecurityMetric;
  sheetsConfig: GoogleSheetsConfig;
  onUpdateRiskConfig: (newConfig: Partial<RiskConfig>) => void;
  onUpdatePrizeStock: (prizeId: string, newStock: number) => void;
  onUpdatePrizeImage?: (prizeId: string, base64: string) => void;
  onUndoPrizeImage?: (prizeId: string) => void;
  onRedoPrizeImage?: (prizeId: string) => void;
  canUndoPrizeImage?: (prizeId: string) => boolean;
  canRedoPrizeImage?: (prizeId: string) => boolean;
  onUpdateCustomBg?: (base64: string) => void;
  onUndoCustomBg?: () => void;
  onRedoCustomBg?: () => void;
  canUndoCustomBg?: boolean;
  canRedoCustomBg?: boolean;
  customBg?: string;
  onUpdateCustomLogo?: (base64: string) => void;
  onUndoCustomLogo?: () => void;
  onRedoCustomLogo?: () => void;
  canUndoCustomLogo?: boolean;
  canRedoCustomLogo?: boolean;
  customLogo?: string;
  onResetDatabase: () => void;
  onRunBotAttack: () => void;
  recentDraws: DrawResult[];
  lang?: "zh" | "id";
  onUpdateSheetsConfig: (newConfig: Partial<GoogleSheetsConfig>) => void;
  onSyncExistingLogs: () => Promise<{
    successCount: number;
    failedCount: number;
  }>;
  onTestSync: () => Promise<{ success: boolean; error?: string }>;
  invitationCodes: InvitationCode[];
  onAddInvitationCode: (code: string) => void;
  onDeleteInvitationCode: (code: string) => void;
  onAddBulkInvitationCodes?: (codes: string[]) => void;
}

export default function SecurityConsole({
  prizes,
  riskConfig,
  metrics,
  sheetsConfig,
  onUpdateRiskConfig,
  onUpdatePrizeStock,
  onUpdatePrizeImage,
  onUndoPrizeImage,
  onRedoPrizeImage,
  canUndoPrizeImage,
  canRedoPrizeImage,
  onUpdateCustomBg,
  onUndoCustomBg,
  onRedoCustomBg,
  canUndoCustomBg,
  canRedoCustomBg,
  customBg,
  onUpdateCustomLogo,
  onUndoCustomLogo,
  onRedoCustomLogo,
  canUndoCustomLogo,
  canRedoCustomLogo,
  customLogo,
  onResetDatabase,
  onRunBotAttack,
  recentDraws,
  lang = "id",
  onUpdateSheetsConfig,
  onSyncExistingLogs,
  onTestSync,
  invitationCodes,
  onAddInvitationCode,
  onDeleteInvitationCode,
  onAddBulkInvitationCodes,
}: SecurityConsoleProps) {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<
    "sheets" | "stok" | "waktu" | "antifraud" | "logs" | "invitation" | "gambar"
  >("invitation");
  const [attackOutput, setAttackOutput] = useState<string[]>([]);
  const [isSimulatingAttack, setIsSimulatingAttack] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [localInvitationError, setLocalInvitationError] = useState<
    string | null
  >(null);

  const handleAddCustomCodeLocal = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalInvitationError(null);
    const code = customCodeInput.trim().toUpperCase();
    if (!code) return;

    if (invitationCodes.some((c) => c.code.toUpperCase() === code)) {
      setLocalInvitationError(
        lang === "zh"
          ? "🚫 该邀请资格码已存在！"
          : "🚫 Kode undangan sudah terdaftar!",
      );
      return;
    }

    onAddInvitationCode(code);
    setCustomCodeInput("");
  };

  const handleGenerateRandomLocal = () => {
    setLocalInvitationError(null);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Visual clarity values
    let randomStr = "";
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `KVB-${randomStr}`;

    if (invitationCodes.some((c) => c.code === code)) {
      // Retry once to prevent extremely rare collision
      handleGenerateRandomLocal();
      return;
    }

    onAddInvitationCode(code);
  };

  const handleGenerateBulkLocal = () => {
    if (!onAddBulkInvitationCodes) return;
    setLocalInvitationError(null);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const newCodes: string[] = [];
    const existing = new Set(invitationCodes.map((c) => c.code));

    while (newCodes.length < 100) {
      let randomStr = "";
      for (let i = 0; i < 4; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `KVB-${randomStr}`;
      if (!existing.has(code) && !newCodes.includes(code)) {
        newCodes.push(code);
      }
    }

    onAddBulkInvitationCodes(newCodes);
  };

  // States for sync interactions
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "error";
    message: string;
  } | null>(null);

  // High-value prizes to display stock control
  const highValuePrizes = prizes.filter((p) =>
    ["gold10g", "ninja250", "macbook", "iphone16"].includes(p.id),
  );

  // Determine if simulated time is within 19:30 - 21:00
  const checkIsWithinGoldenHour = (hour: number, minute: number) => {
    const totalMinutes = hour * 60 + minute;
    const startMins = 19 * 60 + 30; // 19:30
    const endMins = 21 * 60; // 21:00
    return totalMinutes >= startMins && totalMinutes <= endMins;
  };

  const isGolden = checkIsWithinGoldenHour(
    riskConfig.simulatedHour,
    riskConfig.simulatedMinute,
  );

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleImageUpload = async (params: {
    file: File;
    maxFileSizeBytes: number;
    compression: {
      maxWidth?: number;
      maxHeight?: number;
      maxSize?: number;
      mimeType: string;
      quality: number;
    };
    onSuccess: (dataUrl: string) => void;
  }) => {
    const validation = validateImageUploadFile(params.file, {
      maxFileSizeBytes: params.maxFileSizeBytes,
    });

    if (!validation.ok) {
      setUploadFeedback({
        type: "error",
        message:
          lang === "zh"
            ? validation.error
            : "File tidak valid. Gunakan PNG/JPG/WEBP dan ukuran yang aman.",
      });
      return;
    }

    try {
      console.log('[upload] Starting compression, file:', params.file.name, params.file.size, params.file.type);
      const dataUrl = await compressImageFileToDataUrl(
        params.file,
        params.compression,
      );
      console.log('[upload] Compression done, dataUrl length:', dataUrl?.length, 'prefix:', dataUrl?.substring(0, 60));
      setUploadFeedback(null);
      params.onSuccess(dataUrl);
    } catch (err) {
      console.error('[upload] Compression failed:', err);
      setUploadFeedback({
        type: "error",
        message:
          lang === "zh"
            ? "图片处理失败，请换一张更小的 PNG/JPG/WEBP 图片重试"
            : "Gagal memproses gambar. Coba lagi dengan PNG/JPG/WEBP yang lebih kecil.",
      });
    }
  };

  const incrementTime = (amountHours: number) => {
    let nextHour = (riskConfig.simulatedHour + amountHours) % 24;
    onUpdateRiskConfig({ simulatedHour: nextHour });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GET_APPSCRIPT_TEMPLATE("Sheet1"));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunBotAttackSimulation = () => {
    if (isSimulatingAttack) return;
    setIsSimulatingAttack(true);
    setAttackOutput([
      lang === "zh"
        ? "[系统初始化] 启动防御压力测试与 Bot 集群拦截检查..."
        : "[SISTEM INITIALIZE] Meluncurkan Script Stress Test Keamanan...",
      lang === "zh"
        ? "[防抖探测] 捕获到 100 组虚拟机指纹多开尝试..."
        : "[INFO] Mendeteksi 100 emulator & bot farm multi-browser IP...",
    ]);
    onRunBotAttack();

    let logs: string[] = [];
    const blockReasons =
      lang === "zh"
        ? [
            "重合 WhatsApp (多账户共用单设备)",
            "重复邀请校验码 (核销状态哈希碰撞阻断)",
            "触发硬件沙箱特征 (Device id 重合拦截)",
          ]
        : [
            "Duplikasi WhatsApp (ID Akun sama di server)",
            "Duplikasi Kode Undangan (Kode terikat investor lain)",
            "Duplikasi Perangkat / Device Fingerprint (Emulasi Sandbox)",
          ];

    setTimeout(() => {
      logs.push(
        lang === "zh"
          ? "[拦截阻击] 攻击源 Bot #01 非法撞库被重定向..."
          : "[ATTACK BEGUN] Bot #01 menyerang dengan bypass parameter...",
      );
      setAttackOutput([...logs]);
    }, 200);

    setTimeout(() => {
      logs.push(`[BLOCKED] Bot #03 - ${blockReasons[0]}.`);
      logs.push(`[BLOCKED] Bot #07 - ${blockReasons[2]}.`);
      setAttackOutput([...logs]);
    }, 500);

    setTimeout(() => {
      logs.push(`[BLOCKED] Bot #15 - ${blockReasons[1]}.`);
      logs.push(`[BLOCKED] Bot #24 - ${blockReasons[2]}.`);
      logs.push(
        lang === "zh"
          ? `[自主熔断] 5克贵金属金条库存零耗损！`
          : `[AUTO-FAILSAFE] Stok emas tetap terlindungi 100%!`,
      );
      setAttackOutput([...logs]);
    }, 850);

    setTimeout(() => {
      logs.push(
        lang === "zh"
          ? `[彻底净化] Bot #50 - #100 攻击集群被全数销毁并物理标记。`
          : `[BLOCKED] Bot #50 - #100 diisolasi dalam Sandbox.`,
      );
      logs.push(
        lang === "zh"
          ? "[测试成功] 防火墙测试结束。Bot 集群成功荡平！"
          : "[SUCCESS] Stress Test Selesai. Seluruh bot berhasil dieliminasi!",
      );
      logs.push(
        lang === "zh"
          ? `📊 审计报告结果：+100 拦截数已归档。`
          : `📊 Hasil Defleksi Keamanan: +100 Upaya Berhasil Diblokir.`,
      );
      setAttackOutput([...logs]);
      setIsSimulatingAttack(false);
    }, 1500);
  };

  const handleTestSheets = async () => {
    setSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await onTestSync();
      if (res.success) {
        setSyncFeedback({
          type: "success",
          message:
            lang === "zh"
              ? "✅ 连接并测试写入成功！请刷新您的谷歌表格检查首行数据。"
              : "✅ Koneksi & Uji tulis sukses! Silakan muat ulang Google Sheets Anda.",
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: `${lang === "zh" ? "❌ 连接测试失败" : "❌ Koneksi gagal"}: ${res.error}`,
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: "error", message: err.message || String(err) });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncAllHistory = async () => {
    setSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncExistingLogs();
      setSyncFeedback({
        type: "success",
        message:
          lang === "zh"
            ? `✅ 历史推送完成！成功同步 ${res.successCount} 条记录，失败 ${res.failedCount} 条。`
            : `✅ Push riwayat berhasil! Berhasil sinkronisasi ${res.successCount} data, gagal ${res.failedCount} data.`,
      });
    } catch (err: any) {
      setSyncFeedback({ type: "error", message: err.message || String(err) });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div
      id="security-console"
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden mt-8 text-left text-slate-100"
    >
      {/* Header Panel */}
      <div className="bg-transparent px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500 animate-[pulse_2.0s_infinite]" />
          <div>
            <h3 className="font-bold text-white text-xs tracking-wide uppercase">
              {t.adminTitle}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {t.adminSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-705 cursor-pointer active:scale-97 font-sans"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t.resetSession}</span>
          </button>
        </div>
      </div>

      {/* Statistics Quick Counter Grids */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800 bg-zinc-950 text-xs">
        <div className="p-4 border-r border-zinc-800 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
            {t.totalDraws}
          </span>
          <span className="text-xl font-bold text-white font-mono mt-1">
            {metrics.totalDraws}
          </span>
        </div>
        <div className="p-4 border-r border-zinc-800 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
            {t.blockedAttempts}
          </span>
          <span className="text-xl font-bold text-rose-400 font-mono mt-1 flex items-center gap-1.5">
            {metrics.blockedAttempts}
            {metrics.blockedAttempts > 0 && (
              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.5 rounded font-bold font-sans">
                {Math.round(
                  (metrics.blockedAttempts / metrics.totalDraws) * 100,
                )}
                %
              </span>
            )}
          </span>
        </div>
        <div className="p-4 border-r border-e0 sm:border-r border-zinc-800 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
            {t.successfulDraws}
          </span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {metrics.successfulDraws}
          </span>
        </div>
        <div className="p-4 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
            {t.downgradedDraws}
          </span>
          <span className="text-xl font-bold text-amber-400 font-mono mt-1">
            {metrics.downgradedDraws}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-zinc-800 bg-zinc-900 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => setActiveTab("invitation")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "invitation"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <Key className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span>
            {lang === "zh"
              ? "受邀邀请码核销管理 (Invitation Codes)"
              : "Kode Undangan"}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("gambar")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "gambar"
              ? "border-amber-400 text-amber-300 bg-zinc-800"
              : "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800/10"
          }`}
        >
          <img
            className="h-3.5 w-3.5"
            src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>"
          />
          <span>{lang === "zh" ? "上传奖品图片" : "Unggah Gambar Hadiah"}</span>
        </button>

        <button
          onClick={() => setActiveTab("sheets")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "sheets"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>{t.syncSheetsTab}</span>
        </button>

        <button
          onClick={() => setActiveTab("stok")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "stok"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>{t.stockCapTab}</span>
        </button>

        <button
          onClick={() => setActiveTab("waktu")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "waktu"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{t.timeSlotTab}</span>
        </button>

        <button
          onClick={() => setActiveTab("antifraud")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "antifraud"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
          <span>{t.antifraudTab}</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "logs"
              ? "border-amber-400 text-amber-300 bg-slate-900/40"
              : "border-transparent text-slate-450 hover:text-white hover:bg-slate-900/10"
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          <span>
            {t.auditLogsTab} ({recentDraws.length})
          </span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="p-6 text-sm">
        {/* TAB -1: Invitation Code management panel */}
        {activeTab === "invitation" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-[#1e2d52] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-amber-400" />
                  <span>
                    {lang === "zh"
                      ? "内部专用：投资人专属受邀验证码生成器"
                      : "Pusat Kode Undangan Finansial"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black bg-emerald-400/10 text-emerald-400 border border-emerald-500/30">
                    {lang === "zh" ? "主承销商准入" : "Access Granted"}
                  </span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  {lang === "zh"
                    ? "在内部人士专区为新晋合格投资者派发和生成抽奖密钥，每一个邀请码只能由单个投资者在一台设备环境上完成认领抽选，杜绝未获特许的用户随意参与，中奖记录实时直报接入谷歌表格。"
                    : "Hasilkan & kelola tiket kode undangan untuk memastikan hanya investor terpilih yang dapat memutar roda KVB."}
                </p>
              </div>
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Creator Card */}
              <div className="lg:col-span-5 bg-[#090f20]/60 p-5 rounded-xl border border-slate-800 space-y-5">
                <div>
                  <span className="text-[10px] text-amber-400 font-mono block uppercase tracking-wide">
                    {lang === "zh"
                      ? "1. 生成新投资者邀请码"
                      : "1. Tambah Kode Undangan Baru"}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === "zh"
                      ? "可在下方手动定义专属渠道邀请码，或直接一键高频随机生成。"
                      : "Definisikan kode custom atau gunakan auto-generator."}
                  </p>
                </div>

                <form onSubmit={handleAddCustomCodeLocal} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 font-mono">
                      {lang === "zh"
                        ? "自定义新邀请验证码："
                        : "Kode Undangan Custom:"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="例: KVB-NEWYEAR"
                        value={customCodeInput}
                        onChange={(e) =>
                          setCustomCodeInput(
                            e.target.value.toUpperCase().replace(/\s/g, ""),
                          )
                        }
                        className="flex-1 bg-[#070b17] border border-slate-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                      />
                      <button
                        type="submit"
                        disabled={!customCodeInput.trim()}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{lang === "zh" ? "绑定增加" : "Tambah"}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {localInvitationError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs leading-relaxed font-sans">
                    {localInvitationError}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800/80">
                  <span className="text-[10px] text-emerald-400 font-mono block mb-2 font-mono uppercase tracking-wide">
                    {lang === "zh" ? "快捷方式" : "Opsi Cepat"}
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerateRandomLocal}
                      className="w-full bg-gradient-to-r from-amber-500/80 to-amber-600/80 hover:from-amber-600 hover:to-amber-755 text-slate-950 text-xs py-2.5 px-4 rounded-xl font-black cursor-pointer transition-all active:scale-97 flex items-center justify-center gap-2"
                    >
                      <Key className="h-4 w-4 shrink-0" />
                      <span>
                        {lang === "zh"
                          ? "🎲 生成 1 个随机受邀码"
                          : "🎲 Generate 1 Tiket KVB"}
                      </span>
                    </button>
                    <button
                      onClick={handleGenerateBulkLocal}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs py-2 px-4 rounded-xl font-bold cursor-pointer transition-all active:scale-97 flex items-center justify-center gap-2"
                    >
                      <Database className="h-4 w-4 shrink-0" />
                      <span>
                        {lang === "zh"
                          ? "🚀 批量生成 100 个随机受邀码"
                          : "🚀 Generate 100 Tiket (Bulk)"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status List Code Table */}
              <div className="lg:col-span-7 bg-[#090f20]/40 p-5 rounded-xl border border-slate-850 flex flex-col h-[340px]">
                <div className="flex justify-between items-center mb-3.5">
                  <span className="text-[10px] text-emerald-400 font-mono block uppercase tracking-wide">
                    {lang === "zh"
                      ? "2. 受邀网络状态监测与审计清单"
                      : "2. Status & Penggunaan Kode"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const unusedCodes = invitationCodes.filter(c => !c.isUsed).map(c => c.code).join("\n");
                        if (unusedCodes) {
                          navigator.clipboard.writeText(unusedCodes);
                          alert(lang === "zh" ? "已复制全部可用邀请码！" : "Semua kode yang tersedia berhasil disalin!");
                        } else {
                          alert(lang === "zh" ? "没有可用的邀请码" : "Tidak ada kode yang tersedia");
                        }
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition-colors"
                    >
                      {lang === "zh" ? "一键复制可用码" : "Salin Kode Tersedia"}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Total: {invitationCodes.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/20 scrollbar-thin">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-[#121c38] text-slate-400 uppercase tracking-widest border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2">
                          {lang === "zh" ? "邀请资格码" : "Kode"}
                        </th>
                        <th className="px-3.5 py-2">
                          {lang === "zh" ? "核销人 / 状态" : "Status / User"}
                        </th>
                        <th className="px-3.5 py-2 text-right">
                          {lang === "zh" ? "操作" : "Aksi"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {invitationCodes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center italic text-slate-600"
                          >
                            {lang === "zh"
                              ? "暂无邀请码。请点击左侧生成。"
                              : "Belum ada kode undangan terdaftar."}
                          </td>
                        </tr>
                      ) : (
                        [...invitationCodes].reverse().map((c) => (
                          <tr
                            key={c.code}
                            className="hover:bg-slate-900/30 transition-colors"
                          >
                            <td className="px-3.5 py-2.5 font-bold text-white whitespace-nowrap flex items-center gap-1">
                              <span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded select-all">
                                {c.code}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {c.isUsed ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-sans">
                                    {lang === "zh" ? "已核销" : "USED"}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-sans tracking-normal">
                                    👤 {c.usedBy}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold font-sans">
                                  {lang === "zh" ? "可用" : "ACTIVE"}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => onDeleteInvitationCode(c.code)}
                                disabled={c.isUsed}
                                className="text-rose-400 hover:text-rose-300 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-550/10 hover:border-rose-500/30 rounded"
                                title={
                                  lang === "zh" ? "删除邀请码" : "Hapus kode"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: Sync Google Sheets (NEW FEATURE) */}
        {activeTab === "sheets" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-[#1e2d52] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Table className="h-4.5 w-4.5 text-emerald-400" />
                  <span>
                    {lang === "zh"
                      ? "谷歌云端表格实时同步器"
                      : "Infrastruktur Google Sheets Sync Node"}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-black ${
                      sheetsConfig.webappUrl ||
                      (sheetsConfig.syncMethod === "direct" &&
                        sheetsConfig.spreadsheetId)
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30 animate-pulse"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {sheetsConfig.webappUrl ||
                    (sheetsConfig.syncMethod === "direct" &&
                      sheetsConfig.spreadsheetId)
                      ? t.sheetsStatusConnected
                      : t.sheetsStatusNotConnected}
                  </span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  {lang === "zh"
                    ? "把每一位投资者的抽奖时间、受邀渠道验证码、设备序列号及获赠礼遇，实时、无人工干预地写入您的谷歌在线 Spreadsheet 表格中，用做大额派奖对账和销售转化通道！"
                    : "Gunakan Google Apps Script atau OAuth API untuk merekam setiap putaran hadiah investor langsung ke Google Sheets Anda secara real-time."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">
                  {lang === "zh" ? "实时自动上报：" : "Auto Sync:"}
                </span>
                <button
                  onClick={() =>
                    onUpdateSheetsConfig({ autoSync: !sheetsConfig.autoSync })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                    sheetsConfig.autoSync ? "bg-amber-400" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ${
                      sheetsConfig.autoSync ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sync configuration layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Config Card */}
              <div className="bg-[#090f20]/60 p-5 rounded-xl border border-slate-800 space-y-4">
                <span className="text-[10px] text-amber-400 font-mono block uppercase tracking-wide">
                  1. CONNECTION PARAMETERS (连接参数)
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    {t.sheetsMethodLabel}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        sheetsConfig.syncMethod === "webapp"
                          ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300"
                          : "border-slate-800 hover:bg-slate-900/30 text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMethod"
                        value="webapp"
                        checked={sheetsConfig.syncMethod === "webapp"}
                        onChange={() =>
                          onUpdateSheetsConfig({ syncMethod: "webapp" })
                        }
                        className="mt-0.5 accent-emerald-400"
                      />
                      <div>
                        <span className="font-bold block">
                          {t.sheetsMethodWebapp}
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        sheetsConfig.syncMethod === "direct"
                          ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
                          : "border-slate-800 hover:bg-slate-900/30 text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMethod"
                        value="direct"
                        checked={sheetsConfig.syncMethod === "direct"}
                        onChange={() =>
                          onUpdateSheetsConfig({ syncMethod: "direct" })
                        }
                        className="mt-0.5 accent-amber-400"
                      />
                      <div>
                        <span className="font-bold block">
                          {t.sheetsMethodDirect}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Conditional Fields depending on selected Method */}
                {sheetsConfig.syncMethod === "webapp" ? (
                  <div className="space-y-3.5 pt-2 animate-fade-in">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                        {t.sheetsAppscriptUrl}
                      </label>
                      <input
                        type="text"
                        placeholder={t.sheetsAppscriptUrlPlace}
                        value={sheetsConfig.webappUrl}
                        onChange={(e) =>
                          onUpdateSheetsConfig({
                            webappUrl: e.target.value.trim(),
                          })
                        }
                        className="w-full bg-[#070b17] border border-slate-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-2 animate-fade-in">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                        {t.sheetsSpreadsheetId}
                      </label>
                      <input
                        type="text"
                        placeholder={t.sheetsSpreadsheetIdPlace}
                        value={sheetsConfig.spreadsheetId}
                        onChange={(e) =>
                          onUpdateSheetsConfig({
                            spreadsheetId: e.target.value.trim(),
                          })
                        }
                        className="w-full bg-[#070b17] border border-slate-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono flex justify-between items-center">
                        <span>{t.sheetsAccessToken}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          OAuth Bearer
                        </span>
                      </label>
                      <input
                        type="password"
                        placeholder={t.sheetsAccessTokenPlace}
                        value={sheetsConfig.accessToken}
                        onChange={(e) =>
                          onUpdateSheetsConfig({
                            accessToken: e.target.value.trim(),
                          })
                        }
                        className="w-full bg-[#070b17] border border-slate-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono tracking-widest"
                      />
                    </div>
                  </div>
                )}

                {/* Auto Synchronizer Action Triggers */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleTestSheets}
                    disabled={syncLoading}
                    className="w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-4 rounded-xl border border-slate-700 font-bold cursor-pointer transition-all disabled:opacity-50 active:scale-97"
                  >
                    {syncLoading ? "..." : t.sheetsTestButton}
                  </button>

                  <button
                    onClick={handleSyncAllHistory}
                    disabled={syncLoading || recentDraws.length === 0}
                    className="w-full text-center bg-gradient-to-r from-emerald-500/80 to-teal-600/80 hover:from-emerald-600 hover:to-teal-700 text-white text-xs py-2 px-4 rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50 active:scale-97"
                  >
                    {syncLoading
                      ? "..."
                      : t.sheetsSyncAllButton.replace(
                          "{count}",
                          String(recentDraws.length),
                        )}
                  </button>
                </div>

                {/* Push feedback */}
                {syncFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      syncFeedback.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {syncFeedback.message}
                  </div>
                )}
              </div>

              {/* Right Tutorial & Code script panel */}
              <div className="bg-[#090f20]/40 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-[10px] text-emerald-400 font-mono block uppercase tracking-wide">
                    2. DEPLOY APPS SCRIPT CODE (部署指南与代码)
                  </span>

                  <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <p className="font-bold text-white text-xs mb-1">
                      {t.sheetsInstructionsTitle}
                    </p>
                    <p className="pl-1 text-slate-400 text-[11px] leading-relaxed">
                      {t.sheetsInstructionsStep1}
                    </p>
                    <p className="pl-1 text-slate-400 text-[11px] leading-relaxed">
                      {t.sheetsInstructionsStep2}
                    </p>
                    <p className="pl-1 text-slate-400 text-[11px] leading-relaxed">
                      {t.sheetsInstructionsStep3}
                    </p>
                    <p className="pl-1 text-slate-400 text-[11px] leading-relaxed">
                      {t.sheetsInstructionsStep4}
                    </p>
                  </div>
                </div>

                {/* Real-time copyable editor sandbox */}
                <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden bg-black/50 text-left flex flex-col">
                  <div className="bg-slate-900 px-3.5 py-2 border-b border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-500 shrink-0">
                    <span>Code.gs (Google Apps Script)</span>
                    <button
                      onClick={handleCopyCode}
                      className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-405" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{isCopied ? t.codeCopied : t.copyScriptCode}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 font-mono text-[9px] text-slate-450 overflow-x-auto max-h-[140px] leading-relaxed select-all">
                    {GET_APPSCRIPT_TEMPLATE("Sheet1")}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB Gambar: Image Uploads */}
        {activeTab === "gambar" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>
                    {lang === "zh"
                      ? "应用视觉及奖品配图设置"
                      : "Pengaturan Visual & Gambar Hadiah"}
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {lang === "zh"
                    ? "在此处直观地设置转盘或九宫格里展示的奖项实物图片以及全局背景墙纸。（系统通过客户端级压缩技术实现无服务器图片托管）"
                    : "Atur gambar latar belakang global dan gambar kustom masing-masing hadiah langsung di sini. Data diamankan menggunakan sistem kompresi lokal."}
                </p>
              </div>
            </div>

            {uploadFeedback && (
              <div className="p-3 rounded-lg text-xs leading-relaxed bg-rose-500/10 border border-rose-500/30 text-rose-300">
                {uploadFeedback.message}
              </div>
            )}

            {/* Custom Background Upload */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">
                  {lang === "zh" ? "全局主题壁纸" : "Latar Belakang Tema"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === "zh" ? "上传高清晰度的背景图片以强化视觉冲击感。" : "Unggah gambar latar belakang resolusi tinggi untuk efek visual yang menarik."}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <label htmlFor="upload-bg-input" className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500 px-4 py-2 rounded-lg cursor-pointer font-bold transition-colors">
                    {lang === "zh" ? "⬆️ 浏览并上传背景" : "⬆️ Unggah Background"}
                  </label>
                  <input
                    id="upload-bg-input"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void handleImageUpload({
                        file,
                        maxFileSizeBytes: 5 * 1024 * 1024,
                        compression: {
                          maxWidth: 1920,
                          maxHeight: 1080,
                          mimeType: "image/webp",
                          quality: 0.7,
                        },
                        onSuccess: (dataUrl) => onUpdateCustomBg?.(dataUrl),
                      });
                    }}
                  />
                  {onUndoCustomBg && (
                    <button
                      disabled={!canUndoCustomBg}
                      onClick={() => onUndoCustomBg()}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold transition-colors border ${
                        canUndoCustomBg
                          ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
                          : "text-slate-500 border-slate-800 bg-slate-900/30 cursor-not-allowed"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Undo2 className="h-3.5 w-3.5" />
                        {lang === "zh" ? "撤销" : "Undo"}
                      </span>
                    </button>
                  )}
                  {onRedoCustomBg && (
                    <button
                      disabled={!canRedoCustomBg}
                      onClick={() => onRedoCustomBg()}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold transition-colors border ${
                        canRedoCustomBg
                          ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
                          : "text-slate-500 border-slate-800 bg-slate-900/30 cursor-not-allowed"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Redo2 className="h-3.5 w-3.5" />
                        {lang === "zh" ? "重做" : "Redo"}
                      </span>
                    </button>
                  )}
                  {customBg && (
                    <button
                      onClick={() => onUpdateCustomBg && onUpdateCustomBg("")}
                      className="text-xs text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 bg-rose-500/10 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {lang === "zh" ? "清除背景" : "Hapus Background"}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-64 h-32 border-2 border-dashed border-zinc-700 bg-black/50 rounded-xl overflow-hidden flex items-center justify-center realtive">
                {customBg ? (
                  <img src={customBg} alt="background preview" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <span className="text-zinc-600 font-bold text-sm tracking-widest uppercase">
                    {lang === "zh" ? "暂无背景预览" : "TIDAK ADA PREVIEW"}
                  </span>
                )}
              </div>
            </div>

            {/* Custom Logo Upload */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">
                  {lang === "zh" ? "全局顶部 Logo (Header Logo)" : "Logo Header Global"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === "zh" ? "上传您的专属 Logo 以替换顶部的默认标志。建议上传透明背景的 PNG 格式。" : "Unggah logo eksklusif Anda untuk menggantikan logo bawaan di bagian atas. Format PNG transparan disarankan."}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <label htmlFor="upload-logo-input" className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500 px-4 py-2 rounded-lg cursor-pointer font-bold transition-colors">
                    {lang === "zh" ? "⬆️ 浏览并上传 Logo" : "⬆️ Unggah Logo"}
                  </label>
                  <input
                    id="upload-logo-input"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void handleImageUpload({
                        file,
                        maxFileSizeBytes: 2 * 1024 * 1024,
                        compression: {
                          maxWidth: 600,
                          maxHeight: 200,
                          mimeType: "image/webp",
                          quality: 0.9,
                        },
                        onSuccess: (dataUrl) => onUpdateCustomLogo?.(dataUrl),
                      });
                    }}
                  />
                  {onUndoCustomLogo && (
                    <button
                      disabled={!canUndoCustomLogo}
                      onClick={() => onUndoCustomLogo()}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold transition-colors border ${
                        canUndoCustomLogo
                          ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
                          : "text-slate-500 border-slate-800 bg-slate-900/30 cursor-not-allowed"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Undo2 className="h-3.5 w-3.5" />
                        {lang === "zh" ? "撤销" : "Undo"}
                      </span>
                    </button>
                  )}
                  {onRedoCustomLogo && (
                    <button
                      disabled={!canRedoCustomLogo}
                      onClick={() => onRedoCustomLogo()}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold transition-colors border ${
                        canRedoCustomLogo
                          ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
                          : "text-slate-500 border-slate-800 bg-slate-900/30 cursor-not-allowed"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Redo2 className="h-3.5 w-3.5" />
                        {lang === "zh" ? "重做" : "Redo"}
                      </span>
                    </button>
                  )}
                  {customLogo && (
                    <button
                      onClick={() => onUpdateCustomLogo && onUpdateCustomLogo("")}
                      className="text-xs text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 bg-rose-500/10 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {lang === "zh" ? "恢复默认 Logo" : "Pulihkan Logo Bawaan"}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-64 h-32 border-2 border-dashed border-zinc-700 bg-black/50 rounded-xl overflow-hidden flex items-center justify-center realtive">
                {customLogo ? (
                  <img src={customLogo} alt="logo preview" className="p-4 w-full h-full object-contain" />
                ) : (
                  <span className="text-zinc-600 font-bold text-sm tracking-widest uppercase">
                    {lang === "zh" ? "暂无 Logo 预览" : "TIDAK ADA PREVIEW"}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-zinc-800" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {prizes.map((p) => (
                <PrizeUploadCard
                  key={p.id}
                  prize={p}
                  lang={lang}
                  canUndo={canUndoPrizeImage?.(p.id) ?? false}
                  canRedo={canRedoPrizeImage?.(p.id) ?? false}
                  onUpload={(base64) => onUpdatePrizeImage?.(p.id, base64)}
                  onUndo={() => onUndoPrizeImage?.(p.id)}
                  onRedo={() => onRedoPrizeImage?.(p.id)}
                  onClear={() => onUpdatePrizeImage?.(p.id, "")}
                  onUploadError={(msg) =>
                    setUploadFeedback({ type: "error", message: msg })
                  }
                  onUploadClear={() => setUploadFeedback(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: Stock Cap */}
        {activeTab === "stok" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-[#1e2d52] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>
                    {lang === "zh"
                      ? "高价值实物投放平滑自适应防护 (Stock Cap)"
                      : "Prinsip Perlindungan Aset Finansial"}
                  </span>
                  <span className="text-[10px] bg-red-400/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                    Failsafe Aktif
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {t.failsafeSummary}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-300">Status Rule:</span>
                <button
                  onClick={() =>
                    onUpdateRiskConfig({
                      stockCapEnabled: !riskConfig.stockCapEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                    riskConfig.stockCapEnabled ? "bg-amber-400" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ${
                      riskConfig.stockCapEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* High level stock monitor & test buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {highValuePrizes.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                        style={{
                          backgroundColor: `${p.color}40`,
                          color: p.color,
                        }}
                      >
                        {lang === "zh" ? p.levelZh : p.level}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lang === "zh" ? "周放额" : "Limit"}: {p.weeklyCap}
                      </span>
                    </div>
                    <span className="text-white font-bold text-xs block truncate mt-2">
                      {lang === "zh" ? p.labelZh : p.label}
                    </span>

                    {/* Stock level indicators */}
                    <div className="flex items-baseline gap-2 mt-3.5">
                      <span
                        className={`text-2xl font-bold font-mono ${p.currentStock > 0 ? "text-emerald-400" : "text-rose-500"}`}
                      >
                        {p.currentStock}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {lang === "zh" ? "件可用" : "tersedia"}
                      </span>
                    </div>

                    {/* Graphical progress bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${p.currentStock > 0 ? "bg-emerald-400" : "bg-rose-500"}`}
                        style={{
                          width: `${(p.currentStock / p.initialStock) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Manual trigger tool to test downgrade rules */}
                  <div className="mt-4 flex gap-1.5">
                    <button
                      onClick={() => onUpdatePrizeStock(p.id, 0)}
                      disabled={p.currentStock === 0}
                      className="w-full text-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-50 text-[10px] py-1.5 px-2 rounded-lg font-semibold border border-rose-500/15 transition-all cursor-pointer"
                    >
                      {lang === "zh" ? "设为 0 (测试降级)" : "Habiskan Stok"}
                    </button>
                    <button
                      onClick={() => onUpdatePrizeStock(p.id, p.initialStock)}
                      className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 px-2.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
                      title="Refill"
                    >
                      {lang === "zh" ? "补仓" : "Isi"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Time-slot Release */}
        {activeTab === "waktu" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-[#1e2d52] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">
                  {lang === "zh"
                    ? "社交引流高峰黄金时段控制 (Golden Hour)"
                    : "Distribusi Peluang Berdasarkan Jam Aktif"}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {t.goldenHourDesc}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-300">
                  {lang === "zh" ? "黄金锁：" : "Deteksi Slot:"}
                </span>
                <button
                  onClick={() =>
                    onUpdateRiskConfig({
                      timeReleaseEnabled: !riskConfig.timeReleaseEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                    riskConfig.timeReleaseEnabled
                      ? "bg-amber-400"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ${
                      riskConfig.timeReleaseEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Time controller simulator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <span className="text-[10px] text-slate-450 font-mono block mb-1">
                  SIMULATOR WAKTU SISTEM
                </span>
                <div className="flex items-center gap-4 mt-2">
                  <div className="bg-slate-950 px-4 py-2.5 rounded border border-slate-800 text-2xl font-bold font-mono text-cyan-400 select-none">
                    {formatTime(
                      riskConfig.simulatedHour,
                      riskConfig.simulatedMinute,
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full text-xs">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => incrementTime(1)}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg border border-slate-700 cursor-pointer"
                      >
                        +1 Hrs
                      </button>
                      <button
                        onClick={() => incrementTime(6)}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg border border-slate-700 cursor-pointer"
                      >
                        +6 Hrs
                      </button>
                      <button
                        onClick={() =>
                          onUpdateRiskConfig({
                            simulatedHour: 20,
                            simulatedMinute: 0,
                          })
                        }
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-650 hover:to-amber-700 text-slate-950 font-black text-xs py-1 px-3 rounded-lg cursor-pointer"
                      >
                        Set 20:00 (Golden Slot!)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    {lang === "zh"
                      ? "当前目标区间判定："
                      : "Status Target Slot:"}
                  </span>
                  {isGolden ? (
                    <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                      Golden Slot IN ACTIVE (19:30 - 21:00)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded">
                      Standard Low Probability Slot
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Rates Table showing golden changes */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 text-xs text-left">
                <span className="font-bold text-slate-300 mb-2 block">
                  {lang === "zh"
                    ? "风控算法实时概率曲线变化："
                    : "Daftar Probabilitas Waktu Nyata:"}
                </span>
                <div className="space-y-2 mt-2 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-slate-850 pb-1">
                    <span className="text-slate-500">Prize</span>
                    <span className="text-slate-500">Standard Rate</span>
                    <span className="text-slate-500">Golden Peak Rate</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>5g Gold bar:</span>
                    <span>0.02%</span>
                    <span className="text-amber-400 font-bold">
                      0.05% (+2.5x Boost)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>iPhone 16:</span>
                    <span>0.10%</span>
                    <span className="text-emerald-400 font-bold">
                      1.00% (10x Boost)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>E-Wallet Voucher:</span>
                    <span>1.50%</span>
                    <span className="text-emerald-400 font-bold text-right">
                      7.50% (5x Boost)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Anti-Fraud Guard */}
        {activeTab === "antifraud" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-[#1e2d52] grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <h4 className="font-bold text-white text-sm">
                  {lang === "zh"
                    ? "反垃圾、反多账户注册多维风控拦截"
                    : "Filter Verifikasi & Pencegahan Multiguna"}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {t.antiFraudDesc}
                </p>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 bg-[#101931] p-3 rounded-xl border border-[#1e2d52]">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium">{t.antiFraudButtonLabel}</span>
                  <button
                    onClick={() =>
                      onUpdateRiskConfig({
                        antiFraudEnabled: !riskConfig.antiFraudEnabled,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                      riskConfig.antiFraudEnabled
                        ? "bg-amber-400"
                        : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ${
                        riskConfig.antiFraudEnabled
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated hacking testing lab */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-450 font-mono block">
                    SIMULASI ATTACK LABORATORY
                  </span>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    使用 KVB 物理隔离技术测试转盘对 100 组 Bot
                    机群、代理、多开模拟的极端拦截能力。触发后拦截结果实时写入审计日志。
                  </p>
                </div>
                <button
                  onClick={handleRunBotAttackSimulation}
                  disabled={isSimulatingAttack}
                  className="w-full mt-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow cursor-pointer active:scale-97 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  <span>
                    {isSimulatingAttack ? t.runningBot : t.runBotButton}
                  </span>
                </button>
              </div>

              {/* Console log outputs */}
              <div className="md:col-span-2 bg-black border border-slate-850 rounded-xl p-4 font-mono text-[10px] h-[160px] overflow-y-auto text-slate-300 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-850 pb-1 mb-2 text-slate-500 shrink-0">
                  <span>TERMINAL FILTER SECURITY SHELL v2.0</span>
                  <span className="text-rose-400 animate-pulse">
                    ● MEMONITOR SERANGAN
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {attackOutput.length === 0 ? (
                    <span className="text-slate-650 italic leading-loose block">
                      {t.terminalEmpty}
                    </span>
                  ) : (
                    attackOutput.map((out, index) => (
                      <div
                        key={index}
                        className={`leading-relaxed ${
                          out.startsWith("[BLOCKED") ||
                          out.startsWith(" [BLOCKED")
                            ? "text-red-400"
                            : out.startsWith("[SUCCESS]") ||
                                out.includes("测试成功")
                              ? "text-emerald-400"
                              : "text-slate-350"
                        }`}
                      >
                        {out}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Audit Logs */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-mono">
                  Total Riwayat Server: {recentDraws.length} entri
                </span>
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + "Waktu,Nama,WhatsApp,KTP,Hadiah\n"
                      + recentDraws.map(r => {
                          const pRef = prizes.find(p => p.id === r.prizeId);
                          const prizeLabel = pRef ? (lang === "zh" ? pRef.labelZh : pRef.label) : r.prizeId;
                          return `"${new Date(r.timestamp).toLocaleString()}","${r.participantName}","${r.participantWhatsapp}","${r.participantKtp}","${prizeLabel}"`;
                        }).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  disabled={recentDraws.length === 0}
                  className="px-2 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {lang === "zh" ? "导出 CSV" : "Export CSV"}
                </button>
              </div>
              <span className="text-[10px] text-slate-500">
                SECURE TRANSACTION SHA-256
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">{t.auditTime}</th>
                    <th className="px-3.5 py-2.5">{t.auditName}</th>
                    <th className="px-3.5 py-2.5">{t.auditWa}</th>
                    <th className="px-3.5 py-2.5">{t.auditKtp}</th>
                    <th className="px-3.5 py-2.5">{t.auditPrize}</th>
                    <th className="px-3.5 py-2.5">{t.auditStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {recentDraws.map((log) => {
                    // Match corresponding prize labelZh or label standard reference
                    const pRef = prizes.find((pr) => pr.id === log.prizeId);
                    const drawLabel = pRef
                      ? lang === "zh"
                        ? pRef.labelZh
                        : pRef.label
                      : log.prizeLabel;
                    const originalLabel = log.originalPrizeLabel;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="px-3.5 py-2.5 font-sans font-semibold text-slate-800 whitespace-nowrap">
                          {log.participantName}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                          {log.participantWhatsapp}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-mono whitespace-nowrap">
                          {log.participantKtp}
                        </td>
                        <td className="px-3.5 py-2.5 font-sans font-medium text-blue-600">
                          {drawLabel}
                          {log.isDowngraded && (
                            <span className="block text-[8px] text-blue-500 font-mono italic mt-0.5">
                              (Dialihkan dari {originalLabel})
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {log.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold font-sans">
                              <CheckCircle className="h-2.5 w-2.5" />{" "}
                              {t.auditSuccess}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold font-sans">
                              <Ban className="h-2.5 w-2.5" /> {t.auditBlocked}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
