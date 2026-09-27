import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
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

  // Step State: 1 = Kamera Live Full Screen, 2 = Hasil & QR Code
  const [currentStep, setCurrentStep] = useState(1);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isFlashing, setIsFlashing] = useState(false);

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
    setCurrentStep(2);
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
              MULTIMEDIA SMAVEN
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
          STEP 1: FULL SCREEN LIVE CAMERA
          ========================================================================= */}
      {currentStep === 1 && (
        <CameraView
          selectedLayout={selectedLayout}
          onCompleteCapture={handleCompleteCapture}
          triggerFlash={triggerFlash}
        />
      )}

      {/* =========================================================================
          STEP 2: HASIL FOTO & QR CODE
          ========================================================================= */}
      {currentStep === 2 && (
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
