import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { playCountdownBeep, playFinalBeep, playShutterSound, playSuccessSound } from '../utils/soundEffects';

export default function CameraView({
  selectedLayout,
  onCompleteCapture,
  triggerFlash
}) {
  const videoRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const isMirrored = true;
  const [cameraError, setCameraError] = useState(null);
  const [streamReady, setStreamReady] = useState(false);

  // Capture State
  const [isShooting, setIsShooting] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  // 1. Enumerate Video Input Devices & Prefer External/Sony Cam if available
  useEffect(() => {
    let mounted = true;
    const getDevices = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        initialStream.getTracks().forEach(track => track.stop());

        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter(d => d.kind === 'videoinput');
        if (mounted) {
          setDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedDeviceId) {
            const externalCam = videoDevs.find(d => 
              d.label.toLowerCase().includes('sony') || 
              d.label.toLowerCase().includes('zv-e10') || 
              d.label.toLowerCase().includes('usb') || 
              d.label.toLowerCase().includes('capture')
            );
            setSelectedDeviceId(externalCam ? externalCam.deviceId : videoDevs[0].deviceId);
          }
        }
      } catch (err) {
        if (mounted) {
          setCameraError('Izin akses kamera belum diberikan. Silakan izinkan akses kamera pada browser Anda.');
        }
      }
    };

    getDevices();
    return () => { mounted = false; };
  }, []);

  // 2. Start Video Stream
  useEffect(() => {
    let activeStream = null;

    const startStream = async () => {
      setCameraError(null);
      setStreamReady(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Peramban ini tidak mendukung akses kamera.');
        return;
      }

      const constraints = {
        video: selectedDeviceId ? {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } : {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => setStreamReady(true));
          };
        }
      } catch (err) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          activeStream = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().then(() => setStreamReady(true));
          }
        } catch (fbErr) {
          setCameraError('Tidak dapat membuka kamera: ' + fbErr.message);
        }
      }
    };

    startStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [selectedDeviceId]);

  // 3. Capture Single Frame
  const captureFrame = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;

    // Determine the exact visible crop matching what the user sees on screen (object-fit: cover)
    const screenRatio = window.innerWidth / window.innerHeight;
    const videoRatio = vWidth / vHeight;

    let sWidth = vWidth;
    let sHeight = vHeight;
    let sx = 0;
    let sy = 0;

    if (videoRatio > screenRatio) {
      // Video is wider than screen: crop sides to match exact screen view
      sWidth = vHeight * screenRatio;
      sx = (vWidth - sWidth) / 2;
    } else {
      // Video is taller than screen: crop top/bottom to match exact screen view
      sHeight = vWidth / screenRatio;
      sy = (vHeight - sHeight) / 2;
    }

    canvas.width = Math.round(sWidth);
    canvas.height = Math.round(sHeight);
    const ctx = canvas.getContext('2d');

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // 4. Start Multi-Shot Routine
  const startPhotoSession = async () => {
    if (isShooting || !streamReady) return;

    setIsShooting(true);
    setCapturedPhotos([]);
    setCurrentShotIndex(0);

    const totalShots = selectedLayout.photoCount;
    const tempPhotos = [];

    for (let shot = 1; shot <= totalShots; shot++) {
      setCurrentShotIndex(shot);

      for (let count = 3; count >= 1; count--) {
        setCountdown(count);
        if (count === 1) {
          playFinalBeep();
        } else {
          playCountdownBeep();
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      setCountdown(null);
      playShutterSound();
      triggerFlash();

      const photoData = captureFrame();
      if (photoData) {
        tempPhotos.push(photoData);
        setCapturedPhotos([...tempPhotos]);
      }

      if (shot < totalShots) {
        await new Promise(r => setTimeout(r, 1800));
      }
    }

    playSuccessSound();
    await new Promise(r => setTimeout(r, 600));
    setIsShooting(false);
    onCompleteCapture(tempPhotos);
  };

  // Keyboard Shortcuts (Space to snap)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isShooting) return;
      if (e.code === 'Space' && streamReady && !cameraError) {
        e.preventDefault();
        startPhotoSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShooting, streamReady, cameraError]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: '#090d16',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10
    }}>
      {cameraError ? (
        <div style={{
          textAlign: 'center',
          padding: '36px',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          margin: '20px',
          zIndex: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#dc2626', fontWeight: 800 }}>
            Kamera Tidak Tersedia
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            {cameraError}
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-dark">
            <RefreshCw size={16} /> Muat Ulang Halaman
          </button>
        </div>
      ) : (
        <>
          {/* Full Screen Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)'
            }}
          />

          {/* Safe Zone Framing Guide (Area Aman Terluar) */}
          <div style={{
            position: 'absolute',
            inset: '3vh 6vw',
            border: '1.5px dashed rgba(255, 255, 255, 0.22)',
            borderRadius: '18px',
            pointerEvents: 'none',
            zIndex: 15,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.12)'
          }}>
            {/* Elegant Corner Framing Accents */}
            <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '26px', height: '26px', borderTop: '3px solid rgba(255, 255, 255, 0.75)', borderLeft: '3px solid rgba(255, 255, 255, 0.75)', borderTopLeftRadius: '18px' }} />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '26px', height: '26px', borderTop: '3px solid rgba(255, 255, 255, 0.75)', borderRight: '3px solid rgba(255, 255, 255, 0.75)', borderTopRightRadius: '18px' }} />
            <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '26px', height: '26px', borderBottom: '3px solid rgba(255, 255, 255, 0.75)', borderLeft: '3px solid rgba(255, 255, 255, 0.75)', borderBottomLeftRadius: '18px' }} />
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '26px', height: '26px', borderBottom: '3px solid rgba(255, 255, 255, 0.75)', borderRight: '3px solid rgba(255, 255, 255, 0.75)', borderBottomRightRadius: '18px' }} />
          </div>

          {/* Active Countdown Overlay (Full Screen Centered) */}
          {isShooting && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 40
            }}>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#ffffff',
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '8px 24px',
                borderRadius: '999px',
                marginBottom: '20px',
                letterSpacing: '0.5px'
              }}>
                Pose {currentShotIndex} dari {selectedLayout.photoCount}
              </div>

              {countdown !== null && (
                <div className="countdown-display" key={countdown} style={{ fontSize: '9.5rem', fontWeight: 900 }}>
                  {countdown}
                </div>
              )}

              <p style={{
                color: '#ffffff',
                fontSize: '1.35rem',
                fontWeight: 700,
                marginTop: '20px',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)'
              }}>
                {countdown ? 'Tersenyumlah ke kamera!' : 'Mengambil gambar...'}
              </p>
            </div>
          )}

          {/* Floating Bottom Controls (Shutter Button & Progress Thumbnails) */}
          <div style={{
            position: 'absolute',
            bottom: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            zIndex: 30
          }}>
            {/* Captured Pose Thumbnails Preview */}
            {capturedPhotos.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.65)',
                padding: '8px 14px',
                borderRadius: '12px',
                backdropFilter: 'blur(8px)'
              }}>
                {Array.from({ length: selectedLayout.photoCount }).map((_, idx) => {
                  const photo = capturedPhotos[idx];
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '65px',
                        height: '48px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        border: photo ? '2px solid #22c55e' : '1px dashed rgba(255, 255, 255, 0.4)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={`Pose ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Shutter Action Button & Spacebar Hint */}
            {!isShooting && (
              <>
                <button
                  onClick={startPhotoSession}
                  disabled={!streamReady || !!cameraError}
                  className="btn"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    padding: '18px 56px',
                    borderRadius: '999px',
                    backgroundColor: '#ffffff',
                    color: '#090d16',
                    border: 'none',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: streamReady && !cameraError ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    opacity: streamReady && !cameraError ? 1 : 0.6
                  }}
                >
                  <Camera size={24} color="#090d16" />
                  <span>Ambil Foto ({selectedLayout.photoCount} Pose)</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
