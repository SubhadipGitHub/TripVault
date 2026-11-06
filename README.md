# Trip Vault

A private, offline-first home for everything about a trip: bookings, tickets, passports, payments, the day-by-day plan, expenses, packing and memories. Domestic and international. No account, no server, no tracking.

**Live:** https://subhadipgithub.github.io/TripVault/ (after you enable Pages, see below)

## What it does

- **Smart import**: drop PDF e-tickets, `.eml`, HTML or pasted SMS (airlines, Booking.com/Agoda, IRCTC). Fields are extracted on-device and you confirm them. Duplicate files and duplicate bookings are flagged.
- **Plan**: per-day timelines with airport/station buffers, check-ins, time zones and tappable free slots.
- **Vault**: bookings, documents (passport/visa/insurance expiry checked against trip dates), money (paid vs pending, multi-currency, per-trip exchange rates), packing lists (domestic or international) and emergency notes.
- **Search everything** (`Ctrl/Cmd+K` or `/`): trips, PNRs, names, notes, memories and the text inside imported PDFs.
- **Memories**: a photo journal with moods and highlights.
- **Wrapped**: story cards for a trip, a year or all time. Save as PNG, ZIP, share, or print a trip book. "Hide amounts" for safe sharing.
- **Security**: optional passphrase encryption (AES-256-GCM, PBKDF2-SHA256 600k) of all data at rest, idle auto-lock, encrypted `.tvault` backups, and a Content-Security-Policy that blocks all network requests.

## Set it up (2 minutes)

1. Push this repo to GitHub (branch `main`).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The included workflow publishes it.
3. Open the URL on your phone and use *Add to Home Screen* / *Install app*. It then works fully offline.
4. First launch: tap **Explore a sample** to look around, then **Set passphrase** and **Import a booking**.

Run locally: `python3 -m http.server 8000` then open http://localhost:8000. There is no build step and no dependencies.

## Privacy model, honestly

- Data lives in your browser's IndexedDB on each device. There is no sync; move data with **Backup → Export**.
- With a passphrase set, records and file blobs are encrypted before being written. The key is derived from the passphrase and never stored. **A forgotten passphrase cannot be recovered.**
- It does not protect against malware, malicious browser extensions, or someone using your unlocked device.
- Clearing site data deletes the vault. Take regular backups (the app reminds you).

## Known limits

- Base currency is INR; other currencies convert with rates you enter.
- Parsers cover common Indian and international formats; always review extracted fields. Images are attached but not OCR'd.
- Wrapped distance is estimated from flight time (no airport coordinates are bundled).
- Visa and entry rules are not bundled; the app reminds you to check official sources.

## Layout

`index.html` shell · `css/app.css` theme · `js/` modules (`core`, `store` encryption/IndexedDB, `parsers`, `model`, `forms`, `backup`, `security`, `memories`, `wrapped`, `search`, `views`, `main`) · `sw.js` offline cache.
