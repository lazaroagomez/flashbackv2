const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { generateDataMatrix } = require('./barcodeGenerator.cjs');

// Sticker size: 1.49" x 0.39" = 107.28pt x 28.08pt - FIXED, DO NOT CHANGE
const STICKER_WIDTH = 107.28;
const STICKER_HEIGHT = 28.08;
const PADDING = 1;
const BARCODE_LEFT_MARGIN = 2; // Left margin before barcode
const BARCODE_SIZE_REDUCTION = 4; // Reduce barcode to free horizontal space

// Layout constants
const BOTTOM_ROW_HEIGHT = 6; // 5pt font + 1pt breathing room
const MIN_VERSION_FONT = 7;
const MAX_VERSION_FONT = 7;
const MIN_MAIN_FONT = 4;
const MAX_MAIN_FONT = 5;  // USB Type 5pt (reduced from 6pt)

/**
 * Truncate text to fit within maxWidth, adding "..." if truncated
 * @param {string} text - Text to truncate
 * @param {Object} font - PDF font object
 * @param {number} fontSize - Font size
 * @param {number} maxWidth - Maximum width in points
 * @returns {string} - Truncated text
 */
function truncateText(text, font, fontSize, maxWidth) {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '..', fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '..';
}

/**
 * Find the largest font size that allows text to fit within maxWidth
 * @param {string} text - Text to measure
 * @param {Object} font - PDF font object
 * @param {number} maxFontSize - Maximum font size to try
 * @param {number} minFontSize - Minimum font size to try
 * @param {number} maxWidth - Maximum width in points
 * @returns {number} - Best font size
 */
function findBestFontSize(text, font, maxFontSize, minFontSize, maxWidth) {
  for (let size = maxFontSize; size >= minFontSize; size--) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) {
      return size;
    }
  }
  return minFontSize;
}

/**
 * Draw a single sticker with fixed-zone layout
 * Layout zones (NEVER overlap):
 * - Zone 1 (Left): Data Matrix barcode
 * - Zone 2 (Top): USB Type - Model (bold)
 * - Zone 3 (Middle): Version code (shrinks/truncates)
 * - Zone 4 (Bottom): USB ID + Technician name (FIXED position)
 *
 * Data Matrix encodes hardware_serial (UUID) or falls back to usb_id
 */
async function drawSticker(page, usb, font, fontBold, doc) {
  const width = STICKER_WIDTH;
  const height = STICKER_HEIGHT;

  // === ZONE 1: Data Matrix (left side, reduced size with left margin) ===
  const barcodeSize = height - (PADDING * 2) - BARCODE_SIZE_REDUCTION;
  const barcodeContent = usb.hardware_serial || usb.usb_id; // Encode UUID, fallback to USB ID
  const barcodeDataUrl = await generateDataMatrix(barcodeContent);
  const barcodeImageBytes = Buffer.from(barcodeDataUrl.split(',')[1], 'base64');
  const barcodeImage = await doc.embedPng(barcodeImageBytes);

  // Center barcode vertically
  const barcodeY = (height - barcodeSize) / 2;

  page.drawImage(barcodeImage, {
    x: BARCODE_LEFT_MARGIN,
    y: barcodeY,
    width: barcodeSize,
    height: barcodeSize
  });

  // === Calculate text area bounds ===
  const textX = BARCODE_LEFT_MARGIN + barcodeSize + 2;
  const textWidth = width - textX - PADDING;
  const textCenterX = (textX + width) / 2;

  // Bottom row is FIXED - reserve space for it
  const bottomRowY = PADDING;
  const safeBottomY = bottomRowY + BOTTOM_ROW_HEIGHT; // Text must stay above this line

  // === ZONE 4: Bottom row (FIXED, draw first to ensure it's always there) ===
  const bottomFontSize = 5;

  // USB ID - bottom left, next to barcode
  page.drawText(usb.usb_id, {
    x: textX,
    y: bottomRowY,
    size: bottomFontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // Technician name - bottom right
  const techName = usb.technician_name || '';
  const techWidth = font.widthOfTextAtSize(techName, bottomFontSize);
  page.drawText(techName, {
    x: width - techWidth - 2,
    y: bottomRowY,
    size: bottomFontSize,
    font: font,
    color: rgb(0, 0, 0)
  });

  // === ZONE 2: Main text (USB Type - Model) at top ===
  const mainLine = usb.model_name
    ? `${usb.usb_type_name} - ${usb.model_name}`
    : usb.usb_type_name;

  // Find best font size for main line
  let mainFontSize = findBestFontSize(mainLine, fontBold, MAX_MAIN_FONT, MIN_MAIN_FONT, textWidth - 2);

  // Truncate if still doesn't fit at minimum font size
  const displayMain = truncateText(mainLine, fontBold, mainFontSize, textWidth - 2);

  // Position main text at top of sticker
  const mainY = height - mainFontSize - 1;
  const mainTextWidth = fontBold.widthOfTextAtSize(displayMain, mainFontSize);

  page.drawText(displayMain, {
    x: textCenterX - (mainTextWidth / 2),
    y: mainY,
    size: mainFontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // === ZONE 3: Version code (between main line and bottom row) - TWO LINES MAX ===
  const versionCode = usb.version_code || '';
  if (!versionCode) return; // No version to display

  // Calculate available space for version (between main text and bottom row)
  const versionTopY = mainY - 1; // 1pt gap below main text
  const maxTextWidth = textWidth - 2;

  // Use 7pt font for version (larger than USB Type for emphasis)
  const versionFontSize = MAX_VERSION_FONT;
  const lineHeight = versionFontSize + 1; // Line spacing for version text

  // Line 1 position: just below main text
  const line1Y = versionTopY - versionFontSize;
  // Line 2 position: below line 1, but MUST stay above safeBottomY
  const line2Y = line1Y - lineHeight;

  // Check if we have space for at least one line
  if (line1Y < safeBottomY) {
    return; // No space for version at all
  }

  // Check if version fits on one line
  if (font.widthOfTextAtSize(versionCode, versionFontSize) <= maxTextWidth) {
    // Single line
    const versionWidth = font.widthOfTextAtSize(versionCode, versionFontSize);
    page.drawText(versionCode, {
      x: textCenterX - (versionWidth / 2),
      y: line1Y,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  } else if (line2Y >= safeBottomY) {
    // We have space for two lines - split the text
    let line1 = '';
    let line2 = versionCode;

    // Find the split point - fill line 1 as much as possible
    for (let i = 1; i <= versionCode.length; i++) {
      const testLine = versionCode.substring(0, i);
      if (font.widthOfTextAtSize(testLine, versionFontSize) > maxTextWidth) {
        line1 = versionCode.substring(0, i - 1);
        line2 = versionCode.substring(i - 1);
        break;
      }
      line1 = testLine;
    }

    // Truncate line 2 if it's still too long
    line2 = truncateText(line2, font, versionFontSize, maxTextWidth);

    // Draw line 1
    const line1Width = font.widthOfTextAtSize(line1, versionFontSize);
    page.drawText(line1, {
      x: textCenterX - (line1Width / 2),
      y: line1Y,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Draw line 2
    const line2Width = font.widthOfTextAtSize(line2, versionFontSize);
    page.drawText(line2, {
      x: textCenterX - (line2Width / 2),
      y: line2Y,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  } else {
    // Only space for one line - truncate
    const truncatedVersion = truncateText(versionCode, font, versionFontSize, maxTextWidth);
    const versionWidth = font.widthOfTextAtSize(truncatedVersion, versionFontSize);
    page.drawText(truncatedVersion, {
      x: textCenterX - (versionWidth / 2),
      y: line1Y,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  }
}

/**
 * Generate PDF with stickers - each sticker is its own page
 * @param {Array} usbData - Array of USB drive objects
 * @returns {Promise<Uint8Array>} PDF bytes
 */
async function generateStickerPDF(usbData) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const usb of usbData) {
    // Skip if no technician
    if (!usb.technician_name) continue;

    // Create page with sticker dimensions (FIXED size)
    const page = doc.addPage([STICKER_WIDTH, STICKER_HEIGHT]);
    await drawSticker(page, usb, font, fontBold, doc);
  }

  return await doc.save();
}

module.exports = {
  generateStickerPDF
};
