"use strict";
/* ===================== Conversation: live voice translation =====================
   Two people take turns at the mic. The browser turns speech into text, translates it on the device with its
   built-in translator where it has one, and reads the translation aloud with an on-device voice. Where the
   browser can't translate on the device, every turn gets a one-tap Google Translate hand-off instead.
   Turns live only while the sheet is open: nothing is stored or sent by Trip Vault. The one-time notice before
   the first mic use says what the browser's own speech service may do with the audio. */
const SR=typeof window!=="undefined"?(window.SpeechRecognition||window.webkitSpeechRecognition||null):null;
const CV={rec:null,tr:new Map(),turns:[],ov:null,me:"en",them:"hi",flip:false,busy:false};
const cvSet=async(k,v)=>{S.settings={...S.settings,[k]:v};try{await DB.put("meta",{k:"settings",v:S.settings})}catch(e){}};
const cvCodes=l=>[...new Set([l==="en"?"en":l,LANG_META[l]?.gt].filter(Boolean))];
const cvDir=l=>LANG_RTL.has(l)?'dir="rtl"':"";

/* ---------- On-device translation (the browser's Translator API) ---------- */
async function cvAvail(from,to){if(!("Translator"in self))return"unavailable";
  for(const s of cvCodes(from))for(const t of cvCodes(to)){try{const a=await Translator.availability({sourceLanguage:s,targetLanguage:t});if(a!=="unavailable")return a}catch(e){}}
  return"unavailable"}
/* A translator for the pair, created once. Creating one may download the language pack, which needs a tap, so it is first called from a mic or send button. */
function cvTranslator(from,to){if(!("Translator"in self)||from===to)return Promise.resolve(null);const key=from+">"+to;if(CV.tr.has(key))return CV.tr.get(key);
  const p=(async()=>{for(const s of cvCodes(from))for(const t of cvCodes(to)){let a;try{a=await Translator.availability({sourceLanguage:s,targetLanguage:t})}catch(e){continue}
      if(a==="unavailable")continue;
      try{return await Translator.create({sourceLanguage:s,targetLanguage:t,monitor(m){m.addEventListener("downloadprogress",e=>cvStatus(`Getting ${esc(langName(to))} for offline use… ${Math.round((e.loaded||0)*100)}%`))}})}catch(e){return null}}
    return null})();
  CV.tr.set(key,p);p.then(r=>{if(!r)CV.tr.delete(key);else cvStatus()});return p}
async function cvTranslate(text,from,to){if(from===to)return text;const tr=await cvTranslator(from,to);if(!tr)return null;try{return await tr.translate(text)}catch(e){return null}}

/* ---------- Speech recognition ---------- */
/* Ask for recognition on the device where the browser offers it for this language. */
async function cvLocal(tag){try{if(typeof SR?.available==="function"){const a=await SR.available({langs:[tag],processLocally:true});return a==="available"}}catch(e){}return false}
/* Abandon listening (sheet closed, app hidden, languages changed): a half-heard line is dropped. */
function cvStop(){const r=CV.rec;CV.rec=null;if(r){r.onend=r.onresult=r.onerror=null;try{r.abort()}catch(e){}}
  const n=CV.turns.length;CV.turns=CV.turns.filter(t=>!t.live);if(CV.ov){$$(".cv-mic.on",CV.ov).forEach(b=>b.classList.remove("on"));if(CV.turns.length!==n)cvPaint()}}
/* Tap a mic to listen; tap again (either mic) to finish early. It also stops by itself when the speaker pauses. */
async function cvListen(side){if(!SR)return;if(CV.rec){try{CV.rec.stop()}catch(e){cvStop()}return}
  if(!S.settings?.cvMicOk&&!(await cvConsent()))return;
  const from=side==="me"?CV.me:CV.them,to=side==="me"?CV.them:CV.me,tag=speechTag(from);
  cvTranslator(from,to); // start the download (if any) while the tap still counts
  const r=new SR();r._side=side;r.lang=tag;r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  if(CV.busy)return;CV.busy=true;try{if(await cvLocal(tag))try{r.processLocally=true}catch(e){}}finally{CV.busy=false}
  if(!CV.ov)return;
  const turn={side,from,to,text:"",live:true,out:undefined};CV.turns.push(turn);cvPaint();
  r.onresult=e=>{let fin="",tmp="";for(let i=0;i<e.results.length;i++){const x=e.results[i];if(x.isFinal)fin+=x[0].transcript;else tmp+=x[0].transcript}
    turn.text=(fin+" "+tmp).trim();cvPaintTurn(turn)};
  r.onerror=e=>{const m={"not-allowed":"Microphone blocked. Allow it for this site in the browser's settings.","service-not-allowed":"Microphone blocked. Allow it for this site in the browser's settings.",
      "no-speech":"Didn't catch that. Tap and try again.","language-not-supported":`This browser can't listen in ${esc(langName(from))}. Type it below instead.`,
      "network":"Listening needs a connection in this browser. Type it below instead.","audio-capture":"No microphone found."}[e.error];
    if(m)toast(m,e.error==="no-speech"?"info":"bad")};
  r.onend=()=>{if(CV.rec!==r)return;CV.rec=null;$$(".cv-mic.on",CV.ov).forEach(b=>b.classList.remove("on"));turn.live=false;
    if(!turn.text){CV.turns.splice(CV.turns.indexOf(turn),1);cvPaint();return}cvFinish(turn)};
  CV.rec=r;$$(`.cv-mic[data-side="${side}"]`,CV.ov).forEach(b=>b.classList.add("on"));
  try{r.start()}catch(e){CV.rec=null;CV.turns.pop();cvPaint();toast("Couldn't start the microphone","bad")}}
function cvConsent(){return new Promise(res=>{let done=false;
  const ov=sheet({title:`${ic("mic")} Before you speak`,body:`<div class="note">${ic("info")}<div>
      <p style="margin:0 0 6px">Your browser turns speech into text. Unless the language is installed on this device, Chrome sends the audio to Google and Safari to Apple to do this.</p>
      <p style="margin:0">Trip Vault doesn't record, keep or send anything from the conversation. Where your browser can, translation runs on this device.</p></div></div>`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="cvOk">${ic("mic","sm")} Use the microphone</button>`,onClose:()=>{if(!done)res(false)}});
  $("#cvOk",ov).onclick=async()=>{done=true;ov.remove();await cvSet("cvMicOk",true);res(true)}})}

/* ---------- A finished turn: translate, show, read aloud ---------- */
async function cvFinish(turn){turn.out=null;turn.wait=true;cvPaintTurn(turn);
  const out=await cvTranslate(turn.text,turn.from,turn.to);turn.wait=false;turn.out=out;cvPaintTurn(turn);cvFocus(turn);
  if(out&&S.settings?.cvSpeak!==false)speak(out,turn.to)}
function cvSend(side){const inp=$("#cvTx",CV.ov),v=inp.value.trim();if(!v){inp.focus();return}inp.value="";
  const from=side==="me"?CV.me:CV.them,to=side==="me"?CV.them:CV.me;const turn={side,from,to,text:v,live:false};CV.turns.push(turn);cvPaint();cvFinish(turn)}

/* ---------- Drawing ---------- */
const cvTurnHtml=(t,i)=>{const gt=translateUrl(t.text,t.to);
  return`<div class="cv-t ${t.side}" data-i="${i}"><div class="cv-who">${t.side==="me"?"You":"Them"} · ${esc(langName(t.from))}</div>
    <div class="cv-src" lang="${t.from}" ${cvDir(t.from)}>${t.text?esc(t.text):`<span class="muted">Listening…</span>`}</div>
    ${t.live?"":t.wait?`<div class="cv-out muted">Translating…</div>`:t.out?`<div class="cv-out" lang="${t.to}" ${cvDir(t.to)}>${esc(t.out)}</div>`:""}
    ${t.live||t.wait?"":`<div class="cv-act">${t.out?sayBtn(t.out,t.to,"btn xs")+`<button class="btn xs" data-copy="${esc(t.out)}">${ic("copy","sm")} Copy</button>`:""}<a class="btn xs${t.out?"":" pri"}" href="${esc(gt)}" target="_blank" rel="noopener noreferrer">${ic("globe","sm")} ${t.out?"Google Translate":`Translate to ${esc(langName(t.to))}`}</a></div>`}</div>`};
function cvPaint(){const box=$("#cvLog",CV.ov);if(!box)return;
  box.innerHTML=CV.turns.length?CV.turns.map(cvTurnHtml).join(""):`<div class="cv-empty muted">${SR?`Tap <b>You</b> and speak, then let them tap <b>Them</b> to reply.`:`Type what you want to say and send it as you or as them.`}</div>`;
  box.scrollTop=box.scrollHeight;cvFocus(CV.turns.at(-1))}
function cvPaintTurn(t){const i=CV.turns.indexOf(t),el=$(`.cv-t[data-i="${i}"]`,CV.ov);if(!el)return cvPaint();el.outerHTML=cvTurnHtml(t,i);const box=$("#cvLog",CV.ov);box.scrollTop=box.scrollHeight;if(t.side==="them"||t.out)cvFocus(t)}
/* Face to face: the panel facing them shows the latest line in their language. */
function cvFocus(t){const f=$("#cvFace",CV.ov);if(!f)return;const line=!t?"":t.side==="them"?t.text:(t.out||"");
  f.innerHTML=line?`<div lang="${CV.them}" ${cvDir(CV.them)}>${esc(line)}</div>`:`<div class="muted">${esc(langName(CV.them))}</div>`}
function cvStatus(msg){const el=$("#cvSt",CV.ov);if(el&&msg){el.innerHTML=msg;return}if(el)cvCheck()}
async function cvCheck(){const el=$("#cvSt",CV.ov);if(!el)return;const me=CV.me,th=CV.them;
  if(me===th){el.innerHTML=`${ic("info","sm")}<span>Pick two different languages.</span>`;return}
  const[a,b]=await Promise.all([cvAvail(me,th),cvAvail(th,me)]);if(me!==CV.me||th!==CV.them)return;
  const rank={available:3,downloading:2,downloadable:1,unavailable:0},worst=rank[a]<rank[b]?a:b;
  let msg=worst==="available"?[ic("shield","sm"),"Translates on this device."]
    :worst!=="unavailable"?[ic("download","sm"),`Translates on this device. ${esc(langName(th))} downloads the first time you speak.`]
    :[ic("info","sm"),`This browser can't translate ${esc(langName(me))} ↔ ${esc(langName(th))} by itself. Each line gets a Google Translate button.`];
  if(!SR)msg[1]+=` Listening isn't supported here, so type instead.`;
  const v=[me,th].filter(l=>TTS.ok&&!canSpeak(l));if(v.length&&TTS.voices.length)msg[1]+=` No ${v.map(langName).map(esc).join(" or ")} voice on this device, so that side is text only.`;
  el.innerHTML=`${msg[0]}<span>${msg[1]}</span>`}

function openConverse(){const t=curTrip(),pref=tripLangPref(t);
  CV.me="en";CV.them=pref!=="en"?pref:(t&&tripLang(t))||"hi";CV.turns=[];CV.flip=false;
  const opt=sel=>[["en","English"],...langOpts()].map(([k,n])=>`<option value="${k}" ${k===sel?"selected":""}>${esc(n)}</option>`).join("");
  const mic=(side,lbl)=>SR?`<button type="button" class="cv-mic" data-side="${side}" aria-label="${lbl}: speak">${ic("mic")}<span>${lbl}</span></button>`:"";
  const ov=sheet({title:`${ic("mic")} Conversation`,help:"converse",cls:"cv",onClose:()=>{cvStop();if(TTS.ok)speechSynthesis.cancel();CV.ov=null},
    body:`<div class="cv-face" id="cvFaceWrap" hidden><div class="cv-face-in" id="cvFace"></div>${mic("them","Them")}</div>
      <div class="cv-pair"><label class="cv-l"><span>You</span><select id="cvMe" aria-label="Your language">${opt(CV.me)}</select></label>
        <button type="button" class="ibtn" id="cvSwap" aria-label="Swap languages" title="Swap">${ic("swap","sm")}</button>
        <label class="cv-l"><span>Them</span><select id="cvThem" aria-label="Their language">${opt(CV.them)}</select></label></div>
      <div class="cv-st small" id="cvSt"></div>
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
  ov.addEventListener("click",e=>{const m=e.target.closest(".cv-mic");if(m){cvListen(m.dataset.side);return}const s=e.target.closest("[data-send]");if(s)cvSend(s.dataset.send)});
  $("#cvTx",ov).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();cvSend("me")}})}
document.addEventListener("visibilitychange",()=>{if(document.hidden){cvStop();if(TTS.ok)speechSynthesis.cancel()}});
