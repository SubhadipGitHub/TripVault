"use strict";
/* ===================== On the ground: hand-offs to maps, cabs, translation and payment apps =====================
   Trip Vault never talks to these apps itself. A tap opens the app (or its website) with what you chose: an
   address, a phrase or an amount. Apps with a documented way to prefill get it (Uber universal links, Google
   Maps URLs, Apple Maps, Waze, Organic Maps, Google Translate, NPCI UPI links); the others open with the
   address copied to paste. Every link starts from a fixed scheme and host and every value is encoded. */
const enc=encodeURIComponent;
const isTouch=()=>matchMedia("(pointer:coarse)").matches;
const EU_CC=["GB","IE","FR","DE","NL","BE","PT","ES","IT","PL","CZ","AT","CH","SE","NO","DK","FI","EE","LV","LT","HU","RO","BG","GR","HR","SK","SI","CY","MT","GE","UA","ZA","KE","NG","GH","TZ","UG","TN","AZ"];
const APPS={
 cab:[
  {id:"uber",name:"Uber",fill:1,url:p=>`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${enc(p.addr||p.name)}&dropoff[nickname]=${enc(p.name||p.addr)}`},
  {id:"ola",name:"Ola",url:()=>"https://book.olacabs.com/"},
  {id:"rapido",name:"Rapido",url:()=>"https://www.rapido.bike/"},
  {id:"grab",name:"Grab",url:()=>"https://www.grab.com/"},
  {id:"gojek",name:"Gojek",url:()=>"https://www.gojek.com/"},
  {id:"bolt",name:"Bolt",url:()=>"https://bolt.eu/"},
  {id:"careem",name:"Careem",url:()=>"https://www.careem.com/"},
  {id:"lyft",name:"Lyft",url:()=>"https://ride.lyft.com/"}],
 map:[
  {id:"google",name:"Google Maps",fill:1,url:p=>`https://www.google.com/maps/dir/?api=1&destination=${enc(p.addr||p.name)}`,city:c=>`https://www.google.com/maps/search/?api=1&query=${enc(c)}`},
  {id:"apple",name:"Apple Maps",fill:1,url:p=>`https://maps.apple.com/?daddr=${enc(p.addr||p.name)}`},
  {id:"organic",name:"Organic Maps",fill:1,url:p=>`https://omaps.app/search?query=${enc(p.addr||p.name)}`,city:c=>`https://omaps.app/search?query=${enc(c)}`},
  {id:"waze",name:"Waze",fill:1,url:p=>`https://waze.com/ul?q=${enc(p.addr||p.name)}&navigate=yes`}],
 pay:[ // NPCI UPI link; on iOS there is no app chooser, so the app-specific schemes are offered too
  {id:"upi",name:"Any UPI app",scheme:"upi://pay"},{id:"gpay",name:"Google Pay",scheme:"tez://upi/pay"},{id:"phonepe",name:"PhonePe",scheme:"phonepe://pay"},
  {id:"paytm",name:"Paytm",scheme:"paytmmp://pay"},{id:"bhim",name:"BHIM",scheme:"bhim://upi/pay"}]};
const CAB_BY_CC={IN:["uber","ola","rapido"],MY:["grab"],SG:["grab"],TH:["grab"],VN:["grab"],PH:["grab"],KH:["grab"],MM:["grab"],ID:["gojek","grab"],
  AE:["careem","uber"],SA:["careem","uber"],QA:["careem","uber"],JO:["careem","uber"],PK:["careem","uber"],KW:["careem"],BH:["careem"],OM:["careem"],EG:["uber","careem"],
  US:["uber","lyft"],CA:["uber","lyft"],LK:["uber"],NP:[],MV:[],...Object.fromEntries(EU_CC.map(c=>[c,["bolt","uber"]]))};
const appById=(cat,id)=>APPS[cat].find(a=>a.id===id);
const appPref=cat=>S.settings?.["app"+cat[0].toUpperCase()+cat.slice(1)]||"";
/* The trip's country: the first arrival outside home, else the local currency's country, else home. */
function tripCC(t){if(!t)return homeCC();const h=homeCC();
  const f=tripItems(t.id).filter(i=>i.kind==="flight").sort((a,b)=>(a.dep||"").localeCompare(b.dep||"")).find(i=>AP[i.to]&&AP[i.to].cc!==h);if(f)return AP[f.to].cc;
  if(t.localCur&&t.localCur!==CC_CUR[h]){const c=Object.keys(CC_CUR).find(k=>CC_CUR[k]===t.localCur);if(c)return c}return h}
/* Cab apps for a country, the person's choice first. */
function cabsFor(cc){const ids=[...new Set([appPref("cab"),...(CAB_BY_CC[cc]??["uber"])].filter(Boolean))];return ids.map(i=>appById("cab",i)).filter(Boolean)}
const mapApp=()=>appById("map",appPref("map"))||APPS.map[0];
const translateUrl=(text,lang)=>`https://translate.google.com/?sl=auto&tl=${enc(lang||"en")}&text=${enc(text)}&op=translate`;
function upiUrl(id,{pa,pn,am,tn}){const a=appById("pay",id)||APPS.pay[0];
  return`${a.scheme}?pa=${enc(pa)}&pn=${enc(pn||pa)}${am?`&am=${enc((Math.round(am*100)/100).toFixed(2))}`:""}&cu=INR&tn=${enc(String(tn||"Trip Vault").slice(0,60))}`}
const UPI_RE=/^[\w.-]{2,256}@[A-Za-z][A-Za-z0-9.]{2,64}$/;
/* Open a hand-off. Apps that can't prefill get the address on the clipboard first. */
async function handOff(app,p){const url=app.url(p);
  if(!app.fill&&p){try{await navigator.clipboard.writeText(p.addr||p.name)}catch(e){}toast(`Address copied — paste it as your destination in ${esc(app.name)}`,"info")}
  window.open(url,"_blank","noopener,noreferrer")}

/* ---------- places on this trip, for directions, cabs and the driver card (all offline) ---------- */
function tripPlaces(t){const out=[],seen=new Set(),today=todayIn(t.tz||S.settings.homeTz),stay=stayOn(t,today);
  const add=(name,addr,when,o={})=>{name=String(name||"").trim();addr=String(addr||"").trim();if(!name&&!addr)return;const k=(addr||name).toLowerCase();if(seen.has(k))return;seen.add(k);out.push({name:name||addr,addr:addr||name,when:when||"",...o})};
  if(stay)add(stay.name,stay.address,"",{local:stay.addrLocal,tonight:1,kind:"hotel",id:stay.id});
  for(const it of tripItems(t.id).slice().sort((a,b)=>(itemDates(a)[0]||"").localeCompare(itemDates(b)[0]||""))){const w=itemDates(it)[0]||"";
    if(it.kind==="hotel")add(it.name,it.address,w,{local:it.addrLocal,kind:"hotel",id:it.id});
    else if(it.kind==="flight"){for(const c of[it.from,it.to])if(c)add(`${AP[c]?.city||c} airport (${c})`,airportQ(c),w,{kind:"flight"})}
    else if(it.kind==="train"||it.kind==="bus"||it.kind==="ferry"){add(it.fromName||it.from,[it.fromName,it.from].filter(Boolean).join(", "),w,{kind:it.kind});add(it.toName||it.to,[it.toName,it.to].filter(Boolean).join(", "),w,{kind:it.kind})}
    else if(it.kind==="car"){add(it.pickup,it.pickup,w,{kind:"car"});add(it.dropoff,it.dropoff,w,{kind:"car"})}
    else if(it.kind==="activity"||it.kind==="transfer")add(it.location||it.title,it.location,w,{local:it.addrLocal,kind:it.kind,id:it.id})}
  for(const i of t.ideas||[])if(i.place)add(i.text||i.place,i.place,"",{kind:"activity"});
  return out}
const placeKey=p=>btoa(unescape(enc(JSON.stringify([p.name,p.addr,p.local||""])))).replace(/=+$/,"");
const placeFrom=k=>{try{const[name,addr,local]=JSON.parse(decodeURIComponent(escape(atob(k))));return{name:String(name),addr:String(addr),local:String(local||"")}}catch(e){return null}};
/* Buttons for one place: directions, cab, driver card, translate, copy. */
function placeBtns(p,t){const k=esc(placeKey(p)),cabs=cabsFor(tripCC(t));
  return`<div class="row wrap pl-b"><button class="btn xs" data-a="plDrv" data-p="${k}">${ic("phone","sm")} Show driver</button><button class="btn xs" data-a="plGo" data-p="${k}">${ic("compass","sm")} Directions</button>${cabs.length?`<button class="btn xs" data-a="plCab" data-p="${k}">${ic("car","sm")} Cab</button>`:""}<button class="btn xs ghost" data-a="plTr" data-p="${k}">${ic("globe","sm")} Translate</button><button class="btn xs ghost" data-copy="${esc(p.local||p.addr)}" aria-label="Copy address">${ic("copy","sm")}</button></div>`}
function openPlaces(){const t=curTrip();if(!t)return;const P=tripPlaces(t);
  sheet({title:`${ic("pin")} Places`,help:"places",body:`${P.length?P.map(p=>`<div class="li pl"><span class="kic sm k-${esc(p.kind||"activity")}">${ic(p.kind==="hotel"?"bed":p.kind==="flight"?"plane":p.kind==="car"?"car":"pin","sm")}</span><div class="b"><div class="t">${esc(p.name)}${p.tonight?pill("tonight","ok"):""}</div>${p.addr&&p.addr!==p.name?`<div class="d">${esc(p.addr)}</div>`:""}${p.local?`<div class="d" lang="">${esc(p.local)}</div>`:""}${placeBtns(p,t)}</div></div>`).join(""):`<div class="small muted">No places yet</div>`}
    <div class="row wrap mt" style="gap:6px"><button class="btn" data-a="offMap">${ic("download","sm")} Get offline map</button><button class="btn ghost" data-a="phrases">${ic("globe","sm")} Phrases</button></div>`,foot:`<button class="btn pri" data-close>Close</button>`})}
/* Large card to show a driver or anyone else: the local-script address first when saved. */
function openDriver(p){
  sheet({title:`${ic("phone")} ${esc(p.name)}`,cls:"drv",body:`${p.local?`<div class="drv-big">${esc(p.local)}</div><div class="drv-sub">${esc(p.addr)}</div>`:`<div class="drv-big">${esc(p.addr||p.name)}</div>`}`,
    foot:`<button class="btn" data-copy="${esc(p.local||p.addr)}">${ic("copy","sm")} Copy</button><span class="sp"></span><button class="btn pri" data-close>Done</button>`})}
function chooseApp(title,list,run){if(list.length===1){run(list[0]);return}
  const ov=sheet({title,body:`<div class="grid" style="gap:8px">${list.map(a=>`<button class="btn" data-app="${a.id}" style="justify-content:center">${esc(a.name)}</button>`).join("")}</div>`,foot:`<button class="btn" data-close>Cancel</button>`});
  ov.addEventListener("click",e=>{const b=e.target.closest("[data-app]");if(!b)return;ov.remove();run(list.find(a=>a.id===b.dataset.app))})}
function plCab(p){const t=curTrip(),L=cabsFor(tripCC(t));if(!L.length){toast("No cab app set for this country. Choose one in Settings → Apps","info");return}chooseApp(`${ic("car")} Cab to ${esc(p.name)}`,L,a=>handOff(a,p))}
const plGo=p=>handOff(mapApp(),p);
const plTr=p=>window.open(translateUrl(p.local||p.addr||p.name,appPref("lang")||tripLang(curTrip())||"en"),"_blank","noopener,noreferrer");
function openOfflineMap(){const t=curTrip(),c=destCity(t);
  sheet({title:`${ic("download")} Offline map`,help:"places",body:`<div class="h"><h2>${esc(c||"Destination")}</h2></div>
    <div class="grid" style="gap:8px">${APPS.map.filter(a=>a.city).map(a=>`<a class="btn" style="justify-content:center" href="${esc(a.city(c||t?.name||""))}" target="_blank" rel="noopener noreferrer">${ic("download","sm")} ${esc(a.name)}</a>`).join("")}</div>`,foot:`<button class="btn pri" data-close>Close</button>`})}
function destCity(t){if(!t)return"";const h=homeCC();const f=tripItems(t.id).filter(i=>i.kind==="flight"&&AP[i.to]).sort((a,b)=>(a.dep||"").localeCompare(b.dep||""));
  const out=f.find(i=>AP[i.to].cc!==h)||f[0];return out?AP[out.to].city:(t.dest||"").split(",")[0].trim()}
function openTranslate(){const t=curTrip(),L=appPref("lang")||tripLang(t)||"en";
  const ov=sheet({title:`${ic("globe")} Translate`,help:"phrases",body:`<label for="trT">Text</label><textarea id="trT" style="min-height:90px" placeholder="Type or paste"></textarea>
    <div class="row wrap mt" style="gap:6px"><button class="btn pri" id="trGo">${ic("globe","sm")} Google Translate · ${esc((PHRASES[L]||[L.toUpperCase()])[0])}</button><button class="btn" data-a="phrases">${ic("book","sm")} Phrases</button></div>`,foot:`<button class="btn" data-close>Close</button>`});
  $("#trGo",ov).onclick=()=>{const v=$("#trT",ov).value.trim();window.open(translateUrl(v||" ",L),"_blank","noopener,noreferrer")}}

/* ---------- Today: On the ground (from the day before the trip until it ends) ---------- */
function groundCard(t){const ph=tripPhase(t);if(ph.p==="after"||ph.p==="none")return"";const near=ph.p==="during"||ph.days<=1;
  const upi=near&&HC()==="INR"&&Object.keys(t.upi||{}).length>0&&isTouch();
  const tile=(a,i,l)=>`<button class="gtile" data-a="${a}">${ic(i)}<span>${l}</span></button>`;
  return`<div class="card"><div class="h">${ic("compass")}<h2>${near?"On the ground":"Get ready"}</h2><span class="sp"></span><button class="ibtn hq" data-a="help" data-k="ground" aria-label="Help">?</button></div>
   <div class="gtiles">${near?tile("plCabPick","car","Cab")+tile("plGoPick","compass","Directions"):""}${tile("translate","globe","Translate")}${tile("phrases","book","Phrases")}${tile("places","pin","Places")}${tile("offMap","download","Offline map")}${upi?tile("payUpi","wallet","Pay"):""}</div></div>`}
/* Where-to picker for the Cab and Directions tiles: tonight's stay first. */
function pickPlace(title,run){const t=curTrip(),P=tripPlaces(t);if(!P.length){toast("Add a stay or a place first","info");return}
  const ov=sheet({title,body:P.map((p,i)=>`<button class="li tap pick" data-i="${i}" style="width:100%;text-align:left"><div class="b"><div class="t">${esc(p.name)}${p.tonight?pill("tonight","ok"):""}</div>${p.addr!==p.name?`<div class="d">${esc(p.addr)}</div>`:""}</div></button>`).join(""),foot:`<button class="btn" data-close>Cancel</button>`});
  ov.addEventListener("click",e=>{const b=e.target.closest("[data-i]");if(!b)return;ov.remove();run(P[+b.dataset.i])})}
/* Settle up: pay a fellow traveller by UPI (home currency INR, payee has a UPI ID). */
function upiPayBtn(t,x){const pa=(t.upi||{})[x.to];if(HC()!=="INR"||!pa||!UPI_RE.test(pa))return"";
  if(!isTouch())return`<button class="btn xs ghost" data-copy="${esc(pa)}" title="UPI ID">${ic("copy","sm")} ${esc(pa)}</button>`;
  const url=upiUrl(appPref("pay")||"upi",{pa,pn:x.to,am:x.v,tn:`Trip Vault · ${t.name}`});
  return`<a class="btn xs pri" href="${esc(url)}" rel="noopener noreferrer">${ic("wallet","sm")} Pay via UPI</a>`}

/* A place's menu (from any map pin on bookings and events). */
function openPlaceMenu(p){const t=curTrip();sheet({title:`${ic("pin")} ${esc(p.name)}`,help:"places",body:`${p.addr&&p.addr!==p.name?`<div class="small muted">${esc(p.addr)}</div>`:""}${placeBtns(p,t)}`,foot:`<button class="btn pri" data-close>Close</button>`})}
