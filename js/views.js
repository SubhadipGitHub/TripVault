"use strict";
/* ===================== Render root ===================== */
const RV={last:""};
function applyTheme(){
  document.documentElement.dataset.theme=S.settings?.theme||"auto";i18nInit();
  const m=document.querySelector("meta[name=theme-color]");if(m)requestAnimationFrame(()=>{m.content=getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()||"#0a0d14"});
}
function render(){
  const t=curTrip();
  $("#tsName").textContent=t?t.name:"No trip yet";$("#tsMeta").textContent=t?tripMeta(t):"tap to start";
  $$("#nav [data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===S.view));
  $("#lockBtn").classList.toggle("hide",!Vault.protected);
  const app=$("#app"),y=scrollY,key=S.view+":"+(S.sub||"");
  if(!t){app.innerHTML=viewWelcome();RV.last="";AV.attach();return}
  const V={today:viewToday,plan:viewPlan,vault:viewVault,memories:viewMemories}[S.view]||viewToday;
  app.innerHTML=`<div class="${RV.last===key?"":"rise"}">${V(t)}</div>`;
  if(RV.last===key)scrollTo(0,y);RV.last=key;AV.attach();
}
const SUBS={ideas:"ideas",book:"bookings",bookings:"bookings",money:"money",docs:"docs",pack:"pack"};
function go(v){
  if(SUBS[v]){S.sub=SUBS[v];v="vault"}
  S.view=v;S.meta.view=v;S.meta.sub=S.sub;saveMeta();render();scrollTo(0,0);
}

/* ===================== Welcome / first run ===================== */
function viewWelcome(){return`<div class="card welcome rise">${avSlot(null,"wel")}
  <div class="eyebrow">Welcome aboard</div>
  <h1 style="margin-top:8px">Every trip, <em>one private vault.</em></h1>
  <p class="muted" style="max-width:56ch;margin-top:12px;font-size:15px">Tickets, stays, passports, payments, the day-by-day plan and your memories — searchable in one place, for domestic and international trips. No account. No cloud. It all stays on this device.</p>
  <div class="trust">
    <div>${ic("check","sm")} Works offline, install it like an app</div>
    <div>${ic("check","sm")} Nothing is uploaded, ever</div>
    <div>${ic("check","sm")} Optional AES-256 passphrase lock</div>
    <div>${ic("check","sm")} Export backups and a shareable Wrapped</div></div>
  <div class="row wrap" style="margin-top:16px"><div style="width:150px"><label>Language</label><select data-home="lang"><option value="en">English</option><option value="hi" ${S.settings.lang==="hi"?"selected":""}>हिन्दी</option></select></div><div style="width:150px"><label>Home currency</label><select data-home="homeCur">${CURS.map(c=>`<option ${c===HC()?"selected":""}>${c}</option>`).join("")}</select></div><div style="min-width:200px;flex:1;max-width:280px"><label>Home timezone</label><select data-home="homeTz">${TZS.map(z=>`<option value="${z}" ${z===S.settings.homeTz?"selected":""}>${tzShort(z)} · ${offLabel(z)}</option>`).join("")}</select></div></div>
  <div class="row wrap" style="margin-top:16px"><button class="btn pri lg" data-a="import">${ic("zap")} Import a booking</button><button class="btn lg" data-a="newTrip">${ic("plus")} Start a trip</button><button class="btn lg ghost" data-a="loadSample">${ic("sparkle")} Explore a sample</button></div></div>
  <div class="steps">
   <div class="step"><div class="n">1</div><div><b>Drop your bookings</b><div class="small muted">PDF e-tickets, hotel emails, IRCTC slips or pasted SMS. Names, PNRs, dates and times are read for you to confirm.</div></div></div>
   <div class="step"><div class="n">2</div><div><b>The plan builds itself</b><div class="small muted">Each day gets a timeline with airport buffers, check-ins and <span style="color:var(--ok)">free slots</span> you can fill.</div></div></div>
   <div class="step"><div class="n">3</div><div><b>Everything is searchable</b><div class="small muted">Press <span class="kbd">Ctrl K</span> to find a PNR, a passport, or a word inside a PDF in a blink.</div></div></div>
   <div class="step"><div class="n">4</div><div><b>Keep the memories</b><div class="small muted">Journal with photos on the go, then turn the trip into a Wrapped to share.</div></div></div></div>
  <div class="card"><div class="h">${ic("lock")}<h2>Set up in 30 seconds</h2></div>
   <div class="li" style="border:0;padding-top:0">${kic("doc")}<div class="b"><div class="t">Lock the vault ${Vault.protected?pill("on","ok"):pill("recommended","warn")}</div><div class="d">A passphrase encrypts everything in this browser. Without it, anyone using this device profile can read your data. We can't recover a forgotten passphrase.</div></div>${Vault.protected?"":`<button class="btn" data-a="setupLock">${ic("key","sm")} Set passphrase</button>`}</div>
   <div class="li">${kic("transfer")}<div class="b"><div class="t">Install on your phone</div><div class="d">iPhone: Share → Add to Home Screen. Android/Chrome: menu → Install app. It then works fully offline.</div></div></div></div>`}

/* ===================== Today ===================== */
function bpHero(t){
  const ph=tripPhase(t),{s,e}=tripRange(t),intl=isIntlTrip(t),tr=transports(t),f=tr[0];
  const names=[...new Set(tripItems(t.id).flatMap(i=>i.names||[]))];
  const nights=s&&e?dayDiff(s,e):0;
  let route;
  if(f&&f.from&&f.to){const A1=AP[f.from],B1=AP[f.to];route=`<div class="route"><span>${esc(f.from)}</span><span class="ln">${ic(KINDS[f.kind]?.i||"plane")}</span><span>${esc(f.to)}</span></div><div class="small muted">${esc(A1?.city||f.fromName||"")} <span class="dim">to</span> ${esc(B1?.city||f.toName||"")}</div>`}
  else route=`<div class="serif" style="font-size:30px;line-height:1.1;font-weight:700;margin:6px 0 4px">${esc(t.dest||t.name)}</div><div class="small muted">Add a flight or train to see your route</div>`;
  const stub=ph.p==="before"?`<div class="u">${intl?"Departs in":"Leaves in"}</div><div class="n">${ph.days}</div><div class="u">${ph.days===1?"day":"days"}</div>`:ph.p==="during"?`<div class="u">Now on</div><div class="n">Day ${ph.day}</div><div class="u">of ${ph.of}</div>`:ph.p==="after"?`<div class="u">Trip</div><div class="n" style="font-size:26px">Done</div><div class="stamp ok" style="margin-top:6px">Wrapped</div>`:`<div class="u">No dates</div><div class="n">—</div>`;
  return`<div class="bp"><span class="notch t"></span><span class="notch b"></span>
   <div class="main"><div class="row wrap" style="gap:8px"><span class="eyebrow">${intl?"International":"Domestic"} · ${esc(t.name)}</span><span class="sp"></span><button class="btn xs ghost" data-a="editTrip" aria-label="Edit trip">${ic("edit","sm")} Edit</button></div>${route}
    <div class="bpx"><div class="meta"><div>Dates<b>${s?fmtDs(s)+" – "+fmtDs(e):"Not set"}</b></div><div>Nights<b>${nights}</b></div><div>Travellers<b>${names.length||crewOf(t).crew.length}</b></div></div>${avSlot(t)}</div>${clocks(t)}</div>
   <div class="stub">${stub}<div class="bar2"></div></div></div>`}
function startList(t){
  const its=tripItems(t.id),steps=[
    [its.some(i=>i.kind!=="doc"),"Add your first booking","Import a ticket or confirmation","import","Import"],
    [Vault.protected,"Lock the vault","Encrypt everything with a passphrase","setupLock","Set passphrase"],
    [its.some(i=>i.kind==="doc"),"Save passport & insurance","Expiry is checked against your trip dates","addDoc","Add"],
    [!!S.meta.lastBackup,"Take a backup","Browsers can clear data; keep a copy","backup","Backup"],
    [tripMems(t.id).length>0,"Capture a memory","A line or a photo is enough","newMem","Capture"]];
  const n=steps.filter(x=>x[0]).length;if(S.meta.hideStart||n===steps.length)return"";
  return`<div class="card"><div class="h">${ic("compass")}<h2>Getting started · ${n}/${steps.length}</h2><span class="sp"></span><button class="btn xs ghost" data-a="hideStart">Hide</button></div><div class="bar" style="margin-bottom:6px"><i style="width:${n/steps.length*100}%;background:var(--acc)"></i></div>
   ${steps.map(([d,tt,sub,a,lbl])=>`<div class="chk">${ic(d?"check":"clock")}<div class="sp" style="${d?"color:var(--tx3);text-decoration:line-through":""}"><b style="font-weight:650">${tt}</b><div class="small muted" style="text-decoration:none">${sub}</div></div>${d?"":`<button class="btn xs" data-a="${a}">${lbl}</button>`}</div>`).join("").replace(/<svg class="ic "><use href="#i-check"\/><\/svg>/g,`<svg class="ic" style="color:var(--ok)"><use href="#i-check"/></svg>`)}</div>`;
}
function viewToday(t){
  const ph=tripPhase(t),nx=nextUp(t,ph.p==="during"?3:2);let h=bpHero(t);
  const chk=readiness(t),sc=chk.filter(c=>c.lv!=="info"),okN=sc.filter(c=>c.lv==="ok").length,pct=sc.length?okN/sc.length*100:100,B=budgetOf(t);
  h+=`<div style="height:12px"></div>`+startList(t);
  if(ph.p==="after"||(ph.p==="during"&&tripMems(t.id).length))h+=`<div class="mt">${wrappedCta(t)}</div>`;
  if(ph.p==="during"){const d=ph.today,m=dayModel(t,d);
    h+=`<div class="card"><div class="h">${ic("camera")}<h2>Capture the moment</h2></div><textarea class="prose" id="qmT" style="min-height:64px" placeholder="${esc(PROMPTS[new Date().getDate()%PROMPTS.length])}"></textarea><div class="row mt"><label class="btn" style="margin:0">${ic("image","sm")} Photos<input type="file" id="qmF" accept="image/*" multiple hidden></label><span class="sp"></span><button class="btn pri" data-a="quickMem">${ic("check","sm")} Save</button></div></div>`;
    h+=`<div class="card"><div class="h">${ic("cal")}<h2>Today · ${fmtD(d)}</h2><span class="sp"></span><span class="small" style="color:var(--ok)">${dur(m.free)} free</span></div>${tlBar(m,d)}${dayList(m,d,t)}</div>`;
    if(m.stay)h+=`<div class="card"><div class="h">${ic("moon")}<h2>Tonight</h2></div>${stayCard(m.stay)}</div>`}
  const hasPass=ph.p!=="after"&&nextPassIdx(passList(t))>=0;
  if(nx.length)h+=`<div class="card"><div class="h">${ic("clock")}<h2>Next up</h2><span class="sp"></span>${hasPass?`<button class="btn xs" data-a="pass">${ic("phone","sm")} Show pass</button>`:""}</div>${nx.map(evCard).join("")}</div>`;
  h+=comingUp(t);
  h+=`<div class="grid g2 mt"><div class="kpi" style="--c:var(--ok)"><div class="l">${ic("check","sm")} Paid</div><div class="v">${fmtM(B.paid)}</div><div class="s">of ${fmtM(B.committed)} committed</div></div><div class="kpi" style="--c:var(--warn)"><div class="l">${ic("clock","sm")} Pending</div><div class="v">${fmtM(B.pending)}</div><div class="s">${B.dues[0]?.p.due?"next due "+fmtDs(B.dues[0].p.due):B.dues.length+" open"}</div></div></div>`;
  if(ph.p!=="after"){const lab=pct>=90?"Cleared":pct>=60?"Almost":"Check",col=pct>=90?"var(--ok)":pct>=60?"var(--warn)":"var(--bad)";
    h+=`<div class="card"><div class="ready"><div class="stampbox" style="--c:${col}"><div><b>${Math.round(pct)}%</b><small>${lab}</small></div></div><div><div class="serif" style="font-weight:700;font-size:20px">Trip readiness</div><div class="small muted">${okN} of ${sc.length} checks passed${chk.length-sc.length?` · ${chk.length-sc.length} tips`:""}</div></div></div>
    ${chk.map(c=>`<div class="chk">${ic(c.lv==="ok"?"check":c.lv==="info"?"info":"alert")}<div class="sp" style="color:${c.lv==="ok"?"var(--tx2)":c.lv==="bad"?"var(--bad)":c.lv==="warn"?"var(--warn)":"var(--tx2)"}">${c.txt}</div>${c.act||""}</div>`).join("").replace(/<svg class="ic "><use href="#i-check"\/><\/svg>/g,`<svg class="ic" style="color:var(--ok)"><use href="#i-check"/></svg>`)}</div>`}
  h+=`<div class="card"><div class="h">${ic("zap")}<h2>Quick actions</h2></div><div class="grid g2">
    <button class="btn" data-a="import">${ic("upload")} Import booking</button><button class="btn" data-a="add" data-k="expense">${ic("tag")} Log expense</button>
    <button class="btn" data-a="newMem">${ic("camera")} Capture memory</button><button class="btn" data-a="copyItin">${ic("copy")} Copy itinerary</button>
    <button class="btn" data-a="ics">${ic("cal")} Add to calendar</button><button class="btn" data-a="shareItin">${ic("share")} Share itinerary</button></div></div>`;
  return h}

/* ===================== Vault (bookings · documents · money · packing) ===================== */
function viewVault(t){
  if(!["bookings","docs","money","pack","ideas"].includes(S.sub))S.sub="bookings";
  const nb=tripItems(t.id).filter(i=>i.kind!=="doc"&&i.kind!=="expense").length,nd=tripItems(t.id).filter(i=>i.kind==="doc").length+S.files.filter(f=>f.tripId===t.id&&!f.memId).length;
  const tabs=[["bookings","list","Bookings",nb],["docs","shield","Documents",nd],["money","wallet","Money",""],["ideas","compass","Ideas",(t.ideas||[]).length||""],["pack","bag","Packing",(t.pack||[]).length?`${t.pack.filter(p=>p.done).length}/${t.pack.length}`:""]];
  const body={bookings:viewBook,docs:viewDocs,money:t=>viewMoney(t)+dailySpend(t)+exportCard(t)+settleCard(t),pack:viewPacking,ideas:viewIdeas}[S.sub](t);
  return`<div class="subtabs" role="tablist">${tabs.map(([k,i,l,n])=>`<button role="tab" aria-selected="${S.sub===k}" class="${S.sub===k?"on":""}" data-a="vsub" data-s="${k}">${ic(i,"sm")} ${l}${n!==""?` <span class="dim">${n}</span>`:""}</button>`).join("")}</div>${body}`;
}

/* ---------- packing & essentials ---------- */
function defaultPack(intl){
  const L=[["Documents","Government ID (original)"],["Documents","Printed or offline copies of tickets and hotel vouchers"],["Money","Debit/credit cards (check limits)"],["Money","Some cash for small vendors"],
    ["Tech","Phone and charger"],["Tech","Power bank (cabin bag only)"],["Tech","Offline maps downloaded"],["Tech","Earphones"],
    ["Health","Regular medicines and prescriptions"],["Health","Basic kit: ORS, painkiller, plasters, antiseptic"],["Clothing","Layers for the weather"],["Clothing","Comfortable walking shoes"],["Clothing","Sleepwear and innerwear"],
    ["Toiletries","Toothbrush, paste, soap"],["Toiletries","Sunscreen"],["Before you leave","Web check-in done"],["Before you leave","Itinerary shared with family"],["Before you leave","Home locked, gas and geyser off"],["Before you leave","Export a Trip Vault backup"]];
  if(intl)L.push(["Documents","Passport (6+ months validity)"],["Documents","Visa / e-visa / arrival form printouts"],["Documents","Travel insurance policy"],["Money","Forex card or foreign currency"],["Money","Told bank/card issuer about travel"],["Tech","Universal travel adapter"],["Tech","SIM / eSIM or roaming pack"],["Health","Vaccination certificate (if required)"],["Before you leave","Checked destination entry rules on the official site"]);
  else L.push(["Documents","ID proof for train/hotel check-in"],["Tech","Water bottle and snacks for transit"]);
  return L.map(([cat,text])=>({id:uid(),cat,text,done:false}));
}
function mergePack(t,L){t.pack=t.pack||[];const have=new Set(t.pack.map(p=>p.text.trim().toLowerCase()));let n=0;
  for(const x of L){const k=String(x.text||"").trim().toLowerCase();if(!k||have.has(k))continue;have.add(k);t.pack.push({id:uid(),cat:x.cat||"Other",text:x.text.trim(),done:false});n++}return n}
function packSets(t){const others=S.trips.filter(x=>x.id!==t.id&&x.pack?.length);
  return`<div class="small dim" style="margin-top:14px">Add a ready-made set (items you already have are skipped)</div><div class="row wrap" style="gap:6px;margin-top:6px">${Object.entries(PACK_TPL).map(([k,v])=>`<button class="btn xs" data-a="packTpl" data-k="${k}">${ic(v.i,"sm")} ${v.n}</button>`).join("")}</div>
   ${others.length?`<div class="row mt"><select id="pkFrom" aria-label="Copy packing items from another trip">${others.map(o=>`<option value="${o.id}">${esc(o.name)} · ${o.pack.length} items</option>`).join("")}</select><button class="btn xs" data-a="packCopy">${ic("copy","sm")} Copy items</button></div>`:""}`}
function viewPacking(t){
  const intl=isIntlTrip(t);
  if(!t.pack)return`<div class="card empty">${crewArt(t,"cheer",kic("transfer"))}<b>Pack without the panic</b><div class="small">Start from a ${intl?"international":"domestic"} checklist and tweak it. It lives with this trip, encrypted with the rest.</div><div class="row mt" style="justify-content:center"><button class="btn pri" data-a="packStart">${ic("bag")} Start ${intl?"international":"domestic"} list</button><button class="btn" data-a="packBlank">Blank list</button></div><div style="text-align:left">${packSets(t)}</div></div>${essentials(t)}`;
  const done=t.pack.filter(p=>p.done).length,pct=t.pack.length?done/t.pack.length*100:0;const cats=[...new Set(t.pack.map(p=>p.cat||"Other"))];
  return`<div class="card"><div class="h">${ic("bag")}<h2>Packing · ${done}/${t.pack.length}</h2><span class="sp"></span><button class="btn xs ghost" data-a="packReset">Reset</button></div><div class="bar" style="margin-bottom:8px"><i style="width:${pct}%;background:var(--ok)"></i></div>
   ${cats.map(c=>`<div class="eyebrow" style="margin-top:12px">${esc(c)}</div>${t.pack.filter(p=>(p.cat||"Other")===c).map(p=>`<div class="pk ${p.done?"done":""}" data-a="packToggle" data-id="${p.id}" role="checkbox" aria-checked="${p.done}" tabindex="0"><span class="cb">${ic("check","sm")}</span><span class="tx">${esc(p.text)}</span><button class="x ibtn" style="width:28px;height:28px;border:0;background:none" data-a="packDel" data-id="${p.id}" aria-label="Remove">${ic("x","sm")}</button></div>`).join("")}`).join("")}
   <div class="row mt"><input id="pkNew" placeholder="Add an item…" list="pkCats-l"><datalist id="pkCats-l">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist><select id="pkCat" style="width:auto">${[...new Set([...cats,"Documents","Money","Tech","Health","Clothing","Toiletries","Other"])].map(c=>`<option>${esc(c)}</option>`).join("")}</select><button class="btn pri" data-a="packAdd">${ic("plus","sm")}</button></div>${packSets(t)}</div>${essentials(t)}`;
}
function essentials(t){
  const intl=isIntlTrip(t),cur=t.localCur&&t.localCur!==HC()?t.localCur:null,r=cur?rate(t,cur):null;
  return`<div class="card"><div class="h">${ic("alert")}<h2>Emergency & essentials</h2><span class="sp"></span><button class="btn xs" data-a="emgView">${ic("heart","sm")} Emergency card</button></div><label>Contacts, insurance helpline, embassy/consulate, hotel front desk</label><textarea class="prose" id="emg" data-save="emergency" style="min-height:96px" placeholder="Insurance claim line: …&#10;Hotel: …&#10;Embassy: …&#10;Family contact: …">${esc(t.emergency||"")}</textarea><div class="small dim">Saved as you type and encrypted with the rest of your vault. Keep official numbers from the official source.</div>
   ${cur?`<div class="sep"></div><div class="h">${ic("rupee")}<h2>Quick converter</h2></div>${r?`<div class="row"><div class="sp"><label>${sym(HC())} ${HC()}</label><input type="number" inputmode="decimal" id="cvI" data-conv="inr" placeholder="0"></div><span class="dim">=</span><div class="sp"><label>${cur}</label><input type="number" inputmode="decimal" id="cvL" data-conv="loc" placeholder="0"></div></div><div class="small dim mt">Uses your rate: 1 ${cur} = ${r} ${HC()}. Update it under Money → Exchange rates.</div>`:`<div class="small muted">Set the ${cur} rate under Money to use the converter.</div>`}`:intl?`<div class="small dim mt">Choose a local currency in Trip settings to enable the converter.</div>`:""}</div>`;
}

/* ===================== Views carried over from the original app ===================== */
function clocks(t){const td=todayIn(t.tz||"Asia/Kolkata");const ltz=dayTz(t,td)||t.tz;const home=S.settings.homeTz;if(!ltz||ltz===home)return"";
  const now=Date.now(),f=tz=>{const p=tzParts(tz,now);return`${pad(p.h)}:${pad(p.mi)}`};const df=tzOff(ltz,now)-tzOff(home,now);
  return`<div class="sep"></div><div class="clock"><div><span class="small dim">${ic("pin","sm")} ${esc(tzShort(ltz))} · ${offLabel(ltz)}</span><b>${f(ltz)}</b></div><div><span class="small dim">${ic("user","sm")} Home · ${esc(tzShort(home))}</span><b>${f(home)}</b></div><div class="small muted" style="align-self:center">Local is ${df===0?"same as home":dur(Math.abs(df))+(df>0?" ahead":" behind")}</div></div>`}
function nextUp(t,n=3){const now=Date.now();return tripItems(t.id).flatMap(it=>itemEvents(it).filter(e=>e.main&&e.eu>now)).sort((a,b)=>a.su-b.su).slice(0,n)}
const AL_IC={checkin:"plane",leave:"clock",pay:"wallet",doc:"shield"};
function comingUp(t){const L=alerts(t).slice(0,6);if(!L.length)return"";
  return`<div class="card"><div class="h">${ic("alert")}<h2>Coming up</h2><span class="sp"></span><button class="btn xs ghost" data-a="ics" title="Add these reminders to your phone's calendar">${ic("cal","sm")} Add to calendar</button></div>
   ${L.map(a=>`<div class="li"><span class="kic sm" style="--c:var(--${a.lv==="bad"?"bad":a.lv==="warn"?"warn":"acc"})">${ic(AL_IC[a.kind]||"info","sm")}</span><div class="b ${a.item?"tap":""}" ${a.item?`data-a="item" data-id="${a.item.id}"`:""}><div class="t">${a.txt}</div><div class="d">${a.sub||""}</div></div>
    <div class="r">${a.kind==="pay"?`<button class="btn xs ok" data-a="markPaid" data-id="${a.item.id}">${ic("check","sm")} Paid</button>`:pill(relWhen(a.at),a.lv==="bad"?"bad":a.lv==="warn"?"warn":"info")}</div></div>`).join("")}
   <div class="small dim" style="margin-top:6px">Check-in windows are typical for the airline; confirm on its site.</div></div>`}
function evCard(ev,big){const it=ev.it,now=Date.now();const mins=(ev.su-now)/6e4;const when=mins<=0?`<span class="pill ok">Now · ends ${ev.e.slice(11)}</span>`:mins<48*60?pill("in "+dur(mins),"info"):pill(`in ${Math.ceil(mins/1440)} days`,"info");
  let extra="";if(it.kind==="flight"&&ev.label.startsWith(it.flightNo||"Flight")){const b=itemEvents(it)[0];extra=`<div class="small" style="color:var(--warn);margin-top:3px">${ic("clock","sm")} Be at ${esc(it.from)}${it.terminal?" T"+esc(it.terminal):""} by ${b.s.slice(11)} (${tzShort(b.tz)})</div>`}
  if(isRide(it.kind))extra=`<div class="small" style="color:var(--warn);margin-top:3px">${ic("clock","sm")} Reach ${esc(it.fromName||it.from)} by ${itemEvents(it)[0].s.slice(11)}${it.seat?" · "+esc(it.seat):""}</div>`;
  if(it.kind==="hotel"&&it.address)extra=`<div class="small muted" style="margin-top:3px">${ic("pin","sm")} <span class="copy" data-copy="${esc(it.address)}">${esc(it.address)}</span></div>`;
  const mq=it.kind==="flight"?airportQ(it.from):itemPlace(it);if(mq)extra+=`<div class="row wrap" style="margin-top:6px">${mapLink(mq,it.kind==="flight"?esc(it.from)+" airport":"Map")}</div>`;
  return`<div class="li tap" data-a="item" data-id="${it.id}">${kic(it.kind)}<div class="b"><div class="t">${esc(ev.label)} ${when}</div><div class="d">${fmtD(ev.s.slice(0,10))} · ${ev.s.slice(11)}${ev.e!==ev.s?" – "+ev.e.slice(11)+(ev.etz!==ev.tz?" "+tzShort(ev.etz):""):""} ${tzShort(ev.tz)!==tzShort(S.settings.homeTz)?`<span class="dim">(${tzShort(ev.tz)})</span>`:""}</div>${extra}</div><div class="r">${refChip(it.ref)}</div></div>`}
function stayCard(st){
  return`<div class="li" style="border:0">${kic("hotel")}<div class="b"><div class="t tap" data-a="item" data-id="${st.id}">${esc(st.name)}</div><div class="d">${itemSub(st)}</div>
  ${st.address?`<div class="small mt" style="margin-top:4px">${ic("pin","sm")} <span class="copy" data-copy="${esc(st.address)}">${esc(st.address)}</span></div>`:""}
  <div class="row wrap small" style="margin-top:6px">${st.ref?`<span class="dim">Conf.</span> ${refChip(st.ref)}`:""}${st.pin?` <span class="dim">PIN</span> ${refChip(st.pin)}`:""}${st.phone?` <a href="tel:${esc(st.phone.replace(/[^\d+]/g,""))}">${ic("user","sm")} ${esc(st.phone)}</a>`:""}${mapLink(itemPlace(st),"Map")}</div></div></div>`}
function tlBar(m,d){const set=S.settings,W0=hm(set.wake),W1=hm(set.sleep),P=x=>(x/1440*100).toFixed(3)+"%";
  let h=`<div class="tl"><div class="night" style="left:0;width:${P(W0)}"></div><div class="night" style="left:${P(W1)};right:0"></div>`;
  for(const s of m.segs)h+=`<div class="blk k-${s.ev.kind} ${s.ev.buf?"buf":""}" style="left:${P(s.a)};width:${P(Math.max(8,s.b-s.a))}" title="${esc(s.ev.label)}"></div>`;
  for(const g of m.gaps)h+=`<div class="gap" data-a="planGap" data-d="${d}" data-s="${g.a}" data-e="${g.b}" style="left:${P(g.a)};width:${P(g.b-g.a)}" title="Free ${mhm(g.a)}–${mhm(g.b)} · tap to plan">${g.b-g.a>=150?dur(g.b-g.a):""}</div>`;
  if(d===todayIn(m.tz)){const p=tzParts(m.tz,Date.now());h+=`<div class="now" style="left:${P(p.h*60+p.mi)}"></div>`}
  return h+`</div><div class="tlx">${[3,6,9,12,15,18,21].map(x=>`<span style="left:${x/24*100}%">${pad(x)}</span>`).join("")}</div>`}
function dayList(m,d,t){
  const rows=[...m.segs.map(s=>({a:s.from?s.b:s.a,o:0,s})),...m.gaps.map(g=>({a:g.a,o:1,g}))].sort((x,y)=>x.a-y.a||x.o-y.o);
  if(!rows.length)return`<div class="empty small">Nothing scheduled.</div>`;
  return rows.map(r=>{
    if(r.g){const g=r.g;return`<div class="ev free"><div class="tm" style="color:var(--ok)">${mhm(g.a)}<small>to ${mhm(g.b)}</small></div><div class="sp"><div style="font-weight:600;color:var(--ok)">Free · ${dur(g.b-g.a)}</div><div class="small muted">${g.b-g.a>=240?"Room for a half-day outing":g.b-g.a>=120?"Good for a sight or a long meal":"Coffee, a walk, a quick stop"}</div></div><button class="btn xs ok" data-a="planGap" data-d="${d}" data-s="${g.a}" data-e="${g.b}">${ic("plus","sm")} Plan</button></div>`}
    const s=r.s,ev=s.ev,it=ev.it;
    if(ev.buf)return`<div class="ev buf"><div class="tm">${mhm(s.a)}<small>${dur(s.b-s.a)}</small></div><div class="sp small muted">${ic("clock","sm")} ${esc(ev.label)}</div></div>`;
    let tm=mhm(s.a),sm=s.b<1440&&s.b!==s.a?"→ "+mhm(s.b):"",title=esc(ev.label),sub=itemSub(it);
    if(s.from){tm=mhm(s.b);sm="arrives";title=`Arrive ${esc(it.to||"")} · ${esc(it.flightNo||it.trainNo||"")}`}
    else if(s.cont){sm="→ next day "+ev.e.slice(11)}
    if(s.mid)return`<div class="ev"><div class="tm">All day</div><div class="sp small">${esc(ev.label)}</div></div>`;
    if(it.kind==="flight"&&!s.from&&ev.etz!==ev.tz&&!s.cont)sm=`→ ${ev.e.slice(11)} ${esc(it.to||"")} time`;
    return`<div class="ev tap" data-a="item" data-id="${it.id}"><div class="tm">${tm}<small>${sm}</small></div>${kic(it.kind,1)}<div class="sp" style="min-width:0"><div style="font-weight:600">${title}</div><div class="small muted">${it.kind==="flight"||it.kind==="train"?itemTitle(it)+" · ":""}${it.kind==="hotel"?esc(it.address||""):esc(it.location||it.airline||it.cls||"")}</div></div><div class="evref">${refChip(it.ref)}${mapLink(it.kind==="flight"&&ev.label.startsWith(it.flightNo||"Flight")?airportQ(it.from):itemPlace(it))}</div></div>`}).join("")}
/* ---------- Plan calendar: month grid, only trip days selectable ---------- */
const CAL_TRAVEL=["flight","train","bus","ferry","car"];
const calWide=()=>matchMedia("(min-width:900px)").matches;
function calType(m){const k=new Set(m.segs.filter(s=>!s.ev.buf).map(s=>s.ev.kind));
  return[...k].some(x=>CAL_TRAVEL.includes(x))?"travel":m.stay?"stay":k.size?"act":"free"}
function calMonth(ym,inTrip,models,td,first,last,cls){
  const[y,mo]=ym.split("-").map(Number),lead=dObj(ym+"-01").getUTCDay(),nd=new Date(Date.UTC(y,mo,0)).getUTCDate();
  let h=`<div class="calm ${cls}"><div class="calt"><span>${MON[mo-1]}</span> <span>${y}</span></div><div class="calg">${WD.map(w=>`<div class="calw" aria-hidden="true">${w}</div>`).join("")}`;
  for(let i=0;i<lead;i++)h+=`<div class="calc pad" aria-hidden="true"></div>`;
  for(let i=1;i<=nd;i++){const d=`${ym}-${pad(i)}`;
    if(!inTrip.has(d)){h+=`<button type="button" class="calc off${d===td?" today":""}" disabled aria-disabled="true" tabindex="-1" aria-label="${fmtD(d,1)}, not in this trip"><span class="cd"><span class="n">${i}</span></span></button>`;continue}
    const m=models[d],typ=calType(m),kinds=[...new Set(m.segs.filter(s=>!s.ev.buf).map(s=>s.ev.kind))],sel=d===S.day,dn=dayDiff(first,d)+1;
    const band=first===last?"":d===first?"rs":d===last?"re":"rm";
    h+=`<button type="button" class="calc in t-${typ} ${band}${sel?" on":""}${d===td?" today":""}" data-a="day" data-d="${d}" tabindex="${sel?0:-1}" aria-pressed="${sel}" aria-label="${fmtD(d,1)}, day ${dn}, ${({travel:"travel day",stay:"staying",act:"activities",free:"nothing booked"})[typ]}, ${dur(m.free)} free"><span class="cd"><span class="n">${i}</span><span class="dots">${kinds.slice(0,4).map(k=>`<i class="k-${k}"></i>`).join("")}</span><span class="fb"><i style="width:${Math.min(100,m.free/m.win*100)}%"></i></span></span></button>`}
  return h+`</div></div>`}
function calGrid(t,days,models,td){
  const inTrip=new Set(days),months=[...new Set(days.map(d=>d.slice(0,7)))],first=days[0],last=days[days.length-1],wide=calWide()&&months.length>1;
  const dm=S.day.slice(0,7);let i=months.indexOf(S.calM);
  if(i<0||(S.calFor!==S.day&&dm!==months[i]&&!(wide&&dm===months[i+1])))i=Math.max(0,months.indexOf(dm));
  if(wide&&i>months.length-2)i=months.length-2;S.calM=months[i];S.calFor=S.day;
  const end=wide?i+1:i,show=months.slice(i,end+1),nav=months.length>1;
  return`<div class="cal" data-trip="${esc(t.id)}">${nav?`<div class="calnav"><button type="button" class="ibtn" data-a="calNav" data-n="-1" aria-label="Previous month" ${i<=0?"disabled":""}>${ic("back","sm")}</button><span class="small muted">${fmtDs(first)} – ${fmtDs(last)}</span><button type="button" class="ibtn" data-a="calNav" data-n="1" aria-label="Next month" ${end>=months.length-1?"disabled":""}>${ic("arrow","sm")}</button></div>`:""}
   <div class="calms">${show.map((ym,j)=>calMonth(ym,inTrip,models,td,first,last,j?"second":"")).join("")}</div>
   <div class="callg small dim"><span><i class="sw t-travel"></i>Travel</span><span><i class="sw t-stay"></i>Stay</span><span><i class="sw t-act"></i>Activities</span><span><i class="sw t-free"></i>Free to plan</span><span><i class="sw today"></i>Today</span><span><i class="sw off"></i>Not in trip</span></div></div>`}
function viewPlan(t){
  const days=tripDays(t);if(!days.length)return`<div class="card empty">${crewArt(t,"idle",kic("activity"))}<b>No dates yet</b><div class="small">Import a booking or set trip dates to see the day-by-day plan.</div><div class="row mt" style="justify-content:center"><button class="btn pri" data-a="import">${ic("zap")} Import</button><button class="btn" data-a="editTrip">Set dates</button></div></div>`;
  const td=todayIn(t.tz||"Asia/Kolkata");if(!S.day||!days.includes(S.day))S.day=days.includes(td)?td:days[0];
  const models=Object.fromEntries(days.map(d=>[d,dayModel(t,d)]));const totFree=days.reduce((a,d)=>a+models[d].free,0);
  let h=`<div class="card"><div class="h">${ic("cal")}<h2>${days.length} days · ${dur(totFree)} of free time to plan</h2><span class="sp"></span><button class="btn xs" data-a="copyItin">${ic("share","sm")} Copy</button></div>${calGrid(t,days,models,td)}</div>`;
  const d=S.day,m=models[d];const di=days.indexOf(d)+1;
  h+=`<div class="card"><div class="h"><div><h2 style="font-size:15px">Day ${di} · ${fmtD(d,1)}</h2><div class="small muted">${ic("globe","sm")} ${esc(tzShort(m.tz))} (${offLabel(m.tz,toUTC(d+"T12:00",m.tz))})${m.stay?` · ${ic("bed","sm")} ${esc(m.stay.name)}`:""}</div></div><span class="sp"></span><span class="pill ok">${dur(m.free)} free</span></div>
    ${tlBar(m,d)}<div class="row small dim wrap" style="gap:10px;margin:2px 0 8px">${["flight","train","bus","ferry","car","hotel","transfer","activity"].filter(k=>!["bus","ferry","car"].includes(k)||tripItems(t.id).some(i=>i.kind===k)).map(k=>`<span class="row" style="gap:4px"><i style="width:8px;height:8px;border-radius:2px;background:var(--${k})"></i>${KINDS[k].n}</span>`).join("")}<span class="row" style="gap:4px"><i style="width:10px;height:8px;border:1.5px dashed var(--ok);border-radius:2px"></i>Free</span></div>
    ${dayList(m,d,t)}
    <div class="row wrap mt"><button class="btn" data-a="add" data-k="activity" data-d="${d}">${ic("flag")} Activity</button><button class="btn" data-a="add" data-k="transfer" data-d="${d}">${ic("car")} Transfer</button><button class="btn" data-a="add" data-k="expense" data-d="${d}">${ic("tag")} Expense</button></div></div>`;
  return h}
let BOOKF="all";
function viewBook(t){
  const its=tripItems(t.id).filter(i=>i.kind!=="doc"&&(BOOKF==="all"||i.kind===BOOKF)).sort((a,b)=>sortKey(a)-sortKey(b));
  const cnt=k=>tripItems(t.id).filter(i=>k==="all"?i.kind!=="doc":i.kind===k).length;
  let h=`<div class="row wrap" style="margin-bottom:10px"><div class="tabs">${["all","flight","hotel","train","bus","ferry","car","transfer","activity","expense"].filter(k=>!["bus","ferry","car"].includes(k)||cnt(k)).map(k=>`<button class="${BOOKF===k?"on":""}" data-a="bookf" data-k="${k}">${k==="all"?"All":({bus:"Buses",ferry:"Ferries",car:"Car rentals",activity:"Activities",expense:"Expenses"})[k]||KINDS[k].n+"s"} <span class="dim">${cnt(k)}</span></button>`).join("")}</div><span class="sp"></span><button class="btn" data-a="addMenu">${ic("plus")} Add</button></div>`;
  if(!its.length)return h+`<div class="card empty">${crewArt(t,"wave",kic("flight"))}<b>No bookings here yet</b><div class="small">Import a ticket or confirmation, or add one manually.</div><div class="row mt" style="justify-content:center"><button class="btn pri" data-a="import">${ic("zap")} Smart import</button></div></div>`;
  let last="";h+=`<div class="card">`;
  for(const it of its){const s=itemStart(it);const d=s?.l.slice(0,10)||"";if(d!==last){h+=`<div class="small dim" style="padding:8px 0 2px;text-transform:uppercase;letter-spacing:.6px;font-weight:600">${d?fmtD(d,1):"Undated"}</div>`;last=d}h+=itemRow(it,t)}
  return h+`</div>`}
function itemRow(it,t){const p=payInfo(it);const nf=S.files.filter(f=>(f.itemIds||[]).includes(it.id)).length;
  let pay="";if(it.kind==="expense")pay=pill(fmtM(p.cost,p.cur));else if(p.cost)pay=p.pend>0?pill(`${fmtM(p.pend,p.cur)} due${p.due?" "+fmtDs(p.due):""}`,p.due&&p.due<todayIn("Asia/Kolkata")?"bad":"warn"):pill(`${ic("check","sm")} ${fmtM(p.cost,p.cur)}`,"ok");else if(it.groupId)pay=pill("same booking");
  const dup=dupCheck(it,it.id);
  return`<div class="li tap" data-a="item" data-id="${it.id}">${kic(it.kind)}<div class="b"><div class="t">${esc(itemTitle(it))}${dup.lvl==="dup"?pill(ic("layers","sm")+" duplicate?","bad"):""}${it.refundable?pill("refundable","info"):""}</div><div class="d">${esc(itemSub(it))}</div>${it.names?.length?`<div class="small dim">${ic("user","sm")} ${esc(it.names.join(", "))}</div>`:""}</div><div class="r"><div>${pay}</div><div style="margin-top:4px">${refChip(it.ref)}${nf?` <span class="small dim">${ic("clip","sm")}${nf}</span>`:""}${mapLink(itemPlace(it))}</div></div></div>`}
const CAT_COL={Flight:"flight",Stay:"hotel",Train:"train",Bus:"bus",Ferry:"ferry","Car rental":"car",Transfer:"transfer",Activity:"activity"};
function catBars(t,B){const lim=t.catBudgets||{},keys=[...new Set([...Object.keys(B.cats),...Object.keys(lim).filter(k=>lim[k]>0)])];
  if(!keys.length)return`<div class="small muted">No costs yet.</div>`;const mx=Math.max(1,...keys.map(k=>B.cats[k]||0));
  return keys.sort((a,b)=>(B.cats[b]||0)-(B.cats[a]||0)).map(k=>{const v=B.cats[k]||0,b=+lim[k]||0,over=b&&v>b,near=b&&!over&&v>b*.85,w=b?Math.min(100,v/b*100):v/mx*100;
    return`<div class="catbar"><div class="nm">${esc(k)}</div><div class="bar"${b?` title="${Math.round(v/b*100)}% of the limit"`:""}><i style="width:${w}%;background:${over?"var(--bad)":near?"var(--warn)":`var(--${CAT_COL[k]||"expense"})`}"></i></div><div class="am">${fmtM(v)}${b?`<div class="small" style="color:${over?"var(--bad)":"var(--tx3)"}">${over?"over by "+fmtM(v-b):"of "+fmtM(b)}</div>`:""}</div></div>`}).join("")}
function viewMoney(t){
  const B=budgetOf(t),bud=+t.budget||0;const tot=Math.max(bud,B.committed,1);
  let h=`<div class="grid g2 gk">
   <div class="kpi" style="--c:var(--acc)"><div class="l">${ic("wallet","sm")} Budget</div><div class="v">${bud?fmtM(bud):"—"}</div><div class="s tap" data-a="editTrip" style="color:var(--acc)">${bud?"edit":"set budget"}</div></div>
   <div class="kpi" style="--c:var(--hotel)"><div class="l">${ic("list","sm")} Committed</div><div class="v">${fmtM(B.committed)}</div><div class="s">bookings + expenses</div></div>
   <div class="kpi" style="--c:var(--ok)"><div class="l">${ic("check","sm")} Paid</div><div class="v">${fmtM(B.paid)}</div><div class="s">${B.committed?Math.round(B.paid/B.committed*100):0}% of committed</div></div>
   <div class="kpi" style="--c:var(--warn)"><div class="l">${ic("clock","sm")} Pending</div><div class="v">${fmtM(B.pending)}</div><div class="s">${B.dues.length} open</div></div>
   <div class="kpi" style="--c:${B.left<0?"var(--bad)":"var(--transfer)"}"><div class="l">${ic("rupee","sm")} ${B.left<0?"Over budget":"Left to plan"}</div><div class="v" style="color:${B.left<0?"var(--bad)":""}">${bud?fmtM(Math.abs(B.left)):"—"}</div><div class="s">${bud?"after all commitments":"set a budget"}</div></div></div>
   <div class="card"><div class="bar" style="height:12px"><i style="width:${B.paid/tot*100}%;background:var(--ok)"></i><i style="width:${B.pending/tot*100}%;background:var(--warn)"></i>${bud>B.committed?`<i style="width:${(bud-B.committed)/tot*100}%;background:var(--line2)"></i>`:""}</div>
   <div class="row small muted wrap" style="margin-top:6px;gap:12px"><span><i style="display:inline-block;width:8px;height:8px;background:var(--ok);border-radius:2px"></i> Paid</span><span><i style="display:inline-block;width:8px;height:8px;background:var(--warn);border-radius:2px"></i> Pending</span><span><i style="display:inline-block;width:8px;height:8px;background:var(--line2);border-radius:2px"></i> Unallocated</span></div></div>`;
  if(B.unconv.length)h+=`<div class="note warn mt">${ic("alert")}<div>${B.unconv.length} amount${B.unconv.length>1?"s":""} in ${[...new Set(B.unconv.map(x=>x.p.cur))].join(", ")} not counted — set the rate below.</div></div>`;
  const curs=[...new Set([t.localCur,...Object.keys(B.curs)].filter(c=>c&&c!==HC()))];
  if(curs.length)h+=`<div class="card"><div class="h">${ic("globe")}<h2>Exchange rates</h2><span class="sp"></span><span class="small dim">${HC()} per 1 unit · enter your forex/card rate</span></div><div class="grid g3">${curs.map(c=>`<div><label>1 ${c} = ${HC()}</label><input type="number" step="0.0001" min="0" data-rate="${c}" value="${t.rates?.[c]??""}" placeholder="e.g. ${c==="USD"?"84.5":c==="MYR"?"19.2":"0"}"></div>`).join("")}</div>${B.curs&&Object.keys(B.curs).length?`<div class="small muted mt">${Object.entries(B.curs).map(([c,v])=>`${fmtM(v,c)}`).join(" · ")} booked</div>`:""}</div>`;
  h+=`<div class="grid gd2 mt" style="grid-template-columns:1fr"><div class="card"><div class="h">${ic("clock")}<h2>Pending payments</h2></div>${B.dues.length?B.dues.map(x=>{const od=x.p.due&&x.p.due<todayIn("Asia/Kolkata");return`<div class="li"><div class="b tap" data-a="item" data-id="${x.it.id}"><div class="t">${kic(x.it.kind,1)} ${esc(itemTitle(x.it))}</div><div class="d">${fmtM(x.p.pend,x.p.cur)}${x.p.cur!==HC()?` ≈ ${fmtM(x.inr)}`:""} · ${x.p.due?`<span style="color:${od?"var(--bad)":"var(--warn)"}">${od?"overdue since":"due"} ${fmtD(x.p.due)}</span>`:"no due date"}</div></div><button class="btn xs ok" data-a="markPaid" data-id="${x.it.id}">${ic("check","sm")} Mark paid</button></div>`}).join(""):`<div class="small muted">Nothing pending.</div>`}</div>
   <div class="card"><div class="h">${ic("layers")}<h2>Where it goes</h2><span class="sp"></span><button class="btn xs ghost" data-a="catBud">${ic("sliders","sm")} Limits</button></div>${catBars(t,B)}</div></div>`;
  const ex=tripItems(t.id).filter(i=>i.kind==="expense").sort((a,b)=>(b.date||"").localeCompare(a.date||""));const exT=ex.reduce((a,i)=>a+(toINR(t,i.cost,i.cur)||0),0);
  const ph=tripPhase(t);const dd=ph.p==="during"?ph.day:ph.p==="after"?tripDays(t).length:0;
  h+=`<div class="card"><div class="h">${ic("tag")}<h2>Trip expenses</h2><span class="sp"></span><span class="small muted">${fmtM(exT)}${dd?` · ${fmtM(exT/dd)}/day`:""}</span></div>
   <div class="fg f4" id="qx"><div><label>Amount</label><input type="number" step="0.01" id="qxA" placeholder="0"></div><div><label>Currency</label><select id="qxC">${CURS.map(c=>`<option ${c===(isIntlTrip(t)&&t.localCur?t.localCur:HC())?"selected":""}>${c}</option>`).join("")}</select></div><div><label>Category</label><select id="qxK">${EXP_CATS.map(c=>`<option>${c}</option>`).join("")}</select></div><div><label>Note</label><input id="qxN" placeholder="Dinner at…"></div>${tripPeople(t).length>1?`<div><label>Paid by</label><select id="qxP"><option value="">—</option>${tripPeople(t).map(p=>`<option>${esc(p)}</option>`).join("")}</select></div>`:""}</div>
   <div class="row mt"><span class="sp"></span><button class="btn pri" data-a="quickExp">${ic("plus")} Log expense</button></div>
   ${ex.slice(0,12).map(i=>`<div class="li tap" data-a="item" data-id="${i.id}"><div class="b"><div class="t">${esc(i.title||i.cat)}</div><div class="d">${esc(i.cat||"")} · ${fmtDs(i.date)}</div></div><div class="r">${fmtM(i.cost,i.cur)}${i.cur!==HC()&&rate(t,i.cur)?`<div class="small dim">≈ ${fmtM(toINR(t,i.cost,i.cur))}</div>`:""}</div></div>`).join("")}</div>`;
  return h}
function viewDocs(t){
  const docs=tripItems(t.id).filter(i=>i.kind==="doc");const files=S.files.filter(f=>f.tripId===t.id&&!f.memId).sort((a,b)=>b.createdAt-a.createdAt);
  const{e}=tripRange(t);
  let h=`<div class="card"><div class="h">${ic("shield")}<h2>Travel documents</h2><span class="sp"></span><button class="btn xs" data-a="add" data-k="doc">${ic("plus","sm")} Add</button></div>`;
  h+=docs.length?docs.map(d=>{let st="";if(d.expiry){const lim=e?addDays(e,183):null;st=d.expiry<todayIn("Asia/Kolkata")?pill("expired","bad"):lim&&d.docType==="Passport"&&d.expiry<lim?pill("< 6 mo after trip","bad"):e&&d.expiry<e?pill("expires during trip","bad"):pill("valid","ok")}
    return`<div class="li tap" data-a="item" data-id="${d.id}">${kic("doc")}<div class="b"><div class="t">${esc(d.title||d.docType)} ${st}</div><div class="d">${esc(itemSub(d))}${d.names?.length?" · "+esc(d.names.join(", ")):""}</div></div><div class="r">${refChip(d.ref)}</div></div>`}).join(""):`<div class="small muted">Add passport, visa, insurance and IDs — expiry is checked against your trip dates.</div>`;
  h+=`</div><div class="card"><div class="h">${ic("clip")}<h2>Files in this trip</h2><span class="sp"></span><span class="small dim">${files.length} · ${(files.reduce((a,f)=>a+(f.size||0),0)/1048576).toFixed(1)} MB</span></div>`;
  h+=files.length?files.map(f=>{const its=S.items.filter(i=>(f.itemIds||[]).includes(i.id));return`<div class="li"><span class="kic sm k-doc">${ic(f.type?.startsWith("image/")?"eye":"file","sm")}</span><div class="b"><div class="t" style="font-weight:550;word-break:break-all">${esc(f.name)}</div><div class="d">${(f.size/1024).toFixed(0)} KB · ${new Date(f.createdAt).toLocaleDateString()} · ${its.length?its.map(i=>esc(itemTitle(i))).join(", "):"<span class='dim'>not linked</span>"}</div><div class="small dim mono" title="SHA-256 used for duplicate detection">#${f.hash.slice(0,12)}</div></div><div class="r row" style="gap:4px"><button class="ibtn" data-a="openFile" data-id="${f.id}" title="Open">${ic("eye")}</button><button class="ibtn" data-a="delFile" data-id="${f.id}" title="Delete">${ic("trash")}</button></div></div>`}).join(""):`<div class="small muted">Files you import are kept here, offline, with a fingerprint so the same file is never stored twice.</div>`;
  h+=`</div><div class="card"><div class="h">${ic("db")}<h2>Storage on this device</h2></div><div id="stor" class="small muted">Checking…</div><div class="row wrap mt"><button class="btn" data-a="persist">${ic("shield")} Keep data persistent</button><button class="btn" data-a="backup">${ic("download")} Backup / restore</button></div></div>`;
  setTimeout(async()=>{const el=$("#stor");if(!el)return;let s="";try{const est=await navigator.storage?.estimate?.();if(est)s+=`Using ${(est.usage/1048576).toFixed(1)} MB of ~${(est.quota/1073741824).toFixed(1)} GB available. `;const p=await navigator.storage?.persisted?.();s+=p?`<span style="color:var(--ok)">Persistent — browser won't auto-clear it.</span>`:`<span style="color:var(--warn)">Not persistent — browser may clear it under storage pressure. Tap "Keep data persistent" and keep a backup.</span>`}catch(e){s="Storage info unavailable."}el.innerHTML=s},0);
  return h}
