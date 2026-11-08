"use strict";
/* ===================== Share a trip through Google Drive =====================
   Off until someone shares or joins a trip. Then, per shared trip:
   - One "trip file" in the owner's Drive holds the trip, bookings, memories, file details and
     deletions. It is gzip + AES-256-GCM encrypted with a key made from the trip code, which only
     the members have (it travels in the invite link's #fragment, never to a server). The owner
     shares it with each member's Gmail; a member opens it once through the Google Picker, which
     is what lets this app (scope drive.file) read and write it.
   - Each attachment or photo is encrypted with the same key and uploaded by whoever added it to a
     "Trip Vault files" folder in their own Drive, shared as "anyone with the link". Others fetch
     it with the API key, so no per-file grants are needed. Google only ever stores ciphertext.
   Sync merges record by record (newer updatedAt wins) and passes deletions on as tombstones.
   The Google token is kept in memory only. */
const GS={tok:null,exp:0,email:"",name:"",folder:null,keys:new Map(),busy:new Set(),st:{}};
const GS_SCOPE="https://www.googleapis.com/auth/drive.file",GS_NAME="Trip Vault shared trip",GS_FOLDER="Trip Vault files";
const GD="https://www.googleapis.com/drive/v3",GDU="https://www.googleapis.com/upload/drive/v3";
const gsReady=()=>typeof GSYNC==="object"&&!!(GSYNC.clientId&&GSYNC.apiKey&&GSYNC.appId);
const gsErr=(msg,extra)=>Object.assign(new Error(msg),extra||{});
function gsScript(src){return new Promise((res,rej)=>{if([...document.scripts].some(s=>s.src===src&&s.dataset.ok))return res();
  const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>{s.dataset.ok="1";res()};s.onerror=()=>{s.remove();rej(gsErr("Couldn't reach Google. Check your connection."))};document.head.append(s)})}

/* ---------- sign-in (Google Identity Services token client) ---------- */
const GAuth={
  async token(interactive){
    if(GS.tok&&Date.now()<GS.exp-60000)return GS.tok;
    if(!interactive)throw gsErr("Google sign-in needed",{code:"auth"});
    if(!gsReady())throw gsErr("Google sharing isn't set up in this copy of Trip Vault");
    await gsScript("https://accounts.google.com/gsi/client");
    return new Promise((res,rej)=>{const c=google.accounts.oauth2.initTokenClient({client_id:GSYNC.clientId,scope:GS_SCOPE,login_hint:GS.email||undefined,prompt:GS.email?"":"select_account",
      callback:r=>{if(r.error){rej(gsErr(r.error_description||r.error,{code:"auth"}));return}GS.tok=r.access_token;GS.exp=Date.now()+(+r.expires_in||3600)*1000;res(GS.tok)},
      error_callback:e=>rej(gsErr(e?.type==="popup_closed"?"Google sign-in was closed":"Google sign-in didn't finish (pop-ups blocked?)",{code:"auth"}))});
      c.requestAccessToken()})},
  revoke(){try{if(GS.tok&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(GS.tok,()=>{})}catch(e){}GS.tok=null;GS.exp=0;GS.email="";GS.name="";GS.folder=null}
};

/* ---------- Drive REST (only the calls sharing needs) ---------- */
async function gfetch(url,o={}){
  const tok=await GAuth.token(o.interactive);const r=await fetch(url,{...o,headers:{...(o.headers||{}),Authorization:"Bearer "+tok}});
  if(r.status===401){GS.tok=null;throw gsErr("Google sign-in expired",{code:"auth"})}
  if(!r.ok){let m="";try{m=(await r.json()).error?.message||""}catch(e){}throw gsErr(m||`Google Drive said ${r.status}`,{status:r.status})}
  return r}
async function gUpload(method,url,meta,bytes){const b="tv"+uid();
  const body=new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/octet-stream\r\n\r\n`,bytes,`\r\n--${b}--`]);
  return(await gfetch(url,{method,headers:{"Content-Type":`multipart/related; boundary=${b}`},body})).json()}
const GDrive={
  async about(){return(await gfetch(GD+"/about?fields=user(emailAddress,displayName)")).json()},
  async meta(id){return(await gfetch(`${GD}/files/${id}?fields=id,version,trashed`)).json()},
  async read(id){return new Uint8Array(await(await gfetch(`${GD}/files/${id}?alt=media`)).arrayBuffer())},
  async create(name,bytes,props,parents){return gUpload("POST",`${GDU}/files?uploadType=multipart&fields=id,version`,{name,mimeType:"application/octet-stream",appProperties:props||{},...(parents?{parents}:{})},bytes)},
  async write(id,bytes){return(await gfetch(`${GDU}/files/${id}?uploadType=media&fields=id,version`,{method:"PATCH",headers:{"Content-Type":"application/octet-stream"},body:bytes})).json()},
  async share(id,email,msg){return(await gfetch(`${GD}/files/${id}/permissions?sendNotificationEmail=true&emailMessage=${encodeURIComponent(msg||"")}&fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"user",role:"writer",emailAddress:email})})).json()},
  async perms(id){return(await gfetch(`${GD}/files/${id}/permissions?fields=permissions(id,emailAddress,type)`)).json()},
  async unshare(id,permId){await gfetch(`${GD}/files/${id}/permissions/${permId}`,{method:"DELETE"})},
  async publicLink(id){await gfetch(`${GD}/files/${id}/permissions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"anyone",role:"reader"})})},
  async folder(){const q=encodeURIComponent(`name='${GS_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const l=await(await gfetch(`${GD}/files?q=${q}&fields=files(id)&spaces=drive`)).json();if(l.files?.[0])return l.files[0].id;
    return(await(await gfetch(`${GD}/files?fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:GS_FOLDER,mimeType:"application/vnd.google-apps.folder"})})).json()).id},
  async readPublic(id){ // attachments are link-shared ciphertext: the API key is enough
    const r=await fetch(`${GD}/files/${id}?alt=media&key=${encodeURIComponent(GSYNC.apiKey)}`);if(r.ok)return new Uint8Array(await r.arrayBuffer());
    if(GS.tok)return this.read(id);throw gsErr(`Couldn't download a shared file (${r.status})`,{status:r.status})}
};
const GPicker={ // lets a member open the trip file someone shared with them (that grant is what drive.file needs)
  async pick(){await gsScript("https://apis.google.com/js/api.js");
    await new Promise((res,rej)=>gapi.load("picker",{callback:res,onerror:()=>rej(gsErr("Couldn't load the Google file picker"))}));
    const tok=await GAuth.token(true);
    return new Promise(res=>{const v=new google.picker.DocsView(google.picker.ViewId.DOCS).setOwnedByMe(false).setQuery(GS_NAME).setMode(google.picker.DocsViewMode.LIST);
      new google.picker.PickerBuilder().addView(v).setOAuthToken(tok).setDeveloperKey(GSYNC.apiKey).setAppId(GSYNC.appId).setTitle("Choose the shared trip file")
        .setCallback(d=>{if(d.action===google.picker.Action.PICKED)res(d.docs[0].id);else if(d.action===google.picker.Action.CANCEL)res(null)}).build().setVisible(true)})}
};
async function gsMe(){if(!GS.email){const a=await GDrive.about();GS.email=(a.user?.emailAddress||"").toLowerCase();GS.name=a.user?.displayName||""}return GS.email}

/* ---------- trip code and encryption ---------- */
function gsNewCode(){const out=[];while(out.length<20){for(const x of crypto.getRandomValues(new Uint8Array(32)))if(x<248&&out.length<20)out.push(QR_CODE_ABC[x%31])}return out.join("").replace(/(.{4})(?=.)/g,"$1-")}
const GS_SALT=new TextEncoder().encode("TripVault shared trip v1");
async function gsKey(code){const k=qrNorm(code);if(!GS.keys.has(k))GS.keys.set(k,await Crypt.derive(k,GS_SALT,200000));return GS.keys.get(k)}
const GS_TRIP=[84,86,83,49],GS_FILE=[84,86,70,49]; // "TVS1" trip file, "TVF1" attachment
async function gsSeal(obj,code){const raw=new TextEncoder().encode(JSON.stringify(obj)),z=await gz(raw,true),body=z||raw;
  const ct=new Uint8Array(await Crypt.enc(await gsKey(code),body)),o=new Uint8Array(5+ct.length);o.set(GS_TRIP);o[4]=z?1:0;o.set(ct,5);return o}
async function gsOpen(bytes,code){if(!GS_TRIP.every((v,i)=>bytes[i]===v))throw gsErr("That isn't a Trip Vault shared trip");let p;
  try{p=new Uint8Array(await Crypt.dec(await gsKey(code),bytes.slice(5).buffer))}catch(e){throw gsErr("That code doesn't open this trip. Check the invite",{code:"key"})}
  return JSON.parse(new TextDecoder().decode(bytes[4]&1?await gz(p,false):p))}
async function gsSealBlob(blob,code){const ct=new Uint8Array(await Crypt.enc(await gsKey(code),await blob.arrayBuffer())),o=new Uint8Array(4+ct.length);o.set(GS_FILE);o.set(ct,4);return o}
async function gsOpenBlob(bytes,code,type){if(!GS_FILE.every((v,i)=>bytes[i]===v))throw gsErr("Shared file is damaged");return new Blob([await Crypt.dec(await gsKey(code),bytes.slice(4).buffer)],{type:type||"application/octet-stream"})}

/* ---------- merge ---------- */
const gsStable=v=>Array.isArray(v)?"["+v.map(gsStable).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+":"+gsStable(v[k])).join(",")+"}":JSON.stringify(v??null);
const gsById=a=>(a||[]).slice().sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0);
const gsCanon=m=>gsStable({trip:m.trip,items:gsById(m.items),memories:gsById(m.memories),files:gsById(m.files),tomb:m.tomb||[],members:m.members||[],owner:m.owner||""});
function gsLocal(t){const{sync,...trip}=t;return{trip,items:tripItems(t.id),memories:tripMems(t.id),files:S.files.filter(f=>f.tripId===t.id).map(({blob,...m})=>m)}}
/* Returns what to change locally (P) and the merged trip file to write back (out). */
function gsPlan(t,R){
  const cut=Date.now()-90*864e5,tomb=new Map();
  for(const x of[...(R?.tomb||[]),...(t.sync.tomb||[])]){if(!x||x.at<cut)continue;const k=x.s+":"+x.id;if(!tomb.has(k)||tomb.get(k).at<x.at)tomb.set(k,x)}
  const dead=(s,r)=>{const x=tomb.get(s+":"+r.id);return!!x&&x.at>=(r.updatedAt||r.createdAt||0)};
  const L=gsLocal(t),P={put:{items:[],memories:[],files:[]},del:{items:[],memories:[],files:[]},fetch:[],trip:null},out={};
  for(const s of["items","memories","files"]){
    const loc=new Map(L[s].map(r=>[r.id,r])),res=new Map(loc);
    for(const r of R?.[s]||[]){const l=loc.get(r.id);if(l&&(r.updatedAt||0)<=(l.updatedAt||0))continue;
      if(s==="files"){if(l){const m={...r,driveId:r.driveId||l.driveId};P.put.files.push(m);res.set(r.id,m)}else{P.fetch.push(r);res.set(r.id,r)}}
      else{P.put[s].push({...r,tripId:t.id});res.set(r.id,r)}}
    for(const[id,r]of[...res])if(dead(s,r)){res.delete(id);if(loc.has(id))P.del[s].push(id);P.put[s]=P.put[s].filter(x=>x.id!==id);if(s==="files")P.fetch=P.fetch.filter(x=>x.id!==id)}
    out[s]=gsById([...res.values()].map(r=>({...r,tripId:t.id})))}
  out.trip=L.trip;if(R?.trip&&(R.trip.updatedAt||0)>(L.trip.updatedAt||0)){P.trip=R.trip;out.trip={...R.trip,id:t.id}}
  out.tomb=[...tomb.values()].sort((a,b)=>a.at-b.at||(a.id<b.id?-1:1)).slice(-3000);
  out.members=t.sync.role==="owner"?(t.sync.members||[]).map(m=>({email:m.email})):(R?.members||[]);out.owner=t.sync.role==="owner"?t.sync.owner:(R?.owner||t.sync.owner||"");
  return{P,out}}
async function gsApply(t,P){
  for(const s of["items","memories"]){for(const r of P.put[s]){await DB.put(s,r);const a=S[s],i=a.findIndex(x=>x.id===r.id);i>=0?a[i]=r:a.push(r)}
    for(const id of P.del[s]){await DB.del(s,id);S[s]=S[s].filter(x=>x.id!==id)}}
  for(const r of P.put.files){const l=S.files.find(x=>x.id===r.id);if(!l)continue;Object.assign(l,r,{blob:l.blob,tripId:t.id});await DB.put("files",l)}
  for(const id of P.del.files){await DB.del("files",id);S.files=S.files.filter(x=>x.id!==id);const u=PHOTO_URLS.get(id);if(u){URL.revokeObjectURL(u);PHOTO_URLS.delete(id)}}
  if(P.trip){const{id,sync}=t;for(const k of Object.keys(t))delete t[k];Object.assign(t,P.trip,{id,sync})}
  if(Object.values(P.put).some(a=>a.length)||Object.values(P.del).some(a=>a.length)||P.trip)SEARCH.stale=true}
async function gsUploadFiles(t){const mine=S.files.filter(f=>f.tripId===t.id&&!f.driveId&&f.blob);if(!mine.length)return;
  if(!GS.folder)GS.folder=await GDrive.folder();
  for(const f of mine){const r=await GDrive.create(`tv-${f.id}.bin`,await gsSealBlob(f.blob,t.sync.code),{tv:"file"},[GS.folder]);
    try{await GDrive.publicLink(r.id)}catch(e){if(e.status===403){gsSt(t,"note","Your Google account doesn't allow link sharing, so your attachments can't be shared from here")}else throw e}
    f.driveId=r.id;f.updatedAt=Date.now();await DB.put("files",f)}}
async function gsFetchFiles(t,list){let n=0;
  for(const r of list){if(!r.driveId||S.files.some(f=>f.id===r.id))continue;
    try{const same=S.files.find(f=>f.hash&&f.hash===r.hash&&f.blob);const blob=same?same.blob:await gsOpenBlob(await GDrive.readPublic(r.driveId),t.sync.code,r.type);
      const rec={...r,tripId:t.id,blob};await DB.put("files",rec);S.files.push(rec);n++}catch(e){console.warn("Trip Vault: shared file not fetched yet",e.message)}}
  if(n)SEARCH.stale=true}

/* ---------- one sync pass for a shared trip ---------- */
function gsSt(t,state,msg){const o=GS.st[t.id]||{};GS.st[t.id]=state==="note"?{...o,note:msg}:{...o,state,msg:msg||"",at:Date.now()}}
async function syncTrip(t,o={}){
  if(!t?.sync?.fileId||GS.busy.has(t.id))return false;GS.busy.add(t.id);gsSt(t,"syncing");gsPaint();let ok=false;
  try{await GAuth.token(o.interactive);if(o.interactive)await gsMe();
    await gsUploadFiles(t);
    for(let a=0;;a++){
      let m0;try{m0=await GDrive.meta(t.sync.fileId)}catch(e){if(e.status===404||e.status===403)throw gsErr(t.sync.role==="owner"?"The trip file is missing from your Drive":"You no longer have access to this shared trip",{code:"gone"});throw e}
      if(m0.trashed)throw gsErr("The trip file was moved to the bin in Google Drive",{code:"gone"});
      const R=await gsOpen(await GDrive.read(t.sync.fileId),t.sync.code),{P,out}=gsPlan(t,R);
      if(gsCanon(R)!==gsCanon(out)){const m1=await GDrive.meta(t.sync.fileId);if(m1.version!==m0.version&&a<2)continue; // someone saved in between: merge again
        await GDrive.write(t.sync.fileId,await gsSeal({app:"TripVault",kind:"shared-trip",v:1,...out,savedAt:Date.now()},t.sync.code))}
      await gsApply(t,P);if(t.sync.role!=="owner")t.sync.members=out.members;
      t.sync.tomb=[];t.sync.lastSync=Date.now();await DB.put("trips",t);
      await gsFetchFiles(t,P.fetch);gsSt(t,"ok");ok=true;break}
  }catch(e){gsSt(t,e.code==="auth"?"paused":e.code==="gone"?"gone":"error",e.message);if(o.interactive&&e.code!=="auth")toast(esc(e.message),"bad")}
  finally{GS.busy.delete(t.id);gsPaint(true)}
  return ok}
const gsLinked=()=>S.trips.filter(t=>t.sync?.fileId);
function gsSyncAll(o={}){if(!gsReady()||Vault.locked||!S.settings)return;for(const t of gsLinked())syncTrip(t,o)}
let _gsDeb=null;
function gsChanged(){if(!GS.tok||!gsLinked().length)return;clearTimeout(_gsDeb);_gsDeb=setTimeout(()=>gsSyncAll(),8000)}
function gsBoot(){for(const t of gsLinked())if(!GS.st[t.id])gsSt(t,GS.tok?"ok":"paused");if(GS.tok)gsSyncAll()}
setInterval(()=>{if(GS.tok&&document.visibilityState==="visible")gsSyncAll()},180000);
document.addEventListener("visibilitychange",()=>{if(GS.tok&&document.visibilityState==="visible")gsSyncAll()});
addEventListener("online",()=>{if(GS.tok)gsSyncAll()});
/* Redraw after a sync without disturbing someone who is typing or has a sheet open. */
function gsPaint(full){const st=$("#gsStat");if(st){const t=S.trips.find(x=>x.id===st.dataset.trip);if(t?.sync)st.innerHTML=gsStat(t)}
  if(full&&!$(".ov")&&!document.activeElement?.matches?.("input,textarea,select")&&!Vault.locked&&S.settings)render();
  else $$(".syncchip").forEach(c=>{const t=S.trips.find(x=>x.id===c.dataset.trip);if(t)c.outerHTML=gsChip(t)})}

/* ---------- owner actions ---------- */
const gsEmailOk=e=>/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e);
const gsEmails=s=>[...new Set(String(s||"").split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];
const gsInviteMsg=t=>`${GS.name||"A Trip Vault user"} shared a trip with you in Trip Vault. Open the invite link they send you separately to join (it carries the key, which Google never sees).`;
async function gsStartShare(t,emails){
  await GAuth.token(true);const me=await gsMe();
  t.sync={fileId:"",code:gsNewCode(),role:"owner",owner:me,members:[],tomb:[],lastSync:0};
  try{const{out}=gsPlan(t,null);
    const r=await GDrive.create(`${GS_NAME} · ${[...crypto.getRandomValues(new Uint8Array(2))].map(x=>x.toString(16).padStart(2,"0")).join("")}`,await gsSeal({app:"TripVault",kind:"shared-trip",v:1,...out},t.sync.code),{tv:"trip"});
    t.sync.fileId=r.id;await DB.put("trips",t)}
  catch(e){delete t.sync;throw e}
  for(const e of emails)await gsAddMember(t,e,true);
  await syncTrip(t,{interactive:true})}
async function gsAddMember(t,email,quiet){email=email.toLowerCase();if(!gsEmailOk(email))throw gsErr(`“${esc(email)}” isn't an email address`);
  if(email===GS.email||(t.sync.members||[]).some(m=>m.email===email))return;
  const p=await GDrive.share(t.sync.fileId,email,gsInviteMsg(t));(t.sync.members||=[]).push({email,perm:p.id,at:Date.now()});await DB.put("trips",t);
  if(!quiet)await syncTrip(t,{interactive:true})}
async function gsRemoveMember(t,email){const m=(t.sync.members||[]).find(x=>x.email===email);if(!m)return;
  let id=m.perm;if(!id){const l=await GDrive.perms(t.sync.fileId);id=(l.permissions||[]).find(p=>(p.emailAddress||"").toLowerCase()===email)?.id}
  if(id){try{await GDrive.unshare(t.sync.fileId,id)}catch(e){if(e.status!==404)throw e}}
  t.sync.members=t.sync.members.filter(x=>x.email!==email);await DB.put("trips",t);await syncTrip(t,{interactive:true})}
async function gsStopShare(t){for(const m of[...(t.sync.members||[])]){let id=m.perm;try{if(!id){const l=await GDrive.perms(t.sync.fileId);id=(l.permissions||[]).find(p=>(p.emailAddress||"").toLowerCase()===m.email)?.id}if(id)await GDrive.unshare(t.sync.fileId,id)}catch(e){}}
  gsUnlink(t)}
async function gsUnlink(t){delete t.sync;delete GS.st[t.id];await DB.put("trips",t)}

/* ---------- joining ---------- */
function gsParseInvite(s){s=String(s||"").trim();const m=s.match(/join=([A-Za-z0-9_-]{10,})\.([A-Za-z0-9-]{16,})/)||s.match(/^([A-Za-z0-9_-]{20,})[\s.:]+([A-Za-z0-9-]{16,})$/);
  return m&&qrNorm(m[2]).length===20?{fileId:m[1],code:qrNorm(m[2]).replace(/(.{4})(?=.)/g,"$1-")}:null}
async function gsJoin(inv){
  await GAuth.token(true);await gsMe();let bytes;
  try{bytes=await GDrive.read(inv.fileId)}catch(e){if(e.status!==404&&e.status!==403)throw e;
    toast("Choose the shared trip file in the Google window","info");const id=await GPicker.pick();if(!id)throw gsErr("No trip file chosen");inv.fileId=id;bytes=await GDrive.read(id)}
  const R=await gsOpen(bytes,inv.code);if(R.kind!=="shared-trip"||!R.trip?.id)throw gsErr("That isn't a Trip Vault shared trip");
  let t=S.trips.find(x=>x.id===R.trip.id);
  if(!t){t={...R.trip};S.trips.push(t)}
  t.sync={fileId:inv.fileId,code:inv.code,role:t.sync?.role==="owner"&&t.sync.fileId===inv.fileId?"owner":"member",owner:R.owner||"",members:R.members||[],tomb:t.sync?.tomb||[],lastSync:0};
  await DB.put("trips",t);S.cur=t.id;S.meta.cur=t.id;S.day=null;S.calM=null;saveMeta();
  await syncTrip(t,{interactive:true});return t}

/* ---------- UI ---------- */
const gsAgo=ms=>{const m=Math.round((Date.now()-ms)/6e4);return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:fmtDs(new Date(ms).toISOString().slice(0,10))};
function gsChip(t){if(!t?.sync?.fileId)return"";const s=GS.st[t.id]||{state:GS.tok?"ok":"paused"},n=(t.sync.members||[]).filter(m=>m.email!==GS.email).length+(t.sync.role==="owner"?0:1); // the other people, not you
  const [cls,txt]=s.state==="syncing"?["",`${ic("clock","sm")} Syncing…`]:s.state==="paused"?["warn",`${ic("unlock","sm")} Sync paused · tap to reconnect`]:s.state==="gone"?["bad",`${ic("alert","sm")} No longer shared`]:s.state==="error"?["bad",`${ic("alert","sm")} Sync problem · tap`]
    :["ok",`${ic("share","sm")} Shared${n?` with ${n}`:""}${t.sync.lastSync?` · synced ${gsAgo(t.sync.lastSync)}`:""}`];
  return`<button class="syncchip ${cls}" data-a="gsChip" data-trip="${esc(t.id)}" title="${esc(s.msg||"Shared through Google Drive")}">${txt}</button>`}
const gsLink=t=>`${location.origin}${location.pathname}#join=${t.sync.fileId}.${t.sync.code}`;
function gsStat(t){const s=t.sync,st=GS.st[t.id]||{};
  const line=st.state==="syncing"?`<div class="note info">${ic("clock")}<div>Syncing…</div></div>`
    :st.state==="paused"||!GS.tok?`<div class="note warn">${ic("unlock")}<div><b>Sync is paused.</b> Connect Google to sync this trip. <button class="btn xs" id="gsRe">${ic("unlock","sm")} Connect</button></div></div>`
    :st.state==="gone"?`<div class="note bad">${ic("alert")}<div><b>${esc(st.msg)}</b><div class="small muted">Your copy stays on this phone.</div></div></div>`
    :st.state==="error"?`<div class="note bad">${ic("alert")}<div><b>Last sync didn't finish.</b><div class="small muted">${esc(st.msg)}</div></div></div>`
    :`<div class="note ok">${ic("check")}<div>Synced ${s.lastSync?gsAgo(s.lastSync):"—"}${GS.email?` · as ${esc(GS.email)}`:""}</div></div>`;
  return line+(st.note?`<div class="note warn mt">${ic("info")}<div class="small">${esc(st.note)}</div></div>`:"")}
function gsSheetBody(t){
  if(!gsReady())return`<div class="note warn">${ic("info")}<div><b>Google sharing isn't set up in this copy of Trip Vault.</b><div class="small muted">Whoever hosts it adds a Google client ID, API key and project number to <span class="mono">js/sync-config.js</span>. See “Set up Google sharing” in the README.</div></div></div>`;
  const s=t.sync,st=GS.st[t.id]||{};
  const privacy=`<div class="small dim mt">${ic("lock","sm")} Encrypted on this phone with the trip code before anything goes to Google. Google stores only scrambled data; the code travels in the invite link, never to Google. Sync runs while Trip Vault is open.</div>`;
  if(!s?.fileId)return`<p class="muted">Share <b>${esc(t.name)}</b> with a partner or a group. Everyone can add bookings, expenses, packing, ideas, memories, attachments and photos, and changes sync both ways through Google Drive.</p>
    <label class="mt" for="gsEm">Their Gmail addresses</label><input id="gsEm" type="email" multiple placeholder="partner@gmail.com, friend@gmail.com" autocomplete="off">
    <div class="small dim" style="margin-top:4px">They get an email from Google Drive. You'll also get an invite link to send them; it holds the key.</div>${privacy}
    <div class="row mt"><span class="sp"></span><button class="btn pri" id="gsGo">${ic("share","sm")} Connect Google & share</button></div>`;
  const owner=s.role==="owner",mem=s.members||[];
  return`<div id="gsStat" data-trip="${esc(t.id)}">${gsStat(t)}</div>
   <div class="h mt">${ic("user")}<h2>${owner?"People you shared with":"Shared with"}</h2></div>
   ${owner?"":`<div class="li"><div class="b"><div class="t">${esc(s.owner||"Trip owner")}</div><div class="d">Owner</div></div></div>`}
   ${mem.length?mem.map(m=>`<div class="li"><div class="b"><div class="t">${esc(m.email)}${m.email===GS.email?" (you)":""}</div></div>${owner?`<button class="btn xs ghost" data-gsrm="${esc(m.email)}">${ic("x","sm")} Remove</button>`:""}</div>`).join(""):`<div class="small muted">No one yet.</div>`}
   ${owner?`<div class="row mt"><input id="gsEm" type="email" placeholder="Add a Gmail address" autocomplete="off"><button class="btn" id="gsAdd">${ic("plus","sm")} Add</button></div>`:""}
   <div class="h mt">${ic("key")}<h2>Invite link</h2></div>
   <div class="small muted">Send this to the people above (WhatsApp, SMS). It opens Trip Vault and holds the key to the trip, so share it only with them.</div>
   <div class="gsinv"><canvas id="gsQr" aria-label="Invite QR code"></canvas><div class="sp" style="min-width:0"><div class="mono small gslink" data-copy="${esc(gsLink(t))}">${esc(gsLink(t))}</div>
    <div class="small dim mt">Trip code: <b class="mono" data-copy="${esc(s.code)}">${esc(s.code)}</b></div>
    <div class="row wrap mt" style="gap:6px"><button class="btn xs" data-copy="${esc(gsLink(t))}">${ic("copy","sm")} Copy link</button>${navigator.share?`<button class="btn xs" id="gsShr">${ic("share","sm")} Send…</button>`:""}</div></div></div>
   ${privacy}`}
function openShare(t=curTrip()){if(!t){toast("Create a trip first","bad");return}
  const s=t.sync,owner=s?.role==="owner";
  const ov=sheet({title:`${ic("share")} ${s?.fileId?"Shared trip":"Share this trip"}`,body:gsSheetBody(t),
    foot:s?.fileId?`${owner?`<button class="btn bad" id="gsStop">Stop sharing</button>`:`<button class="btn bad" id="gsLeave">Leave</button>`}<span class="sp"></span><button class="btn" data-close>Close</button><button class="btn pri" id="gsNow">${ic("zap","sm")} Sync now</button>`:`<button class="btn" data-close>Close</button>`});
  const sb=$(".sb",ov);sb.id="gsSheet";sb.dataset.trip=t.id;
  const busy=async(btn,fn)=>{if(btn){btn.disabled=true;btn.dataset.l=btn.innerHTML;btn.innerHTML=`${ic("clock","sm")} Working…`}
    try{await fn()}catch(e){toast(esc(e.message||String(e)),"bad")}finally{if(btn&&btn.isConnected){btn.disabled=false;btn.innerHTML=btn.dataset.l}}};
  const qr=async()=>{const cv=$("#gsQr",ov);if(!cv||!t.sync?.fileId)return;try{await qrLib("qrcode","vendor/qr/qrcode.js");qrDraw(cv,gsLink(t))}catch(e){cv.remove()}};qr();
  sb.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="gsGo"){const em=gsEmails($("#gsEm",ov).value),bad=em.find(x=>!gsEmailOk(x));if(bad){toast(`“${esc(bad)}” isn't an email address`,"bad");return}
      await busy(b,async()=>{await gsStartShare(t,em);ov.remove();openShare(t);toast(em.length?`Shared with ${em.length}. Now send them the invite link`:"Trip file created. Add people and send them the invite link")})}
    else if(b.id==="gsAdd"){const em=gsEmails($("#gsEm",ov).value);if(!em.length)return;await busy(b,async()=>{for(const x of em)await gsAddMember(t,x);$(".sb",ov).innerHTML=gsSheetBody(t);qr();toast("Added. Send them the invite link")})}
    else if(b.dataset.gsrm){const em=b.dataset.gsrm;if(!(await gate({title:`Remove ${esc(em)}?`,plan:["They lose access to the trip file in Google Drive and stop getting updates","What they already have on their phone stays with them"],ok:"Remove",danger:false})))return;
      await busy(b,async()=>{await gsRemoveMember(t,em);$(".sb",ov).innerHTML=gsSheetBody(t);qr()})}
    else if(b.id==="gsRe")await busy(b,async()=>{await syncTrip(t,{interactive:true});qr()})
    else if(b.id==="gsShr")navigator.share({title:`Join “${t.name}” in Trip Vault`,text:`Join our trip “${t.name}” in Trip Vault`,url:gsLink(t)}).catch(()=>{})});
  $("#gsNow",ov)?.addEventListener("click",e=>busy(e.currentTarget,async()=>{if(await syncTrip(t,{interactive:true}))toast("Synced")}));
  $("#gsStop",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Stop sharing this trip?",plan:["Everyone you shared with loses access to the trip file and stops getting updates","Your trip stays on this phone; their copies stay on theirs"],ok:"Stop sharing"})))return;
    await busy(null,async()=>{await GAuth.token(true);await gsStopShare(t);ov.remove();render();toast("Stopped sharing")})});
  $("#gsLeave",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Leave this shared trip?",plan:["You stop getting updates and your changes stop going to the others","The trip stays on this phone as your own copy"],ok:"Leave",danger:false})))return;
    await gsUnlink(t);ov.remove();render();toast("You left the shared trip")})}
function openJoin(pre){if(!gsReady()){sheet({title:`${ic("share")} Join a shared trip`,body:gsSheetBody({})});return}
  const ov=sheet({title:`${ic("share")} Join a shared trip`,body:`<p class="muted">Paste the invite link someone sent you. You'll sign in with the Google account they shared the trip with.</p>
    <label for="gsInv">Invite link</label><textarea id="gsInv" class="mono" style="min-height:70px" placeholder="https://…#join=…">${esc(pre||"")}</textarea>
    <div class="small dim mt">${ic("lock","sm")} The trip is decrypted on this phone with the code in the link. Google only stores scrambled data.</div>`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="gsJoin">${ic("unlock","sm")} Connect Google & join</button>`});
  $("#gsJoin",ov).onclick=async e=>{const b=e.currentTarget,inv=gsParseInvite($("#gsInv",ov).value);if(!inv){toast("That doesn't look like a Trip Vault invite link","bad");return}
    b.disabled=true;b.innerHTML=`${ic("clock","sm")} Joining…`;
    try{const t=await gsJoin(inv);ov.remove();go("today");toast(`Joined “${esc(t.name)}”`)}
    catch(err){toast(esc(err.message||String(err)),"bad");b.disabled=false;b.innerHTML=`${ic("unlock","sm")} Connect Google & join`}}}
function gsSettingsBlock(){if(!gsReady())return"";const n=gsLinked().length;
  return`<div class="sep"></div><div class="h">${ic("share")}<h2>Google sharing</h2></div>
   <div class="small muted">${n?`${n} shared trip${n>1?"s":""}. `:""}${GS.tok?`Connected as <b>${esc(GS.email||"your Google account")}</b> for this session.`:"Not connected right now. Trip Vault asks Google when you share, join or sync."} Sign-in is kept in memory only, never stored.</div>
   ${GS.tok?`<div class="row mt"><button class="btn" id="gsOut" type="button">${ic("lock","sm")} Disconnect Google</button></div>`:""}`}
function gsBackupBlock(){return`<div class="h">${ic("share")}<h2>Shared trips (Google Drive)</h2></div>
   <div class="small muted">Share a trip from its Trip settings, or join one someone shared with you.</div>
   <div class="row wrap mt"><button class="btn" id="gsJoinB">${ic("share","sm")} Join a shared trip</button></div><div class="sep"></div>`}
