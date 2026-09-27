import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import {
  Upload,
  Trash2,
  Camera,
  Palette,
  RefreshCw,
  CheckCircle2,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  Image as ImageIcon,
  Download,
  ExternalLink,
  X,
  Menu,
  Calendar,
  FolderArchive,
  ChevronRight,
  ShieldAlert,
  Clock,
  SlidersHorizontal,
  FlipHorizontal
} from 'lucide-react';
import { getAllPhotosFromStore, deletePhotoFromStore, deleteAllPhotosFromStore } from '../utils/photoStorage';

// =========================================================================
// Real-time Live Clock Component (Matching Contoh: WitaLiveClock.tsx)
// =========================================================================
function WpLiveClock() {
  const [clockTime, setClockTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        setClockTime(`${formatter.format(now)} WITA`);
      } catch (e) {
        const now = new Date();
        setClockTime(`${now.toLocaleTimeString('id-ID')} WITA`);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!clockTime) return null;

  return (
    <div className="wp-live-clock">
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00a32a', display: 'inline-block' }} />
      <span>{clockTime}</span>
    </div>
  );
}

// =========================================================================
// Confirm Delete Modal (Exact Match to Contoh: ConfirmDeleteModal.tsx)
// =========================================================================
function ConfirmDeleteModal({
  isOpen,
  title = 'Konfirmasi Penghapusan',
  message,
  itemName,
  warningText,
  isPending = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="wp-modal-overlay" onClick={onCancel}>
      <div
        className="wp-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="wp-modal-header">
          <div>
            <h3>{title}</h3>
            <p>Tindakan ini tidak dapat dibatalkan</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="wp-modal-close-btn"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="wp-modal-body">
          <p style={{ margin: 0, lineHeight: 1.5, color: '#1d2327' }}>
            {message}
          </p>

          {itemName && (
            <div className="wp-modal-item-highlight">
              &quot;{itemName}&quot;
            </div>
          )}

          {warningText && (
            <div className="wp-modal-warning-box">
              {warningText}
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="wp-modal-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="wp-button-secondary"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="wp-button-destructive"
          >
            {isPending ? 'Sedang Menghapus...' : 'Ya, Hapus Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Main Admin Component
// =========================================================================
export default function AdminTemplatesPage({
  themes,
  activeThemeId,
  onSetActiveTheme,
  onSaveTheme,
  onDeleteCustomTheme
}) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('photobooth_admin_auth') === 'true';
  });
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active Admin Tab: 'templates' | 'gallery'
  const [activeTab, setActiveTab] = useState('templates');

  // Template Form State
  const [templateName, setTemplateName] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  // Camera Mirror Setting State
  const [isCameraMirrored, setIsCameraMirrored] = useState(() => {
    const saved = localStorage.getItem('photobooth_camera_mirror');
    return saved === null ? true : saved === 'true';
  });

  const handleToggleMirror = (mirrored) => {
    setIsCameraMirrored(mirrored);
    localStorage.setItem('photobooth_camera_mirror', mirrored ? 'true' : 'false');
    window.dispatchEvent(new Event('storage'));
    setSuccessMsg(`Pengaturan kamera disimpan: ${mirrored ? 'Mode Mirror (Cermin) Aktif' : 'Mode Non-Mirror (Normal) Aktif'}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Gallery Photos State
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: null, // 'theme' | 'photo' | 'allPhotos'
    targetId: null,
    targetName: null,
    message: '',
    warningText: '',
    isPending: false
  });

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  // Auth Credentials
  const expectedUser = import.meta.env.VITE_ADMIN_USER || 'admin';
  const expectedPass = import.meta.env.VITE_ADMIN_PASS || 'admin123';

  // Load photos from Supabase & IndexedDB
  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const list = await getAllPhotosFromStore();
      setPhotos(list);
    } catch (e) {
      console.error('Failed to load photos in admin:', e);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPhotos();
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');

    if (inputUsername.trim() === expectedUser && inputPassword === expectedPass) {
      sessionStorage.setItem('photobooth_admin_auth', 'true');
      setIsAuthenticated(true);
      setInputPassword('');
    } else {
      setAuthError('Username atau kata sandi yang Anda masukkan salah.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('photobooth_admin_auth');
    setIsAuthenticated(false);
    setInputUsername('');
    setInputPassword('');
  };

  const processFile = (file) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!file) return;

    const isValidImage = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp|svg|bmp)$/i.test(file.name);
    if (!isValidImage) {
      setErrorMsg('Harap pilih file gambar dengan format PNG, JPG, atau WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setImagePreview(result);
      if (!templateName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTemplateName(cleanName);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file gambar. Coba pilih file lain.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!imagePreview) {
      setErrorMsg('Harap pilih file gambar bingkai overlay terlebih dahulu.');
      return;
    }

    if (!templateName.trim()) {
      setErrorMsg('Harap masukkan nama tema/bingkai.');
      return;
    }

    setIsSaving(true);
    try {
      const newTheme = {
        id: `custom-${Date.now()}`,
        name: templateName.trim(),
        isCustom: true,
        frameOverlay: imagePreview,
        stripColor: '#ffffff',
        accentColor: '#1e293b',
        textColor: '#0f172a',
        previewBorder: '1px solid #e2e8f0',
        decorations: []
      };

      await onSaveTheme(newTheme);

      if (autoActivate) {
        onSetActiveTheme(newTheme.id);
      }

      setSuccessMsg(`Bingkai "${newTheme.name}" berhasil disimpan & dipublikasikan!`);
      setImagePreview(null);
      setTemplateName('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg('Gagal menyimpan template: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Modal Confirmation for Deleting Theme
  const promptDeleteTheme = (theme) => {
    setDeleteModalState({
      isOpen: true,
      type: 'theme',
      targetId: theme.id,
      targetName: theme.name,
      message: 'Apakah Anda yakin ingin menghapus template bingkai ini dari sistem?',
      warningText: 'Bingkai yang dihapus tidak dapat dipulihkan kembali.',
      isPending: false
    });
  };

  // Trigger Modal Confirmation for Deleting Photo
  const promptDeletePhoto = (photo) => {
    setDeleteModalState({
      isOpen: true,
      type: 'photo',
      targetId: photo.id,
      targetName: `Foto #${photo.id.slice(0, 8)}`,
      message: 'Apakah Anda yakin ingin menghapus file foto sesi ini dari server dan galeri?',
      warningText: 'File foto asli dan thumbnail akan dihapus secara permanen.',
      isPending: false
    });
  };

  // Trigger Modal Confirmation for Deleting All Photos
  const promptDeleteAllPhotos = () => {
    if (photos.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      type: 'allPhotos',
      targetId: null,
      targetName: `Semua ${photos.length} Foto Galeri`,
      message: `Apakah Anda yakin ingin MENGHAPUS SEMUA ${photos.length} FOTO dari database dan cloud storage?`,
      warningText: 'PERINGATAN KRITIS: Seluruh arsip foto sesi photobooth akan terhapus secara permanen!',
      isPending: false
    });
  };

  // Execute Confirmed Delete Action
  const handleConfirmDelete = async () => {
    const { type, targetId } = deleteModalState;
    setDeleteModalState(prev => ({ ...prev, isPending: true }));

    try {
      if (type === 'theme') {
        await onDeleteCustomTheme(targetId);
        setSuccessMsg('Bingkai kustom berhasil dihapus.');
      } else if (type === 'photo') {
        await deletePhotoFromStore(targetId);
        if (selectedPhotoModal?.id === targetId) {
          setSelectedPhotoModal(null);
        }
        await fetchPhotos();
        setSuccessMsg('Foto berhasil dihapus.');
      } else if (type === 'allPhotos') {
        await deleteAllPhotosFromStore();
        if (selectedPhotoModal) {
          setSelectedPhotoModal(null);
        }
        await fetchPhotos();
        setSuccessMsg('Semua foto dalam galeri berhasil dihapus.');
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMsg('Gagal menghapus data: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setDeleteModalState({
        isOpen: false,
        type: null,
        targetId: null,
        targetName: null,
        message: '',
        warningText: '',
        isPending: false
      });
    }
  };

  // Bulk Download All Photos as a .ZIP file
  const handleDownloadAllZip = async () => {
    if (photos.length === 0 || isZipping) return;
    setIsZipping(true);
    setZipProgress(`Menyiapkan 0/${photos.length}...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder('photobooth-photos');

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setZipProgress(`Mengunduh ${i + 1}/${photos.length}...`);

        try {
          let blob;
          if (photo.url && photo.url.startsWith('data:')) {
            const parts = photo.url.split(',');
            const byteString = atob(parts[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) {
              ia[j] = byteString.charCodeAt(j);
            }
            blob = new Blob([ia], { type: 'image/png' });
          } else {
            const res = await fetch(photo.url);
            blob = await res.blob();
          }

          const dateFormatted = photo.createdAt
            ? new Date(photo.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19)
            : `photo-${i + 1}`;
          const fileName = `${dateFormatted}_${photo.id}.png`;
          folder.file(fileName, blob);
        } catch (fetchErr) {
          console.warn(`Gagal mengunduh foto ${photo.id} untuk zip:`, fetchErr);
        }
      }

      setZipProgress('Mengompres file ZIP...');
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const nowStr = new Date().toISOString().slice(0, 10);
      const zipFileName = `photobooth-semua-foto-${nowStr}.zip`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setSuccessMsg(`Berhasil mengunduh ${photos.length} foto dalam 1 file ZIP!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error generating zip:', err);
      setErrorMsg('Gagal membuat file ZIP. Silakan coba lagi.');
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  // =========================================================================
  // VIEW 1: WORDPRESS LOGIN FORM (Matching Contoh: LoginForm.tsx)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f0f0f1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif'
      }}>
        <div style={{ maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Brand Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1d2327', letterSpacing: '0.04em' }}>
              Multimedia SMAVEN x IT Club SMAVEN
            </h1>
          </div>

          {/* WordPress Classic Login Box */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c3c4c7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '24px',
            borderRadius: '2px'
          }}>
            {authError && (
              <div style={{
                backgroundColor: '#fcf0f1',
                border: '1px solid #f87171',
                borderLeftWidth: '4px',
                color: '#d63638',
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '2px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="admin-user" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: '#1d2327' }}>
                  Nama Pengguna
                </label>
                <input
                  id="admin-user"
                  type="text"
                  className="wp-input"
                  style={{ width: '100%', height: '36px' }}
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  placeholder=""
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="admin-pass" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: '#1d2327' }}>
                  Kata Sandi
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="admin-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="wp-input"
                    style={{ width: '100%', height: '36px', paddingRight: '36px' }}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#646970',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="wp-button-primary"
                style={{ width: '100%', minHeight: '36px', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}
              >
                <Lock size={14} />
                <span>Masuk ke Panel</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED ADMIN DASHBOARD (WORDPRESS ENTERPRISE THEME)
  // =========================================================================
  return (
    <div className="wp-admin-body">
      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.type === 'allPhotos' ? 'Hapus Seluruh Arsip Foto' : 'Konfirmasi Penghapusan'}
        message={deleteModalState.message}
        itemName={deleteModalState.targetName}
        warningText={deleteModalState.warningText}
        isPending={deleteModalState.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 1. TOP MOBILE BAR (Hidden on PC/Desktop md:hidden) */}
      <header className="wp-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f0f0f1',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Buka Menu"
          >
            {isMobileMenuOpen ? <X size={22} color="#72aee6" /> : <Menu size={22} />}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
            Multimedia SMAVEN x IT Club SMAVEN
          </span>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT CANVAS */}
      <div className="wp-layout-wrap">
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 55
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left WP Sidebar (w-60 min-h-screen) */}
        <aside className={`wp-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Brand Header Inside Sidebar (Title: Multimedia SMAVEN x IT Club SMAVEN - Desktop Look) */}
            <div className="wp-sidebar-brand">
              <div>
                <h1 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#ffffff', letterSpacing: '0.04em' }}>
                  Multimedia SMAVEN x IT Club SMAVEN
                </h1>
              </div>
            </div>

            {/* Menu Section Label */}
            <div className="wp-menu-section-label">
              Menu Utama
            </div>

            {/* Navigation Menu Items */}
            <ul className="wp-menu-list">
              <li>
                <button
                  onClick={() => {
                    setActiveTab('templates');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`wp-menu-item ${activeTab === 'templates' ? 'active' : ''}`}
                >
                  <span className="wp-menu-icon">
                    <Palette size={15} />
                    <span>Bingkai Foto</span>
                  </span>
                  {activeTab === 'templates' && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                </button>
              </li>

              <li>
                <button
                  onClick={() => {
                    setActiveTab('gallery');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`wp-menu-item ${activeTab === 'gallery' ? 'active' : ''}`}
                >
                  <span className="wp-menu-icon">
                    <ImageIcon size={15} />
                    <span>Galeri Media</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {photos.length > 0 && (
                      <span className="wp-badge-count">{photos.length}</span>
                    )}
                    {activeTab === 'gallery' && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                  </div>
                </button>
              </li>

              <li>
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`wp-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                >
                  <span className="wp-menu-icon">
                    <SlidersHorizontal size={15} />
                    <span>Pengaturan Kamera</span>
                  </span>
                  {activeTab === 'settings' && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                </button>
              </li>

              <li>
                <Link
                  to="/camera"
                  className="wp-menu-item"
                  title="Buka bilik kamera photobooth"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="wp-menu-icon">
                    <Camera size={15} />
                    <span>Buka Bilik Foto</span>
                  </span>
                  <ExternalLink size={12} color="#8c8f94" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Sidebar Footer: Logout Button with Matching Sidebar Color */}
          <div className="wp-sidebar-footer">
            <button
              onClick={handleLogout}
              className="wp-sidebar-logout-btn"
              title="Keluar dari akun"
            >
              <LogOut size={15} style={{ color: '#8c8f94', flexShrink: 0 }} />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </aside>

        {/* 3. Main Content Canvas */}
        <main className="wp-main-canvas">
          {/* WordPress Notice Banners */}
          {successMsg && (
            <div className="wp-notice wp-notice-success">
              <CheckCircle2 size={16} color="#00a32a" style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="wp-notice wp-notice-error">
              <AlertCircle size={16} color="#d63638" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* =========================================================================
              TAB 1: PENGATURAN BINGKAI / TEMPLATES
              ========================================================================= */}
          {activeTab === 'templates' && (
            <div>
              {/* Header Halaman (Page Title Bar) */}
              <div className="wp-page-header">
                <div>
                  <h1 className="wp-page-title">
                    Bingkai Cetak Photobooth
                  </h1>
                  <p className="wp-page-subtitle">
                    Kelola template overlay PNG transparan untuk hasil cetak foto strip pengunjung
                  </p>
                </div>
              </div>

              {/* Active Theme Postbox */}
              <div className="wp-postbox">
                <div className="wp-postbox-header">
                  <span>Bingkai Aktif Saat Ini</span>
                </div>
                <div className="wp-postbox-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {activeTheme?.frameOverlay ? (
                      <div style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '2px',
                        border: '1px solid #c3c4c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <img src={activeTheme.frameOverlay} alt={activeTheme.name} style={{ height: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: '#f0f0f1',
                        borderRadius: '2px',
                        border: '1px solid #c3c4c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#646970',
                        fontSize: '10px',
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '4px',
                        flexShrink: 0
                      }}>
                        KOSONG
                      </div>
                    )}

                    <div>
                      <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px', color: '#1d2327' }}>
                        {activeTheme ? activeTheme.name : 'Belum Ada Bingkai Terpilih'}
                      </h2>
                      <p style={{ fontSize: '12px', color: '#646970', margin: 0 }}>
                        {activeTheme
                          ? 'Bingkai ini digunakan secara otomatis pada setiap sesi jepret kamera pengunjung.'
                          : 'Silakan unggah bingkai PNG transparan buatan Anda pada formulir di bawah.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Form & List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {/* Left Column: Upload Postbox */}
                <div className="wp-postbox">
                  <div className="wp-postbox-header">
                    <span>Unggah Bingkai Baru (PNG Overlay)</span>
                  </div>
                  <div className="wp-postbox-body">
                    <p style={{ fontSize: '12px', color: '#646970', marginBottom: '14px' }}>
                      Unggah file template PNG transparan dari Canva / Photoshop.
                    </p>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label htmlFor="tpl-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#1d2327' }}>
                          Nama Bingkai / Acara
                        </label>
                        <input
                          id="tpl-name"
                          type="text"
                          className="wp-input"
                          style={{ width: '100%' }}
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="cth: Dies Natalis 2026 / Wisuda"
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#1d2327' }}>
                          File Gambar Overlay (PNG Transparan)
                        </label>

                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: imagePreview ? '1px solid #2271b1' : '1px dashed #8c8f94',
                            borderRadius: '2px',
                            backgroundColor: imagePreview ? '#f0f6fc' : '#ffffff',
                            padding: '16px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: 'none' }}
                          />

                          {imagePreview ? (
                            <div>
                              <div style={{
                                maxHeight: '180px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #c3c4c7',
                                padding: '4px',
                                marginBottom: '8px'
                              }}>
                                <img src={imagePreview} alt="Preview" style={{ maxHeight: '170px', maxWidth: '100%', objectFit: 'contain' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: '#2271b1', fontWeight: 600 }}>
                                Klik untuk mengganti gambar
                              </span>
                            </div>
                          ) : (
                            <div>
                              <Upload size={24} color="#2271b1" style={{ margin: '0 auto 6px' }} />
                              <p style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 2px', color: '#1d2327' }}>
                                Tarik & lepaskan file PNG di sini
                              </p>
                              <p style={{ fontSize: '11px', color: '#646970', margin: 0 }}>
                                atau klik untuk memilih file dari komputer
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                        <input
                          id="auto-active"
                          type="checkbox"
                          checked={autoActivate}
                          onChange={(e) => setAutoActivate(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="auto-active" style={{ fontSize: '12px', cursor: 'pointer', color: '#1d2327' }}>
                          Langsung aktifkan bingkai ini setelah disimpan
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving || !imagePreview}
                        className="wp-button-primary"
                        style={{ width: '100%', marginTop: '4px' }}
                      >
                        {isSaving ? 'Menyimpan...' : 'Simpan & Publikasikan Bingkai'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: List of Custom Frames */}
                <div className="wp-postbox">
                  <div className="wp-postbox-header">
                    <span>Koleksi Bingkai Kustom ({themes.filter(t => t.isCustom).length})</span>
                  </div>
                  <div className="wp-postbox-body">
                    {themes.filter(t => t.isCustom).length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#646970' }}>
                        <Palette size={32} color="#c3c4c7" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px', color: '#1d2327' }}>
                          Belum Ada Bingkai Kustom
                        </p>
                        <p style={{ fontSize: '12px', margin: 0 }}>
                          Gunakan formulir di sebelah kiri untuk mengunggah bingkai PNG pertama Anda.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                        {themes.filter(t => t.isCustom).map((theme) => {
                          const isActive = theme.id === activeThemeId;
                          return (
                            <div
                              key={theme.id}
                              style={{
                                border: isActive ? '2px solid #2271b1' : '1px solid #c3c4c7',
                                backgroundColor: '#ffffff',
                                borderRadius: '2px',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: isActive ? '0 0 0 1px #2271b1' : 'none'
                              }}
                            >
                              <div style={{
                                height: '150px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                marginBottom: '10px',
                                border: '1px solid #f0f0f1'
                              }}>
                                {theme.frameOverlay ? (
                                  <img src={theme.frameOverlay} alt={theme.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#646970' }}>Tanpa Gambar</span>
                                )}
                              </div>

                              <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px', color: '#1d2327', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {theme.name}
                                </h3>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {isActive ? (
                                    <span style={{
                                      flex: 1,
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '4px 6px',
                                      backgroundColor: '#00a32a',
                                      color: '#ffffff',
                                      borderRadius: '2px',
                                      textAlign: 'center'
                                    }}>
                                      ✓ Aktif
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => onSetActiveTheme(theme.id)}
                                      className="wp-button-secondary"
                                      style={{ flex: 1, padding: '2px 6px', fontSize: '11px' }}
                                    >
                                      Aktifkan
                                    </button>
                                  )}

                                  <button
                                    onClick={() => promptDeleteTheme(theme)}
                                    className="wp-button-destructive"
                                    style={{ padding: '2px 8px', fontSize: '11px' }}
                                    title="Hapus bingkai ini"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: GALERI HASIL FOTO PENGUNJUNG
              ========================================================================= */}
          {activeTab === 'gallery' && (
            <div>
              {/* Header Halaman (Page Title Bar) with Actions */}
              <div className="wp-page-header">
                <div>
                  <h1 className="wp-page-title">
                    Galeri Media Foto
                  </h1>
                  <p className="wp-page-subtitle">
                    Total {photos.length} foto strip tersimpan dari sesi pengunjung
                  </p>
                </div>

                {/* Top Action Buttons Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleDownloadAllZip}
                    disabled={photos.length === 0 || isZipping || loadingPhotos}
                    className="wp-button-primary"
                    title="Unduh seluruh foto dalam 1 file ZIP"
                  >
                    <FolderArchive size={14} />
                    <span>{isZipping ? (zipProgress || 'Memproses ZIP...') : 'Download Semua (.ZIP)'}</span>
                  </button>

                  <button
                    onClick={promptDeleteAllPhotos}
                    disabled={photos.length === 0 || loadingPhotos || isZipping}
                    className="wp-button-destructive"
                    title="Hapus semua foto secara permanen"
                  >
                    <Trash2 size={14} />
                    <span>Hapus Semua Foto</span>
                  </button>

                  <button
                    onClick={fetchPhotos}
                    disabled={loadingPhotos || isZipping}
                    className="wp-button-secondary"
                    title="Muat ulang data galeri"
                  >
                    <RefreshCw className={loadingPhotos ? 'spin' : ''} size={13} />
                    <span>{loadingPhotos ? 'Memuat...' : 'Segarkan'}</span>
                  </button>
                </div>
              </div>

              {/* Photos Grid Box */}
              <div className="wp-postbox">
                <div className="wp-postbox-header">
                  <span>Daftar Strip Foto Tersimpan ({photos.length})</span>
                </div>
                <div className="wp-postbox-body">
                  {loadingPhotos && photos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#646970' }}>
                      <RefreshCw className="spin" size={24} color="#2271b1" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '12px', margin: 0 }}>Memuat daftar media foto...</p>
                    </div>
                  ) : photos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#646970' }}>
                      <ImageIcon size={32} color="#c3c4c7" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px', color: '#1d2327' }}>
                        Belum Ada Foto Tersimpan
                      </p>
                      <p style={{ fontSize: '12px', margin: '0 0 12px' }}>
                        Setiap foto yang diambil dari kamera bilik photobooth akan otomatis masuk ke galeri ini.
                      </p>
                      <Link to="/camera" className="wp-button-primary">
                        <Camera size={14} />
                        <span>Buka Photobooth Sekarang</span>
                      </Link>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '16px'
                    }}>
                      {photos.map((photo, idx) => {
                        const dateStr = photo.createdAt
                          ? new Date(photo.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'Baru saja';

                        return (
                          <div
                            key={photo.id || idx}
                            style={{
                              border: '1px solid #c3c4c7',
                              backgroundColor: '#ffffff',
                              borderRadius: '2px',
                              padding: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                          >
                            {/* Photo Thumbnail */}
                            <div
                              onClick={() => setSelectedPhotoModal(photo)}
                              style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                height: '210px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                border: '1px solid #f0f0f1',
                                marginBottom: '8px'
                              }}
                              title="Klik untuk melihat foto HD penuh"
                            >
                              <img
                                src={photo.url}
                                alt="Strip Foto"
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                loading="lazy"
                              />
                            </div>

                            {/* Meta & Actions */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#646970', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={11} />
                                  {dateStr}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '2px',
                                  backgroundColor: photo.source === 'supabase' ? '#dbeafe' : '#f0f0f1',
                                  color: photo.source === 'supabase' ? '#1e40af' : '#646970'
                                }}>
                                  {photo.source === 'supabase' ? 'CLOUD' : 'LOCAL'}
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px' }}>
                                <a
                                  href={photo.url}
                                  download={`photobooth-${photo.id}.png`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="wp-button-secondary"
                                  style={{ padding: '2px 6px', fontSize: '11px', textDecoration: 'none' }}
                                >
                                  <Download size={12} />
                                  <span>Unduh</span>
                                </a>

                                <Link
                                  to={`/photo/${photo.id}`}
                                  target="_blank"
                                  className="wp-button-secondary"
                                  style={{ padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}
                                  title="Buka link download HP"
                                >
                                  <ExternalLink size={12} />
                                </Link>

                                <button
                                  onClick={() => promptDeletePhoto(photo)}
                                  className="wp-button-destructive"
                                  style={{ padding: '2px 8px', fontSize: '11px' }}
                                  title="Hapus foto ini"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: PENGATURAN KAMERA & SISTEM
              ========================================================================= */}
          {activeTab === 'settings' && (
            <div>
              {/* Header Halaman */}
              <div className="wp-page-header">
                <div>
                  <h1 className="wp-page-title">
                    Pengaturan Kamera & Kiosk
                  </h1>
                  <p className="wp-page-subtitle">
                    Konfigurasi orientasi cermin (mirror), orientasi gambar, dan preferensi bilik photobooth
                  </p>
                </div>
              </div>

              {/* Camera Mirror Postbox */}
              <div className="wp-postbox">
                <div className="wp-postbox-header">
                  <span>Orientasi Cermin Kamera (Mirror Mode)</span>
                </div>
                <div className="wp-postbox-body" style={{ padding: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#50575e', marginTop: 0, marginBottom: '18px', lineHeight: 1.6 }}>
                    Atur apakah tampilan layar langsung (live camera preview) dan hasil tangkapan foto strip dibalik secara horizontal (efek cermin) atau menggunakan orientasi normal tanpa cermin.
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    {/* Option 1: Mirror Mode (Cermin) */}
                    <div
                      onClick={() => handleToggleMirror(true)}
                      style={{
                        border: isCameraMirrored ? '2px solid #2271b1' : '1px solid #c3c4c7',
                        backgroundColor: isCameraMirrored ? '#f0f6fc' : '#ffffff',
                        borderRadius: '4px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '4px',
                            backgroundColor: isCameraMirrored ? '#2271b1' : '#f0f0f1',
                            color: isCameraMirrored ? '#ffffff' : '#50575e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FlipHorizontal size={20} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1d2327' }}>
                              Mode Mirror (Cermin)
                            </h4>
                            <span style={{ fontSize: '11px', color: '#646970' }}>Webcam / Kamera Depan</span>
                          </div>
                        </div>
                        {isCameraMirrored && (
                          <span style={{
                            backgroundColor: '#00a32a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '2px'
                          }}>
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#50575e', lineHeight: 1.5 }}>
                        Tampilan kamera bertindak seperti cermin (gerak ke kiri tampak ke kiri). Sangat intuitif dan natural untuk pengunjung saat berpose di layar kiosk photobooth.
                      </p>
                    </div>

                    {/* Option 2: Non-Mirror Mode (Normal) */}
                    <div
                      onClick={() => handleToggleMirror(false)}
                      style={{
                        border: !isCameraMirrored ? '2px solid #2271b1' : '1px solid #c3c4c7',
                        backgroundColor: !isCameraMirrored ? '#f0f6fc' : '#ffffff',
                        borderRadius: '4px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '4px',
                            backgroundColor: !isCameraMirrored ? '#2271b1' : '#f0f0f1',
                            color: !isCameraMirrored ? '#ffffff' : '#50575e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Camera size={20} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1d2327' }}>
                              Mode Non-Mirror (Normal)
                            </h4>
                            <span style={{ fontSize: '11px', color: '#646970' }}>DSLR / Sony ZV-E10 / Kamera Belakang</span>
                          </div>
                        </div>
                        {!isCameraMirrored && (
                          <span style={{
                            backgroundColor: '#00a32a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '2px'
                          }}>
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#50575e', lineHeight: 1.5 }}>
                        Tampilan kamera dan hasil jepretan foto tidak dibalik secara horizontal. Direkomendasikan untuk kamera capture card profesional, DSLR, atau kamera belakang.
                      </p>
                    </div>
                  </div>

                  {/* Info Status Box */}
                  <div style={{
                    backgroundColor: '#f6f7f7',
                    borderLeft: '4px solid #2271b1',
                    padding: '12px 16px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    color: '#2c3338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#2271b1" />
                      <span>Status saat ini: <strong>{isCameraMirrored ? 'Mode Mirror Aktif (Efek Cermin)' : 'Mode Non-Mirror Aktif (Normal)'}</strong></span>
                    </div>
                    <Link
                      to="/camera"
                      target="_blank"
                      className="wp-button-secondary"
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                    >
                      <ExternalLink size={13} />
                      <span>Uji Coba di Bilik Kamera</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          FULLSCREEN PHOTO DETAIL MODAL
          ========================================================================= */}
      {selectedPhotoModal && (
        <div
          className="wp-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhotoModal(null);
          }}
        >
          <div style={{
            maxWidth: '900px',
            width: '100%',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhotoModal(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: '#1d2327',
                border: '1px solid #3c434a',
                color: '#ffffff',
                borderRadius: '2px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* High-res Photo Image */}
            <img
              src={selectedPhotoModal.url}
              alt="Foto Detail"
              style={{
                maxHeight: '80vh',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: '2px',
                border: '1px solid #c3c4c7',
                backgroundColor: '#ffffff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />

            {/* Bottom Actions Modal Bar */}
            <div style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <a
                href={selectedPhotoModal.url}
                download={`photobooth-${selectedPhotoModal.id}.png`}
                className="wp-button-primary"
                style={{ padding: '6px 20px', fontSize: '13px' }}
              >
                <Download size={15} />
                <span>Unduh Gambar Asli (HD)</span>
              </a>

              <Link
                to={`/photo/${selectedPhotoModal.id}`}
                target="_blank"
                className="wp-button-secondary"
                style={{ padding: '6px 18px', fontSize: '13px' }}
              >
                <ExternalLink size={15} />
                <span>Buka Link Download HP</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
