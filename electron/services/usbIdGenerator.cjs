/**
 * USB ID Generator
 * Generates sequential IDs in format A001-Z999
 */

async function getNextId(connection) {
  // Call stored procedure
  await connection.execute('CALL get_next_usb_id(@next_id)');
  const [[result]] = await connection.execute('SELECT @next_id as usb_id');
  return result.usb_id;
}

module.exports = {
  getNextId
};
