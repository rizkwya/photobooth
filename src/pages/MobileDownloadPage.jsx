import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CheckCircle2, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPhotoFromStore } from '../utils/photoStorage';

export default function MobileDownloadPage() {
  const { id } = useParams();
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const handleDownload = () => {
    if (!photoData) return;
    const link = document.createElement('a');
    link.download = `photobooth-${id}.png`;
    link.href = photoData;
    link.click();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      color: 'var(--text-main)'
    }}>
      {/* Mobile Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-action)',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px'
        }}>
          <Camera size={20} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
          SnapSchool Photobooth
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Unduh hasil foto ke galeri ponsel Anda
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
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)'
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

            {/* Action Download */}
            <button
              onClick={handleDownload}
              className="btn btn-dark"
              style={{ width: '100%', fontSize: '1rem', padding: '14px', gap: '8px' }}
            >
              <Download size={18} />
              <span>Simpan / Unduh Foto ke HP</span>
            </button>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Tip: Anda juga bisa tekan dan tahan gambar di atas untuk memilih "Simpan Gambar".
            </span>
          </>
        )}
      </div>
    </div>
  );
}
