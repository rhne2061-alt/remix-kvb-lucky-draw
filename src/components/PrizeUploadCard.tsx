import React, { useState } from "react";
import { Undo2, Redo2, Upload } from "lucide-react";
import { Prize } from "../types";
import { PrizeGraphic } from "./PrizeGraphic";
import { compressImageFileToDataUrl, validateImageUploadFile } from "../utils/images";

interface PrizeUploadCardProps {
  prize: Prize;
  lang?: "zh" | "id";
  canUndo: boolean;
  canRedo: boolean;
  onUpload: (base64: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onUploadError: (msg: string) => void;
  onUploadClear: () => void;
}

export const PrizeUploadCard: React.FC<PrizeUploadCardProps> = ({
  prize,
  lang = "id",
  canUndo,
  canRedo,
  onUpload,
  onUndo,
  onRedo,
  onClear,
  onUploadError,
  onUploadClear,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    onUploadClear();

    const validation = validateImageUploadFile(file, {
      maxFileSizeBytes: 2 * 1024 * 1024,
    });
    if (!validation.ok) {
      onUploadError(validation.error ?? "Invalid file");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxSize: 200,
        mimeType: "image/webp",
        quality: 0.9,
      });
      onUpload(dataUrl);
    } catch {
      onUploadError(lang === "zh" ? "处理失败" : "Gagal memproses");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col items-center gap-3 text-center">
      <span
        className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
        style={{ backgroundColor: `${prize.color}20`, color: prize.color }}
      >
        {lang === "zh" ? prize.levelZh : prize.level}
      </span>
      <span className="text-zinc-300 font-bold text-[10px] leading-tight">
        {lang === "zh" ? prize.labelZh : prize.label}
      </span>

      <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded flex items-center justify-center overflow-hidden bg-black/40">
        <PrizeGraphic
          prizeId={prize.id}
          imageUrl={prize.imageUrl}
          customImageBase64={prize.customImageBase64}
          className="w-12 h-12"
        />
      </div>

      <label className="relative w-full cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span className="block text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-semibold transition-colors">
          <Upload className="h-3 w-3 inline mr-1" />
          {uploading
            ? "..."
            : lang === "zh"
              ? "上传图片"
              : "Unggah File"}
        </span>
      </label>

      <div className="w-full grid grid-cols-2 gap-2 mt-1">
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className={`text-[9px] px-2 py-1 rounded border transition-colors ${canUndo ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40" : "text-slate-500 border-zinc-800 bg-zinc-900/30 cursor-not-allowed"}`}
        >
          <Undo2 className="h-3 w-3 inline mr-0.5" />
          {lang === "zh" ? "撤销" : "Undo"}
        </button>
        <button
          disabled={!canRedo}
          onClick={onRedo}
          className={`text-[9px] px-2 py-1 rounded border transition-colors ${canRedo ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40" : "text-slate-500 border-zinc-800 bg-zinc-900/30 cursor-not-allowed"}`}
        >
          <Redo2 className="h-3 w-3 inline mr-0.5" />
          {lang === "zh" ? "重做" : "Redo"}
        </button>
      </div>

      {prize.customImageBase64 && (
        <button
          onClick={onClear}
          className="text-[9px] text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 bg-rose-500/10 px-2 py-1 rounded w-full transition-colors"
        >
          {lang === "zh" ? "清除图片" : "Hapus Gambar"}
        </button>
      )}
    </div>
  );
};
