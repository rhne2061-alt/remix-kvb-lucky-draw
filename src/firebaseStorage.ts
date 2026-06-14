import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app, shouldEnableFirebase } from "./firebase";

const getStore = () => getStorage(app);

export async function uploadPrizeImageToStorage(
  base64: string,
  prizeId: string,
  kind: "thumb" | "large",
): Promise<string> {
  if (!shouldEnableFirebase()) {
    throw new Error("Firebase not enabled");
  }

  const blob = dataUrlToBlob(base64);
  const storage = getStore();
  const path = `prizes/${prizeId}/${kind}.webp`;
  const storageRef = ref(storage, path);

  await uploadBytesResumable(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
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
