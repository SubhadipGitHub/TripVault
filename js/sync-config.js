"use strict";
/* Google sharing setup. These are public identifiers (they ship in every web app that uses Google
   sign-in), not secrets: the OAuth client only works from the origins you list in Google Cloud, and
   the API key should be restricted to this site and to the Drive and Picker APIs.
   Leave them empty and Trip Vault stays fully offline; the Share button explains it isn't set up.
   How to get them: README → "Set up Google sharing". */
const GSYNC={
  clientId:"", // OAuth 2.0 Client ID (Web application), ends in .apps.googleusercontent.com
  apiKey:"",   // API key restricted to Google Drive API + Google Picker API and this site's address
  appId:""     // Google Cloud project number (digits only)
};
