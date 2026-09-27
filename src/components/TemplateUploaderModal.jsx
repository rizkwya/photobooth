import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Check, Plus, HelpCircle } from 'lucide-react';

export default function TemplateUploaderModal({
  isOpen,
  onClose,
  themes,
  onSaveTheme,
  onDeleteCustomTheme,
  activeThemeId,
  setActiveThemeId
}) {
  const [templateName, setTemplateName] = useState('Desain Template Saya');
  const [frameType, setFrameType] = useState('overlay'); // 'overlay' (di atas foto) | 'background' (di belakang foto)
  const [imagePreview, setImagePreview] = useState(null);
  const [photoCount, setPhotoCount] = useState(3);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setErrorMsg(null);
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (PNG, JPG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      if (!templateName || templateName === 'Desain Template Saya') {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTemplateName(cleanName);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!imagePreview) {
      setErrorMsg('Silakan pilih file gambar template terlebih dahulu.');
      return;
    }

    const newTheme = {
      id: 'custom_template_' + Date.now(),
      name: templateName || 'Template Kustom',
      category: 'custom',
      bgColor: '#ffffff',
      textColor: '#0f172a',
      accentColor: '#0f172a',
      borderColor: 'transparent',
      badgeText: templateName,
      subText: 'Custom Template',
      frameOverlay: imagePreview,
      isCustom: true,
      customPhotoCount: photoCount
    };

    onSaveTheme(newTheme);
    setActiveThemeId(newTheme.id);
    setImagePreview(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
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
      aria-labelledby="template-modal-title"
    >
      <div className="studio-card" style={{
        width: '100%',
        maxWidth: '760px',
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
            <h2 id="template-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} /> Upload Template Photobooth
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Unggah file desain template buatan Anda sendiri (dari Canva, Photoshop, Illustrator, dll).
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ width: '36px', height: '36px', padding: 0 }}
            aria-label="Tutup upload template"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column: Dropzone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              File Template Gambar
            </label>

            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-app)',
                cursor: 'pointer',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={imagePreview}
                    alt="Preview Template"
                    style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                    Klik untuk ganti file gambar
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-medium)'
                  }}>
                    <Upload size={22} color="var(--text-main)" />
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Pilih File Template
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    PNG transparan sangat disarankan
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ukuran ideal: 1200 x 3600 px (Strip 1:3)
                  </span>
                </div>
              )}
            </div>

            {errorMsg && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '6px' }}>
                {errorMsg}
              </p>
            )}
          </div>

          {/* Right Column: Template Info & Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="custom-template-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nama Template
              </label>
              <input
                id="custom-template-name"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Contoh: Template Pensi 2026"
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Template Guide Box */}
            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                <HelpCircle size={15} /> Panduan Membuat Template Sendiri:
              </div>
              <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
                <li>Buka <strong>Canva</strong> atau <strong>Photoshop</strong> dengan ukuran kanvas <strong>1200 x 3600 piksel</strong>.</li>
                <li>Beri lubang kotak transparan di area tempat foto wajah siswa akan tampil.</li>
                <li>Tambahkan logo sekolah, ornamen angkatan, atau judul acara di bagian header/footer.</li>
                <li>Simpan/Download dengan format <strong>PNG (Background Transparan)</strong>.</li>
              </ul>
            </div>

            {/* Saved Templates List */}
            {themes.filter(t => t.isCustom).length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Template yang Sudah Di-upload:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {themes.filter(t => t.isCustom).map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-medium)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span>{t.name}</span>
                      <button
                        onClick={() => onDeleteCustomTheme(t.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                        aria-label={`Hapus ${t.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '24px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px'
        }}>
          <button onClick={onClose} className="btn btn-outline">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!imagePreview}
            className="btn btn-dark"
          >
            <Check size={16} /> Pasang Template Ini
          </button>
        </div>
      </div>
    </div>
  );
}
