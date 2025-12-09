/**
 * Barcode Generator Service
 * Generates Data Matrix barcodes for USB drive stickers
 * Uses bwip-js library for barcode generation
 */
const bwipjs = require('bwip-js');

/**
 * Generate Data Matrix barcode as base64 PNG data URL
 * @param {string} content - The content to encode (hardware serial/UUID)
 * @returns {Promise<string>} Base64 data URL
 */
async function generateDataMatrix(content) {
  const png = await bwipjs.toBuffer({
    bcid: 'datamatrix',
    text: content,
    scale: 3,
    padding: 1
  });
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Generate Data Matrix barcode as buffer
 * @param {string} content - The content to encode (hardware serial/UUID)
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateDataMatrixBuffer(content) {
  return bwipjs.toBuffer({
    bcid: 'datamatrix',
    text: content,
    scale: 3,
    padding: 1
  });
}

module.exports = {
  generateDataMatrix,
  generateDataMatrixBuffer
};
