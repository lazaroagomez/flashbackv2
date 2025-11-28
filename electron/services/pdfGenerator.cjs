const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { generateQR } = require('./qrGenerator.cjs');

// Sticker size: 1" x 2.6" = 72pt x 187.2pt
const STICKER_WIDTH = 187.2;
const STICKER_HEIGHT = 72;
const PADDING = 4;

/**
 * Draw a single sticker (page size = sticker size)
 */
async function drawSticker(page, usb, font, fontBold, doc) {
  const width = STICKER_WIDTH;
  const height = STICKER_HEIGHT;

  // QR Code (left side, vertically centered)
  const qrSize = 52;
  const qrDataUrl = await generateQR(usb.usb_id);
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await doc.embedPng(qrImageBytes);

  page.drawImage(qrImage, {
    x: PADDING,
    y: (height - qrSize) / 2,
    width: qrSize,
    height: qrSize
  });

  // Text area starts after QR
  const textX = PADDING + qrSize + 6;
  const textWidth = width - textX - PADDING;

  // Top right: Custom text (if exists)
  if (usb.custom_text) {
    const customDisplay = usb.custom_text.length > 12 ? usb.custom_text.substring(0, 10) + '..' : usb.custom_text;
    const customWidth = font.widthOfTextAtSize(customDisplay, 7);
    page.drawText(customDisplay, {
      x: width - PADDING - customWidth,
      y: height - PADDING - 7,
      size: 7,
      font: font,
      color: rgb(0, 0, 0)
    });
  }

  // Center: USB Type - Model (large, bold, centered in text area)
  const mainLine = usb.model_name
    ? `${usb.usb_type_name} - ${usb.model_name}`
    : usb.usb_type_name;

  // Truncate if too long
  let displayMain = mainLine;
  let fontSize = 12;
  const maxWidth = textWidth - 5;

  while (fontBold.widthOfTextAtSize(displayMain, fontSize) > maxWidth && fontSize > 8) {
    fontSize--;
  }
  if (fontBold.widthOfTextAtSize(displayMain, fontSize) > maxWidth) {
    displayMain = displayMain.substring(0, 18) + '..';
  }

  // Center the main text in the text area
  const mainTextWidth = fontBold.widthOfTextAtSize(displayMain, fontSize);
  const textCenterX = textX + textWidth / 2;

  page.drawText(displayMain, {
    x: textCenterX - mainTextWidth / 2,
    y: height / 2 + 2,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // USB ID centered below QR code
  const usbIdWidth = fontBold.widthOfTextAtSize(usb.usb_id, 10);
  const qrCenterX = PADDING + qrSize / 2;
  page.drawText(usb.usb_id, {
    x: qrCenterX - usbIdWidth / 2,
    y: PADDING,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // Version centered below the main line (USB Type - Model)
  const versionCode = usb.version_code || '';
  let displayVersion = versionCode;
  let versionFontSize = 8;

  // Truncate version if too long to fit in text area
  while (font.widthOfTextAtSize(displayVersion, versionFontSize) > maxWidth && versionFontSize > 6) {
    versionFontSize--;
  }
  if (font.widthOfTextAtSize(displayVersion, versionFontSize) > maxWidth) {
    // Still too long, truncate the text
    while (displayVersion.length > 3 && font.widthOfTextAtSize(displayVersion + '..', versionFontSize) > maxWidth) {
      displayVersion = displayVersion.slice(0, -1);
    }
    displayVersion = displayVersion + '..';
  }

  const versionWidth = font.widthOfTextAtSize(displayVersion, versionFontSize);
  page.drawText(displayVersion, {
    x: textCenterX - versionWidth / 2,
    y: height / 2 - 12,
    size: versionFontSize,
    font: font,
    color: rgb(0, 0, 0)
  });

  // Bottom right: Technician name
  const techName = usb.technician_name || '';
  const techDisplay = techName.length > 12 ? techName.substring(0, 10) + '..' : techName;
  const techWidth = font.widthOfTextAtSize(techDisplay, 7);
  page.drawText(techDisplay, {
    x: width - PADDING - techWidth,
    y: PADDING,
    size: 7,
    font: font,
    color: rgb(0, 0, 0)
  });

  // Draw border for cutting guidance
  page.drawRectangle({
    x: 0.5,
    y: 0.5,
    width: width - 1,
    height: height - 1,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5
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
