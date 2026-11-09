"use strict";
/* ===================== Install as an app =====================
   Trip Vault is a PWA. Where the browser offers its own install prompt (Chrome and Edge on Android, Windows,
   macOS, Linux and ChromeOS; Samsung Internet; Opera) the Install button opens it. Elsewhere (iPhone and iPad,
   Safari on Mac, Firefox) it shows the two or three taps that do the same thing. Nothing is downloaded from
   anywhere else: installing just gives the same app its own icon and window. */
const INST={evt:null};
addEventListener("beforeinstallprompt",e=>{e.preventDefault();INST.evt=e;instRefresh()});
addEventListener("appinstalled",()=>{INST.evt=null;if(typeof S!=="undefined"&&S.meta){S.meta.installedAt=Date.now();saveMeta?.()}
  $$(".sheet.inst").forEach(s=>s.closest(".ov")?.remove());toast("Trip Vault is installed. Open it from your home screen or app list");instRefresh()});
const installed=()=>matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: minimal-ui)").matches||navigator.standalone===true;
const canOfferInstall=()=>!installed();
/* Re-draw what shows an Install offer (welcome screen, open account menu). */
function instRefresh(){try{if(typeof render==="function"&&S?.settings&&!Vault.locked&&!$(".ov"))render()}catch(e){}}
/* Which steps to show when the browser has no prompt to offer. */
function installHow(){const ua=navigator.userAgent||"",touchMac=/Macintosh/.test(ua)&&navigator.maxTouchPoints>1;
  const ios=/iPhone|iPad|iPod/.test(ua)||touchMac;
  if(ios)return/FBAN|FBAV|Instagram|LinkedInApp|WhatsApp|Line\//.test(ua)?"ios-inapp":"ios";
  if(/Android/.test(ua))return/Firefox/.test(ua)?"android-firefox":/; wv\)|FBAN|FBAV|Instagram/.test(ua)?"android-inapp":"android-other";
  if(/Firefox\//.test(ua))return"desktop-firefox";
  if(/Macintosh/.test(ua)&&/Safari\//.test(ua)&&!/Chrome\/|Chromium\/|Edg\//.test(ua))return"mac-safari";
  return"desktop-chromium"}
const INST_STEPS={
  "ios":["On iPhone and iPad",[["iosshare","Tap the <b>Share</b> button","In Safari it's at the bottom (iPhone) or top (iPad). In Chrome or Edge on iOS it's in the address bar."],["plus","Choose <b>Add to Home Screen</b>","Scroll the list if you don't see it."],["check","Tap <b>Add</b>","Open Trip Vault from the new icon. It works offline and has its own window."]]],
  "ios-inapp":["Open it in Safari first",[["globe","This is an in-app browser","Apps like WhatsApp and Instagram can't install web apps."],["iosshare","Tap <b>⋯</b> or the share icon → <b>Open in Safari</b>",""],["plus","Then Share → <b>Add to Home Screen</b>",""]]],
  "android-firefox":["In Firefox for Android",[["list","Tap the menu <b>⋮</b>",""],["plus","Tap <b>Install</b> (or <b>Add to Home screen</b>)",""],["check","Confirm","Open Trip Vault from the new icon."]]],
  "android-inapp":["Open it in your browser first",[["globe","This is an in-app browser","It can't install web apps."],["list","Tap <b>⋮</b> → <b>Open in Chrome</b> (or your browser)",""],["plus","Then tap <b>Install</b>",""]]],
  "android-other":["On Android",[["list","Tap the browser menu <b>⋮</b>",""],["plus","Tap <b>Install app</b> or <b>Add to Home screen</b>",""],["check","Confirm","Open Trip Vault from the new icon."]]],
  "mac-safari":["In Safari on a Mac",[["file","Open the <b>File</b> menu","Or the Share button in the toolbar."],["plus","Choose <b>Add to Dock</b>","Needs macOS Sonoma (Safari 17) or later."],["check","Open Trip Vault from the Dock",""]]],
  "desktop-firefox":["Firefox can't install web apps",[["globe","Open this page in Chrome, Edge or Safari","Then use their Install option."],["db","Your trips stay in this browser","Each browser keeps its own vault. Move them with Settings → Backup & storage → Export, then restore in the new browser."]]],
  "desktop-chromium":["In Chrome or Edge",[["download","Click the <b>install icon</b> at the right of the address bar","It looks like a screen with a down arrow."],["list","No icon? Open the browser menu <b>⋮</b>","Chrome: Cast, save and share → Install page as app. Edge: Apps → Install this site as an app."],["check","Open Trip Vault from your apps or taskbar",""]]]};
async function openInstall(){
  if(installed()){toast("Already installed. Open Trip Vault from your home screen or app list","info");return}
  if(INST.evt){const e=INST.evt;INST.evt=null;try{await e.prompt();const c=await e.userChoice;if(c?.outcome!=="accepted")toast("Install any time from the account menu","info")}catch(err){openInstallSteps()}instRefresh();return}
  openInstallSteps()}
function openInstallSteps(){const[h,steps]=INST_STEPS[installHow()];
  sheet({title:`${ic("download")} Install Trip Vault`,cls:"inst",help:"install",body:`<div class="h"><h2>${h}</h2></div>
   <ol class="inst-l">${steps.map(([i,t,d],k)=>`<li><span class="kic sm" style="--c:var(--acc)">${ic(i,"sm")}</span><div><b class="inst-t">${k+1}. ${t}</b>${d?`<p class="small muted">${d}</p>`:""}</div></li>`).join("")}</ol>
   <div class="small dim mt">${ic("lock","sm")} Installing adds an icon and its own window. Your trips stay on this device, in this browser.</div>`,
   foot:`<button class="btn pri" data-close>Done</button>`})}
/* A row for the welcome screen and About. */
function installRow(){
  if(installed())return`<div class="li">${kic("transfer")}<div class="b"><div class="t">Installed ${pill(ic("check","sm")+" app","ok")}</div><div class="d">You're using the installed app</div></div></div>`;
  return`<div class="li">${kic("transfer")}<div class="b"><div class="t">Install the app</div><div class="d">Works offline and opens in its own window</div></div><button class="btn${INST.evt?" pri":""}" data-a="install">${ic("download","sm")} Install</button></div>`}
