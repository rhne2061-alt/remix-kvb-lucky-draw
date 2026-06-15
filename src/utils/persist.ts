const DB_NAME = "kvb_assets";
const DB_VERSION = 1;
const STORE_NAME = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: Blob | string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet(key: string): Promise<Blob | string | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 防抖 localStorage 写入：将多次写入合并到下一个宏任务，减少主线程阻塞
const _pending = new Map<string, string>();
let _timer: ReturnType<typeof setTimeout> | null = null;
export function lsSet(key: string, value: string): void {
  _pending.set(key, value);
  if (_timer === null) {
    _timer = setTimeout(() => {
      for (const [k, v] of _pending) {
        try { localStorage.setItem(k, v); } catch {}
      }
      _pending.clear();
      _timer = null;
    }, 0);
  }
}
export function lsRemove(key: string): void {
  _pending.delete(key);
  if (_timer === null) {
    _timer = setTimeout(() => {
      for (const [k, v] of _pending) {
        try { localStorage.setItem(k, v); } catch {}
      }
      _pending.clear();
      _timer = null;
    }, 0);
  }
  try { localStorage.removeItem(key); } catch {}
}
