"use strict";
/* ===================== Privacy: DPDP Act 2023 notice, consent and your-data tools =====================
   Trip Vault runs in the browser with no server, so nearly everything here is about telling people
   plainly what stays on the device and what goes to Google Drive if they connect it, asking before it
   does, letting them withdraw, and letting them see, export and erase their data. */
const NOTICE_V=1,NOTICE_DATE="2026-11-09",CONSENT_V=1;
const TV_REPO="https://github.com/SubhadipGitHub/TripVault",TV_ISSUES=TV_REPO+"/issues";

/* ---------- the full notice ---------- */
const NOTICE=[
 ["Who we are","हम कौन हैं",
  "Trip Vault is a free, open-source travel organiser that runs in your browser. It has no server and no accounts on our side, and no analytics, ads or trackers. The people who run this site never receive your trip data.",
  "ट्रिप वॉल्ट एक मुफ़्त, ओपन-सोर्स यात्रा ऐप है जो आपके ब्राउज़र में चलता है। हमारी तरफ़ कोई सर्वर या अकाउंट नहीं है, और कोई एनालिटिक्स, विज्ञापन या ट्रैकर नहीं। यह साइट चलाने वालों तक आपकी यात्रा का डेटा कभी नहीं पहुँचता।"],
 ["What the app holds, and why","ऐप क्या रखता है, और क्यों",
  "Trips, bookings, tickets, PNRs and costs, to plan and show your itinerary. Travellers' names, ID and passport numbers, visa and insurance details, so documents are at hand and expiry is checked. Photos, memories and attachments, to keep your trip record. The emergency card (name, blood group, allergies, contacts), to show to people helping you. Your profile name, to label your entries. If you connect Google: your Google email, the emails of people you share a trip with, and who added or changed each entry, to sync and share trips.",
  "ट्रिप, बुकिंग, टिकट, PNR और खर्च, ताकि यात्रा-क्रम बने और दिखे। यात्रियों के नाम, पहचान और पासपोर्ट नंबर, वीज़ा और बीमा की जानकारी, ताकि दस्तावेज़ हाथ में रहें और उनकी समाप्ति जाँची जा सके। फ़ोटो, यादें और अटैचमेंट, ताकि यात्रा का रिकॉर्ड रहे। आपातकालीन कार्ड (नाम, ब्लड ग्रुप, एलर्जी, संपर्क), ताकि मदद करने वालों को दिखाया जा सके। आपका प्रोफ़ाइल नाम, ताकि आपकी एंट्री पहचानी जाएँ। अगर आप Google जोड़ते हैं: आपका Google ईमेल, जिनसे आप ट्रिप शेयर करते हैं उनके ईमेल, और हर एंट्री किसने जोड़ी या बदली, ताकि ट्रिप सिंक और शेयर हो सकें।"],
 ["Where it is stored","यह कहाँ रखा जाता है",
  "On this device, in the browser's storage, encrypted if you set a passphrase. If you connect Google Drive, encrypted copies of the trips you choose go to your own Drive (attachments in a “Trip Vault files” folder). They are encrypted on your device with the trip code before upload, so Google cannot read them. Google does see your email address, the emails of people you share with, and file sizes and times.",
  "इसी डिवाइस पर, ब्राउज़र के स्टोरेज में; पासफ़्रेज़ सेट करने पर एन्क्रिप्टेड। अगर आप Google Drive जोड़ते हैं, तो आपकी चुनी हुई ट्रिप की एन्क्रिप्टेड कॉपी आपकी अपनी Drive में जाती है (अटैचमेंट “Trip Vault files” फ़ोल्डर में)। अपलोड से पहले ये आपके डिवाइस पर ट्रिप कोड से एन्क्रिप्ट होती हैं, इसलिए Google इन्हें पढ़ नहीं सकता। Google को आपका ईमेल, जिनसे आप शेयर करते हैं उनके ईमेल, और फ़ाइलों का आकार व समय दिखता है।"],
 ["Who receives it","यह किसे मिलता है",
  "Google, as the storage provider you choose, under Google's own terms and privacy policy; data in Google Drive may be stored outside India. The people you share a trip with get that trip's contents. Apps you open from Trip Vault (maps, cabs, translation, payments) receive what you send them when you tap: an address, a phrase or an amount. If you use the microphone in Conversation without an offline speech pack, your browser's speech service (Google in Chrome, Apple in Safari) may receive the audio to turn it into text, unless the language is installed on your device; Trip Vault itself keeps and sends nothing from it. Offline speech and translation packs download from Hugging Face (huggingface.co) when you tap Download, so Hugging Face sees your IP address and which pack you asked for; what you say and type is processed on your device and never sent. Nobody else.",
  "Google, आपके चुने हुए स्टोरेज प्रदाता के रूप में, Google की अपनी शर्तों और गोपनीयता नीति के तहत; Google Drive का डेटा भारत के बाहर भी रखा जा सकता है। जिनसे आप ट्रिप शेयर करते हैं, उन्हें उस ट्रिप की सामग्री मिलती है। ट्रिप वॉल्ट से खोले गए ऐप (मैप, कैब, अनुवाद, भुगतान) को वही मिलता है जो आप टैप करके भेजते हैं: पता, वाक्यांश या राशि। बातचीत में ऑफ़लाइन स्पीच पैक के बिना माइक इस्तेमाल करने पर आपके ब्राउज़र की स्पीच सेवा (Chrome में Google, Safari में Apple) आवाज़ को टेक्स्ट में बदलने के लिए ऑडियो पा सकती है, जब तक भाषा आपके डिवाइस पर इंस्टॉल न हो; ट्रिप वॉल्ट ख़ुद इसमें से कुछ नहीं रखता या भेजता। ऑफ़लाइन स्पीच और अनुवाद पैक Download दबाने पर Hugging Face (huggingface.co) से आते हैं, इसलिए Hugging Face आपका IP पता और माँगा गया पैक देखता है; आप जो बोलते और लिखते हैं वह आपके डिवाइस पर ही प्रोसेस होता है और कहीं नहीं भेजा जाता। और किसी को नहीं।"],
 ["How long","कितने समय तक",
  "On this device until you delete it. In Drive until you stop syncing a trip, delete it, or delete your Drive data (Drive keeps earlier versions for about 30 days). Records of deletions sync for 90 days so deleted entries don't come back. The Google sign-in token is kept in this tab's memory and session storage, so a refresh keeps syncing; it is gone when you close the app, and Google expires it within an hour.",
  "इस डिवाइस पर तब तक जब तक आप इसे हटाएँ नहीं। Drive में तब तक जब तक आप ट्रिप की सिंक बंद न करें, उसे हटाएँ नहीं, या अपना Drive डेटा न हटाएँ (Drive पुराने संस्करण लगभग 30 दिन रखता है)। हटाने के रिकॉर्ड 90 दिन तक सिंक होते हैं ताकि हटाई गई एंट्री वापस न आएँ। Google साइन-इन टोकन इसी टैब की मेमोरी और सेशन स्टोरेज में रहता है, ताकि रीफ़्रेश करने पर सिंक चलता रहे; ऐप बंद करते ही यह मिट जाता है, और Google इसे एक घंटे में ख़त्म कर देता है।"],
 ["Your consent","आपकी सहमति",
  "Nothing leaves this device unless you connect Google and agree. You can withdraw consent at any time in Settings → Privacy & data, as easily as you gave it: that disconnects Google and stops syncing, and you can also delete what is in your Drive. Withdrawing doesn't undo what was done before it.",
  "जब तक आप Google नहीं जोड़ते और सहमति नहीं देते, कुछ भी इस डिवाइस से बाहर नहीं जाता। आप किसी भी समय सेटिंग्स → गोपनीयता और डेटा में उतनी ही आसानी से सहमति वापस ले सकते हैं: इससे Google अलग हो जाता है और सिंक रुक जाती है, और आप अपनी Drive का डेटा भी हटा सकते हैं। सहमति वापस लेने से पहले हुई प्रोसेसिंग पर असर नहीं पड़ता।"],
 ["Your rights","आपके अधिकार",
  "Under the Digital Personal Data Protection Act, 2023 you can: see a summary of your data (See my data); get a copy (Backup); correct it (edit anything in the app); erase it, on this device and in your Drive; withdraw consent; and raise a grievance. To let someone act for you if you can't, keep your backup and its passphrase with a person you trust: we hold nothing we could hand over.",
  "डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत आप: अपने डेटा का सारांश देख सकते हैं (मेरा डेटा देखें); उसकी कॉपी ले सकते हैं (बैकअप); उसे सुधार सकते हैं (ऐप में कुछ भी बदलें); उसे इस डिवाइस और अपनी Drive से मिटा सकते हैं; सहमति वापस ले सकते हैं; और शिकायत कर सकते हैं। अगर आप न कर पाएँ तो कोई और आपकी ओर से कर सके, इसके लिए अपना बैकअप और उसका पासफ़्रेज़ किसी भरोसेमंद व्यक्ति के पास रखें: हमारे पास सौंपने के लिए कुछ नहीं है।"],
 ["Children and other people","बच्चे और दूसरे लोग",
  "If you are under 18, use Google sync only with your parent or guardian's consent. If you add other people's details or share a trip with them, make sure they know and agree.",
  "अगर आपकी उम्र 18 से कम है, तो Google सिंक केवल माता-पिता या अभिभावक की सहमति से इस्तेमाल करें। अगर आप दूसरों की जानकारी जोड़ते हैं या उनसे ट्रिप शेयर करते हैं, तो सुनिश्चित करें कि उन्हें पता हो और वे सहमत हों।"],
 ["Questions and grievances","सवाल और शिकायतें",
  `Open an issue at ${TV_ISSUES} (please don't post personal data there). We aim to respond within 30 days. If you are not satisfied, you may complain to the Data Protection Board of India.`,
  `${TV_ISSUES} पर इश्यू खोलें (कृपया वहाँ व्यक्तिगत डेटा न डालें)। हम 30 दिनों में जवाब देने का प्रयास करते हैं। संतुष्ट न होने पर आप भारत के डेटा संरक्षण बोर्ड से शिकायत कर सकते हैं।`]];
const linkify=s=>esc(s).replace(esc(TV_ISSUES),`<a href="${TV_ISSUES}" target="_blank" rel="noopener noreferrer">${esc(TV_ISSUES.replace("https://",""))}</a>`);
function openNotice(){
  const ov=sheet({title:`${ic("shield")} Privacy notice`,cls:"wide",body:`
   <div class="row wrap" style="gap:6px;margin-bottom:6px"><span class="small dim">Version ${NOTICE_V} · ${esc(fmtDs(NOTICE_DATE))}</span><span class="sp"></span>
    <button class="btn xs" id="ntLang" lang="hi">हिन्दी में पढ़ें</button></div>
   <div id="ntBody">${noticeHtml(false)}</div>`,foot:`<button class="btn pri" data-close>Close</button>`});
  let hi=false;$("#ntLang",ov).onclick=e=>{hi=!hi;const b=$("#ntBody",ov);b.innerHTML=noticeHtml(hi);b.lang=hi?"hi":"en";e.currentTarget.textContent=hi?"Read in English":"हिन्दी में पढ़ें";e.currentTarget.lang=hi?"en":"hi"}}
function noticeHtml(hi){return NOTICE.map(([h,hh,p,ph])=>`<div class="h mt"><h2>${esc(hi?hh:h)}</h2></div><p class="small" style="line-height:1.6;margin:4px 0 0">${linkify(hi?ph:p)}</p>`).join("")}

/* ---------- consent before anything goes to Google ---------- */
const consentNow=()=>{const c=(S.meta.consents||[]).at(-1);return c&&!c.withdrawnAt&&c.v>=CONSENT_V&&(S.meta.noticeV||0)>=1?c:null};
let _consentP=null;
function gsConsent(){if(consentNow())return Promise.resolve(true);if(_consentP)return _consentP;
  _consentP=new Promise(res=>{let done=false;const fin=v=>{if(done)return;done=true;_consentP=null;res(v)};
    const L=["Your chosen trips, their bookings, documents, memories, photos and attachments are encrypted on this device and saved to your own Google Drive.",
      "Google stores them but can't read them. Google sees your email, the emails of people you share a trip with, and file sizes and times. Drive data may be stored outside India.",
      "Only people you share a trip with (by email and invite link) can open it. You choose which trips sync.",
      "Withdraw any time in Settings → Privacy & data, and delete what's in your Drive."];
    const ov=sheet({title:`${ic("shield")} Connect Google Drive?`,onClose:()=>fin(false),body:`
      <p class="small muted" style="margin:0 0 8px">Before anything leaves this device:</p>
      <ul class="small plan" style="line-height:1.55;padding-left:18px;margin:0">${L.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <label class="row mt" style="cursor:pointer;align-items:flex-start"><input type="checkbox" id="cOk"> <span class="small" style="color:var(--tx)">I agree to this use of my data for syncing and sharing trips.</span></label>
      <label class="row mt" style="cursor:pointer;align-items:flex-start"><input type="checkbox" id="cAge"> <span class="small" style="color:var(--tx)">I'm 18 or older, or a parent or guardian is setting this up.</span></label>
      <div class="small dim mt"><a href="#" id="cRead">Read the full privacy notice</a></div>`,
      foot:`<button class="btn" id="cNo">Not now</button><button class="btn pri" id="cYes" disabled>${ic("unlock","sm")} Agree & connect</button>`});
    const yes=$("#cYes",ov),upd=()=>{yes.disabled=!($("#cOk",ov).checked&&$("#cAge",ov).checked)};$("#cOk",ov).onchange=upd;$("#cAge",ov).onchange=upd;
    $("#cRead",ov).onclick=e=>{e.preventDefault();openNotice()};
    $("#cNo",ov).onclick=()=>{ov.remove();fin(false)};
    yes.onclick=async()=>{(S.meta.consents||=[]).push({v:CONSENT_V,notice:NOTICE_V,at:Date.now(),purpose:"google-sync",age:true});S.meta.noticeV=Math.max(S.meta.noticeV||0,NOTICE_V);
      await saveMeta();ov.remove();fin(true)}});
  return _consentP}
async function consentEmail(e){const c=consentNow();if(c&&e&&c.email!==e){c.email=e;await saveMeta()}}
/* Withdraw: stop all Google processing now; optionally erase what's in Drive first. */
async function withdrawConsent(){
  const ok=await gate({title:"Withdraw consent for Google sync?",plan:["Disconnects Google and stops syncing and sharing on this device","Your trips stay on this device","To also erase the copies in your Drive, use “Delete my Google Drive data” first"],ok:"Withdraw",danger:false});
  if(!ok)return false;
  const c=consentNow();if(c)c.withdrawnAt=Date.now();
  for(const t of gsLinked()){delete t.sync;delete GS.st[t.id];await DB.put("trips",t)}
  S.meta.gsAll=false;delete S.meta.kc;GS.kc=null;GAuth.revoke();await saveMeta();render();gsPaint();
  toast("Consent withdrawn. Google is disconnected","info");return true}

/* ---------- see my data ---------- */
function dataSummary(){const n=(a)=>a.length,byKind=k=>S.items.filter(i=>i.kind===k).length,mb=(S.files.reduce((a,f)=>a+(f.size||0),0)/1048576).toFixed(1);
  const people=new Set(S.items.flatMap(i=>i.names||[]).concat(S.trips.flatMap(t=>t.people||[]))).size,s=S.settings||{},syn=gsLinked();
  return[["Trips",n(S.trips),"this device"],
   ["Bookings",S.items.filter(i=>!["expense","doc"].includes(i.kind)).length,""],["Expenses",byKind("expense"),""],
   ["Documents (IDs, passports, visas, insurance)",byKind("doc"),""],["Memories",n(S.memories),""],
   ["Files and photos",`${n(S.files)} · ${mb} MB`,""],["People named in bookings and trips",people,""],
   ["Emergency card",emgFields().length?"filled in":"empty",s.emgOn?"also shown on the lock screen, unencrypted":""],
   ["Profile name",esc(profName()||"—"),""],
   ["Synced to your Google Drive",syn.length?`${syn.length} trip(s)`:"none",syn.length?esc(syn.map(t=>t.name).join(", ")):""],
   ["People you share trips with",new Set(syn.flatMap(t=>(t.sync.members||[]).map(m=>m.email).concat(t.sync.role==="owner"?[]:[t.sync.owner]))).size,""],
   ["Encryption on this device",Vault.protected?"on (passphrase)":"off",""]]}
function openMyData(){sheet({title:`${ic("eye")} My data`,body:`  ${dataSummary().map(([k,v,d])=>`<div class="li"><div class="b"><div class="t" style="font-weight:500">${esc(k)}</div>${d?`<div class="d">${d}</div>`:""}</div><div class="r"><b>${v}</b></div></div>`).join("")}`,
  foot:`<button class="btn" data-close>Close</button><button class="btn pri" data-a="backupTab">${ic("download","sm")} Download a copy</button>`})}

/* ---------- Settings → Privacy & data ---------- */
function privacyPane(){const cs=S.meta.consents||[],cur=consentNow();
  return`<div class="row wrap" style="gap:6px"><button class="btn" data-a="privacyNotice">${ic("file","sm")} Privacy notice</button><button class="btn" id="pvSee">${ic("eye","sm")} See my data</button><button class="btn" data-a="backupTab">${ic("download","sm")} Download a copy</button></div>
   <div class="h mt">${ic("check")}<h2>Consent</h2></div>
   ${cs.length?cs.slice(-5).reverse().map(c=>`<div class="li"><div class="b"><div class="t" style="font-weight:500">Google Drive sync and sharing</div><div class="d">Given ${esc(new Date(+c.at||0).toLocaleString())}${c.email?` · ${esc(String(c.email).slice(0,200))}`:""}${c.withdrawnAt?` · withdrawn ${esc(new Date(+c.withdrawnAt||0).toLocaleString())}`:""}</div></div>${c===cur?pill("active","ok"):""}</div>`).join("")
     :`<div class="small muted">Google not connected</div>`}
   ${cur?`<div class="row mt"><button class="btn" id="pvWd">${ic("x","sm")} Withdraw consent</button></div>`:""}
   <div class="h mt">${ic("trash")}<h2>Erase</h2></div>
   <div class="row wrap" style="gap:6px">${gsReady()?`<button class="btn bad" id="pvDrive">${ic("trash","sm")} Delete my Google Drive data</button>`:""}<button class="btn bad" id="wipe">${ic("trash","sm")} Erase everything on this device</button></div>
   <div class="small muted mt">Questions or grievances: <a href="${TV_ISSUES}" target="_blank" rel="noopener noreferrer">GitHub Issues</a></div>`}
function privacyWire(ov){
  $("#pvSee",ov)?.addEventListener("click",()=>openMyData());
  $("#pvWd",ov)?.addEventListener("click",async()=>{if(await withdrawConsent())settingsRefresh(ov,"privacy")});
  $("#pvDrive",ov)?.addEventListener("click",async e=>{const b=e.currentTarget;if(await gsDeleteDriveData(b))settingsRefresh(ov,"privacy")})}
