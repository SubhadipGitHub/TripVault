# Trip Vault

A private, offline-first home for everything about a trip: bookings, tickets, passports, payments, the day-by-day plan, expenses, packing and memories. Domestic and international. No account, no server, no tracking. Optionally, share a trip with a partner or group through your own Google Drive, end-to-end encrypted.

**Live:** https://subhadipgithub.github.io/TripVault/ (after you enable Pages, see below)

## What it does

- **Smart import**: drop PDF e-tickets, `.eml`, HTML or pasted SMS (airlines, Booking.com/Agoda, IRCTC, redBus-style bus tickets, ferries, car rentals). Screenshots and photos of tickets are read with on-device OCR (Tesseract, self-hosted, about 7 MB loaded on first use, or ahead of time from Settings). Fields are extracted on-device and you confirm them. Duplicate files and duplicate bookings are flagged.
- **Plan**: a month calendar that opens on the trip start, colours trip days by what they hold (travel, stay, activities, free) and only lets you pick days in the trip; per-day timelines with airport/station buffers, check-ins, time zones and tappable free slots.
- **Vault**: bookings, documents (passport/visa/insurance expiry checked against trip dates), money (paid vs pending, multi-currency, per-trip exchange rates), packing lists (domestic or international) and emergency notes.
- **Ideas, spend by day, duplicate trip**: a wish-list board that schedules into the plan, a daily spend chart, and copy a trip as a template.
- **Coming up**: web check-in opening, leave-for-the-airport, payment due dates and document expiry on Today. *Add to calendar* puts them in your phone's calendar with alarms, so reminders work without a server.
- **Show-at-gate pass**: a full-screen, high-contrast view of the next flight or train (PNR, seat, terminal, travellers, attached ticket image) that keeps the screen awake.
- **Share to Trip Vault**: once installed, share an e-ticket PDF, email or SMS from any app straight into Smart import. Home-screen shortcuts for Log expense, Import, Pass and Search.
- **Export costs**: CSV for Excel/Sheets and a printable expense report with receipt photos, from the Money tab.
- **Map links** on hotels, activities, transfers and departure airports (opens your maps app; nothing is fetched by Trip Vault).
- **Buses, ferries and car rentals** alongside flights, trains and stays, with boarding-point buffers, pick-up/drop-off events and pass view.
- **Fair splits and limits**: mark who paid and who each expense was for; set per-category spending limits that flag in Trip readiness.
- **Emergency card**: an opt-in medical-ID style card (blood group, allergies, emergency contact, insurer) viewable from the lock screen. It is stored unencrypted so it can be shown while locked.
- **Packing sets**: add beach, trek, business, with-kids or cold-weather items to any list, or copy items from another trip.
- **हिन्दी interface (beta)**: switch in Settings or on the welcome screen. Navigation, headings, buttons, forms, settings, reminders and readiness checks are translated; booking details and anything you type stay as entered.
- **Search everything** (`Ctrl/Cmd+K` or `/`): trips, PNRs, names, notes, memories and the text inside imported PDFs.
- **Your travel crew**: small chibi-style 3D characters (three.js, bundled, works offline) for a solo trip, a couple or a group, him or her for each traveller, guessed from ticket titles (Mr/Ms/Mrs) and IRCTC's M/F column and changeable under *Who's going* in Trip settings. They walk in at launch, then live on the Today card and in the Memories journal, cheer when you create a trip, change the crew or save a memory, appear on the cover and last card of your Wrapped (and in its exported images), and brighten the empty Plan, Bookings, Ideas and Packing screens. Each trip gets its own look. *Settings → Character animations* turns off the intro or the characters; reduced-motion devices get a still frame.
- **Share a trip (optional)**: share a trip with a partner or a group through Google Drive. Everyone can add bookings, expenses, packing, ideas, memories, attachments and photos, and changes sync both ways while the app is open. Everything is encrypted on the phone with the trip code before it reaches Google; the code travels in the invite link. Off until you share or join a trip, and it needs the one-time setup below.
- **Memories**: a photo journal with moods and highlights.
- **Wrapped**: story cards for a trip, a year or all time. Save as PNG, ZIP, share, or print a trip book. "Hide amounts" for safe sharing.
- **Security**: optional passphrase encryption (AES-256-GCM, PBKDF2-SHA256 600k) of all data at rest, idle auto-lock, encrypted `.tvault` backups, and a Content-Security-Policy that blocks every network request except Google sign-in and Drive, which are used only for trips you share.

## Set it up (2 minutes)

1. Push this repo to GitHub (branch `main`).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The included workflow publishes it.
3. Open the URL on your phone and use *Add to Home Screen* / *Install app*. It then works fully offline.
4. First launch: tap **Explore a sample** to look around, then **Set passphrase** and **Import a booking**.

Run locally: `python3 -m http.server 8000` then open http://localhost:8000. There is no build step and no dependencies.

## Privacy model, honestly

- Data lives in your browser's IndexedDB on each device. Unless you share a trip, there is no sync and Trip Vault makes no network requests. Move data with **Backup → Export**, or **Backup → Send by QR** to hand trips to another phone with no internet (an encrypted stream of QR codes read by the other phone's camera, unlocked with a one-time code).
- With a passphrase set, records and file blobs are encrypted before being written. The key is derived from the passphrase and never stored. **A forgotten passphrase cannot be recovered.**
- It does not protect against malware, malicious browser extensions, or someone using your unlocked device.
- Clearing site data deletes the vault. Take regular backups (the app reminds you).

- **Shared trips** go through the Google Drive of the people sharing them. A trip file (bookings, memories, file details) sits in the owner's Drive, and each attachment or photo sits in the Drive of whoever added it. All of it is gzip + AES-256-GCM encrypted on the phone with a key made from the trip code before upload. Google can see file sizes, timings and who a trip file is shared with, not what's in it. The code travels in the invite link's `#` part, which browsers never send to a server, so treat the link like a key. Attachments are shared as "anyone with the link" so the others can fetch them without extra Google permissions; the link only gives the encrypted bytes. Removing someone stops their access to the trip file, but they keep what they had already synced. Google sign-in is kept in memory for the session only.

## Set up Google sharing (once, about 10 minutes)

Whoever hosts this copy of Trip Vault does this once; everyone using it then just taps **Share** or **Join**.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project, e.g. *Trip Vault*.
2. **APIs & Services → Library**: enable **Google Drive API** and **Google Picker API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform): choose **External**, fill in the app name and your email, and add the scope `https://www.googleapis.com/auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app"). It is a non-sensitive scope, so you can **publish the app** without Google's review; until you do, add each person who will share or join as a **test user**.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Under *Authorized JavaScript origins* add `https://subhadipgithub.github.io` (your Pages origin) and `http://localhost:8000` for local testing. Copy the **Client ID**.
5. **Credentials → Create credentials → API key**. Restrict it: *Application restrictions → Websites* `https://subhadipgithub.github.io/*` and `http://localhost:8000/*`; *API restrictions* → Google Drive API and Google Picker API. Copy the key.
6. **IAM & Admin → Settings**: copy the **Project number**.
7. Put the three values in `js/sync-config.js` and push. They are public identifiers, not secrets.

Then: open a trip → **Edit → Share**, add your partner's Gmail, and send them the invite link. They open it, sign in with that Gmail and pick the shared trip file once.

## Known limits

- Pick your home currency in Settings (or on the welcome screen). Other currencies convert with per-trip rates you enter; the bundled sample trip is priced in INR/MYR.
- Parsers cover common Indian and international formats; always review extracted fields. OCR can confuse look-alike characters (it read a test PNR "K4XW7N" as "KAXW7N"), so PNRs from images are flagged for checking. Scanned PDFs (pages that are only images) are not OCR'd yet.
- Wrapped distance is estimated from flight time (no airport coordinates are bundled).
- Visa and entry rules are not bundled; the app reminds you to check official sources.
- Shared trips sync while Trip Vault is open (on opening, every few minutes, and shortly after a change); after an hour or a restart you tap the sync chip to reconnect Google. If two people edit the same booking between syncs, the later save wins (packing and ideas are part of the trip and merge the same way). Google Workspace accounts whose admin blocks link sharing can't share attachments, though trip data still syncs.

## Layout

`index.html` shell · `css/app.css` theme · `js/` modules (`core`, `store` encryption/IndexedDB, `parsers`, `model`, `forms`, `backup`, `security`, `memories`, `wrapped`, `search`, `avatars` travel crew, `gsync` Google sharing, `views`, `main`, `sync-config` Google IDs) · `vendor/` bundled libraries (three.js, OCR, QR) · `sw.js` offline cache.
