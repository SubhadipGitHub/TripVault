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
    if(it.kind==="flight"||it.kind==="train")L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(e.label),"TRIGGER:-PT"+(it.kind==="flight"?"4":"2")+"H","END:VALARM");
    L.push("END:VEVENT");n++});
  L.push("END:VCALENDAR");return{text:L.map(icsFold).join("\r\n")+"\r\n",n};
}
function exportICS(){const t=curTrip();if(!t)return;const{text,n}=buildICS(t);if(!n){toast("Nothing to export yet — add bookings first","bad");return}
  dl(new Blob([text],{type:"text/calendar"}),`tripvault-${slug(t.name)}.ics`);toast(`${n} events exported. Open the file to add them to your calendar`)}

/* ---------- split expenses ---------- */
const tripPeople=t=>Array.isArray(t.people)&&t.people.length?t.people:[...new Set(tripItems(t.id).flatMap(i=>i.names||[]))].slice(0,8);
function settle(t){
  const ppl=tripPeople(t),bal=Object.fromEntries(ppl.map(p=>[p,0]));let total=0;
  for(const e of tripItems(t.id).filter(i=>i.kind==="expense"&&i.paidBy&&bal[i.paidBy]!==undefined)){
    const v=toINR(t,e.cost,e.cur);if(v==null)continue;total+=v;const share=v/ppl.length;bal[e.paidBy]+=v;ppl.forEach(p=>bal[p]-=share)}
  const cr=ppl.filter(p=>bal[p]>1).map(p=>({p,v:bal[p]})).sort((a,b)=>b.v-a.v),db=ppl.filter(p=>bal[p]<-1).map(p=>({p,v:-bal[p]})).sort((a,b)=>b.v-a.v),pay=[];
  while(cr.length&&db.length){const a=cr[0],d=db[0],x=Math.min(a.v,d.v);pay.push({from:d.p,to:a.p,v:x});a.v-=x;d.v-=x;if(a.v<1)cr.shift();if(d.v<1)db.shift()}
  return{ppl,bal,total,pay};
}
function settleCard(t){
  const S2=settle(t),ppl=S2.ppl;
  return`<div class="card"><div class="h">${ic("user")}<h2>Split & settle up</h2></div>
   <label>Who's sharing costs? (comma separated)</label><input data-people value="${esc(ppl.join(", "))}" placeholder="Arjun, Riya, Meera">
   <div class="small dim" style="margin:4px 0 8px">Pick “Paid by” when you log an expense. Costs are split equally between these people.</div>
   ${ppl.length<2?`<div class="small muted">Add at least two people to split costs.</div>`:S2.total?`<div class="small muted">${fmtM(S2.total)} of logged expenses shared by ${ppl.length}</div>
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
