import React from 'react';
import { Camera, Maximize2, Minimize2, Settings, RefreshCw } from 'lucide-react';

export default function Navbar({
  isFullscreen,
  toggleFullscreen,
  onOpenAdmin,
  onResetSession,
  currentStep
}) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Studio Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-action)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Camera size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Multimedia SMAVEN x IT Club SMAVEN
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Photobooth Studio
          </p>
        </div>
      </div>

      {/* Navigation Controls */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }} aria-label="Menu Utama">
        {currentStep === 'edit' && (
          <button
            onClick={onResetSession}
            className="btn btn-outline"
            title="Mulai sesi foto baru"
            aria-label="Mulai sesi foto baru"
          >
            <RefreshCw size={16} />
            <span>Foto Baru</span>
          </button>
        )}

        <button
          onClick={onOpenAdmin}
          className="btn btn-outline"
          title="Pengaturan tema dan bingkai kustom"
          aria-label="Pengaturan tema dan bingkai kustom"
        >
          <Settings size={16} />
          <span>Atur Tema & Frame</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="btn btn-outline"
          title={isFullscreen ? 'Keluar dari layar penuh' : 'Tampilkan layar penuh'}
          aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Tampilkan layar penuh'}
          style={{ width: '44px', padding: 0 }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </nav>
    </header>
  );
}
