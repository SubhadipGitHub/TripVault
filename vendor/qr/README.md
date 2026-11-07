# Vendored QR libraries

Used by **Phone to phone** transfer (Backup & restore). Loaded only when you send or receive.

| File | Source | Version | Licence |
|---|---|---|---|
| `qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) `dist/qrcode.js` | 2.0.4 | MIT (in the file header) |
| `jsQR.js` | [jsQR](https://github.com/cozmo/jsQR) `dist/jsQR.js` | 1.4.0 | Apache-2.0 (`LICENSE-jsQR`) |

Receiving uses the browser's built-in `BarcodeDetector` when it supports QR codes, and falls back to jsQR.
