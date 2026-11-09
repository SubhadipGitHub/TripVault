"use strict";
/* ===================== Travel crew: chibi three.js characters =====================
   Who's travelling (solo / couple / group, him or her) is drawn as small cartoon characters
   built from primitives with toon shading and outline shells. One WebGL renderer is shared:
   its canvas plays the intro at launch, then moves into the hero slot that render() leaves
   in the page (AV.attach after every render). three.js is loaded on demand from vendor/three. */

/* ---------- who's going ---------- */
const PARTY_N={solo:1,couple:2};
function crewOf(t){
  if(!t)return{party:"solo",crew:["f"]};
  const ok=Array.isArray(t.crew)&&t.crew.length&&t.crew.every(x=>x==="m"||x==="f");
  if(t.party&&ok)return{party:t.party,crew:t.crew.slice(0,6)};
  // guess from the bookings: who is travelling, and him/her where a ticket's title or IRCTC's M/F said so
  const known={};for(const it of tripItems(t.id))for(const[k,v]of Object.entries(it.sex||{}))if(!(k in known)&&(v==="m"||v==="f"))known[k]=v;
  const ppl=tripPeople(t),n=ppl.length,party=n<=1?"solo":n===2?"couple":"group";
  const crew=(n?ppl:[""]).slice(0,6).map(p=>known[p.toLowerCase()]||null);
  if(party==="couple"&&(crew[0]||crew[1])&&!(crew[0]&&crew[1])){const k=crew[0]||crew[1];crew[crew[0]?1:0]=k==="m"?"f":"m"}
  else for(let i=0;i<crew.length;i++)if(!crew[i]){const m=crew.filter(x=>x==="m").length,f=crew.filter(x=>x==="f").length;crew[i]=n<=1||m<=f?"m":"f"}
  return{party,crew};
}
function avSlot(t,cls=""){
  if(!AV.can())return"";const{party,crew}=crewOf(t);
  const lbl=party==="solo"?`Solo traveller`:party==="couple"?"Travelling as a couple":`Group of ${crew.length}`;
  return`<div class="avslot ${party==="solo"?"":"wide"} ${cls}" data-a="avPoke" role="img" aria-label="${lbl}" title="Tap to say hi">${crew.length>4?`<span class="avmore">+${crew.length-4}</span>`:""}</div>`;
}

/* A still picture of the crew for places that can't host the live canvas (empty states).
   Uses the cached image when there is one, otherwise the fallback icon until AV.attach() fills it in. */
const SNAP_W=240,SNAP_H=220;
function crewArt(t,pose,fb){
  if(!AV.can())return fb;const u=AV.cache.get(AV.snapKey(t,pose,SNAP_W,SNAP_H));
  return u?`<img class="avsnap" src="${u}" alt="" aria-hidden="true">`:`<span class="avsnap" data-pose="${pose}" aria-hidden="true">${fb}</span>`;
}

/* ---------- engine ---------- */
const AV={T:null,ld:null,dead:false,r:null,cv:null,sc:null,cam:null,root:null,crew:[],fx:[],key:"",act:null,
  run:false,io:null,slot:null,introOn:false,frame:{W:1,H:1.8,cx:0},clock:0,lastT:0,cache:new Map(),
  rm:matchMedia("(prefers-reduced-motion: reduce)"),
  mode(){const m=S.settings?.anim||"calm";if(m==="off")return"off";if(this.rm.matches)return"still";return m},
  can(){return!this.dead&&this.mode()!=="off"&&!!window.WebGLRenderingContext},
  load(){
    if(this.T)return Promise.resolve(this.T);
    return this.ld||(this.ld=import(new URL("vendor/three/three.module.min.js",document.baseURI).href).then(T=>{
      this.T=T;
      try{this.r=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"})}
      catch(e){this.fail();throw e}
      this.r.setPixelRatio(Math.min(devicePixelRatio||1,2));this.r.outputColorSpace=T.SRGBColorSpace;
      this.cv=this.r.domElement;this.cv.className="avcv";this.cv.setAttribute("aria-hidden","true");
      this.cv.addEventListener("webglcontextlost",e=>{e.preventDefault();this.fail()});
      this.sc=new T.Scene();this.cam=new T.PerspectiveCamera(26,1,.1,60);
      this.sc.add(new T.HemisphereLight(0xffffff,0x8a7a9a,1.35));
      const d=new T.DirectionalLight(0xffffff,2.1);d.position.set(2.5,4,5);this.sc.add(d);
      const g=new T.DataTexture(new Uint8Array([110,190,255]),3,1,T.RedFormat);g.minFilter=g.magFilter=T.NearestFilter;g.needsUpdate=true;this.grad=g;
      this.mats={};return T}).catch(e=>{this.fail();throw e}));
  },
  fail(){this.dead=true;this.stop();$$(".avslot").forEach(e=>e.classList.add("gone"))},

  /* ----- materials & part helpers ----- */
  m(col){const k="t"+col;return this.mats[k]||(this.mats[k]=new this.T.MeshToonMaterial({color:new this.T.Color(col),gradientMap:this.grad}))},
  mb(col,op=1){const k="b"+col+op;return this.mats[k]||(this.mats[k]=new this.T.MeshBasicMaterial({color:new this.T.Color(col),transparent:op<1,opacity:op,depthWrite:op>=1}))},
  ol(){return this.mats.ol||(this.mats.ol=new this.T.MeshBasicMaterial({color:0x1d1626,side:this.T.BackSide}))},
  part(geo,col,rad,parent,pos,scl,out=true){
    const T=this.T,me=new T.Mesh(geo,this.m(col));if(pos)me.position.set(...pos);if(scl)me.scale.set(...scl);
    if(out&&rad){const o=new T.Mesh(geo,this.ol());o.scale.setScalar(1+.022/rad);me.add(o)}
    parent.add(me);return me},
  geo(){const T=this.T;if(this.G)return this.G;const S2=(r,a,b)=>new T.SphereGeometry(r,24,16,0,Math.PI*2,a||0,b||Math.PI);
    const hs=new T.Shape();hs.moveTo(5,5);hs.bezierCurveTo(5,5,4,0,0,0);hs.bezierCurveTo(-6,0,-6,7,-6,7);hs.bezierCurveTo(-6,11,-3,15.4,5,19);hs.bezierCurveTo(12,15.4,16,11,16,7);hs.bezierCurveTo(16,7,16,0,10,0);hs.bezierCurveTo(7,0,5,5,5,5);
    const heart=new T.ShapeGeometry(hs);heart.center();heart.rotateZ(Math.PI);heart.scale(.012,.012,.012);
    const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(.42,-.11);flag.lineTo(0,-.24);flag.closePath();
    const dress=new T.LatheGeometry([[0,0],[.31,0],[.27,.12],[.2,.3],[.17,.42],[0,.42]].map(([x,y])=>new T.Vector2(x,y)),24);
    const pl=new T.BufferGeometry();pl.setAttribute("position",new T.Float32BufferAttribute([.45,0,0,-.3,0,.28,-.3,-.02,0, .45,0,0,-.3,-.02,0,-.3,0,-.28, .45,0,0,-.3,-.02,0,-.3,-.11,0],3));pl.computeVertexNormals();
    return this.G={head:S2(.42),cap:S2(.445,0,Math.PI*.5),sph:S2(1),torso:new T.CylinderGeometry(.17,.23,.36,24),hips:new T.CylinderGeometry(.215,.235,.16,24),
      leg:new T.CylinderGeometry(.075,.07,.3,16),arm:new T.CapsuleGeometry(.062,.2,6,12),cone:new T.ConeGeometry(.07,.17,12),
      ring:new T.TorusGeometry(.065,.012,8,24),smile:new T.TorusGeometry(.045,.013,8,16,Math.PI),blush:new T.CircleGeometry(.06,20),
      box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,20),brim:new T.CylinderGeometry(1,1,.02,28),handle:new T.TorusGeometry(.09,.018,8,16,Math.PI),
      heart,flag:new T.ShapeGeometry(flag),dress,plane:pl,shadow:new T.CircleGeometry(.36,28),disc:new T.CylinderGeometry(2.2,2.3,.12,48),confetti:new T.PlaneGeometry(.05,.08)}},

  /* ----- one character ----- */
  person(sex,rnd,acc){
    const T=this.T,G=this.geo(),pick=a=>a[Math.floor(rnd()*a.length)];
    const skin=pick(["#ffe0c7","#f6cfae","#eab792","#cf9a73","#a8724c","#7d5236"]);
    const hair=pick(["#2b1d16","#3d2a1f","#6b3f24","#1e1d2c","#b97834","#d9a95a","#8a3b2b"]);
    const OUT=["#ff7a59","#62a8ff","#b794ff","#3cd0c8","#62d98f","#f4c95d","#ff7a9c","#e8c547","#4fb8e8","#f2efe6"];
    const top=pick(OUT),bottom=pick(["#2f3a56","#3f5f8f","#6b5a45","#2d2d35","#8c6f50","#46607a"]),shoe=pick(["#f4f1ea","#2d2d35","#c0483a","#3d5a80"]);
    const root=new T.Group(),body=new T.Group();root.add(body);
    const P=(g,c,r,par,pos,s,o)=>this.part(g,c,r,par||body,pos,s,o);
    // legs + shoes (pivot at the hip)
    const legs=[-1,1].map(sx=>{const g=new T.Group();g.position.set(.1*sx,.36,0);body.add(g);
      P(G.leg,sex==="f"?skin:bottom,.075,g,[0,-.15,0]);P(G.sph,shoe,.085,g,[0,-.31,.03],[.085,.06,.12]);return g});
    // clothes
    if(sex==="f"&&rnd()<.6){P(G.dress,top,.25,null,[0,.36,0]);P(G.torso,top,.2,null,[0,.6,0],[1,1,1])}
    else{P(G.torso,top,.2,null,[0,.6,0]);P(G.hips,sex==="f"?pick(["#e86a8a","#3f5f8f","#8b6fd6"]):bottom,.22,null,[0,.4,0])}
    // arms (pivot at the shoulder)
    const arms=[-1,1].map(sx=>{const g=new T.Group();g.position.set(.25*sx,.75,0);g.rotation.z=.14*sx;body.add(g);
      P(G.arm,top,.062,g,[0,-.15,0]);P(G.sph,skin,.075,g,[0,-.31,0],[.075,.075,.075]);return g});
    // head
    const head=new T.Group();head.position.set(0,1.1,0);body.add(head);
    P(G.head,skin,.42,head,[0,0,0],[1.04,.96,1]);
    const eyes=[-1,1].map(sx=>{const e=new T.Group();e.position.set(.15*sx,-.03,.36);head.add(e);
      P(G.sph,"#1d1626",0,e,[0,0,0],[.062,.08,.04],false);this.part(G.sph,"#ffffff",0,e,[.018,.028,.03],[.022,.022,.02],false).material=this.mb("#ffffff");return e});
    [-1,1].forEach(sx=>{const b=new T.Mesh(G.blush,this.mb("#ff7d96",.5));b.position.set(.25*sx,-.14,.33);b.rotation.y=.62*sx;head.add(b)});
    const mo=new T.Mesh(G.smile,this.mb("#5a2630"));mo.position.set(0,-.15,.395);mo.rotation.z=Math.PI;head.add(mo);
    // hair
    const cap=P(G.cap,hair,.445,head,[0,.02,-.02]);cap.rotation.x=-.42;
    if(sex==="m"){for(let i=0;i<5;i++){const c=P(G.cone,hair,.07,head,[(i-2)*.11,.4-Math.abs(i-2)*.04,.18]);c.rotation.set(.9,0,(i-2)*-.35)}}
    else{P(G.sph,hair,.46,head,[0,-.06,-.1],[.46,.48,.4]);const st=rnd();
      if(st<.4){P(G.sph,hair,.16,head,[0,-.2,-.48],[.15,.26,.15]);P(G.ring,acc,.065,head,[0,-.02,-.43],[1,1,1]).rotation.x=.3}
      else if(st<.7)P(G.sph,hair,.17,head,[0,.43,-.14],[.17,.16,.17]);
      else P(G.sph,hair,.4,head,[0,-.45,-.17],[.38,.36,.24])}
    // accessories, seeded so each trip gets its own look
    const r2=rnd();
    if(r2<.18&&sex==="m"){P(G.sph,acc,.45,head,[0,.12,0],[.455,.3,.455]);P(G.brim,acc,.3,head,[0,.17,.25],[.3,1,.22])}
    else if(r2<.3&&sex==="f"){P(G.brim,"#f3dfb0",.6,head,[0,.3,0],[.62,1,.62]);P(G.sph,"#f3dfb0",.3,head,[0,.33,0],[.3,.2,.3]);P(G.cyl,acc,.3,head,[0,.34,0],[.31,.05,.31])}
    if(rnd()<.22)[-1,1].forEach(sx=>P(G.ring,"#1d1626",0,head,[.15*sx,-.03,.4],[1,1,1],false));
    const sh=new T.Mesh(G.shadow,this.mb("#000000",.18));sh.rotation.x=-Math.PI/2;sh.position.y=.003;root.add(sh);
    return{root,body,head,eyes,arms,legs,sex,ph:rnd()*6,blink:1+rnd()*3,home:new T.Vector3(),hold:0};
  },

  /* ----- scene for a trip ----- */
  build(t,intro){
    const T=this.T,G=this.geo();if(this.root){this.sc.remove(this.root)}this.fx=[];
    const{party,crew}=crewOf(t),seed=hashStr((t?.id||"welcome")+crew.join("")),cs=getComputedStyle(document.documentElement);
    const acc=(cs.getPropertyValue("--acc").trim()||"#ff7a59"),brass=(cs.getPropertyValue("--brass").trim()||"#e6b95f");
    const root=new T.Group();this.root=root;this.sc.add(root);this.party=party;this.intl=t?isIntlTrip(t):true;
    const n=Math.min(4,crew.length),gap=party==="couple"?.72:.66;
    this.crew=crew.slice(0,n).map((sx,i)=>{const c=this.person(sx,rng(seed+i*7919),acc);const x=(i-(n-1)/2)*gap,z=party==="group"?-Math.abs(i-(n-1)/2)*.18:0;
      c.home.set(x,0,z);c.root.position.copy(c.home);c.root.rotation.y=-x*.22;if(party==="group")c.root.scale.setScalar(.92);root.add(c.root);return c});
    // couple: inner hands meet in the middle
    if(party==="couple"){this.crew[0].hold=1;this.crew[1].hold=-1}
    const last=this.crew[this.crew.length-1],lx=last.home.x+(party==="solo"?.62:.58);
    // luggage: suitcase abroad, duffel at home; solo also wears a backpack
    if(this.intl){const s=new T.Group();s.position.set(lx,0,.05);s.rotation.y=-.4;root.add(s);
      this.part(G.box,acc,.2,s,[0,.3,0],[.36,.5,.2]);this.part(G.cyl,brass,0,s,[-.1,.43,.105],[.05,.006,.05],false).rotation.x=Math.PI/2;
      this.part(G.box,"#f4f1ea",0,s,[.07,.22,.105],[.12,.08,.01],false);this.part(G.handle,"#2d2d35",.1,s,[0,.55,0]);
      [-1,1].forEach(k=>this.part(G.sph,"#2d2d35",0,s,[.12*k,.03,0],[.04,.04,.04],false))}
    else{const d=this.part(G.arm,acc,.12,root,[lx,.13,.05],[1.9,1.4,1.9]);d.rotation.z=Math.PI/2;this.part(G.handle,"#2d2d35",.1,root,[lx,.25,.05])}
    if(party==="solo"){const c=this.crew[0];this.part(G.box,brass,.15,c.body,[0,.62,-.25],[.34,.4,.18]);this.part(G.box,"#2d2d35",0,c.body,[.06,.6,.24],[.12,.08,.06],false);this.part(G.cyl,"#1d1626",0,c.body,[.06,.6,.28],[.03,.04,.03],false).rotation.x=Math.PI/2}
    if(party==="group"){const c=this.crew[0],p=new T.Group();p.position.set(0,-.3,0);p.rotation.z=Math.PI;c.arms[0].add(p);this.part(G.cyl,"#6b5a45",0,p,[0,.4,0],[.015,.95,.015],false);
      const f=new T.Mesh(G.flag,this.mb(acc));f.material.side=T.DoubleSide;f.position.set(0,.86,0);p.add(f);this.pennant=f;c.flag=1}
    else this.pennant=null;
    // intro set: ground disc, clouds, and a plane (abroad) or train (at home) crossing behind
    this.extra=null;if(intro){const e=new T.Group();root.add(e);this.extra=e;
      const disc=this.part(G.disc,"#6fbf73",2.2,e,[0,-.07,0]);disc.material=this.m("#79c47b");
      for(let i=0;i<3;i++){const cl=new T.Group();cl.position.set(-2.4+i*2.2,1.9+(i%2)*.35,-2.6);e.add(cl);[[0,0,.32],[.3,.05,.26],[-.3,-.02,.24],[.12,.17,.24]].forEach(([x,y,r])=>this.part(G.sph,"#ffffff",0,cl,[x,y,0],[r,r*.85,r],false))}
      if(this.intl){const pl=this.part(G.plane,"#f8f6f0",0,e,[-3,2,-1.2],[1.1,1.1,1.1],false);pl.material=this.m("#f8f6f0").clone();pl.material.side=T.DoubleSide;this.mover=pl}
      else{const tr=new T.Group();tr.position.set(-4,.05,-2.2);tr.scale.setScalar(.7);e.add(tr);[0,1,2].forEach(i=>{this.part(G.box,i?"#f4f1ea":acc,.3,tr,[-i*.95,.35,0],[.85,.5,.5]);
        [-.25,.25].forEach(k=>this.part(G.cyl,"#2d2d35",0,tr,[-i*.95+k,.08,.26],[.09,.04,.09],false).rotation.x=Math.PI/2)});this.mover=tr}}
    else this.mover=null;
    const xs=this.crew.map(c=>c.home.x);this.frame={cx:(Math.min(...xs)+lx)/2,W:(lx+.3)-(Math.min(...xs)-.35),H:party==="group"?2.05:1.62};
    this.pose(0);
  },
  fit(w,h,wide,pad=1){this.r.setSize(w,h,false);const c=this.cam,f=this.frame,k=Math.tan(c.fov*Math.PI/360);c.aspect=w/h;
    const W=f.W*(wide?1.9:1.12),H=f.H*(wide?1.55:1.16),d=Math.max(H/2/k,W/2/(k*c.aspect))*pad;
    c.position.set(f.cx,f.H*.56+.18,d);c.lookAt(f.cx,f.H*.47,0);c.updateProjectionMatrix()},

  /* ----- animation ----- */
  pose(t){
    const A=this.act,p=A?Math.min(1,(t-A.t0)/A.dur):0;
    for(const c of this.crew){const ph=c.ph,b=c.body;let y=Math.sin(t*2.2+ph)*.015,armZ=[-.14,.14],armX=[0,0],legX=[0,0],x=c.home.x;
      b.scale.y=1+Math.sin(t*2.2+ph)*.012;c.head.rotation.z=Math.sin(t*.9+ph)*.07;c.head.rotation.x=Math.sin(t*.6+ph)*.03;
      if(c.hold){armZ[c.hold>0?1:0]=c.hold>0?.42:-.42}
      if(c.flag)armZ[0]=-2.35+Math.sin(t*3)*.12;
      if(A?.type==="walk"){const q=1-Math.pow(1-p,2);x=c.home.x-2.8*(1-q);const s=Math.sin(t*11+ph*.1)*(1-p*.6);legX=[s*.65,-s*.65];armX=[-s*.5,s*.5];y+=Math.abs(Math.sin(t*11))*.05*(1-p)}
      else if(A&&(A.type==="cheer"||A.type==="hop")){const hops=A.type==="cheer"?2:1;y+=Math.abs(Math.sin(p*Math.PI*hops))*(A.type==="cheer"?.3:.18);
        if(A.type==="cheer"&&!c.flag){armZ=[-2.5-Math.sin(t*14)*.15,2.5+Math.sin(t*14)*.15]}legX=[Math.sin(p*Math.PI*hops)*.35,Math.sin(p*Math.PI*hops)*.35]}
      else if(A?.type==="wave"&&c===this.crew[this.crew.length-1]){armZ[1]=2.6+Math.sin(t*16)*.35}
      c.root.position.set(x,y,c.home.z);c.arms.forEach((a,i)=>{a.rotation.z+=(armZ[i]-a.rotation.z)*.35;a.rotation.x=armX[i]});c.legs.forEach((l,i)=>l.rotation.x=legX[i]);
      // blink
      const bl=((t+c.blink)%3.6)<.12;c.eyes.forEach(e=>e.scale.y=bl?.12:1)}
    if(this.pennant)this.pennant.rotation.y=Math.sin(t*4)*.35;
    if(this.mover){const m=this.mover,k=((t-(this.introT0||0))/2.4);if(this.intl){m.position.set(-3.2+k*6.4,1.65+Math.sin(k*Math.PI)*.45,-1.2);m.rotation.set(Math.sin(t*3)*.15,0,Math.cos(k*Math.PI)*.25)}else m.position.x=-4+k*8.5;
      this.extra.children.forEach((ch,i)=>{if(ch.type==="Group"&&ch!==m)ch.position.x+=.002*(i%2?1:-1)})}
    if(A&&p>=1){this.act=null;if(A.done)A.done()}
  },
  burst(kind){const T=this.T,G=this.geo(),cs=getComputedStyle(document.documentElement);
    const cols=["--acc","--brass","--flight","--hotel","--activity","--expense"].map(v=>cs.getPropertyValue(v).trim()||"#ff7a59");
    const n=kind==="hearts"?5:18,cx=this.frame.cx;
    for(let i=0;i<n;i++){const me=new T.Mesh(kind==="hearts"?G.heart:G.confetti,this.mb(kind==="hearts"?"#ff5c7a":cols[i%cols.length]).clone());me.material.transparent=true;me.material.side=T.DoubleSide;
      me.position.set(cx+(Math.random()-.5)*(kind==="hearts"?.5:this.frame.W),kind==="hearts"?1.2:this.frame.H+.2,.3);this.root.add(me);
      this.fx.push({me,vx:(Math.random()-.5)*.6,vy:kind==="hearts"?.55+Math.random()*.3:-(.5+Math.random()*.6),spin:(Math.random()-.5)*8,life:kind==="hearts"?1.8:1.6,age:-i*(kind==="hearts"?.18:.02)})}},
  stepFx(dt){this.fx=this.fx.filter(f=>{f.age+=dt;if(f.age<0){f.me.visible=false;return true}f.me.visible=true;f.me.position.x+=f.vx*dt;f.me.position.y+=f.vy*dt;f.me.rotation.z+=f.spin*dt*(f.vy<0?1:.1);
    f.me.material.opacity=Math.max(0,1-f.age/f.life);if(f.age>=f.life){this.root.remove(f.me);f.me.material.dispose();return false}return true})},
  tick(ms){const t=ms/1000,dt=Math.min(.05,t-(this.lastT||t));this.lastT=t;this.clock=t;
    if(!this.cv.isConnected){this.stop();return}
    // ambient life in the hero: couples send a heart now and then, solo travellers wave
    if(!this.introOn&&!this.act&&t>(this.nextAmb||0)){this.nextAmb=t+5+Math.random()*4;if(this.party==="couple")this.burst("hearts");else if(this.party==="solo")this.play("wave",1.2)}
    this.pose(t);this.stepFx(dt);this.r.render(this.sc,this.cam)},
  start(){if(this.mode()==="still"){this.pose(1.3);this.r.render(this.sc,this.cam);return}
    if(this.run||document.hidden)return;this.run=true;this.lastT=0;this.r.setAnimationLoop(ms=>this.tick(ms))},
  stop(){if(this.r)this.r.setAnimationLoop(null);this.run=false},
  play(type,dur,done){this.act={type,t0:this.clock||performance.now()/1000,dur,done};if(type==="cheer")this.burst(this.party==="couple"?"hearts":"confetti")},

  /* ----- hero slot: called after every render() ----- */
  attach(){
    if(this.introOn)return;
    this.fillSnaps();
    const slot=$(".avslot:not(.gone)");
    if(!slot||!this.can()){this.stop();this.io?.disconnect();this.slot=null;return}
    if(!this.r){this.load().then(()=>this.attach(),()=>{});return}
    const t=slot.closest(".welcome")?null:curTrip(),{crew}=crewOf(t),key=(t?.id||"welcome")+":"+crew.join("")+(t?isIntlTrip(t):"");
    if(key!==this.key){const had=this.key;this.key=key;this.build(t,false);if(had&&this.mode()!=="still")this.play(this.pendCheer?"cheer":"hop",this.pendCheer?1.2:.6)}
    else if(this.pendCheer)this.play("cheer",1.2);
    this.pendCheer=false;
    if(this.cv.parentNode!==slot)slot.append(this.cv);
    this.fit(slot.clientWidth||96,slot.clientHeight||96,false);
    if(this.slot!==slot){this.slot=slot;this.io?.disconnect();
      if(window.IntersectionObserver){this.io=new IntersectionObserver(es=>{const v=es.some(e=>e.isIntersecting);if(v)this.start();else this.stop()});this.io.observe(slot)}}
    this.start()},
  cheer(){this.pendCheer=true},
  poke(){if(this.mode()==="still"||!this.r)return;this.play(this.party==="solo"?"wave":"cheer",this.party==="solo"?1.2:1.1)},

  /* ----- still snapshots: render a crew once into a 2D canvas, then put the live crew back ----- */
  snapKey(t,pose,w,h){const{crew}=crewOf(t);return[t?.id||"welcome",crew.join(""),t?isIntlTrip(t):"",pose,w,h,getComputedStyle(document.documentElement).getPropertyValue("--acc").trim()].join("|")},
  async snap(t,pose,w,h){
    if(!this.can())return null;try{await this.load()}catch(e){return null}if(this.dead||this.introOn)return null;
    // everything below runs in one task, so the hero never shows the snapshot frame
    const KEEP=["root","crew","party","intl","pennant","extra","mover","frame","act","fx"],sv={};KEEP.forEach(k=>sv[k]=this[k]);
    const size=this.r.getSize(new this.T.Vector2()),pr=this.r.getPixelRatio();
    if(sv.root)sv.root.visible=false;this.root=null;this.fx=[];
    let out=null;
    try{this.build(t,false);const tmp=this.root;
      this.act=pose==="idle"?null:{type:pose,t0:0,dur:1};const at=pose==="cheer"?.25:.5;
      for(let i=0;i<16;i++)this.pose(at); // let the eased arm angles settle on the frozen pose
      this.crew.forEach(c=>c.eyes.forEach(e=>e.scale.y=1));
      this.r.setPixelRatio(1);this.fit(w,h,false,1.3);this.r.render(this.sc,this.cam);
      out=document.createElement("canvas");out.width=w;out.height=h;out.getContext("2d").drawImage(this.cv,0,0,w,h);
      this.sc.remove(tmp)}
    catch(e){out=null}
    finally{KEEP.forEach(k=>this[k]=sv[k]);if(this.root)this.root.visible=true;
      this.r.setPixelRatio(pr);this.r.setSize(size.x||1,size.y||1,false);
      if(this.root&&size.x){this.fit(size.x,size.y,false);this.r.render(this.sc,this.cam)}}
    return out},
  async snapURL(t,pose,w,h){const k=this.snapKey(t,pose,w,h);if(this.cache.has(k))return this.cache.get(k);
    const c=await this.snap(t,pose,w,h);if(!c)return null;const u=c.toDataURL("image/png");
    this.cache.set(k,u);if(this.cache.size>12)this.cache.delete(this.cache.keys().next().value);return u},
  fillSnaps(){const ph=$$("span.avsnap[data-pose]:not([data-busy])");if(!ph.length||!this.can())return;
    const t=curTrip();ph.forEach(async el=>{el.dataset.busy="1";const u=await this.snapURL(t,el.dataset.pose,SNAP_W,SNAP_H);
      if(u&&el.isConnected){const im=new Image();im.className="avsnap";im.alt="";im.setAttribute("aria-hidden","true");im.src=u;el.replaceWith(im)}})},

  /* ----- launch intro: crew walks in, cheers, then shrinks into the hero slot ----- */
  async intro(t){
    if(this.mode()!=="full"||this.introOn)return;
    try{if(sessionStorage.getItem("tv-intro"))return;sessionStorage.setItem("tv-intro","1")}catch(e){}
    const q=new URLSearchParams(location.search);if(q.has("a")||q.has("share"))return;
    try{await this.load()}catch(e){return}
    this.introOn=true;this.stop();
    const{party}=crewOf(t),wide=party!=="solo",dest=t?(t.dest||t.name||"").split(",")[0].trim():"";
    const ov=document.createElement("div");ov.className="avintro";ov.setAttribute("role","presentation");
    ov.innerHTML=`<div class="bgl"></div><div class="stage ${wide?"wide":""}"></div><div class="cap"><b>${esc(dest?`Ready for ${dest}?`:"Welcome aboard")}</b><small>Tap to skip</small></div>`;
    document.body.append(ov);const stage=$(".stage",ov);stage.append(this.cv);
    this.key=(t?.id||"welcome")+":"+crewOf(t).crew.join("")+(t?isIntlTrip(t):"");this.build(t,true);
    this.fit(stage.clientWidth,stage.clientHeight,true);
    let ended=false;const finish=fast=>{if(ended)return;ended=true;clearTimeout(tm1);clearTimeout(tm2);removeEventListener("keydown",onKey,true);
      const slot=$(".avslot:not(.gone)"),a=stage.getBoundingClientRect(),b=slot?.getBoundingClientRect();ov.classList.add("out");
      // push the camera in to the hero framing while the stage shrinks, so the hand-off doesn't jump
      if(this.extra)this.extra.visible=false;this.fit(stage.clientWidth,stage.clientHeight,false);
      const done=()=>{if(!ov.isConnected)return;ov.remove();this.introOn=false;this.stop();
        if(this.extra){this.root.remove(this.extra);this.extra=null;this.mover=null}this.act=null;this.key="";this.attach()};
      if(b&&b.width&&b.bottom>0&&b.top<innerHeight){stage.style.transition=`transform ${fast?.28:.5}s cubic-bezier(.5,0,.2,1)`;
        stage.style.transform=`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${b.width/a.width},${b.height/a.height})`}
      else stage.style.opacity="0";
      setTimeout(done,fast?320:540)};
    const onKey=e=>{if(e.key==="Escape"||e.key===" "||e.key==="Enter"){e.preventDefault();finish(true)}};
    ov.addEventListener("click",()=>finish(true));addEventListener("keydown",onKey,true);
    this.run=false;this.lastT=0;this.r.setAnimationLoop(ms=>{this.clock=ms/1000;if(!this.introT0){this.introT0=ms/1000;this.play("walk",1.25,()=>this.play("cheer",1.1))}this.tick(ms)});
    const tm1=setTimeout(()=>finish(false),2350),tm2=setTimeout(()=>finish(true),3000);
    this.introT0=0;
  }
};
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
document.addEventListener("visibilitychange",()=>{if(document.hidden)AV.stop();else if(AV.slot?.isConnected&&!AV.introOn)AV.start()});
