import { signal, state } from '@granularjs/core';

const readyMap = new WeakMap();

export function whenReady(target) {
  return readyMap.get(target) || Promise.resolve();
}

export function localStorageAdapter(namespace = 'granular') {
  const prefix = `${namespace}:`;
  return {
    name: 'localStorage',
    async get(key) {
      if (typeof localStorage === 'undefined') return undefined;
      const raw = localStorage.getItem(prefix + key);
      return raw == null ? undefined : safeParse(raw);
    },
    async set(key, value) {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    async remove(key) {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(prefix + key);
    },
  };
}

export function sessionStorageAdapter(namespace = 'granular') {
  const prefix = `${namespace}:`;
  return {
    name: 'sessionStorage',
    async get(key) {
      if (typeof sessionStorage === 'undefined') return undefined;
      const raw = sessionStorage.getItem(prefix + key);
      return raw == null ? undefined : safeParse(raw);
    },
    async set(key, value) {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(prefix + key, JSON.stringify(value));
    },
    async remove(key) {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.removeItem(prefix + key);
    },
  };
}

export function indexedDbAdapter({ dbName = 'granular', store = 'kv' } = {}) {
  let dbPromise = null;
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB is not available in this environment'));
        return;
      }
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function withStore(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const os = tx.objectStore(store);
      let result;
      const req = fn(os);
      if (req && 'onsuccess' in req) {
        req.onsuccess = () => { result = req.result; };
        req.onerror = () => reject(req.error);
      }
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    }));
  }

  return {
    name: 'indexedDB',
    async get(key) {
      const value = await withStore('readonly', (os) => os.get(key));
      return value == null ? undefined : value;
    },
    async set(key, value) {
      await withStore('readwrite', (os) => os.put(value, key));
    },
    async remove(key) {
      await withStore('readwrite', (os) => os.delete(key));
    },
  };
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}

export function persistedSignal(key, initial, options = {}) {
  const adapter = options.adapter || localStorageAdapter();
  const sig = signal(initial);

  let suppressed = false;
  const ready = Promise.resolve(adapter.get(key)).then((stored) => {
    if (stored !== undefined) {
      suppressed = true;
      try { sig.set(stored); } finally { suppressed = false; }
    }
  }).catch((err) => {
    if (typeof options.onError === 'function') options.onError(err);
  });

  sig.subscribe((next) => {
    if (suppressed) return;
    Promise.resolve(adapter.set(key, next)).catch((err) => {
      if (typeof options.onError === 'function') options.onError(err);
    });
  });

  try { sig.ready = ready; } catch { /* state proxies may forbid */ }
  readyMap.set(sig, ready);
  return sig;
}

export function persistedState(key, initial, options = {}) {
  const adapter = options.adapter || localStorageAdapter();
  const st = state(initial);

  let suppressed = false;
  const ready = Promise.resolve(adapter.get(key)).then((stored) => {
    if (stored !== undefined && stored !== null && typeof stored === 'object') {
      suppressed = true;
      try { st.set(stored); } finally { suppressed = false; }
    }
  }).catch((err) => {
    if (typeof options.onError === 'function') options.onError(err);
  });

  st.subscribe((next) => {
    if (suppressed) return;
    Promise.resolve(adapter.set(key, next)).catch((err) => {
      if (typeof options.onError === 'function') options.onError(err);
    });
  });

  readyMap.set(st, ready);
  return st;
}
