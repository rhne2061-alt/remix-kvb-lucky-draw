import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Prize, RiskConfig, SecurityMetric, GoogleSheetsConfig, DrawResult } from './types';
import { INITIAL_PRIZES } from './data';

const app = initializeApp(firebaseConfig);
export { app };
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId as string);
export const auth = getAuth(app);

export const shouldEnableFirebase = (): boolean => {
  try {
    return import.meta.env.VITE_ENABLE_FIREBASE === "true" || import.meta.env.PROD;
  } catch {
    return false;
  }
};

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
  if (!shouldEnableFirebase()) return;
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
}

// Global settings snapshot listener
export const subscribeToGlobalSettings = (callback: (data: any) => void) => {
  if (!shouldEnableFirebase()) {
    return () => {};
  }
  const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/global');
  });
  return unsubscribe;
};

// Update global settings
export const saveGlobalSettings = async (data: any) => {
  if (!shouldEnableFirebase()) return;
  try {
    await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
  }
};

// Draws tracking
export const subscribeToDraws = (callback: (draws: DrawResult[]) => void) => {
  if (!shouldEnableFirebase()) {
    return () => {};
  }
  const unsubscribe = onSnapshot(collection(db, 'draws'), (snap) => {
    const arr: DrawResult[] = [];
    snap.forEach((d) => arr.push(d.data() as DrawResult));
    arr.sort((a,b) => b.id.localeCompare(a.id));
    callback(arr);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'draws');
  });
  return unsubscribe;
};

export const saveDraw = async (draw: DrawResult) => {
  if (!shouldEnableFirebase()) return;
  try {
    await setDoc(doc(db, 'draws', draw.id), draw);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'draws');
  }
};
