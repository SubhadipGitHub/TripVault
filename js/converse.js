"use strict";
/* ===================== Conversation: live voice translation =====================
   Two people take turns at the mic; each line is heard, translated and read aloud in the other language.
   Every step prefers what stays on this device and falls back only when it must:
   - Hearing: Trip Vault's offline speech pack (js/offline-ai.js) →
     online, the browser's cloud recognition (Google in Chrome, Apple in Safari) → typing.
   - Translating: the phrasebook's hand-checked phrase → the browser's on-device translator → Trip Vault's offline
     language packs → online, a Google Translate hand-off.
   Each line says which one it used. Turns live only while the sheet is open: Trip Vault stores and sends nothing. */
const SR=typeof window!=="undefined"?(window.SpeechRecognition||window.webkitSpeechRecognition||null):null;
const CV={rec:null,tr:new Map(),turns:[],ov:null,me:"en",them:"hi",flip:false,busy:false};
const cvSet=async(k,v)=>{S.settings={...S.settings,[k]:v};try{await DB.put("meta",{k:"settings",v:S.settings})}catch(e){}};
const cvCodes=l=>[...new Set([l==="en"?"en":l,LANG_META[l]?.gt].filter(Boolean))];
const cvDir=l=>LANG_RTL.has(l)?'dir="rtl"':"";
const cvMicOk=()=>!!SR||!!navigator.mediaDevices?.getUserMedia;
const cvCloudName=()=>/apple/i.test(navigator.vendor||"")?"Apple":"Google";
const CV_VIA={device:"on this device",pack:"offline pack",phrasebook:"phrasebook",cloud:()=>"via "+cvCloudName()};
const cvVia=v=>typeof CV_VIA[v]==="function"?CV_VIA[v]():CV_VIA[v]||"";

/* ---------- On-device translation (the browser's Translator API) ---------- */
/* The browser's API can hang (seen in headless Chromium), so a check that takes too long counts as "no". */
const cvWithin=(p,ms,v)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(v),ms))]);
const cvAvailOne=(s,t)=>cvWithin(Translator.availability({sourceLanguage:s,targetLanguage:t}).catch(()=>"unavailable"),2500,"unavailable");
async function cvAvail(from,to){if(!("Translator"in self))return"unavailable";
  for(const s of cvCodes(from))for(const t of cvCodes(to)){const a=await cvAvailOne(s,t);if(a!=="unavailable")return a}
  return"unavailable"}
/* A translator for the pair, created once. Creating one may download the language pack, which needs a tap, so it is first called from a mic or send button. */
function cvTranslator(from,to){if(!("Translator"in self)||from===to)return Promise.resolve(null);const key=from+">"+to;if(CV.tr.has(key))return CV.tr.get(key);
  const p=(async()=>{for(const s of cvCodes(from))for(const t of cvCodes(to)){const a=await cvAvailOne(s,t);
      if(a==="unavailable")continue;
      try{return await Translator.create({sourceLanguage:s,targetLanguage:t,monitor(m){m.addEventListener("downloadprogress",e=>cvStatus(`Getting ${esc(langName(to))} for offline use… ${Math.round((e.loaded||0)*100)}%`))}})}catch(e){return null}}
    return null})();
  CV.tr.set(key,p);p.then(r=>{if(!r)CV.tr.delete(key);else cvStatus()});return p}
/* → {text, via} or null when nothing on this device can do it. */
async function cvTranslate(text,from,to){if(from===to)return{text,via:"device"};
  const ph=phraseMatch(text,from,to);if(ph)return{text:ph,via:"phrasebook"};
  /* Don't hold the line while the browser downloads its own model: use the pack (or Google) this time. */
  const tr=await cvWithin(cvTranslator(from,to),4000,null);if(tr)try{const t=await cvWithin(tr.translate(text),15000,null);if(t)return{text:t,via:"device"}}catch(e){}
  try{const t=await aiTranslate(text,from,to);if(t)return{text:t,via:"pack"}}catch(e){toast("Offline translation failed: "+esc(e.message||String(e)),"bad")}
  return null}

/* ---------- Hearing ---------- */
/* Which way this language will be heard: pack, cloud, or null (type instead).
   The browser's own on-device check (SpeechRecognition.available with processLocally) is deliberately not used:
   in current Chromium builds it can crash the whole tab, which no try/catch can stop. */
async function cvHearBy(l){if(aiCanHear(l)&&navigator.mediaDevices?.getUserMedia)return"pack";if(SR&&navigator.onLine)return"cloud";return null}
/* Abandon listening (sheet closed, app hidden, languages changed): a half-heard line is dropped. */
function cvStop(){const r=CV.rec;CV.rec=null;if(r){r._dead=true;if(r.onend!==undefined)r.onend=r.onresult=r.onerror=null;try{r.abort()}catch(e){}}
  const n=CV.turns.length;CV.turns=CV.turns.filter(t=>!t.live);if(CV.ov){$$(".cv-mic.on",CV.ov).forEach(b=>b.classList.remove("on"));if(CV.turns.length!==n)cvPaint()}}
const CV_ERR=from=>({"not-allowed":"Microphone blocked. Allow it for this site in the browser's settings.","service-not-allowed":"Microphone blocked. Allow it for this site in the browser's settings.",
  "no-speech":"Didn't catch that. Tap and try again.","language-not-supported":`This browser can't listen in ${esc(langName(from))}. Type it below instead.`,
  "network":"Listening needs a connection in this browser. Get the Speech pack (Settings → Apps) or type below.","audio-capture":"No microphone found."});
/* Tap a mic to listen; tap again (either mic) to finish early. It also stops by itself when the speaker pauses. */
async function cvListen(side){if(CV.rec){try{CV.rec.stop()}catch(e){cvStop()}return}if(CV.busy)return;
  const from=side==="me"?CV.me:CV.them,to=side==="me"?CV.them:CV.me;
  cvTranslator(from,to); // start the browser's own download (if any) while the tap still counts
  CV.busy=true;let by;try{by=await cvHearBy(from)}finally{CV.busy=false}
  if(!CV.ov)return;
  if(!by){toast(navigator.onLine?`Can't listen in ${esc(langName(from))} here. Type it below.`:`Offline: get the Speech pack while online to listen with no signal. Type it below for now.`,"info");$("#cvTx",CV.ov)?.focus();return}
  if(by==="cloud"&&!S.settings?.cvMicOk&&!(await cvConsent()))return;
  const turn={side,from,to,text:"",live:true,heard:by};CV.turns.push(turn);cvPaint();
  const on=v=>$$(`.cv-mic[data-side="${side}"]`,CV.ov).forEach(b=>b.classList.toggle("on",v));
  const drop=msg=>{CV.turns.splice(CV.turns.indexOf(turn),1);cvPaint();if(msg)toast(msg,"info")};
  if(by==="pack"){let rec=null;
    const ctl=await aiListen({lang:from,
      onPartial:t=>{if(rec?._dead)return;turn.text=t;cvPaintTurn(turn)},
      onStop:()=>{if(rec?._dead)return;on(false);turn.hearing=true;cvPaintTurn(turn)},
      onEnd:t=>{if(rec?._dead)return;if(CV.rec===rec)CV.rec=null;on(false);turn.live=false;turn.hearing=false;if(!t)return drop("Didn't catch that. Tap and try again.");turn.text=t;cvFinish(turn)},
      onError:(code,msg)=>{if(rec?._dead)return;if(CV.rec===rec)CV.rec=null;on(false);drop();toast(CV_ERR(from)[code]||("Offline listening failed: "+esc(msg||code)),"bad")}});
    if(!ctl)return;rec={...ctl,_side:side};CV.rec=rec;on(true);return}
  const r=new SR();r._side=side;r.lang=speechTag(from);r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  r.onresult=e=>{let fin="",tmp="";for(let i=0;i<e.results.length;i++){const x=e.results[i];if(x.isFinal)fin+=x[0].transcript;else tmp+=x[0].transcript}
    turn.text=(fin+" "+tmp).trim();cvPaintTurn(turn)};
  r.onerror=e=>{const m=CV_ERR(from)[e.error];if(m)toast(m,e.error==="no-speech"?"info":"bad")};
  r.onend=()=>{if(CV.rec!==r)return;CV.rec=null;on(false);turn.live=false;if(!turn.text)return drop();cvFinish(turn)};
  CV.rec=r;on(true);
  try{r.start()}catch(e){CV.rec=null;on(false);drop();toast("Couldn't start the microphone","bad")}}
function cvConsent(){return new Promise(res=>{let done=false;
  const ov=sheet({title:`${ic("mic")} Before you speak`,body:`<div class="note">${ic("info")}<div>
      <p style="margin:0 0 6px">There's no offline speech pack here for this language, so your browser will do the listening: Chrome sends the audio to Google and Safari to Apple.</p>
      <p style="margin:0">To keep listening on this device, download the <b>Speech pack</b> (Settings → Apps). Trip Vault itself doesn't record, keep or send anything from the conversation.</p></div></div>`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="cvOk">${ic("mic","sm")} Use the microphone</button>`,onClose:()=>{if(!done)res(false)}});
  $("#cvOk",ov).onclick=async()=>{done=true;ov.remove();await cvSet("cvMicOk",true);res(true)}})}

/* ---------- A finished turn: translate, show, read aloud ---------- */
async function cvFinish(turn){turn.out=null;turn.wait=true;cvPaintTurn(turn);
  const r=await cvTranslate(turn.text,turn.from,turn.to);turn.wait=false;turn.out=r?.text||null;turn.via=r?.via||null;cvPaintTurn(turn);cvFocus(turn);
  if(turn.out&&S.settings?.cvSpeak!==false)speak(turn.out,turn.to)}
function cvSend(side){const inp=$("#cvTx",CV.ov),v=inp.value.trim();if(!v){inp.focus();return}inp.value="";
  const from=side==="me"?CV.me:CV.them,to=side==="me"?CV.them:CV.me;cvTranslator(from,to);
  const turn={side,from,to,text:v,live:false};CV.turns.push(turn);cvPaint();cvFinish(turn)}

/* ---------- Drawing ---------- */
const cvTurnHtml=(t,i)=>{const gt=translateUrl(t.text,t.to),on=navigator.onLine;
  const heard=t.heard?` · <span class="cv-via">heard ${esc(cvVia(t.heard))}</span>`:"";
  const none=!t.live&&!t.wait&&!t.out;
  return`<div class="cv-t ${t.side}" data-i="${i}"><div class="cv-who">${t.side==="me"?"You":"Them"} · ${esc(langName(t.from))}${heard}</div>
    <div class="cv-src" lang="${t.from}" ${cvDir(t.from)}>${t.text?esc(t.text):`<span class="muted">${t.hearing?"Hearing…":"Listening…"}</span>`}</div>
    ${t.live?"":t.wait?`<div class="cv-out muted">Translating…</div>`:t.out?`<div class="cv-out" lang="${t.to}" ${cvDir(t.to)}>${esc(t.out)}</div><div class="cv-via">${t.via==="phrasebook"?"from the phrasebook (checked phrase)":"translated "+esc(cvVia(t.via))}</div>`
      :`<div class="cv-via">${on?"No offline translation for this pair: via Google":"Offline, and no language pack for this pair yet"}</div>`}
    ${t.live||t.wait?"":`<div class="cv-act">${t.out?sayBtn(t.out,t.to,"btn xs")+`<button class="btn xs" data-copy="${esc(t.out)}">${ic("copy","sm")} Copy</button>`:""}${on||t.out?`<a class="btn xs${none?" pri":""}" href="${esc(gt)}" target="_blank" rel="noopener noreferrer">${ic("globe","sm")} ${t.out?"Google Translate":`Translate to ${esc(langName(t.to))}`}</a>`:""}</div>`}</div>`};
function cvPaint(){const box=$("#cvLog",CV.ov);if(!box)return;
  box.innerHTML=CV.turns.length?CV.turns.map(cvTurnHtml).join(""):`<div class="cv-empty muted">${cvMicOk()?`Tap <b>You</b> and speak, then let them tap <b>Them</b> to reply.`:`Type what you want to say and send it as you or as them.`}</div>`;
  box.scrollTop=box.scrollHeight;cvFocus(CV.turns.at(-1))}
function cvPaintTurn(t){const i=CV.turns.indexOf(t),el=$(`.cv-t[data-i="${i}"]`,CV.ov);if(!el)return cvPaint();el.outerHTML=cvTurnHtml(t,i);const box=$("#cvLog",CV.ov);box.scrollTop=box.scrollHeight;if(t.side==="them"||t.out)cvFocus(t)}
/* Face to face: the panel facing them shows the latest line in their language. */
function cvFocus(t){const f=$("#cvFace",CV.ov);if(!f)return;const line=!t?"":t.side==="them"?t.text:(t.out||"");
  f.innerHTML=line?`<div lang="${CV.them}" ${cvDir(CV.them)}>${esc(line)}</div>`:`<div class="muted">${esc(langName(CV.them))}</div>`}
function cvStatus(msg){const el=$("#cvSt",CV.ov);if(el&&msg){el.innerHTML=`<div class="cv-line">${ic("download","sm")}<span>${msg}</span></div>`;return}if(el)cvCheck()}
/* What each step will use for this pair, and the download that would make it work offline. */
async function cvCheck(){const el=$("#cvSt",CV.ov),offer=$("#cvOffer",CV.ov);if(!el)return;const me=CV.me,th=CV.them,on=navigator.onLine;
  if(me===th){el.innerHTML=`<div class="cv-line">${ic("info","sm")}<span>Pick two different languages.</span></div>`;offer.innerHTML="";return}
  if(!AI.checked)await aiRefresh();
  const[a,b,hm,ht]=await Promise.all([cvAvail(me,th),cvAvail(th,me),cvHearBy(me),cvHearBy(th)]);if(me!==CV.me||th!==CV.them)return;
  const dev=a!=="unavailable"&&b!=="unavailable",pack=aiCanTranslate(me,th)&&aiCanTranslate(th,me);
  const tr=dev?"on this device":pack?"with your offline pack":on?"via Google (no offline pack for this pair)":"not available offline yet";
  const hear=l=>({device:"on this device",pack:"with the offline speech pack",cloud:`via ${cvCloudName()}`}[l]||"by typing");
  const lines=[[dev||pack?"shield":on?"globe":"alert",`Translating ${tr}.`]];
  if(cvMicOk())lines.push([hm==="cloud"||ht==="cloud"?"globe":hm&&ht?"shield":"alert",hm===ht?`Listening ${hear(hm)}.`:`Listening: ${esc(langName(me))} ${hear(hm)}, ${esc(langName(th))} ${hear(ht)}.`]);
  else lines.push(["info","This browser can't use the microphone, so type instead."]);
  const v=[me,th].filter(l=>TTS.ok&&!canSpeak(l));if(v.length&&TTS.voices.length)lines.push(["info",`No ${v.map(langName).map(esc).join(" or ")} voice on this device, so that side is text only.`]);
  if(!on)lines.unshift(["alert","You're offline."]);
  el.innerHTML=lines.map(([i,t])=>`<div class="cv-line">${ic(i,"sm")}<span>${t}</span></div>`).join("");
  /* Offer the downloads that would take Google out of it. */
  const want=[];if(cvMicOk()&&[me,th].some(l=>aiWhisperLang(l))&&!aiHasModel(AI_WHISPER)&&(hm!=="device"||ht!=="device"))want.push(aiPack("speech"));
  if(!dev){const s=aiSuggest(me,th);if(s)want.push(s)}
  offer.innerHTML=on&&want.length?`<div class="ai-list">${want.map(p=>`<div class="ai-row" data-pack="${p.id}"><div class="b"><div class="t">${esc(p.name)}</div><div class="d">${esc(p.desc)} · ${p.mb>=1000?(p.mb/1000).toFixed(1)+" GB":p.mb+" MB"}</div><div class="bar ai-bar" ${AI.busy.has(p.id)?"":"hidden"}><i style="width:2%"></i></div></div><button type="button" class="btn xs" data-ai-dl="${p.id}" ${AI.busy.has(p.id)?"disabled":""}>${ic("download","sm")} ${AI.busy.has(p.id)?"Downloading…":"Get it for offline"}</button></div>`).join("")}</div>`:""}

function openConverse(){const t=curTrip(),pref=tripLangPref(t);
  CV.me="en";CV.them=pref!=="en"?pref:(t&&tripLang(t))||"hi";CV.turns=[];CV.flip=false;
  const opt=sel=>[["en","English"],...langOpts()].map(([k,n])=>`<option value="${k}" ${k===sel?"selected":""}>${esc(n)}</option>`).join("");
  const mic=(side,lbl)=>cvMicOk()?`<button type="button" class="cv-mic" data-side="${side}" aria-label="${lbl}: speak">${ic("mic")}<span>${lbl}</span></button>`:"";
  const ov=sheet({title:`${ic("mic")} Conversation`,help:"converse",cls:"cv",onClose:()=>{cvStop();if(TTS.ok)speechSynthesis.cancel();CV.ov=null},
    body:`<div class="cv-face" id="cvFaceWrap" hidden><div class="cv-face-in" id="cvFace"></div>${mic("them","Them")}</div>
      <div class="cv-pair"><label class="cv-l"><span>You</span><select id="cvMe" aria-label="Your language">${opt(CV.me)}</select></label>
        <button type="button" class="ibtn" id="cvSwap" aria-label="Swap languages" title="Swap">${ic("swap","sm")}</button>
        <label class="cv-l"><span>Them</span><select id="cvThem" aria-label="Their language">${opt(CV.them)}</select></label></div>
      <div class="cv-st small" id="cvSt"></div><div id="cvOffer"></div>
      <div class="cv-log" id="cvLog" aria-live="polite"></div>
      <div class="cv-type"><input id="cvTx" placeholder="Or type here" aria-label="Type a line" autocomplete="off"><button class="btn xs" data-send="me">As you</button><button class="btn xs" data-send="them">As them</button></div>`,
    foot:`<label class="cv-opt"><input type="checkbox" id="cvSpk" ${S.settings?.cvSpeak!==false?"checked":""}> Read aloud</label><label class="cv-opt"><input type="checkbox" id="cvFlip"> Face to face</label><span class="sp"></span>
      <div class="cv-mics">${mic("me","You")}<span class="cv-them-mic">${mic("them","Them")}</span></div>`});
  CV.ov=ov;cvPaint();cvCheck();
  const relang=()=>{CV.me=$("#cvMe",ov).value;CV.them=$("#cvThem",ov).value;cvStop();cvCheck();cvFocus(CV.turns.at(-1))};
  $("#cvMe",ov).onchange=relang;$("#cvThem",ov).onchange=relang;
  $("#cvSwap",ov).onclick=()=>{const a=$("#cvMe",ov),b=$("#cvThem",ov);[a.value,b.value]=[b.value,a.value];relang()};
  $("#cvSpk",ov).onchange=e=>{cvSet("cvSpeak",e.target.checked);if(!e.target.checked&&TTS.ok)speechSynthesis.cancel()};
  $("#cvFlip",ov).onchange=e=>{CV.flip=e.target.checked;$("#cvFaceWrap",ov).hidden=!CV.flip;$(".sheet",ov).classList.toggle("flip",CV.flip);cvFocus(CV.turns.at(-1))};
  ov.addEventListener("click",e=>{const m=e.target.closest(".cv-mic");if(m){cvListen(m.dataset.side);return}const s=e.target.closest("[data-send]");if(s){cvSend(s.dataset.send);return}
    const d=e.target.closest("[data-ai-dl]");if(d){const p=aiPack(d.dataset.aiDl);if(p.mb>500&&!confirm(`${p.name} is about ${p.mb} MB. Download it now? Use Wi-Fi if you can.`))return;aiDownloadUi(p.id,ov).then(()=>cvCheck())}});
  $("#cvTx",ov).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();cvSend("me")}})}
document.addEventListener("visibilitychange",()=>{if(document.hidden){cvStop();if(TTS.ok)speechSynthesis.cancel()}});
addEventListener("online",()=>CV.ov&&(cvCheck(),cvPaint()));addEventListener("offline",()=>CV.ov&&(cvCheck(),cvPaint()));
