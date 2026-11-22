/** IndexedDB-backed session store with an in-memory fallback. */
const DB_NAME = 'beryll-scraper-local';
const STORE_NAME = 'sessions';
const SESSION_KEY = 'active';

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local session storage.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local storage request failed.'));
  });
}

export function createSessionStore() {
  let session = null;
  let dbPromise = null;
  let writeQueue = Promise.resolve();
  const database = () => dbPromise ||= openDatabase();

  async function write(value) {
    const db = await database();
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, SESSION_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the session.'));
      tx.onabort = () => reject(tx.error || new Error('Session save was interrupted.'));
    });
    return true;
  }

  return {
    get() { return session; },
    set(nextSession) {
      session = nextSession;
      this.save().catch(() => {});
      return session;
    },
    update(updater) {
      if (!session) throw new Error('No active novel session.');
      session = updater(session) || session;
      session.updatedAt = new Date().toISOString();
      this.save().catch(() => {});
      return session;
    },
    async save() {
      if (!session) return false;
      try { const snapshot=structuredCloneSafe(session); writeQueue=writeQueue.then(()=>write(snapshot)); return await writeQueue; }
      catch { return false; }
    },
    async restore() {
      try {
        const db = await database();
        if (!db) return null;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const stored = await requestResult(tx.objectStore(STORE_NAME).get(SESSION_KEY));
        if (stored) session = stored;
        return session;
      } catch { return null; }
    },
    async clear() {
      session = null;
      try { await writeQueue; } catch {}
      try {
        const db = await database();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SESSION_KEY);
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('Could not clear the session.'));
          tx.onabort = () => reject(tx.error || new Error('Session clear was interrupted.'));
        });
      } catch { /* Keep the in-memory session cleared even if storage is unavailable. */ }
    }
  };
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
