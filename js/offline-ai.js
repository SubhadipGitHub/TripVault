"use strict";
/* ===================== Offline speech & translation packs =====================
   Trip Vault can hear and translate on this device with no connection, once a pack is downloaded:
   - Speech pack: Whisper (base, 8-bit), speech to text in every phrasebook language except Odia.
   - Language packs: Opus-MT, one small model per direction, for the languages that have a good one.
   - Full language pack: NLLB-200 (600M, 8-bit), any pair of the 22 languages, Filipino and Indian languages included.
   Models download from Hugging Face (huggingface.co, files served from its CDN) only when you tap Download, and are
   kept in this browser's Cache Storage. Nothing you say or type is sent anywhere: the worker (js/ai-worker.js) runs them here. */
const AI_CACHE="transformers-cache",AI_HUB="https://huggingface.co/";
const AI_FILES=["onnx/encoder_model_quantized.onnx","onnx/decoder_model_merged_quantized.onnx"];
const AI_WHISPER="onnx-community/whisper-base",AI_NLLB="Xenova/nllb-200-distilled-600M";
/* Languages with a good dedicated model: both directions, or only into English. */
const AI_OPUS={hi:2,id:2,vi:2,ar:2,fr:2,es:2,de:2,th:1,ja:1};
const AI_NLLB_CODE={en:"eng_Latn",hi:"hin_Deva",bn:"ben_Beng",ta:"tam_Taml",te:"tel_Telu",kn:"kan_Knda",ml:"mal_Mlym",mr:"mar_Deva",gu:"guj_Gujr",pa:"pan_Guru",or:"ory_Orya",ur:"urd_Arab",
  fil:"tgl_Latn",ms:"zsm_Latn",id:"ind_Latn",th:"tha_Thai",vi:"vie_Latn",ja:"jpn_Jpan",ar:"arb_Arab",fr:"fra_Latn",es:"spa_Latn",de:"deu_Latn",si:"sin_Sinh"};
const aiWhisperLang=l=>l==="or"?null:l==="fil"?"tl":l;
const opusModel=(a,b)=>`Xenova/opus-mt-${a}-${b}`;
/* Packs and their download sizes (MB, measured from the Hub's 8-bit files plus tokenizers). */
function aiPacks(){const P=[{id:"speech",name:"Speech pack",desc:"Hear every language here except Odia",models:[[AI_WHISPER,"automatic-speech-recognition"]],mb:76}];
  for(const[l,d]of Object.entries(AI_OPUS)){const m=[[opusModel(l,"en"),"translation"]];if(d===2)m.unshift([opusModel("en",l),"translation"]);
    P.push({id:"lang:"+l,lang:l,name:langName(l),desc:d===2?`English ↔ ${langName(l)}`:`${langName(l)} → English only`,models:m,mb:m.length*106})}
  P.push({id:"full",name:"Full language pack",desc:"Any pair of all 22 languages, Filipino and Indian languages included. Large: use Wi-Fi.",models:[[AI_NLLB,"translation"]],mb:890});
  return P}
const AI={w:null,seq:0,pend:new Map(),idle:null,have:new Set(),checked:false,busy:new Map()};

/* ---------- What is downloaded ---------- */
async function aiRefresh(){try{if(typeof caches==="undefined")return AI.have;const c=await caches.open(AI_CACHE),keys=new Set((await c.keys()).map(r=>r.url.replace(/\?.*$/,"")));
    AI.have=new Set(aiPacks().flatMap(p=>p.models.map(m=>m[0])).filter(m=>AI_FILES.every(f=>keys.has(`${AI_HUB}${m}/resolve/main/${f}`))))}catch(e){}
  AI.checked=true;return AI.have}
const aiHasModel=m=>AI.have.has(m);
const aiPackReady=p=>p.models.every(m=>aiHasModel(m[0]));
const aiPack=id=>aiPacks().find(p=>p.id===id);
const aiCanHear=l=>!!aiWhisperLang(l)&&aiHasModel(AI_WHISPER);
/* The route a translation would take offline, or null. */
function aiRoute(from,to){if(from===to)return[];const d=(a,b)=>aiHasModel(opusModel(a,b))?[{model:opusModel(a,b)}]:null;
  if(from==="en"&&d("en",to))return d("en",to);if(to==="en"&&d(from,"en"))return d(from,"en");
  if(d(from,"en")&&d("en",to))return[...d(from,"en"),...d("en",to)];
  if(aiHasModel(AI_NLLB)&&AI_NLLB_CODE[from]&&AI_NLLB_CODE[to])return[{model:AI_NLLB,src:AI_NLLB_CODE[from],tgt:AI_NLLB_CODE[to]}];
  return null}
const aiCanTranslate=(a,b)=>!!aiRoute(a,b);
/* The smallest pack that would let a↔b translate offline (both ways), for the download offer. */
function aiSuggest(a,b){if(aiCanTranslate(a,b)&&aiCanTranslate(b,a))return null;const o=a==="en"?b:b==="en"?a:null;
  const p=o&&AI_OPUS[o]===2?aiPack("lang:"+o):null;return p&&!aiPackReady(p)?p:aiPack("full")}

/* ---------- The worker ---------- */
function aiWorker(){clearTimeout(AI.idle);if(AI.w)return AI.w;
  const w=new Worker("js/ai-worker.js",{type:"module"});
  w.onmessage=e=>{const m=e.data,p=AI.pend.get(m.id);if(!p)return;if(m.type==="progress"){p.onp?.(m);return}AI.pend.delete(m.id);m.type==="done"?p.res(m.out):p.rej(new Error(m.error))};
  w.onerror=e=>{for(const p of AI.pend.values())p.rej(new Error(e.message||"The offline engine stopped"));AI.pend.clear();AI.w=null};
  return AI.w=w}
function aiCall(msg,onp,transfer){return new Promise((res,rej)=>{const id=++AI.seq;AI.pend.set(id,{res,rej,onp});aiWorker().postMessage({...msg,id},transfer||[])}).finally(aiRelease)}
/* Free the models' memory a while after the last use. */
function aiRelease(){clearTimeout(AI.idle);AI.idle=setTimeout(()=>{if(AI.pend.size)return aiRelease();AI.w?.terminate();AI.w=null},180000)}

/* ---------- Download / delete ---------- */
async function aiDownload(id,onProgress){const p=aiPack(id);if(!p)throw new Error("Unknown pack");if(AI.busy.has(id))return AI.busy.get(id);
  const run=(async()=>{try{await navigator.storage?.persist?.()}catch(e){}
    const total=p.mb*1048576;let done=0;
    for(const[m,task]of p.models){if(aiHasModel(m)){done+=total/p.models.length;continue}let last=0;
      await aiCall({op:"load",task,model:m},x=>{last=x.loaded||0;onProgress?.(Math.min(.99,(done+last)/total))});
      done+=Math.max(last,total/p.models.length);await aiCall({op:"unload",model:m})}
    await aiRefresh();onProgress?.(1);return true})();
  AI.busy.set(id,run);try{return await run}finally{AI.busy.delete(id)}}
async function aiDelete(id){const p=aiPack(id);if(!p)return;await aiCall({op:"unload"}).catch(()=>{});
  const c=await caches.open(AI_CACHE);for(const r of await c.keys())if(p.models.some(([m])=>r.url.startsWith(`${AI_HUB}${m}/`)))await c.delete(r);await aiRefresh()}

/* ---------- Use ---------- */
async function aiTranslate(text,from,to){const r=aiRoute(from,to);if(!r)return null;let t=text;
  for(const s of r)t=await aiCall({op:"mt",model:s.model,text:t,src:s.src,tgt:s.tgt});return t||null}
function aiTranscribe(pcm,lang){return aiCall({op:"asr",model:AI_WHISPER,pcm,lang:aiWhisperLang(lang)},null)}

/* Listen with the microphone and the offline speech pack. Ends after ~1.2 s of quiet once speech has started
   (or on stop()); gives up after 7 s without speech; caps a turn at 30 s. Audio stays in memory and is dropped after. */
async function aiListen({lang,onPartial,onStop,onEnd,onError}){
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch(e){onError?.(e.name==="NotAllowedError"?"not-allowed":"audio-capture");return null}
  let ctx;try{ctx=new AudioContext({sampleRate:16000})}catch(e){ctx=new AudioContext()}
  const rate=ctx.sampleRate,src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1);
  const buf=[];let len=0,floor=null,cal=0,started=false,quiet=0,ended=false,lastPart=0,inflight=false,slow=false;
  const pcm=()=>{const a=new Float32Array(len);let o=0;for(const b of buf){a.set(b,o);o+=b.length}return rate===16000?a:aiResample(a,rate,16000)};
  const finish=async keep=>{if(ended)return;ended=true;proc.onaudioprocess=null;try{src.disconnect();proc.disconnect()}catch(e){}stream.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{});onStop?.();
    if(!keep||!started){onEnd?.("");return}try{onEnd?.(await aiTranscribe(pcm(),lang))}catch(e){onError?.("engine",e.message)}};
  proc.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);buf.push(new Float32Array(d));len+=d.length;
    let s=0;for(let i=0;i<d.length;i++)s+=d[i]*d[i];const rms=Math.sqrt(s/d.length),sec=d.length/rate,el=len/rate;
    if(cal<.3){floor=floor==null?rms:Math.min(floor,rms);cal+=sec;return}
    const thr=Math.max(.012,floor*2.5);
    if(rms>thr){started=true;quiet=0}else if(started)quiet+=sec;
    if(started&&quiet>=1.2||el>=30)return finish(true);
    if(!started&&el>=7)return finish(false);
    /* Live text: re-read what was said so far, if the device keeps up. */
    if(started&&onPartial&&!inflight&&!slow&&el-lastPart>=1.5){lastPart=el;inflight=true;const t0=performance.now();
      aiTranscribe(pcm(),lang).then(t=>{if(!ended)onPartial(t)}).catch(()=>{}).finally(()=>{inflight=false;slow=performance.now()-t0>2000})}};
  src.connect(proc);proc.connect(ctx.destination);
  return{stop:()=>finish(true),abort:()=>finish(false)}}
function aiResample(a,from,to){const n=Math.round(a.length*to/from),o=new Float32Array(n),r=from/to;
  for(let i=0;i<n;i++){const x=i*r,j=Math.floor(x),f=x-j;o[i]=(a[j]||0)*(1-f)+(a[j+1]||0)*f}return o}

/* A line that is (nearly) one of the phrasebook's 25 phrases gets the hand-checked phrase, not a machine guess. */
/* Compare loosely: case, punctuation, "I am"/"I'm" and a leading or trailing "please" don't matter. */
const aiKey=s=>String(s||"").toLowerCase().replace(/[^\p{L}\p{N} ]/gu,"").replace(/\s+/g," ").trim().replace(/\bi am\b/g,"im").replace(/^please |\s?please$/g,"").trim();
function phraseMatch(text,from,to){if(from!=="en"||!PHRASES[to])return null;const k=aiKey(text);if(!k)return null;
  const i=PHRASE_EN.findIndex(p=>p.split("/").some(v=>aiKey(v)===k));
  return i<0?null:splitP(PHRASES[to][1][i]).text}

/* ---------- Settings → Apps: offline languages ---------- */
function aiPaneHtml(){const fmt=mb=>mb>=1000?(mb/1000).toFixed(1)+" GB":mb+" MB";
  return`<div class="h mt">${ic("download")}<h2>Offline speech &amp; translation</h2><span class="sp"></span><button class="ibtn hq" type="button" data-a="help" data-k="offline" aria-label="Help">?</button></div>
   <p class="small muted" style="margin:0 0 8px">Download once on Wi-Fi; Conversation then hears and translates with no signal. Without a pack it uses your browser, or Google when online.</p>
   <div class="ai-list">${aiPacks().map(p=>{const ok=aiPackReady(p),busy=AI.busy.has(p.id);
     return`<div class="ai-row" data-pack="${p.id}"><div class="b"><div class="t">${esc(p.name)} ${ok?pill("Ready","ok"):""}</div><div class="d">${esc(p.desc)} · ${fmt(p.mb)}</div><div class="bar ai-bar" ${busy?"":"hidden"}><i style="width:2%"></i></div></div>
      ${ok?`<button type="button" class="btn xs" data-ai-del="${p.id}">${ic("trash","sm")} Delete</button>`:`<button type="button" class="btn xs ${p.id==="speech"?"pri":""}" data-ai-dl="${p.id}" ${busy?"disabled":""}>${ic("download","sm")} ${busy?"Downloading…":"Download"}</button>`}</div>`}).join("")}</div>
   <div class="small dim mt" id="aiUse"></div>`}
async function aiUsage(el){try{const e=await navigator.storage.estimate();if(el)el.textContent=`This browser is using ${Math.round((e.usage||0)/1048576)} MB of storage${e.quota?` (of about ${Math.round(e.quota/1073741824)} GB available to it)`:""}.`}catch(e){}}
function aiPaneWire(root){const pane=$("#aiPane",root);if(!pane)return;const redraw=()=>{pane.innerHTML=aiPaneHtml();aiUsage($("#aiUse",pane))};
  aiRefresh().then(redraw);
  pane.addEventListener("click",async e=>{const d=e.target.closest("[data-ai-dl]"),x=e.target.closest("[data-ai-del]");
    if(d){const id=d.dataset.aiDl,p=aiPack(id);if(!navigator.onLine){toast("Connect to the internet to download","bad");return}
      if(p.mb>500&&!confirm(`${p.name} is about ${p.mb} MB. Download it now? Use Wi-Fi if you can.`))return;
      aiDownloadUi(id,pane).then(redraw)}
    if(x){const p=aiPack(x.dataset.aiDel);if(!confirm(`Delete the ${p.name}? You can download it again later.`))return;await aiDelete(p.id);redraw();toast(`${esc(p.name)} deleted`)}})}
/* Download with a progress bar on the pack's row (in Settings or in Conversation). */
async function aiDownloadUi(id,root){const p=aiPack(id),row=()=>$(`[data-pack="${id}"]`,root);
  const btn=$(`[data-ai-dl="${id}"]`,root);if(btn){btn.disabled=true;btn.innerHTML=`${ic("download","sm")} Downloading…`}
  const bar=()=>{const r=row();const b=r&&$(".ai-bar",r);if(b)b.hidden=false;return b&&$("i",b)};
  try{await aiDownload(id,f=>{const i=bar();if(i)i.style.width=Math.max(2,Math.round(f*100))+"%"});toast(`${esc(p.name)} ready for offline use`);return true}
  catch(e){toast(`Download failed: ${esc(e.message||String(e))}`,"bad");return false}}
