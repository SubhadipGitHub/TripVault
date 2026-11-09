"use strict";
/* ===================== Search everything (Ctrl/Cmd+K or "/") =====================
   Indexes trips, bookings, documents, the TEXT inside imported PDFs/emails, expenses,
   memories, packing items and app actions. Built in memory, never stored, never sent. */
const SEARCH={idx:[],stale:true,q:"",kind:"all",scope:"all",sel:0,hits:[],ov:null};
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const KIND_LABEL={action:"Actions",trip:"Trips",booking:"Bookings",doc:"Documents",file:"Files",expense:"Expenses",memory:"Memories",pack:"Packing"};
const SEARCH_CHIPS=[["all","Everything"],["booking","Bookings"],["doc","Documents"],["memory","Memories"],["expense","Expenses"],["trip","Trips"]];
function searchActions(){return[
  {type:"action",id:"go:today",title:"Go to Today",icon:"compass",text:"today home overview next up",run:()=>go("today")},
  {type:"action",id:"go:plan",title:"Go to Plan",icon:"cal",text:"plan itinerary days timeline schedule free time",run:()=>go("plan")},
  {type:"action",id:"go:vault",title:"Open Vault (bookings, docs, money)",icon:"shield",text:"vault bookings documents passport visa money budget payments",run:()=>go("vault")},
  {type:"action",id:"go:mem",title:"Open Memories",icon:"camera",text:"memories journal photos diary",run:()=>go("memories")},
  {type:"action",id:"a:import",title:"Import a booking (PDF, email, text)",icon:"zap",text:"import smart ticket pdf email eml upload add booking",run:()=>A.import()},
  {type:"action",id:"a:mem",title:"Capture a memory",icon:"camera",text:"new memory capture photo note journal",run:()=>newMemory()},
  {type:"action",id:"a:exp",title:"Log an expense",icon:"tag",text:"expense spend cost log money add",run:()=>{go("vault");S.sub="money";render()}},
  {type:"action",id:"a:wrap",title:"Open Trip Wrapped",icon:"play",text:"wrapped story cards share export year recap",run:()=>openWrapped()},
  {type:"action",id:"a:pass",title:"Show boarding pass / ticket",icon:"phone",text:"boarding pass ticket gate show pnr seat scan qr barcode",run:()=>openPass()},
  {type:"action",id:"a:csv",title:"Export costs (CSV or printable report)",icon:"download",text:"export csv excel sheets expense report reimbursement receipts print",run:()=>{go("vault");S.sub="money";render();setTimeout(()=>$("[data-a=expCSV]")?.scrollIntoView({block:"center"}),50)}},
  {type:"action",id:"a:emg",title:"Emergency card",icon:"heart",text:"emergency medical id blood group allergy contact insurance helpline",run:()=>openEmgCard()},
  {type:"action",id:"a:ics",title:"Export itinerary to calendar (.ics)",icon:"cal",text:"calendar ics google apple outlook export reminders",run:()=>exportICS()},
  {type:"action",id:"a:share",title:"Share this trip (Google Drive)",icon:"share",text:"share trip google drive partner group family invite sync together",run:()=>openShare()},
  {type:"action",id:"a:hub",title:"Sharing & sync status",icon:"user",text:"google account signed in connected sync status recent changes who added",run:()=>openSettings("sync")},
  {type:"action",id:"a:qrs",title:"Send trips to another phone (QR)",icon:"share",text:"transfer phone qr send move sync another device",run:()=>openSendQR()},
  {type:"action",id:"a:qrr",title:"Receive trips from another phone (QR)",icon:"camera",text:"transfer phone qr receive scan move sync another device import",run:()=>openReceiveQR()},
  {type:"action",id:"a:backup",title:"Backup & restore",icon:"db",text:"backup restore export import json encrypted",run:()=>openBackup()},
  {type:"action",id:"a:privacy",title:"Privacy & your data",icon:"shield",text:"privacy dpdp data protection consent delete erase my data download notice grievance",run:()=>openSettings("privacy")},
  {type:"action",id:"a:about",title:"About Trip Vault",icon:"info",text:"about version help contact feedback grievance licences",run:()=>openAbout()},
  {type:"action",id:"a:profile",title:"Profile",icon:"user",text:"profile name account offline",run:()=>openProfile()},
  {type:"action",id:"a:set",title:"Settings",icon:"sliders",text:"settings theme lock passphrase buffers timezone",run:()=>openSettings()},
  ...(Vault.protected?[{type:"action",id:"a:lock",title:"Lock vault now",icon:"lock",text:"lock secure passphrase",run:()=>Vault.lock()}]:[{type:"action",id:"a:setlock",title:"Protect vault with a passphrase",icon:"lock",text:"lock encrypt passphrase password secure privacy",run:()=>openSettings()}])
]}
function buildIndex(){
  const idx=[],tn=id=>S.trips.find(t=>t.id===id)?.name||"";
  const push=o=>{o.hay=norm(o.text);o.trip=tn(o.tripId);idx.push(o)};
  S.trips.forEach(t=>push({type:"trip",id:t.id,tripId:t.id,title:t.name,sub:`${t.dest||"No destination"} · ${tripMeta(t)}`,icon:"globe",text:[t.name,t.dest,t.emergency].join(" ")}));
  S.items.forEach(it=>{
    const type=it.kind==="doc"?"doc":it.kind==="expense"?"expense":"booking";
    push({type,id:it.id,tripId:it.tripId,kind:it.kind,title:itemTitle(it),sub:itemSub(it),ref:it.ref,icon:KINDS[it.kind]?.i||"flag",ck:it.kind,
      text:[itemTitle(it),itemSub(it),it.ref,it.bookingId,(it.names||[]).join(" "),it.notes,it.address,it.location,it.airline,it.flightNo,it.trainNo,it.trainName,it.fromName,it.toName,it.pickup,it.dropoff,it.carType,it.docType,it.cat,it.name,it.pin,it.phone,it.from&&AP[it.from]?.names.join(" "),it.to&&AP[it.to]?.names.join(" "),KINDS[it.kind]?.n].filter(Boolean).join(" · ")});
  });
  S.files.filter(f=>!f.memId).forEach(f=>push({type:"file",id:f.id,tripId:f.tripId,title:f.name,sub:`${(f.size/1024).toFixed(0)} KB · attachment`,icon:"file",ck:"doc",text:f.name+" "+(f.text||"")}));
  S.memories.forEach(m=>push({type:"memory",id:m.id,tripId:m.tripId,title:m.title||"Untitled moment",sub:`${fmtDs(m.date)}${m.place?" · "+m.place:""}`,icon:"camera",ck:"memory",text:[m.title,m.text,m.place,MOODS[m.mood]?.n].join(" ")}));
  S.trips.forEach(t=>(t.ideas||[]).forEach(p=>push({type:"pack",id:p.id,tripId:t.id,title:p.text,sub:`Idea · ${p.cat||""} ${p.place||""}`,icon:"compass",ck:"activity",text:[p.text,p.place,p.note,p.cat].join(" ")})));
  S.trips.forEach(t=>(t.pack||[]).forEach(p=>push({type:"pack",id:p.id,tripId:t.id,title:p.text,sub:`Packing · ${p.done?"packed":"to pack"}`,icon:"bag",ck:"doc",text:p.text+" "+(p.cat||"")})));
  SEARCH.idx=idx;SEARCH.stale=false;
}
function runSearch(q,kind,scope){
  if(SEARCH.stale)buildIndex();const toks=norm(q).split(/[^a-z0-9₹@.\-+]+/).filter(Boolean);
  const acts=searchActions().map(a=>({...a,hay:norm(a.text+" "+a.title)}));
  if(!toks.length)return kind==="all"?acts.slice(0,8):[];
  const pool=[...(kind==="all"?acts:[]),...SEARCH.idx].filter(o=>(kind==="all"||o.type===kind||(kind==="doc"&&o.type==="file"))&&(scope==="all"||o.tripId===S.cur||o.type==="action"));
  const out=[];
  for(const o of pool){let sc=0;const ttl=norm(o.title),ref=norm(o.ref);
    for(const t of toks){if(!o.hay.includes(t)){sc=-1;break}
      sc+=1;if(ttl.includes(t))sc+=6;if(new RegExp("(^|[^a-z0-9])"+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(ttl))sc+=3;if(ref&&ref.includes(t))sc+=8;if(ref===t)sc+=10}
    if(sc<=0)continue;if(o.tripId===S.cur)sc+=2;if(o.type==="booking"||o.type==="doc")sc+=1;if(o.type==="action")sc-=1;out.push({o,sc})}
  out.sort((a,b)=>b.sc-a.sc);return out.slice(0,60).map(x=>x.o);
}
function snippet(o,toks){ // find the first match inside the raw text and highlight around it
  const raw=String(o.text||"");const lr=norm(raw);let at=-1;for(const t of toks){const i=lr.indexOf(t);if(i>=0){at=i;break}}
  if(at<0)return esc(o.sub||"");const a=Math.max(0,at-48),b=Math.min(raw.length,at+110);
  return(a?"…":"")+hlMark(raw.slice(a,b),toks)+(b<raw.length?"…":"");
}
function hlMark(raw,toks){let s=esc(raw);toks.filter(t=>t.length>0).forEach(t=>{s=s.replace(new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>")});return s}
function openSearch(initial=""){
  if(SEARCH.ov)return;closeAllSheetsExceptLock();SEARCH.q=initial;SEARCH.sel=0;
  const ov=document.createElement("div");ov.className="pal";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Search");SEARCH.ov=ov;
  ov.innerHTML=`<div class="box"><div class="qrow">${ic("search","lg")}<input id="sq" type="search" placeholder="Search bookings, PNRs, passports, memories, text inside PDFs…" autocomplete="off" spellcheck="false" aria-label="Search everything"><span class="kbd hint-k">Esc</span><button type="button" class="ibtn xbtn" data-close aria-label="Close search">${ic("x")}</button></div>
   <div class="chips" id="schips"></div><div class="res" id="sres" role="listbox"></div>
   <div class="foot"><span>${ic("lock","sm")} Searched on this device only</span><span class="sp"></span><span class="hint-k"><span class="kbd">↑↓</span> move <span class="kbd">Enter</span> open</span></div></div>`;
  document.body.append(ov);const inp=$("#sq",ov);inp.value=initial;
  const paintChips=()=>{$("#schips",ov).innerHTML=SEARCH_CHIPS.map(([k,l])=>`<button data-k="${k}" class="${SEARCH.kind===k?"on":""}">${l}</button>`).join("")+(S.trips.length>1?`<span class="sp"></span><button data-scope="1" class="${SEARCH.scope==="cur"?"on":""}">${SEARCH.scope==="cur"?"This trip only":"All trips"}</button>`:"")};
  const paint=()=>{
    const q=inp.value,toks=norm(q).split(/[^a-z0-9₹@.\-+]+/).filter(Boolean);SEARCH.q=q;const hits=SEARCH.hits=runSearch(q,SEARCH.kind,SEARCH.scope);SEARCH.sel=Math.min(SEARCH.sel,Math.max(0,hits.length-1));
    const res=$("#sres",ov);
    if(!hits.length){res.innerHTML=q?`<div class="emp"><b class="serif" style="font-size:18px;color:var(--tx)">Nothing found for “${esc(q)}”</b><div class="small mt">Try a PNR, a hotel name, a city, or a word from a ticket. PDF text is searchable only for files imported with Smart import.</div></div>`:`<div class="emp">Start typing…</div>`;return}
    let last="",h="";hits.forEach((o,i)=>{const g=KIND_LABEL[o.type];if(g!==last){h+=`<div class="grp">${q?g:"Jump to"}</div>`;last=g}
      h+=`<div class="hit ${i===SEARCH.sel?"sel":""}" data-i="${i}" role="option">${kicSearch(o)}<div class="b"><div class="t">${toks.length?hlMark(o.title,toks):esc(o.title)}${o.ref?` <span class="mono copy small" data-copy="${esc(o.ref)}" title="Copy">${esc(o.ref)}</span>`:""}</div><div class="d">${o.type==="action"?"":esc(o.trip&&S.trips.length>1?o.trip+" · ":"")}${o.type==="action"?"":(["file","memory","pack"].includes(o.type)||o.type==="doc"?snippet(o,toks):esc(o.sub||""))}</div></div></div>`});
    res.innerHTML=h;$(".hit.sel",res)?.scrollIntoView({block:"nearest"});
  };
  paintChips();paint();inp.focus();
  inp.addEventListener("input",()=>{SEARCH.sel=0;paint()});
  ov.addEventListener("click",e=>{
    if(e.target===ov||e.target.closest("[data-close]")){closeSearch();return}
    const k=e.target.closest("[data-k]");if(k){SEARCH.kind=k.dataset.k;SEARCH.sel=0;paintChips();paint();inp.focus();return}
    if(e.target.closest("[data-scope]")){SEARCH.scope=SEARCH.scope==="cur"?"all":"cur";paintChips();paint();inp.focus();return}
    const h=e.target.closest(".hit");if(h)pick(+h.dataset.i)});
  inp.addEventListener("keydown",e=>{
    if(e.key==="ArrowDown"){e.preventDefault();SEARCH.sel=Math.min(SEARCH.hits.length-1,SEARCH.sel+1);paint()}
    else if(e.key==="ArrowUp"){e.preventDefault();SEARCH.sel=Math.max(0,SEARCH.sel-1);paint()}
    else if(e.key==="Enter"){e.preventDefault();pick(SEARCH.sel)}
    else if(e.key==="Escape"){e.preventDefault();closeSearch()}});
  function pick(i){const o=SEARCH.hits[i];if(!o)return;closeSearch();openHit(o)}
}
const kicSearch=o=>o.type==="action"?`<span class="kic sm" style="--c:var(--acc)">${ic(o.icon,"sm")}</span>`:o.type==="trip"?`<span class="kic sm k-hotel">${ic("globe","sm")}</span>`:o.type==="memory"?`<span class="kic sm k-memory">${ic("camera","sm")}</span>`:o.type==="pack"?`<span class="kic sm k-transfer">${ic("bag","sm")}</span>`:`<span class="kic sm k-${o.ck||"doc"}">${ic(o.icon,"sm")}</span>`;
function closeSearch(){SEARCH.ov?.remove();SEARCH.ov=null}
function closeAllSheetsExceptLock(){$$(".ov").forEach(o=>o.remove())}
function openHit(o){
  if(o.type==="action"){o.run();return}
  if(o.tripId&&o.tripId!==S.cur){S.cur=o.tripId;S.meta.cur=o.tripId;S.day=null;saveMeta()}
  if(o.type==="trip"){render();return}
  if(o.type==="booking"||o.type==="doc"||o.type==="expense"){render();const it=S.items.find(i=>i.id===o.id);if(it)openItem(structuredClone(it))}
  else if(o.type==="file"){render();openBlob(S.files.find(f=>f.id===o.id))}
  else if(o.type==="memory"){go("memories");openMemView(o.id)}
  else if(o.type==="pack"){S.view="vault";S.sub="pack";S.meta.view="vault";saveMeta();render()}
}
