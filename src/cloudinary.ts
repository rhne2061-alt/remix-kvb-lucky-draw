const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

export function getCloudinaryConfigError(): string {
  if (!CLOUD_NAME && !UPLOAD_PRESET) {
    return "请在 .env 文件中设置 VITE_CLOUDINARY_CLOUD_NAME 和 VITE_CLOUDINARY_UPLOAD_PRESET";
  }
  if (!CLOUD_NAME) return "请在 .env 文件中设置 VITE_CLOUDINARY_CLOUD_NAME";
  return "请在 .env 文件中设置 VITE_CLOUDINARY_UPLOAD_PRESET";
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

export async function uploadToCloudinary(
  file: Blob | string,
  folder: string,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(getCloudinaryConfigError());
  }
  const formData = new FormData();
  const blob = typeof file === "string" ? dataUrlToBlob(file) : file;
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    throw new Error(`Cloudinary 上传失败 (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.secure_url;
}

export async function uploadBgToCloudinary(blob: Blob): Promise<string> {
  return uploadToCloudinary(blob, "kvb");
}

export async function uploadLogoToCloudinary(blob: Blob): Promise<string> {
  return uploadToCloudinary(blob, "kvb");
}

export async function uploadPrizeToCloudinary(
  file: Blob | string,
  prizeId: string,
): Promise<string> {
  return uploadToCloudinary(file, `kvb/prizes/${prizeId}`);
}
