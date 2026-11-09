# Trip Vault feature audit

November 2026, against v1.5 (`f7fb7b5`). This audit covers what the app does, where each feature is reached from, what was regrouped in v1.6, and what is still open.

## Summary

Trip Vault adds features well, but it adds an entry point every time it adds a feature. By v1.5:

- **Today** rendered up to 12 cards: the trip card, Get ready / On the ground, Getting started, the Wrapped teaser, Capture, Today's timeline, Tonight, Next up, Coming up, the Paid/Pending tiles, Trip readiness and Quick actions.
- **Vault** had 5 sub-tabs, and the **account menu** had up to 11 items.
- **Settings** had 8 tabs, so they scrolled sideways on a phone.
- Many actions could be reached from 3 to 6 places, and several features sat in the wrong place: the currency converter and the trip's emergency numbers were in *Packing*, device storage was in *Documents*, Places & phrases were in the *account* menu, and Ideas, a planning tool, was in the *Vault*.

v1.6 regroups the app without removing any feature. Everything that moved is still reachable, and every moved feature has a ⌘K / `/` search action.

| | v1.5 | v1.6 |
|---|---|---|
| Today cards (sample trip, before departure) | 8 | 6 |
| Vault sub-tabs | 5 | 4 |
| Plan sub-tabs | – | 2 (Days, Ideas) |
| Account menu items (signed in, locked vault) | 11 | 5 + profile header |
| Settings tabs | 8 | 6 |
| Tiles in Today's Get ready / On the ground | 5–8 | 4 (3 + More) |

## Feature inventory

The **Entry points** column lists where each feature was reached from in v1.5. **v1.6** is where it lives now. The verdict applies to the feature as it stands after v1.6.

| Feature | Code | Entry points in v1.5 | v1.6 | Verdict |
|---|---|---|---|---|
| Smart import (PDF, eml, SMS, OCR) | `forms.js openImport`, `parsers.js`, `ocr.js` | Welcome, + menu, Today quick actions, empty Bookings, empty Plan, Getting started, share target, shortcut, ⌘K | + menu, empty states, Getting started, share target, shortcut, ⌘K | Keep |
| Manual add (11 kinds) | `main.js addMenuSheet`, `forms.js` | + menu, Bookings Add, Plan day buttons, Docs Add | unchanged | Keep |
| Trip switcher / trips list | `forms.js openTrips` | header | unchanged | Keep |
| Trip settings (dates, crew, budget, currencies, language) | `forms.js openTrip` | trip card Edit, readiness, Money "set budget", Plan empty | **Trip menu** → Trip settings, plus the contextual links | Keep |
| Share trip (Google Drive) | `gsync.js openShare` | Today quick actions, trip settings footer, sync chip, ⌘K | **Trip menu**, sync chip, Settings → Sync, ⌘K | Keep |
| Duplicate trip | `ideas.js duplicateTrip` | trip settings footer | **Trip menu**, ⌘K | Keep |
| Delete trip | `forms.js openTrip` | trip settings footer | trip settings footer | Keep |
| Plan calendar + day timeline | `views.js planDays` | Plan tab | Plan → **Days** | Keep |
| Ideas board | `ideas.js viewIdeas` | Vault → Ideas | **Plan → Ideas**, ⌘K | Moved |
| Bookings list | `views.js viewBook` | Vault → Bookings | unchanged | Keep |
| Documents + files | `views.js viewDocs` | Vault → Documents | unchanged | Keep |
| Trip emergency numbers (free text) | `views.js emgNotes` | Vault → **Packing** (`essentials()`) | **Vault → Documents** | Moved |
| Emergency card (medical ID, lock screen) | `security.js` | Packing card button, Settings → Emergency card tab, ⌘K, lock screen | Documents card button, **Travel kit**, Settings → **Security**, ⌘K, lock screen | Merged into Security |
| Storage used / make persistent | `backup.js storFill` | Vault → **Documents** | Settings → **Backup & storage** | Moved |
| Money: budget, payments, rates, expenses | `views.js viewMoney` | Vault → Money; Paid/Pending duplicated on Today | Vault → Money only | Keep |
| Quick currency converter | `views.js converter` | Vault → **Packing** | **Money**, under Exchange rates | Moved |
| Spend by day | `ideas.js dailySpend` | Money, always open | Money, **collapsed** | Hidden |
| Category limits | `extras.js openCatBudgets` | Money "Limits" | unchanged | Keep |
| Split & settle up + UPI | `extras.js settleCard`, `apps.js upiPayBtn` | Money; Pay tile on Today | Money; Pay in the Travel kit | Keep |
| Export costs (CSV / printable) | `extras.js` | Money card, ⌘K | **Trip menu**, Money (collapsed), ⌘K | Keep |
| Packing list + sets | `views.js viewPacking` | Vault → Packing | Vault → Packing (list only) | Keep |
| Getting started checklist | `views.js startList` | Today | Today | Merge (open) |
| Trip readiness | `model.js readiness` | Today | Today, after Coming up | Keep |
| Next up / Coming up / Tonight | `views.js` | Today | Today | Keep |
| Today's Paid / Pending tiles | `views.js viewToday` | Today | – (Money has them; Coming up lists dues) | **Removed from Today** |
| Quick actions card | `views.js viewToday` | Today | – (+ menu and Trip menu) | **Removed** |
| Copy itinerary | `main.js A.copyItin` | Today quick actions, Plan header | **Trip menu**, Plan header | Keep |
| Add to calendar (.ics) | `extras.js exportICS` | Today quick actions, Coming up, ⌘K | **Trip menu**, Coming up, ⌘K | Keep |
| Show-at-gate pass | `pass.js` | Next up, ⌘K, shortcut | Next up, **Trip menu**, **Travel kit**, ⌘K, shortcut | Keep |
| Cab / directions hand-off | `apps.js` | Today tiles, place pins | Today tiles (during the trip), Travel kit, place pins | Keep |
| Places + "show the driver" | `apps.js openPlaces` | Today tile, Ideas header, **account menu**, Translate sheet | **Travel kit**, ⌘K | Moved |
| Offline map | `apps.js openOfflineMap` | Today tile, Places | Today tile (before the trip), Travel kit, Places | Keep |
| Translate | `apps.js openTranslate` | Today tile, place buttons | Today tile, Travel kit, ⌘K | Keep |
| Phrasebook | `phrases.js` | Today tile, Ideas header, **account menu** (via Places), Places, Translate | Today tile (before the trip), Travel kit, Places, Translate, ⌘K | Keep |
| Conversation (voice) | `converse.js` | Today "Talk" tile, Translate | **Travel kit**, Translate, ⌘K | Keep (heavy, see below) |
| Offline speech & language packs | `offline-ai.js`, `ai-worker.js` | Settings → Apps, Conversation | unchanged | Keep, heavy |
| Memories journal | `memories.js` | Memories tab, + menu, Today quick actions, Today capture card, Getting started | Memories tab, + menu, Today capture card, Getting started | Keep |
| Trip Wrapped | `wrapped.js` | Today teaser, Memories teaser, ⌘K | the teasers, **Trip menu**, ⌘K | Keep |
| Printable trip book | `wrapped.js printTripBook` | **only inside Wrapped** | Wrapped, **Trip menu** | Surfaced |
| Search / command palette | `search.js` | header, ⌘K, `/`, shortcut | unchanged, +10 actions | Keep |
| Passphrase lock | `security.js` | header lock, **account menu**, Settings → Security, Welcome, Getting started, ⌘K | header lock, Settings → Security, Welcome, Getting started, ⌘K | Keep |
| Backup / restore / QR transfer | `backup.js`, `transfer.js` | Settings, Getting started, Documents storage card, readiness, ⌘K | Settings → Backup & storage, Getting started, readiness, Trip menu, ⌘K | Keep |
| Google sync + devices | `gsync.js` | account menu (Sync, **Add a device**, **Get trips**), Settings → Sync | account menu → Sync, Settings → **Sync & devices** | Keep |
| Profile (a name) | `profile.js openProfile` | account menu item, ⌘K | account menu **header**, ⌘K | Hidden |
| Privacy & DPDP rights | `privacy.js` | account menu, Settings tab, tour, Help, About | unchanged (kept prominent on purpose) | Keep |
| Help (?), tour, About | `help.js`, `profile.js` | header ?, sheet ?, account menu (Help & tour, About us) | header ?, sheet ?, account menu → **Help & about** (Tour, Privacy notice and About buttons) | Merged |
| Day planner + buffers | `security.js` | Settings → Planner tab | Settings → **General** → Day planner | Merged |
| Travel crew (3D characters) | `avatars.js`, `vendor/three` | Welcome, Today, Memories, empty states, Wrapped | unchanged | Remove candidate (see below) |
| Hindi interface (beta) | `i18n.js` | Welcome, Settings → General | **removed in v1.7**; the privacy notice keeps its Hindi version | Removed |

## Duplication found (v1.5 entry points per action)

| Action | Places | Comment |
|---|---|---|
| Import | 6 in-app + share target + shortcut | Fine: it's the primary verb. Dropped the Today quick-actions copy. |
| Capture memory | 5 | Dropped the Today quick-actions copy. |
| Places / Phrases | 5 | Now the Travel kit, plus the Translate and Places sheets. |
| Share trip | 4 | Now Trip menu + sync chip + Settings. |
| Lock now | 3 | Dropped the account-menu copy; the header button is always visible when locked. |
| Backup | 4 | Kept: it's a safety nudge. The Documents storage card moved to Settings. |
| Add to calendar, Copy itinerary | 2 each | The generic copies moved into the Trip menu; the contextual buttons (Coming up, Plan) stay. |
| Exchange rates | 2 (trip settings text box, Money inputs) | Left as is; see open recommendations. |
| `A.gsHub` | defined twice in `main.js` | The first definition was dead; removed. |

## Weight and maintenance cost

| Item | Size | Cost |
|---|---|---|
| `vendor/transformers` (offline speech & translation runtime) | 27 MB in the repo; 76 MB to 890 MB per pack, downloaded on request | Only loaded on use and not precached, so the app is unaffected; the cost is repo size. |
| `vendor/tesseract` (screenshot OCR) | 15 MB in the repo, ~7 MB on first use | Earns its place: screenshots of tickets are a common import. |
| `vendor/three` + `js/avatars.js` (travel crew) | 720 KB + 24 KB, **precached on install** (`sw.js` SHELL) | Every install downloads it. The intro delays the first-run tour, and it runs on 6 screens. |
| `js/i18n.js` (Hindi) | 43 KB | A MutationObserver translates exact-match strings. Every new or changed English string needs a dictionary entry, or it silently stays in English. v1.6 already adds untranslated strings (below). |

## Target layout (implemented in v1.6)

```
Header:  [logo] [trip switcher ▾] [search] [lock*] [?] [profile ●]
Bottom:  Today · Plan · (+) · Vault · Memories

Today    trip card [Trip ⋯] → Trip menu
         Get ready / On the ground: 3 tiles + More → Travel kit
         Getting started · (during: Capture, Today, Tonight) · Next up · Coming up · Readiness · Wrapped
Plan     Days | Ideas
Vault    Bookings | Documents (+ emergency numbers) | Money (+ converter, folds) | Packing
Memories journal + Wrapped

Trip menu   Trip: settings · share · duplicate
            On the day: show pass · copy itinerary · add to calendar
            Export: costs CSV · expense report · back up
            Keepsakes: Wrapped · trip book
Travel kit  Getting around: cab · directions · places · offline map
            Language: translate · talk · phrases
            Essentials: show pass · emergency card · pay by UPI
Account     [profile header → Profile] · Sync, sharing & devices / Connect · Settings
            · Privacy & your data · Help & about · Disconnect
Settings    General (+ day planner) · Apps · Sync & devices · Backup & storage
            · Security (+ emergency card) · Privacy & data
```

Old deep links still work. `openSettings("planner")` and `openSettings("emergency")` open the merged tab and scroll to the section. `go("ideas")` opens Plan → Ideas. A stored Vault → Ideas tab boots into Plan → Ideas.

## Open recommendations (not done in v1.6)

1. ~~**Remove the Hindi UI**~~ **Done in v1.7.** The privacy notice keeps its Hindi version (a toggle inside the notice), because the DPDP Act lets people read the notice in an Eighth Schedule language. The interface is English only, and a stored interface language is dropped on launch. The original plan was to delete `js/i18n.js`, the `L2()`, `TOUR_HI` and `hiOn` call sites, both language pickers, the script tag and its SW shell entry, and migrate a stored `lang:"hi"` to `"en"`. Its coverage is already partial, and these v1.6 strings have no translation: Trip, Days, Ideas, More, Travel kit, Trip menu and its rows, Sync & devices, Backup & storage, Help & about, Emergency contacts, Day planner.
2. **Merge Getting started into Trip readiness.** Both are checklists on Today, and two of the five Getting started steps (travel documents, backup) are also readiness checks.
3. **Done in v1.8 (lazy, Calm by default).** three.js is no longer in the service worker's install list. It loads the first time characters are shown, and the worker caches it then; on the very first visit it asks the worker to cache it, so it still works offline. With Calm or Full, a new user still downloads it at once, because the welcome screen shows a crew. The saving is for Off, which never downloads it, and for an install that no longer depends on it. New installs default to Calm (no launch intro), so the tour appears at once. The original recommendation was: **Make the travel crew opt-in, or at least lazy.** Remove `three.*.min.js` from the precache, load it on first use, and default `anim` to "calm" (no intro). This saves 720 KB on every install and gets the tour on screen sooner.
4. **One exchange-rate input.** Trip settings has a free-text `MYR=19.2, USD=84.5` field, and Money has per-currency inputs. Keep the Money inputs and drop the text field.
5. **Three currency fields per trip** (home, local, "Spend in"). "Spend in: Auto" already derives from local, so consider hiding it behind "More options".
6. **Onboarding has four layers:** the Welcome "Set up in 30 seconds" card, the tour, Getting started and readiness. After item 2, the Welcome card could keep just the three start buttons.
7. **Offline AI packs.** They're well isolated (on demand, never precached), so they can stay. If repo size matters, ship `vendor/transformers` as a release asset instead of committing it.
