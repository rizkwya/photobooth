import React, { useState, useEffect } from 'react';
import { X, Upload, Palette, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

export default function AdminFrameModal({
  isOpen,
  onClose,
  themes,
  onSaveTheme,
  onDeleteCustomTheme,
  activeThemeId,
  setActiveThemeId
}) {
  const [themeName, setThemeName] = useState('Tema Kustom Sekolah');
  const [badgeText, setBadgeText] = useState('SMK / SMA PHOTOBOOTH');
  const [subText, setSubText] = useState('Event 2026, Kenangan Terbaik');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [borderColor, setBorderColor] = useState('#cbd5e1');
  const [borderStyle, setBorderStyle] = useState('solid');

  const [frameOverlay, setFrameOverlay] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFrameOverlay(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const newTheme = {
      id: 'custom_' + Date.now(),
      name: themeName,
      category: 'custom',
      bgColor,
      textColor,
      accentColor,
      borderColor,
      borderStyle,
      badgeText,
      subText,
      frameOverlay,
      logoUrl,
      isCustom: true
    };

    onSaveTheme(newTheme);
    setActiveThemeId(newTheme.id);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="studio-card" style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        background: '#ffffff',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 id="admin-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={20} /> Pengaturan Tema dan Frame Sekolah
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Unggah file bingkai transparan (PNG), logo sekolah, dan atur teks untuk acara Anda.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ width: '36px', height: '36px', padding: 0 }}
            aria-label="Tutup pengaturan"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="theme-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nama Tema atau Acara
              </label>
              <input
                id="theme-name"
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Contoh: Graduation 2026 SMAN 1"
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label htmlFor="badge-text" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Teks Judul Utama (Header Strip)
              </label>
              <input
                id="badge-text"
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Contoh: SMA NEGERI 1 PHOTOBOOTH"
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label htmlFor="sub-text" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Teks Subtitle (Footer Strip)
              </label>
              <input
                id="sub-text"
                type="text"
                value={subText}
                onChange={(e) => setSubText(e.target.value)}
                placeholder="Contoh: Angkatan 2026, Kenangan Selamanya"
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Warna Latar
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: '36px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{bgColor}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Warna Aksen / Judul
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{ width: '36px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{accentColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Uploads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Logo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Logo Sekolah (PNG Transparan)
              </label>
              <div style={{
                border: '1px dashed var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                textAlign: 'center',
                background: 'var(--bg-app)'
              }}>
                {logoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <img src={logoUrl} alt="Logo Sekolah" style={{ height: '44px', objectFit: 'contain' }} />
                    <button
                      onClick={() => setLogoUrl(null)}
                      style={{ background: 'none', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <Upload size={20} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pilih file logo sekolah</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {/* Frame Overlay Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Overlay Bingkai Grafis (PNG Transparan)
              </label>
              <div style={{
                border: '1px dashed var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                textAlign: 'center',
                background: 'var(--bg-app)'
              }}>
                {frameOverlay ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Bingkai kustom terpasang</span>
                    <button
                      onClick={() => setFrameOverlay(null)}
                      style={{ background: 'none', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={20} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload file bingkai transparan</span>
                    <input type="file" accept="image/png, image/webp" onChange={handleOverlayUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {/* Live Preview Card */}
            <div style={{
              background: bgColor,
              border: `1px ${borderStyle} ${borderColor}`,
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <div style={{ color: accentColor, fontWeight: 700, fontSize: '0.9rem' }}>{badgeText || 'JUDUL ACARA'}</div>
              <div style={{ color: textColor, fontSize: '0.75rem' }}>{subText || 'SUBTITLE ACARA'}</div>
            </div>
          </div>
        </div>

        {/* Saved Themes List */}
        {themes.filter(t => t.isCustom).length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Tema Tersimpan:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {themes.filter(t => t.isCustom).map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-medium)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  <span>{t.name}</span>
                  <button
                    onClick={() => onDeleteCustomTheme(t.id)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                    aria-label={`Hapus tema ${t.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px'
        }}>
          <button onClick={onClose} className="btn btn-outline">
            Batal
          </button>
          <button onClick={handleSave} className="btn btn-dark">
            <Plus size={16} /> Simpan Tema
          </button>
        </div>
      </div>
    </div>
  );
}
