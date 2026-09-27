import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { renderPhotoStrip } from '../utils/canvasRenderer';
import { savePhotoToStore } from '../utils/photoStorage';

export default function PhotoStripEditor({
  capturedPhotos,
  selectedLayout,
  themes,
  activeThemeId,
  onNewSession
}) {
  const [isRendering, setIsRendering] = useState(true);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [photoId, setPhotoId] = useState('');

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  useEffect(() => {
    let isCancelled = false;

    const generateStripAndQR = async () => {
      setIsRendering(true);
      try {
        const result = await renderPhotoStrip({
          photos: capturedPhotos,
          layout: selectedLayout,
          theme: activeTheme,
          filterCss: 'none',
          stickers: [],
          customTitle: activeTheme.badgeText,
          customSubtitle: activeTheme.subText,
          showDate: true
        });

        if (!isCancelled && result && result.dataUrl) {
          setPreviewDataUrl(result.dataUrl);

          // Generate unique ID & automatically save to database/storage
          const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          setPhotoId(id);
          await savePhotoToStore(id, result.dataUrl);

          // Generate QR Code URL for mobile download
          const port = window.location.port ? `:${window.location.port}` : '';
          const downloadUrl = `${window.location.protocol}//${window.location.hostname}${port}/photo/${id}`;

          const qrUrl = await QRCode.toDataURL(downloadUrl, {
            width: 240,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });

          if (!isCancelled) {
            setQrDataUrl(qrUrl);
            
            // Celebratory side confetti cannons (left & right edges only)
            confetti({
              particleCount: 60,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.75 },
              colors: ['#2271b1', '#38bdf8', '#fbbf24', '#34d399', '#f43f5e']
            });
            confetti({
              particleCount: 60,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.75 },
              colors: ['#2271b1', '#38bdf8', '#fbbf24', '#34d399', '#f43f5e']
            });

            setTimeout(() => {
              confetti({
                particleCount: 40,
                angle: 60,
                spread: 60,
                origin: { x: 0, y: 0.7 },
                colors: ['#2271b1', '#fbbf24', '#10b981']
              });
              confetti({
                particleCount: 40,
                angle: 120,
                spread: 60,
                origin: { x: 1, y: 0.7 },
                colors: ['#2271b1', '#fbbf24', '#10b981']
              });
            }, 300);
          }
        }
      } catch (err) {
        console.error('Render / QR error:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    generateStripAndQR();

    return () => {
      isCancelled = true;
    };
  }, [capturedPhotos, selectedLayout, activeTheme]);

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '32px',
      alignItems: 'center'
    }}>
      {/* Left: Strip Render Preview */}
      <div className="studio-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        minHeight: '620px',
        position: 'relative'
      }}>
        {isRendering && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <RefreshCw className="animate-spin" size={26} color="var(--accent-action)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Memproses dan menyimpan foto ke database...</span>
            </div>
          </div>
        )}

        {previewDataUrl ? (
          <div style={{
            maxHeight: '74vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)'
          }}>
            <img
              src={previewDataUrl}
              alt="Hasil Foto Photobooth"
              style={{
                maxHeight: '74vh',
                maxWidth: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>Memuat pratinjau foto...</div>
        )}
      </div>

      {/* Right: QR Code & Action Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* QR Code Container */}
        <div className="studio-card" style={{
          padding: '32px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff',
          border: '2px solid var(--border-medium)'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            marginBottom: '16px',
            width: '190px',
            height: '190px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Unduh Foto" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <RefreshCw className="animate-spin" size={24} color="var(--text-muted)" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '6px' }}>
            <QrCode size={20} />
            <span>QR Code</span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
            Arahkan kamera HP ke QR code di atas untuk langsung mengunduh hasil foto ke galeri ponsel Anda.
          </p>
        </div>

        {/* Action Button: Selesai & Sesi Baru Only */}
        <button
          onClick={onNewSession}
          className="btn btn-dark"
          style={{
            fontSize: '1.05rem',
            padding: '16px',
            gap: '10px',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span>Selesai & Sesi Baru</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
