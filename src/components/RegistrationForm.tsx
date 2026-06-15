import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Participant } from "../types";
import { audio } from "../utils/audio";
import { TRANSLATIONS } from "../translations";

interface RegistrationFormProps {
  onSubmit: (participant: Participant) => void;
  onLogout: () => void;
  currentParticipant: Participant | null;
  blockedDetails: { isBlocked: boolean; reason?: string } | null;
  lang: "zh" | "id";
  invitationCodes: {
    code: string;
    isUsed: boolean;
    generatedAt: string;
    usedBy?: string;
  }[];
}

export default function RegistrationForm({
  onSubmit,
  onLogout,
  currentParticipant,
  blockedDetails,
  lang,
  invitationCodes,
}: RegistrationFormProps) {
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ktp, setKtp] = useState("");
  const [simulatedDevice, setSimulatedDevice] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Auto generate a mock hardware-based Device Fingerprint/ID
  useEffect(() => {
    if (!currentParticipant) {
      regenerateDeviceId();
    }
  }, [currentParticipant]);

  const regenerateDeviceId = () => {
    const randomHex = Math.floor(10000000 + Math.random() * 90000000)
      .toString(16)
      .toUpperCase();
    const mockFingerprint = `ID-FARM-${randomHex}-${navigator.platform.replace(/\s/g, "-")}`;
    setSimulatedDevice(mockFingerprint);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    // Validation
    if (!name.trim()) {
      setErrorLocal("Nama Lengkap wajib diisi!");
      return;
    }

    // WhatsApp format validation (standard WhatsApp, allow 10-15 digits)
    const waClean = whatsapp.replace(/[^0-9+]/g, "");
    if (
      !waClean.startsWith("0") &&
      !waClean.startsWith("+") &&
      !waClean.startsWith("62")
    ) {
      setErrorLocal(
        "Nomor WhatsApp harus berformat valid (contoh: 0812xxx atau +62812xxx)",
      );
      return;
    }
    if (waClean.length < 9 || waClean.length > 15) {
      setErrorLocal("Nomor WhatsApp harus antara 9 sampai 15 digit.");
      return;
    }

    // Invitation code validation
    const codeClean = ktp.trim().toUpperCase();
    if (!codeClean) {
      setErrorLocal("Kode Undangan wajib diisi!");
      return;
    }

    const matchedCode = invitationCodes.find(
      (c) => c.code.toUpperCase() === codeClean,
    );
    if (!matchedCode) {
      setErrorLocal(
        "Kode Undangan tidak valid! Silakan periksa kembali atau minta kode ke Relationship Manager.",
      );
      return;
    }

    if (matchedCode.isUsed) {
      setErrorLocal("Kode Undangan ini sudah digunakan!");
      return;
    }

    // Pass up to the app controller
    onSubmit({
      name: name.trim(),
      whatsapp: waClean,
      ktp: codeClean,
      deviceId: simulatedDevice,
    });
  };

  if (currentParticipant) {
    return (
      <div
        id="registration-success-card"
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden text-slate-100"
      >
        {/* Glowing visual indicator for registered users */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide font-sans">
              {t.verifiedTitle}
            </h3>
            <p className="text-[10px] text-emerald-400 font-mono tracking-tight">
              {t.verifiedBadge}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300 border-t border-white/10 pt-4 font-sans">
          <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <User className="h-3.5 w-3.5 text-slate-500 animate-pulse" /> Nama
              Lengkap:
            </span>
            <span className="text-slate-100 font-bold">
              {currentParticipant.name}
            </span>
          </div>

          <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Phone className="h-3.5 w-3.5 text-slate-500" /> WhatsApp:
            </span>
            <span className="text-slate-200 font-semibold font-mono tracking-wider">
              {currentParticipant.whatsapp}
            </span>
          </div>

          <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              Kode Undangan:
            </span>
            <span className="text-emerald-400 font-bold font-mono tracking-wider">
              {currentParticipant.ktp}
            </span>
          </div>
        </div>

        {blockedDetails?.isBlocked && (
          <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-xs text-left">
            <div className="font-bold flex items-center gap-1.5 mb-1.5 text-rose-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>⚠️ PENCEGAHAN ANTI-FRAUD TERPIDIKSI</span>
            </div>
            <p className="leading-relaxed text-[11px] opacity-90">
              {blockedDetails.reason}
            </p>
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={onLogout}
            className="w-full text-center bg-white/10 hover:bg-white/20 text-white hover:text-slate-100 text-xs py-2.5 px-4 rounded-xl font-semibold transition-all border border-white/20 cursor-pointer active:scale-95 backdrop-blur-md shadow-sm"
          >
            {t.logoutButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="registration-card"
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative text-slate-100 overflow-hidden"
    >
      {/* Decorative Blue Gradient Top Bar */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider font-display">
          {t.registerTitle}
        </h3>
        <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold tracking-tight">
          {t.registerBadge}
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-5 leading-relaxed text-left font-sans font-light">
        {t.registerDesc}
      </p>

      <form onSubmit={handleRegister} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
            {t.fullNameLabel}
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={t.fullNamePlace}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/20 backdrop-blur-md border border-white/10 focus:border-blue-400 focus:bg-black/40 focus:ring-1 focus:ring-blue-400/50 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-400 outline-none transition-all duration-200 shadow-inner"
            />
            <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
            {t.whatsappLabel}
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={t.whatsappPlace}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-black/20 backdrop-blur-md border border-white/10 focus:border-blue-400 focus:bg-black/40 focus:ring-1 focus:ring-blue-400/50 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-400 outline-none transition-all duration-200 shadow-inner"
            />
            <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1 justify-between">
            <span>{t.ktpLabel}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={t.ktpPlace}
              value={ktp}
              onChange={(e) => setKtp(e.target.value.toUpperCase().trim())}
              className="w-full bg-black/20 backdrop-blur-md border border-white/10 focus:border-blue-400 focus:bg-black/40 focus:ring-1 focus:ring-blue-400/50 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-100 placeholder-slate-400 outline-none font-mono transition-all duration-200 tracking-wider shadow-inner"
            />
          </div>
        </div>

        {errorLocal && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[11px] leading-relaxed">
            {errorLocal}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs py-3.5 px-4 rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          {t.submitButton}
        </button>
      </form>
    </div>
  );
}
