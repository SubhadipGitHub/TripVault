"use strict";
/* ===================== Phone to phone by QR (no network) =====================
   Sender: backup JSON -> gzip -> AES-GCM (key from a one-time code, PBKDF2) -> base64 -> numbered
   QR frames shown in a loop. Receiver: camera -> QR decode (BarcodeDetector, else jsQR) -> collect
   frames in any order -> ask for the code -> decrypt -> gunzip -> the normal restore preview
   (merge or replace). Libraries in vendor/qr are loaded only when this is used. */
const QRX={timer:null,stream:null,raf:null,frames:null,sid:"",n:0,got:null,det:null};
const QR_CHUNK=380, QR_MAGIC=[84,86,81,49]; // "TVQ1"
const QR_CODE_ABC="ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
function qrLib(name,src){if(window[name])return Promise.resolve();return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>{s.remove();rej(new Error("couldn't load the QR reader"))};document.head.append(s)})}
const qrCode=()=>{const r=crypto.getRandomValues(new Uint8Array(8));return[...r].map(x=>QR_CODE_ABC[x%QR_CODE_ABC.length]).join("").replace(/^(.{4})/,"$1-")};
const qrNorm=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
async function gz(bytes,dir){if(!window.CompressionStream)return null;const s=new Blob([bytes]).stream().pipeThrough(dir?new CompressionStream("gzip"):new DecompressionStream("gzip"));return new Uint8Array(await new Response(s).arrayBuffer())}
const b64e=u=>{let s="";for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const b64d=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
/* payload = "TVQ1" | flags(1: gzip) | salt(16) | iterations(4, LE) | AES-GCM(iv+ciphertext) */
async function qrSeal(json,code){
  const raw=new TextEncoder().encode(json),z=await gz(raw,true),body=z||raw;
  const salt=crypto.getRandomValues(new Uint8Array(16)),iter=600000,key=await Crypt.derive(qrNorm(code),salt,iter),ct=new Uint8Array(await Crypt.enc(key,body));
  const h=new Uint8Array(25);h.set(QR_MAGIC);h[4]=z?1:0;h.set(salt,5);new DataView(h.buffer).setUint32(21,iter,true);
  const out=new Uint8Array(25+ct.length);out.set(h);out.set(ct,25);return out}
async function qrOpen(bytes,code){
  if(!QR_MAGIC.every((v,i)=>bytes[i]===v))throw new Error("Not a Trip Vault transfer");
  const flags=bytes[4],salt=bytes.slice(5,21),iter=new DataView(bytes.buffer,bytes.byteOffset+21,4).getUint32(0,true);
  const key=await Crypt.derive(qrNorm(code),salt,iter),plain=new Uint8Array(await Crypt.dec(key,bytes.slice(25).buffer));
  return new TextDecoder().decode(flags&1?await gz(plain,false):plain)}
const qrFrames=(bytes,sid)=>{const s=b64e(bytes),n=Math.ceil(s.length/QR_CHUNK);return Array.from({length:n},(_,i)=>`TVQ1:${sid}:${i}:${n}:${s.slice(i*QR_CHUNK,(i+1)*QR_CHUNK)}`)};
function qrDraw(cv,text){const q=qrcode(0,"L");q.addData(text,"Byte");q.make();const m=q.getModuleCount(),quiet=4,px=Math.max(2,Math.floor(Math.min(cv.clientWidth||320,420)*devicePixelRatio/(m+quiet*2)));
  cv.width=cv.height=(m+quiet*2)*px;const x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);x.fillStyle="#000";
  for(let r=0;r<m;r++)for(let c=0;c<m;c++)if(q.isDark(r,c))x.fillRect((c+quiet)*px,(r+quiet)*px,px,px)}
function qrStop(){clearInterval(QRX.timer);QRX.timer=null;cancelAnimationFrame(QRX.raf);clearTimeout(QRX.raf);QRX.raf=null;QRX.stream?.getTracks().forEach(t=>t.stop());QRX.stream=null}

/* ---------- send ---------- */
function openSendQR(){
  const t=curTrip();
  const ov=sheet({title:`${ic("share")} Send by QR`,body:`<p class="small muted">On the other phone open Trip Vault → Backup → <b>Receive by QR</b>, then point its camera at this screen.</p>
   <div class="fg mt">${Sel("What to send","qrScope",t?"trip":"all",[...(t?[["trip",`This trip · ${t.name}`]]:[]),["all",`All ${S.trips.length} trips`]],{full:1})}</div>
   <label class="row mt" style="cursor:pointer"><input type="checkbox" id="qrFiles"> <span style="font-size:12.5px;color:var(--tx)">Include attachments and photos <span class="dim">(much slower: a 1 MB photo takes several minutes)</span></span></label>
   <div class="small dim mt" id="qrEst"></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="qrGo">${ic("share","sm")} Start</button>`,onClose:qrStop});
  const est=async()=>{const o=await buildBackup($("[name=qrScope]",ov).value==="trip"?t.id:null,{files:$("#qrFiles",ov).checked,settings:false});const j=JSON.stringify(o);
    $("#qrEst",ov).textContent=`About ${Math.max(1,Math.ceil(j.length*(window.CompressionStream?.35:1.4)/QR_CHUNK))} QR frames. Roughly ${Math.max(5,Math.ceil(j.length*(window.CompressionStream?.35:1.4)/QR_CHUNK/3))} seconds if the camera catches each one first time.`};
  ov.addEventListener("change",est);est();
  $("#qrGo",ov).onclick=async()=>{const b=$("#qrGo",ov);b.disabled=true;b.innerHTML=`${ic("clock","sm")} Encrypting…`;
    try{await qrLib("qrcode","vendor/qr/qrcode.js");
      const o=await buildBackup($("[name=qrScope]",ov).value==="trip"?t.id:null,{files:$("#qrFiles",ov).checked,settings:false});
      const code=qrCode(),bytes=await qrSeal(JSON.stringify(o),code),sid=b64e(crypto.getRandomValues(new Uint8Array(3))).replace(/[^A-Za-z0-9]/g,"x");
      ov.remove();showSendQR(qrFrames(bytes,sid),code,o)}
    catch(e){toast("Couldn't start: "+esc(e.message),"bad");b.disabled=false;b.innerHTML=`${ic("share","sm")} Start`}};
}
function showSendQR(frames,code,o){
  const ov=sheet({title:`${ic("share")} Sending ${o.trips.length} trip${o.trips.length>1?"s":""}`,body:`
   <div class="qrs"><canvas id="qrCv" aria-label="QR code frame"></canvas></div>
   <div class="row" style="justify-content:center;gap:10px;margin-top:8px"><span class="small muted" id="qrPos"></span><button class="btn xs" id="qrSpd">Slower</button><button class="btn xs" id="qrPause">Pause</button></div>
   <div class="qrcode-box"><small>Code to type on the other phone</small><b class="mono" data-copy="${code}">${code}</b></div>
   <div class="small dim" style="text-align:center">${frames.length} frames repeat until the other phone has them all. Keep this screen bright and steady.</div>`,
   foot:`<button class="btn pri" data-close>Done</button>`,onClose:qrStop});
  const cv=$("#qrCv",ov);let i=0,ms=300;const show=()=>{if(!document.body.contains(cv)){qrStop();return}qrDraw(cv,frames[i]);$("#qrPos",ov).textContent=`Frame ${i+1} of ${frames.length}`;i=(i+1)%frames.length};
  const run=()=>{clearInterval(QRX.timer);QRX.timer=frames.length>1?setInterval(show,ms):null};show();run();
  $("#qrSpd",ov).onclick=e=>{ms=ms===300?700:300;e.target.textContent=ms===300?"Slower":"Faster";run()};
  $("#qrPause",ov).onclick=e=>{if(QRX.timer){clearInterval(QRX.timer);QRX.timer=null;e.target.textContent="Resume"}else{run();e.target.textContent="Pause"}};
  if("wakeLock"in navigator)navigator.wakeLock.request("screen").then(l=>{const r=()=>l.release().catch(()=>{});ov.addEventListener("click",e=>{if(e.target.closest("[data-close]"))r()})}).catch(()=>{});
}

/* ---------- receive ---------- */
function qrIngest(text){ // returns true when complete
  const m=/^TVQ1:([^:]+):(\d+):(\d+):(.*)$/s.exec(text||"");if(!m)return false;const[,sid,i,n,chunk]=m;
  if(QRX.sid!==sid){QRX.sid=sid;QRX.n=+n;QRX.got=new Array(+n).fill(null)}
  if(QRX.got[+i]==null){QRX.got[+i]=chunk;QRX.onProgress?.()}
  return QRX.got.every(x=>x!=null)}
async function openReceiveQR(){
  QRX.sid="";QRX.got=null;QRX.n=0;
  const ov=sheet({title:`${ic("camera")} Receive by QR`,body:`<div class="qrv"><video id="qrVid" playsinline muted></video><div class="qrv-frame"></div></div>
   <div class="small mt" id="qrSt" style="text-align:center">Starting the camera…</div><div class="qrdots" id="qrDots"></div>
   <div class="small dim mt" style="text-align:center">Point the camera at the QR codes on the other phone. Frames can arrive in any order.</div>`,
   foot:`<button class="btn" data-close>Cancel</button>`,onClose:qrStop});
  const st=$("#qrSt",ov),dots=$("#qrDots",ov);
  QRX.onProgress=()=>{const k=QRX.got.filter(x=>x!=null).length;st.textContent=`Received ${k} of ${QRX.n} frames`;
    dots.innerHTML=QRX.got.map(x=>`<i class="${x!=null?"on":""}"></i>`).join("")};
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("this browser can't use the camera here");
    const useDet=!!window.BarcodeDetector&&(await BarcodeDetector.getSupportedFormats?.().catch(()=>[])||[]).includes("qr_code");
    if(useDet)QRX.det=new BarcodeDetector({formats:["qr_code"]});else await qrLib("jsQR","vendor/qr/jsQR.js");
    QRX.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(!document.body.contains(ov)){qrStop();return}
    const v=$("#qrVid",ov);v.srcObject=QRX.stream;await v.play();st.textContent="Looking for QR codes…";
    const cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
    const tick=async()=>{if(!QRX.stream||!document.body.contains(ov))return;let txt=null;
      try{if(useDet){const r=await QRX.det.detect(v);txt=r[0]?.rawValue}
        else if(v.videoWidth){const sc=Math.min(1,800/Math.max(v.videoWidth,v.videoHeight));cv.width=v.videoWidth*sc|0;cv.height=v.videoHeight*sc|0;cx.drawImage(v,0,0,cv.width,cv.height);
          txt=jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height,{inversionAttempts:"dontInvert"})?.data}}catch(e){}
      if(txt&&qrIngest(txt)){qrStop();ov.remove();qrFinish();return}
      QRX.raf=setTimeout(tick,(useDet?25:20)+Math.random()*50)}; // jitter so sampling can't stay in step with the sender's frame changes
    tick();
  }catch(e){st.innerHTML=`<span style="color:var(--bad)">${esc(e.name==="NotAllowedError"?"Camera permission was denied. Allow it in the browser's site settings and try again.":"Camera unavailable: "+(e.message||e))}</span>`}
}
function promptCode(){return new Promise(res=>{let done=false;
  const ov=sheet({title:`${ic("key")} Enter the code`,body:`<p class="small muted">All ${QRX.n} frames received. Type the code shown under the QR codes on the other phone.</p><label for="qrCodeIn">Code</label><input id="qrCodeIn" class="mono" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="ABCD-2345" style="text-transform:uppercase;font-size:20px;letter-spacing:.12em">`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="qrCodeOk">${ic("unlock","sm")} Unlock</button>`,onClose:()=>{if(!done)res(null)}});
  const i=$("#qrCodeIn",ov),go=()=>{if(qrNorm(i.value).length<8){toast("The code has 8 characters","bad");return}done=true;ov.remove();res(i.value)};
  $("#qrCodeOk",ov).onclick=go;i.addEventListener("keydown",e=>{if(e.key==="Enter")go()});setTimeout(()=>i.focus(),50)})}
async function qrFinish(){
  const bytes=b64d(QRX.got.join(""));
  for(;;){const code=await promptCode();if(code==null){toast("Transfer cancelled","info");return}
    try{const json=await qrOpen(bytes,code);previewImport(new File([json],"phone-transfer.json",{type:"application/json"}));return}
    catch(e){toast(/Not a Trip Vault/.test(e.message)?esc(e.message):"That code didn't work. Check it on the other phone","bad")}}
}
