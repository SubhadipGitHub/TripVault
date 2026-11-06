"use strict";
/* ===================== UI infrastructure ===================== */
function toast(msg,kind="ok"){$$(".toast").forEach(t=>t.remove());const t=document.createElement("div");t.className="toast";t.innerHTML=`${ic(kind==="ok"?"check":kind==="bad"?"alert":"info","sm")}<span>${msg}</span>`;t.style.color=kind==="bad"?"var(--bad)":"";document.body.append(t);setTimeout(()=>t.remove(),2800)}
function sheet({title,body,foot="",onClose,cls=""}){const ov=document.createElement("div");ov.className="ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
  ov.innerHTML=`<div class="sheet ${cls}"><div class="sh"><h3>${title}</h3><button class="ibtn" data-close>${ic("x")}</button></div><div class="sb">${body}</div>${foot?`<div class="sf">${foot}</div>`:""}</div>`;
  document.body.append(ov);const close=()=>{ov.remove();onClose?.()};ov.close=close;if(matchMedia("(min-width:760px)").matches)ov.querySelector("input:not([type=file]):not([type=checkbox]):not([type=radio]),textarea")?.focus();
  ov.addEventListener("mousedown",e=>{if(e.target===ov)ov._down=1});ov.addEventListener("click",e=>{if((e.target===ov&&ov._down)||e.target.closest("[data-close]"))close();ov._down=0});return ov}
const topSheet=()=>$$(".ov").pop();
function gate({title,plan,irreversible,ok="Proceed",danger=true}){return new Promise(res=>{let done=false;
  const ov=sheet({title,body:`<div class="note ${danger?"bad":"warn"}">${ic("alert")}<div><b>What will happen</b><ul style="margin:6px 0 0 16px">${plan.map(p=>`<li>${p}</li>`).join("")}</ul></div></div>${irreversible?`<div class="note mt">${ic("info")}<div><b>Irreversible:</b> ${irreversible}</div></div>`:""}`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn ${danger?"bad":"pri"}" id="gOk">${ok}</button>`,onClose:()=>{if(!done)res(false)}});
  $("#gOk",ov).onclick=()=>{done=true;ov.remove();res(true)}})}
async function copyTxt(t){try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement("textarea");a.value=t;document.body.append(a);a.select();document.execCommand("copy");a.remove()}toast("Copied "+(t.length>24?"":"<b>"+esc(t)+"</b>"))}
const ring=(pct,c="var(--ok)")=>{const r=26,C=2*Math.PI*r;return`<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C*pct/100} ${C}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" fill="var(--tx)" font-size="15" font-weight="700">${Math.round(pct)}%</text></svg>`};
const pill=(t,c="")=>`<span class="pill ${c}">${t}</span>`;
const refChip=r=>r?`<span class="mono copy small" data-copy="${esc(r)}" title="Copy">${esc(r)}</span>`:"";

/* ===================== Trip model helpers ===================== */
function itemDates(it){const o=[];const p=s=>s&&o.push(s.slice(0,10));
  if(it.kind==="flight"||it.kind==="train"){p(it.dep);p(it.arr)}else if(it.kind==="hotel"){p(it.checkIn);p(it.checkOut)}else if(it.kind==="expense")p(it.date);else if(it.kind!=="doc"){p(it.start);p(it.end)}return o}
function tripRange(t){let s=t.start,e=t.end;if(!s||!e){const ds=tripItems(t.id).flatMap(itemDates).sort();s=s||ds[0];e=e||ds[ds.length-1]}if(s&&e&&e<s)e=s;return{s,e}}
function tripDays(t){const{s,e}=tripRange(t);if(!s)return[];const n=Math.min(90,dayDiff(s,e));return Array.from({length:n+1},(_,i)=>addDays(s,i))}
const hotels=t=>tripItems(t.id).filter(i=>i.kind==="hotel"&&i.checkIn);
const stayOn=(t,d)=>hotels(t).find(h=>h.checkIn.slice(0,10)<=d&&(h.checkOut||h.checkIn).slice(0,10)>d);
const transports=t=>tripItems(t.id).filter(i=>(i.kind==="flight"||i.kind==="train")&&i.dep).sort((a,b)=>sortKey(a)-sortKey(b));
function dayTz(t,d){const s=stayOn(t,d);if(s?.tz)return s.tz;const co=hotels(t).find(h=>h.checkOut?.slice(0,10)===d);if(co?.tz)return co.tz;
  const tr=transports(t).filter(x=>(x.arr||x.dep).slice(0,10)<=d).pop();if(tr)return tr.kind==="flight"?(tr.arrTz||apTz(tr.to)||t.tz):(tr.tz||t.tz);return t.tz||S.settings.homeTz}
function tripMeta(t){const{s,e}=tripRange(t);if(!s)return"no dates yet";const n=dayDiff(s,e)+1;return`${fmtDs(s)} – ${fmtDs(e)} · ${n}d`}
function tripPhase(t){const{s,e}=tripRange(t);const td=todayIn(t.tz||S.settings.homeTz);if(!s)return{p:"none"};if(td<s)return{p:"before",days:dayDiff(td,s)};if(td>e)return{p:"after"};return{p:"during",day:dayDiff(s,td)+1,of:dayDiff(s,e)+1,today:td}}
function dayModel(t,d){
  const set=S.settings,segs=[];
  for(const it of tripItems(t.id))for(const ev of itemEvents(it)){const sd=ev.s.slice(0,10),ed=ev.e.slice(0,10);
    if(sd===d&&ed===d)segs.push({a:hm(ev.s.slice(11)),b:Math.max(hm(ev.s.slice(11))+1,hm(ev.e.slice(11))),ev});
    else if(sd===d&&ed>d)segs.push({a:hm(ev.s.slice(11)),b:1440,ev,cont:1});
    else if(ed===d&&sd<d)segs.push({a:0,b:hm(ev.e.slice(11)),ev,from:1});
    else if(sd<d&&ed>d)segs.push({a:0,b:1440,ev,mid:1})}
  segs.sort((x,y)=>x.a-y.a||x.b-y.b);
  let W0=hm(set.wake),W1=hm(set.sleep),cutA=-1;
  // don't offer "free time" at home before the outbound / after the return leg
  const tr=transports(t);if(tr.length){const f=itemEvents(tr[0])[0],l=itemEvents(tr[tr.length-1]).pop();const{s,e}=tripRange(t);
    if(f&&f.s.slice(0,10)===d&&d===s)cutA=hm(f.s.slice(11));const lt=tr[tr.length-1],round=tr.length>1&&(lt.to===tr[0].from||(AP[lt.to]&&AP[tr[0].from]&&AP[lt.to].city===AP[tr[0].from].city));if(round&&l&&l.e.slice(0,10)===d&&d===e)W1=Math.min(W1,hm(l.e.slice(11)))}
  const busy=segs.map(s=>[Math.max(W0,s.a),Math.min(W1,s.b)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  const gaps=[];let cur=W0;for(const[a,b]of busy){if(a-cur>=set.minGap)gaps.push({a:cur,b:a});cur=Math.max(cur,b)}if(W1-cur>=set.minGap)gaps.push({a:cur,b:W1});
  for(let i=gaps.length-1;i>=0;i--)if(gaps[i].b<=cutA)gaps.splice(i,1);
  return{segs,gaps,stay:stayOn(t,d),tz:dayTz(t,d),free:gaps.reduce((s,g)=>s+g.b-g.a,0),win:Math.max(1,hm(set.sleep)-hm(set.wake))}}

/* ===================== Readiness checks ===================== */
function readiness(t){
  const C=[],its=tripItems(t.id),{s,e}=tripRange(t),tr=transports(t),intl=isIntlTrip(t);
  const add=(lv,txt,act)=>C.push({lv,txt,act});
  if(!s){add("warn","Set trip dates or import a booking",`<button class="btn xs" data-a="editTrip">Set dates</button>`);return C}
  const depOn=d=>tr.some(x=>x.dep.slice(0,10)===d||x.dep.slice(0,10)===addDays(d,-1)&&(x.arr||"").slice(0,10)===d);
  add(depOn(s)?"ok":"warn",depOn(s)?`Outbound travel booked for ${fmtD(s)}`:`No flight/train found on ${fmtD(s)} (trip start)`,depOn(s)?"":`<button class="btn xs" data-a="add" data-k="flight">+ Flight</button>`);
  const back=tr.some(x=>x.dep.slice(0,10)===e||(x.arr||"").slice(0,10)===e);
  if(dayDiff(s,e)>0)add(back?"ok":"warn",back?`Return travel booked for ${fmtD(e)}`:`No return travel on ${fmtD(e)} (trip end)`,back?"":`<button class="btn xs" data-a="add" data-k="flight">+ Flight</button>`);
  const miss=[];for(let d=s;d<e;d=addDays(d,1)){const ov=tr.some(x=>x.dep.slice(0,10)===d&&(x.arr||"").slice(0,10)>d);if(!stayOn(t,d)&&!ov)miss.push(d)}
  if(dayDiff(s,e)>0)add(miss.length?"bad":"ok",miss.length?`No stay booked for ${miss.length} night${miss.length>1?"s":""}: ${miss.slice(0,4).map(fmtDs).join(", ")}${miss.length>4?"…":""}`:`Every night has a stay (${dayDiff(s,e)} nights)`,miss.length?`<button class="btn xs" data-a="add" data-k="hotel" data-d="${miss[0]}">+ Stay</button>`:"");
  for(let i=1;i<tr.length;i++){const a=tr[i-1],b=tr[i];const ae=itemEvents(a).find(x=>x.main),be=itemEvents(b).find(x=>x.main);if(!ae||!be)continue;const gap=(be.su-ae.eu)/6e4;
    const need=(a.kind==="flight"&&b.kind==="flight")?(isIntlFlight(a)||isIntlFlight(b)?120:75):90;
    if(gap<0)add("bad",`Overlapping travel: ${a.flightNo||a.trainNo} and ${b.flightNo||b.trainNo}`);
    else if(gap<need&&gap<12*60)add("bad",`Tight connection: ${dur(gap)} at ${b.from||"?"} between ${a.flightNo||a.trainNo} → ${b.flightNo||b.trainNo} (aim for ${dur(need)}+)`)}
  const B=budgetOf(t);
  if(B.pending>0){const od=B.dues.filter(x=>x.p.due&&x.p.due<todayIn(t.tz||"Asia/Kolkata"));add(od.length?"bad":"warn",`${fmtM(B.pending)} still to pay across ${B.dues.length} booking${B.dues.length>1?"s":""}${od.length?` · ${od.length} overdue`:""}`,`<button class="btn xs" data-a="go" data-v="money">Review</button>`)}
  else if(B.committed>0)add("ok","All bookings paid");
  if(B.unconv.length)add("warn",`Set exchange rate for ${[...new Set(B.unconv.map(x=>x.p.cur))].join(", ")} to include ${B.unconv.length} amount${B.unconv.length>1?"s":""} in the budget`,`<button class="btn xs" data-a="go" data-v="money">Set rate</button>`);
  if(intl){const pp=its.filter(i=>i.kind==="doc"&&i.docType==="Passport");
    if(!pp.length)add("warn","Add your passport (expiry) to check validity",`<button class="btn xs" data-a="add" data-k="doc" data-dt="Passport">+ Passport</button>`);
    else for(const p of pp){if(!p.expiry){add("warn",`Passport${p.names?.[0]?" ("+esc(p.names[0])+")":""}: add expiry date`);continue}const lim=addDays(e,183);add(p.expiry>=lim?"ok":"bad",p.expiry>=lim?`Passport${p.names?.[0]?" ("+esc(p.names[0])+")":""} valid 6+ months after return`:`Passport${p.names?.[0]?" ("+esc(p.names[0])+")":""} expires ${fmtD(p.expiry,1)} — many countries need 6 months' validity`)}
    if(!its.some(i=>i.kind==="doc"&&i.docType==="Visa"))add("info",`Visa / e-visa / visa-on-arrival status not recorded for ${esc(t.dest||"destination")} — check the official rules`,`<button class="btn xs" data-a="add" data-k="doc" data-dt="Visa">+ Visa</button>`);
    if(!its.some(i=>i.kind==="doc"&&i.docType==="Travel insurance"))add("info","No travel insurance saved",`<button class="btn xs" data-a="add" data-k="doc" data-dt="Travel insurance">+ Add</button>`)}
  const out=its.filter(i=>i.kind!=="doc"&&itemDates(i).some(d=>d<s||d>e));if(out.length&&t.start&&t.end)add("warn",`${out.length} booking${out.length>1?"s":""} fall outside trip dates`,`<button class="btn xs" data-a="fitDates">Extend dates</button>`);
  const days=tripDays(t);const unpl=days.filter(d=>!its.some(i=>(i.kind==="activity"||i.kind==="transfer")&&i.start?.slice(0,10)===d));if(unpl.length)add("info",`${unpl.length} day${unpl.length>1?"s":""} with no activities planned yet — tap a green free slot in Itinerary`,`<button class="btn xs" data-a="go" data-v="plan">Plan</button>`);
  if(its.length&&(!S.meta.lastBackup||S.meta.dirty>S.meta.lastBackup))add("info",S.meta.lastBackup?`Changes since last backup (${new Date(S.meta.lastBackup).toLocaleDateString()})`:"Never backed up — export a copy before you travel",`<button class="btn xs" data-a="backup">Backup</button>`);
  return C}
const isIntlTrip=t=>t.type==="international"||(t.type!=="domestic"&&(tripItems(t.id).some(i=>i.kind==="flight"&&isIntlFlight(i))||(t.tz&&t.tz!==S.settings.homeTz)));
function budgetOf(t){const its=tripItems(t.id).filter(i=>i.kind!=="doc");let committed=0,paid=0,pending=0;const unconv=[],cats={},dues=[],curs={};
  for(const it of its){const p=payInfo(it);if(!p.cost)continue;curs[p.cur]=(curs[p.cur]||0)+p.cost;const r=rate(t,p.cur);if(r==null){unconv.push({it,p});continue}
    committed+=p.cost*r;paid+=p.paid*r;pending+=p.pend*r;const cat=it.kind==="expense"?(it.cat||"Misc"):KINDS[it.kind].n;cats[cat]=(cats[cat]||0)+p.cost*r;if(p.pend>0)dues.push({it,p,inr:p.pend*r})}
  dues.sort((a,b)=>(a.p.due||"9").localeCompare(b.p.due||"9"));
  return{committed,paid,pending,left:(+t.budget||0)-committed,cats,unconv,dues,curs}}

