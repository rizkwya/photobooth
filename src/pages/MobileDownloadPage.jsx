import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Camera, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPhotoFromStore } from '../utils/photoStorage';

export default function MobileDownloadPage() {
  const { id } = useParams();
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPhoto = async () => {
      setLoading(true);
      try {
        const data = await getPhotoFromStore(id);
        if (mounted) {
          if (data) {
            setPhotoData(data);
            // Trigger celebratory confetti burst on mobile
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.5 },
              colors: ['#2271b1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            });
          } else {
            setError(true);
          }
        }
      } catch (e) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) {
      loadPhoto();
    }
    return () => { mounted = false; };
  }, [id]);

  const handleDownload = async () => {
    if (!photoData || downloading) return;
    setDownloading(true);

    try {
      let blob;
      if (photoData.startsWith('data:')) {
        const parts = photoData.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ia], { type: mime });
      } else {
        const res = await fetch(photoData);
        blob = await res.blob();
      }

      const fileName = `photobooth-${id || 'smaven'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 1. Native Web Share API (Save directly to iOS Camera Roll / Android Photos)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Hasil Foto MULTIMEDIA SMAVEN',
            text: 'Simpan foto strip ke galeri HP'
          });
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
          setDownloading(false);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setDownloading(false);
            return;
          }
          console.warn('Web share cancelled or unsupported, fallback to direct download');
        }
      }

      // 2. Direct Blob Download (Forces browser download directly into files/gallery)
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback
      window.open(photoData, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-main)'
    }}>
      {/* Mobile Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: '#1d2327' }}>
          MULTIMEDIA SMAVEN
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Unduh hasil foto strip ke galeri ponsel Anda
        </p>
      </div>

      {/* Main Container */}
      <div className="studio-card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        borderRadius: '8px'
      }}>
        {loading ? (
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--accent-action)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Memuat foto...</span>
          </div>
        ) : error || !photoData ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 10px' }} />
            <h2 style={{ fontSize: '1.1rem', color: '#dc2626', marginBottom: '6px' }}>
              Foto Tidak Ditemukan
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Foto mungkin sudah terhapus atau sesi telah berakhir.
            </p>
          </div>
        ) : (
          <>
            {/* Photo Preview */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <img
                src={photoData}
                alt="Hasil Foto Photobooth"
                style={{
                  maxHeight: '60vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>

            {/* Success feedback */}
            {savedSuccess && (
              <div style={{
                width: '100%',
                padding: '8px 12px',
                background: '#edfaef',
                border: '1px solid #68de7c',
                borderRadius: '4px',
                color: '#00a32a',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '10px'
              }}>
                <CheckCircle2 size={16} />
                <span>Foto berhasil disimpan ke perangkat!</span>
              </div>
            )}

            {/* Action Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-dark"
              style={{ width: '100%', fontSize: '1rem', padding: '14px', gap: '8px' }}
            >
              {downloading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Sedang Mengunduh...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Simpan / Unduh Foto ke HP</span>
                </>
              )}
            </button>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
              Tip: Anda juga bisa tekan dan tahan foto di atas untuk memilih <strong>&quot;Simpan Gambar&quot;</strong>.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
