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

function readFileAsDataUrl(file: File): Promise<string> {
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
  const img = await loadImage(src);

  let width = img.width;
  let height = img.height;

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

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const mimeType = options.mimeType ?? "image/webp";
  const quality = options.quality ?? 0.9;
  return canvas.toDataURL(mimeType, quality);
}
