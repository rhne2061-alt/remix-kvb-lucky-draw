import React, { useRef } from "react";
import { Undo2, Redo2 } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const validation = validateImageUploadFile(file, {
      maxFileSizeBytes: 2 * 1024 * 1024,
    });

    if (!validation.ok) {
      onUploadError(
        lang === "zh"
          ? (validation.error ?? "图片无效")
          : "File tidak valid. Gunakan PNG/JPG/WEBP.",
      );
      return;
    }

    onUploadClear();

    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxSize: 200,
        mimeType: "image/webp",
        quality: 0.9,
      });
      onUpload(dataUrl);
    } catch {
      onUploadError(
        lang === "zh"
          ? "图片处理失败，请重试"
          : "Gagal memproses gambar. Coba lagi.",
      );
    }
  };

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col items-center gap-3 relative overflow-hidden text-center group">
      <span
        className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
        style={{ backgroundColor: `${prize.color}20`, color: prize.color }}
      >
        {lang === "zh" ? prize.levelZh : prize.level}
      </span>
      <span className="text-zinc-300 font-bold text-[10px]">
        {lang === "zh" ? prize.labelZh : prize.label}
      </span>

      <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded flex items-center justify-center overflow-hidden bg-black/40 mt-1">
        <PrizeGraphic
          prizeId={prize.id}
          imageUrl={prize.imageUrl}
          customImageBase64={prize.customImageBase64}
          className="w-12 h-12"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg cursor-pointer w-full mt-2 font-semibold transition-colors truncate block text-center"
      >
        {lang === "zh" ? "⬆️ 浏览并上传" : "⬆️ Unggah File"}
      </button>

      <div className="w-full grid grid-cols-2 gap-2 mt-2">
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className={`text-[9px] px-2 py-1 rounded border transition-colors ${
            canUndo
              ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
              : "text-slate-500 border-zinc-800 bg-zinc-900/30 cursor-not-allowed"
          }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Undo2 className="h-3.5 w-3.5" />
            {lang === "zh" ? "撤销" : "Undo"}
          </span>
        </button>
        <button
          disabled={!canRedo}
          onClick={onRedo}
          className={`text-[9px] px-2 py-1 rounded border transition-colors ${
            canRedo
              ? "text-slate-200 hover:text-white hover:bg-slate-700 border-slate-600 bg-slate-800/40"
              : "text-slate-500 border-zinc-800 bg-zinc-900/30 cursor-not-allowed"
          }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Redo2 className="h-3.5 w-3.5" />
            {lang === "zh" ? "重做" : "Redo"}
          </span>
        </button>
      </div>

      {prize.customImageBase64 && (
        <button
          onClick={onClear}
          className="text-[9px] text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 bg-rose-500/10 px-2 py-1 rounded w-full mt-1 transition-colors"
        >
          {lang === "zh" ? "清除图片" : "Hapus Gambar"}
        </button>
      )}
    </div>
  );
};
