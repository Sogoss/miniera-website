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
});
