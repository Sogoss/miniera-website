// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Il dominio non e ancora stato acquistato (deciso: se ne riparla a sito
  // finito). Quando c'e, va messo qui: serve a canonical, sitemap e ai meta
  // Open Graph delle pagine evento, che sono il motivo per cui esistono gli
  // URL /81.
  // site: 'https://www.laminieraculturale.it',

  // Niente Tailwind: il design system e gia un sistema di token in CSS puro
  // (src/styles/tokens). Aggiungere Tailwind significherebbe mantenere per
  // sempre una traduzione fra due vocabolari che dicono la stessa cosa.
});
