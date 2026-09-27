import React, { useEffect, useState } from 'react';
import { X, Printer, Download, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { savePhotoToStore } from '../utils/photoStorage';

export default function ResultModal({
  isOpen,
  onClose,
  finalImage,
  onNewSession
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [photoId, setPhotoId] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate QR Code with fast local URL & save to IndexedDB
  useEffect(() => {
    if (isOpen && finalImage) {
      // Fire celebration confetti
      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.6 }
      });

      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      setPhotoId(id);

      // Save to IndexedDB asynchronously
      savePhotoToStore(id, finalImage);

      // Construct short URL for QR Code (Accessible by phones on same network)
      const port = window.location.port ? `:${window.location.port}` : '';
      const downloadUrl = `${window.location.protocol}//${window.location.hostname}${port}/photo/${id}`;

      // Generate lightweight QR Code instantly (< 5ms)
      QRCode.toDataURL(downloadUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.error('QR code generation error:', err);
      });
    }
  }, [isOpen, finalImage]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!finalImage) return;
    const link = document.createElement('a');
    link.download = `photobooth-${photoId || Date.now()}.png`;
    link.href = finalImage;
    link.click();
  };

  return (
    <>
      {/* Printable container for window.print() */}
      <div id="printable-photo-strip">
        {finalImage && <img src={finalImage} alt="Foto Hasil Cetak" />}
      </div>

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
        aria-labelledby="result-title"
      >
        <div className="studio-card" style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 id="result-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Foto Siap Dicetak dan Disimpan
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0' }}>
                  Silakan cetak langsung ke printer atau scan QR code dengan kamera ponsel.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ width: '36px', height: '36px', padding: 0 }}
              aria-label="Tutup jendela"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'center' }}>
            {/* Left Preview */}
            <div style={{
              background: '#f8fafc',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)'
            }}>
              {finalImage && (
                <img
                  src={finalImage}
                  alt="Hasil Foto Akhir"
                  style={{
                    maxHeight: '400px',
                    maxWidth: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* QR Code */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {qrDataUrl ? (
                  <div style={{
                    background: '#ffffff',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <img src={qrDataUrl} alt="QR Code Unduh Foto" style={{ width: '100px', height: '100px' }} />
                  </div>
                ) : (
                  <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw className="animate-spin" size={20} />
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
                    <QrCode size={16} /> Scan dengan Kamera Ponsel
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>
                    Buka kamera di HP Anda dan arahkan ke QR code ini untuk membuka halaman unduh foto digital.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handlePrint}
                  className="btn btn-dark"
                  style={{
                    fontSize: '1rem',
                    padding: '14px',
                    backgroundColor: '#16a34a'
                  }}
                >
                  <Printer size={18} />
                  <span>Cetak ke Printer</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="btn btn-outline"
                  style={{ padding: '12px' }}
                >
                  <Download size={18} />
                  <span>Unduh File Gambar (PNG)</span>
                </button>
              </div>

              {/* Reset */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  onClick={() => {
                    onClose();
                    onNewSession();
                  }}
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                >
                  <RefreshCw size={16} />
                  <span>Selesai dan Mulai Sesi Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
