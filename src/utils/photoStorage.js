// Storage Helper: Supabase Cloud Storage (Bucket) with Local IndexedDB Fallback & Deleted ID Blacklist

import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'SnapSchoolPhotoboothDB';
const DB_VERSION = 2;
const STORE_NAME = 'photos';
const DELETED_STORE = 'deleted_photos';
const STORAGE_BUCKET = 'photobooth-photos';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DELETED_STORE)) {
        db.createObjectStore(DELETED_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper to get all deleted photo IDs
const getDeletedIds = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DELETED_STORE, 'readonly');
      const store = tx.objectStore(DELETED_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        resolve(new Set(list.map(item => item.id)));
      };
      req.onerror = () => resolve(new Set());
    });
  } catch (e) {
    return new Set();
  }
};

// Helper to mark IDs as deleted in local database
const markIdsAsDeleted = async (ids) => {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DELETED_STORE, 'readwrite');
      const store = tx.objectStore(DELETED_STORE);
      for (const id of ids) {
        store.put({ id, deletedAt: Date.now() });
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to record deleted IDs in local store:', e);
  }
};

// Convert Base64 dataUrl directly to a Blob
const dataUrlToBlob = (dataUrl) => {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([uint8Array], { type: mime });
  } catch (err) {
    console.error('Error converting dataUrl to Blob:', err);
    return null;
  }
};

export const savePhotoToStore = async (id, dataUrl) => {
  // 1. Always save to local IndexedDB
  let localSaved = false;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, DELETED_STORE], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deletedStore = tx.objectStore(DELETED_STORE);
      
      deletedStore.delete(id); // unmark if re-saving
      const record = {
        id,
        dataUrl,
        timestamp: Date.now()
      };
      const req = store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    localSaved = true;
  } catch (err) {
    console.error('Error saving photo to local IndexedDB:', err);
  }

  // 2. Upload to Supabase Storage Bucket 'photobooth-photos'
  if (isSupabaseConfigured && supabase) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      if (!blob) {
        console.error('Failed to create Blob from photo dataUrl');
        return localSaved;
      }

      const fileName = `${id}.png`;
      console.log(`[Supabase Storage] Uploading ${fileName} to bucket '${STORAGE_BUCKET}'...`);

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.error('[Supabase Storage Error]:', error.message, error);
      } else {
        console.log('[Supabase Storage Success] File uploaded successfully:', data);
      }
    } catch (sbErr) {
      console.error('[Supabase Storage Exception]:', sbErr);
    }
  } else {
    console.warn('[Supabase Storage] Supabase is not configured. Check your .env file.');
  }

  return localSaved;
};

export const getPhotoFromStore = async (id) => {
  const deletedSet = await getDeletedIds();
  if (deletedSet.has(id)) {
    return null;
  }

  // 1. If Supabase is configured, fetch public URL from Supabase Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const fileName = `${id}.png`;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
      if (data && data.publicUrl) {
        const check = await fetch(data.publicUrl, { method: 'HEAD' });
        if (check.ok) {
          return data.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Checking Supabase Storage failed, falling back to local database:', e);
    }
  }

  // 2. Fallback to local IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error getting photo from IndexedDB:', err);
    return null;
  }
};

export const getAllPhotosFromStore = async () => {
  const photoList = [];
  const seenIds = new Set();
  const deletedSet = await getDeletedIds();

  // 1. Fetch from Supabase Storage if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', {
          limit: 200,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (!error && data && data.length > 0) {
        for (const file of data) {
          if (file.name && file.name.endsWith('.png')) {
            const id = file.name.replace('.png', '');
            if (!deletedSet.has(id)) {
              const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(file.name);
              seenIds.add(id);
              photoList.push({
                id,
                url: urlData.publicUrl,
                createdAt: file.created_at ? new Date(file.created_at).getTime() : Date.now(),
                source: 'supabase'
              });
            }
          }
        }
      }
    } catch (sbErr) {
      console.warn('Failed to list files from Supabase Storage:', sbErr);
    }
  }

  // 2. Fetch from Local IndexedDB
  try {
    const db = await openDB();
    const localRecords = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const rec of localRecords) {
      if (!seenIds.has(rec.id) && !deletedSet.has(rec.id)) {
        seenIds.add(rec.id);
        photoList.push({
          id: rec.id,
          url: rec.dataUrl,
          createdAt: rec.timestamp || Date.now(),
          source: 'local'
        });
      }
    }
  } catch (err) {
    console.error('Failed to get local photos from IndexedDB:', err);
  }

  return photoList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const deletePhotoFromStore = async (id) => {
  let success = false;
  
  // 1. Mark as deleted in local database filter
  await markIdsAsDeleted([id]);

  // 2. Delete from Supabase Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const fileName = `${id}.png`;
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      if (error) {
        console.warn('[Supabase Remove Warning]:', error.message);
      } else {
        console.log('[Supabase Remove Result]:', data);
      }
      success = true;
    } catch (e) {
      console.warn('Failed to remove from Supabase:', e);
    }
  }

  // 3. Delete from local IndexedDB
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
    success = true;
  } catch (err) {
    console.error('Failed to delete from IndexedDB:', err);
  }

  return success;
};

export const deleteAllPhotosFromStore = async () => {
  let success = false;
  const idsToDelete = [];

  // 1. Gather all file IDs from Supabase Storage & delete
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', { limit: 500 });
      if (!error && data && data.length > 0) {
        const fileNames = data.map(f => f.name).filter(name => name.endsWith('.png'));
        fileNames.forEach(name => idsToDelete.push(name.replace('.png', '')));
        if (fileNames.length > 0) {
          const { data: remData, error: remErr } = await supabase.storage.from(STORAGE_BUCKET).remove(fileNames);
          if (remErr) {
            console.warn('[Supabase Remove All Warning]:', remErr.message);
          } else {
            console.log('[Supabase Remove All Success]:', remData);
          }
        }
      }
      success = true;
    } catch (e) {
      console.warn('Failed to remove all files from Supabase:', e);
    }
  }

  // 2. Clear local IndexedDB & collect local IDs
  try {
    const db = await openDB();
    const localRecords = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    localRecords.forEach(rec => idsToDelete.push(rec.id));

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
    success = true;
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }

  // 3. Mark all collected IDs as deleted so they never reappear
  if (idsToDelete.length > 0) {
    await markIdsAsDeleted(idsToDelete);
  }

  return success;
};
