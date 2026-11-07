"use strict";
/* ===================== Show-at-gate pass =====================
   Full-screen, high-contrast view of a flight or train for counters and scanners:
   big PNR, seat, terminal, travellers and the attached ticket image. Keeps the
   screen awake while open (Screen Wake Lock), and closes when the vault locks. */
const PASS={ov:null,lock:null,list:[],i:0};
const passList=t=>transports(t).filter(it=>itemEvents(it).some(e=>e.main));
const nextPassIdx=L=>{const now=Date.now();return L.findIndex(it=>itemEvents(it).find(e=>e.main).eu>now)};
function openPass(id){
  const t=curTrip();if(!t)return;const L=passList(t);
  if(!L.length){toast("Add a flight or train to show a pass","bad");return}
  let i=id?L.findIndex(x=>x.id===id):nextPassIdx(L);if(i<0)i=id?0:L.length-1;
  closePass();closeAllSheets();PASS.list=L;PASS.i=i;
  const ov=document.createElement("div");ov.className="passv";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Boarding pass");ov.tabIndex=-1;
  document.body.append(ov);PASS.ov=ov;document.documentElement.classList.add("pass-open");paintPass();ov.focus();wakePass(true);
  ov.addEventListener("click",e=>{
    if(e.target.closest("[data-pclose]")){closePass();return}
    const n=e.target.closest("[data-pnav]");if(n){PASS.i=Math.max(0,Math.min(PASS.list.length-1,PASS.i+(+n.dataset.pnav)));paintPass();ov.scrollTo(0,0);return}
    const f=e.target.closest("[data-pfile]");if(f)openBlob(S.files.find(x=>x.id===f.dataset.pfile))});
}
function paintPass(){
  const it=PASS.list[PASS.i];if(!it||!PASS.ov)return;const ev=itemEvents(it),m=ev.find(e=>e.main),b=ev[0];
  const fl=it.kind==="flight",a=splitLT(it.dep),z=splitLT(it.arr),city=c=>AP[c]?.city||"";
  const files=S.files.filter(f=>(f.itemIds||[]).includes(it.id)),imgs=files.filter(f=>/^image\//.test(f.type)),docs=files.filter(f=>!/^image\//.test(f.type));
  const cell=(l,v)=>v?`<div><small>${l}</small><b>${esc(v)}</b></div>`:"";
  const n=PASS.list.length;
  PASS.ov.innerHTML=`<div class="pv-in">
   <div class="pv-top"><button class="pv-btn" data-pclose aria-label="Close pass">${ic("x")}</button><span class="pv-pos">${n>1?`${PASS.i+1} of ${n}`:""}</span>
    ${n>1?`<button class="pv-btn" data-pnav="-1" aria-label="Previous" ${PASS.i?"":"disabled"}>${ic("back")}</button><button class="pv-btn" data-pnav="1" aria-label="Next" ${PASS.i<n-1?"":"disabled"}>${ic("arrow")}</button>`:""}</div>
   <div class="pv-card">
    <div class="pv-k">${ic(fl?"plane":"train","sm")} ${esc(fl?[it.flightNo,it.airline].filter(Boolean).join(" · "):[it.trainNo,it.trainName].filter(Boolean).join(" · "))}</div>
    <div class="pv-route"><b>${esc(it.from||"—")}</b><span class="pv-ln"></span><b>${esc(it.to||"—")}</b></div>
    <div class="pv-cities"><span>${esc(fl?city(it.from):it.fromName||"")}</span><span>${esc(fl?city(it.to):it.toName||"")}</span></div>
    <div class="pv-grid">${cell("Date",fmtD(a.d,1))}${cell("Departs",a.t)}${cell("Arrives",z.t?z.t+(z.d&&z.d!==a.d?` (+${dayDiff(a.d,z.d)})`:""):"")}${cell(fl?"Terminal":"Class",fl?it.terminal:it.cls)}${cell(fl?"Seat":"Coach / berth",it.seat)}</div>
    ${it.ref?`<div class="pv-pnr"><small>${fl?"PNR / booking ref":"PNR"} · tap to copy</small><b class="mono" data-copy="${esc(it.ref)}">${esc(it.ref)}</b></div>`:`<div class="pv-pnr pv-miss"><small>No PNR saved for this booking</small></div>`}
    ${it.names?.length?`<div class="pv-names">${ic("user","sm")} ${esc(it.names.join(", "))}</div>`:""}
    ${b?.buf&&m.su>Date.now()?`<div class="pv-be">${ic("clock","sm")} Be at ${esc(fl?(it.from||"the airport")+(it.terminal?" T"+it.terminal:""):(it.fromName||it.from||"the station"))} by <b>${b.s.slice(11)}</b> ${esc(tzShort(b.tz))} time</div>`:""}
   </div>
   ${imgs.map(f=>`<img class="pv-img" src="${photoUrl(f.id)}" alt="${esc(f.name)}">`).join("")}
   ${docs.map(f=>`<button class="pv-file" data-pfile="${f.id}">${ic("file","sm")} Open ${esc(f.name)}</button>`).join("")}
   ${files.length?"":`<div class="pv-hint">Attach your boarding pass or e-ticket to this booking (open it from the plan) and it shows up here, ready to scan.</div>`}
   <div class="pv-foot">Screen stays on while this is open. Turn your brightness up for scanners.</div></div>`;
}
async function wakePass(on){try{
  if(on&&PASS.ov&&"wakeLock"in navigator&&document.visibilityState==="visible"){PASS.lock=await navigator.wakeLock.request("screen")}
  else if(!on&&PASS.lock){const l=PASS.lock;PASS.lock=null;await l.release()}}catch(e){/* wake lock is best-effort */}}
function closePass(){if(!PASS.ov)return;PASS.ov.remove();PASS.ov=null;PASS.list=[];document.documentElement.classList.remove("pass-open");wakePass(false)}
document.addEventListener("visibilitychange",()=>{if(PASS.ov&&document.visibilityState==="visible")wakePass(true)});
