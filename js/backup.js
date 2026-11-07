"use strict";
/* ===================== Backup & restore (plain .json or passphrase-encrypted .tvault) ===================== */
const toB64=blob=>new Promise((r,j)=>{const fr=new FileReader();fr.onload=()=>r(String(fr.result).split(",")[1]||"");fr.onerror=j;fr.readAsDataURL(blob)});
const fromB64=(s,type)=>{const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Blob([u],{type})};
function dl(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
async function encryptBackup(json,pass){const salt=crypto.getRandomValues(new Uint8Array(16)),iter=600000,key=await Crypt.derive(pass,salt,iter);const ct=await Crypt.enc(key,new TextEncoder().encode(json));const h=new Uint8Array(24);h.set([84,86,66,49]);h.set(salt,4);new DataView(h.buffer).setUint32(20,iter,true);return new Blob([h,ct],{type:"application/octet-stream"})}
async function decryptBackup(buf,pass){const salt=new Uint8Array(buf.slice(4,20)),iter=new DataView(buf).getUint32(20,true),key=await Crypt.derive(pass,salt,iter);return new TextDecoder().decode(await Crypt.dec(key,buf.slice(24)))}
function openBackup(){const mb=(S.files.reduce((a,f)=>a+(f.size||0),0)/1048576).toFixed(1);const t=curTrip();
  const dirty=S.meta.dirty&&(!S.meta.lastBackup||S.meta.dirty>S.meta.lastBackup);
  const ov=sheet({title:`${ic("db")} Backup & restore`,body:`
   <div class="note ${dirty?"warn":"ok"}">${ic(dirty?"alert":"check")}<div>${S.meta.lastBackup?`Last full backup: <b>${new Date(S.meta.lastBackup).toLocaleString()}</b>`:"<b>No backup yet.</b>"}${dirty?" · changes since then":S.meta.lastBackup?" · up to date":""}<div class="small muted">Your vault lives only in this browser. Export before clearing browser data, switching phones or travelling. Save the file somewhere you trust (your drive, a USB stick).</div></div></div>
   <label class="row mt" style="cursor:pointer"><input type="checkbox" id="bEnc" ${hasCrypto?"checked":"disabled"}> <span style="font-size:12.5px;color:var(--tx)">${ic("lock","sm")} Encrypt the backup with a passphrase <span class="dim">(recommended — backups contain passports and tickets)</span></span></label>
   <div class="grid mt" style="gap:8px">
    <button class="btn pri" id="bAll" style="justify-content:center">${ic("download")} Export everything · ${S.trips.length} trips, ${S.items.length} entries, ${S.memories.length} memories, ${S.files.length} files (${mb} MB)</button>
    ${t?`<button class="btn" id="bTrip" style="justify-content:center">${ic("download")} Export only “${esc(t.name)}”</button>`:""}
   </div><div class="sep"></div>
   <div class="h">${ic("phone")}<h2>Phone to phone, no internet</h2></div>
   <div class="small muted">Move trips to another phone with Trip Vault open: this screen shows a stream of QR codes, the other phone reads them with its camera. Encrypted with a one-time code.</div>
   <div class="row wrap mt"><button class="btn" id="qrSend">${ic("share","sm")} Send by QR</button><button class="btn" id="qrRecv">${ic("camera","sm")} Receive by QR</button></div><div class="sep"></div>
   <div class="h">${ic("upload")}<h2>Restore from a backup</h2></div>
   <label class="drop" style="padding:16px">${ic("upload")} <b>Choose a Trip Vault backup (.tvault or .json)</b><div class="small muted">You'll see what changes before anything is written</div><input type="file" id="bIn" accept=".json,.tvault,application/json,application/octet-stream" hidden></label>`});
  $("#qrSend",ov).onclick=()=>{ov.remove();openSendQR()};$("#qrRecv",ov).onclick=()=>{ov.remove();openReceiveQR()};
  $("#bAll",ov).onclick=()=>exportVault(null,ov);$("#bTrip",ov)?.addEventListener("click",()=>exportVault(t.id,ov));
  $("#bIn",ov).onchange=e=>{const f=e.target.files[0];if(f){ov.remove();previewImport(f)}}}
/* The backup object shared by file export and phone-to-phone transfer.
   o.files=false leaves attachments and photos out; o.settings=false leaves settings out. */
async function buildBackup(tripId,o={}){
  const trips=tripId?S.trips.filter(t=>t.id===tripId):S.trips;const ids=new Set(trips.map(t=>t.id));const files=[];
  if(o.files!==false)for(const f of S.files.filter(f=>ids.has(f.tripId))){const{blob,...m}=f;files.push({...m,data:blob?await toB64(blob):""})}
  const memories=S.memories.filter(m=>ids.has(m.tripId)).map(m=>o.files===false?{...m,photoIds:[]}:m);
  return{app:"TripVault",v:2,exportedAt:new Date().toISOString(),scope:tripId?"trip":"all",trips,items:S.items.filter(i=>ids.has(i.tripId)),memories,files,settings:tripId||o.settings===false?undefined:S.settings}}
async function exportVault(tripId,ov){
  const enc=$("#bEnc",ov)?.checked;let pass=null;if(enc){pass=await promptNewPass({title:"Backup passphrase",ok:"Encrypt & download"});if(!pass)return}
  const btn=$(tripId?"#bTrip":"#bAll",ov);if(btn){btn.disabled=true;btn.innerHTML=`${ic("clock")} Packing files…`}
  const out=await buildBackup(tripId),trips=out.trips;
  const n=new Date(),stamp=`${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}`,json=JSON.stringify(out);
  const base=`tripvault-${tripId?slug(trips[0].name):"all"}-${stamp}`;
  if(enc){toast("Encrypting backup…","info");dl(await encryptBackup(json,pass),base+".tvault")}else dl(new Blob([json],{type:"application/json"}),base+".json");
  if(!tripId){S.meta.lastBackup=Date.now();await saveMeta()}ov?.remove();render();toast("Backup downloaded")}
async function readBackup(file){
  const buf=await file.arrayBuffer(),h=new Uint8Array(buf,0,Math.min(4,buf.byteLength));
  if(h[0]===84&&h[1]===86&&h[2]===66&&h[3]===49){
    for(;;){const p=await promptPass("This backup is encrypted","Decrypt");if(p==null)return null;
      try{return JSON.parse(await decryptBackup(buf,p))}catch(e){toast("Wrong passphrase, or the file is damaged","bad")}}}
  return JSON.parse(new TextDecoder().decode(buf));
}
async function previewImport(file){let d;try{d=await readBackup(file)}catch(e){toast("That isn't a valid backup file","bad");return}
  if(!d)return;if(d.app!=="TripVault"||!Array.isArray(d.trips)){toast("Not a Trip Vault backup","bad");return}
  const cmp=(arr,cur)=>{let nw=0,up=0,same=0;for(const x of arr||[]){const e=cur.find(c=>c.id===x.id);if(!e)nw++;else if((x.updatedAt||0)>(e.updatedAt||0))up++;else same++}return{nw,up,same}};
  const ct=cmp(d.trips,S.trips),ci=cmp(d.items,S.items),cm=cmp(d.memories,S.memories);const fNew=(d.files||[]).filter(f=>!S.files.some(x=>x.id===f.id||x.hash===f.hash)).length;
  const ov=sheet({title:"Restore backup",body:`<div class="note info">${ic("info")}<div><b>${esc(file.name)}</b><div class="small muted">Exported ${new Date(d.exportedAt).toLocaleString()} · ${d.trips.length} trips · ${(d.items||[]).length} entries · ${(d.memories||[]).length} memories · ${(d.files||[]).length} files</div></div></div>
   <div class="mt"><label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--tx)"><input type="radio" name="mode" value="merge" checked style="width:auto;margin-top:3px"><span><b>Merge (recommended)</b><br><span class="small muted">Adds ${ct.nw} new trip(s), ${ci.nw} new entries and ${cm.nw} new memories, updates ${ct.up+ci.up+cm.up} that are newer in the backup, adds ${fNew} file(s). Keeps everything else. Same files are never stored twice.</span></span></label>
   <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--tx);margin-top:10px"><input type="radio" name="mode" value="replace" style="width:auto;margin-top:3px"><span><b style="color:var(--bad)">Replace everything</b><br><span class="small muted">Deletes the current ${S.trips.length} trips, ${S.items.length} entries and ${S.files.length} files on this device, then restores the backup exactly.</span></span></label></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="rGo">Continue</button>`});
  $("#rGo",ov).onclick=async()=>{const mode=$("[name=mode]:checked",ov).value;ov.remove();
    if(mode==="replace"){if(!(await gate({title:"Replace the whole vault?",plan:[`Delete ${S.trips.length} trips, ${S.items.length} entries, ${S.files.length} files currently on this device`,`Restore ${d.trips.length} trips, ${(d.items||[]).length} entries, ${(d.files||[]).length} files from the backup`],irreversible:"Anything on this device that isn't in the backup is lost. Export a backup of the current vault first if unsure.",ok:"Replace"})))return;
      for(const st of DATA_STORES)await DB.clear(st)}
    const fileRecs=[];for(const f of d.files||[]){const{data,...m}=f;if(mode==="merge"){const ex=S.files.find(x=>x.hash===f.hash&&x.id!==f.id);if(ex){ex.itemIds=[...new Set([...(ex.itemIds||[]),...(f.itemIds||[])])];fileRecs.push(ex);continue}if(S.files.some(x=>x.id===f.id))continue}fileRecs.push({...m,blob:fromB64(data||"",f.type)})}
    const pick=(arr,cur)=>mode==="replace"?arr:arr.filter(x=>{const e=cur.find(c=>c.id===x.id);return!e||(x.updatedAt||0)>(e.updatedAt||0)});
    await DB.putMany("trips",pick(d.trips,S.trips));await DB.putMany("items",pick(d.items||[],S.items));await DB.putMany("memories",pick(d.memories||[],S.memories));await DB.putMany("files",fileRecs);
    if(mode==="replace"&&d.settings){const keep={autoLock:S.settings.autoLock,theme:S.settings.theme};await DB.put("meta",{k:"settings",v:{...d.settings,...keep}})}
    await loadAll();clearPhotoCache();if(!curTrip())S.cur=S.trips[0]?.id||null;S.meta.cur=S.cur;S.meta.lastBackup=Date.now();SEARCH.stale=true;await saveMeta();render();toast(mode==="replace"?"Vault restored from backup":"Backup merged")}}
const clearPhotoCache=()=>{PHOTO_URLS.forEach(u=>URL.revokeObjectURL(u));PHOTO_URLS.clear()};

/* ===================== Sample trip ===================== */
async function loadSample(){const today=todayIn("Asia/Kolkata"),d0=addDays(today,21),D=n=>addDays(d0,n),KL="Asia/Kuala_Lumpur";
  const t={id:uid(),name:"Sample · KL & Langkawi",dest:"Kuala Lumpur, Langkawi",start:d0,end:D(5),tz:KL,type:"international",localCur:"MYR",rates:{MYR:19.2},budget:180000,createdAt:Date.now(),sample:true};
  const g1=uid(),g2=uid(),P=(s,a,m,due)=>({id:uid(),status:s,amount:a,method:m,due:due||today}),nm=["Arjun Mehta","Riya Mehta"];
  const L=[
    {kind:"flight",flightNo:"6E 1061",airline:"IndiGo",from:"BLR",to:"KUL",dep:`${D(0)}T07:15`,arr:`${D(0)}T14:05`,depTz:"Asia/Kolkata",arrTz:KL,terminal:"1",ref:"Q7XK2M",groupId:g1,cost:48640,cur:"INR",payments:[P("paid",48640,"Card")],names:nm},
    {kind:"transfer",title:"KLIA Ekspres → KL Sentral + Grab",start:`${D(0)}T15:15`,end:`${D(0)}T16:15`,tz:KL,location:"KLIA arrival hall, Level 1",cost:110,cur:"MYR",payments:[]},
    {kind:"hotel",name:"Grand Millennium Kuala Lumpur",address:"160 Jalan Bukit Bintang, 55100 Kuala Lumpur, Malaysia",checkIn:`${D(0)}T16:00`,checkOut:`${D(3)}T08:00`,tz:KL,ref:"4821.553.907",pin:"7241",cost:1450,cur:"MYR",refundable:true,payments:[P("pending",1450,"Pay at property",D(0))],names:nm},
    {kind:"activity",title:"Petronas Towers skybridge",start:`${D(1)}T10:00`,end:`${D(1)}T11:30`,tz:KL,location:"KLCC, Jalan Ampang",ref:"PT-88213",cost:160,cur:"MYR",payments:[P("paid",160,"Card")]},
    {kind:"activity",title:"Batu Caves & banana-leaf breakfast",start:`${D(2)}T07:30`,end:`${D(2)}T11:00`,tz:KL,location:"Batu Caves, Gombak"},
    {kind:"flight",flightNo:"AK 6430",airline:"AirAsia",from:"KUL",to:"LGK",dep:`${D(3)}T10:30`,arr:`${D(3)}T11:35`,depTz:KL,arrTz:KL,terminal:"2",ref:"M8JQ4P",groupId:g2,cost:6200,cur:"INR",payments:[P("paid",6200,"UPI")],names:nm},
    {kind:"hotel",name:"Casa del Mar Langkawi",address:"Jalan Pantai Cenang, 07000 Langkawi, Malaysia",checkIn:`${D(3)}T14:00`,checkOut:`${D(5)}T07:00`,tz:KL,ref:"1488520117",cost:38400,cur:"INR",payments:[P("paid",20000,"UPI"),P("pending",18400,"Agent",D(-7))],names:nm},
    {kind:"car",name:"Langkawi Auto Rental",pickup:"Langkawi International Airport (LGK), arrivals hall",dropoff:"Langkawi International Airport (LGK)",carType:"Compact automatic",start:`${D(3)}T12:00`,end:`${D(5)}T07:30`,tz:KL,ref:"LAR-55120",cost:240,cur:"MYR",payments:[P("pending",240,"Pay at pick-up",D(3))]},
    {kind:"activity",title:"Island-hopping tour",start:`${D(4)}T09:30`,end:`${D(4)}T13:30`,tz:KL,location:"Pantai Cenang jetty",cost:120,cur:"MYR",payments:[]},
    {kind:"flight",flightNo:"AK 6429",airline:"AirAsia",from:"LGK",to:"KUL",dep:`${D(5)}T09:00`,arr:`${D(5)}T10:05`,depTz:KL,arrTz:KL,terminal:"",ref:"M8JQ4P",groupId:g2,cost:0,cur:"INR",payments:[],names:nm},
    {kind:"flight",flightNo:"6E 1062",airline:"IndiGo",from:"KUL",to:"BLR",dep:`${D(5)}T15:20`,arr:`${D(5)}T17:10`,depTz:KL,arrTz:"Asia/Kolkata",terminal:"1",ref:"Q7XK2M",groupId:g1,cost:0,cur:"INR",payments:[],names:nm},
    {kind:"doc",docType:"Passport",title:"Passport · Arjun",expiry:addDays(D(5),120),names:["Arjun Mehta"]},
    {kind:"doc",docType:"Passport",title:"Passport · Riya",expiry:"2031-03-14",names:["Riya Mehta"]},
    {kind:"doc",docType:"Travel insurance",title:"Travel insurance",ref:"POL-2291-77",expiry:D(6)}];
  const EX=(d,time,title,cat,cost)=>({kind:"expense",title,cat,cost,cur:"MYR",date:D(d),time,tz:KL,payments:[]});
  L.push(EX(0,"19:40","Nasi lemak at Jalan Alor","Food",42),EX(1,"08:30","Roti canai breakfast","Food",14),EX(1,"13:10","Grab to KLCC","Local transport",22),EX(2,"09:00","Batu Caves train ticket","Local transport",6),EX(2,"20:15","Laksa and cendol","Food",38),EX(4,"19:00","Seafood dinner, Cenang","Food",140),EX(4,"12:30","Batik shopping","Shopping",85));
  t.pack=defaultPack(true).map((p,i)=>({...p,done:i%3===0}));t.emergency="Insurance helpline: (add yours)\nHotel KL: front desk on the booking email";
  await saveTrip(t);for(const x of L)await saveItem({id:uid(),tripId:t.id,names:[],payments:[],...x,sample:true});
  const card=(hue,word,sub)=>new Promise(r=>{const c=document.createElement("canvas");c.width=1200;c.height=900;const g=c.getContext("2d");const gr=g.createLinearGradient(0,0,1200,900);gr.addColorStop(0,`hsl(${hue},70%,62%)`);gr.addColorStop(1,`hsl(${(hue+50)%360},65%,28%)`);g.fillStyle=gr;g.fillRect(0,0,1200,900);
    g.fillStyle="rgba(255,255,255,.18)";g.beginPath();g.arc(880,300,150,0,7);g.fill();g.fillStyle="rgba(0,0,0,.28)";g.beginPath();g.moveTo(0,900);g.lineTo(0,640);g.lineTo(260,420);g.lineTo(470,610);g.lineTo(720,360);g.lineTo(1000,640);g.lineTo(1200,520);g.lineTo(1200,900);g.fill();
    g.fillStyle="#fff";g.font="700 96px Georgia,serif";g.fillText(word,70,170);g.font="500 38px system-ui,sans-serif";g.globalAlpha=.85;g.fillText(sub,74,230);c.toBlob(b=>r(new File([b],word+".jpg",{type:"image/jpeg"})),"image/jpeg",.85)});
  const MM=[[1,"Sunrise above the towers","We queued early for the skybridge and the whole city was still blue. KLCC looked like a rocket on its pad. Worth every sleepy minute.","KLCC","awe",true,265,"Kuala Lumpur","skybridge, 10:00"],
            [2,"Banana-leaf breakfast","Roti, dhal, three kinds of curry and a teh tarik that came with a small lecture on how to pull it. Eating with hands is the only correct way.","Batu Caves","tasty",false,28,"Batu Caves","a very good breakfast"],
            [4,"Island hopping, finally","The water was impossibly green. Rain for ten minutes, then a rainbow for twenty. Nobody checked their phone.","Langkawi","joy",true,175,"Langkawi","green water"]];
  for(const[dd,title,text,place,mood,fav,hue,w,sub]of MM){const m={id:uid(),tripId:t.id,date:D(dd),title,text,place,mood,fav,photoIds:[],sample:true};m.photoIds=await addPhotos([await card(hue,w,sub)],t.id,m.id);await saveMem(m)}
  S.cur=t.id;S.meta.cur=t.id;S.view="today";SEARCH.stale=true;saveMeta();$$(".ov").forEach(o=>o.remove());render();toast("Sample trip loaded — explore, then delete it from trip settings")}

/* ===================== Itinerary text ===================== */
function itinText(t){let s=`${t.name}\n${tripMeta(t)}\n`;
  for(const d of tripDays(t)){const evs=tripItems(t.id).flatMap(it=>itemEvents(it).filter(e=>e.main&&e.s.slice(0,10)===d)).sort((a,b)=>a.su-b.su);
    s+=`\n${fmtD(d,1)} · ${tzShort(dayTz(t,d))}\n`;if(!evs.length)s+="  (free day)\n";
    for(const e of evs){const it=e.it;s+=`  ${e.s.slice(11)}  ${e.label}${isTransport(it.kind)?` → arr ${e.e.slice(11)}${it.terminal?" · T"+it.terminal:""}`:""}${it.ref?`  [${it.ref}]`:""}${it.location?` · ${it.location}`:""}\n`}
    const st=stayOn(t,d);if(st)s+=`  Night: ${st.name}${st.address?" — "+st.address:""}\n`}
  return s}

