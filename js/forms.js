"use strict";
/* ===================== Form helpers ===================== */
function F(label,name,val,o={}){return`<div class="${o.full?"full":""}"><label>${label}</label><input name="${name}" type="${o.type||"text"}" value="${esc(val??"")}" ${o.ph?`placeholder="${esc(o.ph)}"`:""} ${o.list?`list="${o.list}"`:""} ${o.step?`step="${o.step}"`:""} ${o.up?`style="text-transform:uppercase"`:""} class="${o.cls||""}" autocomplete="off"></div>`}
function Sel(label,name,val,opts,o={}){return`<div class="${o.full?"full":""}"><label>${label}</label><select name="${name}" class="${o.cls||""}">${opts.map(x=>{const[v,l]=Array.isArray(x)?x:[x,x];return`<option value="${esc(v)}" ${String(v)===String(val??"")?"selected":""}>${esc(l)}</option>`}).join("")}</select></div>`}
const TZsel=(l,n,v)=>Sel(l,n,v||"",[["","Auto (from airport/city)"],...TZS.map(z=>[z,`${tzShort(z)} · ${offLabel(z)}`])]);
function gather(root){const o={};$$("[name]",root).forEach(e=>{if(e.closest(".payrow"))return;o[e.name]=e.type==="checkbox"?e.checked:e.value.trim()});return o}
const hl=(f,k)=>f?(f[k]?"found":"miss"):"";
function apDatalist(){if($("#apl"))return;const d=document.createElement("datalist");d.id="apl";d.innerHTML=Object.values(AP).map(a=>`<option value="${a.code}">${esc(a.city)} · ${a.cc}</option>`).join("");document.body.append(d)}
function itemFields(it,o={}){
  const k=it.kind,a=splitLT(it.dep||it.start||it.checkIn),b=splitLT(it.arr||it.end||it.checkOut),f=o.f;
  switch(k){
    case"flight":return`<div class="fg f4">${F("Flight no.","flightNo",it.flightNo,{ph:"6E 1061",up:1,cls:hl(f,"flightNo")})}${F("Airline","airline",it.airline,{ph:"auto"})}${F("From (IATA)","from",it.from,{list:"apl",ph:"BLR",up:1,cls:hl(f,"from")})}${F("To (IATA)","to",it.to,{list:"apl",ph:"KUL",up:1,cls:hl(f,"to")})}
      ${F("Departs (local date)","depD",a.d,{type:"date",cls:hl(f,"dep")})}${F("Dep. time","depT",a.t,{type:"time",cls:hl(f,"dep")})}${F("Arrives (local date)","arrD",b.d,{type:"date",cls:hl(f,"arr")})}${F("Arr. time","arrT",b.t,{type:"time",cls:hl(f,"arr")})}
      ${F("Terminal","terminal",it.terminal,{ph:"T1"})}${o.compact?"":F("Seat","seat",it.seat)+F("PNR","ref",it.ref,{up:1})+F("Booking ID","bookingId",it.bookingId)}
      ${o.compact?"":`<div class="full"><details><summary>Timezones (auto from airport)</summary><div class="fg" style="margin-top:6px">${TZsel("Departure TZ","depTz",it.depTz)}${TZsel("Arrival TZ","arrTz",it.arrTz)}</div></details></div>`}</div>`;
    case"train":case"bus":case"ferry":{const L=RIDE_L[k],tr=k==="train";return`<div class="fg f4">${F(L.no,"trainNo",it.trainNo,{ph:L.noPh,cls:hl(f,"trainNo")})}${F(L.nm,"trainName",it.trainName,{ph:L.nmPh||"",cls:hl(f,"trainName")})}${F(L.from,"from",it.from,{up:tr,cls:hl(f,"from")})}${F(L.to,"to",it.to,{up:tr,cls:hl(f,"to")})}
      ${F(L.fromN,"fromName",it.fromName,{cls:hl(f,"fromName")})}${F(L.toN,"toName",it.toName,{cls:hl(f,"toName")})}${F(L.cls,"cls",it.cls,{ph:L.clsPh})}${F(L.seat,"seat",it.seat,{ph:L.seatPh,cls:hl(f,"seat")})}
      ${F("Departs","depD",a.d,{type:"date",cls:hl(f,"dep")})}${F("Dep. time","depT",a.t,{type:"time",cls:hl(f,"dep")})}${F("Arrives","arrD",b.d,{type:"date",cls:hl(f,"arr")})}${F("Arr. time","arrT",b.t,{type:"time",cls:hl(f,"arr")})}
      ${o.compact?"":F(L.ref,"ref",it.ref,{cls:hl(f,"ref")})}${tr?"":`<div class="${o.compact?"full":""}">${TZsel("Timezone","tz",it.tz)}</div>`}</div>`}
    case"car":{const s0=splitLT(it.start),e0=splitLT(it.end);return`<div class="fg f4">${F("Rental company","name",it.name,{full:1,ph:"Hertz, Zoomcar, Avis…",cls:hl(f,"name")})}
      ${F("Pick-up location","pickup",it.pickup,{full:1,ph:"Airport counter / address",cls:hl(f,"pickup")})}${F("Pick-up date","puD",s0.d,{type:"date",cls:hl(f,"start")})}${F("Time","puT",s0.t||"10:00",{type:"time"})}
      ${F("Drop-off date","doD",e0.d,{type:"date",cls:hl(f,"end")})}${F("Time","doT",e0.t||"10:00",{type:"time"})}${F("Drop-off location","dropoff",it.dropoff,{full:1,ph:"Same as pick-up if blank"})}
      ${F("Car type","carType",it.carType,{ph:"Compact / SUV / automatic"})}${o.compact?"":F("Confirmation no.","ref",it.ref,{cls:hl(f,"ref")})}<div class="${o.compact?"full":""}">${TZsel("Timezone","tz",it.tz)}</div></div>`}
    case"hotel":return`<div class="fg f4">${F("Property","name",it.name,{full:1,cls:hl(f,"name"),ph:"Hotel / homestay name"})}${F("Address","address",it.address,{full:1,cls:hl(f,"address")})}${F("Address in local language","addrLocal",it.addrLocal,{full:1,ph:"For the driver card (optional)"})}
      ${F("Check-in date","ciD",a.d,{type:"date",cls:hl(f,"checkIn")})}${F("From","ciT",a.t||"14:00",{type:"time"})}${F("Check-out date","coD",b.d,{type:"date",cls:hl(f,"checkOut")})}${F("Until","coT",b.t||"12:00",{type:"time"})}
      ${o.compact?"":F("Confirmation no.","ref",it.ref,{cls:hl(f,"ref")})}${F("PIN","pin",it.pin)}${F("Phone","phone",it.phone,{type:"tel"})}${F("Room","roomType",it.roomType)}
      <div class="full">${TZsel("Timezone","tz",it.tz)}</div></div>`;
    case"expense":return`<div class="fg f4">${F("What","title",it.title,{full:1,ph:"Dinner, cab, SIM card…"})}${Sel("Category","cat",it.cat||"Food",EXP_CATS)}${F("Date","date",it.date,{type:"date"})}${F("Time","time",it.time,{type:"time"})}${Sel("Paid via","method",it.method||"Card",["Card","Cash","UPI","Forex card","Wallet","Other"])}</div>${splitFields(it)}`;
    case"doc":return`<div class="fg f4">${Sel("Type","docType",it.docType||"Passport",DOC_TYPES)}${F("Title","title",it.title,{ph:"e.g. Malaysia eVisa"})}${F("Expiry","expiry",it.expiry,{type:"date"})}${F("Ref / policy no.","ref",it.ref)}${F("Holder(s)","names",(it.names||[]).join(", "),{full:1,ph:"Comma separated"})}</div>`;
    default:return`<div class="fg f4">${F(k==="transfer"?"Transfer":"Activity","title",it.title,{full:1,ph:k==="transfer"?"KLIA Ekspres to KL Sentral / airport cab":"Petronas Towers skybridge"})}
      ${F("Date","stD",a.d,{type:"date"})}${F("Start","stT",a.t,{type:"time"})}${F("End date","enD",b.d||a.d,{type:"date"})}${F("End","enT",b.t,{type:"time"})}
      ${F("Where","location",it.location,{full:1,ph:"Meeting point / address"})}${o.compact?"":F("Address in local language","addrLocal",it.addrLocal,{full:1,ph:"For the driver card (optional)"})}${o.compact?"":F("Ticket / ref","ref",it.ref)}<div class="${o.compact?"full":""}">${TZsel("Timezone","tz",it.tz)}</div></div>`}}
const PAY_M=["UPI","Card","Net banking","Cash","Wallet","Forex card","Pay at property","Agent","Other"];
const payRow=p=>`<div class="payrow fg f4" style="margin-top:6px;align-items:end"><div><label>Status</label><select data-p="status"><option value="paid" ${p.status==="paid"?"selected":""}>Paid</option><option value="pending" ${p.status!=="paid"?"selected":""}>Pending</option></select></div><div><label>Amount</label><input data-p="amount" type="number" step="0.01" value="${esc(p.amount??"")}"></div><div><label>${p.status==="paid"?"Paid on":"Due by"}</label><input data-p="due" type="date" value="${esc(p.due||p.date||"")}"></div><div class="row" style="gap:4px"><select data-p="method">${PAY_M.map(m=>`<option ${m===p.method?"selected":""}>${m}</option>`).join("")}</select><button class="ibtn" data-rmpay title="Remove">${ic("x","sm")}</button></div></div>`;
/* Expense split: who paid, and who it's shared between (empty = everyone on the trip). */
function splitFields(it){const t=S.trips.find(x=>x.id===it.tripId)||curTrip(),ppl=t?tripPeople(t):[];if(ppl.length<2)return"";
  const on=it.splitWith?.length?it.splitWith:ppl;
  return`<div class="fg mt">${Sel("Paid by","paidBy",it.paidBy||"",[["","—"],...ppl.map(p=>[p,p])])}<div class="full"><label>Split between</label><div class="row wrap" style="gap:6px 14px">${ppl.map(p=>`<label class="row" style="margin:0;cursor:pointer;font-size:13px;color:var(--tx)"><input type="checkbox" name="sp:${esc(p)}" ${on.includes(p)?"checked":""}> ${esc(p)}</label>`).join("")}</div></div></div>`}
function costBlock(it){const isExp=it.kind==="expense";
  return`<div class="sep"></div><div class="fg f4">${F(isExp?"Amount":"Total cost","cost",it.cost,{type:"number",step:"0.01"})}${Sel("Currency","cur",it.cur||HC(),CURS)}${isExp?"":`<div class="full row" style="gap:6px;align-self:end"><input type="checkbox" name="refundable" ${it.refundable?"checked":""} id="rf"><label for="rf" style="margin:0">Refundable / free cancellation</label></div>`}</div>
   ${isExp?"":`<div id="pays">${(it.payments||[]).map(payRow).join("")}</div><div class="row wrap mt"><button class="btn xs" data-addpay>${ic("plus","sm")} Payment</button><button class="btn xs ok" data-fullpay>${ic("check","sm")} Mark fully paid</button></div>`}`}
function gatherPays(root){return $$(".payrow",root).map(r=>({id:uid(),status:$("[data-p=status]",r).value,amount:+$("[data-p=amount]",r).value||0,due:$("[data-p=due]",r).value,method:$("[data-p=method]",r).value})).filter(p=>p.amount>0)}
function wirePays(root){root.addEventListener("click",e=>{
  if(e.target.closest("[data-addpay]")){const c=+$("[name=cost]",root).value||0;const paid=gatherPays(root).filter(p=>p.status==="paid").reduce((a,p)=>a+p.amount,0);$("#pays",root).insertAdjacentHTML("beforeend",payRow({status:"pending",amount:Math.max(0,c-paid)||""}))}
  if(e.target.closest("[data-fullpay]")){const c=+$("[name=cost]",root).value||0;if(!c){toast("Enter the total cost first","bad");return}$("#pays",root).innerHTML=payRow({status:"paid",amount:c,due:todayIn("Asia/Kolkata"),method:"UPI"})}
  const rm=e.target.closest("[data-rmpay]");if(rm)rm.closest(".payrow").remove()});
  root.addEventListener("change",e=>{const s=e.target.closest("[data-p=status]");if(s)s.closest(".payrow").querySelector("[data-p=due]").previousElementSibling.textContent=s.value==="paid"?"Paid on":"Due by"})}
function wireAirports(root){root.addEventListener("input",e=>{const n=e.target.name;if(n!=="from"&&n!=="to")return;const v=e.target.value.toUpperCase();const scope=e.target.closest(".seg")||root;
  if(AP[v]){const tzEl=$(`[name=${n==="from"?"depTz":"arrTz"}]`,scope);if(tzEl)tzEl.value=AP[v].tz}})}
function buildItem(base,g){const it={...base};const lt=(d,t)=>d?`${d}T${t||"00:00"}`:"";const k=it.kind;
  if(k==="flight"){const fn=(g.flightNo||"").toUpperCase().replace(/^([A-Z0-9]{2})\s*-?\s*(\d+)$/,"$1 $2");const code=fn.split(" ")[0];
    Object.assign(it,{flightNo:fn,airline:g.airline||AIRLINES[code]||"",from:(g.from||"").toUpperCase(),to:(g.to||"").toUpperCase(),dep:lt(g.depD,g.depT),arr:lt(g.arrD,g.arrT),terminal:g.terminal||"",seat:g.seat??it.seat??""});
    it.depTz=g.depTz||apTz(it.from)||it.depTz||"";it.arrTz=g.arrTz||apTz(it.to)||it.arrTz||"";
    if(it.dep&&it.arr&&toUTC(it.arr,it.arrTz||it.depTz||"Asia/Kolkata")<toUTC(it.dep,it.depTz||"Asia/Kolkata"))it._warn="Arrival is before departure — check dates/timezones"}
  else if(isRide(k)){const tr=k==="train";Object.assign(it,{trainNo:g.trainNo,trainName:g.trainName,from:tr?(g.from||"").toUpperCase():g.from||"",to:tr?(g.to||"").toUpperCase():g.to||"",fromName:g.fromName,toName:g.toName,cls:g.cls,seat:g.seat,dep:lt(g.depD,g.depT),arr:lt(g.arrD,g.arrT),tz:g.tz||it.tz||(tr?"Asia/Kolkata":"")});
    if(!it.tz)it.tz=dayTz(S.trips.find(t=>t.id===it.tripId)||{id:"",tz:"Asia/Kolkata"},g.depD)}
  else if(k==="car"){Object.assign(it,{name:g.name,pickup:g.pickup,dropoff:g.dropoff,carType:g.carType,start:lt(g.puD,g.puT||"10:00"),end:g.doD?lt(g.doD,g.doT||"10:00"):"",tz:g.tz||it.tz||""});
    if(!it.tz)it.tz=dayTz(S.trips.find(t=>t.id===it.tripId)||{id:"",tz:"Asia/Kolkata"},g.puD)}
  else if(k==="hotel"){Object.assign(it,{name:g.name,address:g.address,addrLocal:g.addrLocal||"",checkIn:lt(g.ciD,g.ciT||"14:00"),checkOut:lt(g.coD,g.coT||"12:00"),pin:g.pin,phone:g.phone,roomType:g.roomType,tz:g.tz||it.tz||""});
    if(!it.tz){const a=findAirports((g.name||"")+" "+(g.address||"")).find(x=>x.city);it.tz=a?AP[a.v].tz:(S.trips.find(t=>t.id===it.tripId)?.tz||"Asia/Kolkata")}}
  else if(k==="expense"){Object.assign(it,{title:g.title,cat:g.cat,date:g.date,time:g.time,method:g.method});if(g.paidBy!==undefined)it.paidBy=g.paidBy;
    const sp=Object.keys(g).filter(x=>x.startsWith("sp:"));if(sp.length){const on=sp.filter(x=>g[x]).map(x=>x.slice(3));it.splitWith=on.length===sp.length||!on.length?[]:on}}
  else if(k==="doc")Object.assign(it,{docType:g.docType,title:g.title,expiry:g.expiry});
  else{Object.assign(it,{title:g.title,start:lt(g.stD,g.stT||"10:00"),end:g.enD||g.enT?lt(g.enD||g.stD,g.enT||g.stT):"",location:g.location,...("addrLocal"in g?{addrLocal:g.addrLocal}:{}),tz:g.tz||it.tz||""});if(!it.tz)it.tz=dayTz(S.trips.find(t=>t.id===it.tripId)||{id:"",tz:"Asia/Kolkata"},g.stD)}
  if(g.ref!==undefined)it.ref=k==="flight"?g.ref.toUpperCase():g.ref;if(g.bookingId!==undefined)it.bookingId=g.bookingId;
  if(g.names!==undefined)it.names=g.names.split(/\s*,\s*/).filter(Boolean);
  // him/her read from the ticket: keep only entries whose name is still on the booking
  if(it.sex){const keep=new Set((it.names||[]).map(n=>n.toLowerCase()));it.sex=Object.fromEntries(Object.entries(it.sex).filter(([k,v])=>keep.has(k)&&(v==="m"||v==="f")));if(!Object.keys(it.sex).length)delete it.sex}
  if(g.cost!==undefined){it.cost=+g.cost||0;it.cur=g.cur||HC()}if(g.refundable!==undefined)it.refundable=g.refundable;if(g.notes!==undefined)it.notes=g.notes;
  return it}
function validItem(it){switch(it.kind){case"flight":return(it.from&&it.to||it.flightNo)&&it.dep?null:"Need flight no. or route, and departure date";
  case"train":case"bus":case"ferry":return it.dep?null:"Need departure date";case"car":return it.start?null:"Need a pick-up date";case"hotel":return it.name&&it.checkIn?null:"Need property name and check-in date";
  case"expense":return it.cost>0?null:"Enter an amount";case"doc":return null;default:return it.title&&it.start?null:"Need a title and date"}}

/* ===================== Duplicate detection ===================== */
const nref=s=>(s||"").toUpperCase().replace(/[\s.\-\/]/g,"");
const nname=s=>(s||"").toLowerCase().replace(/\b(hotel|resort|the|by|a)\b/g,"").replace(/[^a-z0-9]/g,"");
const ovl=(a1,a2,b1,b2)=>a1&&b1&&a1<(b2||b1)&&b1<(a2||a1);
function dupCheck(c,ex){const res=[];const tn=id=>S.trips.find(t=>t.id===id)?.name||"another trip";
  for(const it of S.items){if(it.id===ex||it.kind!==c.kind||(c.groupId&&it.groupId===c.groupId&&it.id!==ex&&false))continue;let r=null,lv=null;
    const sd=x=>(x||"").slice(0,10);
    switch(c.kind){
      case"flight":if(c.flightNo&&nref(it.flightNo)===nref(c.flightNo)&&sd(it.dep)===sd(c.dep)){r="Same flight number on the same date";lv="dup"}
        else if(c.ref&&nref(it.ref)===nref(c.ref)&&it.from===c.from&&it.to===c.to&&sd(it.dep)===sd(c.dep)){r="Same PNR & route on the same date";lv="dup"}
        else if(it.tripId===c.tripId&&c.dep&&it.dep){const a=itemEvents(c).find(x=>x.main),b=itemEvents(it).find(x=>x.main);if(a&&b&&a.su<b.eu&&b.su<a.eu){r="Overlaps another flight in time";lv="maybe"}}break;
      case"train":case"bus":case"ferry":if(c.ref&&nref(it.ref)===nref(c.ref)){r=c.kind==="train"?"Same PNR":"Same ticket number";lv="dup"}else if(c.trainNo&&it.trainNo===c.trainNo&&sd(it.dep)===sd(c.dep)){r=`Same ${KINDS[c.kind].n.toLowerCase()} on the same date`;lv="dup"}
        else if(!c.trainNo&&c.from&&it.from===c.from&&it.to===c.to&&c.dep&&it.dep===c.dep){r="Same route and departure time";lv="dup"}break;
      case"car":if(c.ref&&nref(it.ref)===nref(c.ref)){r="Same confirmation number";lv="dup"}else if(nname(c.name)&&nname(it.name)===nname(c.name)&&sd(it.start)===sd(c.start)){r="Same company & pick-up date";lv="dup"}break;
      case"hotel":if(c.ref&&nref(it.ref)===nref(c.ref)){r="Same confirmation number";lv="dup"}
        else if(nname(c.name)&&nname(it.name)===nname(c.name)&&sd(it.checkIn)===sd(c.checkIn)){r="Same property & check-in date";lv="dup"}
        else if(it.tripId===c.tripId&&ovl(sd(c.checkIn),sd(c.checkOut),sd(it.checkIn),sd(it.checkOut))){r=`Dates overlap your stay at ${it.name}`;lv="maybe"}break;
      case"doc":if(c.docType===it.docType&&c.ref&&nref(c.ref)===nref(it.ref)){r="Same document reference";lv="dup"}break;
      case"expense":if(c.title&&it.title===c.title&&it.date===c.date&&+it.cost===+c.cost){r="Same expense, amount & date";lv="maybe"}break;
      default:if(c.title&&nname(it.title)===nname(c.title)&&sd(it.start)===sd(c.start)){r="Same title on the same date";lv="dup"}else if(c.ref&&nref(c.ref)===nref(it.ref)){r="Same ticket reference";lv="dup"}}
    if(!lv&&c.srcHash&&it.srcHash===c.srcHash&&(c.kind!=="flight"||nref(it.flightNo)===nref(c.flightNo))){r="Identical confirmation text was imported before";lv="dup"}
    if(lv)res.push({it,lv,r,trip:it.tripId!==c.tripId?tn(it.tripId):null})}
  return{lvl:res.some(x=>x.lv==="dup")?"dup":res.length?"maybe":null,res}}
const dupHtml=d=>d.res.map(x=>`<div class="note ${x.lv==="dup"?"bad":"warn"}" style="margin-top:6px">${ic("layers")}<div><b>${x.lv==="dup"?"Duplicate":"Possible clash"}:</b> ${esc(x.r)}<div class="small muted">Existing: ${esc(itemTitle(x.it))} · ${esc(itemSub(x.it))}${x.trip?` · in <b>${esc(x.trip)}</b>`:""} · added ${new Date(x.it.createdAt||Date.now()).toLocaleDateString()}</div></div></div>`).join("");

/* ===================== Item editor ===================== */
function openItem(it,isNew){
  apDatalist();const t=S.trips.find(x=>x.id===it.tripId)||curTrip();
  const files=S.files.filter(f=>(f.itemIds||[]).includes(it.id));
  const grp=it.groupId?S.items.filter(x=>x.groupId===it.groupId&&x.id!==it.id):[];
  const body=`${isNew?`<div class="tabs" style="margin-bottom:10px">${Object.entries(KINDS).map(([k,v])=>`<button class="${k===it.kind?"on":""}" data-kind="${k}">${ic(v.i,"sm")} ${v.n}</button>`).join("")}</div>`:""}
   <div id="kf">${itemFields(it)}</div>
   ${it.kind!=="doc"?`<div class="fg mt">${F("Traveller names","names",(it.names||[]).join(", "),{full:1,ph:"Comma separated"})}</div>`:""}
   ${it.kind!=="doc"?costBlock(it):""}
   ${grp.length?`<div class="note info mt">${ic("layers")}<div>Part of one booking with ${grp.map(g=>esc(itemTitle(g))).join(", ")}. Cost is tracked on the first segment.</div></div>`:""}
   <div class="mt"><label>Notes</label><textarea name="notes" style="min-height:54px;font-family:inherit;font-size:13px" placeholder="Baggage, meal, check-in tips, contact…">${esc(it.notes||"")}</textarea></div>
   <div class="sep"></div><div class="h" style="margin:0 0 4px">${ic("clip")}<h2>Attachments</h2><span class="sp"></span><label class="btn xs" style="margin:0">${ic("plus","sm")} Attach<input type="file" id="attIn" multiple hidden></label></div>
   <div id="attL">${files.map(f=>`<div class="row small" style="padding:4px 0"><span class="sp" style="word-break:break-all">${ic("file","sm")} ${esc(f.name)}</span><button class="btn xs" data-a="openFile" data-id="${f.id}">Open</button><button class="btn xs ghost" data-unlink="${f.id}">Unlink</button></div>`).join("")||`<div class="small dim">None</div>`}</div><div id="attNew" class="small muted"></div>
   <div id="dupBox"></div>`;
  const ov=sheet({title:`${isNew?"Add":"Edit"} ${KINDS[it.kind].n.toLowerCase()}`,help:"item",body,foot:`${isNew?"":`<button class="btn bad" id="delIt" style="margin-right:auto">${ic("trash","sm")} Delete</button>`}<button class="btn" data-close>Cancel</button><button class="btn pri" id="svIt">${ic("check","sm")} Save</button>`});
  const sb=$(".sb",ov);wirePays(sb);wireAirports(sb);
  const pend=[],unlink=new Set();
  $("#attIn",ov).onchange=e=>{pend.push(...e.target.files);$("#attNew",ov).textContent=pend.length?`${pend.length} file(s) will be attached on save`:""};
  sb.addEventListener("click",e=>{const u=e.target.closest("[data-unlink]");if(u){unlink.add(u.dataset.unlink);u.closest(".row").style.opacity=.35}
    const k=e.target.closest("[data-kind]");if(k){const g=gather(sb);ov.remove();openItem({...it,kind:k.dataset.kind,names:g.names?g.names.split(/\s*,\s*/):it.names},true)}});
  const recheck=()=>{const c=buildItem(it,gather(sb));const d=dupCheck(c,it.id);$("#dupBox",ov).innerHTML=dupHtml(d)};
  if(!isNew)recheck();sb.addEventListener("change",recheck);
  $("#svIt",ov).onclick=async()=>{const g=gather(sb);const n=buildItem(it,g);if(it.kind!=="doc"&&it.kind!=="expense")n.payments=gatherPays(sb);
    if(n.kind==="expense"){n.payments=[]}
    const err=validItem(n);if(err){toast(err,"bad");return}
    const d=dupCheck(n,it.id);if(isNew&&d.lvl==="dup"&&!(await gate({title:"Looks like a duplicate",plan:d.res.map(x=>`${esc(x.r)} — ${esc(itemTitle(x.it))}`).concat(["Save it anyway as a separate entry"]),ok:"Save anyway",danger:false})))return;
    delete n._warn;await saveItem(n);
    for(const fid of unlink){const f=S.files.find(x=>x.id===fid);if(f){f.itemIds=(f.itemIds||[]).filter(x=>x!==n.id);await saveFile(f)}}
    const r=await storeFiles(pend,n.tripId,[n.id]);await fitTrip(n.tripId,true);
    ov.remove();render();toast(`Saved${r.linked?` · ${r.linked} file(s) already in vault were linked, not duplicated`:""}`)};
  $("#delIt",ov)?.addEventListener("click",async()=>{const g=it.groupId?S.items.filter(x=>x.groupId===it.groupId&&x.id!==it.id):[];
    if(!(await gate({title:"Delete this entry?",plan:[`Remove <b>${esc(itemTitle(it))}</b> (${esc(itemSub(it))}) from the itinerary and budget`,files.length?`Unlink ${files.length} attachment(s) — the files stay in Docs`:"No attachments affected",g.length?`Other segments of this booking (${g.length}) are kept`:""].filter(Boolean),irreversible:"The entry can't be recovered unless you restore a backup.",ok:"Delete"})))return;
    if(g.length&&+it.cost){const n=g[0];n.cost=it.cost;n.cur=it.cur;n.payments=it.payments;await saveItem(n)}
    await delItem(it.id);ov.remove();render();toast("Deleted")});
}
function newItem(kind,o={}){const t=curTrip();const d=o.d||(t?(tripPhase(t).today||tripRange(t).s):"")||todayIn("Asia/Kolkata");const tz=t?dayTz(t,d):"Asia/Kolkata";
  const it={id:uid(),tripId:t?.id,kind,names:[],payments:[],cur:HC()};
  if(kind==="activity"||kind==="transfer"){it.start=`${d}T${o.s||"10:00"}`;it.end=o.e?`${d}T${o.e}`:"";it.tz=tz}
  if(kind==="hotel"){it.checkIn=`${d}T14:00`;it.checkOut=`${addDays(d,1)}T12:00`;it.tz=tz}
  if(isTransport(kind)){it.dep=`${d}T`;it.depTz="";if(kind!=="flight"&&kind!=="train")it.tz=tz}
  if(kind==="car"){it.start=`${d}T10:00`;it.end=`${addDays(d,1)}T10:00`;it.tz=tz}
  if(kind==="expense"){const p=tzParts(tz,Date.now());it.date=o.d||todayIn(tz);it.time=`${pad(p.h)}:${pad(p.mi)}`;it.tz=tz;it.cur=tripCur(t)}
  if(kind==="doc"){it.docType=o.dt||"Passport"}if(o.title)it.title=o.title;if(o.location)it.location=o.location;
  if(!t){toast("Create a trip first","bad");return}
  openItem(it,true)}
async function storeFiles(files,tripId,itemIds){let linked=0,stored=0;for(const f of files){const buf=await f.arrayBuffer();const hash=await sha256(buf);const ex=S.files.find(x=>x.hash===hash);
    if(ex){ex.itemIds=[...new Set([...(ex.itemIds||[]),...itemIds])];await saveFile(ex);linked++;continue}
    let tx="";try{tx=(await fileToText(new File([buf],f.name,{type:f.type}))).text||""}catch(e){}await saveFile({id:uid(),tripId,name:f.name,type:f.type||"application/octet-stream",size:f.size,hash,blob:new Blob([buf],{type:f.type}),itemIds,text:tx.slice(0,30000),createdAt:Date.now()});stored++}
  if(stored)navigator.storage?.persist?.();return{linked,stored}}
async function fitTrip(id,auto){const t=S.trips.find(x=>x.id===id);if(!t)return;const ds=tripItems(id).filter(i=>i.kind!=="doc").flatMap(itemDates).sort();if(!ds.length)return;
  let ch=false;if(!t.start||ds[0]<t.start){t.start=ds[0];ch=true}if(!t.end||ds[ds.length-1]>t.end){t.end=ds[ds.length-1];ch=true}
  if(!t.tz||t.tz==="Asia/Kolkata"){const tz=destTz(t);if(tz&&tz!==t.tz){t.tz=tz;ch=true}}
  if(ch){await saveTrip(t);if(auto)setTimeout(()=>toast(`Trip dates updated: ${fmtDs(t.start)} – ${fmtDs(t.end)}`,"info"),900)}}
function destTz(t){const h=hotels(t)[0];if(h?.tz)return h.tz;const f=tripItems(t.id).filter(i=>i.kind==="flight").sort((a,b)=>sortKey(a)-sortKey(b))[0];return f?(f.arrTz||apTz(f.to)):null}

/* ===================== Smart import ===================== */
const IMP={q:[],sh:null};
function openImport(){
  const ov=sheet({title:`${ic("zap")} Smart import`,help:"import",body:`
   <div class="row" style="margin-bottom:10px"><label style="margin:0;white-space:nowrap">Add to</label><select id="impTrip">${S.trips.map(t=>`<option value="${t.id}" ${t.id===S.cur?"selected":""}>${esc(t.name)}</option>`).join("")}<option value="__new" ${!S.cur?"selected":""}>+ New trip from this booking</option></select></div>
   <label class="drop" id="impDrop">${ic("upload","lg")}<div style="font-weight:650;margin-top:6px">Drop tickets & confirmations</div><div class="small muted">PDF, email, HTML, text or screenshots</div><input type="file" id="impFile" multiple accept=".pdf,.eml,.txt,.html,.htm,image/*,application/pdf,message/rfc822,text/plain,text/html" hidden></label>
   <div class="mt"><label>…or paste the text</label><textarea id="impText" placeholder="Paste here — IndiGo / Air India / airline e-ticket, MakeMyTrip, Booking.com, Agoda, IRCTC ERS…"></textarea></div>
   <div class="row wrap mt small"><span class="dim">Try a sample:</span><button class="btn xs" data-smp="flight">${ic("plane","sm")} Flight</button><button class="btn xs" data-smp="hotel">${ic("bed","sm")} Hotel</button><button class="btn xs" data-smp="train">${ic("train","sm")} IRCTC</button></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="impGo">${ic("sparkle","sm")} Extract</button>`});
  const dz=$("#impDrop",ov),fi=$("#impFile",ov);
  ["dragenter","dragover"].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.add("dg")}));["dragleave","drop"].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.remove("dg")}));
  dz.addEventListener("drop",e=>{if(e.dataTransfer.files.length)startFiles([...e.dataTransfer.files],$("#impTrip",ov).value,ov)});
  fi.onchange=()=>fi.files.length&&startFiles([...fi.files],$("#impTrip",ov).value,ov);
  ov.addEventListener("click",e=>{const s=e.target.closest("[data-smp]");if(s)$("#impText",ov).value=sampleText(s.dataset.smp)});
  $("#impGo",ov).onclick=async()=>{const tx=$("#impText",ov).value.trim();if(!tx){toast("Drop a file or paste text","bad");return}const tid=$("#impTrip",ov).value;ov.remove();
    openReview({texts:[tx],method:"Pasted text",tripId:tid,textHash:await textHash(tx)})}}
async function startFiles(files,tid,ov){ov?.remove();IMP.q=files.map(f=>({f,tid}));IMP.total=files.length;nextFile()}
async function nextFile(){const j=IMP.q.shift();if(!j)return;const{f,tid}=j;const idx=IMP.total-IMP.q.length;
  const buf=await f.arrayBuffer();const hash=await sha256(buf);const ex=S.files.find(x=>x.hash===hash);
  if(ex){const its=S.items.filter(i=>(ex.itemIds||[]).includes(i.id));const tr=S.trips.find(t=>t.id===ex.tripId);
    const ov=sheet({title:`${ic("layers")} Already in your vault`,body:`<div class="note bad">${ic("alert")}<div><b>${esc(f.name)}</b> is byte-for-byte identical to <b>${esc(ex.name)}</b>, added ${new Date(ex.createdAt).toLocaleString()} to <b>${esc(tr?.name||"a trip")}</b>.<div class="small muted mt">Linked to: ${its.map(i=>esc(itemTitle(i))+" · "+esc(itemSub(i))).join("; ")||"nothing"}</div></div></div>`,
      foot:`<button class="btn" id="dOpen">${ic("eye","sm")} Open existing</button><button class="btn pri" id="dSkip">${IMP.q.length?"Skip · next file":"OK"}</button>`});
    $("#dOpen",ov).onclick=()=>openBlob(ex);$("#dSkip",ov).onclick=()=>{ov.remove();nextFile()};return}
  let r;try{r=await fileToText(new File([buf],f.name,{type:f.type}))}catch(e){r={text:"",method:"Unreadable: "+e.message}}
  if(r.image&&!r.text){const tx=await ocrWithSheet(new Blob([buf],{type:f.type}),f.name);if(tx)r={...r,text:tx,method:"Text read from image",ocr:true};else if(tx===null)r={...r,ocrFailed:true}}
  const texts=[r.text,r.alt].filter(Boolean);
  openReview({texts,method:r.method,file:{name:f.name,type:f.type,size:f.size,hash,buf},encrypted:r.encrypted,image:r.image,ocr:r.ocr,tripId:tid,textHash:r.text?await textHash(r.text):null,pos:IMP.total>1?`${idx} of ${IMP.total}`:""})}
function openReview(R,kind){
  apDatalist();const ref=todayIn("Asia/Kolkata");
  const P=R.texts.length?parseBest(R.texts,kind||R.kind,ref):{kind:kind||"flight",names:[],segments:[],_score:0};R.kind=P.kind;
  if(P.kind==="flight"&&!P.segments.length)P.segments=[{flightNo:"",from:"",to:"",dep:"",arr:"",_f:{}}];
  const tid=R.tripId==="__new"?null:R.tripId;
  const cand=seg=>({...seg,kind:P.kind,tripId:tid,ref:P.ref,srcHash:R.textHash});
  const segs=P.kind==="flight"?P.segments:[P];
  const found=P.kind==="flight"?P.segments.reduce((a,s)=>a+Object.values(s._f||{}).filter(Boolean).length,0):Object.values(P._f||{}).filter(Boolean).length;
  let notes="";
  if(R.ocr)notes+=`<div class="note info">${ic("eye")}<div>Read from an image: check the PNR, dates and times.</div></div>`;
  else if(R.image)notes+=`<div class="note warn">${ic("eye")}<div>No text could be read from this image. It will be attached; fill in the key fields below (pick the type first).</div></div>`;
  if(R.encrypted&&!R.texts.length)notes+=`<div class="note warn">${ic("alert")}<div>This PDF is password-protected/encrypted. Open it, copy the text and paste it instead — the PDF will still be attached if you import it after.</div></div>`;
  else if(R.texts.length&&found<3)notes+=`<div class="note warn">${ic("alert")}<div>Couldn't find much. This may be a scanned/image PDF or an unusual layout — check the raw text below, switch the type, or fill in manually.</div></div>`;
  else if(found)notes+=`<div class="note ok">${ic("sparkle")}<div>Found <b>${found}</b> fields${P.names.length?` and ${P.names.length} traveller name${P.names.length>1?"s":""}`:""}. <span style="color:var(--ok)">Green</span> = extracted, <span style="color:var(--warn)">amber</span> = please check.</div></div>`;
  const segHtml=(s,i)=>{const d=dupCheck(cand(s));return`<div class="seg ${d.lvl==="dup"?"dup":d.lvl?"maybe":""}" data-i="${i}"><div class="row" style="margin-bottom:8px"><input type="checkbox" class="segOn" ${d.lvl==="dup"?"":"checked"} id="so${i}"><label for="so${i}" style="margin:0;font-size:12.5px;color:var(--tx)"><b>${P.kind==="flight"?`Segment ${i+1}`:KINDS[P.kind].n}</b></label><span class="sp"></span><span class="dupB">${d.lvl==="dup"?pill(ic("layers","sm")+" duplicate — unticked","bad"):d.lvl?pill("check clash","warn"):pill(ic("check","sm")+" new","ok")}</span></div>${itemFields({...s,kind:P.kind},{f:s._f||P._f||{},compact:P.kind==="flight"})}<div class="dupL">${dupHtml(d)}</div></div>`};
  const body=`<div class="row wrap" style="margin-bottom:10px">${pill(ic("file","sm")+" "+esc(R.file?.name||R.method),"info")}${R.file?pill(esc(R.method)):""}${R.pos?pill(R.pos):""}</div>
   <div class="tabs" style="margin-bottom:10px">${["flight","hotel","train","bus","ferry","car","transfer","activity","doc"].map(k=>`<button class="${k===P.kind?"on":""}" data-rk="${k}">${ic(KINDS[k].i,"sm")} ${KINDS[k].n}</button>`).join("")}</div>
   ${notes}<div id="segs">${segs.map(segHtml).join("")}</div>
   ${P.kind==="flight"?`<button class="btn xs mt" id="addSeg">${ic("plus","sm")} Add segment</button>`:""}
   <div class="seg"><div class="fg f4">${P.kind==="flight"?F("PNR / booking ref","ref",P.ref,{up:1,cls:P.ref&&!R.ocr?"found":"miss"})+F("Booking ID (OTA)","bookingId",P.bookingId):P.kind==="hotel"||isRide(P.kind)||P.kind==="car"||P.kind==="transfer"||P.kind==="activity"?F(isRide(P.kind)?RIDE_L[P.kind].ref:"Confirmation / ref","ref",P.ref,{cls:P.ref&&!R.ocr?"found":"miss"}):""}
     ${F("Traveller names","names",(P.names||[]).join(", "),{full:1,ph:"Comma separated",cls:P.names?.length?"found":"miss"})}
     ${F("Total cost","cost",P.cost,{type:"number",step:"0.01",cls:P.cost?"found":"miss"})}${Sel("Currency","cur",P.cur||HC(),CURS)}
     ${Sel("Payment","pay",P.pay||"",[["","Not sure"],["paid","Fully paid"],["pending","Pending / pay later"]],{cls:P.pay?"found":""})}${F("Due by (if pending)","due",P.kind==="hotel"?(P.checkIn||"").slice(0,10):"",{type:"date"})}</div></div>
   ${R.texts[0]?`<details class="mt"><summary>Raw text read from ${R.file?"the file":"your paste"} (${R.texts[0].length} chars)</summary><pre class="raw">${esc(R.texts[0].slice(0,6000))}</pre></details>`:""}`;
  const ov=sheet({title:`Review & save`,body,foot:`<button class="btn" id="rvBack">Back</button><span class="sp"></span><button class="btn pri" id="rvSave">${ic("check","sm")} Save to ${R.tripId==="__new"?"new trip":"trip"}</button>`});
  const sb=$(".sb",ov);wireAirports(sb);
  sb.addEventListener("click",e=>{const k=e.target.closest("[data-rk]");if(k){ov.remove();openReview(R,k.dataset.rk)}});
  $("#addSeg",ov)?.addEventListener("click",()=>{const n=$$(".seg[data-i]",ov).length;$("#segs",ov).insertAdjacentHTML("beforeend",segHtml({flightNo:"",from:"",to:"",dep:"",arr:"",_f:{}},n))});
  sb.addEventListener("change",e=>{const se=e.target.closest(".seg[data-i]");if(!se||e.target.classList.contains("segOn"))return;const c=buildItem({id:"tmp",kind:P.kind,tripId:tid,srcHash:null},{...gather(se),ref:$("[name=ref]",sb)?.value||""});const d=dupCheck(c);
    $(".dupL",se).innerHTML=dupHtml(d);$(".dupB",se).innerHTML=d.lvl==="dup"?pill("duplicate","bad"):d.lvl?pill("check clash","warn"):pill("new","ok");se.className=`seg ${d.lvl==="dup"?"dup":d.lvl?"maybe":""}`});
  $("#rvBack",ov).onclick=()=>{ov.remove();if(!R.file)openImport();else nextFile()};
  $("#rvSave",ov).onclick=async()=>{
    const segEls=$$(".seg[data-i]",ov).filter(s=>$(".segOn",s).checked);if(!segEls.length){toast("Nothing ticked to import","bad");return}
    const shared=gather($(".seg:not([data-i])",ov));
    let tripId=R.tripId;const gid=segEls.length>1?uid():null;
    const items=segEls.map((se,i)=>{const g={...gather(se),...shared};if(i>0){g.cost="0"}return buildItem({id:uid(),kind:P.kind,tripId:tripId==="__new"?"_":tripId,payments:[],groupId:gid,srcHash:R.textHash,createdAt:Date.now(),sex:{...(P.sex||{})}},g)});
    for(const it of items){const e=validItem(it);if(e){toast(e,"bad");return}}
    if(tripId!=="__new"){const t0=S.trips.find(t=>t.id===tripId),rg=t0?tripRange(t0):{};const ds=items.flatMap(itemDates).sort();
      if(rg.s&&ds.length&&(ds[0]<addDays(rg.s,-2)||ds[ds.length-1]>addDays(rg.e,2))){
        const ch=await new Promise(res=>{let done=0;const o=sheet({title:"Dates don't match this trip",body:`<div class="note warn">${ic("alert")}<div>This booking is <b>${fmtD(ds[0])} – ${fmtD(ds[ds.length-1])}</b>, but <b>${esc(t0.name)}</b> runs ${fmtD(rg.s)} – ${fmtD(rg.e)}.<div class="small muted mt">Extending would stretch the trip to cover both ranges.</div></div></div>`,
          foot:`<button class="btn" data-close>Cancel</button><button class="btn" id="chX">Extend “${esc(t0.name.slice(0,18))}”</button><button class="btn pri" id="chN">${ic("plus","sm")} New trip</button>`,onClose:()=>{if(!done)res(null)}});
          $("#chX",o).onclick=()=>{done=1;o.remove();res("extend")};$("#chN",o).onclick=()=>{done=1;o.remove();res("new")}});
        if(!ch)return;if(ch==="new"){tripId="__new";items.forEach(i=>i.tripId="_")}}}
    if(tripId==="__new"){const t=autoTrip(items);await saveTrip(t);tripId=t.id;items.forEach(i=>i.tripId=t.id)}
    const c0=+shared.cost||0;if(c0&&shared.pay)items[0].payments=[{id:uid(),status:shared.pay,amount:c0,due:shared.pay==="paid"?todayIn("Asia/Kolkata"):shared.due,method:shared.pay==="paid"?"Card":P.kind==="hotel"?"Pay at property":"Other"}];
    for(const it of items)await saveItem(it);
    if(R.file)await saveFile({id:uid(),tripId,name:R.file.name,type:R.file.type||"application/octet-stream",size:R.file.size,hash:R.file.hash,blob:new Blob([R.file.buf],{type:R.file.type}),itemIds:items.map(i=>i.id),text:(R.texts[0]||"").slice(0,30000),createdAt:Date.now()});
    navigator.storage?.persist?.();
    S.cur=tripId;S.meta.cur=tripId;await fitTrip(tripId,true);const fd=itemDates(items[0])[0];if(fd)S.day=fd;S.view="plan";saveMeta();
    ov.remove();render();toast(`Added ${items.length} ${KINDS[P.kind].n.toLowerCase()}${items.length>1?"s":""} to the itinerary`);setTimeout(nextFile,350)}}
function autoTrip(items){const it=items[0];let city="",tz="",cc=homeCC();
  if(it.kind==="flight"){const out=items.find(i=>AP[i.from]?.cc===homeCC()&&AP[i.to]?.cc!==homeCC())||items[0];const a=AP[out.to];city=a?.city||out.to;tz=a?.tz;cc=a?.cc||homeCC()}
  else if(it.kind==="hotel"){const a=findAirports(it.name+" "+it.address).find(x=>x.city);city=a?AP[a.v].city:(it.address||"").split(",").slice(-2,-1)[0]?.trim()||it.name;tz=it.tz;cc=a?AP[a.v].cc:homeCC()}
  else if(it.kind==="train"){city=it.toName||it.to;tz="Asia/Kolkata"}else if(isRide(it.kind)){city=it.to||it.toName;tz=it.tz}else if(it.kind==="car"){city=it.pickup||it.name;tz=it.tz}else city=it.title;
  const ds=items.flatMap(itemDates).sort();const lc=CC_CUR[cc]||HC();
  return{id:uid(),name:`Trip to ${city||"somewhere"}`,dest:city,start:ds[0]||"",end:ds[ds.length-1]||"",tz:tz||S.settings.homeTz,type:cc===homeCC()?"domestic":"international",localCur:lc,rates:{},budget:0,createdAt:Date.now()}}
function sampleText(k){const d0=addDays(todayIn("Asia/Kolkata"),40),d5=addDays(d0,5),L=d=>{const x=dObj(d);return`${WD[x.getUTCDay()]}, ${pad(x.getUTCDate())} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`};
  if(k==="flight")return`IndiGo · E-Ticket / Itinerary\nPNR/Booking Ref.: Q7XK2M\nBooking Date: ${L(todayIn("Asia/Kolkata"))}\nPassenger(s): Mr Arjun Mehta, Ms Riya Mehta\nFlight   From   To   Departure   Arrival\n6E 1061   Bengaluru (BLR) T1   Kuala Lumpur (KUL) T1   ${L(d0)} 07:15   ${L(d0)} 14:05\n6E 1062   Kuala Lumpur (KUL) T1   Bengaluru (BLR) T1   ${L(d5)} 15:20   ${L(d5)} 17:10\nBaggage: Check-in 15 Kg, Cabin 7 Kg\nTotal Amount Paid: INR 48,640.00\nPayment Status: Successful`;
  if(k==="hotel")return`Booking.com\nThanks, Arjun! Your booking in Kuala Lumpur is confirmed.\nHotel: Grand Millennium Kuala Lumpur\nAddress: 160 Jalan Bukit Bintang, 55100 Kuala Lumpur, Malaysia\nConfirmation number: 4821.553.907\nPIN code: 7241\nCheck-in   ${L(d0)}   from 15:00\nCheck-out   ${L(addDays(d0,3))}   until 12:00\nYour reservation   3 nights, 1 room\nGuest name: Arjun Mehta\nPrice   MYR 1,450.00\nYou'll pay when you stay at Grand Millennium Kuala Lumpur`;
  const x=dObj(addDays(d0,-7)),y=dObj(addDays(d0,-6)),f=z=>`${pad(z.getUTCDate())}-${MON[z.getUTCMonth()]}-${z.getUTCFullYear()}`;
  return`Electronic Reservation Slip (ERS)\nPNR No. : 4521873690   Train No./Name : 12658/CHENNAI MAIL   Class : SLEEPER CLASS (SL)\nQuota : GENERAL (GN)   Distance : 362 KM\nFrom : KSR BENGALURU (SBC)   Departure* : 22:40 ${f(x)}   To : MGR CHENNAI CTL (MAS)   Arrival* : 04:55 ${f(y)}\nPassenger Details\n1 ARJUN MEHTA 32 M CNF /S4/45/LOWER\nTotal Fare : Rs. 915.00`}

/* ===================== Trips ===================== */
function openTrips(){const rows=S.trips.slice().sort((a,b)=>(a.start||"9").localeCompare(b.start||"9")).map(t=>{const ph=tripPhase(t);const n=tripItems(t.id).length;
  return`<div class="li tap" data-a="selTrip" data-id="${t.id}">${kic(isIntlTrip(t)?"hotel":"train")}<div class="b"><div class="t">${esc(t.name)} ${t.id===S.cur?pill("current","info"):""}</div><div class="d">${tripMeta(t)} · ${n} entries</div></div><div class="r small">${ph.p==="before"?`in ${ph.days}d`:ph.p==="during"?`<span style="color:var(--ok)">ongoing</span>`:ph.p==="after"?"done":""}</div></div>`}).join("");
  sheet({title:"Your trips",body:rows||`<div class="empty">No trips yet.</div>`,foot:`<button class="btn" data-a="loadSample">${ic("sparkle","sm")} Sample</button><button class="btn pri" data-a="newTrip">${ic("plus","sm")} New trip</button>`})}
function openTrip(t,isNew){const ov=sheet({title:isNew?"New trip":"Trip settings",help:"trip",body:`<div class="fg">
  ${F("Trip name","name",t.name,{full:1,ph:"Honeymoon · Malaysia"})}${F("Destination","dest",t.dest,{full:1,ph:"Kuala Lumpur, Langkawi"})}
  <div class="full"><label>Who's going</label><div id="crewPk"></div></div>
  ${F("Start","start",t.start,{type:"date"})}${F("End","end",t.end,{type:"date"})}
  ${Sel("Type","type",t.type||"auto",[["auto","Auto-detect"],["domestic","Domestic (India)"],["international","International"]])}${TZsel("Main timezone","tz",t.tz)}
  ${F(`Total budget (${sym(HC()).trim()})`,"budget",t.budget||"",{type:"number"})}${Sel("Local currency","localCur",t.localCur||HC(),CURS)}
  ${F(`Exchange rates (${HC()} per unit)`,"rates",ratesStr(t.rates),{full:1,ph:"MYR=19.2, USD=84.5"})}
  <div class="full h mt" style="margin-bottom:0"><h2>Defaults</h2></div>
  ${Sel("Spend in","expCur",t.expCur||"",[["","Auto"],...CURS])}${Sel("Language","lang",isLang(t.lang)?t.lang:"",[["","Auto"],...Object.entries(PHRASES).map(([k,[n]])=>[k,n]),["en","English"]])}</div>`,
  foot:`${isNew?"":`<button class="btn" data-a="gsShare" data-trip="${esc(t.id)}">${ic("share","sm")} ${t.sync?.fileId?"Shared":"Share"}</button><button class="btn" data-a="dupTrip" style="margin-right:auto">${ic("copy","sm")} Duplicate</button><button class="btn bad" id="tDel">${ic("trash","sm")} Delete trip</button>`}<button class="btn" data-close>Cancel</button><button class="btn pri" id="tSv">${ic("check","sm")} Save</button>`});
  $("[name=tz]",ov).options[0].textContent="Auto (from bookings)";
  /* Who's going: solo / couple / group, and him or her for each traveller (drives the crew characters) */
  const cp=crewOf(t);let party=cp.party,cr=[...cp.crew];const pk=$("#crewPk",ov),ptL={solo:"Solo",couple:"Couple",group:"Group"},ptI={solo:"user",couple:"heart",group:"globe"};
  const drawCrew=()=>{pk.innerHTML=`<div class="tabs" role="group" aria-label="Who's going">${Object.keys(ptL).map(k=>`<button type="button" class="${party===k?"on":""}" aria-pressed="${party===k}" data-pt="${k}">${ic(ptI[k],"sm")} ${ptL[k]}</button>`).join("")}</div>
    <div class="row wrap crewrow">${cr.map((x,i)=>`<button type="button" class="btn xs crewp ${x}" data-ci="${i}" aria-label="Traveller ${i+1}: ${x==="f"?"her":"him"}. Tap to switch">${ic("user","sm")} ${x==="f"?"Her":"Him"}</button>`).join("")}${party==="group"?`<button type="button" class="btn xs" data-cn="-1" ${cr.length<=3?"disabled":""} aria-label="One fewer traveller">−</button><button type="button" class="btn xs" data-cn="1" ${cr.length>=6?"disabled":""} aria-label="One more traveller">+</button>`:""}</div>`};
  pk.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;e.preventDefault();
    if(b.dataset.pt){party=b.dataset.pt;const n=party==="solo"?1:party==="couple"?2:Math.max(3,cr.length);cr=Array.from({length:n},(_,i)=>cr[i]||(party==="couple"?(cr[0]==="f"?"m":"f"):i%2?"f":"m"))}
    else if(b.dataset.ci){const i=+b.dataset.ci;cr[i]=cr[i]==="f"?"m":"f"}
    else if(b.dataset.cn){const n=Math.min(6,Math.max(3,cr.length+ +b.dataset.cn));cr=Array.from({length:n},(_,i)=>cr[i]||(i%2?"f":"m"))}
    drawCrew()});drawCrew();
  const sI=$("[name=start]",ov),eI=$("[name=end]",ov),syncEnd=()=>{eI.min=sI.value||"";if(sI.value&&(!eI.value||eI.value<sI.value))eI.value=sI.value};sI.addEventListener("change",syncEnd);eI.min=sI.value||"";
  $("#tSv",ov).onclick=async()=>{const g=gather(ov);if(!g.name){toast("Name the trip","bad");return}if(g.start&&g.end&&g.end<g.start){toast("End is before start","bad");return}
    const crewWas=JSON.stringify(crewOf(t));t.party=party;t.crew=cr.slice();if(isNew||crewWas!==JSON.stringify(crewOf(t)))AV.cheer();
    Object.assign(t,{name:g.name,dest:g.dest,start:g.start,end:g.end,type:g.type==="auto"?"":g.type,tz:g.tz||t.tz||"Asia/Kolkata",budget:+g.budget||0,localCur:g.localCur,rates:parseRates(g.rates)});for(const k of["expCur","lang"])if(g[k])t[k]=g[k];else delete t[k];t.createdAt??=Date.now();
    await saveTrip(t);S.cur=t.id;S.meta.cur=t.id;S.day=null;S.calM=null;saveMeta();ov.remove();$$(".ov").forEach(o=>o.remove());render();toast(isNew?"Trip created — now import a booking":"Saved")};
  $("#tDel",ov)?.addEventListener("click",async()=>{const its=tripItems(t.id),fs=S.files.filter(f=>f.tripId===t.id),nm=tripMems(t.id).length;
    if(!(await gate({title:`Delete “${esc(t.name)}”?`,plan:[`Delete the trip and its ${its.length} entries (bookings, activities, expenses, documents)`,`Delete ${fs.length} stored file(s) and ${nm} memor${nm===1?"y":"ies"}`,"Other trips are not touched",...(t.sync?.fileId?["This is a shared trip: you leave it, and the others keep their copy in Google Drive"]:[])],irreversible:`All of the above. ${S.meta.lastBackup?"Your last backup was "+new Date(S.meta.lastBackup).toLocaleString()+".":"You have never exported a backup."}`,ok:"Delete trip"})))return;
    for(const i of its)await DB.del("items",i.id);for(const f of fs)await DB.del("files",f.id);for(const m of S.memories.filter(m=>m.tripId===t.id))await DB.del("memories",m.id);await DB.del("trips",t.id);S.memories=S.memories.filter(m=>m.tripId!==t.id);
    S.items=S.items.filter(i=>i.tripId!==t.id);S.files=S.files.filter(f=>f.tripId!==t.id);S.trips=S.trips.filter(x=>x.id!==t.id);S.cur=S.trips[0]?.id||null;S.meta.cur=S.cur;markDirty();$$(".ov").forEach(o=>o.remove());render();toast("Trip deleted")})}

