// Canvas Renderer for High-Resolution Photo Strip & Grid Generation

/**
 * Loads an image from a dataUrl or URL safely into an HTMLImageElement
 */
export const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.warn('Failed to load image:', src, err);
      resolve(null);
    };
    img.src = src;
  });
};

/**
 * Helper to draw a rounded rectangle
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper to draw an image centered and cropped inside a target rectangle (cover mode)
 */
function drawImageCover(ctx, img, targetX, targetY, targetW, targetH, radius = 0, filterCss = 'none') {
  ctx.save();

  if (radius > 0) {
    drawRoundedRect(ctx, targetX, targetY, targetW, targetH, radius);
    ctx.clip();
  }

  // Calculate crop dimensions to maintain aspect ratio
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  let sWidth, sHeight, sx, sy;

  if (imgRatio > targetRatio) {
    sHeight = img.height;
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  if (filterCss && filterCss !== 'none') {
    ctx.filter = filterCss;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
  ctx.restore();
}

/**
 * Detects transparent photo cutouts (alpha < 40) in a frame overlay image.
 * Returns array of bounding boxes [{ x, y, width, height }] in full canvas scale,
 * sorted logically from top-to-bottom or top-left to bottom-right.
 */
export function detectTransparentSlots(overlayImg, targetWidth, targetHeight, expectedCount = 3) {
  try {
    const sampleW = 240;
    const sampleH = Math.max(100, Math.round((targetHeight / targetWidth) * sampleW));

    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(overlayImg, 0, 0, sampleW, sampleH);

    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH).data;
    const visited = new Uint8Array(sampleW * sampleH);
    const minPixelCount = (sampleW * sampleH) * 0.02; // At least 2% of canvas area

    const boxes = [];

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = y * sampleW + x;
        if (visited[idx]) continue;

        const alpha = imgData[idx * 4 + 3];
        // Transparent cutout threshold (alpha < 45)
        if (alpha < 45) {
          let minX = x, maxX = x, minY = y, maxY = y;
          let count = 0;
          const queue = [x, y];
          visited[idx] = 1;

          let qHead = 0;
          while (qHead < queue.length) {
            const cx = queue[qHead++];
            const cy = queue[qHead++];
            count++;

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1]
            ];

            for (let i = 0; i < 4; i++) {
              const nx = neighbors[i][0];
              const ny = neighbors[i][1];
              if (nx >= 0 && nx < sampleW && ny >= 0 && ny < sampleH) {
                const nIdx = ny * sampleW + nx;
                if (!visited[nIdx]) {
                  visited[nIdx] = 1;
                  if (imgData[nIdx * 4 + 3] < 45) {
                    queue.push(nx, ny);
                  }
                }
              }
            }
          }

          const boxW = maxX - minX + 1;
          const boxH = maxY - minY + 1;

          if (count >= minPixelCount && boxW >= sampleW * 0.2 && boxH >= sampleH * 0.08) {
            const scaleX = targetWidth / sampleW;
            const scaleY = targetHeight / sampleH;
            boxes.push({
              x: Math.round(minX * scaleX),
              y: Math.round(minY * scaleY),
              width: Math.round(boxW * scaleX),
              height: Math.round(boxH * scaleY),
              area: count
            });
          }
        } else {
          visited[idx] = 1;
        }
      }
    }

    if (boxes.length > 0) {
      boxes.sort((a, b) => {
        if (Math.abs(a.y - b.y) > targetHeight * 0.06) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });
      return boxes;
    }
  } catch (err) {
    console.warn('Auto-detect transparent slots error:', err);
  }
  return null;
}

/**
 * Main render function
 */
export async function renderPhotoStrip({
  photos = [],          // Array of base64 photo strings
  layout = { id: 'strip-3', photoCount: 3 }, // 'strip-3' | 'strip-4' | 'grid-4'
  theme = {},           // Theme config object (colors, texts, custom logo, frameOverlay)
  filterCss = 'none',   // CSS filter string
  stickers = [],        // Array of { id, char, x, y, size } (normalized 0-1 coords)
  customTitle,
  customSubtitle,
  showDate = true
}) {
  const safeTheme = theme || {};
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const isGrid = layout?.id === 'grid-4';
  const photoCount = layout?.photoCount || 3;

  // Pre-load all photo images & assets first to get natural dimensions
  const loadedPhotos = await Promise.all((photos || []).map(p => loadImage(p)));
  const loadedLogo = safeTheme.logoUrl ? await loadImage(safeTheme.logoUrl) : null;
  const loadedOverlay = safeTheme.frameOverlay ? await loadImage(safeTheme.frameOverlay) : null;

  // Set high resolution canvas dimensions (automatic template aspect ratio if custom)
  if (loadedOverlay && loadedOverlay.naturalWidth && loadedOverlay.naturalHeight) {
    const oW = loadedOverlay.naturalWidth;
    const oH = loadedOverlay.naturalHeight;
    const baseWidth = isGrid ? 2400 : 1200;
    const scale = baseWidth / oW;
    canvas.width = Math.round(oW * scale);
    canvas.height = Math.round(oH * scale);
  } else if (isGrid) {
    canvas.width = 2400;
    canvas.height = 1800;
  } else if (photoCount === 4) {
    canvas.width = 1200;
    canvas.height = 4200;
  } else {
    canvas.width = 1200;
    canvas.height = 3600;
  }

  const { width, height } = canvas;

  // 1. Draw Background
  ctx.fillStyle = safeTheme.bgColor || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Decorative border/card outline for presets
  if (safeTheme.borderColor && !safeTheme.isCustom) {
    ctx.strokeStyle = safeTheme.borderColor;
    ctx.lineWidth = 12;
    if (safeTheme.borderStyle === 'dashed') {
      ctx.setLineDash([30, 20]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeRect(20, 20, width - 40, height - 40);
    ctx.setLineDash([]);
  }

  // 2. Check if custom template has automatic transparent cutouts
  let autoSlots = null;
  if (loadedOverlay) {
    autoSlots = detectTransparentSlots(loadedOverlay, width, height, photoCount);
  }

  // If automatic transparent slots are detected in the uploaded frame, place photos directly inside them
  if (autoSlots && autoSlots.length >= 1) {
    // Draw photos in detected cutout areas (with a small 4px bleed behind the frame border)
    for (let i = 0; i < photoCount; i++) {
      const slot = autoSlots[i] || autoSlots[autoSlots.length - 1];
      const img = loadedPhotos[i];
      if (img && slot) {
        const bleed = 4;
        const targetX = Math.max(0, slot.x - bleed);
        const targetY = Math.max(0, slot.y - bleed);
        const targetW = slot.width + (bleed * 2);
        const targetH = slot.height + (bleed * 2);
        drawImageCover(ctx, img, targetX, targetY, targetW, targetH, 4, filterCss);
      }
    }
  } else if (isGrid) {
    // 2x2 Grid Layout (Fallback if no transparent cutouts)
    const paddingX = Math.round(width * 0.04);
    const paddingTop = Math.round(height * 0.06);
    const gap = Math.round(width * 0.025);
    const availableW = width - (paddingX * 2) - gap;
    const slotW = availableW / 2;
    const slotH = slotW * 0.75;
    const radius = 24;

    const slots = [
      { x: paddingX, y: paddingTop },
      { x: paddingX + slotW + gap, y: paddingTop },
      { x: paddingX, y: paddingTop + slotH + gap },
      { x: paddingX + slotW + gap, y: paddingTop + slotH + gap }
    ];

    slots.forEach((slot, idx) => {
      ctx.fillStyle = '#1e293b';
      drawRoundedRect(ctx, slot.x, slot.y, slotW, slotH, radius);
      ctx.fill();

      const img = loadedPhotos[idx];
      if (img) {
        drawImageCover(ctx, img, slot.x, slot.y, slotW, slotH, radius, filterCss);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, slot.x, slot.y, slotW, slotH, radius);
      ctx.stroke();
    });

    if (!safeTheme.isCustom) {
      const footerY = paddingTop + (slotH * 2) + gap + 40;
      const footerH = height - footerY - 40;

      if (loadedLogo) {
        const logoMaxH = Math.min(100, footerH);
        const logoAspect = loadedLogo.width / loadedLogo.height;
        const logoW = logoMaxH * logoAspect;
        ctx.drawImage(loadedLogo, paddingX, footerY + (footerH - logoMaxH) / 2, logoW, logoMaxH);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = safeTheme.accentColor || safeTheme.textColor || '#000000';
      ctx.font = 'bold 52px "Outfit", sans-serif';
      ctx.fillText(customTitle || safeTheme.badgeText || 'PHOTOBOOTH MEMORIES', width / 2, footerY + 50);

      ctx.fillStyle = safeTheme.textColor || '#64748b';
      ctx.font = '500 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(customSubtitle || safeTheme.subText || 'School Edition', width / 2, footerY + 105);

      if (showDate) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        ctx.font = '600 24px monospace';
        ctx.fillStyle = safeTheme.accentColor || '#f59e0b';
        ctx.fillText(`• ${dateStr} •`, width / 2, footerY + 150);
      }
    }

  } else {
    // Vertical Strip Layout (3 or 4 photos)
    const paddingX = Math.round(width * 0.065);
    const paddingTop = Math.round(height * 0.025);
    const footerH = safeTheme.isCustom ? Math.round(height * 0.02) : Math.round(height * 0.12);
    const availableH = height - paddingTop - footerH;
    const gap = Math.round(height * 0.012);
    const totalGaps = (photoCount - 1) * gap;
    const slotH = (availableH - totalGaps) / photoCount;
    const slotW = width - (paddingX * 2);
    const radius = 16;

    for (let i = 0; i < photoCount; i++) {
      const slotY = paddingTop + i * (slotH + gap);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#0f172a';
      drawRoundedRect(ctx, paddingX, slotY, slotW, slotH, radius);
      ctx.fill();
      ctx.restore();

      const img = loadedPhotos[i];
      if (img) {
        drawImageCover(ctx, img, paddingX, slotY, slotW, slotH, radius, filterCss);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, paddingX, slotY, slotW, slotH, radius);
      ctx.stroke();
    }

    if (!safeTheme.isCustom) {
      const footerStartY = height - footerH + 40;

      if (loadedLogo) {
        const logoMaxH = 100;
        const logoAspect = loadedLogo.width / loadedLogo.height;
        const logoW = logoMaxH * logoAspect;
        ctx.drawImage(loadedLogo, (width - logoW) / 2, footerStartY, logoW, logoMaxH);
      }

      const textStartY = loadedLogo ? footerStartY + 130 : footerStartY + 60;

      ctx.textAlign = 'center';
      ctx.fillStyle = safeTheme.accentColor || safeTheme.textColor || '#eab308';
      ctx.font = 'bold 54px "Outfit", sans-serif';
      ctx.fillText(customTitle || safeTheme.badgeText || 'PHOTOBOOTH', width / 2, textStartY);

      ctx.fillStyle = safeTheme.textColor || '#ffffff';
      ctx.font = '500 34px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(customSubtitle || safeTheme.subText || 'Class of 2026', width / 2, textStartY + 60);

      if (showDate) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        ctx.font = '600 26px monospace';
        ctx.fillStyle = safeTheme.accentColor || '#f59e0b';
        ctx.fillText(`${dateStr} • ${timeStr}`, width / 2, textStartY + 115);
      }

      ctx.font = '32px sans-serif';
      ctx.fillText('✦  ✦  ✦', width / 2, textStartY + 165);
    }
  }

  // 3. Draw Frame Overlay ON TOP (so frame borders/graphics overlay the photos cleanly)
  if (loadedOverlay) {
    ctx.drawImage(loadedOverlay, 0, 0, width, height);
  }

  // 5. Draw Stickers placed by user
  if (stickers && stickers.length > 0) {
    stickers.forEach((sticker) => {
      const stX = sticker.x * width;
      const stY = sticker.y * height;
      const stSize = (sticker.size || 0.08) * width;

      ctx.save();
      ctx.font = `${stSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.char, stX, stY);
      ctx.restore();
    });
  }

  // Convert to high resolution Data URL and Blob
  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png', 0.95));

  return {
    dataUrl,
    blob,
    width,
    height
  };
}
