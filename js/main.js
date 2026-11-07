"use strict";
/* ===================== Actions & boot ===================== */
function openBlob(f){if(!f?.blob){toast("File data missing","bad");return}const u=URL.createObjectURL(f.blob);const w=window.open(u,"_blank");if(!w)dl(f.blob,f.name);setTimeout(()=>URL.revokeObjectURL(u),60000)}
function addMenuSheet(){
  const tile=(a,k,icn,lbl,sub)=>`<button class="btn" style="justify-content:flex-start;padding:12px;align-items:flex-start" data-a="${a}" ${k?`data-k="${k}"`:""}>${k&&KINDS[k]?kic(k,1):`<span class="kic sm" style="--c:var(--acc)">${ic(icn,"sm")}</span>`}<span style="white-space:normal;text-align:left"><b>${lbl}</b>${sub?`<span class="small muted" style="display:block;font-weight:500">${sub}</span>`:""}</span></button>`;
  const ov=sheet({title:"Add to your trip",body:`
   <button class="btn pri lg" style="width:100%;justify-content:center;white-space:normal;text-align:center" data-a="import">${ic("zap")} Smart import — drop a ticket, email or PDF</button>
   <div class="eyebrow" style="margin:16px 0 8px">Or add by hand</div>
   <div class="grid g2">${tile("newMem","","camera","Memory","Photos and a few words")}${tile("add","expense","tag","Expense","Spend on the road")}${tile("add","activity","flag","Activity","Plan something")}${tile("add","flight","plane","Flight","")}${tile("add","hotel","bed","Stay","")}${tile("add","train","train","Train","")}${tile("add","transfer","car","Transfer","")}${tile("add","doc","shield","Document","Passport, visa, insurance")}</div>`});
  ov.addEventListener("click",e=>{if(e.target.closest("[data-a]"))ov.remove()});
}
const A={
  trips:()=>openTrips(),backup:()=>openBackup(),settings:()=>openSettings(),import:()=>openImport(),search:()=>openSearch(),
  newTrip:()=>{$$(".ov").forEach(o=>o.remove());openTrip({id:uid(),name:"",rates:{},tz:S.settings.homeTz,localCur:HC()},true)},
  editTrip:()=>{const t=curTrip();t?openTrip(t):A.newTrip()},
  selTrip:el=>{S.cur=el.dataset.id;S.meta.cur=S.cur;S.day=null;saveMeta();$$(".ov").forEach(o=>o.remove());render()},
  loadSample:()=>loadSample(),
  go:el=>go(el.dataset.v),
  vsub:el=>{S.sub=el.dataset.s;S.meta.sub=S.sub;saveMeta();render()},
  day:el=>{S.day=el.dataset.d;render()},
  bookf:el=>{BOOKF=el.dataset.k;render()},
  item:el=>{const it=S.items.find(i=>i.id===el.dataset.id);if(it)openItem(structuredClone(it))},
  add:el=>newItem(el.dataset.k,{d:el.dataset.d,dt:el.dataset.dt}),
  addDoc:()=>newItem("doc",{dt:"Passport"}),
  addMenu:()=>addMenuSheet(),
  planGap:el=>{const s=+el.dataset.s,e=+el.dataset.e;newItem("activity",{d:el.dataset.d,s:mhm(s),e:mhm(Math.min(e,s+120))})},
  markPaid:async el=>{const it=S.items.find(i=>i.id===el.dataset.id);const p=payInfo(it);it.payments=(it.payments||[]).filter(x=>x.status==="paid");it.payments.push({id:uid(),status:"paid",amount:p.pend,due:todayIn("Asia/Kolkata"),method:"UPI"});await saveItem(it);render();toast(`Marked ${fmtM(p.pend,p.cur)} as paid`)},
  quickExp:async()=>{const t=curTrip();const a=+$("#qxA").value;if(!a){toast("Enter an amount","bad");return}const d=tripPhase(t).today||todayIn("Asia/Kolkata");const tz=dayTz(t,d);const p=tzParts(tz,Date.now());
    await saveItem({id:uid(),tripId:t.id,kind:"expense",title:$("#qxN").value.trim()||$("#qxK").value,cat:$("#qxK").value,cost:a,cur:$("#qxC").value,date:d,time:`${pad(p.h)}:${pad(p.mi)}`,tz,payments:[],names:[],paidBy:$("#qxP")?.value||""});render();toast("Expense logged")},
  openFile:el=>openBlob(S.files.find(f=>f.id===el.dataset.id)),
  delFile:async el=>{const f=S.files.find(x=>x.id===el.dataset.id);if(!f)return;const its=S.items.filter(i=>(f.itemIds||[]).includes(i.id));
    if(!(await gate({title:"Delete this file?",plan:[`Delete <b>${esc(f.name)}</b> (${(f.size/1024).toFixed(0)} KB)`,its.length?`Bookings stay; ${its.length} will lose this attachment`:"Not linked to any booking"],irreversible:"The file can't be recovered unless it's in a backup.",ok:"Delete file"})))return;await delFile(f.id);render();toast("File deleted")},
  persist:async()=>{const ok=await navigator.storage?.persist?.();toast(ok?"Storage is now persistent":"Browser declined — keep regular backups",ok?"ok":"info");render()},
  fitDates:async()=>{const t=curTrip();const ds=tripItems(t.id).filter(i=>i.kind!=="doc").flatMap(itemDates).sort();t.start=ds[0]<t.start?ds[0]:t.start;t.end=ds[ds.length-1]>t.end?ds[ds.length-1]:t.end;await saveTrip(t);render();toast("Trip dates extended")},
  dupTrip:()=>duplicateTrip(),
  ideaAdd:async()=>{const t=curTrip(),v=$("#idT").value.trim();if(!v){toast("Type an idea first","bad");return}t.ideas=[...(t.ideas||[]),{id:uid(),text:v,cat:$("#idC").value,place:$("#idP").value.trim(),note:$("#idN").value.trim()}];await saveTrip(t);render()},
  ideaDel:async el=>{const t=curTrip();t.ideas=(t.ideas||[]).filter(i=>i.id!==el.dataset.id);await saveTrip(t);render()},
  ideaSched:async el=>{const t=curTrip(),i=(t.ideas||[]).find(x=>x.id===el.dataset.id);if(!i)return;i.scheduled=true;await saveTrip(t);const d=S.day||tripDays(t)[0];newItem("activity",{d,title:i.text,location:i.place||t.dest||""});render()},
  ics:()=>exportICS(),shareItin:()=>shareItinerary(),
  copyItin:()=>{const t=curTrip();if(t)copyTxt(itinText(t))},
  /* memories & wrapped */
  newMem:()=>{$$(".ov").forEach(o=>o.remove());newMemory()},
  memView:el=>openMemView(el.dataset.id),
  memEdit:el=>{const m=S.memories.find(x=>x.id===el.dataset.id);if(m){$$(".ov").forEach(o=>o.remove());openMemory(structuredClone(m),false)}},
  quickMem:()=>quickMemory(),
  wrapped:()=>openWrapped(),
  /* security */
  setupLock:()=>setupLock(),lockNow:()=>Vault.lock(),
  hideStart:()=>{S.meta.hideStart=true;saveMeta();render()},
  /* packing */
  packStart:async()=>{const t=curTrip();t.pack=defaultPack(isIntlTrip(t));await saveTrip(t);render()},
  packBlank:async()=>{const t=curTrip();t.pack=[];await saveTrip(t);render()},
  packReset:async()=>{const t=curTrip();if(!(await gate({title:"Reset the packing list?",plan:["Replace your list with a fresh "+(isIntlTrip(t)?"international":"domestic")+" checklist","Custom items and ticks are lost"],ok:"Reset list"})))return;t.pack=defaultPack(isIntlTrip(t));await saveTrip(t);render()},
  packToggle:async el=>{const t=curTrip(),p=t.pack.find(x=>x.id===el.dataset.id);if(!p)return;p.done=!p.done;await saveTrip(t);render()},
  packDel:async(el,e)=>{e.stopPropagation();const t=curTrip();t.pack=t.pack.filter(x=>x.id!==el.dataset.id);await saveTrip(t);render()},
  packAdd:async()=>{const t=curTrip(),v=$("#pkNew").value.trim();if(!v)return;t.pack.push({id:uid(),text:v,cat:$("#pkCat").value,done:false});await saveTrip(t);render();$("#pkNew")?.focus()}
};
document.addEventListener("click",e=>{
  const c=e.target.closest("[data-copy]");if(c){e.stopPropagation();copyTxt(c.dataset.copy);return}
  const v=e.target.closest("#nav [data-v]");if(v){go(v.dataset.v);return}
  const a=e.target.closest("[data-a]");if(a&&A[a.dataset.a]){if(a.tagName==="A")return;e.preventDefault();A[a.dataset.a](a,e)}},true);
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!SEARCH.ov&&!WR.ov)topSheet()?.close();
  const typing=/^(input|textarea|select)$/i.test(e.target.tagName)||e.target.isContentEditable;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(!Vault.locked&&S.settings)SEARCH.ov?closeSearch():openSearch()}
  else if(e.key==="/"&&!typing&&!Vault.locked&&S.settings&&!$(".ov")&&!WR.ov){e.preventDefault();openSearch()}
  else if((e.key==="Enter"||e.key===" ")&&e.target.matches?.(".pk,.mem,.wrapcta")){e.preventDefault();e.target.click()}
});
document.addEventListener("change",async e=>{
  const r=e.target.closest("[data-rate]");if(r){const t=curTrip();t.rates={...(t.rates||{})};const v=+r.value;if(v>0)t.rates[r.dataset.rate]=v;else delete t.rates[r.dataset.rate];await saveTrip(t);render();toast(`Rate saved: 1 ${r.dataset.rate} = ${sym(HC())}${v}`)}});
let _emgT=null;
document.addEventListener("change",async e=>{const hm2=e.target.closest("[data-home]");if(hm2){S.settings={...S.settings,[hm2.dataset.home]:hm2.value};await DB.put("meta",{k:"settings",v:S.settings});toast("Saved");return}
  const pp=e.target.closest("[data-people]");if(pp){const t=curTrip();t.people=pp.value.split(/\s*,\s*/).filter(Boolean);await saveTrip(t);render()}});
document.addEventListener("input",e=>{
  const s=e.target.closest("[data-save=emergency]");if(s){clearTimeout(_emgT);_emgT=setTimeout(async()=>{const t=curTrip();if(t){t.emergency=s.value;await saveTrip(t)}},500)}
  const cv=e.target.closest("[data-conv]");if(cv){const t=curTrip(),cur=t.localCur,r=rate(t,cur);if(!r)return;const v=+cv.value;
    if(cv.dataset.conv==="inr")$("#cvL").value=v?Math.round(v/r*100)/100:"";else $("#cvI").value=v?Math.round(v*r*100)/100:""}});
document.addEventListener("dragover",e=>{if(!$(".ov")&&!Vault.locked&&e.dataTransfer?.types?.includes("Files"))e.preventDefault()});
document.addEventListener("drop",e=>{if(!$(".ov")&&!Vault.locked&&S.settings&&e.dataTransfer?.files?.length){e.preventDefault();startFiles([...e.dataTransfer.files],S.cur||"__new")}});

/* ===================== Boot ===================== */
(async()=>{
  S.settings={...DEF_SET};
  try{if(!window.indexedDB)throw new Error("IndexedDB not available");await DB.open()}
  catch(e){$("#app").innerHTML=`<div class="card note bad">${ic("alert")}<div><b>Storage unavailable.</b> This browser blocked IndexedDB (private/incognito mode or disabled storage). Open Trip Vault in a normal window.<div class="small muted">${esc(e.message)}</div></div></div>`;return}
  await Vault.readLock();
  if(Vault.protected){const st=await DB.get("meta","settings");S.settings={...DEF_SET,...(st?.v||{})};applyTheme()}
  if(Vault.locked){const m=await DB.get("meta","state");S.meta=m?.v||{};showLock();return}
  await loadAll();applyTheme();S.view=({book:"vault",money:"vault",docs:"vault"}[S.meta.view])||S.meta.view||"today";S.sub=S.meta.sub||({book:"bookings",money:"money",docs:"docs"})[S.meta.view]||"bookings";
  if(!["today","plan","vault","memories"].includes(S.view))S.view="today";
  render();armIdle();
})();
setInterval(()=>{if(S.cur&&(S.view==="today"||S.view==="plan")&&!$(".ov")&&!SEARCH.ov&&!WR.ov&&!Vault.locked&&document.visibilityState==="visible"&&!document.activeElement?.matches("input,select,textarea"))render()},60000);
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
