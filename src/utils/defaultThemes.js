// Default Layouts, Filters & Sticker Presets for School Photobooth

export const PHOTO_LAYOUTS = [
  {
    id: 'strip-3',
    name: '3-Photo Strip',
    description: 'Strip vertikal 3 foto',
    photoCount: 3,
    aspectRatio: '1:3',
    width: 1200,
    height: 3600
  },
  {
    id: 'strip-4',
    name: '4-Photo Strip',
    description: 'Strip vertikal 4 foto',
    photoCount: 4,
    aspectRatio: '1:3.6',
    width: 1200,
    height: 4200
  },
  {
    id: 'grid-4',
    name: '2x2 Grid Card',
    description: 'Kartu foto 4 kotak grid 2x2',
    photoCount: 4,
    aspectRatio: '4:3',
    width: 2400,
    height: 1800
  }
];

export const PHOTO_FILTERS = [
  { id: 'normal', name: 'Original', css: 'none', desc: 'Warna asli natural' },
  { id: 'vintage', name: 'Warm Retro', css: 'sepia(0.25) contrast(1.1) brightness(1.05) saturate(1.2)', desc: 'Nuansa hangat nostalgic' },
  { id: 'bw', name: 'B&W Classic', css: 'grayscale(1) contrast(1.25) brightness(1.05)', desc: 'Hitam putih berkelas' },
  { id: 'pastel', name: 'Pastel Glow', css: 'brightness(1.08) saturate(1.15) contrast(0.95)', desc: 'Cerah lembut ala Korea' },
  { id: 'cyber', name: 'Vibrant Pop', css: 'saturate(1.5) contrast(1.15) brightness(1.02)', desc: 'Warna tajam dan mencolok' },
  { id: 'noir', name: 'Moody Film', css: 'contrast(1.3) brightness(0.9) grayscale(0.4) sepia(0.1)', desc: 'Cinematic film vibe' }
];

export const STICKER_PACKS = [
  { id: 'grad_cap', name: '🎓 Toga', char: '🎓' },
  { id: 'sparkles', name: '✨ Sparkle', char: '✨' },
  { id: 'party', name: '🎉 Party', char: '🎉' },
  { id: 'heart', name: '💖 Love', char: '💖' },
  { id: 'sunglasses', name: '😎 Cool', char: '😎' },
  { id: 'fire', name: '🔥 Hype', char: '🔥' },
  { id: 'camera', name: '📸 Snap', char: '📸' },
  { id: 'trophy', name: '🏆 Champion', char: '🏆' },
  { id: 'peace', name: '✌️ Peace', char: '✌️' },
  { id: 'star', name: '⭐ Star', char: '⭐' },
  { id: 'ribbon', name: '🎗️ School', char: '🎗️' },
  { id: 'crown', name: '👑 Royal', char: '👑' }
];

// No preset themes; all frames are 100% custom uploaded by Admin
export const DEFAULT_THEMES = [];
