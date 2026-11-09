"use strict";
/* ===================== Account button (far right of the header) and its menu =====================
   Everyone has a profile: an offline one on this device (just a name, optional), which shows Google
   sync status once Google is connected. The menu holds the account, Settings, Privacy and About. */
const profName=()=>String(S.settings?.profile?.name||"").trim().slice(0,60);
const TV_VERSION="2.0";

function closeAcctMenu(){$$(".pmov").forEach(o=>o.remove());$("#gsPill")?.setAttribute("aria-expanded","false")}
function openAcctMenu(){
  if($(".pmov")){closeAcctMenu();return}
  const on=gsOn(),L=gsLinked(),[st,,tip]=gsOverall(),nm=profName(),who=on?GS.email:"";
  const item=(id,icn,lbl,sub,cls="")=>`<button class="pm-i ${cls}" role="menuitem" data-pm="${id}">${ic(icn,"sm")}<span><b>${lbl}</b></span></button>`;
  const head=`<button class="pm-h pm-hb" role="menuitem" data-pm="profile" title="Edit your profile">${gsAv(on?(who||nm):nm,"lg")}<div class="b"><div class="t">${esc(nm||(on?gsName(who):"Your profile"))}</div>
     <div class="small muted">${on?esc(who):"Offline profile · data on this device only"}</div>
     ${on||L.length?`<div class="pm-st" data-s="${st}"><span class="gsdot"></span>${esc(tip)}</div>`:""}</div></button>`;
  const g=gsReady()?(on?item("sync","share","Sync, sharing &amp; devices","Choose trips, people, recent changes")
      :item("connect","unlock",L.length?"Reconnect Google":"Connect Google Drive",L.length?"Your shared trips are paused":"Sync trips to your Drive and share them","hi")):"";
  const ov=document.createElement("div");ov.className="pmov";
  ov.innerHTML=`<div class="pmenu" role="menu" aria-label="Account menu">${head}<div class="pm-l">${g}
    ${item("settings","sliders","Settings","")}${canOfferInstall()?item("install","download","Install app","",INST.evt?"hi":""):""}${item("privacy","shield","Privacy &amp; your data","")}${item("help","info","Help &amp; about","")}
    ${on?item("out","x","Disconnect Google",""):""}</div></div>`;
  document.body.append(ov);$("#gsPill")?.setAttribute("aria-expanded","true");
  const p=$("#gsPill")?.getBoundingClientRect();if(p&&innerWidth>560){const m=$(".pmenu",ov);m.style.top=Math.round(p.bottom+8)+"px";m.style.right=Math.max(8,Math.round(innerWidth-p.right))+"px"}
  $(".pm-l .pm-i",ov)?.focus({preventScroll:true});
  ov.addEventListener("keydown",e=>{if(e.key==="Escape"){closeAcctMenu();$("#gsPill")?.focus()}
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){const b=$$("[data-pm]",ov),i=b.indexOf(document.activeElement);b[(i+(e.key==="ArrowDown"?1:-1)+b.length)%b.length]?.focus();e.preventDefault()}});
  ov.addEventListener("click",async e=>{const b=e.target.closest("[data-pm]");if(!b){if(!e.target.closest(".pmenu"))closeAcctMenu();return}
    const k=b.dataset.pm;closeAcctMenu();
    if(k==="sync")openSettings("sync");else if(k==="connect")gsConnect();else if(k==="profile")openProfile();else if(k==="settings")openSettings();
    else if(k==="privacy")openSettings("privacy");else if(k==="help")openHelp();else if(k==="install")openInstall();
    else if(k==="out"){GAuth.revoke();gsPaint();render();toast("Disconnected from Google. Shared trips pause until you connect again","info")}})}

function openProfile(){
  const nm=profName(),on=gsOn();
  const ov=sheet({title:`${ic("user")} Profile`,body:`
   <div class="row" style="gap:12px;align-items:center"><span id="prAv">${gsAv(on?GS.email||nm:nm,"lg")}</span><div class="sp"><label for="prName">Your name</label><input id="prName" maxlength="60" autocomplete="name" placeholder="Riya" value="${esc(nm)}"></div></div>
   <div class="small dim mt">${ic("lock","sm")} Stored only on this device</div>
   <div class="h mt">${ic("share")}<h2>Google account</h2></div>
   ${!gsReady()?`<div class="small muted">Not available in this copy</div>`
     :on?`<div class="li">${gsAv(GS.email)}<div class="b"><div class="t">${esc(GS.email)}</div><div class="d">Connected for this session · ${gsLinked().length} trip(s) syncing</div></div><button class="btn xs" id="prSync">${ic("share","sm")} Sync &amp; sharing</button></div>`
     :`<div class="row"><span class="small muted sp">Offline profile</span><button class="btn xs pri" id="prConn">${ic("unlock","sm")} Connect Google Drive</button></div>`}`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="prSv">Save</button>`});
  $("#prName",ov).oninput=e=>{$("#prAv",ov).innerHTML=gsAv(on?GS.email||e.target.value.trim():e.target.value.trim(),"lg")};
  $("#prSync",ov)?.addEventListener("click",()=>{ov.remove();openSettings("sync")});
  $("#prConn",ov)?.addEventListener("click",()=>{ov.remove();gsConnect()});
  $("#prSv",ov).onclick=async()=>{const n=$("#prName",ov).value.trim().slice(0,60);S.settings={...S.settings,profile:{...(S.settings.profile||{}),name:n}};
    await DB.put("meta",{k:"settings",v:S.settings});ov.remove();gsPillPaint();render();toast(n?`Profile saved · ${esc(n)}`:"Profile saved")}}

function openAbout(){
  sheet({title:`${ic("info")} About Trip Vault`,body:`
   <div class="row" style="gap:12px;align-items:center"><div class="mk" style="width:44px;height:44px"><svg class="ic"><use href="#i-plane"/></svg></div><div><div style="font:700 18px/1.2 var(--serif,serif)">Trip Vault</div><div class="small muted">Version ${TV_VERSION} · free and open source</div></div></div>
   <p class="small" style="line-height:1.6">A private travel organiser that runs in your browser and works offline. No server, accounts, analytics or ads.</p>
   <div class="small muted"><a href="${TV_ISSUES}" target="_blank" rel="noopener noreferrer">Help &amp; feedback</a> · <a href="${TV_REPO}" target="_blank" rel="noopener noreferrer">Source code</a></div>
   <div class="h mt">${ic("book")}<h2>Built with</h2></div>
   <div class="small muted">three.js (MIT) for the travel crew, QR Code Generator by Kazuhiko Arase (MIT) and jsQR (Apache 2.0) for phone-to-phone transfer, and tesseract.js (Apache 2.0) for reading screenshots. They are bundled with the app, so nothing loads from elsewhere. Google Drive is used only if you connect it.</div>
   <div class="row wrap mt" style="gap:6px"><button class="btn" data-a="privacyNotice">${ic("shield","sm")} Privacy notice</button>${installed()?`<span class="pill ok">${ic("check","sm")} Installed</span>`:`<button class="btn" data-a="install">${ic("download","sm")} Install app</button>`}</div>`,
   foot:`<button class="btn pri" data-close>Close</button>`})}
