"use strict";
/* ===================== Offline OCR: read text from screenshots =====================
   Tesseract.js, self-hosted under vendor/tesseract (see its README). Nothing is fetched from
   anywhere else: the library, worker, WebAssembly core and English data all come from this site,
   are loaded only the first time an image is read, and are then cached for offline use.
   The worker is created from a same-origin URL (no blob: workers, which the CSP disallows). */
const OCR={w:null,p:null,idle:null,log:null,base:"vendor/tesseract/"};
const OCR_SIZE="about 7 MB";
function ocrLoadLib(){
  if(window.Tesseract)return Promise.resolve();
  return new Promise((res,rej)=>{const s=document.createElement("script");s.src=OCR.base+"tesseract.min.js";s.onload=res;s.onerror=()=>{s.remove();rej(new Error("the text reader couldn't be loaded (are you offline on first use?)"))};document.head.append(s)});
}
async function ocrWorker(){
  clearTimeout(OCR.idle);if(OCR.w)return OCR.w;
  if(!OCR.p)OCR.p=(async()=>{await ocrLoadLib();const base=new URL(OCR.base,location.href).href;
    return Tesseract.createWorker("eng",1,{workerPath:base+"worker.min.js",corePath:base+"core",langPath:base+"lang",workerBlobURL:false,gzip:true,logger:m=>OCR.log?.(m),errorHandler:()=>{}})})();
  try{OCR.w=await OCR.p;return OCR.w}catch(e){OCR.p=null;throw e}
}
function ocrRelease(now){clearTimeout(OCR.idle);const go=()=>{const w=OCR.w;OCR.w=null;OCR.p=null;w?.terminate().catch(()=>{})};if(now)go();else OCR.idle=setTimeout(go,120000)}
/* Read text from an image Blob. onProgress gets {status, progress 0..1}. */
async function ocrImage(blob,onProgress){
  OCR.log=m=>onProgress?.(m);
  try{const w=await ocrWorker();const{data}=await w.recognize(blob);return(data?.text||"").replace(/[ \t]+\n/g,"\n").trim()}
  finally{OCR.log=null;ocrRelease(false)}
}
const OCR_STEP={"loading tesseract core":"Loading the text reader","initializing tesseract":"Starting the text reader","loading language traineddata":"Loading English","loading language traineddata (from cache)":"Loading English","initializing api":"Getting ready","recognizing text":"Reading the image"};
/* OCR with a progress sheet and a Cancel button. Resolves to the text, or null if cancelled or failed. */
function ocrWithSheet(blob,name){
  return new Promise(res=>{let done=false;
    const ov=sheet({title:`${ic("eye")} Reading the image`,body:`<div class="small muted">${esc(name||"Image")} · read on this device, nothing is uploaded.${window.Tesseract?"":` The first time, Trip Vault loads its text reader (${OCR_SIZE}) and keeps it for offline use.`}</div>
      <div class="bar mt" style="height:10px"><i id="ocrBar" style="width:2%;background:var(--acc);transition:width .2s"></i></div><div class="small mt" id="ocrSt">Starting…</div>`,
      foot:`<button class="btn" data-close>Cancel</button>`,onClose:()=>{if(!done){done=true;ocrRelease(true);res(null)}}});
    const bar=$("#ocrBar",ov),st=$("#ocrSt",ov);
    ocrImage(blob,m=>{if(done)return;const label=OCR_STEP[m.status]||m.status||"";const p=Math.round((m.progress||0)*100);
      const w=m.status==="recognizing text"?40+p*.6:m.status?.startsWith("loading language")?20+p*.2:Math.max(4,p*.2);bar.style.width=w+"%";st.textContent=label+(m.status==="recognizing text"||m.status?.startsWith("loading")?` · ${p}%`:"")})
      .then(tx=>{if(done)return;done=true;ov.remove();res(tx)})
      .catch(e=>{if(done)return;done=true;ov.remove();toast("Couldn't read text from the image: "+esc(e?.message||String(e)),"bad");res(null)});
  });
}
/* Settings: pre-load the reader so screenshots can be read with no connection later. */
async function ocrPrepare(btn){
  if(btn){btn.disabled=true;btn.textContent="Downloading…"}
  try{await ocrWorker();ocrRelease(false);S.meta.ocrReady=Date.now();await saveMeta();toast("Text reader ready. Screenshots can now be read offline");if(btn)btn.textContent="Ready for offline use"}
  catch(e){toast("Download failed: "+esc(e?.message||String(e)),"bad");if(btn){btn.disabled=false;btn.textContent="Try again"}}
}
