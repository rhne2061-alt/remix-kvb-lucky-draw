const CLOUD_NAME = "dhdhpnvn9";
const UPLOAD_PRESET = "ml_default";

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
  const formData = new FormData();
  const blob = typeof file === "string" ? dataUrlToBlob(file) : file;
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) throw new Error("Cloudinary upload failed");
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
