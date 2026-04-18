import Tesseract from 'tesseract.js';
import { waitForCV } from './cv';
import { SKILLS, FUSIONS } from '../data/recipes';

/**
 * Reference resolution — templates were generated at this scale.
 * Images are NOT normalised to this; instead templates are scaled to match
 * the input image at runtime.
 */
export const REF_W = 2560;
export const REF_H = 1440;

const ALL_IDS = [
  ...FUSIONS.map(f => f.id),
  ...SKILLS.flatMap(s => s.materials.map(m => m.id)),
];

const ANCHOR_THRESHOLD = 0.70;
const MATCH_THRESHOLD  = 0.80;

/** Price crop dimensions in REF coords — multiplied by scale at runtime. */
const PRICE_X_OFFSET = 60;
const PRICE_Y_OFFSET = 0;
const PRICE_W        = 70;
const ROW_H          = 80;
const ROW_TOLERANCE  = 20;

/** Scale sweep for partial/unknown screenshots. */
const SCALE_MIN  = 0.40;
const SCALE_MAX  = 1.60;
const SCALE_STEP = 0.05;

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

function blobToImage(blob) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(blob);
  });
}

function imgToGrayMat(cv, img) {
  const canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  const src  = cv.imread(canvas);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  src.delete();
  return gray;
}

function imageFileToNativeCanvas(imageFile) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.src = URL.createObjectURL(imageFile);
  });
}

// ---------------------------------------------------------------------------
// Price crop
// ---------------------------------------------------------------------------

function cropPriceBlob(canvas, matchY, priceX, scale) {
  return new Promise(resolve => {
    const cropX = Math.round(priceX + PRICE_X_OFFSET * scale);
    const cropY = Math.round(matchY  + PRICE_Y_OFFSET * scale);
    const pw    = Math.round(PRICE_W * scale);
    const rh    = Math.round(ROW_H   * scale);

    // Debug thumbnail: 3× upscale of raw colour region
    const dbg = document.createElement('canvas');
    dbg.width  = pw * 3;
    dbg.height = rh * 3;
    dbg.getContext('2d').drawImage(canvas, cropX, cropY, pw, rh, 0, 0, dbg.width, dbg.height);
    const dataUrl = dbg.toDataURL('image/png');

    // Processed image for Tesseract: threshold to black-on-white
    const raw = document.createElement('canvas');
    raw.width  = pw;
    raw.height = rh;
    raw.getContext('2d').drawImage(canvas, cropX, cropY, pw, rh, 0, 0, pw, rh);
    const ctx = raw.getContext('2d');
    const id  = ctx.getImageData(0, 0, pw, rh);
    const d   = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v   = lum > 150 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);

    // 3× nearest-neighbour upscale for Tesseract
    const big = document.createElement('canvas');
    big.width  = pw * 3;
    big.height = rh * 3;
    const bigCtx = big.getContext('2d');
    bigCtx.imageSmoothingEnabled = false;
    bigCtx.drawImage(raw, 0, 0, big.width, big.height);
    big.toBlob(blob => resolve({ blob, dataUrl }), 'image/png');
  });
}

function parsePrice(text) {
  const cleaned = text.replace(/[,.]/g, '').replace(/[^0-9]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

let _templateMats = null;

async function loadTemplateMats(cv) {
  if (_templateMats) return _templateMats;
  _templateMats = {};
  await Promise.all(
    ALL_IDS.map(async id => {
      try {
        const resp = await fetch(`./templates/${id}.png`);
        if (!resp.ok) return;
        const img = await blobToImage(await resp.blob());
        _templateMats[id] = imgToGrayMat(cv, img);
      } catch { /* template missing — skip */ }
    })
  );
  return _templateMats;
}

let _colAnchorMat = undefined;

async function loadColAnchorMat(cv) {
  if (_colAnchorMat !== undefined) return _colAnchorMat;
  try {
    const resp = await fetch('./templates/col_anchor.png');
    if (!resp.ok) { _colAnchorMat = null; return null; }
    const img = await blobToImage(await resp.blob());
    _colAnchorMat = imgToGrayMat(cv, img);
  } catch {
    _colAnchorMat = null;
  }
  return _colAnchorMat;
}

// ---------------------------------------------------------------------------
// Scale-aware matching
// ---------------------------------------------------------------------------

/**
 * Run matchTemplate with a pre-scaled template.
 * Returns { score, x, y } or null if the template is larger than the source.
 */
function matchBest(cv, srcGray, tmplMat) {
  if (tmplMat.cols > srcGray.cols || tmplMat.rows > srcGray.rows) return null;
  const result = new cv.Mat();
  cv.matchTemplate(srcGray, tmplMat, result, cv.TM_CCOEFF_NORMED);
  const { maxVal, maxLoc } = cv.minMaxLoc(result);
  result.delete();
  return { score: maxVal, x: maxLoc.x, y: maxLoc.y };
}

/**
 * Try the anchor template at a single scale.
 * Creates and deletes its own scaled Mat.
 * Returns { score, x, y } or null.
 */
function tryAnchorAtScale(cv, srcGray, anchorMat, scale) {
  const scaled = new cv.Mat();
  cv.resize(anchorMat, scaled, new cv.Size(0, 0), scale, scale,
    scale < 1 ? cv.INTER_AREA : cv.INTER_LINEAR);
  const match = matchBest(cv, srcGray, scaled);
  scaled.delete();
  return match;
}

/**
 * Find the correct scale and anchor position.
 *
 * Fast path: try imageWidth / REF_W (works for full-screen shots at any resolution).
 * Fallback: sweep SCALE_MIN–SCALE_MAX to handle partial/cropped screenshots where
 * image dimensions don't reflect the original screen resolution.
 *
 * Returns { scale, x, y, score } or null if no match found.
 */
function findScaleAndAnchor(cv, srcGray, anchorMat, imageWidth) {
  const fastScale = Math.round((imageWidth / REF_W) * 100) / 100;
  const fastMatch = tryAnchorAtScale(cv, srcGray, anchorMat, fastScale);
  if (fastMatch && fastMatch.score >= ANCHOR_THRESHOLD) {
    return { scale: fastScale, ...fastMatch };
  }

  let best = null;
  for (let s = SCALE_MIN; s <= SCALE_MAX + 0.001; s += SCALE_STEP) {
    const scale = Math.round(s * 100) / 100;
    if (Math.abs(scale - fastScale) < 0.001) continue; // already tried
    const match = tryAnchorAtScale(cv, srcGray, anchorMat, scale);
    if (match && (!best || match.score > best.score)) {
      best = { scale, ...match };
    }
  }

  return (best && best.score >= ANCHOR_THRESHOLD) ? best : null;
}

// ---------------------------------------------------------------------------
// Core processing
// ---------------------------------------------------------------------------

async function processCanvas(canvas, onProgress) {
  await waitForCV();
  const cv = window.cv;
  const [templateMats, anchorMat] = await Promise.all([
    loadTemplateMats(cv),
    loadColAnchorMat(cv),
  ]);

  const templateCount = Object.keys(templateMats).length;
  if (templateCount === 0) return { prices: {}, rawText: 'No templates found.' };
  if (!anchorMat)          return { prices: {}, rawText: 'Column anchor template not loaded.' };

  const srcMat  = cv.imread(canvas);
  const srcGray = new cv.Mat();
  cv.cvtColor(srcMat, srcGray, cv.COLOR_RGBA2GRAY);
  srcMat.delete();

  const debugLines = [`image: ${canvas.width}×${canvas.height}`, `templates: ${templateCount}`];

  // --- find scale + anchor position ---
  const anchor = findScaleAndAnchor(cv, srcGray, anchorMat, canvas.width);
  if (!anchor) {
    srcGray.delete();
    return {
      prices:  {},
      rawText: debugLines.concat(
        'Market column header not found.',
        'Ensure the price column header is visible in the screenshot.'
      ).join('\n'),
    };
  }

  const { scale, x: priceX, y: anchorY, score: anchorScore } = anchor;
  const rowTolerance = Math.round(ROW_TOLERANCE * scale);
  debugLines.push(`anchor: scale=${scale.toFixed(2)} score=${anchorScore.toFixed(3)} x=${priceX} y=${anchorY}`);

  // --- match item templates at the detected scale ---
  const allMatches = [];
  const templateEntries = Object.entries(templateMats);
  for (let i = 0; i < templateEntries.length; i++) {
    const [matId, tmpl] = templateEntries[i];
    const scaled = new cv.Mat();
    cv.resize(tmpl, scaled, new cv.Size(0, 0), scale, scale,
      scale < 1 ? cv.INTER_AREA : cv.INTER_LINEAR);
    const match = matchBest(cv, srcGray, scaled);
    scaled.delete();

    if (match && match.score >= MATCH_THRESHOLD) {
      allMatches.push({ matId, ...match });
    } else if (match) {
      debugLines.push(`${matId}: no match (score=${match.score.toFixed(3)})`);
    }
    onProgress?.(40 + Math.round((i + 1) / templateEntries.length * 30));
  }

  // --- non-maximum suppression: keep highest-score match per row ---
  const kept = allMatches.filter((m, i) =>
    !allMatches.some((other, j) =>
      j !== i &&
      Math.abs(other.y - m.y) < rowTolerance &&
      other.score > m.score
    )
  );

  for (const m of allMatches) {
    if (!kept.includes(m)) {
      const winner = allMatches.find(other =>
        other !== m &&
        Math.abs(other.y - m.y) < rowTolerance &&
        other.score > m.score
      );
      debugLines.push(`${m.matId}: suppressed by ${winner?.matId ?? '?'} (score=${m.score.toFixed(3)} vs ${winner?.score.toFixed(3)})`);
    }
  }

  // --- OCR price crops ---
  const prices     = {};
  const debugCrops = [];

  for (let i = 0; i < kept.length; i++) {
    const { matId, y: matchY, score } = kept[i];
    const { blob, dataUrl } = await cropPriceBlob(canvas, matchY, priceX, scale);
    const ocr = await Tesseract.recognize(blob, 'eng', {
      tessedit_char_whitelist: '0123456789,',
      tessedit_pageseg_mode:   '7',
      tessedit_ocr_engine_mode: '1',
      user_defined_dpi: '150',
    });
    const price   = parsePrice(ocr.data.text);
    const raw     = ocr.data.text.trim();
    const ocrConf = Number.isFinite(ocr.data.confidence) ? ocr.data.confidence / 100 : 0;

    debugCrops.push({ matId, dataUrl, raw, price, score, ocrConf });
    if (price !== null) {
      prices[matId] = price;
      debugLines.push(`${matId}: score=${score.toFixed(2)} price=${price} raw="${raw}"`);
    } else {
      debugLines.push(`${matId}: score=${score.toFixed(2)} price=FAIL raw="${raw}"`);
    }
    onProgress?.(70 + Math.round((i + 1) / kept.length * 25));
  }

  srcGray.delete();
  return { prices, rawText: debugLines.join('\n'), debugCrops };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractPricesFromImage(imageFile, onProgress) {
  onProgress?.(10);
  const canvas = await imageFileToNativeCanvas(imageFile);
  onProgress?.(30);
  await waitForCV();
  onProgress?.(40);
  const result = await processCanvas(canvas, onProgress);
  onProgress?.(100);
  return result;
}

export async function extractPricesFromCanvas(canvas) {
  return processCanvas(canvas);
}
