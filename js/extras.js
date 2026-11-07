"use strict";
/* ===================== Extras: calendar export, split expenses, shareable itinerary ===================== */
const icsEsc=s=>String(s??"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\;");
const icsDt=ms=>new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const icsFold=l=>{const o=[];while(l.length>73){o.push(l.slice(0,73));l=" "+l.slice(73)}o.push(l);return o.join("\r\n")};
function buildICS(t){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Trip Vault//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:"+icsEsc(t.name)],stamp=icsDt(Date.now());let n=0;
  for(const it of tripItems(t.id))itemEvents(it).filter(e=>e.main).forEach((e,i)=>{
    const desc=[it.ref&&"Ref: "+it.ref,it.seat&&"Seat: "+it.seat,it.terminal&&"Terminal: "+it.terminal,it.names?.length&&"Travellers: "+it.names.join(", "),it.notes].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT","UID:"+it.id+"-"+i+"@tripvault","DTSTAMP:"+stamp,"DTSTART:"+icsDt(e.su),"DTEND:"+icsDt(Math.max(e.eu,e.su+36e5/2)),"SUMMARY:"+icsEsc(e.label),
      "LOCATION:"+icsEsc(it.address||it.location||""),"DESCRIPTION:"+icsEsc(desc));
    if(isTransport(it.kind))L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(e.label),"TRIGGER:-PT"+(it.kind==="flight"?"4":"2")+"H","END:VALARM");
    L.push("END:VEVENT");n++});
  // Reminders: check-in opening (timed), payments due and document expiry (all-day)
  const dDate=d=>d.replace(/-/g,"");
  for(const a of alerts(t,3650)){if(!a.when||(typeof a.when==="number"&&a.when<=Date.now()))continue;const uid=`${a.item.id}-${a.kind}@tripvault`;
    const plain=s=>String(s).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
    L.push("BEGIN:VEVENT","UID:"+uid,"DTSTAMP:"+stamp);
    if(typeof a.when==="number")L.push("DTSTART:"+icsDt(a.when),"DTEND:"+icsDt(a.when+15*6e4));
    else L.push("DTSTART;VALUE=DATE:"+dDate(a.when),"DTEND;VALUE=DATE:"+dDate(addDays(a.when,1)));
    L.push("SUMMARY:"+icsEsc(plain(a.txt)),"DESCRIPTION:"+icsEsc(plain(a.sub||"")),"TRANSP:TRANSPARENT",
      "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(plain(a.txt)),"TRIGGER:"+(typeof a.when==="number"?"PT0M":a.kind==="doc"?"-P7D":"-PT15H"),"END:VALARM","END:VEVENT");n++}
  L.push("END:VCALENDAR");return{text:L.map(icsFold).join("\r\n")+"\r\n",n};
}
function exportICS(){const t=curTrip();if(!t)return;const{text,n}=buildICS(t);if(!n){toast("Nothing to export yet — add bookings first","bad");return}
  dl(new Blob([text],{type:"text/calendar"}),`tripvault-${slug(t.name)}.ics`);toast(`${n} events exported. Open the file to add them to your calendar`)}

/* ---------- split expenses ---------- */
const tripPeople=t=>Array.isArray(t.people)&&t.people.length?t.people:[...new Set(tripItems(t.id).flatMap(i=>i.names||[]))].slice(0,8);
function settle(t){
  const ppl=tripPeople(t),bal=Object.fromEntries(ppl.map(p=>[p,0])),paid=Object.fromEntries(ppl.map(p=>[p,0])),owe=Object.fromEntries(ppl.map(p=>[p,0]));let total=0,skipped=0;
  for(const e of tripItems(t.id).filter(i=>i.kind==="expense"&&i.paidBy&&bal[i.paidBy]!==undefined)){
    const v=toINR(t,e.cost,e.cur);if(v==null){skipped++;continue}total+=v;
    const who=(e.splitWith||[]).filter(p=>ppl.includes(p)),sh=who.length?who:ppl,share=v/sh.length;
    bal[e.paidBy]+=v;paid[e.paidBy]+=v;sh.forEach(p=>{bal[p]-=share;owe[p]+=share})}
  const cr=ppl.filter(p=>bal[p]>1).map(p=>({p,v:bal[p]})).sort((a,b)=>b.v-a.v),db=ppl.filter(p=>bal[p]<-1).map(p=>({p,v:-bal[p]})).sort((a,b)=>b.v-a.v),pay=[];
  while(cr.length&&db.length){const a=cr[0],d=db[0],x=Math.min(a.v,d.v);pay.push({from:d.p,to:a.p,v:x});a.v-=x;d.v-=x;if(a.v<1)cr.shift();if(d.v<1)db.shift()}
  return{ppl,bal,paid,owe,total,pay,skipped};
}
function settleCard(t){
  const S2=settle(t),ppl=S2.ppl;
  return`<div class="card"><div class="h">${ic("user")}<h2>Split & settle up</h2></div>
   <label>Who's sharing costs? (comma separated)</label><input data-people value="${esc(ppl.join(", "))}" placeholder="Arjun, Riya, Meera">
   <div class="small dim" style="margin:4px 0 8px">Pick “Paid by” when you log an expense. Each expense is shared equally by everyone, unless you open it and untick who it wasn't for.</div>
   ${ppl.length<2?`<div class="small muted">Add at least two people to split costs.</div>`:S2.total?`<div class="small muted">${fmtM(S2.total)} of logged expenses shared by ${ppl.length}</div>
    <div class="mt">${ppl.map(p=>`<div class="catbar"><div class="nm" style="width:auto;flex:1">${esc(p)}</div><div class="small muted">paid ${fmtM(S2.paid[p])} · share ${fmtM(S2.owe[p])}</div></div>`).join("")}</div>
    ${S2.skipped?`<div class="small" style="color:var(--warn)">${S2.skipped} expense${S2.skipped>1?"s":""} not counted: set the exchange rate above.</div>`:""}
    ${S2.pay.length?S2.pay.map(x=>`<div class="li"><div class="b"><div class="t">${esc(x.from)} <span class="dim">pays</span> ${esc(x.to)}</div></div><div class="r serif" style="font-size:18px;font-weight:700">${fmtM(x.v)}</div></div>`).join(""):`<div class="note ok mt">${ic("check")}<div>Everyone is square.</div></div>`}`:`<div class="small muted">No expenses with “Paid by” yet.</div>`}</div>`;
}

/* ---------- shareable read-only itinerary (single self-contained HTML, no bookings refs unless asked) ---------- */
function shareItinerary(){
  const t=curTrip();if(!t)return;
  const ov=sheet({title:`${ic("share")} Share itinerary`,body:`<p class="muted">Creates one HTML file with the day-by-day plan that anyone can open in a browser. No app or account needed.</p>
   <label class="row mt" style="cursor:pointer"><input type="checkbox" id="shRef"> <span style="font-size:13px;color:var(--tx)">Include booking references (PNR, confirmation numbers)</span></label>
   <label class="row mt" style="cursor:pointer"><input type="checkbox" id="shAddr" checked> <span style="font-size:13px;color:var(--tx)">Include hotel addresses</span></label>
   <div class="note warn mt">${ic("alert")}<div>The file is not protected. Anyone you send it to can read everything in it.</div></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="shGo">${ic("download","sm")} Download</button>`});
  $("#shGo",ov).onclick=()=>{const refs=$("#shRef",ov).checked,addr=$("#shAddr",ov).checked;
    const rows=tripDays(t).map((d,i)=>{const evs=tripItems(t.id).flatMap(it=>itemEvents(it).filter(e=>e.main&&e.s.slice(0,10)===d)).sort((a,b)=>a.su-b.su),st=stayOn(t,d);
      return`<section><h3>Day ${i+1} · ${esc(fmtD(d,1))}</h3>${evs.length?evs.map(e=>`<p><b>${esc(e.s.slice(11))}</b> ${esc(e.label)}${e.it.location?` · ${esc(e.it.location)}`:""}${refs&&e.it.ref?` <code>${esc(e.it.ref)}</code>`:""}</p>`).join(""):"<p class='m'>Free day</p>"}${st?`<p class="m">Night: ${esc(st.name)}${addr&&st.address?" — "+esc(st.address):""}</p>`:""}</section>`}).join("");
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.name)}</title><style>body{font:16px/1.55 Georgia,serif;max-width:640px;margin:0 auto;padding:24px;background:#faf6ec;color:#1d2232}h1{font-size:32px;margin:0}h3{font-size:15px;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #d9ccae;padding-bottom:4px;margin:26px 0 6px;color:#8f650f}p{margin:6px 0}.m{color:#6b6657}code{background:#efe6d0;padding:1px 5px;border-radius:4px}footer{margin-top:36px;color:#8a8573;font-size:12px}</style><h1>${esc(t.name)}</h1><p class="m">${esc(t.dest||"")} · ${esc(tripMeta(t))}</p>${rows}<footer>Made with Trip Vault</footer></html>`;
    dl(new Blob([html],{type:"text/html"}),`itinerary-${slug(t.name)}.html`);ov.remove();toast("Itinerary file downloaded")};
}

/* ---------- cost export: CSV and printable expense report ---------- */
function costRows(t){
  return tripItems(t.id).filter(i=>i.kind!=="doc").map(it=>({it,p:payInfo(it)})).filter(x=>x.p.cost>0).map(({it,p})=>{
    const st=it.kind==="expense"?{d:it.date||"",t:it.time||""}:splitLT(it.dep||it.start||it.checkIn);
    return{it,date:st.d||"",time:st.t||"",type:KINDS[it.kind].n,title:itemTitle(it),cat:it.kind==="expense"?(it.cat||"Misc"):KINDS[it.kind].n,
      amt:p.cost,cur:p.cur,home:toINR(t,p.cost,p.cur),paid:p.paid,pend:p.pend,by:it.paidBy||"",split:it.kind==="expense"&&it.paidBy?(it.splitWith?.length?it.splitWith.join(" / "):"Everyone"):"",
      via:it.kind==="expense"?(it.method||""):[...new Set((it.payments||[]).filter(x=>x.status==="paid").map(x=>x.method).filter(Boolean))].join(" / "),
      ref:it.ref||"",notes:it.notes||""}}).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
/* Spreadsheet-safe cell: quotes when needed, and neutralises formula injection (=, +, -, @). */
const csvCell=v=>{if(typeof v==="number")return String(Math.round(v*100)/100);let s=String(v??"");if(/^[=+\-@\t\r]/.test(s))s="'"+s;return/[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
function exportCSV(){
  const t=curTrip();if(!t)return;const R=costRows(t);if(!R.length){toast("No costs to export yet","bad");return}
  const H=["Date","Time","Type","Title","Category","Amount","Currency",`Amount (${HC()})`,"Paid","Pending","Paid by","Split between","Paid via","Reference","Notes"];
  const rows=[H,...R.map(r=>[r.date,r.time,r.type,r.title,r.cat,r.amt,r.cur,r.home??"",r.paid,r.pend,r.by,r.split,r.via,r.ref,r.notes])];
  dl(new Blob(["\ufeff"+rows.map(a=>a.map(csvCell).join(",")).join("\r\n")+"\r\n"],{type:"text/csv"}),`tripvault-${slug(t.name)}-costs.csv`);
  toast(`${R.length} rows exported`)}
function printExpenseReport(){
  const t=curTrip();if(!t)return;const R=costRows(t);if(!R.length){toast("No costs to export yet","bad");return}
  const tot=R.reduce((a,r)=>a+(r.home||0),0),unc=R.filter(r=>r.home==null).length,cats={};R.forEach(r=>{if(r.home!=null)cats[r.cat]=(cats[r.cat]||0)+r.home});
  const att=R.flatMap(r=>S.files.filter(f=>(f.itemIds||[]).includes(r.it.id)).map(f=>({f,r}))),imgs=att.filter(x=>/^image\//.test(x.f.type)),other=att.filter(x=>!/^image\//.test(x.f.type));
  printBook(`<h1>Expense report</h1><p class="bk-sub">${esc(t.name)}${t.dest?" · "+esc(t.dest):""} · ${tripMeta(t)}</p>
   <h2>All costs</h2><table><thead><tr><th>Date</th><th>Item</th><th>Category</th><th class="num">Amount</th><th class="num">${esc(HC())}</th><th>Paid by / via</th></tr></thead><tbody>
   ${R.map(r=>`<tr><td>${esc(r.date?fmtDs(r.date):"")}</td><td>${esc(r.title)}${r.ref?`<div class="bk-d">${esc(r.ref)}</div>`:""}</td><td>${esc(r.cat)}</td><td class="num">${fmtM(r.amt,r.cur)}${r.pend>0?`<div class="bk-d">${fmtM(r.pend,r.cur)} pending</div>`:""}</td><td class="num">${r.home==null?"no rate":fmtM(r.home)}</td><td>${esc([r.by,r.via].filter(Boolean).join(" · "))}</td></tr>`).join("")}</tbody>
   <tfoot><tr><th colspan="4">Total${unc?` (${unc} without an exchange rate not counted)`:""}</th><th class="num">${fmtM(tot)}</th><th></th></tr></tfoot></table>
   <h2>By category</h2><table><tbody>${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmtM(v)}</td></tr>`).join("")}</tbody></table>
   ${imgs.length?`<h2>Receipts</h2><div class="bk-r">${imgs.map(x=>`<figure><img src="${photoUrl(x.f.id)}" alt=""><figcaption>${esc(x.r.title)} · ${esc(x.r.date?fmtDs(x.r.date):"")}</figcaption></figure>`).join("")}</div>`:""}
   ${other.length?`<h2>Other attachments</h2><ul>${other.map(x=>`<li>${esc(x.f.name)} (${esc(x.r.title)})</li>`).join("")}</ul>`:""}
   <p class="bk-f">Generated by Trip Vault on ${esc(new Date().toLocaleDateString())}. Amounts in ${esc(HC())} use the exchange rates saved in the trip.</p>`)}
function exportCard(t){
  if(!tripItems(t.id).some(i=>i.kind!=="doc"&&payInfo(i).cost>0))return"";
  return`<div class="card"><div class="h">${ic("download")}<h2>Export costs</h2></div>
   <div class="small muted">Every booking and expense with its amount, ${esc(HC())} value, who paid and how. Use it for reimbursement claims or a spreadsheet.</div>
   <div class="row wrap mt"><button class="btn" data-a="expCSV">${ic("download","sm")} CSV for Excel / Sheets</button><button class="btn" data-a="expPrint">${ic("printer","sm")} Printable report with receipts</button></div></div>`}

/* ---------- per-category spending limits (home currency, saved on the trip) ---------- */
function openCatBudgets(){
  const t=curTrip();if(!t)return;const B=budgetOf(t),lim=t.catBudgets||{};
  const keys=[...new Set([...EXP_CATS,...Object.keys(B.cats),...Object.keys(lim)])];
  const ov=sheet({title:`${ic("sliders")} Category limits`,body:`<p class="small muted">Set a ${esc(HC())} limit for any category, or leave it blank for no limit. Bars turn amber near a limit and red over it, and Trip readiness flags anything over.</p>
   <div class="fg mt">${keys.map(k=>`<div><label>${esc(k)} <span class="dim">· ${fmtM(B.cats[k]||0)} so far</span></label><input type="number" inputmode="decimal" min="0" step="1" data-cb="${esc(k)}" value="${lim[k]||""}" placeholder="No limit"></div>`).join("")}</div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="cbSv">${ic("check","sm")} Save limits</button>`});
  $("#cbSv",ov).onclick=async()=>{const n={};$$("[data-cb]",ov).forEach(i=>{const v=+i.value;if(v>0)n[i.dataset.cb]=v});t.catBudgets=n;await saveTrip(t);ov.remove();render();toast(Object.keys(n).length?"Limits saved":"Limits cleared")}}
