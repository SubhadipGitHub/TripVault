// Deploy step: write the Google sharing IDs into js/sync-config.js from the github-pages environment
// secrets (OAUTH_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_PROJECT_NUMBER, passed in as CLIENT_ID, API_KEY,
// PROJECT_NUMBER). These three are public identifiers: they end up in the deployed JavaScript.
// The OAuth client secret is never needed and never read here.
// If any value is missing or doesn't look right, the site still deploys with sharing off and the
// run shows a warning naming the secret (never its value).
const fs = require("fs"), path = require("path");
const file = process.env.TV_CONFIG_PATH || path.join(__dirname, "..", "..", "js", "sync-config.js");
const v = {
  clientId: (process.env.CLIENT_ID || "").trim(),
  apiKey: (process.env.API_KEY || "").trim(),
  appId: (process.env.PROJECT_NUMBER || "").trim(),
};
const rules = [
  ["clientId", "OAUTH_CLIENT_ID", /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/],
  ["apiKey", "GOOGLE_API_KEY", /^AIza[0-9A-Za-z_-]{35}$/],
  ["appId", "GOOGLE_PROJECT_NUMBER (the project number, digits only)", /^[0-9]{6,20}$/],
];
const bad = rules.filter(([k, , re]) => !re.test(v[k])).map(([, name]) => name);
if (bad.length) {
  console.log(`::warning title=Google sharing is off::${bad.join(", ")} ${bad.length > 1 ? "are missing or don't" : "is missing or doesn't"} look right in the github-pages environment secrets. The site is deployed without sharing.`);
  process.exit(0);
}
const src = fs.readFileSync(file, "utf8"), re = /const GSYNC=\{[\s\S]*?\};/;
if (!re.test(src)) {
  console.log("::warning title=Google sharing is off::js/sync-config.js has an unexpected shape, so the IDs were not written.");
  process.exit(0);
}
fs.writeFileSync(file, src.replace(re, () => `const GSYNC=${JSON.stringify(v)};`));
console.log("Google sharing IDs written to js/sync-config.js (values not shown).");
