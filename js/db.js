// Banco de dados local (IndexedDB) — os dados ficam no próprio tablet.

const NOME = 'doce-engenho';
const VERSAO = 1;
export const STORES = ['produtos', 'materiais', 'config'];

let dbPromise;

function abrir() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOME, VERSAO);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('produtos')) db.createObjectStore('produtos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('materiais')) db.createObjectStore('materiais', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const db = {
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
  put: (store, obj) => tx(store, 'readwrite', (s) => { s.put(obj); }),
  del: (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); }),
  /** Substitui todo o conteúdo de um store (usado ao importar backup). */
  replace: (store, list) => tx(store, 'readwrite', (s) => { s.clear(); list.forEach((o) => s.put(o)); }),
};

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export async function pedirArmazenamentoPersistente() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* sem suporte — segue normalmente */ }
}
