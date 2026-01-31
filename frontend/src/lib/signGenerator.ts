// Kick Me Sign Generator
// This is a TypeScript port of the on-chain KickMeDoodleRenderer.sol
// Keep in sync with the Solidity version

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function hashKey(seed: number, key: string): number {
  let h = seed
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function rand(seed: number, key: string): number {
  const combined = hashKey(seed, key)
  const rng = mulberry32(combined)
  return Math.floor(rng() * 0xFFFFFFFF)
}

function rangeUint(seed: number, key: string, min: number, max: number): number {
  return min + (rand(seed, key) % (max - min + 1))
}

function rangeInt(seed: number, key: string, min: number, max: number): number {
  return min + (rand(seed, key) % (max - min + 1))
}

function tenthsToString(tenths: number): string {
  const neg = tenths < 0
  const abs = Math.abs(tenths)
  const whole = Math.floor(abs / 10)
  const frac = abs % 10
  return (neg ? "-" : "") + whole + "." + frac
}

function getParams(seed: number) {
  return {
    seed,
    paperRot: rangeInt(seed, "paperRot", -20, 20),
    tapeRot: rangeInt(seed, "tapeRot", -80, 80),
    tapeX: rangeInt(seed, "tapeX", -20, 20),
    warp: rangeUint(seed, "warp", 3, 9),
    shadowDx: rangeUint(seed, "sdx", 10, 16),
    shadowDy: rangeUint(seed, "sdy", 10, 16),
    markerW: rangeUint(seed, "mw", 18, 26),
    jitter: rangeUint(seed, "jit", 1, 3),
    hatchN: rangeUint(seed, "hn", 18, 28),
    hatchAng: rangeInt(seed, "ha", -120, -60),
    doodleOn: (rand(seed, "doodle") % 10) < 3,
    textOffsetX: rangeInt(seed, "textX", 55, 247),
    textOffsetY: rangeInt(seed, "textY", -100, 80),
    meShiftX: rangeInt(seed, "meShiftX", -100, 50)
  }
}

function generatePaperPath(seed: number, warp: number): string {
  const bp = [150,190, 383,190, 616,190, 850,190, 850,417, 850,643, 850,870, 616,870, 383,870, 150,870, 150,643, 150,417]
  let path = ""

  for (let i = 0; i < 12; i++) {
    const px = bp[i*2] + rangeInt(seed, "ppx" + i, -warp, warp)
    const py = bp[i*2+1] + rangeInt(seed, "ppy" + i, -warp, warp)
    if (i === 0) {
      path = "M" + px + " " + py
    } else {
      path += " L" + px + " " + py
    }
  }
  return path + " Z"
}

function generateTapePath(seed: number, tapeX: number, warp: number): string {
  const bx = 370 + tapeX
  const by = 160
  const tw = warp > 2 ? warp - 2 : 1

  const xs = [bx, bx+130, bx+260, bx+260, bx+260, bx+130, bx, bx]
  const ys = [by, by, by, by+42, by+85, by+85, by+85, by+42]

  let path = ""
  for (let i = 0; i < 8; i++) {
    const px = xs[i] + rangeInt(seed, "tpx" + i, -tw, tw)
    const py = ys[i] + rangeInt(seed, "tpy" + i, -tw, tw)
    if (i === 0) {
      path = "M" + px + " " + py
    } else {
      path += " L" + px + " " + py
    }
  }
  return path + " Z"
}

function generateHatchLines(seed: number, hatchN: number): string {
  let lines = ""
  for (let i = 0; i < hatchN; i++) {
    const baseY = 220 + Math.floor((i * 600) / hatchN)
    const y1 = baseY + rangeInt(seed, "hy1" + i, -8, 8)
    const y2 = baseY + rangeInt(seed, "hy2" + i, -8, 8)
    lines += `<path d="M170 ${y1} L830 ${y2}" stroke="#000" stroke-width="2" fill="none" opacity="0.05"/>`
  }
  return lines
}

function glyphK(seed: number, idx: number, j: number): string {
  const d = rangeInt(seed, "gK" + idx, -j, j)
  return `<path d="M${20+d} 10 L20 130"/><path d="M20 70 L85 15"/><path d="M20 70 L90 130"/>`
}

function glyphI(seed: number, idx: number, j: number): string {
  const d = rangeInt(seed, "gI" + idx, -j, j)
  return `<path d="M${50+d} 10 L50 130"/><path d="M25 10 L75 10"/><path d="M25 130 L75 130"/>`
}

function glyphC(seed: number, idx: number, j: number): string {
  const d = rangeInt(seed, "gC" + idx, -j, j)
  return `<path d="M${85+d} 25 C40 0, 15 40, 20 70 C25 110, 55 145, 88 118"/>`
}

function glyphM(seed: number, idx: number, j: number): string {
  const d = rangeInt(seed, "gM" + idx, -j, j)
  return `<path d="M${15+d} 130 L15 10"/><path d="M15 10 L50 70"/><path d="M50 70 L85 10"/><path d="M85 10 L85 130"/>`
}

function glyphE(seed: number, idx: number, j: number): string {
  const d = rangeInt(seed, "gE" + idx, -j, j)
  return `<path d="M${20+d} 10 L20 130"/><path d="M20 10 L90 10"/><path d="M20 70 L75 70"/><path d="M20 130 L90 130"/>`
}

function wrapGlyph(paths: string, x: number, y: number, scale10: number, markerW: number): string {
  const scale = "0." + scale10
  return `<g transform="translate(${x} ${y}) scale(${scale})" stroke="#000" stroke-width="${markerW}" stroke-linecap="round" stroke-linejoin="round" fill="none">${paths}</g>` +
         `<g transform="translate(${x+2} ${y+1}) scale(${scale})" stroke="#000" stroke-width="${Math.max(1, markerW-4)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.25">${paths}</g>`
}

function generateText(seed: number, markerW: number, jitter: number, offsetX: number, offsetY: number, meShiftX: number): string {
  const scale10 = 55 + rangeUint(seed, "scale", 0, 10)
  const j = jitter

  const k1x = rangeInt(seed, "k1x", -12, 12)
  const k1y = rangeInt(seed, "k1y", -10, 10)
  const ix = rangeInt(seed, "ix", -12, 12)
  const iy = rangeInt(seed, "iy", -10, 10)
  const cx = rangeInt(seed, "cx", -12, 12)
  const cy = rangeInt(seed, "cy", -10, 10)
  const k2x = rangeInt(seed, "k2x", -12, 12)
  const k2y = rangeInt(seed, "k2y", -10, 10)
  const mx = rangeInt(seed, "mx", -12, 12)
  const my = rangeInt(seed, "my", -10, 10)
  const ex = rangeInt(seed, "ex", -12, 12)
  const ey = rangeInt(seed, "ey", -10, 10)

  return wrapGlyph(glyphK(seed, 0, j), 200 + offsetX + k1x, 430 + offsetY + k1y, scale10, markerW) +
         wrapGlyph(glyphI(seed, 1, j), 285 + offsetX + ix, 430 + offsetY + iy, scale10, markerW) +
         wrapGlyph(glyphC(seed, 2, j), 355 + offsetX + cx, 430 + offsetY + cy, scale10, markerW) +
         wrapGlyph(glyphK(seed, 3, j), 440 + offsetX + k2x, 430 + offsetY + k2y, scale10, markerW) +
         wrapGlyph(glyphM(seed, 4, j), 300 + offsetX + meShiftX + mx, 590 + offsetY + my, scale10, markerW) +
         wrapGlyph(glyphE(seed, 5, j), 410 + offsetX + meShiftX + ex, 590 + offsetY + ey, scale10, markerW)
}

function generateDoodle(seed: number): string {
  const cx = 760 + rangeInt(seed, "doodleX", -15, 15)
  const cy = 820 + rangeInt(seed, "doodleY", -15, 15)
  return `<g opacity="0.12" stroke="#000" stroke-width="3" stroke-linecap="round"><path d="M${cx-12} ${cy} L${cx+12} ${cy}"/><path d="M${cx} ${cy-12} L${cx} ${cy+12}"/></g>`
}

function generateCornerCurl(seed: number): string {
  const dx = rangeInt(seed, "curlX", -5, 5)
  return `<path d="M${820+dx} 210 Q835 195 840 220" stroke="#000" opacity="0.25" stroke-width="2" fill="none"/>`
}

export function generateSignSVG(seed: number): string {
  const p = getParams(seed)
  const paperPath = generatePaperPath(p.seed, p.warp)
  const tapePath = generateTapePath(p.seed, p.tapeX, p.warp)

  const shadow = `<g id="shadow" transform="translate(${p.shadowDx} ${p.shadowDy})"><path d="${paperPath}" fill="#000" opacity="0.12"/></g>`

  const paper = `<g id="paper" transform="rotate(${tenthsToString(p.paperRot)} 500 530)">` +
    `<path d="${paperPath}" fill="#FCFCFC" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${paperPath}" fill="none" stroke="#000" stroke-width="4" opacity="0.20" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)"/>` +
    generateCornerCurl(p.seed) +
    `<g id="hatch" transform="rotate(${tenthsToString(p.hatchAng)} 500 530)" opacity="0.05">${generateHatchLines(p.seed, p.hatchN)}</g></g>`

  const tape = `<g id="tape" transform="rotate(${tenthsToString(p.tapeRot)} 500 200)">` +
    `<path d="${tapePath}" fill="#E8D9B5" stroke="#000" stroke-width="3" opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${tapePath}" fill="none" stroke="#000" stroke-width="3" opacity="0.18" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)"/>` +
    `</g>`

  const text = `<g id="text" transform="rotate(${tenthsToString(p.paperRot)} 500 530)">` +
    generateText(p.seed, p.markerW, p.jitter, p.textOffsetX, p.textOffsetY, p.meShiftX) + `</g>`

  const doodle = p.doodleOn ? generateDoodle(p.seed) : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${shadow}${paper}${tape}${text}${doodle}</svg>`
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF)
}
