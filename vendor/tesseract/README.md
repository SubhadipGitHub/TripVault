# Vendored offline OCR

Self-hosted so screenshots can be read without any network request. Loaded only when an image is imported.

| File | Source | Version | Licence |
|---|---|---|---|
| `tesseract.min.js`, `worker.min.js` | [tesseract.js](https://github.com/naptha/tesseract.js) `dist/` | 7.0.0 | Apache-2.0 |
| `core/tesseract-core-*-lstm.wasm.js` | [tesseract.js-core](https://github.com/naptha/tesseract.js-core) | 6.1.2 | Apache-2.0 |
| `lang/eng.traineddata.gz` | [@tesseract.js-data/eng](https://www.npmjs.com/package/@tesseract.js-data/eng) `4.0.0_best_int` (from tessdata) | 1.0.0 | Apache-2.0 |

Only the LSTM builds are included (the app creates the worker with OEM 1). Each device downloads one of the three core builds, picked by WebAssembly SIMD support. Source maps were stripped.
