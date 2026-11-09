/* Trip Vault offline speech & translation worker.
   Runs Whisper (speech to text) and Opus-MT / NLLB (translation) with transformers.js, self-hosted under
   vendor/transformers. Model files come from Hugging Face the first time a pack is downloaded and are then
   served from this browser's Cache Storage ("transformers-cache"), so later use needs no connection.
   Audio and text never leave this worker. Calls are run one at a time. */
import { pipeline, env } from "../vendor/transformers/transformers.min.js";

env.allowLocalModels = false;          // models come from the Hub (then the browser cache), never from this site
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = new URL("../vendor/transformers/", import.meta.url).href; // no CDN for the runtime
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const P = new Map();                   // model id -> Promise<pipeline>
let chain = Promise.resolve();         // one call at a time: ONNX sessions don't like overlapping runs

function load(task, model, id) {
  if (!P.has(model)) {
    const seen = {};
    const p = pipeline(task, model, {
      dtype: "q8", device: "wasm",
      progress_callback: x => {
        if (x.status === "progress" && x.file) { seen[x.file] = [x.loaded || 0, x.total || 0];
          let l = 0, t = 0; for (const [a, b] of Object.values(seen)) { l += a; t += b; }
          postMessage({ id, type: "progress", model, loaded: l, total: t, file: x.file }); }
      }
    });
    P.set(model, p);
    p.catch(() => P.delete(model));
  }
  return P.get(model);
}
async function unload(model) {
  const ms = model ? [model] : [...P.keys()];
  for (const m of ms) { const p = P.get(m); P.delete(m); try { await (await p)?.dispose?.(); } catch (e) {} }
}

async function run(m) {
  switch (m.op) {
    case "load": await load(m.task, m.model, m.id); return true;
    case "unload": await unload(m.model); return true;
    case "asr": {
      const asr = await load("automatic-speech-recognition", m.model, m.id);
      const o = await asr(m.pcm, { language: m.lang, task: "transcribe", chunk_length_s: 30, return_timestamps: false });
      return String(o?.text || "").trim();
    }
    case "mt": {
      const tr = await load("translation", m.model, m.id);
      const opt = m.src && m.tgt ? { src_lang: m.src, tgt_lang: m.tgt, max_new_tokens: 256 } : { max_new_tokens: 256 };
      const o = await tr(m.text, opt);
      return String((Array.isArray(o) ? o[0] : o)?.translation_text || "").trim();
    }
    default: throw new Error("unknown op " + m.op);
  }
}
self.onmessage = e => {
  const m = e.data;
  chain = chain.then(() => run(m)).then(out => postMessage({ id: m.id, type: "done", out }),
    err => postMessage({ id: m.id, type: "error", error: String(err?.message || err) }));
};
