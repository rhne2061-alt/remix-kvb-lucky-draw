export type ImageCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxSize?: number;
  mimeType?: string;
  quality?: number;
};

export type ImageUploadValidationOptions = {
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
};

export type ImageUploadValidationResult = {
  ok: boolean;
  error?: string;
};

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageUploadFile(
  file: File,
  options: ImageUploadValidationOptions = {},
): ImageUploadValidationResult {
  const allowedMimeTypes =
    options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxFileSizeBytes =
    options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  if (!allowedMimeTypes.includes(file.type)) {
    return { ok: false, error: "只支持 PNG、JPG、JPEG、WEBP 图片" };
  }

  if (file.size > maxFileSizeBytes) {
    const sizeInMb = Math.max(1, Math.round(maxFileSizeBytes / 1024 / 1024));
    return { ok: false, error: `图片不能超过 ${sizeInMb}MB` };
  }

  return { ok: true };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

export async function compressImageFileToDataUrl(
  file: File,
  options: ImageCompressionOptions,
): Promise<string> {
  const src = await readFileAsDataUrl(file);
  return compressDataUrl(src, options);
}

export async function compressDataUrl(
  src: string,
  options: ImageCompressionOptions,
): Promise<string> {
  const img = await loadImage(src);
  const { width, height } = calcSize(img.width, img.height, options);
  return canvasToDataUrl(img, width, height, options);
}

function calcSize(
  iw: number,
  ih: number,
  options: ImageCompressionOptions,
): { width: number; height: number } {
  let width = iw;
  let height = ih;
  const maxWidth = options.maxWidth;
  const maxHeight = options.maxHeight;
  const maxSize = options.maxSize;

  if (typeof maxSize === "number" && maxSize > 0) {
    if (width >= height && width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else if (height > width && height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  if (typeof maxWidth === "number" && maxWidth > 0 && width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (typeof maxHeight === "number" && maxHeight > 0 && height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

function canvasToDataUrl(
  img: HTMLImageElement,
  width: number,
  height: number,
  options: ImageCompressionOptions,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);
  const mimeType = options.mimeType ?? "image/webp";
  const quality = options.quality ?? 0.9;
  return canvas.toDataURL(mimeType, quality);
}

export async function compressImageFileToBlob(
  file: File,
  options: ImageCompressionOptions,
): Promise<Blob> {
  const dataUrl = await compressImageFileToDataUrl(file, options);
  return dataUrlToBlob(dataUrl);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] ?? "image/webp";
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8], { type: mime });
}
