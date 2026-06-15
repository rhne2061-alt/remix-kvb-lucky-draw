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

// === FIX: accept the same set of mime types the operator console will
//             see on Windows / Mac / iPhone cameras. SVG is intentionally
//             not allowed (it can carry JS in a <script> tag, which the
//             previous code had rejected — that is still correct). ===
const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

const DEFAULT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

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

/**
 * Try to encode a canvas as `preferred`; if the browser refuses
 * (e.g. webp encoding not supported on old Safari), fall back to JPEG.
 * Returns the *blob* (not the base64 string) so callers can either
 * store the blob URL directly or convert it themselves.
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  preferred: string,
  quality: number,
): Promise<{ blob: Blob; mime: string }> {
  const tryEncode = (mime: string) =>
    new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(
          (b) => resolve(b),
          mime,
          quality,
        );
      } catch {
        resolve(null);
      }
    });

  // Browsers that don't know the requested mime return null.
  let blob = await tryEncode(preferred);
  if (blob && blob.size > 0) {
    return { blob, mime: preferred };
  }
  blob = await tryEncode("image/jpeg");
  if (blob && blob.size > 0) {
    return { blob, mime: "image/jpeg" };
  }
  // Last-ditch: PNG.
  blob = await tryEncode("image/png");
  if (blob && blob.size > 0) {
    return { blob, mime: "image/png" };
  }
  throw new Error("canvas.toBlob 返回空,浏览器拒绝编码图像");
}

export async function compressImageFileToDataUrl(
  file: File,
  options: ImageCompressionOptions,
): Promise<string> {
  const blob = await compressImageFileToBlob(file, options);
  return await blobToDataUrl(blob, options.mimeType ?? "image/webp");
}

/**
 * Compresses an uploaded image to a Blob. The Blob keeps the
 * browser-confirmed mime type, so callers can hand it directly to
 * `firebase/storage#uploadBytes` without having to worry about
 * `dataURL` wrappers.
 */
export async function compressImageFileToBlob(
  file: File,
  options: ImageCompressionOptions,
): Promise<Blob> {
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

  const preferred = options.mimeType ?? "image/webp";
  const quality = options.quality ?? 0.9;
  const { blob, mime } = await canvasToBlob(canvas, preferred, quality);
  if (blob.size === 0) {
    throw new Error("压缩后文件为 0 字节");
  }
  // Normalize blob.type — some Safari versions return an empty string
  // even though the bytes are webp. Without this, Firebase Storage
  // would infer `application/octet-stream` and refuse to serve the
  // file with the correct `image/webp` Content-Type header.
  return blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
}

function blobToDataUrl(blob: Blob, mime: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read compressed blob"));
    reader.onload = () => {
      const result = String(reader.result);
      if (result.startsWith("data:") && !result.startsWith(`data:${mime}`)) {
        const comma = result.indexOf(",");
        if (comma > 0) {
          resolve(`data:${mime};base64,${result.slice(comma + 1)}`);
          return;
        }
      }
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });
}
