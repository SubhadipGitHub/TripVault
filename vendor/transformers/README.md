# Vendored offline speech & translation runtime

Self-hosted so that Conversation's offline packs never load code from a CDN. It is loaded only by `js/ai-worker.js`, the first time a pack is downloaded or used, and is then cached by the service worker for offline use (it is not precached).

| File | Source | Version | Licence |
|---|---|---|---|
| `transformers.min.js` | [@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers) `dist/` (bundles onnxruntime-web's JS) | 4.3.1 | Apache-2.0 (`LICENSE-transformers.js`) |
| `ort-wasm-simd-threaded.asyncify.mjs`, `ort-wasm-simd-threaded.asyncify.wasm` | [onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web) `dist/` | 1.31.0-dev.20260914-8d85527a0 (the version transformers.js 4.3.1 pins) | MIT (per its `package.json`; the npm package ships no licence file). Copyright (c) Microsoft Corporation |

Only the WASM build that the worker uses (`device: "wasm"`) is included. The WebGPU (`jsep`/`jspi`) builds are left out to keep the repository small. The worker sets `env.backends.onnx.wasm.wasmPaths` to this folder, so the runtime never comes from jsdelivr.

The models themselves are **not** in this repository: they are downloaded from Hugging Face on request (Settings → Apps → Offline speech & translation) and kept in the browser's Cache Storage (`transformers-cache`):

| Pack | Model | Files (8-bit) | Download |
|---|---|---|---|
| Speech | [onnx-community/whisper-base](https://huggingface.co/onnx-community/whisper-base) | encoder 22 MB + merged decoder 51 MB | ~76 MB |
| Language (per language) | [Xenova/opus-mt-en-xx / xx-en](https://huggingface.co/Xenova) for hi, id, vi, ar, fr, es, de (both ways), th, ja (into English) | ~49 MB + ~56 MB per direction | ~106 MB per direction |
| Full | [Xenova/nllb-200-distilled-600M](https://huggingface.co/Xenova/nllb-200-distilled-600M) | encoder 419 MB + merged decoder 453 MB | ~890 MB |

Model licences: Whisper is MIT, Opus-MT is CC-BY 4.0, and **NLLB-200 is CC-BY-NC 4.0 (non-commercial)**. Trip Vault doesn't redistribute any of them (each browser downloads them from Hugging Face), but the Full language pack would need replacing if Trip Vault were ever offered commercially.

To update: `npm pack @huggingface/transformers@<v>`, copy `dist/transformers.min.js`; then `npm pack onnxruntime-web@<the version in its package.json>` and copy `dist/ort-wasm-simd-threaded.asyncify.{mjs,wasm}`.
