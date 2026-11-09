"use strict";
/* ===================== Lock screen, passphrases, settings ===================== */
const hasCrypto=!!(window.crypto&&crypto.subtle);
function passScore(p){let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(p.length>=16)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p)||/\s/.test(p))s++;return Math.min(4,Math.floor(s*4/6+.3))}
const PASS_LBL=["Too weak","Weak","Okay","Strong","Excellent"],PASS_COL=["var(--bad)","var(--bad)","var(--warn)","var(--ok)","var(--ok)"];

/* Ask for a new passphrase (with confirmation). Resolves with the passphrase or null. */
function promptNewPass({title="Set a passphrase",ok="Encrypt my vault",current=false,note=""}={}){
  return new Promise(res=>{let done=false;
    const ov=sheet({title:`${ic("key")} ${title}`,body:`
     ${current?`<div><label>Current passphrase</label><input type="password" id="pwOld" autocomplete="current-password"></div>`:""}
     <div class="${current?"mt":""}"><label>${current?"New passphrase":"Passphrase"}</label><input type="password" id="pw1" autocomplete="new-password" placeholder="At least 8 characters — a few random words works well"><div class="strength"><i id="pwBar"></i></div><div class="small dim" id="pwLbl"></div></div>
     <div class="mt"><label>Repeat passphrase</label><input type="password" id="pw2" autocomplete="new-password"></div>
     <div class="note warn mt">${ic("alert")}<div>${note||"<b>There is no “forgot passphrase”.</b> Everything is encrypted on this device with a key made from it. Lose it and the data can't be opened, only restored from a backup."}</div></div>
     <label class="row mt" style="cursor:pointer;margin-bottom:0"><input type="checkbox" id="pwAck"> <span style="font-size:12.5px;color:var(--tx)">I understand it can't be recovered</span></label><div class="small" style="color:var(--bad);min-height:18px;margin-top:6px" id="pwErr"></div>`,
     foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="pwGo">${ic("lock","sm")} ${ok}</button>`,onClose:()=>{if(!done)res(null)}});
    const p1=$("#pw1",ov),upd=()=>{const sc=p1.value?passScore(p1.value):0;$("#pwBar",ov).style.cssText=`width:${p1.value?(sc+1)*20:0}%;background:${PASS_COL[sc]}`;$("#pwLbl",ov).textContent=p1.value?PASS_LBL[sc]:""};p1.addEventListener("input",upd);
    $("#pwGo",ov).onclick=async()=>{const err=m=>$("#pwErr",ov).textContent=m;
      if(current&&!(await Vault.unlock($("#pwOld",ov).value)))return err("Current passphrase is wrong.");
      if(p1.value.length<8)return err("Use at least 8 characters.");if(p1.value!==$("#pw2",ov).value)return err("The two passphrases don't match.");if(!$("#pwAck",ov).checked)return err("Please confirm you understand.");
      done=true;ov.remove();res(p1.value)}})}
function promptPass(title,ok="Continue"){
  return new Promise(res=>{let done=false;const ov=sheet({title:`${ic("key")} ${title}`,body:`<label>Passphrase</label><input type="password" id="pwX" autocomplete="current-password"><div class="small" style="color:var(--bad);min-height:18px;margin-top:6px" id="pwE"></div>`,foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="pwOk">${ok}</button>`,onClose:()=>{if(!done)res(null)}});
    const go=()=>{done=true;const v=$("#pwX",ov).value;ov.remove();res(v)};$("#pwOk",ov).onclick=go;$("#pwX",ov).addEventListener("keydown",e=>{if(e.key==="Enter")go()})})}

async function setupLock(){
  if(!hasCrypto){toast("This browser can't encrypt (needs https or localhost).","bad");return}
  const p=await promptNewPass();if(!p)return;
  toast("Encrypting your vault…","info");await new Promise(r=>setTimeout(r,60));
  try{await Vault.enable(p);armIdle();$$(".ov").forEach(o=>o.remove());render();toast("Vault is now encrypted and locks itself when idle")}catch(e){toast("Couldn't encrypt: "+e.message,"bad")}
}
async function changeLock(){
  const p=await promptNewPass({title:"Change passphrase",ok:"Change passphrase",current:true});if(!p)return;
  toast("Re-encrypting…","info");await new Promise(r=>setTimeout(r,60));
  try{await Vault.disable();await Vault.enable(p);armIdle();toast("Passphrase changed")}catch(e){toast("Failed: "+e.message,"bad")}
}
async function removeLock(){
  const p=await promptPass("Enter your passphrase to remove the lock","Remove lock");if(p==null)return;
  if(!(await Vault.unlock(p))){toast("Wrong passphrase","bad");return}
  if(!(await gate({title:"Remove encryption?",plan:["Your data is rewritten to this browser without encryption","The lock screen and auto-lock stop"],irreversible:"Anyone with access to this browser profile can then read your vault.",ok:"Remove lock"})))return;
  await Vault.disable();clearTimeout(_idleT);$$(".ov").forEach(o=>o.remove());render();toast("Encryption removed")
}
async function wipeAll(){if(typeof gsUnstash==="function")gsUnstash();for(const st of[...DATA_STORES,"meta"])await DB.clear(st);location.reload()}

function showLock(){
  document.getElementById("lock")?.remove();$("#app").innerHTML="";$("#tsName").textContent="Locked";$("#tsMeta").textContent="";$("#lockBtn").classList.add("hide");
  const d=document.createElement("div");d.className="lockscr";d.id="lock";d.setAttribute("role","dialog");d.setAttribute("aria-label","Vault locked");
  d.innerHTML=`<div class="lockbox rise"><div class="seal">${ic("lock","xl")}</div><h1>Trip Vault</h1><p class="muted" style="margin-top:6px">Your vault is locked. Enter your passphrase to open it.</p>
   <form id="lkf"><div><label for="lkp" class="sr">Passphrase</label><input id="lkp" type="password" autocomplete="current-password" placeholder="Passphrase"></div><button class="btn pri lg" style="justify-content:center">${ic("unlock")} Unlock</button><div class="err" id="lke" role="alert"></div></form>
   <p class="small dim">Forgot it? It can't be recovered. You can erase this device's vault and restore from a backup.</p><button class="btn xs ghost" id="lkw" type="button">Erase this device's vault…</button>${emgHas()?`<div class="mt"><button class="btn" id="lkEmg" type="button">${ic("heart","sm")} Emergency info</button></div>`:""}</div>`;
  document.body.append(d);const f=$("#lkf",d),inp=$("#lkp",d);inp.focus();
  f.onsubmit=async e=>{e.preventDefault();if(!inp.value)return;const b=f.querySelector("button");b.disabled=true;$("#lke",d).textContent="";
    const ok=await Vault.unlock(inp.value);
    if(!ok){await new Promise(r=>setTimeout(r,500));$("#lke",d).textContent="That passphrase didn't work.";b.disabled=false;inp.select();return}
    inp.value="";await loadAll();dropUiLang();applyTheme();d.remove();S.view=S.meta.view||"today";S.sub=S.meta.sub||"bookings";S.psub=S.meta.psub||"days";if(S.sub==="ideas"){S.view="plan";S.psub="ideas";S.sub="bookings"}armIdle();render();AV.intro(curTrip());gsBoot();consumeLaunch()};
  $("#lkEmg",d)?.addEventListener("click",()=>openEmgCard());
  $("#lkw",d).onclick=async()=>{if(confirm("Erase everything stored by Trip Vault in this browser? This cannot be undone. Restore later from a backup file."))await wipeAll()};
}

/* ===================== Settings ===================== */
/* Settings: one sheet with tabs. openSettings(tab) opens a given tab (general, apps, sync, backup, security, privacy).
   The day planner is a section of General and the emergency card a section of Security; their old tab names still work. */
const SET_TABS=[["general","sliders","General"],["apps","phone","Apps"],["sync","share","Sync & devices"],["backup","db","Backup & storage"],["security","lock","Security"],["privacy","shield","Privacy & data"]];
const SET_ALIAS={planner:"general",emergency:"security"};
function openSettings(tab="general"){
  const s=S.settings,sect=SET_ALIAS[tab]?tab:"";tab=SET_ALIAS[tab]||tab;if(!SET_TABS.some(x=>x[0]===tab))tab="general";
  const P={
   general:`<div class="fg">${Sel("Home currency","homeCur",s.homeCur||"INR",CURS)}${Sel("Appearance","theme",s.theme,[["auto","Match my device"],["dark","Midnight"],["light","Parchment"]])}${Sel("Character animations","anim",s.anim||"calm",[["calm","Calm (characters, no intro)"],["full","Full (launch intro + idle)"],["off","Off (no download)"]])}</div>
   <label class="row mt" style="cursor:pointer"><input type="checkbox" name="optimizePhotos" ${s.optimizePhotos?"checked":""}> <span style="font-size:12.5px;color:var(--tx)">Resize memory photos to 1600px when saving (saves lots of space)</span></label>
   <div class="sep"></div><div class="h">${ic("eye")}<h2>Screenshot reader</h2></div>
   <div class="row"><button class="btn" id="ocrDl" type="button">${ic("download","sm")} ${S.meta.ocrReady?"Downloaded · refresh":`Download for offline (${OCR_SIZE})`}</button></div>
   <div class="sep"></div><div class="h" id="ss-planner">${ic("clock")}<h2>Day planner</h2></div><div class="fg f4">
   ${F("Day starts","wake",s.wake,{type:"time"})}${F("Day ends","sleep",s.sleep,{type:"time"})}${F("Min. free slot (min)","minGap",s.minGap,{type:"number"})}${TZsel("Home timezone","homeTz",s.homeTz)}</div>
   <div class="h mt">${ic("plane")}<h2>Travel buffers (minutes)</h2></div><div class="fg f4">${F("Before intl flight","preIntl",s.preIntl,{type:"number"})}${F("Before domestic","preDom",s.preDom,{type:"number"})}${F("After intl arrival","postIntl",s.postIntl,{type:"number"})}${F("After domestic","postDom",s.postDom,{type:"number"})}${F("Before train","trainPre",s.trainPre,{type:"number"})}</div>`,
   apps:`<div class="fg">${Sel("Maps","appMap",s.appMap||"google",APPS.map.map(a=>[a.id,a.name]))}${Sel("Cabs","appCab",s.appCab||"",[["","Auto by country"],...APPS.cab.map(a=>[a.id,a.name])])}${Sel("UPI payments","appPay",s.appPay||"upi",APPS.pay.map(a=>[a.id,a.name]))}${Sel("Translate to","appLang",s.appLang||"",[["","Auto by country"],...langOpts(),["en","English"]])}</div><div id="aiPane">${aiPaneHtml()}</div>`,
   sync:`<div id="gsHubBody">${gsHubBody()}</div>`,
   backup:backupPane(),
   security:`${Vault.protected?`<div class="note ok">${ic("shield")}<div><b>Encrypted</b> · locks after ${s.autoLock?s.autoLock+" min":"no time"} idle</div></div><div class="row wrap mt"><button class="btn" id="chPass">${ic("key","sm")} Change passphrase</button><button class="btn" id="lockNow">${ic("lock","sm")} Lock now</button><button class="btn ghost" id="offPass">${ic("unlock","sm")} Remove lock</button></div>`
     :`<div class="note warn">${ic("alert")}<div><b>Not locked.</b> Data on this device isn't encrypted.</div></div><div class="row mt"><button class="btn pri" id="onPass" ${hasCrypto?"":"disabled"}>${ic("lock","sm")} Set a passphrase</button></div>`}
   <div class="fg mt">${Sel("Auto-lock after idle","autoLock",s.autoLock,[[0,"Never"],[1,"1 minute"],[5,"5 minutes"],[15,"15 minutes"],[60,"1 hour"]])}</div>
   <div class="sep"></div><div class="h" id="ss-emergency">${ic("heart")}<h2>Emergency card</h2></div>
   <label class="row" style="cursor:pointer"><input type="checkbox" name="emgOn" ${s.emgOn?"checked":""}> <span style="font-size:12.5px;color:var(--tx)">Show an <b>Emergency info</b> button on the lock screen</span></label>
   <div class="note warn mt">${ic("alert")}<div>Stored <b>unencrypted</b> so it can show on the lock screen.</div></div>
   <div class="fg mt">${F("Name","emgName",s.emgName)}${F("Blood group","emgBlood",s.emgBlood,{ph:"B+"})}${F("Allergies","emgAllergy",s.emgAllergy,{full:1,ph:"Penicillin, peanuts…"})}${F("Medical conditions / medicines","emgMed",s.emgMed,{full:1,ph:"Asthma (inhaler in bag)…"})}
   ${F("Emergency contact","emgContact",s.emgContact,{ph:"Riya (spouse)"})}${F("Contact phone","emgPhone",s.emgPhone,{type:"tel",ph:"+91 98…"})}${F("Insurer & policy no.","emgIns",s.emgIns)}${F("Insurance helpline","emgHelp",s.emgHelp,{type:"tel"})}</div>`,
   privacy:privacyPane()};
  const FIELD_TABS=new Set(["general","apps","security"]);
  const ov=sheet({title:`${ic("sliders")} Settings`,cls:"settings",help:"settings."+tab,body:`<div class="stabs" role="tablist" aria-label="Settings sections">${SET_TABS.map(([k,i,l])=>`<button type="button" role="tab" class="stab" id="st-${k}" data-tab="${k}" aria-controls="sp-${k}" aria-selected="${k===tab}" tabindex="${k===tab?0:-1}">${ic(i,"sm")}<span>${l}</span></button>`).join("")}</div>
   ${SET_TABS.map(([k])=>`<section class="spane" role="tabpanel" id="sp-${k}" data-pane="${k}" aria-labelledby="st-${k}" ${k===tab?"":"hidden"}>${P[k]}</section>`).join("")}
   <div class="small dim mt">Trip Vault ${typeof TV_VERSION==="string"?TV_VERSION:""} · private by design · <a href="#" data-a="about">About</a></div>`,
   foot:`<button class="btn" data-close>Close</button><button class="btn pri" id="stSv">Save</button>`});
  const show=k=>{$$(".stab",ov).forEach(b=>{const on=b.dataset.tab===k;b.setAttribute("aria-selected",on);b.tabIndex=on?0:-1});$$(".spane",ov).forEach(p=>p.hidden=p.dataset.pane!==k);
    $("#stSv",ov).hidden=!FIELD_TABS.has(k);ov.dataset.tab=k;ov.dataset.help="settings."+k;$(`.stab[data-tab="${k}"]`,ov)?.scrollIntoView({block:"nearest",inline:"nearest"})};
  show(tab);if(sect)setTimeout(()=>$(`#ss-${sect}`,ov)?.scrollIntoView({block:"start"}),60);
  $(".stabs",ov).addEventListener("click",e=>{const b=e.target.closest(".stab");if(b)show(b.dataset.tab)});
  $(".stabs",ov).addEventListener("keydown",e=>{if(!["ArrowRight","ArrowLeft"].includes(e.key))return;const b=$$(".stab",ov),i=b.indexOf(document.activeElement);if(i<0)return;const n=b[(i+(e.key==="ArrowRight"?1:-1)+b.length)%b.length];n.focus();show(n.dataset.tab);e.preventDefault()});
  $("[name=homeTz]",ov).options[0].remove();$("#ocrDl",ov).onclick=e=>ocrPrepare(e.currentTarget);
  $("#onPass",ov)?.addEventListener("click",()=>setupLock());$("#chPass",ov)?.addEventListener("click",()=>changeLock());$("#offPass",ov)?.addEventListener("click",()=>removeLock());$("#lockNow",ov)?.addEventListener("click",()=>Vault.lock());
  backupWire(ov);
  if(gsReady())gsHubWire($('[data-pane="sync"]',ov),()=>ov.remove());
  privacyWire(ov);wipeWire(ov);aiPaneWire(ov);
  $("#stSv",ov).onclick=async()=>{const g=gather(ov);const n={...S.settings,...g};["minGap","preIntl","preDom","postIntl","postDom","trainPre","autoLock"].forEach(k=>n[k]=Math.max(0,+n[k]||0));n.minGap=Math.max(15,n.minGap);
    if(hm(n.sleep)<=hm(n.wake)){toast("Day end must be after start","bad");return}
    delete n.lang;S.settings=n;await DB.put("meta",{k:"settings",v:n});applyTheme();armIdle();ov.remove();render();toast("Settings saved")};
  return ov}
function wipeWire(ov){$("#wipe",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Erase the whole vault?",plan:[`Delete ${S.trips.length} trip(s), ${S.items.length} entries, ${S.memories.length} memories and ${S.files.length} file(s) from this browser`,"Reset settings and remove the passphrase"],irreversible:`Everything. ${S.meta.lastBackup?"Last backup: "+new Date(S.meta.lastBackup).toLocaleString():"No backup has ever been exported."}`,ok:"Erase all"})))return;await wipeAll()})}
/* Re-draw one tab after an action changed what it shows. */
function settingsRefresh(ov,k){const p=$(`[data-pane="${k}"]`,ov);if(!p)return;if(k==="privacy"){p.innerHTML=privacyPane();privacyWire(ov);wipeWire(ov)}}

/* ===================== Emergency card =====================
   Kept in settings (meta store, never encrypted) so the lock screen can show it. */
function emgFields(){const s=S.settings||{};return[["Name",s.emgName],["Blood group",s.emgBlood],["Allergies",s.emgAllergy],["Medical conditions / medicines",s.emgMed],["Emergency contact",s.emgContact,s.emgPhone],["Insurance",s.emgIns,s.emgHelp]].filter(r=>r[1]||r[2])}
const emgHas=()=>!!S.settings?.emgOn&&emgFields().length>0;
function openEmgCard(){
  const L=emgFields();if(!L.length){toast("Add your details under Settings → Security → Emergency card","info");if(!Vault.locked)openSettings("emergency");return}
  const tel=p=>p?`<a class="btn xs" href="tel:${esc(p.replace(/[^\d+]/g,""))}">${ic("phone","sm")} ${esc(p)}</a>`:"";
  sheet({title:`${ic("heart")} Emergency card`,body:`<div class="emg">${L.map(([l,v,p])=>`<div class="emg-r"><small>${l}</small>${v?`<b>${esc(v)}</b>`:""}${tel(p)}</div>`).join("")}</div>
   <div class="small dim mt">${S.settings.emgOn?"Also available from the lock screen.":"Not shown on the lock screen (turn it on in Settings → Security)."} Edit it in Settings → Security.</div>`})}
