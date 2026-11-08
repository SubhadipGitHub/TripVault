"use strict";
/* ===================== Memories: a private trip journal with photos ===================== */
const MOODS={
  joy:{n:"Joyful",c:"#f4c95d"},awe:{n:"In awe",c:"#b794ff"},calm:{n:"Peaceful",c:"#3cd0c8"},fun:{n:"Playful",c:"#ff7a9c"},
  tasty:{n:"Delicious",c:"#ffa24d"},love:{n:"Grateful",c:"#ff626b"},tired:{n:"Worn out",c:"#8a97b3"}
};
const PROMPTS=["What surprised you today?","Best thing you ate?","A stranger who made your day","Something you'd tell your past self","A smell, sound or colour you want to remember","What went wrong and turned out fine?"];
const moodTag=k=>MOODS[k]?`<span class="mood" style="--mc:${MOODS[k].c}"><i></i>${MOODS[k].n}</span>`:"";

async function optimizePhoto(file){
  const keep={blob:file,type:file.type||"application/octet-stream",w:0,h:0};
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))return keep;
  try{
    const bm=await createImageBitmap(file,{imageOrientation:"from-image"});
    const sc=Math.min(1,1600/Math.max(bm.width,bm.height));
    const w=Math.max(1,Math.round(bm.width*sc)),h=Math.max(1,Math.round(bm.height*sc));
    if(!S.settings.optimizePhotos){bm.close?.();return{...keep,w:bm.width,h:bm.height}}
    const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(bm,0,0,w,h);
    const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.84));bm.close?.();
    if(blob&&blob.size<file.size)return{blob,type:"image/jpeg",w,h};
    return{...keep,w,h};
  }catch(e){return keep}
}
async function addPhotos(files,tripId,memId){
  const ids=[];
  for(const f of files){
    if(!f.type.startsWith("image/"))continue;
    const o=await optimizePhoto(f);const buf=await o.blob.arrayBuffer();
    const rec={id:uid(),tripId,name:f.name.replace(/\.(heic|heif)$/i,"")||"photo",type:o.type,size:o.blob.size,hash:await sha256(buf),blob:new Blob([buf],{type:o.type}),itemIds:[],memId,w:o.w,h:o.h,createdAt:Date.now()};
    await saveFile(rec);ids.push(rec.id);
  }
  if(ids.length)navigator.storage?.persist?.();
  return ids;
}
const memPhotos=m=>(m.photoIds||[]).filter(id=>S.files.some(f=>f.id===id));
const memDefaultDate=t=>{const ph=tripPhase(t);if(ph.p==="during")return ph.today;const{s,e}=tripRange(t);return ph.p==="after"?e:(s||todayIn("Asia/Kolkata"))};

function memCard(m){
  const ph=memPhotos(m),f0=S.files.find(f=>f.id===ph[0]);const ar=f0?.w&&f0?.h?Math.max(.75,Math.min(1.6,f0.w/f0.h)):4/3;
  const body=ph.length>1?`<div class="ph multi">${ph.slice(0,4).map(id=>`<img src="${photoUrl(id)}" alt="" loading="lazy">`).join("")}</div>`:ph.length?`<img class="ph" style="--ar:${ar}" src="${photoUrl(ph[0])}" alt="${esc(m.title||"Memory photo")}" loading="lazy">`:"";
  return`<article class="mem ${ph.length?"":"noph"}" tabindex="0" role="button" data-a="memView" data-id="${m.id}" aria-label="${esc(m.title||"Memory")}">
    <span class="tape"></span>${m.fav?`<span class="fav">${ic("star","sm")}</span>`:""}${body}
    <div class="cap"><h4>${esc(m.title||"Untitled moment")}</h4>${m.text?`<p>${esc(m.text)}</p>`:""}
    <div class="when"><span>${fmtDs(m.date)}${m.place?" · "+esc(m.place):""}</span>${moodTag(m.mood)}</div></div></article>`;
}

function openMemory(m,isNew){
  const t=S.trips.find(x=>x.id===m.tripId)||curTrip();const pend=[];let keep=[...(m.photoIds||[])],mood=m.mood||"",fav=!!m.fav;
  const prompt=PROMPTS[Math.floor(Math.random()*PROMPTS.length)];
  const ov=sheet({title:`${ic("camera")} ${isNew?"Capture a memory":"Edit memory"}`,body:`
    <div class="fg">${F("Title","title",m.title,{full:1,ph:"Sunrise at Batu Caves"})}${F("Date","date",m.date,{type:"date"})}${F("Place","place",m.place,{ph:"Kuala Lumpur"})}</div>
    <div class="mt"><label>The story</label><textarea class="prose" name="text" placeholder="${esc(prompt)}">${esc(m.text||"")}</textarea></div>
    <div class="mt"><label>How did it feel?</label><div class="moods" id="moods">${Object.entries(MOODS).map(([k,v])=>`<button type="button" data-mood="${k}" style="--mc:${v.c}" class="${k===mood?"on":""}"><i></i>${v.n}</button>`).join("")}</div></div>
    <div class="mt"><div class="row"><label style="margin:0">Photos</label><span class="sp"></span><label class="btn xs" style="margin:0">${ic("camera","sm")} Add photos<input type="file" id="mpIn" accept="image/*" multiple hidden></label></div>
      <div class="thumbs" id="thumbs"></div><div class="small dim mt">${S.settings.optimizePhotos?"Photos are resized to 1600px on this device to save space (change in Settings).":"Photos are stored at full size."} They are never uploaded.</div></div>
    <div class="mt"><label class="row" style="cursor:pointer"><input type="checkbox" id="mFav" ${fav?"checked":""}> <span>${ic("star","sm")} Mark as a highlight (featured in your Wrapped)</span></label></div>`,
    foot:`${isNew?"":`<button class="btn bad" id="mDel" style="margin-right:auto">${ic("trash","sm")} Delete</button>`}<button class="btn" data-close>Cancel</button><button class="btn pri" id="mSv">${ic("check","sm")} Save memory</button>`});
  const paint=()=>{$("#thumbs",ov).innerHTML=keep.map(id=>`<div class="th"><img src="${photoUrl(id)}" alt=""><button type="button" data-rm="${id}" aria-label="Remove photo">${ic("x","sm")}</button></div>`).join("")+pend.map((f,i)=>`<div class="th"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-rmp="${i}" aria-label="Remove photo">${ic("x","sm")}</button></div>`).join("")};paint();
  ov.addEventListener("click",e=>{const b=e.target.closest("[data-mood]");if(b){mood=mood===b.dataset.mood?"":b.dataset.mood;$$("#moods button",ov).forEach(x=>x.classList.toggle("on",x.dataset.mood===mood))}
    const r=e.target.closest("[data-rm]");if(r){keep=keep.filter(x=>x!==r.dataset.rm);paint()}const p=e.target.closest("[data-rmp]");if(p){pend.splice(+p.dataset.rmp,1);paint()}});
  $("#mpIn",ov).onchange=e=>{pend.push(...e.target.files);paint();e.target.value=""};
  $("#mSv",ov).onclick=async()=>{const g=gather(ov);if(!g.title&&!g.text&&!keep.length&&!pend.length){toast("Add a title, a few words or a photo","bad");return}
    const btn=$("#mSv",ov);btn.disabled=true;
    const n={...m,title:g.title,date:g.date||m.date,place:g.place,text:g.text,mood,fav:$("#mFav",ov).checked};
    const added=await addPhotos(pend,n.tripId,n.id);
    const removed=(m.photoIds||[]).filter(id=>!keep.includes(id));for(const id of removed){PHOTO_URLS.delete(id);await DB.del("files",id);S.files=S.files.filter(f=>f.id!==id)}
    n.photoIds=[...keep,...added];await saveMem(n);ov.remove();AV.cheer();render();toast(isNew?"Memory saved to your vault":"Memory updated")};
  $("#mDel",ov)?.addEventListener("click",async()=>{if(!(await gate({title:"Delete this memory?",plan:[`Delete “${esc(m.title||"Untitled")}” and its ${memPhotos(m).length} photo(s)`],irreversible:"It can't be recovered unless it's in a backup.",ok:"Delete memory"})))return;await delMem(m.id);ov.remove();$$(".ov").forEach(o=>o.remove());render();toast("Memory deleted")});
}
function newMemory(o={}){const t=curTrip();if(!t){toast("Create a trip first","bad");return}
  openMemory({id:uid(),tripId:t.id,date:o.date||memDefaultDate(t),title:"",text:"",place:o.place||"",mood:"",photoIds:[],fav:false},true)}
function openMemView(id){
  const m=S.memories.find(x=>x.id===id);if(!m)return;const ph=memPhotos(m);
  sheet({title:esc(m.title||"Memory"),cls:"wide",body:`<div class="row wrap small muted" style="margin-bottom:10px">${ic("cal","sm")} ${fmtD(m.date,1)}${m.place?` · ${ic("pin","sm")} ${esc(m.place)}`:""} ${moodTag(m.mood)} ${m.fav?pill(ic("star","sm")+" highlight","info"):""}</div>
    ${ph.length?`<div class="gallery-big">${ph.map(pid=>`<img src="${photoUrl(pid)}" alt="" data-a="openFile" data-id="${pid}">`).join("")}</div>`:""}
    ${m.text?`<p class="serif" style="font-size:17px;line-height:1.65;margin-top:14px;white-space:pre-wrap">${esc(m.text)}</p>`:""}`,
    foot:`<button class="btn" data-close>Close</button><button class="btn pri" data-a="memEdit" data-id="${m.id}">${ic("edit","sm")} Edit</button>`});
}
async function quickMemory(){ // from the Today screen: one-tap capture
  const t=curTrip();const txt=$("#qmT")?.value.trim();const files=[...($("#qmF")?.files||[])];
  if(!txt&&!files.length){toast("Write a line or add a photo","bad");return}
  const m={id:uid(),tripId:t.id,date:memDefaultDate(t),title:"",text:txt||"",place:"",mood:"",photoIds:[],fav:false};
  m.title=(txt||"").split(/[.\n!?]/)[0].slice(0,48)||"Moment";
  m.photoIds=await addPhotos(files,t.id,m.id);await saveMem(m);AV.cheer();render();toast("Saved to Memories")}

function viewMemories(t){
  const ms=tripMems(t.id).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||a.createdAt-b.createdAt);
  const photos=ms.reduce((a,m)=>a+memPhotos(m).length,0);const ph=tripPhase(t);
  let h=`<div class="jhead"><div class="jt"><div class="eyebrow">Journal</div><h2 class="serif" style="font-size:26px;line-height:1.1">${esc(t.name)}</h2><div class="small muted">${ms.length} memor${ms.length===1?"y":"ies"} · ${photos} photo${photos===1?"":"s"}</div></div>${avSlot(t,"jr")}<button class="btn pri" data-a="newMem">${ic("plus")} Capture</button></div>`;
  if(ms.length||ph.p==="after")h+=wrappedCta(t);
  if(!ms.length)return h+`<div class="card empty">${kic("memory")}<b>Nothing captured yet</b><div class="small">Jot a line, drop a photo, tag the mood. These become the heart of your Trip Wrapped.</div><div class="small dim mt serif" style="font-style:italic">“${esc(PROMPTS[new Date().getDate()%PROMPTS.length])}”</div><div class="row mt" style="justify-content:center"><button class="btn pri" data-a="newMem">${ic("camera")} Capture your first memory</button></div></div>`;
  return h+`<div class="mfeed mt">${ms.map(memCard).join("")}</div>`;
}
