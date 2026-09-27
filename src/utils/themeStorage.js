// Cloud (Supabase Storage) + Local (IndexedDB) Storage for High-Resolution Custom Frames / Themes
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'SnapSchoolThemeDB';
const DB_VERSION = 2;
const STORE_NAME = 'custom_themes';
const DELETED_THEMES_STORE = 'deleted_themes';
const STORAGE_BUCKET = 'photobooth-photos';
const THEMES_FOLDER = 'themes';

const openThemeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DELETED_THEMES_STORE)) {
        db.createObjectStore(DELETED_THEMES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getDeletedThemeIds = async () => {
  try {
    const db = await openThemeDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DELETED_THEMES_STORE, 'readonly');
      const store = tx.objectStore(DELETED_THEMES_STORE);
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

const markThemeIdAsDeleted = async (id) => {
  try {
    const db = await openThemeDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DELETED_THEMES_STORE, 'readwrite');
      const store = tx.objectStore(DELETED_THEMES_STORE);
      store.put({ id, deletedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to record deleted theme ID in local store:', e);
  }
};

// Convert Base64 dataUrl directly to a Blob
const dataUrlToBlob = (dataUrl) => {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return null;
    }
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
    console.error('Error converting dataUrl to Blob for theme:', err);
    return null;
  }
};

export const saveCustomThemeToDB = async (theme) => {
  // 1. Save to local IndexedDB first
  try {
    const db = await openThemeDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, DELETED_THEMES_STORE], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deletedStore = tx.objectStore(DELETED_THEMES_STORE);
      deletedStore.delete(theme.id); // unmark if re-saving
      store.put(theme);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save theme to local IndexedDB:', err);
  }

  // 2. Upload frame overlay image and theme metadata JSON to Supabase Cloud Storage
  if (isSupabaseConfigured && supabase) {
    try {
      let finalFrameOverlay = theme.frameOverlay;

      // If frame overlay is base64 dataUrl, upload image file to Supabase
      if (typeof theme.frameOverlay === 'string' && theme.frameOverlay.startsWith('data:')) {
        const blob = dataUrlToBlob(theme.frameOverlay);
        if (blob) {
          const imagePath = `${THEMES_FOLDER}/${theme.id}.png`;
          console.log(`[Supabase Theme Storage] Uploading frame overlay to ${imagePath}...`);

          const { error: uploadImgErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(imagePath, blob, {
              contentType: 'image/png',
              upsert: true
            });

          if (!uploadImgErr) {
            const { data: publicUrlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(imagePath);
            if (publicUrlData?.publicUrl) {
              finalFrameOverlay = publicUrlData.publicUrl;
            }
          } else {
            console.error('[Supabase Theme Storage] Failed to upload frame image:', uploadImgErr);
          }
        }
      }

      // Prepare metadata JSON
      const themeMeta = {
        ...theme,
        frameOverlay: finalFrameOverlay,
        updatedAt: Date.now()
      };

      const metaBlob = new Blob([JSON.stringify(themeMeta, null, 2)], {
        type: 'application/json'
      });
      const metaPath = `${THEMES_FOLDER}/${theme.id}.json`;

      const { error: metaUploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(metaPath, metaBlob, {
          contentType: 'application/json',
          upsert: true
        });

      if (metaUploadErr) {
        console.error('[Supabase Theme Storage] Failed to upload theme metadata:', metaUploadErr);
      } else {
        console.log('[Supabase Theme Storage] Theme metadata synced successfully to cloud:', theme.id);
        
        // Update local IndexedDB with public cloud URL version
        try {
          const db = await openThemeDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(themeMeta);
        } catch (e) {
          // ignore local update error
        }
      }
    } catch (sbErr) {
      console.error('[Supabase Theme Storage Exception]:', sbErr);
    }
  }

  return true;
};

export const getAllCustomThemesFromDB = async () => {
  const themeMap = new Map();
  const deletedSet = await getDeletedThemeIds();

  // 1. Fetch themes from Supabase Cloud Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(THEMES_FOLDER, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (!error && data && data.length > 0) {
        const jsonFiles = data.filter(f => f.name && f.name.endsWith('.json'));

        await Promise.all(
          jsonFiles.map(async (file) => {
            const themeId = file.name.replace('.json', '');
            if (deletedSet.has(themeId)) return;

            try {
              const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(`${THEMES_FOLDER}/${file.name}`);

              if (urlData?.publicUrl) {
                const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
                if (res.ok) {
                  const meta = await res.json();
                  if (meta && meta.id && !deletedSet.has(meta.id)) {
                    themeMap.set(meta.id, meta);

                    // Sync to local IndexedDB
                    try {
                      const db = await openThemeDB();
                      const tx = db.transaction(STORE_NAME, 'readwrite');
                      tx.objectStore(STORE_NAME).put(meta);
                    } catch (e) {}
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch cloud theme ${file.name}:`, err);
            }
          })
        );
      }
    } catch (sbErr) {
      console.warn('Failed to list cloud themes from Supabase:', sbErr);
    }
  }

  // 2. Load from local IndexedDB
  try {
    const db = await openThemeDB();
    const localThemes = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const t of localThemes) {
      if (!deletedSet.has(t.id) && !themeMap.has(t.id)) {
        themeMap.set(t.id, t);
      }
    }
  } catch (err) {
    console.error('Failed to get themes from IndexedDB:', err);
  }

  return Array.from(themeMap.values());
};

export const deleteCustomThemeFromDB = async (id) => {
  // 1. Mark as deleted in local blacklist
  await markThemeIdAsDeleted(id);

  // 2. Delete from local IndexedDB
  try {
    const db = await openThemeDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error('Gagal menghapus template'));
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete theme from local IndexedDB:', err);
  }

  // 3. Delete from Supabase Cloud Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const filesToDelete = [
        `${THEMES_FOLDER}/${id}.png`,
        `${THEMES_FOLDER}/${id}.json`
      ];
      await supabase.storage.from(STORAGE_BUCKET).remove(filesToDelete);
      console.log(`[Supabase Theme Storage] Deleted ${id} from cloud`);
    } catch (sbErr) {
      console.error('[Supabase Theme Storage] Failed to delete theme from cloud:', sbErr);
    }
  }

  return true;
};
