"use strict";
/* ===================== Ideas board, spend by day, duplicate trip ===================== */
const IDEA_CATS=["See","Eat","Do","Shop","Stay","Other"];
const mapUrl=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);

/* Places to see / eat / do. Schedule one and it becomes an activity in the plan. */
function viewIdeas(t){
  const L=t.ideas||[];
  let h=`<div class="card"><div class="h">${ic("compass")}<h2>Ideas · ${L.length}</h2></div>
   <div class="fg"><div class="full"><label>Idea</label><input id="idT" placeholder="Petronas skybridge, Jalan Alor night market…"></div>
   <div><label>Type</label><select id="idC">${IDEA_CATS.map(c=>`<option>${c}</option>`).join("")}</select></div><div><label>Place / area (for maps)</label><input id="idP" placeholder="KLCC, Kuala Lumpur"></div>
   <div class="full"><label>Note</label><input id="idN" placeholder="Book ahead, closed Mondays…"></div></div>
   <div class="row mt"><span class="sp"></span><button class="btn pri" data-a="ideaAdd">${ic("plus","sm")} Add idea</button></div></div>`;
  if(!L.length)return h+`<div class="card empty">${kic("activity")}<b>Your wish list</b><div class="small">Drop places and things you'd like to do. When you know the day, tap Schedule and it lands in your plan.</div></div>`;
  const cats=[...new Set(L.map(i=>i.cat||"Other"))];
  return h+cats.map(c=>`<div class="card"><div class="h"><h2>${esc(c)}</h2></div>${L.filter(i=>(i.cat||"Other")===c).map(i=>`<div class="li"><div class="b"><div class="t">${esc(i.text)} ${i.scheduled?pill(ic("check","sm")+" scheduled","ok"):""}</div><div class="d">${esc([i.place,i.note].filter(Boolean).join(" · "))}</div>
    <div class="row wrap" style="margin-top:6px">${i.scheduled?"":`<button class="btn xs ok" data-a="ideaSched" data-id="${i.id}">${ic("cal","sm")} Schedule</button>`}<a class="btn xs" href="${mapUrl((i.text+" "+(i.place||t.dest||"")).trim())}" target="_blank" rel="noopener noreferrer">${ic("pin","sm")} Map</a><button class="btn xs ghost" data-a="ideaDel" data-id="${i.id}" aria-label="Delete idea">${ic("trash","sm")}</button></div></div></div>`).join("")}</div>`).join("");
}

function dailySpend(t){
  const ex=tripItems(t.id).filter(i=>i.kind==="expense"&&i.date),by={};let skipped=0;
  for(const e of ex){const v=toINR(t,e.cost,e.cur);if(v==null){skipped++;continue}by[e.date]=(by[e.date]||0)+v}
  const days=Object.keys(by).sort();if(!days.length)return"";
  const mx=Math.max(...Object.values(by)),tot=Object.values(by).reduce((a,b)=>a+b,0),avg=tot/days.length;
  return`<div class="card"><div class="h">${ic("tag")}<h2>Spend by day</h2><span class="sp"></span><span class="small muted">avg ${fmtM(avg)}/day</span></div>
   ${days.map(d=>`<div class="catbar"><div class="nm" style="width:64px">${fmtDs(d)}</div><div class="bar"><i style="width:${by[d]/mx*100}%;background:${by[d]>avg*1.5?"var(--warn)":"var(--expense)"}"></i></div><div class="am">${fmtM(by[d])}</div></div>`).join("")}
   <div class="small dim">Logged expenses only. Amber means well above your average.${skipped?` ${skipped} not counted (no exchange rate).`:""}</div></div>`;
}

async function duplicateTrip(){
  const t=curTrip();if(!t)return;
  const n={...structuredClone(t),id:uid(),name:t.name.replace(/^Sample · /,"")+" (copy)",start:"",end:"",createdAt:Date.now(),sample:false};
  if(t.pack)n.pack=t.pack.map(p=>({...p,id:uid(),done:false}));
  n.ideas=(t.ideas||[]).map(i=>({...i,id:uid(),scheduled:false}));
  await saveTrip(n);S.cur=n.id;S.meta.cur=n.id;S.day=null;saveMeta();closeAllSheets();render();
  toast("Copied packing list, ideas and settings into a new trip. Add dates and bookings");
}
