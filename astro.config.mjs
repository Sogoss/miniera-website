// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The domain has not been bought yet (decided: we come back to it once the
  // site is finished). When it exists it goes here: it feeds the canonical
  // URLs, the sitemap and the Open Graph meta of the event pages, which are
  // the whole reason the /81 URLs exist.
  // site: 'https://www.laminieraculturale.it',

  // No Tailwind: the design system is already a token system in plain CSS
  // (src/styles/tokens). Adding Tailwind would mean maintaining a translation
  // between two vocabularies that say the same thing, for ever.

  vite: {
    server: {
      // Vite answers «Blocked request. This host is not allowed» to anything
      // that reaches it under a hostname it does not know — which is every
      // tunnel. These are the domains a tunnel hands out, so that a phone can
      // open the development server without the site being published: the
      // checks on a real telephone are the ones this project cannot do any
      // other way. It has no effect on a build.
      allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io', '.trycloudflare.com'],
    },

    build: {
      // The browser floor of docs/vincoli-tecnici.md, told to the minifier.
      //
      // Left to itself it rewrites `@media (max-width: 900px)` as
      // `@media (width <= 900px)` — the range syntax, which is Safari 16.4 and
      // later. Every media query of the scroller would then be ignored on iOS
      // 15.4 to 16.3: the phone gets the desktop layout, with two columns on a
      // 390px screen, and nothing anywhere says so. It is the collapsed
      // fallback again, in another disguise — the source is right and the
      // published file is not.
      //
      // 15.4 because that is where `svh` arrives, which is the constraint that
      // sets the floor in the first place.
      cssTarget: ['safari15.4', 'chrome100', 'firefox100', 'edge100'],
      target: ['safari15.4', 'chrome100', 'firefox100', 'edge100'],
    },
  },
});
