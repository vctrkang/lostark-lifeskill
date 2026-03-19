import Tesseract from 'tesseract.js';
import { SKILLS, FUSION_ID } from '../data/recipes';

// Build a lookup: normalized name fragment → material id
const NAME_MAP = {};
for (const skill of SKILLS) {
  for (const mat of skill.materials) {
    NAME_MAP[mat.name.toLowerCase()] = mat.id;
  }
}
NAME_MAP['abidos fusion material'] = FUSION_ID;
NAME_MAP['fusion material'] = FUSION_ID;

/**
 * Levenshtein distance for fuzzy name matching.
 */
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Given a string of text, try to find the best matching material id.
 */
function matchMaterialName(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (!cleaned) return null;

  let best = null;
  let bestDist = Infinity;

  for (const [name, id] of Object.entries(NAME_MAP)) {
    const dist = levenshtein(cleaned, name);
    const threshold = Math.floor(name.length * 0.35); // allow ~35% edit distance
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}

/**
 * Parse a number from a string, removing commas and other formatting.
 * Returns null if no valid number found.
 */
function parsePrice(str) {
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Extract all numeric tokens from a string (commas treated as thousand separators).
 * Returns parsed floats in order of appearance.
 */
function extractNumbers(str) {
  const tokens = str.match(/[\d,]+(?:\.\d+)?/g) ?? [];
  return tokens.map(parsePrice).filter(n => n !== null && n > 0);
}

/**
 * The market UI has 4 columns of numbers per row:
 *   Avg. Day Price | Recent Prices | Lowest Price | Cheapest Rem.
 *
 * We want "Lowest Price" (3rd column). Strategy:
 * - Collect all numbers from the name line + next 2 lines
 * - The Avg price has a decimal (.1, .7 etc); the rest are integers
 * - After stripping the decimal avg, take the 2nd integer = Lowest Price
 *   (order: Recent, Lowest, Cheapest Rem)
 * - Fallback: if we can't find the pattern, take a reasonable middle value
 */
function pickLowestPrice(nums) {
  if (nums.length === 0) return null;

  // Market columns: Avg. Day Price | Recent Prices | Lowest Price | Cheapest Rem.
  // Avg price is typically much smaller (e.g. 3.7) while the others are large integers.
  // Strategy: drop any value that looks like an avg-price multiplier (< 100 or has decimal),
  // then take the 2nd remaining value (index 1) as Lowest Price.
  const integers = nums.filter(n => Number.isInteger(n));
  const hasDecimal = nums.some(n => !Number.isInteger(n));

  // Best case: avg had a decimal → strip it, take 2nd integer (Lowest Price)
  if (hasDecimal && integers.length >= 2) {
    return integers[1];
  }

  // Avg read as whole number: if first value is much smaller than the rest, skip it
  if (integers.length >= 3) {
    const sorted = [...integers].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // If the first number is less than 10% of the median, it's likely the avg multiplier
    if (integers[0] < median * 0.1 && integers.length >= 3) {
      return integers[2]; // skip avg + recent, take lowest
    }
    return integers[1];
  }

  if (integers.length > 0) {
    return integers[0];
  }

  return nums[0];
}

/**
 * Process OCR lines to extract { materialId: price } pairs.
 * Prices for raw materials are per bundle of 100 units (as shown in the market UI).
 */
function extractPrices(text) {
  const prices = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to find a material name in this line
    const matId = matchMaterialName(line);
    if (!matId) continue;

    // Gather numbers from this line + next 2 (covers multi-line rows and column spill)
    const combined = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
    const nums = extractNumbers(combined);

    const price = pickLowestPrice(nums);
    if (price !== null) {
      prices[matId] = price;
    }
  }

  return prices;
}

/**
 * Preprocess image for better OCR: upscale 2x, convert to grayscale, boost contrast.
 * Returns a Blob suitable for Tesseract.
 */
function preprocessImage(imageFile) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvasToProcessedBlob(canvas).then(resolve);
    };
    img.src = url;
  });
}

const TESSERACT_CONFIG = {
  preserve_interword_spaces: '1',
};

/**
 * Preprocess a canvas in-place: grayscale + contrast boost.
 * Returns a Blob. Does NOT upscale (caller controls resolution).
 */
function canvasToProcessedBlob(sourceCanvas, contrast = 1.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * Run OCR directly on a canvas element (used for live window capture).
 * No preprocessing — raw frame at native resolution is sent straight to Tesseract.
 * PSM 11 (sparse text) handles game UIs better than block-text modes.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{prices: object, rawText: string}>}
 */
export async function extractPricesFromCanvas(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const result = await Tesseract.recognize(blob, 'eng', {
    ...TESSERACT_CONFIG,
    tessedit_pageseg_mode: '11', // sparse text — best for game UIs
  });
  const rawText = result.data.text;
  return { prices: extractPrices(rawText), rawText };
}

/**
 * Run OCR on an image file and return extracted prices.
 * @param {File} imageFile
 * @param {function} onProgress - called with 0-100 progress
 * @returns {Promise<{prices: object, rawText: string}>}
 */
export async function extractPricesFromImage(imageFile, onProgress) {
  const processedImage = await preprocessImage(imageFile);

  const result = await Tesseract.recognize(processedImage, 'eng', {
    ...TESSERACT_CONFIG,
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const rawText = result.data.text;
  const prices = extractPrices(rawText);

  return { prices, rawText };
}
