// IndexedDB Storage for High-Resolution Custom Templates (No 5MB LocalStorage Quota Limits!)

const DB_NAME = 'SnapSchoolThemeDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_themes';

const openThemeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveCustomThemeToDB = async (theme) => {
  const db = await openThemeDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(theme);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error('Gagal menyimpan ke IndexedDB'));
      tx.onerror = () => reject(tx.error || new Error('Transaction IndexedDB gagal'));
      tx.onabort = () => reject(tx.error || new Error('Transaction IndexedDB dibatalkan'));
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllCustomThemesFromDB = async () => {
  try {
    const db = await openThemeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error('Gagal memuat template'));
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to get themes from IndexedDB:', err);
    return [];
  }
};

export const deleteCustomThemeFromDB = async (id) => {
  const db = await openThemeDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error('Gagal menghapus template'));
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
};
