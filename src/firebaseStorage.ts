import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app, shouldEnableFirebase } from "./firebase";

const getStore = () => getStorage(app);

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

export async function uploadPrizeImageToStorage(
  file: Blob | string,
  prizeId: string,
  kind: "thumb" | "large",
): Promise<string> {
  if (!shouldEnableFirebase()) throw new Error("Firebase not enabled");
  const blob = typeof file === "string" ? dataUrlToBlob(file) : file;
  const storage = getStore();
  const path = `prizes/${prizeId}/${kind}.webp`;
  await uploadBytesResumable(ref(storage, path), blob);
  return await getDownloadURL(ref(storage, path));
}

export async function uploadBgToStorage(blob: Blob): Promise<string> {
  if (!shouldEnableFirebase()) throw new Error("Firebase not enabled");
  const storage = getStore();
  const path = "bg/bg.webp";
  await uploadBytesResumable(ref(storage, path), blob);
  return await getDownloadURL(ref(storage, path));
}

export async function uploadLogoToStorage(blob: Blob): Promise<string> {
  if (!shouldEnableFirebase()) throw new Error("Firebase not enabled");
  const storage = getStore();
  const path = "logo/logo.png";
  await uploadBytesResumable(ref(storage, path), blob);
  return await getDownloadURL(ref(storage, path));
}
