"use strict";
/* ===================== Trip Wrapped: story cards from your own data =====================
   Cards are drawn on <canvas> at 1080x1920. What you see in the viewer is exactly what you export. */
const WF={serif:'"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Charter,Georgia,serif',sans:'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',mono:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'};
const WTHEMES=[
  {n:"Dusk",bg:["#1a1240","#4b2a6b","#ff7a59"],ink:"#fff7ee",accent:"#ffd08a",dim:"rgba(255,247,238,.62)",panel:"rgba(255,255,255,.1)"},
  {n:"Lagoon",bg:["#04242c","#0b5560","#2fc4b2"],ink:"#f2fffb",accent:"#ffe08a",dim:"rgba(242,255,251,.62)",panel:"rgba(255,255,255,.11)"},
  {n:"Sahara",bg:["#2b1407","#8a4a1a","#f0b95a"],ink:"#fff8ea",accent:"#fff0b8",dim:"rgba(255,248,234,.66)",panel:"rgba(255,255,255,.12)"},
  {n:"Monsoon",bg:["#0a1330","#27408f","#8e7be0"],ink:"#f3f4ff",accent:"#ffd0e0",dim:"rgba(243,244,255,.64)",panel:"rgba(255,255,255,.1)"}
];
const CC_NAME={IN:"India",AE:"UAE",QA:"Qatar",BH:"Bahrain",OM:"Oman",KW:"Kuwait",SA:"Saudi Arabia",JO:"Jordan",IL:"Israel",TR:"Türkiye",EG:"Egypt",LK:"Sri Lanka",MV:"Maldives",NP:"Nepal",BD:"Bangladesh",BT:"Bhutan",PK:"Pakistan",SG:"Singapore",MY:"Malaysia",TH:"Thailand",ID:"Indonesia",PH:"Philippines",VN:"Vietnam",KH:"Cambodia",MM:"Myanmar",LA:"Laos",HK:"Hong Kong",MO:"Macau",TW:"Taiwan",CN:"China",JP:"Japan",KR:"South Korea",AU:"Australia",NZ:"New Zealand",FJ:"Fiji",GB:"United Kingdom",IE:"Ireland",FR:"France",DE:"Germany",NL:"Netherlands",BE:"Belgium",CH:"Switzerland",AT:"Austria",CZ:"Czechia",HU:"Hungary",PL:"Poland",DK:"Denmark",SE:"Sweden",NO:"Norway",FI:"Finland",ES:"Spain",PT:"Portugal",IT:"Italy",GR:"Greece",IS:"Iceland",RU:"Russia",GE:"Georgia",AZ:"Azerbaijan",KZ:"Kazakhstan",UZ:"Uzbekistan",KE:"Kenya",ZA:"South Africa",ET:"Ethiopia",MU:"Mauritius",SC:"Seychelles",TZ:"Tanzania",MA:"Morocco",NG:"Nigeria",US:"United States",CA:"Canada",MX:"Mexico",BR:"Brazil",AR:"Argentina",PE:"Peru",CO:"Colombia",CL:"Chile"};

/* ---------- stats ---------- */
function homeCC(){const tz=S.settings.homeTz;return tz==="Asia/Kolkata"?"IN":(Object.values(AP).find(a=>a.tz===tz)?.cc||"IN")}
function wStats(trips){
  const ids=new Set(trips.map(t=>t.id)),its=S.items.filter(i=>ids.has(i.tripId)),mems=S.memories.filter(m=>ids.has(m.tripId));
  let days=0,nights=0,airMin=0,trainMin=0,flights=0,trains=0;
  trips.forEach(t=>{const{s,e}=tripRange(t);if(s)days+=dayDiff(s,e)+1});
  its.filter(i=>i.kind==="hotel"&&i.checkIn&&i.checkOut).forEach(h=>{nights+=Math.max(0,dayDiff(h.checkIn.slice(0,10),h.checkOut.slice(0,10)))});
  its.filter(i=>i.kind==="flight"&&i.dep&&i.arr).forEach(f=>{const m=(toUTC(f.arr,f.arrTz||apTz(f.to)||"Asia/Kolkata")-toUTC(f.dep,f.depTz||apTz(f.from)||"Asia/Kolkata"))/6e4;if(m>0&&m<1200){airMin+=m;flights++}});
  its.filter(i=>i.kind==="train"&&i.dep&&i.arr).forEach(f=>{const tz=f.tz||"Asia/Kolkata";const m=(toUTC(f.arr,tz)-toUTC(f.dep,tz))/6e4;if(m>0&&m<3000){trainMin+=m;trains++}});
  const places=[],seen=new Set(),addP=p=>{p=(p||"").trim();if(p&&!seen.has(p.toLowerCase())){seen.add(p.toLowerCase());places.push(p)}};
  const hcc=homeCC(),ccs=new Set();
  trips.forEach(t=>(t.dest||"").split(/[,&/]|\band\b/).forEach(addP));
  its.filter(i=>i.kind==="flight").forEach(f=>{const a=AP[f.to];if(a){if(a.cc!==hcc)ccs.add(a.cc);if(!trips.some(t=>t.dest))addP(a.city)}});
  its.filter(i=>i.kind==="train").forEach(f=>{if(!trips.some(t=>t.dest))addP(f.toName||f.to)});
  const tzs=new Set();its.forEach(i=>itemEvents(i).forEach(e=>tzs.add(e.tz)));
  const now=Date.now(),hOff=tzOff(S.settings.homeTz,now);let shift=0;tzs.forEach(z=>{shift=Math.max(shift,Math.abs(tzOff(z,now)-hOff)/60)});
  const cats={};let spent=0,biggest=null,foodN=0;
  trips.forEach(t=>{const B=budgetOf(t);spent+=B.committed;Object.entries(B.cats).forEach(([k,v])=>cats[k]=(cats[k]||0)+v)});
  its.filter(i=>i.kind==="expense").forEach(e=>{const v=toINR(trips.find(t=>t.id===e.tripId),e.cost,e.cur)||0;if(!biggest||v>biggest.v)biggest={v,title:e.title||e.cat};if(e.cat==="Food")foodN++});
  const catList=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const photos=mems.reduce((a,m)=>a+memPhotos(m).length,0),words=mems.reduce((a,m)=>a+(m.text||"").split(/\s+/).filter(Boolean).length,0);
  const mc={};mems.forEach(m=>{if(m.mood)mc[m.mood]=(mc[m.mood]||0)+1});const topMood=Object.entries(mc).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
  const hl=mems.slice().sort((a,b)=>(b.fav?1e6:0)+memPhotos(b).length*500+(b.text||"").length-((a.fav?1e6:0)+memPhotos(a).length*500+(a.text||"").length))[0]||null;
  const acts=its.filter(i=>i.kind==="activity").length;
  const km=Math.round(Math.max(0,airMin-30*flights)/60*800/10)*10;
  const st={days,nights,airMin,trainMin,flights,trains,km,places,cities:places.length,countries:[...ccs],tzCount:tzs.size,shift:Math.round(shift*10)/10,spent,catList,biggest,foodN,mems,photos,words,topMood,hl,acts};
  st.persona=persona(st);return st;
}
function persona(s){
  if(s.mems.length>=6||s.photos>=10)return{n:"The Memory Keeper",t:"You travel twice: once for real, once in the stories you save."};
  if(s.catList[0]?.[0]==="Food"||s.foodN>=6)return{n:"The Food Pilgrim",t:"Every city is a menu. You read the whole thing."};
  if(s.days&&s.acts/s.days>=1.2)return{n:"The Planner",t:"Free slots never stood a chance against you."};
  if(s.cities>=4)return{n:"The Wanderer",t:"One more city, one more train. Always one more."};
  if(s.days>=4&&s.acts/Math.max(1,s.days)<.6)return{n:"The Slow Traveller",t:"You came to be somewhere, not to tick it off."};
  return{n:"The Explorer",t:"A bag, a booking, and an open day. That's enough."};
}
const fH=m=>{const h=Math.floor(m/60),mm=Math.round(m%60);return h?`${h}h ${mm?mm+"m":""}`.trim():`${mm}m`};

/* ---------- canvas helpers ---------- */
const spacing=(c,px)=>{if("letterSpacing"in c)c.letterSpacing=px+"px"};
function wrapLines(c,text,maxW){const words=String(text).split(/\s+/).filter(Boolean),L=[];let l="";for(const w of words){const t=l?l+" "+w:w;if(c.measureText(t).width>maxW&&l){L.push(l);l=w}else l=t}if(l)L.push(l);return L}
function putLines(c,L,x,y,lh,max){const n=Math.min(L.length,max);for(let i=0;i<n;i++){let s=L[i];if(i===n-1&&L.length>max)s=s.replace(/[\s,.;:!?-]*\S*$/,"")+"…";c.fillText(s,x,y+i*lh)}return y+n*lh}
function rrect(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h)}
function cover(c,img,x,y,w,h,r){c.save();rrect(c,x,y,w,h,r);c.clip();const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);c.restore()}
function loadImg(fid){return new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=photoUrl(fid)})}
function wBg(c,W,H,th,seed){
  const g=c.createLinearGradient(0,0,W*.7,H);th.bg.forEach((col,i)=>g.addColorStop(i/(th.bg.length-1),col));c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.strokeStyle=th.accent;c.globalAlpha=.14;c.lineWidth=4;for(let i=0;i<8;i++){c.beginPath();c.arc(W*.96,H*.05+seed*30,150+i*72,0,Math.PI*2);c.stroke()}c.restore();
  let r=seed*9301+49297;const rnd=()=>(r=(r*9301+49297)%233280)/233280;c.fillStyle="#fff";
  for(let i=0;i<80;i++){c.globalAlpha=.04+rnd()*.14;c.beginPath();c.arc(rnd()*W,rnd()*H,rnd()*3+1,0,7);c.fill()}c.globalAlpha=1;
  const v=c.createLinearGradient(0,H*.72,0,H);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.38)");c.fillStyle=v;c.fillRect(0,H*.72,W,H*.28);
}
function wFoot(c,W,H,th,i,n){c.fillStyle=th.dim;c.font=`700 26px ${WF.mono}`;spacing(c,6);c.textAlign="left";c.fillText("TRIP VAULT  ·  WRAPPED",80,H-84);c.textAlign="right";c.fillText(`${i+1} / ${n}`,W-80,H-84);spacing(c,0);c.textAlign="left"}
function eyebrow(c,th,txt,y=250){c.fillStyle=th.accent;c.font=`700 34px ${WF.mono}`;spacing(c,10);c.textAlign="left";c.fillText(txt.toUpperCase(),80,y);spacing(c,0)}
function bigTitle(c,th,txt,y=380,size=92){c.fillStyle=th.ink;c.font=`700 ${size}px ${WF.serif}`;c.textAlign="left";return putLines(c,wrapLines(c,txt,920),80,y,size*1.12,3)}

/* The travel crew, drawn from a still snapshot. Scaled down to fit above the footer; skipped if there's no room. */
function wCrew(c,img,x,top,align){const room=1790-top;if(room<300)return;const s=Math.min(1,room/img.height),w=img.width*s,h=img.height*s;
  c.drawImage(img,align==="right"?x-w:x,top+(room>img.height?room-img.height:0)*.5,w,h)}
/* ---------- card builders: each returns a draw(ctx,W,H,th,D) or null if there is nothing to show ---------- */
function wCards(D){
  const s=D.st,cards=[];
  cards.push({n:"cover",draw:(c,W,H,th)=>{
    eyebrow(c,th,D.multi?"Your travel year, wrapped":"Your trip, wrapped",300);
    c.fillStyle=th.ink;c.font=`700 168px ${WF.serif}`;let y=putLines(c,wrapLines(c,D.title,920),80,560,176,4);
    c.fillStyle=th.dim;c.font=`500 44px ${WF.sans}`;y+=30;c.fillText(D.range,80,y);if(D.sub){y+=64;c.fillText(D.sub,80,y)}
    if(D.crewCheer)wCrew(c,D.crewCheer,60,Math.max(1160,y+40),"left");
    const cx=W-270,cy=H-470;c.save();c.translate(cx,cy);c.rotate(-.21);c.strokeStyle=th.accent;c.lineWidth=9;c.beginPath();c.arc(0,0,180,0,7);c.stroke();c.lineWidth=3;c.setLineDash([10,12]);c.beginPath();c.arc(0,0,158,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle=th.accent;c.textAlign="center";c.font=`800 52px ${WF.mono}`;spacing(c,8);c.fillText("WRAPPED",0,-6);c.font=`700 36px ${WF.mono}`;c.fillText(D.year,0,52);spacing(c,0);c.restore();c.textAlign="left"}});
  const nums=[[s.days,"days"],[s.nights,"nights away"],[s.cities,s.cities===1?"place":"places"],s.countries.length?[s.countries.length,s.countries.length===1?"country":"countries"]:[s.mems.length,"memories"]].filter(x=>x[0]>0);
  if(nums.length>=2)cards.push({n:"numbers",draw:(c,W,H,th)=>{
    eyebrow(c,th,"By the numbers");bigTitle(c,th,"Here's what it added up to.",370,86);
    nums.slice(0,4).forEach(([v,l],i)=>{const x=80+(i%2)*470,y=700+Math.floor(i/2)*420;c.fillStyle=th.panel;rrect(c,x,y,440,380,36);c.fill();
      c.fillStyle=th.ink;c.font=`700 190px ${WF.serif}`;c.textAlign="left";c.fillText(String(v),x+36,y+215);c.fillStyle=th.accent;c.font=`700 30px ${WF.mono}`;spacing(c,6);c.fillText(l.toUpperCase(),x+40,y+300);spacing(c,0)})}});
  if(s.airMin>0||s.trainMin>0)cards.push({n:"motion",draw:(c,W,H,th)=>{
    eyebrow(c,th,"In motion");
    const air=s.airMin>0;c.fillStyle=th.ink;c.font=`700 250px ${WF.serif}`;c.textAlign="left";
    const big=air?String(Math.round(s.airMin/6)/10):String(Math.round(s.trainMin/6)/10);c.fillText(big,80,640);
    c.fillStyle=th.accent;c.font=`700 40px ${WF.mono}`;spacing(c,6);c.fillText((air?"HOURS IN THE AIR":"HOURS ON TRAINS"),80,720);spacing(c,0);
    // dashed flight arc
    c.save();c.strokeStyle=th.ink;c.globalAlpha=.55;c.lineWidth=6;c.setLineDash([4,22]);c.lineCap="round";c.beginPath();c.moveTo(120,1130);c.quadraticCurveTo(540,760,960,1130);c.stroke();c.restore();
    c.fillStyle=th.accent;[[120,1130],[960,1130]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,16,0,7);c.fill()});
    c.save();c.translate(540,945);c.rotate(0);c.fillStyle=th.ink;c.beginPath();c.moveTo(0,-34);c.lineTo(26,22);c.lineTo(0,10);c.lineTo(-26,22);c.closePath();c.fill();c.restore();
    c.fillStyle=th.ink;c.font=`500 48px ${WF.sans}`;let y=1300;const L=[];
    if(s.flights)L.push(`${s.flights} flight${s.flights>1?"s":""}${s.km?`  ·  about ${s.km.toLocaleString("en-IN")} km`:""}`);if(s.trains)L.push(`${s.trains} train ride${s.trains>1?"s":""}  ·  ${fH(s.trainMin)}`);if(s.tzCount>1)L.push(`${s.tzCount} time zones${s.shift>=1?`  ·  up to ${s.shift}h from home`:""}`);
    L.forEach(t=>{c.fillText(t,80,y);y+=78});c.fillStyle=th.dim;c.font=`400 28px ${WF.sans}`;if(s.km)c.fillText("Distance is estimated from flight time.",80,y+20)}});
  if(s.spent>0&&s.catList.length)cards.push({n:"money",draw:(c,W,H,th,D)=>{
    eyebrow(c,th,"Where the money went");const top=s.catList.slice(0,5),mx=top[0][1];
    c.fillStyle=th.ink;c.font=`700 ${D.hide?150:170}px ${WF.serif}`;c.textAlign="left";
    c.fillText(D.hide?top[0][0]:fmtM(s.spent),80,520);c.fillStyle=th.dim;c.font=`500 40px ${WF.sans}`;
    c.fillText(D.hide?`was the biggest slice of your spend`:`in total${s.days?`  ·  about ${fmtM(s.spent/s.days)} a day`:""}`,80,590);
    top.forEach(([k,v],i)=>{const y=720+i*170;c.fillStyle=th.ink;c.font=`600 44px ${WF.sans}`;c.fillText(k,80,y);c.textAlign="right";c.fillStyle=th.accent;c.font=`700 44px ${WF.mono}`;c.fillText(D.hide?Math.round(v/s.spent*100)+"%":fmtM(v),W-80,y);c.textAlign="left";
      c.fillStyle=th.panel;rrect(c,80,y+28,920,30,15);c.fill();c.fillStyle=th.accent;rrect(c,80,y+28,Math.max(30,920*v/mx),30,15);c.fill()});
    if(s.biggest&&!D.hide){c.fillStyle=th.dim;c.font=`400 34px ${WF.sans}`;c.fillText(`Biggest single expense: ${s.biggest.title} (${fmtM(s.biggest.v)})`,80,1640)}}});
  const phIds=s.mems.flatMap(m=>memPhotos(m));
  if(s.mems.length)cards.push({n:"moments",draw:async(c,W,H,th)=>{
    eyebrow(c,th,"Moments");
    const imgs=(await Promise.all(phIds.slice(0,4).map(loadImg))).filter(Boolean);const gx=80,gy=330,gw=920,gh=760;
    if(imgs.length){const cols=imgs.length===1?1:2,rows=imgs.length<=2?1:2,cw=(gw-(cols-1)*16)/cols,ch=(gh-(rows-1)*16)/rows;
      imgs.forEach((im,i)=>{const x=gx+(i%cols)*(cw+16),y=gy+Math.floor(i/cols)*(ch+16);c.save();c.translate(x+cw/2,y+ch/2);c.rotate(((i%3)-1)*.012);c.translate(-cw/2,-ch/2);c.fillStyle="#f5efe2";rrect(c,-10,-10,cw+20,ch+20,10);c.fill();cover(c,im,0,0,cw,ch,4);c.restore()})}
    else{c.fillStyle=th.panel;rrect(c,gx,gy,gw,gh,36);c.fill();c.fillStyle=th.ink;c.font=`italic 700 60px ${WF.serif}`;putLines(c,wrapLines(c,"“"+(s.hl?.text||s.hl?.title||"")+"”",780),150,560,80,6)}
    c.fillStyle=th.ink;c.font=`700 190px ${WF.serif}`;c.fillText(String(s.mems.length),80,1390);const w=c.measureText(String(s.mems.length)).width;
    c.fillStyle=th.accent;c.font=`700 36px ${WF.mono}`;spacing(c,6);c.fillText(s.mems.length===1?"MEMORY":"MEMORIES",80+w+30,1390);
    c.fillStyle=th.dim;c.font=`500 44px ${WF.sans}`;spacing(c,0);c.fillText([s.photos?`${s.photos} photo${s.photos>1?"s":""}`:"",s.words?`${s.words.toLocaleString("en-IN")} words written`:""].filter(Boolean).join("  ·  "),80,1470);
    if(s.topMood){c.fillStyle=MOODS[s.topMood].c;c.font=`700 40px ${WF.mono}`;spacing(c,6);c.fillText("MOSTLY  "+MOODS[s.topMood].n.toUpperCase(),80,1570);spacing(c,0)}}});
  if(s.hl&&(s.hl.text||memPhotos(s.hl).length))cards.push({n:"highlight",draw:async(c,W,H,th)=>{
    eyebrow(c,th,"The highlight");const ph=memPhotos(s.hl)[0];const im=ph?await loadImg(ph):null;let y=330;
    if(im){c.save();c.translate(540,y+330);c.rotate(-.014);c.translate(-460,-330);c.fillStyle="#f5efe2";rrect(c,-12,-12,944,684,10);c.fill();cover(c,im,0,0,920,660,4);c.restore();y=1100}
    c.fillStyle=th.ink;c.font=`700 84px ${WF.serif}`;y=putLines(c,wrapLines(c,s.hl.title||"A moment",920),80,y+(im?0:120),94,2)+14;
    c.fillStyle=th.accent;c.font=`700 30px ${WF.mono}`;spacing(c,5);c.fillText((fmtDs(s.hl.date)+(s.hl.place?"  ·  "+s.hl.place:"")).toUpperCase(),80,y);spacing(c,0);y+=70;
    if(s.hl.text){c.fillStyle=th.ink;c.font=`italic 46px ${WF.serif}`;putLines(c,wrapLines(c,s.hl.text,920),80,y,66,im?5:12)}}});
  cards.push({n:"persona",draw:(c,W,H,th)=>{
    eyebrow(c,th,"Your travel personality",330);c.fillStyle=th.dim;c.font=`500 56px ${WF.sans}`;c.fillText("This time, you were",80,520);
    c.fillStyle=th.accent;c.font=`700 160px ${WF.serif}`;let y=putLines(c,wrapLines(c,s.persona.n,920),80,700,170,3)+30;
    c.fillStyle=th.ink;c.font=`italic 52px ${WF.serif}`;y=putLines(c,wrapLines(c,s.persona.t,880),80,y,72,4)+70;
    const tr=[s.acts?`${s.acts} things planned`:"",s.nights?`${s.nights} nights away`:"",s.foodN?`${s.foodN} meals logged`:"",s.cities>1?`${s.cities} places`:"",s.tzCount>1?`${s.tzCount} time zones`:""].filter(Boolean).slice(0,3);
    tr.forEach(t=>{c.fillStyle=th.panel;rrect(c,80,y,920,104,52);c.fill();c.fillStyle=th.ink;c.font=`600 40px ${WF.sans}`;c.fillText(t,130,y+67);y+=128})}});
  cards.push({n:"outro",draw:(c,W,H,th)=>{
    eyebrow(c,th,"That's a wrap",330);c.fillStyle=th.ink;c.font=`700 150px ${WF.serif}`;let y=putLines(c,wrapLines(c,"Until the next one.",920),80,560,160,3)+40;
    c.fillStyle=th.dim;c.font=`500 44px ${WF.sans}`;if(s.places.length)y=putLines(c,wrapLines(c,s.places.slice(0,8).join("  ·  "),900),80,y,64,4)+40;
    c.fillStyle=th.accent;c.font=`700 34px ${WF.mono}`;spacing(c,7);c.fillText("PLANNED & REMEMBERED PRIVATELY",80,y+30);c.fillText("IN TRIP VAULT",80,y+84);spacing(c,0);
    if(D.crewWave)wCrew(c,D.crewWave,W-80,Math.max(1180,y+140),"right")}});
  return cards;
}

/* ---------- deck + viewer ---------- */
const WR={scope:"trip",theme:0,hide:false,i:0,deck:[],playing:true,timer:null,ov:null,busy:0};
function wScopes(){const cur=curTrip(),sc=[{k:"trip",label:cur?cur.name:"This trip",trips:cur?[cur]:[]}];
  if(S.trips.length>1){const ys=[...new Set(S.trips.map(t=>(tripRange(t).s||"").slice(0,4)).filter(Boolean))].sort().reverse();ys.forEach(y=>sc.push({k:"y"+y,label:`${y} · all trips`,trips:S.trips.filter(t=>(tripRange(t).s||"").startsWith(y)),year:y}));sc.push({k:"all",label:"All time",trips:S.trips.slice()})}return sc}
async function wBuild(){
  const my=++WR.busy,sc=wScopes().find(x=>x.k===WR.scope)||wScopes()[0];if(!sc.trips.length)return[];
  const st=wStats(sc.trips),multi=sc.trips.length>1,rg=sc.trips.map(tripRange).filter(r=>r.s),s0=rg.map(r=>r.s).sort()[0],e0=rg.map(r=>r.e).sort().pop();
  const D={st,multi,hide:WR.hide,title:multi?(sc.year?`${sc.year}, on the road`:"Every trip so far"):sc.trips[0].name,year:(s0||todayIn("Asia/Kolkata")).slice(0,4),
    range:s0?`${fmtDs(s0)} – ${fmtDs(e0)} ${(e0||"").slice(0,4)}`:"",sub:multi?`${sc.trips.length} trips`:sc.trips[0].dest};
  // the current trip's crew cheers on the cover and waves goodbye on the last card (none when characters are off)
  const ct=curTrip();D.crewCheer=await AV.snap(ct,"cheer",620,640).catch(()=>null);D.crewWave=await AV.snap(ct,"wave",520,540).catch(()=>null);
  const cards=wCards(D),th=WTHEMES[WR.theme%WTHEMES.length],deck=[];
  for(let i=0;i<cards.length;i++){const cv=document.createElement("canvas");cv.width=1080;cv.height=1920;const c=cv.getContext("2d");
    wBg(c,1080,1920,th,i+1+WR.theme*3);await cards[i].draw(c,1080,1920,th,D);wFoot(c,1080,1920,th,i,cards.length);deck.push({name:cards[i].n,cv})}
  return my===WR.busy?deck:null;
}
async function openWrapped(scope){
  const t=curTrip();if(!t){toast("Create a trip first","bad");return}
  WR.scope=scope||"trip";WR.i=0;WR.playing=!matchMedia("(prefers-reduced-motion: reduce)").matches;WR.theme=WR.theme||0;
  WR.ov?.remove();const ov=document.createElement("div");ov.className="wr";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Trip Wrapped");WR.ov=ov;document.body.append(ov);
  const scopes=wScopes();
  ov.innerHTML=`<button class="xb" data-w="close" aria-label="Close">${ic("x")}</button><div class="prog" id="wp"></div><div class="stage"><div class="tapz l" data-w="prev"></div><div class="tapz r" data-w="next"></div><div id="wc" style="color:#fff;opacity:.7">Preparing your Wrapped…</div></div>
   <div class="bar3">${scopes.length>1?`<select id="wScope" style="width:auto;background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.22)" aria-label="What to wrap">${scopes.map(x=>`<option value="${x.k}" ${x.k===WR.scope?"selected":""} style="color:#000">${esc(x.label)}</option>`).join("")}</select>`:""}
   <button class="btn" data-w="theme">${ic("palette","sm")} <span id="wTh">${WTHEMES[WR.theme].n}</span></button><button class="btn" data-w="play" id="wPlay">${ic(WR.playing?"pause":"play","sm")}</button>
   <label class="opt"><input type="checkbox" id="wHide" ${WR.hide?"checked":""}> Hide amounts</label>
   <button class="btn" data-w="png">${ic("download","sm")} This card</button><button class="btn" data-w="zip">${ic("layers","sm")} All cards</button>${navigator.canShare?`<button class="btn pri" data-w="share">${ic("share","sm")} Share</button>`:""}<button class="btn" data-w="book">${ic("printer","sm")} Trip book</button></div>`;
  const onKey=e=>{if(!WR.ov)return;if(e.key==="Escape")wClose();else if(e.key==="ArrowRight")wGo(1);else if(e.key==="ArrowLeft")wGo(-1);else if(e.key===" "&&!/input|select/i.test(e.target.tagName)){e.preventDefault();wTogglePlay()}};
  ov._k=onKey;document.addEventListener("keydown",onKey);
  ov.addEventListener("click",e=>{const b=e.target.closest("[data-w]");if(!b)return;({close:wClose,prev:()=>wGo(-1),next:()=>wGo(1),theme:()=>{WR.theme=(WR.theme+1)%WTHEMES.length;wRebuild()},play:wTogglePlay,png:wSaveOne,zip:wSaveZip,share:wShare,book:()=>{wClose();printTripBook()}})[b.dataset.w]?.()});
  ov.addEventListener("change",e=>{if(e.target.id==="wScope"){WR.scope=e.target.value;WR.i=0;wRebuild()}if(e.target.id==="wHide"){WR.hide=e.target.checked;wRebuild()}});
  let sx=0;ov.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});ov.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)wGo(dx<0?1:-1)},{passive:true});
  await wRebuild();
}
async function wRebuild(){const d=await wBuild();if(d===null)return;WR.deck=d;WR.i=Math.min(WR.i,Math.max(0,d.length-1));wShow()}
function wShow(){
  const ov=WR.ov;if(!ov)return;clearTimeout(WR.timer);const host=$("#wc",ov);host.removeAttribute("style");host.innerHTML="";
  if(!WR.deck.length){host.textContent="Nothing to wrap yet — add a trip with bookings or memories.";host.style.color="#fff";return}
  const cv=WR.deck[WR.i].cv;cv.style.animation="none";void cv.offsetWidth;cv.style.animation="";host.append(cv);host.style.cssText="display:contents";
  const dur=6;$("#wp",ov).innerHTML=WR.deck.map((_,i)=>`<i class="${i<WR.i?"done":i===WR.i?"cur":""}" style="--dur:${dur}s"><b></b></i>`).join("");
  ov.classList.toggle("paused",!WR.playing);$("#wPlay",ov).innerHTML=ic(WR.playing?"pause":"play","sm");$("#wTh",ov).textContent=WTHEMES[WR.theme].n;
  if(WR.playing&&WR.i<WR.deck.length-1)WR.timer=setTimeout(()=>wGo(1),dur*1000);
}
function wGo(d){const n=WR.i+d;if(n<0||n>=WR.deck.length)return;WR.i=n;wShow()}
function wTogglePlay(){WR.playing=!WR.playing;wShow()}
function wClose(){clearTimeout(WR.timer);if(WR.ov){document.removeEventListener("keydown",WR.ov._k);WR.ov.remove();WR.ov=null}WR.deck=[]}
const cvBlob=cv=>new Promise(r=>cv.toBlob(r,"image/png"));
const slug=s=>String(s||"trip").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"trip";
async function wSaveOne(){const d=WR.deck[WR.i];if(!d)return;dl(await cvBlob(d.cv),`tripvault-wrapped-${slug(curTrip()?.name)}-${WR.i+1}-${d.name}.png`);toast("Card saved as PNG")}
async function wSaveZip(){toast("Packing your cards…","info");const files=[];for(let i=0;i<WR.deck.length;i++)files.push({name:`${String(i+1).padStart(2,"0")}-${WR.deck[i].name}.png`,data:new Uint8Array(await (await cvBlob(WR.deck[i].cv)).arrayBuffer())});dl(await makeZip(files),`tripvault-wrapped-${slug(curTrip()?.name)}.zip`);toast("All cards saved")}
async function wShare(){try{const files=[];for(let i=0;i<WR.deck.length;i++)files.push(new File([await cvBlob(WR.deck[i].cv)],`wrapped-${i+1}.png`,{type:"image/png"}));if(navigator.canShare({files}))await navigator.share({files,title:"My Trip Wrapped"});else toast("Sharing files isn't supported here — use All cards","info")}catch(e){if(e.name!=="AbortError")toast("Couldn't share — try All cards","bad")}}

/* ---------- minimal store-only ZIP writer ---------- */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function makeZip(files){
  const parts=[],cen=[];let off=0,cs=0;const enc=new TextEncoder(),dt=new Date();
  const T=(dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()>>1),Dd=((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate();
  for(const f of files){const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
    const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(10,T,true);lh.setUint16(12,Dd,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);
    parts.push(lh.buffer,nm,f.data);
    const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(12,T,true);ch.setUint16(14,Dd,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(ch.buffer,nm);cs+=46+nm.length;off+=30+nm.length+sz}
  const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cs,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cen,end.buffer],{type:"application/zip"});
}

/* ---------- CTA on Today / Memories ---------- */
function wrappedCta(t){const ph=tripPhase(t),ms=tripMems(t.id).length,ready=ph.p==="after"||ms>0;
  return`<div class="wrapcta tap" data-a="wrapped" role="button" tabindex="0"><div><div class="eyebrow">${ph.p==="after"?"Your trip is done":"Preview"}</div><div class="ttl">${ph.p==="after"?"Your Trip Wrapped is ready":"See your Trip Wrapped"}</div><div class="small muted">${ready?"Story cards to save and share":"Add memories and bookings to unlock it."}</div></div><span class="go">${ic("play")}</span></div>`}

/* ---------- printable trip book ---------- */
function printTripBook(){
  const t=curTrip();if(!t)return;document.getElementById("book")?.remove();
  const ms=tripMems(t.id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  printBook(`<h1>${esc(t.name)}</h1><p class="bk-sub">${esc(t.dest||"")} · ${tripMeta(t)}</p>
   <h2>Itinerary</h2><pre>${esc(itinText(t))}</pre>
   ${ms.length?`<h2>Memories</h2>${ms.map(m=>`<section class="bk-m"><h3>${esc(m.title||"Moment")}</h3><div class="bk-d">${fmtD(m.date,1)}${m.place?" · "+esc(m.place):""}</div>${m.text?`<p>${esc(m.text)}</p>`:""}<div class="bk-p">${memPhotos(m).map(id=>`<img src="${photoUrl(id)}" alt="">`).join("")}</div></section>`).join("")}`:""}
   <p class="bk-f">Made privately with Trip Vault.</p>`);
}
/* Print an HTML fragment on its own (everything else is hidden by the print stylesheet). */
async function printBook(html){
  document.getElementById("book")?.remove();const b=document.createElement("div");b.id="book";b.innerHTML=html;
  document.body.append(b);document.body.classList.add("printing");
  const done=()=>{document.body.classList.remove("printing");b.remove();removeEventListener("afterprint",done)};addEventListener("afterprint",done);
  await Promise.all([...b.querySelectorAll("img")].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,4000)})));
  setTimeout(()=>print(),150);
}
