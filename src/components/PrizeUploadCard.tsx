import React, { useState } from "react";
import { Undo2, Redo2, Upload, ImagePlus } from "lucide-react";
import { Prize } from "../types";
import { PrizeGraphic } from "./PrizeGraphic";
import { compressImageFileToDataUrl, validateImageUploadFile } from "../utils/images";
import { uploadPrizeToCloudinary } from "../cloudinary";

interface PrizeUploadCardProps {
  prize: Prize;
  lang?: "zh" | "id";
  canUndo: boolean;
  canRedo: boolean;
  onUpload: (urlOrBase64: string) => void;
  onUploadLarge: (urlOrBase64: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClearLarge: () => void;
  onUploadError: (msg: string) => void;
  onUploadClear: () => void;
}

export const PrizeUploadCard: React.FC<PrizeUploadCardProps> = ({
  prize,
  lang = "id",
  canUndo,
  canRedo,
  onUpload,
  onUploadLarge,
  onUndo,
  onRedo,
  onClear,
  onClearLarge,
  onUploadError,
  onUploadClear,
}) => {
  const [uploading, setUploading] = useState<"thumb" | "large" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleUpload = (kind: "thumb" | "large") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    onUploadClear();
    setLocalError(null);

    const validation = validateImageUploadFile(file, {
      maxFileSizeBytes: 10 * 1024 * 1024,
    });
    if (!validation.ok) {
      const msg = validation.error ?? "Invalid file";
      setLocalError(msg);
      onUploadError(msg);
      return;
    }

    setUploading(kind);
    try {
      const maxSize = kind === "thumb" ? 256 : 1024;
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxSize,
        mimeType: "image/webp",
        quality: kind === "thumb" ? 0.88 : 0.92,
      });

      if (kind === "thumb") {
        onUpload(dataUrl);
      } else {
        onUploadLarge(dataUrl);
      }
      setUploading(null);

      uploadPrizeToCloudinary(dataUrl, prize.id)
        .then((cloudUrl) => {
          if (kind === "thumb") {
            onUpload(cloudUrl);
          } else {
            onUploadLarge(cloudUrl);
          }
        })
        .catch(() => {});
    } catch {
      const msg = lang === "zh" ? "图片处理失败，请换一张图片重试" : "Gagal memproses gambar. Coba lagi.";
      setLocalError(msg);
      onUploadError(msg);
      setUploading(null);
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
          onChange={handleUpload("thumb")}
          disabled={uploading !== null}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span className="block text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-semibold transition-colors">
          <Upload className="h-3 w-3 inline mr-1" />
          {uploading === "thumb"
            ? "Uploading..."
            : lang === "zh"
              ? "展示图(九宫格)"
              : "Gambar Thumbnail"}
        </span>
      </label>

      <label className="relative w-full cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload("large")}
          disabled={uploading !== null}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span className="block text-[10px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-lg font-semibold transition-colors">
          <ImagePlus className="h-3 w-3 inline mr-1" />
          {uploading === "large"
            ? "Uploading..."
            : lang === "zh"
              ? "中奖大图(弹窗)"
              : "Gambar Menang (Popup)"}
        </span>
      </label>

      {prize.customImageLargeBase64 && (
        <div className="w-full flex justify-center">
          <button
            onClick={onClearLarge}
            className="text-[9px] text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 bg-rose-500/10 px-2 py-1 rounded transition-colors"
          >
            {lang === "zh" ? "清除中奖大图" : "Hapus Gambar Menang"}
          </button>
        </div>
      )}

      {localError && (
        <div className="w-full text-[10px] leading-relaxed text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-2.5 py-2">
          {localError}
        </div>
      )}

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
          {lang === "zh" ? "清除展示图" : "Hapus Gambar Thumbnail"}
        </button>
      )}
    </div>
  );
};
