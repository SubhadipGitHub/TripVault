# Vendored three.js

Draws the travel-crew characters (`js/avatars.js`). It is loaded on demand with a dynamic `import()` after the first screen is drawn, so it never delays start-up. It is precached by the service worker so the characters also work offline.

| File | Source | Version | Licence |
|---|---|---|---|
| `three.module.min.js` | [three](https://github.com/mrdoob/three.js) `build/three.module.min.js` | 0.180.0 | MIT (`LICENSE`) |
| `three.core.min.js` | [three](https://github.com/mrdoob/three.js) `build/three.core.min.js` (imported by the file above) | 0.180.0 | MIT (`LICENSE`) |

Files are copied unmodified from the npm package. To update, run `npm pack three@<version>`, copy those two files from `package/build/` and `package/LICENSE` here, then bump `VERSION` in `sw.js`.

SHA-256 for 0.180.0:

```
e2b5ee6bccd38fd6d8a2428546b83c5f2426d84b152ef82be8055556e3b40eb6  three.module.min.js
61ba0df005b05991361d040d8ff670e1aadfd0ce7aeebd1fdb0725957a8957de  three.core.min.js
```
