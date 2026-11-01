// Prints a QR code for Expo Go, the same one `expo start` shows in interactive mode.
// Used by the start scripts in the repo root: `docker compose exec app node scripts/print-qr.js <url>`.
const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/print-qr.js <url>');
  process.exit(1);
}

try {
  // Expo CLI's own renderer; it is internal, so fall back to the plain URL if it ever moves.
  const cliRoot = require.resolve('@expo/cli/package.json', {
    paths: [require.resolve('expo/package.json')],
  });
  const { printQRCode } = require(require('path').join(cliRoot, '..', 'build/src/utils/qr'));
  printQRCode(url).print();
} catch {
  console.log('(QR code unavailable — type the address below into Expo Go instead)');
}
console.log(url);
