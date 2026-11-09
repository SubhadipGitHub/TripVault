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
   The Google token is kept in memory and in this tab's sessionStorage (so a refresh keeps syncing);
   it is gone when the tab or app closes, and Google expires it within an hour. */
const GS={tok:null,exp:0,email:"",name:"",folder:null,keys:new Map(),busy:new Set(),st:{},lastCh:{},told:false};
const GS_SCOPE="https://www.googleapis.com/auth/drive.file",GS_NAME="Trip Vault shared trip",GS_FOLDER="Trip Vault files";
const GD="https://www.googleapis.com/drive/v3",GDU="https://www.googleapis.com/upload/drive/v3";
const gsReady=()=>typeof GSYNC==="object"&&!!(GSYNC.clientId&&GSYNC.apiKey&&GSYNC.appId);
const gsErr=(msg,extra)=>Object.assign(new Error(msg),extra||{});
/* The token survives a reload of this tab only (sessionStorage). Private modes that block storage just fall back to memory. */
const GS_SS="tv-g";
function gsStash(){try{if(GS.tok)sessionStorage.setItem(GS_SS,JSON.stringify({tok:GS.tok,exp:GS.exp,email:GS.email,name:GS.name}))}catch(e){}}
function gsUnstash(){try{sessionStorage.removeItem(GS_SS)}catch(e){}}
function gsResume(){try{const v=JSON.parse(sessionStorage.getItem(GS_SS)||"null");
    if(!v||!consentNow()||typeof v.tok!=="string"||!/^[\w.\-~+/=]{10,4096}$/.test(v.tok)||!(+v.exp>Date.now()+60000)){gsUnstash();return false}
    GS.tok=v.tok;GS.exp=+v.exp;if(typeof v.email==="string"&&!GS.email){GS.email=v.email.slice(0,200).toLowerCase();GS.name=String(v.name||"").slice(0,200)}return true}
  catch(e){return false}}
const gsHint=()=>GS.email||String(S.meta?.gsLast||"");
function gsScript(src){return new Promise((res,rej)=>{if([...document.scripts].some(s=>s.src===src&&s.dataset.ok))return res();
  const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>{s.dataset.ok="1";res()};s.onerror=()=>{s.remove();rej(gsErr("Couldn't reach Google. Check your connection."))};document.head.append(s)})}

/* ---------- sign-in (Google Identity Services token client) ---------- */
const GAuth={
  async token(interactive,o={}){
    if(GS.tok&&Date.now()<GS.exp-60000)return GS.tok;
    if(!interactive)throw gsErr("Google sign-in needed",{code:"auth"});
    if(!gsReady())throw gsErr("Google sharing isn't set up in this copy of Trip Vault");
    // DPDP: nothing goes to Google before the person has agreed (js/privacy.js). Erasing Drive data doesn't need it.
    if(!o.noConsent&&!(await gsConsent()))throw gsErr("Google Drive isn't connected",{code:"consent"});
    return this._gis()},
  async _gis(){
    await gsScript("https://accounts.google.com/gsi/client");
    return new Promise((res,rej)=>{const c=google.accounts.oauth2.initTokenClient({client_id:GSYNC.clientId,scope:GS_SCOPE,login_hint:gsHint()||undefined,prompt:gsHint()?"":"select_account",
      callback:r=>{if(r.error){rej(gsErr(r.error_description||r.error,{code:"auth"}));return}GS.tok=r.access_token;GS.exp=Date.now()+(+r.expires_in||3600)*1000;gsStash();res(GS.tok)},
      error_callback:e=>rej(gsErr(e?.type==="popup_closed"?"Google sign-in was closed":"Google sign-in didn't finish (pop-ups blocked?)",{code:"auth"}))});
      c.requestAccessToken()})},
  revoke(){try{if(GS.tok&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(GS.tok,()=>{})}catch(e){}gsUnstash();if(S.meta?.gsLast){delete S.meta.gsLast;saveMeta()}GS.tok=null;GS.exp=0;GS.email="";GS.name="";GS.folder=null;for(const k in GS.st)if(GS.st[k].state==="ok")GS.st[k].state="paused"}
};

/* ---------- Drive REST (only the calls sharing needs) ---------- */
async function gfetch(url,o={}){
  const tok=await GAuth.token(o.interactive);const r=await fetch(url,{...o,headers:{...(o.headers||{}),Authorization:"Bearer "+tok}});
  if(r.status===401){GS.tok=null;gsUnstash();throw gsErr("Google sign-in expired",{code:"auth"})}
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
  async revisions(id){return(await gfetch(`${GD}/files/${id}/revisions?pageSize=200&fields=revisions(id,modifiedTime,lastModifyingUser(displayName,emailAddress))`)).json()},
  async readRev(id,rev){return new Uint8Array(await(await gfetch(`${GD}/files/${id}/revisions/${rev}?alt=media`)).arrayBuffer())},
  async perms(id){return(await gfetch(`${GD}/files/${id}/permissions?fields=permissions(id,emailAddress,type)`)).json()},
  async unshare(id,permId){await gfetch(`${GD}/files/${id}/permissions/${permId}`,{method:"DELETE"})},
  async publicLink(id){await gfetch(`${GD}/files/${id}/permissions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"anyone",role:"reader"})})},
  async list(kind){const q=encodeURIComponent(`appProperties has { key='tv' and value='${kind}' } and 'me' in owners and trashed=false`);
    return((await(await gfetch(`${GD}/files?q=${q}&fields=files(id)&pageSize=1000&spaces=drive`)).json()).files||[]).map(f=>f.id)},
  async del(id){await gfetch(`${GD}/files/${id}`,{method:"DELETE"})},
  async findFolder(){const q=encodeURIComponent(`name='${GS_FOLDER}' and mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false`);
    return(await(await gfetch(`${GD}/files?q=${q}&fields=files(id)&spaces=drive`)).json()).files?.[0]?.id||null},
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
async function gsMe(){if(!GS.email){const a=await GDrive.about();GS.email=(a.user?.emailAddress||"").toLowerCase();GS.name=a.user?.displayName||"";GS.told=false;if(GS.email){syncToast(`Connected as ${esc(GS.email)}`,"info");gsStash();if(S.meta.gsLast!==GS.email){S.meta.gsLast=GS.email;saveMeta()}}consentEmail(GS.email);gsPillPaint()}return GS.email}
const gsOn=()=>!!GS.tok&&Date.now()<GS.exp-60000;

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
/* After a removal the trip gets a new code; earlier codes stay in the trip file's keyring (encrypted
   under the current code) so older versions and attachments still open. Try the current code first. */
const gsCodes=t=>[...new Set([t.sync.code,...(t.sync.keyring||[])].filter(Boolean))];
async function gsOpenAny(bytes,codes){let err;for(let i=0;i<codes.length;i++){try{return{R:await gsOpen(bytes,codes[i]),stale:i>0}}catch(e){if(e.code!=="key")throw e;err=e}}
  throw err||gsErr("No trip code",{code:"key"})}
async function gsSealBlob(blob,code){const ct=new Uint8Array(await Crypt.enc(await gsKey(code),await blob.arrayBuffer())),o=new Uint8Array(4+ct.length);o.set(GS_FILE);o.set(ct,4);return o}
async function gsOpenBlob(bytes,codes,type){if(!GS_FILE.every((v,i)=>bytes[i]===v))throw gsErr("Shared file is damaged");
  for(const c of[].concat(codes)){try{return new Blob([await Crypt.dec(await gsKey(c),bytes.slice(4).buffer)],{type:type||"application/octet-stream"})}catch(e){}}
  throw gsErr("Shared file doesn't open with this trip's keys")}


/* ---------- incoming data is untrusted: clean it before it is stored or shown ----------
   Records from partners (sync, join, restore) and from backup files can hold anything. Keep ids to
   plain tokens (they end up in HTML attributes), coerce text to strings and numbers to numbers, and
   only accept known kinds, moods, ISO dates, real time zones, 3-letter currency codes and simple MIME
   types, so bad data can neither inject markup nor crash the trip for everyone. */
const CLEAN_ID=/^[A-Za-z0-9_.-]{1,80}$/,CLEAN_DATE=/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/,_tzOk={};
const cStr=(v,max=100000)=>v==null?"":typeof v==="string"?v.slice(0,max):typeof v==="number"&&Number.isFinite(v)?String(v):typeof v==="boolean"?String(v):"";
const cNum=v=>{const n=+v;return Number.isFinite(n)?n:0};
const cDate=v=>{if(typeof v!=="string"||!CLEAN_DATE.test(v))return"";const[y,m,d]=v.slice(0,10).split("-").map(Number),h=+v.slice(11,13)||0,mi=+v.slice(14,16)||0,x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCMonth()===m-1&&x.getUTCDate()===d&&h<24&&mi<60?v:""};
const cTz=(z,f)=>{if(typeof z!=="string"||!z)return f;if(!(z in _tzOk)){try{new Intl.DateTimeFormat("en-US",{timeZone:z});_tzOk[z]=true}catch(e){_tzOk[z]=false}}return _tzOk[z]?z:f};
const cCur=v=>typeof v==="string"&&/^[A-Z]{3}$/.test(v)?v:HC();
const cIds=a=>(Array.isArray(a)?a:[]).filter(x=>typeof x==="string"&&CLEAN_ID.test(x));
const cList=(a,f,max=500)=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==="object").slice(0,max).map(f);
const KEEP_OBJ=new Set(["upi","payments","names","itemIds","photoIds","splitWith","pack","ideas","people","rates","catBudgets","crew","sex"]);
function cleanRecord(s,r,tz){
  if(!r||typeof r!=="object"||typeof r.id!=="string"||!CLEAN_ID.test(r.id))return null;
  const o={};for(const[k,v]of Object.entries(r)){if(k==="sync"||k==="blob")continue;if(KEEP_OBJ.has(k)){o[k]=v;continue}
    if(typeof v==="number"||typeof v==="boolean")o[k]=v;else if(typeof v==="string")o[k]=k==="data"?v:v.slice(0,100000)} // nested objects other than the known ones are dropped
  for(const k of["dep","arr","start","end","checkIn","checkOut","date","expiry","due"])if(k in o)o[k]=cDate(o[k]);
  for(const k of["tz","depTz","arrTz"])if(k in o)o[k]=cTz(o[k],tz||"Asia/Kolkata");
  for(const k of["cost","amount","size","createdAt","updatedAt","budget","w","h"])if(k in o)o[k]=cNum(o[k]);
  // a timestamp from the future would win every merge and could never be deleted: cap it at now
  for(const k of["createdAt","updatedAt"])if(k in o)o[k]=Math.min(o[k],Date.now());
  if("cur"in o)o.cur=cCur(o.cur);if("tripId"in o&&!CLEAN_ID.test(o.tripId))return null;
  for(const k of["by","ed"])if(k in o){o[k]=cStr(o[k],200).toLowerCase();if(!o[k])delete o[k]}
  if(s==="items"){if(!KINDS[o.kind])return null;o.names=(Array.isArray(r.names)?r.names:[]).map(x=>cStr(x,200)).filter(Boolean).slice(0,20);
    o.payments=cList(r.payments,p=>({id:CLEAN_ID.test(p.id||"")?p.id:uid(),status:p.status==="paid"?"paid":"pending",amount:cNum(p.amount),due:cDate(p.due),method:cStr(p.method,200)}),50);
    if("splitWith"in r)o.splitWith=(Array.isArray(r.splitWith)?r.splitWith:[]).map(x=>cStr(x,200));
    if(r.sex&&typeof r.sex==="object")o.sex=Object.fromEntries(Object.entries(r.sex).filter(([,v])=>v==="m"||v==="f").map(([k,v])=>[cStr(k,200),v]));else delete o.sex}
  if(s==="memories"){if(o.mood&&!MOODS[o.mood])o.mood="";o.photoIds=cIds(r.photoIds);o.fav=!!r.fav}
  if(s==="files"){if(!/^[\w.+-]+\/[\w.+-]+$/.test(o.type||""))o.type="application/octet-stream";o.itemIds=cIds(r.itemIds);if(o.memId&&!CLEAN_ID.test(o.memId))delete o.memId;if(o.driveId&&!/^[\w-]{10,200}$/.test(o.driveId))delete o.driveId}
  if(s==="trips"){o.tz=cTz(o.tz,S.settings?.homeTz||"Asia/Kolkata");
    if("upi"in r)o.upi=r.upi&&typeof r.upi==="object"&&!Array.isArray(r.upi)?Object.fromEntries(Object.entries(r.upi).filter(([k,v])=>typeof v==="string"&&/^[\w.-]{2,256}@[A-Za-z][A-Za-z0-9.]{2,64}$/.test(v)).slice(0,30).map(([k,v])=>[cStr(k,200),v])):{};if("localCur"in o)o.localCur=cCur(o.localCur);
    if("expCur"in o&&!(typeof o.expCur==="string"&&/^[A-Z]{3}$/.test(o.expCur)))delete o.expCur;if("lang"in o&&!isLang(o.lang))delete o.lang;if(!["domestic","international",""].includes(o.type||""))o.type="";
    const num=x=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).filter(([k,v])=>Number.isFinite(+v)).slice(0,100).map(([k,v])=>[cStr(k,60),+v])):{};
    o.rates=Object.fromEntries(Object.entries(num(r.rates)).filter(([k])=>/^[A-Z]{3}$/.test(k)));if("catBudgets"in r)o.catBudgets=num(r.catBudgets);
    if("pack"in r)o.pack=cList(r.pack,x=>({id:CLEAN_ID.test(x.id||"")?x.id:uid(),cat:cStr(x.cat,80),text:cStr(x.text,500),done:!!x.done}),1000);
    if("ideas"in r)o.ideas=cList(r.ideas,x=>({id:CLEAN_ID.test(x.id||"")?x.id:uid(),text:cStr(x.text,500),cat:cStr(x.cat,80),place:cStr(x.place,300),note:cStr(x.note,2000),...(x.scheduled?{scheduled:true}:{})}),1000);
    if("people"in r)o.people=(Array.isArray(r.people)?r.people:[]).map(x=>cStr(x,200)).filter(Boolean).slice(0,30);
    if("crew"in r)o.crew=(Array.isArray(r.crew)?r.crew:[]).filter(x=>x==="m"||x==="f").slice(0,6);if(o.party&&!["solo","couple","group"].includes(o.party))delete o.party}
  return o}
/* A trip bundle (shared-trip file or backup): trip(s), items, memories, files and deletions. */
function cleanBundle(d){const out={...d},tz=t=>t?.tz;
  if(d.trip)out.trip=cleanRecord("trips",d.trip);if(Array.isArray(d.trips))out.trips=d.trips.map(t=>cleanRecord("trips",t)).filter(Boolean);
  const ttz=(out.trip||out.trips?.[0])?.tz;
  for(const s of["items","memories","files"])out[s]=(Array.isArray(d[s])?d[s]:[]).map(r=>cleanRecord(s,r,ttz)).filter(Boolean);
  if("tomb"in d)out.tomb=cList(d.tomb,x=>({s:["items","memories","files"].includes(x.s)?x.s:"",id:cStr(x.id,80),at:cNum(x.at),...(x.by?{by:cStr(x.by,200).toLowerCase()}:{})}),5000).filter(x=>x.s&&CLEAN_ID.test(x.id));
  if("members"in d)out.members=cList(d.members,m=>({email:cStr(m.email,200).toLowerCase()}),100).filter(m=>m.email);
  if("owner"in d)out.owner=cStr(d.owner,200).toLowerCase();
  if("keyring"in d)out.keyring=(Array.isArray(d.keyring)?d.keyring:[]).filter(x=>typeof x==="string"&&/^[A-Z0-9]{4}(-[A-Z0-9]{4}){4}$/.test(x)).slice(0,20);
  return out}

/* ---------- merge ---------- */
const gsStable=v=>Array.isArray(v)?"["+v.map(gsStable).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+":"+gsStable(v[k])).join(",")+"}":JSON.stringify(v??null);
const gsById=a=>(a||[]).slice().sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0);
const gsCanon=m=>gsStable({trip:m.trip,items:gsById(m.items),memories:gsById(m.memories),files:gsById(m.files),tomb:m.tomb||[],members:m.members||[],owner:m.owner||"",keyring:m.keyring||[]});
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
  out.keyring=t.sync.role==="owner"?(t.sync.keyring||[]):(R?.keyring||t.sync.keyring||[]);
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
    try{const same=S.files.find(f=>f.hash&&f.hash===r.hash&&f.blob);const blob=same?same.blob:await gsOpenBlob(await GDrive.readPublic(r.driveId),gsCodes(t),r.type);
      const rec={...r,tripId:t.id,blob};await DB.put("files",rec);S.files.push(rec);n++}catch(e){console.warn("Trip Vault: shared file not fetched yet",e.message)}}
  if(n)SEARCH.stale=true}

/* ---------- one sync pass for a shared trip ---------- */
function gsSt(t,state,msg){const o=GS.st[t.id]||{};GS.st[t.id]=state==="note"?{...o,note:msg}:{...o,state,msg:msg||"",at:Date.now()}}
async function syncTrip(t,o={}){
  if(!t?.sync?.fileId||GS.busy.has(t.id))return false;GS.busy.add(t.id);gsSt(t,"syncing");gsPaint();let ok=false;
  try{await GAuth.token(o.interactive);if(o.interactive)await gsMe();if(GS.email&&t.sync.me!==GS.email)t.sync.me=GS.email;
    for(let a=0;;a++){
      let m0;try{m0=await GDrive.meta(t.sync.fileId)}catch(e){if(e.status===404||e.status===403)throw gsErr(t.sync.role==="owner"?"The trip file is missing from your Drive":"You no longer have access to this shared trip",{code:"gone"});throw e}
      if(m0.trashed)throw gsErr("The trip file was moved to the bin in Google Drive",{code:"gone"});
      const opened=await gsOpenAny(await GDrive.read(t.sync.fileId),gsCodes(t)).catch(e=>{if(e.code==="key")throw gsErr("The owner changed the trip key. Open the new invite link they send you.",{code:"rekey"});throw e});
      if(a===0)await gsUploadFiles(t); // only once we know our key still opens the trip
      const R=cleanBundle(opened.R),{P,out}=gsPlan(t,R);
      // stale: someone wrote with an older key (their sync overlapped a key change); rewrite under the current key
      if(opened.stale||gsCanon(R)!==gsCanon(out)){const m1=await GDrive.meta(t.sync.fileId);if(m1.version!==m0.version&&a<2)continue; // someone saved in between: merge again
        await GDrive.write(t.sync.fileId,await gsSeal({app:"TripVault",kind:"shared-trip",v:1,...out,savedAt:Date.now()},t.sync.code))}
      const ch=t.sync.lastSync?gsChanges(t,P,R):[];
      await gsApply(t,P);if(t.sync.role!=="owner"){t.sync.members=out.members;t.sync.keyring=out.keyring}
      if(ch.length)t.sync.recent=[...ch,...(t.sync.recent||[])].slice(0,30);GS.lastCh[t.id]=ch;
      t.sync.tomb=[];t.sync.lastSync=Date.now();await DB.put("trips",t);
      await gsFetchFiles(t,P.fetch);gsSt(t,"ok");ok=true;
      if(!o.quiet){const m=gsSumMsg(ch);if(m)syncToast(m);else if(o.manual)syncToast("Synced · up to date")}
      kcPushSoon()
      break}
  }catch(e){gsSt(t,e.code==="auth"||e.code==="consent"?"paused":e.code==="gone"?"gone":e.code==="rekey"?"rekey":"error",e.message);if(o.interactive&&e.code!=="auth"&&e.code!=="consent")syncToast(esc(e.message),"bad")
    else if(e.code==="auth"&&!o.interactive&&!GS.told){GS.told=true;syncToast("Google sync paused · tap your account button to reconnect","info")}}
  finally{GS.busy.delete(t.id);gsPaint(true)}
  return ok}
const gsLinked=()=>S.trips.filter(t=>t.sync?.fileId);
/* What others changed in this pass (your own changes coming back from another phone are left out). */
function gsChanges(t,P,R){const me=t.sync.me||GS.email,out=[],at=Date.now();
  const add=(who,verb,what,kind)=>{if(who&&who===me)return;out.push({at,trip:t.id,who:who||"",verb,what:String(what||"").slice(0,120),kind})};
  const title={items:r=>r.kind==="expense"?(r.title||r.cat||"an expense"):itemTitle(r),memories:r=>r.title||"a memory",files:r=>r.name||"a file"};
  for(const s of["items","memories"]){const loc=new Set(S[s].filter(x=>x.tripId===t.id).map(x=>x.id));
    for(const r of P.put[s])add(r.ed||r.by,loc.has(r.id)?"changed":"added",title[s](r),s==="items"?r.kind:"memory")}
  for(const r of P.fetch)add(r.by,"added",r.type?.startsWith("image/")?"a photo":title.files(r),"file");
  const tb=new Map((R?.tomb||[]).map(x=>[x.s+":"+x.id,x]));
  for(const s of["items","memories","files"])for(const id of P.del[s]){const l=S[s].find(x=>x.id===id);if(l)add(tb.get(s+":"+id)?.by,"removed",title[s](l),s==="items"?l.kind:s==="memories"?"memory":"file")}
  if(P.trip)add(P.trip.ed,"changed","trip details","trip");
  return out}
function gsSumMsg(ch){if(!ch?.length)return"";const who=[...new Set(ch.map(c=>c.who))],nm=who.map(w=>esc(gsName(w)));
  if(ch.length===1){const c=ch[0];return`Synced · ${nm[0]} ${c.verb} “${esc(c.what)}”`}
  return`Synced · ${ch.length} changes from ${who.length===1?nm[0]:who.length===2?`${nm[0]} and ${nm[1]}`:`${who.length} people`}`}
/* Sync every shared trip now and say once how it went. */
async function gsSyncNow(){await GAuth.token(true);await gsMe();const L=gsLinked();
  const ok=await Promise.all(L.map(t=>syncTrip(t,{interactive:true,quiet:true})));if(!L.length||ok.some(x=>!x))return;
  syncToast(gsSumMsg(L.flatMap(t=>GS.lastCh[t.id]||[]))||"Synced · up to date")}
function gsSyncAll(o={}){if(!gsReady()||Vault.locked||!S.settings)return;if(S.meta.gsAll&&gsOn())gsAllStart();if(S.meta.kc&&gsOn())kcPull();for(const t of gsLinked())syncTrip(t,o)}
/* "All trips" mode: any trip not yet in Drive starts syncing (one at a time). */
let _gsAllRun=null;
function gsAllStart(){if(_gsAllRun)return _gsAllRun;_gsAllRun=(async()=>{let n=0;
  for(const t of S.trips.filter(t=>!t.sync?.fileId)){if(!S.meta.gsAll||!gsOn())break;try{await gsStartShare(t,[]);n++}catch(e){console.warn("Trip Vault: couldn't start syncing",t.name,e.message)}}
  if(n)syncToast(n===1?"1 more trip now syncs to your Drive":`${n} more trips now sync to your Drive`)})().finally(()=>{_gsAllRun=null;gsPaint()});return _gsAllRun}
/* Connect from the account menu, profile or Sync tab: consent, sign-in, then offer this device the trips your other devices sync. */
async function gsConnect(){try{await GAuth.token(true);await gsMe();gsSyncAll();await gsKcOffer()}catch(e){if(e.code!=="consent")toast(esc(e.message||String(e)),"bad")}finally{gsPaint()}}
let _gsDeb=null;
function gsChanged(){if(!GS.tok||(!gsLinked().length&&!S.meta.gsAll))return;clearTimeout(_gsDeb);_gsDeb=setTimeout(()=>gsSyncAll(),8000)}
function gsBoot(){if(GS.tok)gsStash();else gsResume();for(const t of gsLinked())if(!GS.st[t.id])gsSt(t,GS.tok?"ok":"paused");if(GS.tok)gsSyncAll()}
setInterval(()=>{if(GS.tok&&document.visibilityState==="visible")gsSyncAll()},180000);
document.addEventListener("visibilitychange",()=>{if(GS.tok&&document.visibilityState==="visible")gsSyncAll()});
addEventListener("online",()=>{if(GS.tok)gsSyncAll()});
/* Redraw after a sync without disturbing someone who is typing or has a sheet open. */
function gsPaint(full){gsPillPaint();const hub=$("#gsHubBody");if(hub)hub.innerHTML=gsHubBody();const st=$("#gsStat");if(st){const t=S.trips.find(x=>x.id===st.dataset.trip);if(t?.sync)st.innerHTML=gsStat(t)}
  if(full&&!$(".ov")&&!document.activeElement?.matches?.("input,textarea,select")&&!Vault.locked&&S.settings)render();
  else $$(".syncchip").forEach(c=>{const t=S.trips.find(x=>x.id===c.dataset.trip);if(t)c.outerHTML=gsChip(t)})}

/* ---------- owner actions ---------- */
const gsEmailOk=e=>/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e);
const gsEmails=s=>[...new Set(String(s||"").split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];
const gsInviteMsg=t=>`${GS.name||"A Trip Vault user"} shared a trip with you in Trip Vault. Open the invite link they send you separately to join (it carries the key, which Google never sees).`;
async function gsStartShare(t,emails){
  await GAuth.token(true);const me=await gsMe();
  t.sync={fileId:"",code:gsNewCode(),role:"owner",owner:me,me,members:[],tomb:[],lastSync:0};
  for(const s of["items","memories","files"])for(const r of S[s])if(r.tripId===t.id&&!r.by){r.by=me;await DB.put(s,r)}
  try{const{out}=gsPlan(t,null);
    const r=await GDrive.create(`${GS_NAME} · ${[...crypto.getRandomValues(new Uint8Array(2))].map(x=>x.toString(16).padStart(2,"0")).join("")}`,await gsSeal({app:"TripVault",kind:"shared-trip",v:1,...out},t.sync.code),{tv:"trip"});
    t.sync.fileId=r.id;await DB.put("trips",t)}
  catch(e){delete t.sync;throw e}
  if(S.meta.kcGone?.[t.id]){delete S.meta.kcGone[t.id];saveMeta()}
  for(const e of emails)await gsAddMember(t,e,true);
  await syncTrip(t,{interactive:true,quiet:true});kcPushSoon()}
async function gsAddMember(t,email,quiet){email=email.toLowerCase();if(!gsEmailOk(email))throw gsErr(`“${esc(email)}” isn't an email address`);
  if(email===GS.email||(t.sync.members||[]).some(m=>m.email===email))return;
  const p=await GDrive.share(t.sync.fileId,email,gsInviteMsg(t));(t.sync.members||=[]).push({email,perm:p.id,at:Date.now()});await DB.put("trips",t);
  if(!quiet)await syncTrip(t,{interactive:true,quiet:true})}
async function gsRemoveMember(t,email){const m=(t.sync.members||[]).find(x=>x.email===email);if(!m)return;
  let id=m.perm;if(!id){const l=await GDrive.perms(t.sync.fileId);id=(l.permissions||[]).find(p=>(p.emailAddress||"").toLowerCase()===email)?.id}
  if(id){try{await GDrive.unshare(t.sync.fileId,id)}catch(e){if(e.status!==404)throw e}}
  t.sync.members=t.sync.members.filter(x=>x.email!==email);await DB.put("trips",t);await gsRotate(t,email)}
/* New trip code after a removal: re-encrypt the trip file under it. The removed person keeps the old code
   but can't open anything written from now on; the others get the new invite link from the owner. */
async function gsRotate(t,removed){
  const{R}=await gsOpenAny(await GDrive.read(t.sync.fileId),gsCodes(t)),R1=cleanBundle(R),was={code:t.sync.code,keyring:t.sync.keyring,rekey:t.sync.rekey};
  t.sync.keyring=[...new Set([t.sync.code,...(t.sync.keyring||[]),...(R1.keyring||[])])].slice(0,20);t.sync.code=gsNewCode();t.sync.rekey={at:Date.now(),removed};
  try{const{P,out}=gsPlan(t,R1);await GDrive.write(t.sync.fileId,await gsSeal({app:"TripVault",kind:"shared-trip",v:1,...out,savedAt:Date.now()},t.sync.code));
    await gsApply(t,P);t.sync.tomb=[]}
  catch(e){Object.assign(t.sync,was);throw e}
  await DB.put("trips",t);await syncTrip(t,{interactive:true,quiet:true})}
async function gsStopShare(t){for(const m of[...(t.sync.members||[])]){let id=m.perm;try{if(!id){const l=await GDrive.perms(t.sync.fileId);id=(l.permissions||[]).find(p=>(p.emailAddress||"").toLowerCase()===m.email)?.id}if(id)await GDrive.unshare(t.sync.fileId,id)}catch(e){}}
  gsUnlink(t)}
async function gsUnlink(t){if(t.sync?.fileId){(S.meta.kcGone||={})[t.id]=Date.now();saveMeta();kcPushSoon()}delete t.sync;delete GS.st[t.id];await DB.put("trips",t)}

/* ---------- joining ---------- */
function gsParseInvite(s){s=String(s||"").trim();const m=s.match(/join=([A-Za-z0-9_-]{10,})\.([A-Za-z0-9-]{16,})/)||s.match(/^([A-Za-z0-9_-]{20,})[\s.:]+([A-Za-z0-9-]{16,})$/);
  return m&&qrNorm(m[2]).length===20?{fileId:m[1],code:qrNorm(m[2]).replace(/(.{4})(?=.)/g,"$1-")}:null}
async function gsJoin(inv,o={}){
  await GAuth.token(!o.bg);await gsMe();let bytes;
  try{bytes=await GDrive.read(inv.fileId)}catch(e){if(e.status!==404&&e.status!==403||o.bg&&!o.picker)throw e;
    toast("Choose the shared trip file in the Google window","info");const id=await GPicker.pick();if(!id)throw gsErr("No trip file chosen");inv.fileId=id;bytes=await GDrive.read(id)}
  const R0=await gsOpen(bytes,inv.code);if(R0.kind!=="shared-trip")throw gsErr("That isn't a Trip Vault shared trip");
  const R=cleanBundle(R0);if(!R.trip?.id)throw gsErr("That shared trip is damaged");
  let t=S.trips.find(x=>x.id===R.trip.id);const relink=!!(t?.sync?.fileId&&t.sync.fileId===inv.fileId);
  if(!t){t={...R.trip};S.trips.push(t)}
  t.sync={fileId:inv.fileId,code:inv.code,role:(t.sync?.role==="owner"&&t.sync.fileId===inv.fileId)||(R.owner&&R.owner===GS.email)?"owner":"member",owner:R.owner||"",members:R.members||[],tomb:t.sync?.tomb||[],keyring:R.keyring||[],lastSync:t.sync?.lastSync||0,me:GS.email,recent:t.sync?.recent||[]};
  await DB.put("trips",t);if(!o.bg){S.cur=t.id;S.meta.cur=t.id;S.day=null;S.calM=null}saveMeta();
  if(S.meta.kcGone?.[t.id]){delete S.meta.kcGone[t.id];saveMeta()}
  await syncTrip(t,{interactive:!o.bg,quiet:true});kcPushSoon();return{t,relink}}

/* ---------- undo a bad sync: bring back an earlier version of the trip file ----------
   Drive keeps earlier versions of the trip file (for binary files, about 30 days or 100 versions).
   Restoring makes every record of that version newer than anything since, and records a deletion for
   whatever was added after it, then syncs, so every phone ends up with that version. */
async function gsVersions(t){const l=await GDrive.revisions(t.sync.fileId);return(l.revisions||[]).slice().reverse()}
async function gsPeek(t,rev){return cleanBundle((await gsOpenAny(await GDrive.readRev(t.sync.fileId,rev),gsCodes(t))).R)}
async function gsRestore(t,R0){
  const now=Date.now(),keep={items:new Set(R0.items.map(x=>x.id)),memories:new Set(R0.memories.map(x=>x.id)),files:new Set(R0.files.map(x=>x.id))};
  for(const s of["items","memories","files"])for(const r of S[s].filter(x=>x.tripId===t.id&&!keep[s].has(x.id)))(t.sync.tomb||=[]).push({s,id:r.id,at:now});
  const bump=a=>a.map(x=>({...x,updatedAt:now+1}));
  const R={...R0,trip:R0.trip?{...R0.trip,updatedAt:now+1}:null,items:bump(R0.items),memories:bump(R0.memories),files:bump(R0.files),tomb:(R0.tomb||[]).filter(x=>!keep[x.s]?.has(x.id))};
  const{P}=gsPlan(t,R);await gsApply(t,P);await DB.put("trips",t);await gsFetchFiles(t,P.fetch);
  return syncTrip(t,{interactive:true,quiet:true})}
async function openVersions(t){
  const ov=sheet({title:`${ic("clock")} Earlier versions`,body:`<div class="small muted">Loading versions from Google Drive…</div>`,foot:`<button class="btn" data-close>Close</button>`}),sb=$(".sb",ov);
  let vs;try{await GAuth.token(true);vs=await gsVersions(t)}catch(e){sb.innerHTML=`<div class="note bad">${ic("alert")}<div>${esc(e.message)}</div></div>`;return}
  sb.innerHTML=`<p class="small muted">If something went wrong (things deleted or overwritten by mistake), bring the trip back to how it was. Everyone gets that version on their next sync. Google keeps versions for about 30 days.</p>`+
    (vs.length?vs.map((v,i)=>`<div class="li"><div class="b"><div class="t">${esc(new Date(v.modifiedTime).toLocaleString())}${i===0?" · current":""}</div><div class="d">${esc(v.lastModifyingUser?.displayName||v.lastModifyingUser?.emailAddress||"")}</div></div>${i?`<button class="btn xs" data-rev="${esc(v.id)}">${ic("clock","sm")} Restore…</button>`:""}</div>`).join(""):`<div class="small muted">No earlier versions yet.</div>`);
  sb.addEventListener("click",async e=>{const b=e.target.closest("[data-rev]");if(!b)return;b.disabled=true;
    try{const R0=await gsPeek(t,b.dataset.rev),now={i:tripItems(t.id).length,m:tripMems(t.id).length,f:S.files.filter(f=>f.tripId===t.id).length};
      if(!(await gate({title:"Restore this version?",plan:[`Bookings and expenses: ${R0.items.length} (now ${now.i})`,`Memories: ${R0.memories.length} (now ${now.m}) · files: ${R0.files.length} (now ${now.f})`,"Anything added or changed after it is removed or undone, for everyone in the trip"],irreversible:"Changes made after this version are lost, unless you restore a later version again.",ok:"Restore",danger:true}))){b.disabled=false;return}
      if(await gsRestore(t,R0)){ov.remove();render();toast("Trip restored to the earlier version")}else b.disabled=false}
    catch(err){toast(esc(err.message),"bad");b.disabled=false}})}

/* ---------- UI ---------- */
const gsAgo=ms=>{const m=Math.round((Date.now()-ms)/6e4);return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:fmtDs(new Date(ms).toISOString().slice(0,10))};
function gsChip(t){if(!t?.sync?.fileId)return"";const s=GS.st[t.id]||{state:GS.tok?"ok":"paused"},n=(t.sync.members||[]).filter(m=>m.email!==GS.email).length+(t.sync.role==="owner"?0:1); // the other people, not you
  const [cls,txt]=s.state==="syncing"?["",`${ic("clock","sm")} Syncing…`]:s.state==="paused"?["warn",`${ic("unlock","sm")} Sync paused · tap to reconnect`]:s.state==="gone"?["bad",`${ic("alert","sm")} No longer shared`]:s.state==="rekey"?["warn",`${ic("key","sm")} New trip key · ask the owner for the new link`]:s.state==="error"?["bad",`${ic("alert","sm")} Sync problem · tap`]
    :["ok",`${ic("share","sm")} Shared${n?` with ${n}`:""}${t.sync.lastSync?` · synced ${gsAgo(t.sync.lastSync)}`:""}`];
  return`<button class="syncchip ${cls}" data-a="gsChip" data-trip="${esc(t.id)}" title="${esc(s.msg||"Shared through Google Drive")}">${txt}</button>`}
const gsLink=t=>`${location.origin}${location.pathname}#join=${t.sync.fileId}.${t.sync.code}`;
function gsStat(t){const s=t.sync,st=GS.st[t.id]||{};
  const line=st.state==="syncing"?`<div class="note info">${ic("clock")}<div>Syncing…</div></div>`
    :st.state==="paused"||!GS.tok?`<div class="note warn">${ic("unlock")}<div><b>Sync is paused.</b> Connect Google to sync this trip. <button class="btn xs" id="gsRe">${ic("unlock","sm")} Connect</button></div></div>`
    :st.state==="rekey"?`<div class="note warn">${ic("key")}<div><b>The trip key changed.</b><div class="small muted">The owner removed someone and made a new key. Open the new invite link they send you; until then your changes stay on this phone and sync afterwards.</div></div></div>`
    :st.state==="gone"?`<div class="note bad">${ic("alert")}<div><b>${esc(st.msg)}</b><div class="small muted">Your copy stays on this phone.</div></div></div>`
    :st.state==="error"?`<div class="note bad">${ic("alert")}<div><b>Last sync didn't finish.</b><div class="small muted">${esc(st.msg)}</div></div></div>`
    :`<div class="note ok">${ic("check")}<div>Synced ${s.lastSync?gsAgo(s.lastSync):"—"}${GS.email?` · as ${esc(GS.email)}`:""}</div></div>`;
  return line+(st.note?`<div class="note warn mt">${ic("info")}<div class="small">${esc(st.note)}</div></div>`:"")}
function gsSheetBody(t){
  if(!gsReady())return`<div class="note warn">${ic("info")}<div><b>Google sharing isn't set up in this copy of Trip Vault.</b><div class="small muted">Whoever hosts it adds a Google client ID, API key and project number to <span class="mono">js/sync-config.js</span>. See “Set up Google sharing” in the README.</div></div></div>`;
  const s=t.sync,st=GS.st[t.id]||{};
  const privacy=`<div class="small dim mt">${ic("lock","sm")} Encrypted before upload</div>`;
  if(!s?.fileId)return`<label for="gsEm">Their Gmail addresses</label><input id="gsEm" type="email" multiple placeholder="partner@gmail.com, friend@gmail.com" autocomplete="off">
    <label class="row mt" style="cursor:pointer;align-items:flex-start"><input type="checkbox" id="gsOkP"> <span class="small" style="color:var(--tx)">These people know I'm sharing this trip's details with them (names, ID numbers, photos)</span></label>${privacy}
    <div class="row mt"><span class="sp"></span><button class="btn pri" id="gsGo">${ic("share","sm")} Connect Google & share</button></div>`;
  const owner=s.role==="owner",mem=s.members||[];
  return`<div id="gsStat" data-trip="${esc(t.id)}">${gsStat(t)}</div>
   <div class="h mt">${ic("user")}<h2>${owner?"People you shared with":"Shared with"}</h2></div>
   ${owner?"":`<div class="li">${gsAv(s.owner)}<div class="b"><div class="t">${esc(s.owner||"Trip owner")}</div><div class="d">Owner</div></div></div>`}
   ${mem.length?mem.map(m=>`<div class="li">${gsAv(m.email)}<div class="b"><div class="t">${esc(m.email)}${m.email===(s.me||GS.email)?" (you)":""}</div></div>${owner?`<button class="btn xs ghost" data-gsrm="${esc(m.email)}">${ic("x","sm")} Remove</button>`:""}</div>`).join(""):`<div class="small muted">No one yet.</div>`}
   ${owner?`<div class="row mt"><input id="gsEm" type="email" placeholder="Add a Gmail address" autocomplete="off"><button class="btn" id="gsAdd">${ic("plus","sm")} Add</button></div>
     <label class="row" style="cursor:pointer;margin-top:6px"><input type="checkbox" id="gsOkP"> <span class="small" style="color:var(--tx)">They know I'm sharing this trip's details with them</span></label>`:""}
   <div class="h mt">${ic("key")}<h2>Invite link</h2></div>
   ${owner&&s.rekey?`<div class="note warn">${ic("key")}<div><b>New trip key after removing ${esc(s.rekey.removed)}.</b> Send this new link to ${mem.length?esc(mem.map(m=>m.email).join(", ")):"anyone you add"}; the old link no longer opens the trip. <button class="btn xs" id="gsRekeyDone">${ic("check","sm")} Done, I've sent it</button></div></div>`:""}
   <div class="gsinv"><canvas id="gsQr" aria-label="Invite QR code"></canvas><div class="sp" style="min-width:0"><div class="mono small gslink" data-copy="${esc(gsLink(t))}">${esc(gsLink(t))}</div>
    <div class="small dim mt">Trip code: <b class="mono" data-copy="${esc(s.code)}">${esc(s.code)}</b></div>
    <div class="row wrap mt" style="gap:6px"><button class="btn xs" data-copy="${esc(gsLink(t))}">${ic("copy","sm")} Copy link</button>${navigator.share?`<button class="btn xs" id="gsShr">${ic("share","sm")} Send…</button>`:""}</div></div></div>
   ${privacy}`}
function openShare(t=curTrip()){if(!t){toast("Create a trip first","bad");return}
  const s=t.sync,owner=s?.role==="owner";
  const ov=sheet({title:`${ic("share")} ${s?.fileId?"Shared trip":"Share this trip"}`,help:"share",body:gsSheetBody(t),
    foot:s?.fileId?`${owner?`<button class="btn bad" id="gsStop">Stop sharing</button>`:`<button class="btn bad" id="gsLeave">Leave</button>`}<button class="btn" id="gsHist">${ic("clock","sm")} Versions</button><span class="sp"></span><button class="btn" data-close>Close</button><button class="btn pri" id="gsNow">${ic("zap","sm")} Sync now</button>`:`<button class="btn" data-close>Close</button>`});
  const sb=$(".sb",ov);sb.id="gsSheet";sb.dataset.trip=t.id;
  const busy=async(btn,fn)=>{if(btn){btn.disabled=true;btn.dataset.l=btn.innerHTML;btn.innerHTML=`${ic("clock","sm")} Working…`}
    try{await fn()}catch(e){if(e.code!=="consent")toast(esc(e.message||String(e)),"bad")}finally{if(btn&&btn.isConnected){btn.disabled=false;btn.innerHTML=btn.dataset.l}}};
  const okP=()=>{const c=$("#gsOkP",ov);if(c&&!c.checked){toast("Tick the box to confirm they know you're sharing the trip with them","bad");c.focus();return false}return true};
  const qr=async()=>{const cv=$("#gsQr",ov);if(!cv||!t.sync?.fileId)return;try{await qrLib("qrcode","vendor/qr/qrcode.js");qrDraw(cv,gsLink(t))}catch(e){cv.remove()}};qr();
  sb.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="gsGo"){const em=gsEmails($("#gsEm",ov).value),bad=em.find(x=>!gsEmailOk(x));if(bad){toast(`“${esc(bad)}” isn't an email address`,"bad");return}if(em.length&&!okP())return;
      await busy(b,async()=>{await gsStartShare(t,em);ov.remove();openShare(t);toast(em.length?`Shared with ${em.length}. Now send them the invite link`:"Trip file created. Add people and send them the invite link")})}
    else if(b.id==="gsAdd"){const em=gsEmails($("#gsEm",ov).value);if(!em.length||!okP())return;await busy(b,async()=>{for(const x of em)await gsAddMember(t,x);$(".sb",ov).innerHTML=gsSheetBody(t);qr();toast("Added. Send them the invite link")})}
    else if(b.dataset.gsrm){const em=b.dataset.gsrm;if(!(await gate({title:`Remove ${esc(em)}?`,plan:["They lose access to the trip file in Google Drive and stop getting updates","A new trip key is made: send the new invite link to everyone still in the trip. The removed person can't open anything added from now on","What they already have on their phone stays with them"],ok:"Remove",danger:false})))return;
      await busy(b,async()=>{await gsRemoveMember(t,em);$(".sb",ov).innerHTML=gsSheetBody(t);qr();toast(`${esc(em)} removed. Send the new invite link to the others`)})}
    else if(b.id==="gsRekeyDone"){delete t.sync.rekey;await DB.put("trips",t);$(".sb",ov).innerHTML=gsSheetBody(t);qr()}
    else if(b.id==="gsRe")await busy(b,async()=>{await syncTrip(t,{interactive:true,manual:true});qr()})
    else if(b.id==="gsShr")navigator.share({title:`Join “${t.name}” in Trip Vault`,text:`Join our trip “${t.name}” in Trip Vault`,url:gsLink(t)}).catch(()=>{})});
  $("#gsHist",ov)?.addEventListener("click",()=>{ov.remove();openVersions(t)});
  $("#gsNow",ov)?.addEventListener("click",e=>busy(e.currentTarget,async()=>{await syncTrip(t,{interactive:true,manual:true})}));
  $("#gsStop",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Stop sharing this trip?",plan:["Everyone you shared with loses access to the trip file and stops getting updates","Your trip stays on this phone; their copies stay on theirs"],ok:"Stop sharing"})))return;
    await busy(null,async()=>{await GAuth.token(true);await gsStopShare(t);ov.remove();render();gsPillPaint();toast("Stopped sharing")})});
  $("#gsLeave",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Leave this shared trip?",plan:["You stop getting updates and your changes stop going to the others","The trip stays on this phone as your own copy"],ok:"Leave",danger:false})))return;
    await gsUnlink(t);ov.remove();render();gsPillPaint();toast("You left the shared trip")})}
function openJoin(pre){if(!gsReady()){sheet({title:`${ic("share")} Join a shared trip`,body:gsSheetBody({})});return}
  const ov=sheet({title:`${ic("share")} Join a shared trip`,help:"join",body:`<label for="gsInv">Invite link</label><textarea id="gsInv" class="mono" style="min-height:70px" placeholder="https://…#join=…">${esc(pre||"")}</textarea>`,
    foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="gsJoin">${ic("unlock","sm")} Connect Google & join</button>`});
  $("#gsJoin",ov).onclick=async e=>{const b=e.currentTarget,inv=gsParseInvite($("#gsInv",ov).value);if(!inv){toast("That doesn't look like a Trip Vault invite link","bad");return}
    b.disabled=true;b.innerHTML=`${ic("clock","sm")} Joining…`;
    try{const{t,relink}=await gsJoin(inv);ov.remove();go("today");toast(relink?`Trip key updated for “${esc(t.name)}”`:`Joined “${esc(t.name)}”`)}
    catch(err){if(err.code!=="consent")toast(esc(err.message||String(err)),"bad");b.disabled=false;b.innerHTML=`${ic("unlock","sm")} Connect Google & join`}}}
/* ---------- who's who: a stable colour and initial per person ---------- */
const gsHue=e=>{let h=2166136261;for(const c of String(e||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;return(h>>>0)%360}; // FNV-1a + mix: similar emails get far-apart colours
const gsColor=e=>e?`hsl(${gsHue(e)} 58% 46%)`:"var(--tx3)";
function gsName(e){const l=String(e||"").split("@")[0].replace(/[._+-]+/g," ").replace(/\d+/g,"").trim().slice(0,40);return l?l.replace(/(^|\s)\S/g,c=>c.toUpperCase()):(e?String(e).slice(0,40):"Someone")}
const gsIni=e=>e?(gsName(e).match(/\S/)?.[0]||"?").toUpperCase():"";
const gsAv=(e,cls="")=>`<span class="gsav ${cls}" style="--bc:${gsColor(e)}" aria-hidden="true">${e?esc(gsIni(e)):ic("user","sm")}</span>`;
/* Someone else in a shared trip who added (k="by") or last changed (k="ed") a record: their email, else ""
   (you, unknown, and unshared trips get no mark). */
function gsOther(rec,k){const t=rec&&S.trips.find(x=>x.id===rec.tripId);if(!t?.sync?.fileId||!rec[k])return"";const me=t.sync.me||GS.email;return rec[k]===me?"":rec[k]}
const gsWho=rec=>gsOther(rec,"by");
/* Filled initial: they added it. Ring: they changed it last (shown when that's not the person who added it). */
function byMark(rec){const a=gsOther(rec,"by"),e=gsOther(rec,"ed"),m=(w,what,cls)=>{const n=esc(`${what} by ${gsName(w)}`);return`<span class="bym${cls}" style="--bc:${gsColor(w)}" title="${n}" aria-label="${n}">${esc(gsIni(w))}</span>`};
  return(a?m(a,"Added",""):"")+(e&&e!==a?m(e,"Changed"," ed"):"")}
const byRow=rec=>{const w=gsOther(rec,"ed")||gsOther(rec,"by");return w?` data-by style="--bc:${gsColor(w)}"`:""};

/* ---------- header account pill: are you connected, and did everything sync ---------- */
function gsOverall(){const L=gsLinked(),st=L.map(t=>GS.st[t.id]?.state);
  if(st.includes("syncing"))return["syncing","Syncing","Syncing your shared trips…"];
  if(L.length&&!gsOn())return["paused","Reconnect","Google is not connected: shared trips are paused. Tap to connect"];
  if(st.includes("error")||st.includes("gone"))return["bad","Problem","A shared trip didn't sync. Tap for details"];
  if(st.includes("rekey"))return["warn","New key","A trip key changed: open the new invite link"];
  if(!L.length)return["ok","Google","Connected to Google. No shared trips yet"];
  const last=Math.max(...L.map(t=>t.sync.lastSync||0));return["ok","Synced",`All shared trips synced${last?" "+gsAgo(last):""}`]}
function gsPillPaint(){const p=$("#gsPill");if(!p)return;const L=gsLinked(),nm=profName();
  if(Vault.locked||!S.settings){p.classList.add("hide");return}
  p.classList.remove("hide");
  if(!gsReady()||(!L.length&&!gsOn())){const lbl=`${nm||"Your profile"} · Offline profile: data on this device only${gsReady()?". Open the menu to connect Google Drive":""}`;
    p.dataset.s="off";p.title=lbl;p.setAttribute("aria-label",lbl);
    p.innerHTML=`<span class="gsavw">${gsAv(nm)}<span class="gsdot"></span></span><span class="gsw">Offline</span>`;return}
  const[s,word,tip]=gsOverall(),who=GS.email||L.find(t=>t.sync.me)?.sync.me||"",lbl=`${who?who+" · ":""}${tip}`;
  p.dataset.s=s;p.title=lbl;p.setAttribute("aria-label",lbl);
  p.innerHTML=`<span class="gsavw">${gsAv(gsOn()?who:nm)}<span class="gsdot"></span></span><span class="gsw">${word}</span>`}

/* ---------- Settings → Sync & devices: account, which trips sync, other devices, recent changes ---------- */
function gsTripRow(t,on,all){const sy=!!t.sync?.fileId,st=sy?GS.st[t.id]?.state||(on?"ok":"paused"):"",me=t.sync?.me||GS.email;
  const ppl=sy?[t.sync.owner,...(t.sync.members||[]).map(m=>m.email)].filter(e=>e&&e!==me):[];
  const dot=!sy?"none":st==="ok"?"ok":st==="syncing"?"syncing":st==="paused"||st==="rekey"?"warn":"bad",
    sub=!sy?"On this device only":st==="syncing"?"Syncing…":st==="paused"?"Paused":st==="rekey"?"New trip key: open the new link":st==="gone"?"No longer shared":st==="error"?"Sync problem":
      `${t.sync.role==="owner"?(ppl.length?`Shared with ${ppl.length}`:"In your Drive"):"Shared with you"}${t.sync.lastSync?` · synced ${gsAgo(t.sync.lastSync)}`:""}`;
  return`<div class="li gstrip"><input type="checkbox" class="gstick" data-gstrip="${esc(t.id)}" aria-label="Sync ${esc(t.name)}" ${sy?"checked":""} ${!on||(all&&sy)?"disabled":""}>
    <div class="b ${sy?"tap":""}" ${sy?`data-hubtrip="${esc(t.id)}"`:""}><div class="t">${esc(t.name)}${t.sync?.role==="owner"&&ppl.length?pill("owner","info"):""}</div><div class="d"><span class="gsst" data-s="${dot}"></span> ${esc(sub)}</div></div>
    <div class="gsppl">${ppl.slice(0,5).map(e=>gsAv(e,"sm")).join("")}${ppl.length>5?`<span class="small dim">+${ppl.length-5}</span>`:""}</div></div>`}
function gsHubBody(){
  if(!gsReady())return gsSheetBody({});
  const L=gsLinked(),[s,,tip]=gsOverall(),on=gsOn(),me=GS.email||L.find(t=>t.sync.me)?.sync.me||"",all=!!S.meta.gsAll;
  const acct=`<div class="gshub-acct" data-s="${on?s:"off"}">${gsAv(on?me:profName(),"lg")}<div class="b"><div class="t">${on?esc(me||"Google account"):"Not connected"}</div><div class="small muted">${on?esc(tip):me?`Last: ${esc(me)}`:"Offline profile"}</div></div>
    ${on?`<button class="btn xs ghost" id="gsHubOut">${ic("lock","sm")} Disconnect</button>`:`<button class="btn xs pri" id="gsHubIn">${ic("unlock","sm")} Connect</button>`}</div>`;
  const rec=L.flatMap(t=>(t.sync.recent||[]).map(c=>({...c,tn:t.name}))).sort((a,b)=>b.at-a.at).slice(0,10);
  return acct+`<div class="row wrap mt" style="gap:6px">${L.length&&on?`<button class="btn" id="gsHubSync">${ic("zap","sm")} Sync all now</button>`:""}<button class="btn" id="gsHubJoin">${ic("plus","sm")} Join a shared trip</button></div>
    <div class="h mt">${ic("share")}<h2>Sync my trips to Google Drive</h2></div>
    <div class="gseg" role="group" aria-label="Which trips sync"><button class="${all?"on":""}" data-gsmode="all" aria-pressed="${all}" ${on?"":"disabled"}>All trips</button><button class="${all?"":"on"}" data-gsmode="pick" aria-pressed="${!all}" ${on?"":"disabled"}>Chosen trips</button></div>
    ${on?"":`<div class="small dim" style="margin:6px 0 2px">Connect to choose trips</div>`}
    ${S.trips.length?S.trips.slice().sort((a,b)=>(a.start||"").localeCompare(b.start||"")).map(t=>gsTripRow(t,on,all)).join(""):`<div class="small muted">No trips yet.</div>`}
    <div class="h mt">${ic("phone")}<h2>Your other devices</h2></div>
    ${(GS.kcAvail||[]).length?GS.kcAvail.map(x=>`<div class="li"><div class="b"><div class="t">${esc(x.name||"Trip")}</div><div class="d">On your other device</div></div><button class="btn xs" data-kcopen="${esc(x.id)}">${ic("download","sm")} Open</button></div>`).join(""):""}
    <div class="row wrap" style="gap:6px">${on?`<button class="btn" id="gsAddDev">${ic("phone","sm")} Add a device</button><button class="btn" id="gsGetTrips">${ic("download","sm")} Get trips from my other device</button><button class="btn ghost" id="gsKcPass">${ic("key","sm")} Sync passphrase</button>`:""}</div>
    <div class="h mt">${ic("clock")}<h2>Recent changes from others</h2></div>
    ${rec.length?rec.map(c=>`<div class="li gsrec">${gsAv(c.who,"sm")}<div class="b"><div class="t" style="font-weight:500"><b>${esc(gsName(c.who))}</b> ${esc(c.verb)} ${esc(c.what)}</div><div class="d">${esc(c.tn)} · ${gsAgo(c.at)}</div></div></div>`).join(""):`<div class="small muted">Nothing yet</div>`}`}
function openHub(){openSettings("sync")}
/* Wire the Sync & sharing pane (event delegation survives gsPaint re-rendering #gsHubBody). */
function gsHubWire(pane,close){
  pane.addEventListener("click",async e=>{const b=e.target.closest("button,[data-hubtrip]");if(!b||b.disabled)return;
    const run=async fn=>{if(b.tagName==="BUTTON"){b.disabled=true}try{await fn()}catch(err){if(err.code!=="consent")toast(esc(err.message||String(err)),"bad")}finally{if(b.isConnected)b.disabled=false;gsPaint()}};
    if(b.dataset.hubtrip){const t=S.trips.find(x=>x.id===b.dataset.hubtrip);if(t){close();openShare(t)}}
    else if(b.id==="gsHubIn")await run(gsConnect);
    else if(b.id==="gsHubOut"){GAuth.revoke();gsPaint();render();toast("Disconnected from Google. Shared trips pause until you connect again","info")}
    else if(b.id==="gsHubSync")await run(gsSyncNow);
    else if(b.id==="gsHubJoin"){close();openJoin()}
    else if(b.dataset.gsmode)await run(()=>gsSetMode(b.dataset.gsmode));
    else if(b.id==="gsAddDev"){close();await run(gsAddDevice)}
    else if(b.id==="gsGetTrips"){close();await run(()=>gsKcOffer(true))}
    else if(b.dataset.kcopen){const x=(GS.kcAvail||[]).find(y=>y.id===b.dataset.kcopen);if(x)await run(async()=>{await kcOpenTrips([x]);GS.kcAvail=GS.kcAvail.filter(y=>y!==x)})}
    else if(b.id==="gsKcPass")await run(()=>gsKcChangePass())});
  pane.addEventListener("change",async e=>{const c=e.target.closest("[data-gstrip]");if(!c)return;const t=S.trips.find(x=>x.id===c.dataset.gstrip);if(!t)return;
    c.disabled=true;try{if(c.checked){await gsStartShare(t,[]);syncToast(`“${esc(t.name)}” now syncs to your Drive`)}else if(!(await gsStopSync(t)))c.checked=true}
    catch(err){c.checked=!c.checked;if(err.code!=="consent")toast(esc(err.message||String(err)),"bad")}finally{gsPaint()}})}
async function gsSetMode(m){
  if(m==="pick"){S.meta.gsAll=false;await saveMeta();return}
  const left=S.trips.filter(t=>!t.sync?.fileId);
  if(left.length&&!(await gate({title:"Sync all trips?",plan:[`${left.length} more trip${left.length>1?"s":""} will be encrypted and saved to your Drive: ${left.slice(0,4).map(t=>esc(t.name)).join(", ")}${left.length>4?"…":""}`,"New trips you create will sync too","Switch back to Chosen trips any time"],ok:"Sync all",danger:false})))return;
  S.meta.gsAll=true;await saveMeta();await gsAllStart()}
/* Stop syncing one trip: the owner can delete the Drive copy (default) or keep it; a member leaves. */
function gsChoose(title,body,opts){return new Promise(res=>{let v=null;const ov=sheet({title,body,onClose:()=>res(v),foot:opts.map(([k,l,c])=>`<button class="btn ${c||""}" data-ch="${k}">${l}</button>`).join("")});
  ov.addEventListener("click",e=>{const b=e.target.closest("[data-ch]");if(b){v=b.dataset.ch;ov.remove();res(v)}})})}
async function gsStopSync(t){const owner=t.sync.role==="owner",ppl=(t.sync.members||[]).length;
  const v=await gsChoose(`${ic("share")} Stop syncing “${esc(t.name)}”?`,`<ul class="small plan" style="line-height:1.55;padding-left:18px;margin:0">
     ${owner?`<li>${ppl?`The ${ppl} ${ppl>1?"people":"person"} you shared it with lose access to it`:"It stops syncing to your other devices"}</li><li>Delete the copy: the trip file and your attachments are removed from your Google Drive</li>`:`<li>You leave the trip and stop getting updates; the others keep it</li><li>Delete my files: attachments and photos you added are removed from your Drive</li>`}
     <li>The trip stays on this device either way</li></ul>`,
    [["cancel","Cancel",""],["keep",owner?"Stop, keep the copy":"Leave, keep my files",""],["del",owner?"Stop & delete the copy":"Leave & delete my files","bad"]]);
  if(!v||v==="cancel")return false;
  if(S.meta.gsAll){S.meta.gsAll=false;await saveMeta()} // leaving one out means choosing trips
  await GAuth.token(true,{noConsent:true});const fid=t.sync.fileId,mine=S.files.filter(f=>f.tripId===t.id&&f.driveId&&(!f.by||f.by===(t.sync.me||GS.email))).map(f=>f.driveId);
  if(owner)await gsStopShare(t);else await gsUnlink(t);
  if(v==="del"){let n=0;for(const id of[...(owner?[fid]:[]),...mine]){try{await GDrive.del(id);n++}catch(e){}}
    for(const f of S.files.filter(f=>f.tripId===t.id&&f.driveId)){delete f.driveId;await DB.put("files",f)}
    toast(`Stopped syncing “${esc(t.name)}” · ${n} file${n===1?"":"s"} deleted from your Drive`)}
  else toast(`Stopped syncing “${esc(t.name)}”`);render();return true}
/* Erase everything this app put in your Drive (DPDP right to erasure). Trips shared with you are left. */
async function gsDeleteDriveData(btn){
  if(!(await gate({title:"Delete your Trip Vault data from Google Drive?",plan:["Deletes every file Trip Vault created in your Drive: the trips you own, attachments and photos you uploaded, and your saved trip keys","People you shared trips with lose the online copy (what's on their phones stays there)","Trips shared with you are left in their owners' Drive; you stop syncing them on this device","Your trips stay on this device"],irreversible:"The Drive copies. Drive's bin may keep them for up to 30 days.",ok:"Delete from Drive"})))return false;
  if(btn){btn.disabled=true}
  try{await GAuth.token(true,{noConsent:true});const ids=[];for(const k of["trip","file","keys"])ids.push(...await GDrive.list(k));const fo=await GDrive.findFolder();
    let n=0;for(const id of ids){try{await GDrive.del(id);n++}catch(e){if(e.status!==404)throw e}}if(fo){try{await GDrive.del(fo)}catch(e){}}
    for(const t of gsLinked()){delete t.sync;delete GS.st[t.id];await DB.put("trips",t)}
    for(const f of S.files.filter(f=>f.driveId)){delete f.driveId;await DB.put("files",f)}
    S.meta.gsAll=false;delete S.meta.kc;delete S.meta.kcGone;GS.kc=null;GS.folder=null;await saveMeta();render();gsPaint();
    toast(`Deleted ${n} file${n===1?"":"s"} from your Google Drive`);return true}
  catch(e){toast(esc(e.message||String(e)),"bad");return false}finally{if(btn?.isConnected)btn.disabled=false}}

/* ---------- your trip keys in your Drive, for your other devices ----------
   One "Trip Vault keys" file holds each synced trip's file id and code. It is encrypted with a random
   key K; K is stored in the file wrapped with a key from your sync passphrase (never stored), so a new
   device needs the passphrase once. This device keeps K (sealed with the vault passphrase if set). */
const GS_KC=[84,86,75,49]; // "TVK1"
const b64e8=u=>btoa(String.fromCharCode(...new Uint8Array(u))),b64d8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const kcImport=raw=>crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
const kcPassKey=(p,salt)=>Crypt.derive(p,salt,300000);
async function kcRaw(){if(GS.kc?.raw)return GS.kc.raw;const m=S.meta.kc;if(!m)return null;
  try{const raw=m.k?b64d8(m.k):m.ks&&Crypt.key?new Uint8Array(await Crypt.dec(Crypt.key,b64d8(m.ks).buffer)):null;if(raw)GS.kc={raw,K:await kcImport(raw)};return raw}catch(e){return null}}
async function kcStore(raw){if(!raw||!S.meta.kc)return;const m=S.meta.kc;delete m.k;delete m.ks;
  if(Crypt.key)m.ks=b64e8(await Crypt.enc(Crypt.key,raw));else m.k=b64e8(raw);await saveMeta()}
function kcEntries(){return gsLinked().map(t=>({id:t.id,name:String(t.name||"").slice(0,200),fileId:t.sync.fileId,code:t.sync.code,keyring:t.sync.keyring||[],role:t.sync.role,at:Date.now()}))}
async function kcSealFile(hdr,K,obj){const raw=new TextEncoder().encode(JSON.stringify(obj)),z=await gz(raw,true),ct=new Uint8Array(await Crypt.enc(K,z||raw)),o=new Uint8Array(5+hdr.length+ct.length);
  o.set(GS_KC);o[4]=z?1:0;o.set(hdr,5);o.set(ct,5+hdr.length);return o}
async function kcOpenFile(bytes,pass){if(!GS_KC.every((v,i)=>bytes[i]===v))throw gsErr("That isn't a Trip Vault keys file");
  const hdr=bytes.slice(5,81),salt=hdr.slice(0,16);let raw;
  if(pass!=null){try{raw=new Uint8Array(await Crypt.dec(await kcPassKey(pass,salt),hdr.slice(16).buffer))}catch(e){throw gsErr("That sync passphrase doesn't open your trip keys",{code:"kcpass"})}}
  else{raw=await kcRaw();if(!raw)throw gsErr("Enter your sync passphrase",{code:"kcpass"})}
  const K=await kcImport(raw);let p;try{p=new Uint8Array(await Crypt.dec(K,bytes.slice(81).buffer))}catch(e){throw gsErr("Your saved trip keys don't open with this device's key",{code:"kcpass"})}
  return{raw,K,hdr,obj:JSON.parse(new TextDecoder().decode(bytes[4]&1?await gz(p,false):p))}}
const kcClean=o=>cList(o?.trips,x=>({id:cStr(x.id,80),name:cStr(x.name,200),fileId:cStr(x.fileId,200),code:cStr(x.code,40),keyring:(Array.isArray(x.keyring)?x.keyring:[]).filter(k=>typeof k==="string"&&/^[A-Z0-9]{4}(-[A-Z0-9]{4}){4}$/.test(k)).slice(0,20),role:x.role==="owner"?"owner":"member",at:cNum(x.at),gone:!!x.gone}),2000)
  .filter(x=>CLEAN_ID.test(x.id)&&/^[\w-]{10,200}$/.test(x.fileId)&&(x.gone||/^[A-Z0-9]{4}(-[A-Z0-9]{4}){4}$/.test(x.code)));
async function kcAskPass(title,isNew){return isNew?promptNewPass({title,ok:"Save",note:"<b>Only you know it; there is no reset.</b> Your trip keys in Drive are locked with it, so Google can't read them. If you forget it, your trips are still on this device and can be opened elsewhere with their invite links."}):new Promise(res=>{let v=null;
  const ov=sheet({title,onClose:()=>res(v),body:`<label for="kcP">Sync passphrase</label><input id="kcP" type="password" autocomplete="current-password"><div class="small dim mt">The one you set when you first saved your trip keys.</div>`,foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="kcGo">${ic("unlock","sm")} Unlock</button>`});
  const go=()=>{v=$("#kcP",ov).value;ov.remove();res(v)};$("#kcGo",ov).onclick=go;$("#kcP",ov).onkeydown=e=>{if(e.key==="Enter")go()};setTimeout(()=>$("#kcP",ov)?.focus(),50)})}
async function gsKcChangePass(){await GAuth.token(true);await gsMe();if(!(await kcEnsure())){await gsKcPassOpen();return}const bytes=await GDrive.read(S.meta.kc.fileId),f=await kcOpenFile(bytes,null).catch(async e=>{if(e.code!=="kcpass")throw e;const p=await kcAskPass("Current sync passphrase");if(p==null)return null;return kcOpenFile(bytes,p)});if(!f)return;
  const pass=await kcAskPass("New sync passphrase",true);if(!pass)return;const salt=crypto.getRandomValues(new Uint8Array(16)),hdr=new Uint8Array(76);hdr.set(salt);hdr.set(new Uint8Array(await Crypt.enc(await kcPassKey(pass,salt),f.raw)),16);
  await GDrive.write(S.meta.kc.fileId,await kcSealFile(hdr,f.K,f.obj));toast("Sync passphrase set")}
const kcSig=()=>gsStable([kcEntries().map(({at,...x})=>x).sort((a,b)=>a.id<b.id?-1:1),S.meta.kcGone||{}]);
let _kcT=null;function kcPushSoon(){if(!S.meta.kc||!gsOn())return;clearTimeout(_kcT);_kcT=setTimeout(()=>kcPush().catch(e=>console.warn("Trip Vault: trip keys not saved yet",e.message)),1500)}
async function kcPush(){const m=S.meta.kc;if(!m||!gsOn()||kcSig()===m.sig)return;if(!(await kcRaw()))return;
  const bytes=await GDrive.read(m.fileId),f=await kcOpenFile(bytes,null),map=new Map(kcClean(f.obj).map(x=>[x.id,x]));
  for(const e of kcEntries())map.set(e.id,e);for(const[id,at]of Object.entries(S.meta.kcGone||{}))if(!gsLinked().some(t=>t.id===id))map.set(id,{id,gone:true,at,fileId:map.get(id)?.fileId||"xxxxxxxxxx",code:""});
  await GDrive.write(m.fileId,await kcSealFile(f.hdr,f.K,{app:"TripVault",kind:"keys",v:1,trips:[...map.values()]}));m.sig=kcSig();await saveMeta()}
/* After connecting (or from the Sync pane): open your other devices' trips here.
   With this device's keychain key: offer the trips it doesn't have. Without: pairing code (or the old passphrase). */
async function gsKcOffer(force){
  const id=S.meta.kc?.fileId;
  if(!id||!(await kcRaw())){const mine=(await GDrive.list("trip")).filter(fid=>!gsLinked().some(t=>t.sync.fileId===fid));
    if(mine.length||force)await gsGetTrips(mine.length);return}
  const f=await kcOpenFile(await GDrive.read(id),null);
  const have=new Set(gsLinked().map(t=>t.id)),list=kcClean(f.obj).filter(x=>!x.gone&&!have.has(x.id));
  if(!list.length){if(force)syncToast("This device already has all your synced trips");kcPushSoon();return}
  await kcOpenList(list)}
/* The old way in: a keychain locked with a sync passphrase. */
async function gsKcPassOpen(){const id=(await GDrive.list("keys"))[0];if(!id){toast("No sync passphrase was set. Use a pairing code instead","info");return}
  const bytes=await GDrive.read(id);let f;
  for(;;){const p=await kcAskPass("Open your trips from your other devices");if(p==null)return;try{f=await kcOpenFile(bytes,p);break}catch(e){if(e.code!=="kcpass")throw e;toast(esc(e.message),"bad")}}
  S.meta.kc={fileId:id,sig:""};GS.kc={raw:f.raw,K:f.K};await kcStore(f.raw);
  const have=new Set(gsLinked().map(t=>t.id)),list=kcClean(f.obj).filter(x=>!x.gone&&!have.has(x.id));
  if(list.length)await kcOpenList(list);else syncToast("This device already has all your synced trips")}
/* Choose which of the offered trips to open here, then open them in the background (current trip unchanged). */
function kcOpenList(list){return new Promise(res=>{
  const ov=sheet({title:`${ic("download")} Open your trips here`,onClose:()=>res(0),body:`<label class="row" style="cursor:pointer;margin:0 0 8px"><input type="checkbox" id="kcAll" checked> <b class="small">All trips</b></label>
     ${list.map(x=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-kc="${esc(x.id)}" checked><div class="b"><div class="t">${esc(x.name||"Trip")}</div><div class="d">${x.role==="owner"?"Yours":"Shared with you"}</div></div></label>`).join("")}`,
    foot:`<button class="btn" data-close>Not now</button><button class="btn pri" id="kcGo">${ic("download","sm")} Open</button>`});
  $("#kcAll",ov).onchange=e=>$$("[data-kc]",ov).forEach(c=>c.checked=e.target.checked);
  $$("[data-kc]",ov).forEach(c=>c.onchange=()=>{$("#kcAll",ov).checked=$$("[data-kc]",ov).every(x=>x.checked)});
  $("#kcGo",ov).onclick=async e=>{const b=e.currentTarget,pick=list.filter(x=>$(`[data-kc="${x.id}"]`,ov)?.checked);if(!pick.length){ov.remove();res(0);return}
    b.disabled=true;b.innerHTML=`${ic("clock","sm")} Opening…`;const n=await kcOpenTrips(pick);ov.remove();res(n)}})}
async function kcOpenTrips(pick,quietOk){let ok=0;const bad=[];
  for(const x of pick){try{const{t}=await gsJoin({fileId:x.fileId,code:x.code},{bg:true,picker:!quietOk});t.sync.keyring=[...new Set([...(t.sync.keyring||[]),...x.keyring])].slice(0,20);await DB.put("trips",t);ok++}catch(err){bad.push(`${x.name}: ${err.message}`)}}
  if(!S.cur&&S.trips[0]){S.cur=S.trips[0].id;S.meta.cur=S.cur;saveMeta()}render();gsPaint();
  if(bad.length)toast(esc(`Opened ${ok}; couldn't open ${bad.length}: ${bad[0]}`),"bad");else if(!quietOk)syncToast(`Opened ${ok} trip${ok===1?"":"s"} from your other device`);return ok}

/* ---------- pairing a second device with a one-time code ----------
   The device with the trips writes a short-lived "Trip Vault pairing" file to your Drive, encrypted with a key
   made from a one-time code it shows you. The new device (same Google account) reads it with the code you type.
   It carries each synced trip's file and code plus the keychain key, so later trips flow to both. */
const GS_PAIR=[84,86,80,49],PAIR_TTL=10*60e3; // "TVP1"
const pairCode=()=>gsNewCode().slice(0,14);
async function pairSeal(code,obj){const salt=crypto.getRandomValues(new Uint8Array(16)),raw=new TextEncoder().encode(JSON.stringify(obj)),z=await gz(raw,true);
  const ct=new Uint8Array(await Crypt.enc(await Crypt.derive(qrNorm(code),salt,200000),z||raw)),o=new Uint8Array(21+ct.length);o.set(GS_PAIR);o[4]=z?1:0;o.set(salt,5);o.set(ct,21);return o}
async function pairOpen(bytes,code){if(!GS_PAIR.every((v,i)=>bytes[i]===v))return null;let p;
  try{p=new Uint8Array(await Crypt.dec(await Crypt.derive(qrNorm(code),bytes.slice(5,21),200000),bytes.slice(21).buffer))}catch(e){return null}
  return JSON.parse(new TextDecoder().decode(bytes[4]&1?await gz(p,false):p))}
/* A keychain this device can open by itself (made here, no passphrase) so later trips flow to paired devices. */
async function kcEnsure(){if(S.meta.kc?.fileId&&await kcRaw())return true;if((await GDrive.list("keys"))[0])return false;
  const raw=crypto.getRandomValues(new Uint8Array(32)),salt=crypto.getRandomValues(new Uint8Array(16)),hdr=new Uint8Array(76);hdr.set(salt);
  hdr.set(new Uint8Array(await Crypt.enc(await Crypt.derive(b64e8(crypto.getRandomValues(new Uint8Array(24))),salt,1000),raw)),16); // wrapped with a throwaway secret: only devices holding K open it
  const K=await kcImport(raw),r=await GDrive.create("Trip Vault keys",await kcSealFile(hdr,K,{app:"TripVault",kind:"keys",v:1,trips:kcEntries()}),{tv:"keys"});
  S.meta.kc={fileId:r.id,sig:""};GS.kc={raw,K};await kcStore(raw);S.meta.kc.sig=kcSig();await saveMeta();return true}
/* On the device that has the trips: show a code for the other device to type. */
async function gsAddDevice(){await GAuth.token(true);await gsMe();
  const local=S.trips.filter(t=>!t.sync?.fileId);
  if(local.length){const v=await gsChoose(`${ic("share")} Sync ${local.length} more trip${local.length>1?"s":""} first?`,`<div class="small muted">On this device only: ${local.slice(0,5).map(t=>esc(t.name)).join(", ")}${local.length>5?"…":""}</div>`,
      [["skip","Only synced trips",""],["sync",`Sync ${local.length===1?"it":"them"} too`,"pri"]]);if(!v)return;
    if(v==="sync")for(const t of local){try{await gsStartShare(t,[])}catch(e){if(e.code==="consent")return;toast(esc(e.message),"bad")}}}
  if(!gsLinked().length){toast("Sync a trip first, then add your other device","info");return}
  await kcEnsure();const raw=await kcRaw(),code=pairCode(),exp=Date.now()+PAIR_TTL;
  const r=await GDrive.create("Trip Vault pairing",await pairSeal(code,{app:"TripVault",kind:"pair",v:1,exp,trips:kcEntries(),k:raw?b64e8(raw):"",kcId:S.meta.kc?.fileId||""}),{tv:"pair"});
  let gone=false;const drop=()=>{if(gone)return;gone=true;clearInterval(tick);GDrive.del(r.id).catch(()=>{})};
  const ov=sheet({title:`${ic("phone")} Add a device`,help:"pair",onClose:drop,body:`<div class="small muted">On your other device: sign in with ${esc(GS.email)}, open Settings → Sync &amp; devices → <b>Get trips from my other device</b>, and type:</div>
     <div class="paircode mono" data-copy="${code}" aria-label="Pairing code">${code}</div><div class="small dim" id="pairT" style="text-align:center"></div>`,foot:`<span class="sp"></span><button class="btn pri" data-close>Done</button>`});
  const tick=setInterval(async()=>{const left=exp-Date.now(),el=$("#pairT",ov);if(!ov.isConnected||!el){drop();return}
    if(left<=0){drop();el.textContent="This code has expired. Close and add the device again.";$(".paircode",ov).style.opacity=".35";return}
    el.textContent=`Expires in ${Math.floor(left/60e3)}:${String(Math.floor(left%60e3/1e3)).padStart(2,"0")}`;
    if(Math.floor(left/1e3)%4===0){try{await GDrive.meta(r.id)}catch(e){if(e.status===404&&!gone){gone=true;clearInterval(tick);el.innerHTML=`<b style="color:var(--ok)">${ic("check","sm")} Done: your other device has your trips</b>`}}}},1000)}
/* On the new device: type the code from the other device. */
let _pairFails=0,_pairWait=0;
async function gsGetTrips(n){await GAuth.token(true);await gsMe();
  const ov=sheet({title:`${ic("download")} Get trips from my other device`,help:"pair",body:`${n?`<div class="note info">${ic("share")}<div><b>${n} trip${n>1?"s are":" is"} synced from your other device.</b></div></div>`:""}
     <div class="small muted mt">On that device: Settings → Sync &amp; devices → <b>Add a device</b>. Then type the code it shows.</div>
     <label class="mt" for="pairIn">Code</label><input id="pairIn" class="mono" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKMN" maxlength="20">
     <div class="small mt"><a href="#" id="pairPass">I set a sync passphrase</a></div>`,
    foot:`<button class="btn" data-close>Not now</button><button class="btn pri" id="pairGo">${ic("download","sm")} Get my trips</button>`});
  $("#pairPass",ov).onclick=async e=>{e.preventDefault();ov.remove();await gsKcPassOpen()};
  const go=async()=>{const b=$("#pairGo",ov),code=$("#pairIn",ov).value;
    if(Date.now()<_pairWait){toast("Too many tries. Wait a moment and check the code","bad");return}
    if(qrNorm(code).length!==12){toast("The code has 12 letters and numbers","bad");return}
    b.disabled=true;b.innerHTML=`${ic("clock","sm")} Checking…`;
    try{let found=null,fid=null;for(const id of await GDrive.list("pair")){const o=await pairOpen(await GDrive.read(id),code);if(o){found=o;fid=id;break}}
      if(!found){if(++_pairFails>=5){_pairFails=0;_pairWait=Date.now()+30e3}toast("That code doesn't match. Check it on your other device","bad");return}
      _pairFails=0;if(!(+found.exp>Date.now())){GDrive.del(fid).catch(()=>{});toast("This code has expired. Make a new one on your other device","bad");return}
      const list=kcClean(found).filter(x=>!x.gone),have=new Set(gsLinked().map(t=>t.id));
      if(found.k&&/^[\w-]{10,200}$/.test(found.kcId||"")){const raw=b64d8(found.k);if(raw.length===32){S.meta.kc={fileId:found.kcId,sig:""};GS.kc={raw,K:await kcImport(raw)};await kcStore(raw);await saveMeta()}}
      await GDrive.del(fid).catch(()=>{});ov.remove();
      const todo=list.filter(x=>!have.has(x.id));if(!todo.length){syncToast("This device already has all your synced trips");return}
      await kcOpenList(todo)}
    catch(err){if(err.code!=="consent")toast(esc(err.message||String(err)),"bad")}
    finally{if(b.isConnected){b.disabled=false;b.innerHTML=`${ic("download","sm")} Get my trips`}}};
  $("#pairGo",ov).onclick=go;$("#pairIn",ov).onkeydown=e=>{if(e.key==="Enter")go()};setTimeout(()=>$("#pairIn",ov)?.focus(),60)}
/* Each sync: pick up trips your other devices started syncing (only when the keychain changed). */
let _kcPulling=false;
async function kcPull(){const m=S.meta.kc;if(!m?.fileId||!gsOn()||_kcPulling)return;if(!(await kcRaw()))return;_kcPulling=true;
  try{const v=(await GDrive.meta(m.fileId)).version;if(v===m.ver&&GS.kcAvail)return;
    const f=await kcOpenFile(await GDrive.read(m.fileId),null);m.ver=v;await saveMeta();
    const have=new Set(gsLinked().map(t=>t.id)),skip=S.meta.kcGone||{},fresh=kcClean(f.obj).filter(x=>!x.gone&&!have.has(x.id)&&!skip[x.id]);
    GS.kcAvail=fresh;if(!fresh.length)return;
    if(S.meta.gsAll){const n=await kcOpenTrips(fresh,true);if(n)syncToast(n===1?`“${esc(fresh[0].name)}” added from your other device`:`${n} trips added from your other device`)}
    else{const nw=fresh.filter(x=>!(GS.kcTold||=new Set()).has(x.id));nw.forEach(x=>GS.kcTold.add(x.id));if(nw.length)syncToast(`${nw.length===1?`“${esc(nw[0].name)}” is`:`${nw.length} trips are`} on your other device · open in Settings → Sync`,"info")}}
  catch(e){console.warn("Trip Vault: couldn't read your trip keys",e.message)}finally{_kcPulling=false;gsPaint()}}

/* ---------- the sync toast: its own spot under the account button, so it never replaces action toasts ---------- */
function syncToast(msg,kind="ok"){let el=$("#stoast");if(!el){el=document.createElement("div");el.id="stoast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");document.body.append(el)}
  const p=$("#gsPill")?.getBoundingClientRect();if(p&&p.width&&innerWidth>560){el.style.top=Math.round(p.bottom+8)+"px";el.style.right=Math.max(8,Math.round(innerWidth-p.right))+"px"}else{el.style.top="";el.style.right=""}
  el.className=`stoast ${kind}`;el.innerHTML=`${ic(kind==="bad"?"alert":kind==="info"?"info":"share","sm")}<span>${msg}</span>`;void el.offsetWidth;el.classList.add("on");
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),4500)}
