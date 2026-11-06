"use strict";
/* ===== Utilities ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ic=(n,c="")=>`<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;
const kic=(k,sm)=>`<span class="kic ${sm?"sm":""} k-${k}">${ic(KINDS[k]?.i||"flag",sm?"sm":"")}</span>`;
const pad=n=>String(n).padStart(2,"0");
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dParts=d=>{const[y,m,dd]=d.split("-").map(Number);return{y,m,d:dd}};
const dObj=d=>{const p=dParts(d);return new Date(Date.UTC(p.y,p.m-1,p.d))};
const dStr=dt=>`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`;
const addDays=(d,n)=>{const x=dObj(d);x.setUTCDate(x.getUTCDate()+n);return dStr(x)};
const dayDiff=(a,b)=>Math.round((dObj(b)-dObj(a))/864e5);
const fmtD=(d,y)=>{if(!d)return"—";const x=dObj(d);return`${WD[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]}${y?" "+x.getUTCFullYear():""}`};
const fmtDs=d=>{if(!d)return"—";const x=dObj(d);return`${x.getUTCDate()} ${MON[x.getUTCMonth()]}`};
const hm=t=>{if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+(m||0)};
const mhm=m=>`${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
const dur=m=>{m=Math.round(m);const h=Math.floor(m/60),mm=m%60;return h?`${h}h${mm?" "+mm+"m":""}`:`${mm}m`};
const splitLT=s=>s?{d:s.slice(0,10),t:s.slice(11,16)||"00:00"}:{d:"",t:""};
const todayIn=tz=>{const p=tzParts(tz,Date.now());return`${p.y}-${pad(p.m)}-${pad(p.d)}`};
/* ===== Timezone engine (Intl based, no deps) ===== */
const _dtf={};
function tzParts(tz,ms){
  const f=_dtf[tz]||(_dtf[tz]=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric"}));
  const o={};f.formatToParts(new Date(ms)).forEach(p=>{if(p.type!=="literal")o[p.type]=+p.value});
  return{y:o.year,m:o.month,d:o.day,h:o.hour%24,mi:o.minute,s:o.second};
}
function tzOff(tz,ms){const p=tzParts(tz,ms);return(Date.UTC(p.y,p.m-1,p.d,p.h,p.mi,p.s)-Math.floor(ms/1000)*1000)/6e4}
function toUTC(local,tz){ // local "YYYY-MM-DDTHH:MM"
  if(!local)return NaN;tz=tz||"Asia/Kolkata";
  const{y,m,d}=dParts(local.slice(0,10));const t=hm(local.slice(11,16));
  const g=Date.UTC(y,m-1,d,Math.floor(t/60),t%60);let o=tzOff(tz,g);let u=g-o*6e4;const o2=tzOff(tz,u);if(o2!==o)u=g-o2*6e4;return u;
}
function fromUTC(ms,tz){const p=tzParts(tz,ms);return`${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`}
const offLabel=(tz,ms=Date.now())=>{const o=tzOff(tz,ms);const s=o>=0?"+":"-";const a=Math.abs(o);return`UTC${s}${Math.floor(a/60)}${a%60?":"+pad(a%60):""}`};
const tzShort=tz=>(tz||"").split("/").pop().replace(/_/g," ");
/* ===== Money ===== */
const sym=c=>CUR_SYM[c]??(c+" ");
function fmtM(v,c="INR",dec){if(v==null||isNaN(v))return"—";const n=Math.abs(v)>=1000||dec===0?Math.round(v):Math.round(v*100)/100;
  const s=c==="INR"?n.toLocaleString("en-IN",{maximumFractionDigits:2}):n.toLocaleString("en-US",{maximumFractionDigits:2});return(v<0?"-":"")+sym(c)+s.replace("-","")}
function rate(trip,c){if(!c||c==="INR")return 1;const r=trip?.rates?.[c];return r>0?r:null}
function toINR(trip,amt,c){const r=rate(trip,c);return r==null?null:(+amt||0)*r}
function parseRates(s){const o={};(s||"").split(/[,;\n]/).forEach(p=>{const m=p.match(/([A-Z]{3})\s*[=:]\s*([\d.]+)/i);if(m)o[m[1].toUpperCase()]=+m[2]});return o}
const ratesStr=o=>Object.entries(o||{}).map(([k,v])=>`${k}=${v}`).join(", ");
/* ===== Hashing ===== */
async function sha256(buf){
  try{if(crypto?.subtle){const h=await crypto.subtle.digest("SHA-256",buf);return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}}catch(e){}
  // fallback: 2x 53-bit cyrb hash
  const u=new Uint8Array(buf);let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){h1=Math.imul(h1^u[i],2654435761);h2=Math.imul(h2^u[i],1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return"fb"+(h2>>>0).toString(16)+(h1>>>0).toString(16)+u.length.toString(16);
}
const textHash=s=>sha256(new TextEncoder().encode(String(s).replace(/\s+/g," ").trim().toLowerCase()));
/* ===== Item time model =====
   Every item exposes events: [{s,e(local "YYYY-MM-DDTHH:MM"), tz, sUTC, eUTC, kind, label, buf?}] */
const apTz=c=>AP[c]?.tz||null;
const isIntlFlight=it=>{const a=AP[it.from],b=AP[it.to];return a&&b?a.cc!==b.cc:!!(it.intl)};
function itemStart(it){
  switch(it.kind){
    case"flight":case"train":return it.dep?{l:it.dep,tz:it.depTz||apTz(it.from)||"Asia/Kolkata"}:null;
    case"hotel":return it.checkIn?{l:it.checkIn,tz:it.tz}:null;
    case"doc":return null;
    case"expense":return it.date?{l:it.date+"T"+(it.time||"12:00"),tz:it.tz}:null;
    default:return it.start?{l:it.start,tz:it.tz}:null;
  }
}
function sortKey(it){const s=itemStart(it);return s?toUTC(s.l,s.tz||"Asia/Kolkata"):9e15}
function itemEvents(it,set=S.settings){
  const ev=[];const add=(s,e,tz,o)=>{if(!s)return;e=e||s;const su=toUTC(s,tz),eu=toUTC(e,o?.etz||tz);ev.push({s,e,tz,etz:o?.etz||tz,su,eu,kind:it.kind,it,...o})};
  if(it.kind==="flight"&&it.dep){
    const dtz=it.depTz||apTz(it.from)||"Asia/Kolkata",atz=it.arrTz||apTz(it.to)||dtz;const intl=isIntlFlight(it);
    const pre=intl?set.preIntl:set.preDom,post=intl?set.postIntl:set.postDom;
    const du=toUTC(it.dep,dtz);
    add(fromUTC(du-pre*6e4,dtz),it.dep,dtz,{buf:1,label:intl?"Airport · check-in, security & immigration":"Airport · check-in & security"});
    const arr=it.arr||fromUTC(du+120*6e4,atz);
    add(it.dep,arr,dtz,{etz:atz,label:`${it.flightNo||"Flight"} ${it.from||""}→${it.to||""}`,main:1});
    const au=toUTC(arr,atz);add(arr,fromUTC(au+post*6e4,atz),atz,{buf:1,label:intl?"Immigration, baggage & transfer":"Baggage & exit"});
  }else if(it.kind==="train"&&it.dep){
    const tz=it.tz||"Asia/Kolkata";const du=toUTC(it.dep,tz);
    add(fromUTC(du-set.trainPre*6e4,tz),it.dep,tz,{buf:1,label:"Reach station"});
    add(it.dep,it.arr||fromUTC(du+180*6e4,tz),tz,{label:`${it.trainNo||"Train"} ${it.from||""}→${it.to||""}`,main:1});
  }else if(it.kind==="hotel"){
    const tz=it.tz||"Asia/Kolkata";
    if(it.checkIn){const u=toUTC(it.checkIn,tz);add(it.checkIn,fromUTC(u+30*6e4,tz),tz,{label:`Check-in · ${it.name||"Stay"}`,main:1})}
    if(it.checkOut){const u=toUTC(it.checkOut,tz);add(fromUTC(u-30*6e4,tz),it.checkOut,tz,{label:`Check-out · ${it.name||"Stay"}`,main:1})}
  }else if(it.kind==="transfer"||it.kind==="activity"){
    if(it.start){const tz=it.tz||"Asia/Kolkata";add(it.start,it.end||fromUTC(toUTC(it.start,tz)+60*6e4,tz),tz,{label:it.title||KINDS[it.kind].n,main:1})}
  }
  return ev;
}
const itemTitle=it=>{switch(it.kind){
  case"flight":return`${it.from||"???"} → ${it.to||"???"}`;
  case"train":return`${it.from||"?"} → ${it.to||"?"}${it.trainName?" · "+it.trainName:""}`;
  case"hotel":return it.name||"Stay";
  case"doc":return it.title||it.docType||"Document";
  default:return it.title||KINDS[it.kind].n}};
const itemSub=it=>{switch(it.kind){
  case"flight":{const a=splitLT(it.dep),b=splitLT(it.arr);return`${it.flightNo||""}${it.airline?" · "+it.airline:""} · ${fmtDs(a.d)} ${a.t}${b.t?"–"+b.t+(b.d&&b.d!==a.d?" (+"+dayDiff(a.d,b.d)+")":""):""}`}
  case"train":{const a=splitLT(it.dep),b=splitLT(it.arr);return`${it.trainNo||""}${it.cls?" · "+it.cls:""} · ${fmtDs(a.d)} ${a.t}${b.t?"–"+b.t:""}`}
  case"hotel":{const n=it.checkIn&&it.checkOut?dayDiff(it.checkIn.slice(0,10),it.checkOut.slice(0,10)):0;return`${fmtDs(it.checkIn?.slice(0,10))} → ${fmtDs(it.checkOut?.slice(0,10))} · ${n} night${n===1?"":"s"}`}
  case"doc":return`${it.docType||""}${it.expiry?" · expires "+fmtD(it.expiry,1):""}`;
  case"expense":return`${it.cat||""} · ${fmtDs(it.date)}`;
  default:{const a=splitLT(it.start);return a.d?`${fmtDs(a.d)} ${a.t}${it.end?"–"+splitLT(it.end).t:""}${it.location?" · "+it.location:""}`:it.location||""}}};
/* payments */
function payInfo(it){
  const cost=+it.cost||0;const paid=(it.payments||[]).filter(p=>p.status==="paid").reduce((a,p)=>a+(+p.amount||0),0);
  const sched=(it.payments||[]).filter(p=>p.status!=="paid");
  const pend=it.kind==="expense"?0:Math.max(0,cost-paid);
  const due=sched.map(p=>p.due).filter(Boolean).sort()[0]||null;
  return{cost,paid:it.kind==="expense"?cost:Math.min(paid,cost||paid),pend,due,cur:it.cur||"INR"};
}
