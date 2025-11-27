const QRCode = require('qrcode');

/**
 * Generate QR code as base64 PNG data URL
 * @param {string} usbId - The USB ID to encode (e.g., "A001")
 * @returns {Promise<string>} Base64 data URL
 */
async function generateQR(usbId) {
  return await QRCode.toDataURL(usbId, {
    width: 100,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

/**
 * Generate QR code as buffer
 * @param {string} usbId - The USB ID to encode
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateQRBuffer(usbId) {
  return await QRCode.toBuffer(usbId, {
    width: 100,
    margin: 1,
    errorCorrectionLevel: 'M'
  });
}

module.exports = {
  generateQR,
  generateQRBuffer
};
