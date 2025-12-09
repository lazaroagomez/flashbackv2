const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { generateQR } = require('./qrGenerator.cjs');

// Sticker size: 1.49" x 0.39" = 107.28pt x 28.08pt
const STICKER_WIDTH = 107.28;
const STICKER_HEIGHT = 28.08;
const PADDING = 1;

/**
 * Draw a single sticker (page size = sticker size)
 * Layout: [QR] [USB Type - Model / Version] [USB ID top-right]
 * QR encodes hardware serial number
 */
async function drawSticker(page, usb, font, fontBold, doc) {
  const width = STICKER_WIDTH;
  const height = STICKER_HEIGHT;

  // QR Code (left side, nearly full height) - encodes hardware serial
  const qrSize = height - (PADDING * 2);
  const qrContent = usb.hardware_serial || usb.usb_id; // Fallback to USB ID if no serial
  const qrDataUrl = await generateQR(qrContent);
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await doc.embedPng(qrImageBytes);

  page.drawImage(qrImage, {
    x: PADDING,
    y: PADDING,
    width: qrSize,
    height: qrSize
  });

  // Text area starts after QR
  const textX = PADDING + qrSize + 2;
  const textWidth = width - textX - PADDING;
  // Center text on full page width (visually centered including QR area)
  const textCenterX = (textX + width) / 2;

  // USB ID will be drawn at bottom left (after technician, same Y position)

  // Main text: USB Type - Model (bold, CENTERED, prominent)
  const mainLine = usb.model_name
    ? `${usb.usb_type_name} - ${usb.model_name}`
    : usb.usb_type_name;

  // Find the largest font size that fits
  let displayMain = mainLine;
  let mainFontSize = 10;
  const maxMainWidth = textWidth - 2;

  while (fontBold.widthOfTextAtSize(displayMain, mainFontSize) > maxMainWidth && mainFontSize > 5) {
    mainFontSize--;
  }
  if (fontBold.widthOfTextAtSize(displayMain, mainFontSize) > maxMainWidth) {
    while (displayMain.length > 3 && fontBold.widthOfTextAtSize(displayMain + '..', mainFontSize) > maxMainWidth) {
      displayMain = displayMain.slice(0, -1);
    }
    displayMain = displayMain + '..';
  }

  // Center main text horizontally, position at top
  const mainTextWidth = fontBold.widthOfTextAtSize(displayMain, mainFontSize);
  const mainY = height - mainFontSize - 1;
  page.drawText(displayMain, {
    x: textCenterX - (mainTextWidth / 2),
    y: mainY,
    size: mainFontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // Version code - smaller, can wrap to 2 lines, centered
  const versionCode = usb.version_code || '';
  const versionFontSize = 4;
  const lineHeight = versionFontSize + 1;

  // Check if version fits on one line
  if (font.widthOfTextAtSize(versionCode, versionFontSize) <= maxMainWidth) {
    // Single line
    const versionWidth = font.widthOfTextAtSize(versionCode, versionFontSize);
    page.drawText(versionCode, {
      x: textCenterX - (versionWidth / 2),
      y: mainY - mainFontSize - 1,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  } else {
    // Split into two lines
    let line1 = '';
    let line2 = versionCode;

    // Find split point for line 1
    for (let i = 1; i <= versionCode.length; i++) {
      const testLine = versionCode.substring(0, i);
      if (font.widthOfTextAtSize(testLine, versionFontSize) > maxMainWidth) {
        line1 = versionCode.substring(0, i - 1);
        line2 = versionCode.substring(i - 1);
        break;
      }
      line1 = testLine;
    }

    // Truncate line 2 if still too long
    if (font.widthOfTextAtSize(line2, versionFontSize) > maxMainWidth) {
      while (line2.length > 3 && font.widthOfTextAtSize(line2 + '..', versionFontSize) > maxMainWidth) {
        line2 = line2.slice(0, -1);
      }
      line2 = line2 + '..';
    }

    // Draw line 1 centered
    const line1Width = font.widthOfTextAtSize(line1, versionFontSize);
    page.drawText(line1, {
      x: textCenterX - (line1Width / 2),
      y: mainY - mainFontSize - 1,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Draw line 2 centered
    const line2Width = font.widthOfTextAtSize(line2, versionFontSize);
    page.drawText(line2, {
      x: textCenterX - (line2Width / 2),
      y: mainY - mainFontSize - 1 - lineHeight,
      size: versionFontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  }

  // Bottom row: USB ID (left, next to QR) and Technician (right)
  const bottomY = PADDING;
  const bottomFontSize = 4;

  // USB ID - bottom left, next to QR code
  page.drawText(usb.usb_id, {
    x: textX,
    y: bottomY,
    size: bottomFontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // Technician name - bottom right with small margin
  const techName = usb.technician_name || '';
  const techWidth = font.widthOfTextAtSize(techName, bottomFontSize);
  page.drawText(techName, {
    x: width - techWidth - 2,
    y: bottomY,
    size: bottomFontSize,
    font: font,
    color: rgb(0, 0, 0)
  });
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

    // Create page with sticker dimensions
    const page = doc.addPage([STICKER_WIDTH, STICKER_HEIGHT]);
    await drawSticker(page, usb, font, fontBold, doc);
  }

  return await doc.save();
}

module.exports = {
  generateStickerPDF
};
