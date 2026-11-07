"use strict";
/* ===================== Interface language (English / हिन्दी) =====================
   The UI is written in English template strings. Rather than rewrite every view, this
   translates rendered UI text: exact matches of known interface strings in text nodes and in
   placeholder / aria-label / title attributes, applied by a MutationObserver as the app renders.
   Only exact, whole-string matches are replaced, so trip names, notes and other things you type
   are left alone. Strings not in the dictionary stay in English. Switching language reloads. */
const HI={
  /* navigation & chrome */
  "Today":"आज","Plan":"योजना","Vault":"वॉल्ट","Memories":"यादें","Add":"जोड़ें","Trip Vault":"ट्रिप वॉल्ट",
  "Search everything":"सब कुछ खोजें","Search":"खोजें","Settings":"सेटिंग्स","Backup & restore":"बैकअप और रीस्टोर","Backup and restore":"बैकअप और रीस्टोर",
  "Lock vault now":"अभी लॉक करें","Switch trip":"ट्रिप बदलें","Add something":"कुछ जोड़ें","No trip yet":"अभी कोई ट्रिप नहीं","tap to start":"शुरू करने के लिए टैप करें",
  /* kinds */
  "Flight":"फ्लाइट","Stay":"ठहराव","Train":"ट्रेन","Bus":"बस","Ferry":"फेरी","Car rental":"किराये की कार","Transfer":"ट्रांसफ़र","Activity":"गतिविधि","Expense":"ख़र्च","Document":"दस्तावेज़",
  "Flights":"फ्लाइट","Hotels":"होटल","Trains":"ट्रेनें","Buses":"बसें","Ferries":"फेरी","Car rentals":"किराये की कारें","Transfers":"ट्रांसफ़र","Activities":"गतिविधियाँ","Expenses":"ख़र्च","Stays":"ठहराव","All":"सभी",
  "Memory":"याद","Hotel":"होटल",
  /* common actions */
  "Save":"सेव करें","Cancel":"रद्द करें","Delete":"हटाएँ","Edit":"बदलें","Close":"बंद करें","Back":"वापस","Continue":"आगे बढ़ें","Open":"खोलें","Remove":"हटाएँ",
  "Copy":"कॉपी करें","Share":"शेयर करें","Download":"डाउनलोड करें","Import":"इम्पोर्ट","Review":"देखें","Hide":"छिपाएँ","Reset":"रीसेट","Done":"हो गया",
  "Next":"अगला","Previous":"पिछला","Unlock":"अनलॉक करें","Extract":"पढ़ें","Paid":"चुकाया","Mark paid":"चुकाया मार्क करें","Mark fully paid":"पूरा चुकाया",
  "Import booking":"बुकिंग इम्पोर्ट करें","Import a booking":"बुकिंग इम्पोर्ट करें","Smart import":"स्मार्ट इम्पोर्ट","Log expense":"ख़र्च लिखें","Capture memory":"याद सहेजें","Capture":"सहेजें",
  "Copy itinerary":"यात्रा-क्रम कॉपी करें","Add to calendar":"कैलेंडर में जोड़ें","Share itinerary":"यात्रा-क्रम शेयर करें","Show pass":"पास दिखाएँ",
  "Start a trip":"ट्रिप शुरू करें","Explore a sample":"नमूना देखें","New trip":"नई ट्रिप","Sample":"नमूना","Duplicate":"कॉपी बनाएँ","Delete trip":"ट्रिप हटाएँ","Edit trip":"ट्रिप बदलें",
  "Set dates":"तारीख़ें चुनें","Set rate":"रेट डालें","Extend dates":"तारीख़ें बढ़ाएँ","Backup":"बैकअप","Set passphrase":"पासफ़्रेज़ सेट करें","Set a passphrase":"पासफ़्रेज़ सेट करें",
  "Change passphrase":"पासफ़्रेज़ बदलें","Lock now":"अभी लॉक करें","Remove lock":"लॉक हटाएँ","Limits":"सीमाएँ","Save limits":"सीमाएँ सेव करें","Blank list":"ख़ाली सूची",
  "Add idea":"आइडिया जोड़ें","Schedule":"योजना में डालें","Save memory":"याद सेव करें","Copy items":"चीज़ें कॉपी करें","Add segment":"हिस्सा जोड़ें","Open existing":"मौजूदा खोलें",
  "Send by QR":"QR से भेजें","Receive by QR":"QR से पाएँ","Emergency card":"आपातकालीन कार्ड","Emergency info":"आपातकालीन जानकारी",
  "CSV for Excel / Sheets":"Excel / Sheets के लिए CSV","Printable report with receipts":"रसीदों के साथ प्रिंट रिपोर्ट","Keep data persistent":"डेटा स्थायी रखें",
  "Smart import — drop a ticket, email or PDF":"स्मार्ट इम्पोर्ट: टिकट, ईमेल या PDF डालें",
  /* section headings */
  "Next up":"अगला","Coming up":"आने वाला","Quick actions":"तुरंत करें","Trip readiness":"ट्रिप की तैयारी","Tonight":"आज रात","Capture the moment":"इस पल को सहेजें",
  "Emergency & essentials":"आपातकाल और ज़रूरी","Quick converter":"तुरंत बदलें","Exchange rates":"विनिमय दरें","Pending payments":"बाक़ी भुगतान","Where it goes":"पैसा कहाँ जाता है",
  "Trip expenses":"ट्रिप के ख़र्च","Spend by day":"रोज़ का ख़र्च","Split & settle up":"बाँटें और हिसाब करें","Export costs":"ख़र्च एक्सपोर्ट करें","Travel documents":"यात्रा दस्तावेज़",
  "Files in this trip":"इस ट्रिप की फ़ाइलें","Storage on this device":"इस डिवाइस पर स्टोरेज","Itinerary":"यात्रा-क्रम","Attachments":"अटैचमेंट","Restore from a backup":"बैकअप से रीस्टोर करें",
  "Privacy & security":"निजता और सुरक्षा","Day planner":"दिन की योजना","Travel buffers (minutes)":"यात्रा बफ़र (मिनट)","Danger zone":"ख़तरनाक क्षेत्र","Reading screenshots":"स्क्रीनशॉट पढ़ना",
  "Category limits":"श्रेणी की सीमाएँ","Phone to phone, no internet":"फ़ोन से फ़ोन, बिना इंटरनेट","Add to your trip":"अपनी ट्रिप में जोड़ें","Or add by hand":"या ख़ुद जोड़ें","Your trips":"आपकी ट्रिप्स",
  "Bookings":"बुकिंग","Documents":"दस्तावेज़","Money":"पैसा","Ideas":"आइडिया","Packing":"पैकिंग","Getting started":"शुरुआत",
  /* form labels */
  "Amount":"रक़म","Currency":"मुद्रा","Category":"श्रेणी","Note":"नोट","Notes":"नोट","Paid by":"किसने चुकाया","Split between":"किनमें बँटेगा","Paid via":"कैसे चुकाया","Payment":"भुगतान",
  "Total cost":"कुल लागत","Traveller names":"यात्रियों के नाम","Date":"तारीख़","Time":"समय","Title":"शीर्षक","Where":"कहाँ","What":"क्या","Start":"शुरू","End":"ख़त्म","End date":"ख़त्म होने की तारीख़",
  "Departs":"रवानगी","Arrives":"पहुँच","Dep. time":"रवानगी का समय","Arr. time":"पहुँचने का समय","Departs (local date)":"रवानगी (स्थानीय तारीख़)","Arrives (local date)":"पहुँच (स्थानीय तारीख़)",
  "Flight no.":"फ्लाइट नंबर","Airline":"एयरलाइन","From (IATA)":"कहाँ से (IATA)","To (IATA)":"कहाँ तक (IATA)","Terminal":"टर्मिनल","Seat":"सीट","Booking ID":"बुकिंग ID","Booking ID (OTA)":"बुकिंग ID (OTA)",
  "Property":"प्रॉपर्टी","Address":"पता","Check-in date":"चेक-इन की तारीख़","Check-out date":"चेक-आउट की तारीख़","From":"से","Until":"तक","Phone":"फ़ोन","Room":"कमरा","Confirmation no.":"कन्फ़र्मेशन नंबर",
  "Expiry":"समाप्ति","Holder(s)":"धारक","Ref / policy no.":"रेफ़ / पॉलिसी नंबर","Ticket / ref":"टिकट / रेफ़","Due by (if pending)":"कब तक (अगर बाक़ी है)","PNR / booking ref":"PNR / बुकिंग रेफ़",
  "Trip name":"ट्रिप का नाम","Destination":"गंतव्य","Local currency":"स्थानीय मुद्रा","Home currency":"घरेलू मुद्रा","Home timezone":"घरेलू टाइमज़ोन","Timezone":"टाइमज़ोन","Budget":"बजट",
  "Rental company":"किराया कंपनी","Pick-up location":"पिक-अप की जगह","Pick-up date":"पिक-अप की तारीख़","Drop-off date":"ड्रॉप-ऑफ़ की तारीख़","Drop-off location":"ड्रॉप-ऑफ़ की जगह","Car type":"कार का प्रकार",
  "Operator":"ऑपरेटर","Boarding point":"बोर्डिंग पॉइंट","Drop point":"ड्रॉप पॉइंट","Bus type":"बस का प्रकार","Seat(s)":"सीट","Class":"क्लास",
  "Idea":"आइडिया","Type":"प्रकार","Place / area (for maps)":"जगह / इलाक़ा (मैप के लिए)","The story":"कहानी","How did it feel?":"कैसा लगा?","Photos":"फ़ोटो","Place":"जगह",
  "Passphrase":"पासफ़्रेज़","Current passphrase":"मौजूदा पासफ़्रेज़","Repeat passphrase":"पासफ़्रेज़ दोबारा","Auto-lock after idle":"निष्क्रिय रहने पर ऑटो-लॉक","Appearance":"दिखावट","Language":"भाषा",
  "Day starts":"दिन शुरू","Day ends":"दिन ख़त्म","Min. free slot (min)":"न्यूनतम ख़ाली समय (मिनट)","Before intl flight":"अंतरराष्ट्रीय फ्लाइट से पहले","Before domestic":"घरेलू से पहले",
  "After intl arrival":"अंतरराष्ट्रीय पहुँच के बाद","After domestic":"घरेलू के बाद","Before train":"ट्रेन से पहले",
  "Name":"नाम","Blood group":"ब्लड ग्रुप","Allergies":"एलर्जी","Medical conditions / medicines":"बीमारियाँ / दवाइयाँ","Emergency contact":"आपातकालीन संपर्क","Contact phone":"संपर्क फ़ोन",
  "Insurer & policy no.":"बीमा कंपनी और पॉलिसी नंबर","Insurance helpline":"बीमा हेल्पलाइन","Insurance":"बीमा","Code":"कोड","What to send":"क्या भेजना है",
  "Who's sharing costs? (comma separated)":"ख़र्च कौन बाँट रहा है? (कॉमा से अलग करें)","Contacts, insurance helpline, embassy/consulate, hotel front desk":"संपर्क, बीमा हेल्पलाइन, दूतावास/वाणिज्य दूतावास, होटल फ़्रंट डेस्क",
  "…or paste the confirmation email / SMS / ticket text":"…या कन्फ़र्मेशन ईमेल / SMS / टिकट का टेक्स्ट पेस्ट करें","Add to":"इसमें जोड़ें","Refundable / free cancellation":"रिफ़ंडेबल / मुफ़्त कैंसलेशन",
  /* options */
  "Match my device":"डिवाइस के अनुसार","Midnight":"रात (गहरा)","Parchment":"काग़ज़ (हल्का)","Never":"कभी नहीं","1 minute":"1 मिनट","5 minutes":"5 मिनट","15 minutes":"15 मिनट","1 hour":"1 घंटा",
  "Not sure":"पक्का नहीं","Fully paid":"पूरा चुकाया","Pending / pay later":"बाक़ी / बाद में","Food":"खाना","Local transport":"स्थानीय यातायात","Shopping":"ख़रीदारी","Sightseeing":"घूमना",
  "SIM & data":"SIM और डेटा","Tips":"टिप","Forex fee":"फ़ॉरेक्स शुल्क","Misc":"अन्य","Other":"अन्य","Clothing":"कपड़े","Toiletries":"प्रसाधन","Health":"सेहत","Tech":"टेक","Before you leave":"निकलने से पहले",
  /* welcome & lock */
  "Welcome aboard":"स्वागत है","Drop your bookings":"अपनी बुकिंग डालें","The plan builds itself":"योजना अपने आप बनती है","Everything is searchable":"सब कुछ खोजा जा सकता है","Keep the memories":"यादें सहेजें",
  "Pack without the panic":"बिना घबराहट के पैकिंग","No dates yet":"अभी तारीख़ें नहीं","No bookings here yet":"अभी कोई बुकिंग नहीं","Your wish list":"आपकी इच्छा-सूची","Nothing captured yet":"अभी कुछ सहेजा नहीं",
  "Capture your first memory":"पहली याद सहेजें","Your vault is locked. Enter your passphrase to open it.":"आपका वॉल्ट लॉक है। खोलने के लिए पासफ़्रेज़ डालें।",
  "Works offline, install it like an app":"ऑफ़लाइन चलता है, ऐप की तरह इंस्टॉल करें","Nothing is uploaded, ever":"कुछ भी कभी अपलोड नहीं होता",
  "What will happen":"क्या होगा","Merge (recommended)":"मिलाएँ (सुझाया गया)","No backup yet.":"अभी कोई बैकअप नहीं।","Storage unavailable.":"स्टोरेज उपलब्ध नहीं।",
  "Not locked.":"लॉक नहीं है।","Encrypted with AES-256-GCM.":"AES-256-GCM से एन्क्रिप्टेड।","Choose a Trip Vault backup (.tvault or .json)":"ट्रिप वॉल्ट बैकअप चुनें (.tvault या .json)",
  /* placeholders */
  "Add an item…":"कोई चीज़ जोड़ें…","Dinner at…":"डिनर…","No limit":"कोई सीमा नहीं","Comma separated":"कॉमा से अलग करें",
  "Search bookings, PNRs, passports, memories, text inside PDFs…":"बुकिंग, PNR, पासपोर्ट, यादें, PDF के अंदर का टेक्स्ट खोजें…",
  "Baggage, meal, check-in tips, contact…":"सामान, खाना, चेक-इन की बातें, संपर्क…",
  /* toasts & short messages */
  "Saved":"सेव हो गया","Deleted":"हटा दिया","Settings saved":"सेटिंग्स सेव हुईं","Expense logged":"ख़र्च लिख लिया","Limits saved":"सीमाएँ सेव हुईं","Backup downloaded":"बैकअप डाउनलोड हुआ",
  "Copied":"कॉपी हो गया","Itinerary file downloaded":"यात्रा-क्रम फ़ाइल डाउनलोड हुई","Transfer cancelled":"ट्रांसफ़र रद्द","Starting…":"शुरू हो रहा है…","Starting the camera…":"कैमरा शुरू हो रहा है…",
  "Looking for QR codes…":"QR कोड ढूँढ रहे हैं…","Reading the image":"इमेज पढ़ी जा रही है","Everyone is square.":"सबका हिसाब बराबर है।","No costs yet.":"अभी कोई ख़र्च नहीं।","Free":"ख़ाली",
  /* Today */
  "Skip to content":"मुख्य सामग्री पर जाएँ","Dates":"तारीख़ें","Nights":"रातें","Travellers":"यात्री","Departs in":"रवानगी में","Leaves in":"निकलने में","days":"दिन","day":"दिन","Now on":"अभी","Trip":"ट्रिप",
  "Add your first booking":"पहली बुकिंग जोड़ें","Import a ticket or confirmation":"टिकट या कन्फ़र्मेशन इम्पोर्ट करें","Lock the vault":"वॉल्ट लॉक करें","Encrypt everything with a passphrase":"पासफ़्रेज़ से सब कुछ एन्क्रिप्ट करें",
  "Save passport & insurance":"पासपोर्ट और बीमा सेव करें","Expiry is checked against your trip dates":"समाप्ति की तारीख़ ट्रिप की तारीख़ों से जाँची जाती है","Take a backup":"बैकअप लें",
  "Browsers can clear data; keep a copy":"ब्राउज़र डेटा मिटा सकता है; एक कॉपी रखें","Capture a memory":"एक याद सहेजें","A line or a photo is enough":"एक लाइन या एक फ़ोटो काफ़ी है",
  "Map":"मैप","Pending":"बाक़ी","same booking":"वही बुकिंग","valid":"वैध","refundable":"रिफ़ंडेबल","Almost":"लगभग","Cleared":"तैयार","Check":"जाँचें","Unallocated":"बिना आवंटन",
  "Check-in windows are typical for the airline; confirm on its site.":"चेक-इन का समय एयरलाइन के सामान्य नियम पर आधारित है; उसकी साइट पर पक्का करें।",
  "Never backed up — export a copy before you travel":"कभी बैकअप नहीं लिया — यात्रा से पहले एक कॉपी एक्सपोर्ट करें","All bookings paid":"सारी बुकिंग चुकाई जा चुकी",
  "No travel insurance saved":"कोई यात्रा बीमा सेव नहीं","Add your passport (expiry) to check validity":"वैधता जाँचने के लिए पासपोर्ट (समाप्ति) जोड़ें",
  "Sample trip loaded — explore, then delete it from trip settings":"नमूना ट्रिप लोड हुई — देखें, फिर ट्रिप सेटिंग्स से हटा दें",
  /* Plan */
  "green bar = share of the waking day still free (07:00–22:00)":"हरी पट्टी = जागने के समय का ख़ाली हिस्सा (07:00–22:00)","Airport · check-in, security & immigration":"एयरपोर्ट · चेक-इन, सुरक्षा और इमिग्रेशन",
  "Airport · check-in & security":"एयरपोर्ट · चेक-इन और सुरक्षा","Immigration, baggage & transfer":"इमिग्रेशन, सामान और ट्रांसफ़र","Baggage & exit":"सामान और बाहर निकलना",
  "Room for a half-day outing":"आधे दिन की सैर का समय","Good for a sight or a long meal":"एक जगह देखने या लंबे खाने का समय","Coffee, a walk, a quick stop":"कॉफ़ी, सैर, छोटा पड़ाव",
  "Reach station":"स्टेशन पहुँचें","Reach boarding point":"बोर्डिंग पॉइंट पहुँचें","Reach jetty":"जेटी पहुँचें","All day":"पूरा दिन","Free day":"ख़ाली दिन",
  /* Vault */
  "Travel insurance":"यात्रा बीमा","Passport":"पासपोर्ट","Visa":"वीज़ा","ID card":"पहचान पत्र","Vaccination":"टीकाकरण","Forex card":"फ़ॉरेक्स कार्ड",
  "Files you import are kept here, offline, with a fingerprint so the same file is never stored twice.":"इम्पोर्ट की गई फ़ाइलें यहाँ ऑफ़लाइन रहती हैं, फ़िंगरप्रिंट के साथ ताकि एक ही फ़ाइल दो बार न रखी जाए।",
  /* Memories */
  "Journal":"डायरी","Preview":"झलक","See your Trip Wrapped":"अपना ट्रिप रैप्ड देखें","Your Trip Wrapped":"आपका ट्रिप रैप्ड",
  "Story cards from your own bookings, spend and memories. Save them as images.":"आपकी बुकिंग, ख़र्च और यादों से बने स्टोरी कार्ड। इन्हें इमेज के रूप में सेव करें।",
  "Jot a line, drop a photo, tag the mood. These become the heart of your Trip Wrapped.":"एक लाइन लिखें, फ़ोटो डालें, मूड चुनें। यही आपके ट्रिप रैप्ड का दिल बनते हैं।",
  "Joyful":"ख़ुश","In awe":"हैरान","Peaceful":"शांत","Playful":"मस्त","Delicious":"स्वादिष्ट","Grateful":"आभारी","Worn out":"थका हुआ",
  /* reading screenshots (OCR) */
  "Download for offline use":"ऑफ़लाइन इस्तेमाल के लिए डाउनलोड करें","Downloaded · refresh":"डाउनलोड हो चुका · रीफ़्रेश","Ready for offline use":"ऑफ़लाइन इस्तेमाल के लिए तैयार","Downloading…":"डाउनलोड हो रहा है…","Try again":"फिर कोशिश करें",
  "Loading the text reader":"टेक्स्ट रीडर लोड हो रहा है","Starting the text reader":"टेक्स्ट रीडर शुरू हो रहा है","Loading English":"अंग्रेज़ी लोड हो रही है","Getting ready":"तैयारी हो रही है","Text read from image":"इमेज से पढ़ा गया टेक्स्ट",
  "Text reader ready. Screenshots can now be read offline":"टेक्स्ट रीडर तैयार। अब स्क्रीनशॉट ऑफ़लाइन पढ़े जा सकते हैं",
  /* phone to phone (QR transfer) */
  "Move trips to another phone with Trip Vault open: this screen shows a stream of QR codes, the other phone reads them with its camera. Encrypted with a one-time code.":"ट्रिप्स दूसरे फ़ोन पर भेजें जिसमें ट्रिप वॉल्ट खुला हो: यह स्क्रीन QR कोड की एक धारा दिखाती है, दूसरा फ़ोन उन्हें कैमरे से पढ़ता है। एक बार के कोड से एन्क्रिप्टेड।",
  "On the other phone open Trip Vault → Backup →":"दूसरे फ़ोन पर ट्रिप वॉल्ट → बैकअप →",", then point its camera at this screen.":" खोलें, फिर उसका कैमरा इस स्क्रीन की ओर करें।",
  "Include attachments and photos":"अटैचमेंट और फ़ोटो भी भेजें","(much slower: a 1 MB photo takes several minutes)":"(बहुत धीमा: 1 MB की फ़ोटो में कई मिनट लगते हैं)",
  "Encrypting…":"एन्क्रिप्ट हो रहा है…","Slower":"धीमा","Faster":"तेज़","Pause":"रोकें","Resume":"फिर चलाएँ","Code to type on the other phone":"दूसरे फ़ोन पर डालने का कोड",
  "Point the camera at the QR codes on the other phone. Frames can arrive in any order.":"कैमरा दूसरे फ़ोन के QR कोड की ओर करें। फ़्रेम किसी भी क्रम में आ सकते हैं।",
  "Camera permission was denied. Allow it in the browser's site settings and try again.":"कैमरे की अनुमति नहीं मिली। ब्राउज़र की साइट सेटिंग्स में अनुमति दें और फिर कोशिश करें।",
  "Enter the code":"कोड डालें","The code has 8 characters":"कोड में 8 अक्षर होते हैं","That code didn't work. Check it on the other phone":"यह कोड नहीं चला। दूसरे फ़ोन पर जाँचें",
  "Not a Trip Vault transfer":"यह ट्रिप वॉल्ट ट्रांसफ़र नहीं है","Send trips to another phone (QR)":"ट्रिप्स दूसरे फ़ोन पर भेजें (QR)","Receive trips from another phone (QR)":"दूसरे फ़ोन से ट्रिप्स पाएँ (QR)",
  /* plan calendar legend */
  "Travel":"यात्रा","Free to plan":"योजना के लिए ख़ाली","Not in trip":"ट्रिप में नहीं",
  /* weekday & month abbreviations shown on their own (calendar) */
  "Sun":"रवि","Mon":"सोम","Tue":"मंगल","Wed":"बुध","Thu":"गुरु","Fri":"शुक्र","Sat":"शनि",
  "Jan":"जन","Feb":"फ़र","Mar":"मार्च","Apr":"अप्रै","May":"मई","Jun":"जून","Jul":"जुला","Aug":"अग","Sep":"सितं","Oct":"अक्टू","Nov":"नवं","Dec":"दिसं"
};
/* A few headings carry counts; translate the label and keep the numbers. */
const HI_RX=[[/^Packing · (.+)$/,"पैकिंग · $1"],[/^Ideas · (.+)$/,"आइडिया · $1"],[/^Getting started · (.+)$/,"शुरुआत · $1"],[/^Day (\d+) · (.+)$/,"दिन $1 · $2"],[/^Received (\d+) of (\d+) frames$/,"$2 में से $1 फ़्रेम मिले"],[/^Frame (\d+) of (\d+)$/,"फ़्रेम $1 / $2"],[/^Reading the image · (\d+)%$/,"इमेज पढ़ी जा रही है · $1%"],[/^Sending (\d+) trips?$/,"$1 ट्रिप भेजी जा रही है"],[/^This trip · (.+)$/,"यह ट्रिप · $1"],[/^All (\d+) trips$/,"सभी $1 ट्रिप्स"],
  [/^About (\d+) QR frames\. Roughly (\d+) seconds if the camera catches each one first time\.$/,"लगभग $1 QR फ़्रेम। अगर कैमरा हर फ़्रेम पहली बार में पकड़ ले तो लगभग $2 सेकंड।"],
  [/^(\d+) frames repeat until the other phone has them all\. Keep this screen bright and steady\.$/,"$1 फ़्रेम तब तक दोहराए जाएँगे जब तक दूसरे फ़ोन को सब न मिल जाएँ। स्क्रीन चमकदार और स्थिर रखें।"],
  [/^All (\d+) frames received\. Type the code shown under the QR codes on the other phone\.$/,"सभी $1 फ़्रेम मिल गए। दूसरे फ़ोन पर QR कोड के नीचे दिखा कोड डालें।"],[/^Loading English · (\d+)%$/,"अंग्रेज़ी लोड हो रही है · $1%"],
  [/^in (\d+) days$/,"$1 दिन में"],[/^in (\d+h(?: \d+m)?|\d+m)$/,"$1 में"],[/^(\d+h(?: \d+m)?|\d+m) free$/,"$1 ख़ाली"],[/^Free · (.+)$/,"ख़ाली · $1"],[/^Now · ends (.+)$/,"अभी · $1 पर ख़त्म"],
  [/^Web check-in opens for (.+)$/,"$1 का वेब चेक-इन खुलेगा"],[/^Web check-in is open for (.+)$/,"$1 का वेब चेक-इन खुला है"],
  [/^About (.+) before departure\. Confirm the window with (.+)$/,"रवानगी से लगभग $1 पहले। समय $2 से पक्का करें"],[/^Usually closes about an hour before departure(.*)$/,"आम तौर पर रवानगी से लगभग एक घंटा पहले बंद$1"],
  [/^(.+) due · (.+)$/,"$1 बाक़ी · $2"],[/^(.+) overdue · (.+)$/,"$1 बकाया · $2"],[/^Due (.+)$/,"देय $1"],[/^Was due (.+)$/,"देय था $1"],[/^Be at (.+) by (.+)$/,"$2 तक $1 पहुँचें"],
  [/^(\d+) of (\d+) checks passed · (\d+) tips?$/,"$2 में से $1 जाँच पास · $3 सुझाव"],[/^(\d+) of (\d+) checks passed$/,"$2 में से $1 जाँच पास"],
  [/^Outbound travel booked for (.+)$/,"$1 की जाने की यात्रा बुक है"],[/^Return travel booked for (.+)$/,"$1 की वापसी यात्रा बुक है"],[/^Every night has a stay \((\d+) nights?\)$/,"हर रात ठहरने की जगह है ($1 रातें)"],
  [/^(.+) still to pay across (\d+) bookings?(.*)$/,"$2 बुकिंग में $1 चुकाना बाक़ी$3"],[/^(\d+) days? with no activities planned yet — tap a green free slot in Itinerary$/,"$1 दिन में अभी कोई गतिविधि नहीं — योजना में हरे ख़ाली स्लॉट पर टैप करें"],
  [/^(\d+) days · (.+) of free time to plan$/,"$1 दिन · $2 का ख़ाली समय"],[/^of (.+) committed$/,"तय $1 में से"],[/^next due (.+)$/,"अगला भुगतान $1"],[/^Local is (.+) ahead$/,"स्थानीय समय $1 आगे"],[/^Local is (.+) behind$/,"स्थानीय समय $1 पीछे"],
  [/^Passport \((.+)\) valid 6\+ months after return$/,"पासपोर्ट ($1) वापसी के बाद 6+ महीने वैध"],[/^Passport \((.+)\) expires (.+) — many countries need 6 months' validity$/,"पासपोर्ट ($1) $2 को समाप्त — कई देशों में 6 महीने की वैधता ज़रूरी है"],
  [/^Visa \/ e-visa \/ visa-on-arrival status not recorded for (.+) — check the official rules$/,"$1 के लिए वीज़ा / ई-वीज़ा / वीज़ा-ऑन-अराइवल की स्थिति दर्ज नहीं — आधिकारिक नियम देखें"],
  [/^Using (.+) of ~(.+) available\.$/,"~$2 में से $1 इस्तेमाल।"],[/^(.+) is over its limit by (.+) \((.+) of (.+)\)$/,"$1 अपनी सीमा से $2 ऊपर ($4 में से $3)"]];
const I18N={on:false,obs:null};
const I18N_SKIP="input,textarea,script,style,pre,[data-raw],[contenteditable]";
function i18nText(s){const k=s.trim();if(!k)return null;const h=HI[k];if(h)return s.replace(k,h);for(const[rx,to]of HI_RX)if(rx.test(k))return s.replace(k,k.replace(rx,to));return null}
function i18nNode(n){const p=n.parentElement;if(!p||p.closest(I18N_SKIP))return;const v=i18nText(n.nodeValue);if(v==null)return;
  if(p.tagName==="OPTION"&&!p.hasAttribute("value"))p.setAttribute("value",p.textContent.trim()); // keep the stored value English
  n.nodeValue=v}
function i18nApply(root){if(!I18N.on||!root)return;
  if(root.nodeType===3){i18nNode(root);return}if(root.nodeType!==1||root.closest?.(I18N_SKIP))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode())i18nNode(n);
  for(const el of[root,...root.querySelectorAll("[placeholder],[aria-label],[title]")])for(const a of["placeholder","aria-label","title"]){const v=el.getAttribute?.(a);if(v&&HI[v.trim()])el.setAttribute(a,HI[v.trim()])}}
function i18nInit(){
  const on=S.settings?.lang==="hi";document.documentElement.lang=on?"hi":"en";if(!on)return;
  I18N.on=true;i18nApply(document.body);
  if(!I18N.obs){I18N.obs=new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(i18nApply)});I18N.obs.observe(document.body,{childList:true,subtree:true})}}
