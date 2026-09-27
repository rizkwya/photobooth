import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PhotoboothPage from './pages/PhotoboothPage';
import AdminTemplatesPage from './pages/AdminTemplatesPage';
import MobileDownloadPage from './pages/MobileDownloadPage';
import { DEFAULT_THEMES, PHOTO_LAYOUTS } from './utils/defaultThemes';
import { getAllCustomThemesFromDB, saveCustomThemeToDB, deleteCustomThemeFromDB } from './utils/themeStorage';

const ACTIVE_THEME_STORAGE_KEY = 'photobooth_active_theme_id';

export default function App() {
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [activeThemeId, setActiveThemeId] = useState(() => {
    return localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) || '';
  });
  const [selectedLayout, setSelectedLayout] = useState(PHOTO_LAYOUTS[0]);

  // Load saved custom themes from IndexedDB on startup
  useEffect(() => {
    let mounted = true;
    const loadThemes = async () => {
      try {
        const customThemes = await getAllCustomThemesFromDB();
        if (mounted && customThemes && customThemes.length > 0) {
          const merged = [...DEFAULT_THEMES, ...customThemes];
          setThemes(merged);
          
          // Verify if active theme exists in merged themes, fallback if needed
          const savedId = localStorage.getItem(ACTIVE_THEME_STORAGE_KEY);
          if (savedId && merged.some(t => t.id === savedId)) {
            setActiveThemeId(savedId);
          } else if (merged.length > 0) {
            handleSetActiveTheme(merged[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load custom themes from DB:', err);
      }
    };

    loadThemes();
    return () => { mounted = false; };
  }, []);

  const handleSetActiveTheme = (themeId) => {
    setActiveThemeId(themeId);
    try {
      if (themeId) {
        localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, themeId);
      } else {
        localStorage.removeItem(ACTIVE_THEME_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save active theme ID to localStorage:', e);
    }
  };

  const handleSaveTheme = async (newTheme, setAsActive = true) => {
    try {
      await saveCustomThemeToDB(newTheme);
      setThemes(prev => [...prev.filter(t => t.id !== newTheme.id), newTheme]);
      if (setAsActive || !activeThemeId) {
        handleSetActiveTheme(newTheme.id);
      }
      return true;
    } catch (e) {
      console.error('Error saving theme:', e);
      return false;
    }
  };

  const handleDeleteCustomTheme = async (themeId) => {
    try {
      await deleteCustomThemeFromDB(themeId);
      const updated = themes.filter(t => t.id !== themeId);
      setThemes(updated);
      if (activeThemeId === themeId) {
        handleSetActiveTheme(updated.length > 0 ? updated[0].id : '');
      }
      return true;
    } catch (e) {
      console.error('Error deleting theme:', e);
      return false;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Photobooth Kiosk Page (/camera) */}
        <Route
          path="/camera"
          element={
            <PhotoboothPage
              themes={themes}
              activeThemeId={activeThemeId}
              setActiveThemeId={handleSetActiveTheme}
              selectedLayout={selectedLayout}
              setSelectedLayout={setSelectedLayout}
            />
          }
        />

        {/* Admin & Template Manager Page (/admin) */}
        <Route
          path="/admin"
          element={
            <AdminTemplatesPage
              themes={themes}
              activeThemeId={activeThemeId}
              onSetActiveTheme={handleSetActiveTheme}
              onSaveTheme={handleSaveTheme}
              onDeleteCustomTheme={handleDeleteCustomTheme}
            />
          }
        />

        {/* Mobile Photo Download Page via QR Code (/photo/:id) */}
        <Route
          path="/photo/:id"
          element={<MobileDownloadPage />}
        />

        {/* Root URL redirect to /camera */}
        <Route path="*" element={<Navigate to="/camera" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
