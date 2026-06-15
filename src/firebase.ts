import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, getDocs, addDoc, type Firestore } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Prize, RiskConfig, SecurityMetric, GoogleSheetsConfig, DrawResult } from './types';
import { INITIAL_PRIZES } from './data';

// === FIX: lazy-initialize Firebase so module evaluation doesn't crash
//             SSR / non-browser test environments and so unused code paths
//             never talk to the cloud accidentally ===
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = initializeApp(firebaseConfig as any);
  }
  return _app;
}

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp(), (firebaseConfig as any).firestoreDatabaseId);
  }
  return _db;
}

export function getAuthClient(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}

export function getStorageClient(): FirebaseStorage {
  if (!_storage) {
    // The Storage bucket comes from the same applet config the
    // Firestore database uses; the property is always present on the
    // Firebase-provided config that AI Studio scaffolds.
    const bucket = (firebaseConfig as any).storageBucket;
    if (!bucket) {
      // Fallback: let the SDK derive the default bucket from the
      // projectId. This is safe in browsers where the config object
      // happens to be missing the field.
      _storage = getStorage(getApp());
    } else {
      _storage = getStorage(getApp(), `gs://${bucket}`);
    }
  }
  return _storage;
}

// Backwards-compatible exports used by other modules — but the values
// are now lazy accessors rather than crash-prone module-level constants.
export const db = new Proxy({} as Firestore, {
  get(_t, prop) {
    return (getDb() as any)[prop];
  },
});
export const auth = new Proxy({} as Auth, {
  get(_t, prop) {
    return (getAuthClient() as any)[prop];
  },
});

// auth.signInAnonymously Not used

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // throw new Error(JSON.stringify(errInfo));
}

// Global settings snapshot listener
export const subscribeToGlobalSettings = (callback: (data: any) => void) => {
  return onSnapshot(doc(getDb(), 'settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/global');
  });
};

// Update global settings
//
// === FIX: debounce cloud writes. The original code called saveGlobalSettings
//             from six separate useEffect hooks, each of which fired on every
//             keystroke / slider tick — burning the free Firebase quota within
//             minutes. Now we coalesce all writes into one trailing-edge call.
// ===
let _pendingSettings: Record<string, any> = {};
let _settingsTimer: ReturnType<typeof setTimeout> | null = null;
const SETTINGS_DEBOUNCE_MS = 1500;

function flushPendingSettings() {
  if (_settingsTimer) {
    clearTimeout(_settingsTimer);
    _settingsTimer = null;
  }
  if (Object.keys(_pendingSettings).length === 0) return;
  const payload = _pendingSettings;
  _pendingSettings = {};
  setDoc(doc(getDb(), 'settings', 'global'), payload, { merge: true }).catch(
    (err) => handleFirestoreError(err, OperationType.UPDATE, 'settings/global'),
  );
}

export const saveGlobalSettings = async (data: any) => {
  Object.assign(_pendingSettings, data);
  if (_settingsTimer) clearTimeout(_settingsTimer);
  _settingsTimer = setTimeout(flushPendingSettings, SETTINGS_DEBOUNCE_MS);
};

// Draws tracking
export const subscribeToDraws = (callback: (draws: DrawResult[]) => void) => {
  return onSnapshot(collection(getDb(), 'draws'), (snap) => {
    const arr: DrawResult[] = [];
    snap.forEach((d) => arr.push(d.data() as DrawResult));
    // === FIX: sort by `timestamp` (ISO-like) when present, fall back to id
    //             so bot-attack ids and log- ids do not interleave badly ===
    arr.sort((a, b) => {
      const ta = a.timestamp ?? a.id;
      const tb = b.timestamp ?? b.id;
      return String(tb).localeCompare(String(ta));
    });
    callback(arr);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'draws');
  });
};

export const saveDraw = async (draw: DrawResult) => {
  try {
    await setDoc(doc(getDb(), 'draws', draw.id), draw);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'draws');
  }
};

// ============================================================================
// === FIX: Firebase Storage helpers for prize image upload ===
//
//             We keep the base64 path for backwards compatibility (and as a
//             offline fallback) but always prefer the public download URL
//             returned by `uploadPrizeImage()`. The image goes to a path
//             like `prizes/gold10g-1700000000.webp` so that an operator
//             re-uploading simply overwrites the previous file (no need
//             for a manual "delete previous" step). ===
// ============================================================================

/**
 * Uploads a Blob/File to Firebase Storage and returns the public
 * download URL. Caller is responsible for the `prizeId` namespace.
 */
export async function uploadPrizeImage(
  prizeId: string,
  file: Blob,
  contentType: string,
): Promise<{ url: string; storagePath: string }> {
  const path = `prizes/${prizeId}-${Date.now()}.webp`;
  const ref = storageRef(getStorageClient(), path);
  await uploadBytes(ref, file, { contentType });
  const url = await getDownloadURL(ref);
  return { url, storagePath: path };
}

/**
 * Best-effort delete for a previously-uploaded Storage object. Used
 * when the operator clears a prize image so the bucket doesn't fill
 * up with orphaned files.
 */
export async function deletePrizeImage(storagePath: string): Promise<void> {
  try {
    await deleteObject(storageRef(getStorageClient(), storagePath));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `storage/${storagePath}`);
  }
}

/**
 * Upload a custom background or logo image to Firebase Storage.
 * Returns the public download URL for cross-device sync.
 */
export async function uploadCustomImage(
  type: 'bg' | 'logo',
  file: Blob,
  contentType: string,
): Promise<{ url: string; storagePath: string }> {
  const path = `custom/${type}-${Date.now()}.webp`;
  const ref = storageRef(getStorageClient(), path);
  await uploadBytes(ref, file, { contentType });
  const url = await getDownloadURL(ref);
  return { url, storagePath: path };
}

/**
 * Delete a previously-uploaded custom background or logo from Storage.
 */
export async function deleteCustomImage(storagePath: string): Promise<void> {
  try {
    await deleteObject(storageRef(getStorageClient(), storagePath));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `storage/${storagePath}`);
  }
}

