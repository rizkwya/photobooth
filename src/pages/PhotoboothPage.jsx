import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Check, Palette, Camera, ArrowRight, Sparkles } from 'lucide-react';
import CameraView from '../components/CameraView';
import PhotoStripEditor from '../components/PhotoStripEditor';
import { PHOTO_LAYOUTS } from '../utils/defaultThemes';

export default function PhotoboothPage({
  themes,
  activeThemeId,
  setActiveThemeId,
  selectedLayout = PHOTO_LAYOUTS[0]
}) {
  // Device Authorization / Password State
  const [isCameraUnlocked, setIsCameraUnlocked] = useState(() => {
    return localStorage.getItem('photobooth_camera_auth') === 'true' || sessionStorage.getItem('photobooth_camera_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Step State: 1 = Pilih Bingkai / Template, 2 = Kamera Live, 3 = Hasil & QR Code
  const [currentStep, setCurrentStep] = useState(1);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isFlashing, setIsFlashing] = useState(false);

  // Auto select first theme if active theme is empty
  useEffect(() => {
    if (!activeThemeId && themes && themes.length > 0) {
      setActiveThemeId(themes[0].id);
    }
  }, [activeThemeId, themes, setActiveThemeId]);

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  const expectedCameraPass = import.meta.env.VITE_CAMERA_PASS || '1234';
  const expectedAdminPass = import.meta.env.VITE_ADMIN_PASS || 'admin123';

  const handleUnlockCamera = (e) => {
    e.preventDefault();
    setAuthError('');

    if (passwordInput === expectedCameraPass || passwordInput === expectedAdminPass) {
      if (rememberDevice) {
        localStorage.setItem('photobooth_camera_auth', 'true');
      } else {
        sessionStorage.setItem('photobooth_camera_auth', 'true');
      }
      setIsCameraUnlocked(true);
      setPasswordInput('');
    } else {
      setAuthError('Kata sandi otorisasi perangkat salah.');
    }
  };

  const handleLockCamera = () => {
    localStorage.removeItem('photobooth_camera_auth');
    sessionStorage.removeItem('photobooth_camera_auth');
    setIsCameraUnlocked(false);
    setCurrentStep(1);
    setCapturedPhotos([]);
  };

  const triggerFlash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 350);
  };

  const handleCompleteCapture = (photos) => {
    setCapturedPhotos(photos);
    setCurrentStep(3);
  };

  const handleResetToStart = () => {
    setCapturedPhotos([]);
    setCurrentStep(1);
  };

  // =========================================================================
  // VIEW: CAMERA DEVICE AUTHORIZATION / PASSWORD GATE
  // =========================================================================
  if (!isCameraUnlocked) {
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1d2327', letterSpacing: '0.04em' }}>
              Multimedia SMAVEN x IT Club SMAVEN
            </h1>
          </div>

          {/* Form Box */}
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

            <form onSubmit={handleUnlockCamera} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="cam-pass" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#1d2327' }}>
                  Kata Sandi Bilik Kamera
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="cam-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="wp-input"
                    style={{ width: '100%', height: '38px', paddingRight: '36px', fontSize: '13px' }}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    required
                    autoFocus
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  id="remember-device"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="remember-device" style={{ fontSize: '12px', color: '#3c434a', cursor: 'pointer' }}>
                  Ingat
                </label>
              </div>

              <button
                type="submit"
                className="wp-button-primary"
                style={{ width: '100%', minHeight: '38px', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}
              >
                <Lock size={14} />
                <span>Buka Bilik Kamera</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: LIVE UNLOCKED CAMERA & PHOTOBOOTH SESSION
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', position: 'relative' }}>
      {/* Shutter Screen Flash */}
      {isFlashing && <div className="screen-flash" style={{ zIndex: 9999 }} />}

      {/* Floating Discreet Lock Button */}
      <button
        onClick={handleLockCamera}
        title="Kunci kembali bilik kamera"
        aria-label="Kunci kembali bilik kamera"
        style={{
          position: 'fixed',
          bottom: '14px',
          right: '14px',
          zIndex: 9000,
          background: 'rgba(29, 35, 39, 0.75)',
          color: '#c3c4c7',
          border: '1px solid #3c434a',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.background = 'rgba(29, 35, 39, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#c3c4c7';
          e.currentTarget.style.background = 'rgba(29, 35, 39, 0.75)';
        }}
      >
        <Lock size={15} />
      </button>

      {/* =========================================================================
          STEP 1: PILIH BINGKAI / TEMPLATE
          ========================================================================= */}
      {currentStep === 1 && (
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '36px 20px 110px',
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '6px'
            }}>
              Multimedia SMAVEN x IT Club SMAVEN
            </span>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: 900,
              margin: '0 0 8px',
              color: 'var(--text-main)',
              letterSpacing: '-0.02em'
            }}>
              Pilih Bingkai Foto
            </h1>
            <p style={{
              fontSize: '0.92rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '480px'
            }}>
              Pilih template bingkai yang Anda sukai sebelum memulai sesi foto di bilik kamera
            </p>
          </div>

          {/* Template Grid */}
          {themes.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '48px 24px',
              textAlign: 'center',
              maxWidth: '460px',
              width: '100%',
              marginTop: '20px'
            }}>
              <Palette size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
                Belum Ada Bingkai Kustom
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Admin belum menambahkan template bingkai kustom. Anda tetap dapat langsung mengambil foto dengan bingkai standar.
              </p>
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: 700 }}
              >
                <Camera size={18} />
                <span>Lanjut ke Kamera</span>
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 250px))',
              gap: '24px',
              justifyContent: 'center',
              width: '100%',
              marginBottom: '32px'
            }}>
              {themes.map((theme) => {
                const isSelected = activeThemeId === theme.id;
                return (
                  <div
                    key={theme.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveThemeId(theme.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveThemeId(theme.id);
                      }
                    }}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: isSelected ? '2.5px solid #2271b1' : '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isSelected ? 'translateY(-4px)' : 'none',
                      boxShadow: isSelected
                        ? '0 12px 28px rgba(34, 113, 177, 0.22)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      position: 'relative',
                      userSelect: 'none'
                    }}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#00a32a',
                        color: '#ffffff',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2,
                        boxShadow: '0 2px 6px rgba(0, 163, 42, 0.35)'
                      }}>
                        <Check size={12} strokeWidth={3} />
                        <span>DIPILIH</span>
                      </div>
                    )}

                    {/* Frame Preview Container */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '1 / 2.7',
                      maxHeight: '360px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)'
                    }}>
                      {theme.frameOverlay ? (
                        <img
                          src={theme.frameOverlay}
                          alt="Bingkai Foto"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#94a3b8'
                        }}>
                          <Palette size={24} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Bingkai Standar</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Bottom Action Bar */}
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '92vw'
          }}>
            <button
              onClick={() => setCurrentStep(2)}
              className="btn"
              style={{
                backgroundColor: '#ffffff',
                color: '#090d16',
                border: 'none',
                borderRadius: '999px',
                padding: '14px 36px',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Camera size={20} />
              <span>Mulai Foto (3 Pose)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </main>
      )}

      {/* =========================================================================
          STEP 2: FULL SCREEN LIVE CAMERA
          ========================================================================= */}
      {currentStep === 2 && (
        <CameraView
          selectedLayout={selectedLayout}
          onCompleteCapture={handleCompleteCapture}
          triggerFlash={triggerFlash}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {/* =========================================================================
          STEP 3: HASIL FOTO & QR CODE
          ========================================================================= */}
      {currentStep === 3 && (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', width: '100%' }}>
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
                Hasil Foto
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Silakan arahkan kamera HP ke QR Code untuk mengunduh hasil foto.
              </p>
            </div>

            <PhotoStripEditor
              capturedPhotos={capturedPhotos}
              selectedLayout={selectedLayout}
              themes={themes}
              activeThemeId={activeThemeId}
              setActiveThemeId={setActiveThemeId}
              onNewSession={handleResetToStart}
            />
          </div>
        </main>
      )}
    </div>
  );
}
