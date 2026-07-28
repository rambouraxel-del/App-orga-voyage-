/**
 * Generateur d'icones PWA.
 *
 * Ecrit directement des PNG (encodage natif via zlib) pour eviter d'ajouter
 * une dependance de traitement d'image au projet. Les formes sont dessinees
 * avec un rasteriseur minimal en super-echantillonnage 4x (anticrenelage).
 *
 * Usage : npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public/icons')

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const COLORS = {
  cream: [250, 245, 238],
  beige: [240, 229, 214],
  leather: [107, 74, 52],
  leatherDark: [86, 58, 40],
  taupe: [154, 133, 116],
  brass: [214, 178, 118],
  sky: [176, 205, 209],
}

/* ------------------------------------------------------------------ */
/* Rasteriseur minimal                                                 */
/* ------------------------------------------------------------------ */

const SS = 4 // facteur de super-echantillonnage

function createCanvas(size) {
  const w = size * SS
  const data = new Float32Array(w * w * 4)
  return { w, size, data }
}

function blend(canvas, x, y, color, alpha) {
  if (alpha <= 0) return
  const i = (y * canvas.w + x) * 4
  const [r, g, b] = color
  const a = canvas.data[i + 3]
  const na = alpha + a * (1 - alpha)
  if (na <= 0) return
  canvas.data[i] = (r * alpha + canvas.data[i] * a * (1 - alpha)) / na
  canvas.data[i + 1] = (g * alpha + canvas.data[i + 1] * a * (1 - alpha)) / na
  canvas.data[i + 2] = (b * alpha + canvas.data[i + 2] * a * (1 - alpha)) / na
  canvas.data[i + 3] = na
}

/** Remplit tous les pixels ou `sdf(x, y) <= 0` (coordonnees 0..1). */
function fill(canvas, color, sdf, alpha = 1) {
  const { w } = canvas
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w
      const v = (y + 0.5) / w
      if (sdf(u, v) <= 0) blend(canvas, x, y, color, alpha)
    }
  }
}

const roundedRect = (x0, y0, x1, y1, r) => (x, y) => {
  const cx = Math.max(x0 + r, Math.min(x1 - r, x))
  const cy = Math.max(y0 + r, Math.min(y1 - r, y))
  const dx = Math.max(0, Math.abs(x - cx) - 0)
  const dy = Math.max(0, Math.abs(y - cy) - 0)
  if (x >= x0 + r && x <= x1 - r) return Math.max(y0 - y, y - y1)
  if (y >= y0 + r && y <= y1 - r) return Math.max(x0 - x, x - x1)
  return Math.hypot(dx, dy) - r
}

const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r

/* ------------------------------------------------------------------ */
/* Encodage PNG                                                        */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([len, typed, crc])
}

function encodePng(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filtre "None"
    for (let x = 0; x < size * 4; x++) raw[p++] = rgba[y * size * 4 + x]
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Reduit le canvas super-echantillonne vers la taille finale. */
function downsample(canvas) {
  const { size, w, data } = canvas
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * w + (x * SS + sx)) * 4
          const sa = data[i + 3]
          r += data[i] * sa
          g += data[i + 1] * sa
          b += data[i + 2] * sa
          a += sa
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round((a / (SS * SS)) * 255)
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Dessin de l'icone : une valise en cuir sur fond creme               */
/* ------------------------------------------------------------------ */

/**
 * @param {number} size          taille finale en px
 * @param {boolean} maskable     true -> fond plein bord a bord (zone de securite 80%)
 * @param {boolean} transparent  true -> pas de fond (favicon)
 */
function drawIcon(size, { maskable = false, radius = 0.22 } = {}) {
  const c = createCanvas(size)

  // Fond (les decorations sont ensuite clippees sur cette meme forme)
  const bg = maskable ? () => -1 : roundedRect(0, 0, 1, 1, radius)
  const clip = (sdf) => (x, y) => Math.max(sdf(x, y), bg(x, y))
  fill(c, COLORS.cream, bg)

  // Halos pastel discrets
  fill(c, COLORS.sky, clip(circle(0.82, 0.2, 0.2)), 0.35)
  fill(c, COLORS.beige, clip(circle(0.18, 0.85, 0.22)), 0.5)

  // Echelle du motif : plus petit pour les icones maskable (zone de securite).
  const s = maskable ? 0.68 : 0.84
  const m = (v) => 0.5 + (v - 0.5) * s

  // Poignee de la valise
  fill(c, COLORS.leatherDark, (x, y) => {
    const outer = Math.hypot((x - m(0.5)) / (0.15 * s), (y - m(0.34)) / (0.13 * s)) - 1
    const inner = Math.hypot((x - m(0.5)) / (0.095 * s), (y - m(0.34)) / (0.085 * s)) - 1
    return Math.max(outer, -inner, m(0.4) - y > 0 ? -1 : y - m(0.42))
  })

  // Corps de la valise
  fill(c, COLORS.leather, roundedRect(m(0.16), m(0.38), m(0.84), m(0.8), 0.075 * s))

  // Sangle centrale
  fill(c, COLORS.leatherDark, roundedRect(m(0.44), m(0.38), m(0.56), m(0.8), 0.012 * s))

  // Boucle laiton
  fill(c, COLORS.brass, roundedRect(m(0.455), m(0.55), m(0.545), m(0.63), 0.018 * s))

  // Rivets
  fill(c, COLORS.brass, circle(m(0.245), m(0.72), 0.022 * s))
  fill(c, COLORS.brass, circle(m(0.755), m(0.72), 0.022 * s))

  // Etiquette pastel
  fill(c, COLORS.beige, roundedRect(m(0.2), m(0.44), m(0.38), m(0.53), 0.02 * s))

  return encodePng(downsample(c), size)
}

/* ------------------------------------------------------------------ */

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192, { radius: 0.22 }],
  ['icon-512.png', 512, { radius: 0.22 }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { radius: 0.0001 }], // iOS applique lui-meme le masque
]

for (const [name, size, opts] of targets) {
  const png = drawIcon(size, opts)
  writeFileSync(resolve(OUT_DIR, name), png)
  console.log(`✓ ${name} (${size}x${size}, ${(png.length / 1024).toFixed(1)} Ko)`)
}
