"use strict";
/* ===================== Storage: IndexedDB + optional encryption at rest =====================
   - Everything lives in this browser's IndexedDB. Nothing is ever sent anywhere.
   - If you set a passphrase, every trip / booking / file / memory is sealed with AES-256-GCM
     (key derived with PBKDF2-SHA256, 600k iterations) before it touches disk. */
const DATA_STORES=["trips","items","files","memories"];
const Crypt={
  key:null,info:null, // info = {salt,iter,chk} persisted in meta/lock (no secrets)
  async derive(pass,salt,iter){
    const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  },
  async enc(key,buf){const iv=crypto.getRandomValues(new Uint8Array(12));const c=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,buf);const o=new Uint8Array(12+c.byteLength);o.set(iv);o.set(new Uint8Array(c),12);return o.buffer},
  async dec(key,buf){const u=new Uint8Array(buf);return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},key,u.slice(12))}
};
const DB={db:null,
  open(){return new Promise((res,rej)=>{const r=indexedDB.open("tripvault",2);
    r.onupgradeneeded=e=>{const d=r.result,old=e.oldVersion;
      if(old<1){d.createObjectStore("trips",{keyPath:"id"});
        const it=d.createObjectStore("items",{keyPath:"id"});it.createIndex("tripId","tripId");
        const f=d.createObjectStore("files",{keyPath:"id"});f.createIndex("hash","hash");f.createIndex("tripId","tripId");
        d.createObjectStore("meta",{keyPath:"k"})}
      if(old<2){const m=d.createObjectStore("memories",{keyPath:"id"});m.createIndex("tripId","tripId")}};
    r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
  tx(s,m="readonly"){return this.db.transaction(s,m).objectStore(s)},
  req(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async seal(s,v){
    if(!Crypt.key||s==="meta")return v;
    const{blob,...m}=v;
    const d=await Crypt.enc(Crypt.key,new TextEncoder().encode(JSON.stringify(m)));
    const b=blob?await Crypt.enc(Crypt.key,await blob.arrayBuffer()):null;
    return{id:v.id,tripId:v.tripId,_e:1,d,b};
  },
  async unseal(r){
    if(!r||!r._e)return r;
    if(!Crypt.key)throw new Error("Vault is locked");
    const m=JSON.parse(new TextDecoder().decode(await Crypt.dec(Crypt.key,r.d)));
    if(r.b)m.blob=new Blob([await Crypt.dec(Crypt.key,r.b)],{type:m.type});
    return m;
  },
  async all(s){const rows=await this.req(this.tx(s).getAll());return s==="meta"?rows:Promise.all(rows.map(r=>this.unseal(r)))},
  async get(s,k){const r=await this.req(this.tx(s).get(k));return s==="meta"?r:this.unseal(r)},
  async put(s,v){return this.req(this.tx(s,"readwrite").put(await this.seal(s,v)))},
  del(s,k){return this.req(this.tx(s,"readwrite").delete(k))},
  clear(s){return this.req(this.tx(s,"readwrite").clear())},
  async putMany(s,arr){if(!arr.length)return;const sealed=[];for(const v of arr)sealed.push(await this.seal(s,v));
    await new Promise((res,rej)=>{const t=this.db.transaction(s,"readwrite");const o=t.objectStore(s);sealed.forEach(v=>o.put(v));t.oncomplete=res;t.onerror=()=>rej(t.error)})}
};

/* ===== App state ===== */
const S={trips:[],items:[],files:[],memories:[],cur:null,view:"today",sub:"bookings",day:null,settings:null,meta:{}};
const DEF_SET={wake:"07:00",sleep:"22:00",minGap:60,preIntl:180,preDom:120,postIntl:60,postDom:30,trainPre:30,homeTz:"Asia/Kolkata",autoLock:5,theme:"auto",optimizePhotos:true};
async function loadAll(){
  [S.trips,S.items,S.files,S.memories]=await Promise.all(DATA_STORES.map(s=>DB.all(s)));
  const st=await DB.get("meta","settings");S.settings={...DEF_SET,...(st?.v||{})};
  const m=await DB.get("meta","state");S.meta=m?.v||{};
  S.cur=S.trips.find(t=>t.id===S.meta.cur)?.id||S.trips.sort((a,b)=>(a.start||"").localeCompare(b.start||""))[0]?.id||null;
}
function clearMemory(){S.trips=[];S.items=[];S.files=[];S.memories=[];S.cur=null;PHOTO_URLS.forEach(u=>URL.revokeObjectURL(u));PHOTO_URLS.clear()}
const saveMeta=()=>DB.put("meta",{k:"state",v:S.meta});
const curTrip=()=>S.trips.find(t=>t.id===S.cur);
const tripItems=(id=S.cur)=>S.items.filter(i=>i.tripId===id);
const tripMems=(id=S.cur)=>S.memories.filter(m=>m.tripId===id);
async function saveTrip(t){t.updatedAt=Date.now();await DB.put("trips",t);const i=S.trips.findIndex(x=>x.id===t.id);i>=0?S.trips[i]=t:S.trips.push(t);markDirty()}
async function saveItem(it){it.updatedAt=Date.now();it.createdAt??=Date.now();await DB.put("items",it);const i=S.items.findIndex(x=>x.id===it.id);i>=0?S.items[i]=it:S.items.push(it);markDirty()}
async function delItem(id){await DB.del("items",id);S.items=S.items.filter(i=>i.id!==id);
  for(const f of S.files.filter(f=>(f.itemIds||[]).includes(id))){f.itemIds=f.itemIds.filter(x=>x!==id);await DB.put("files",f)}markDirty()}
async function saveFile(f){await DB.put("files",f);const i=S.files.findIndex(x=>x.id===f.id);i>=0?S.files[i]=f:S.files.push(f);markDirty()}
async function delFile(id){await DB.del("files",id);S.files=S.files.filter(f=>f.id!==id);for(const it of S.items.filter(i=>(i.fileIds||[]).includes(id))){it.fileIds=it.fileIds.filter(x=>x!==id);await DB.put("items",it)}markDirty()}
async function saveMem(m){m.updatedAt=Date.now();m.createdAt??=Date.now();await DB.put("memories",m);const i=S.memories.findIndex(x=>x.id===m.id);i>=0?S.memories[i]=m:S.memories.push(m);markDirty()}
async function delMem(id){const m=S.memories.find(x=>x.id===id);await DB.del("memories",id);S.memories=S.memories.filter(x=>x.id!==id);
  for(const fid of m?.photoIds||[]){const u=PHOTO_URLS.get(fid);if(u){URL.revokeObjectURL(u);PHOTO_URLS.delete(fid)}await DB.del("files",fid);S.files=S.files.filter(f=>f.id!==fid)}markDirty()}
function markDirty(){S.meta.dirty=Date.now();saveMeta();SEARCH.stale=true}

/* Photo object-URL cache (one URL per stored file for the session) */
const PHOTO_URLS=new Map();
function photoUrl(fid){if(PHOTO_URLS.has(fid))return PHOTO_URLS.get(fid);const f=S.files.find(x=>x.id===fid);if(!f?.blob)return"";const u=URL.createObjectURL(f.blob);PHOTO_URLS.set(fid,u);return u}

/* ===== Vault lock (passphrase) ===== */
const MAGIC="tripvault-ok";
const Vault={
  get locked(){return !!Crypt.info&&!Crypt.key},
  get protected(){return !!Crypt.info},
  async readLock(){const r=await DB.get("meta","lock");Crypt.info=r?.v||null},
  async enable(pass){ // encrypt everything currently in memory, then flip the switch
    const salt=crypto.getRandomValues(new Uint8Array(16)),iter=600000;
    const key=await Crypt.derive(pass,salt,iter);
    const chk=await Crypt.enc(key,new TextEncoder().encode(MAGIC));
    Crypt.info={salt:Array.from(salt),iter,chk};
    await DB.put("meta",{k:"lock",v:Crypt.info}); // lock record first: mixed plain/sealed rows stay readable if interrupted
    Crypt.key=key;await this.rewriteAll();
  },
  async disable(){
    Crypt.key=null; // seal() becomes a pass-through
    await this.rewriteAll();
    await DB.del("meta","lock");Crypt.info=null;
  },
  async rewriteAll(){for(const s of DATA_STORES){await DB.putMany(s,S[s])}},
  async unlock(pass){
    const info=Crypt.info;if(!info)return true;
    const key=await Crypt.derive(pass,new Uint8Array(info.salt),info.iter);
    try{const ok=new TextDecoder().decode(await Crypt.dec(key,info.chk));if(ok!==MAGIC)return false}catch(e){return false}
    Crypt.key=key;return true;
  },
  lock(){if(!Crypt.info)return;Crypt.key=null;clearMemory();closeAllSheets();showLock()},
  async change(oldP,newP){if(!(await this.unlock(oldP)))return false;await this.disable();await this.enable(newP);return true}
};
function closeAllSheets(){document.querySelectorAll(".ov").forEach(o=>o.remove())}

/* idle auto-lock */
let _idleT=null,_hiddenAt=0;
function armIdle(){clearTimeout(_idleT);const m=+S.settings?.autoLock;if(!Crypt.info||!Crypt.key||!m)return;_idleT=setTimeout(()=>Vault.lock(),m*60000)}
["pointerdown","keydown","touchstart","scroll"].forEach(ev=>addEventListener(ev,()=>armIdle(),{passive:true,capture:true}));
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden")_hiddenAt=Date.now();
  else if(Crypt.info&&Crypt.key&&+S.settings?.autoLock&&_hiddenAt&&Date.now()-_hiddenAt>S.settings.autoLock*60000)Vault.lock();
});
