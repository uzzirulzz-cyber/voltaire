/**
 * voltaire.ts — the living world, extracted.
 *
 * The VOLTAIRE world page (People Playing With The Beat) is deployed on
 * Cloudflare R2 at the custom domain voltaire.playbeat.digital (bucket
 * "voltaire", objects served directly). R2 has no index-document resolution
 * at "/", so deep-link with /index.html — a ready Worker ("voltaire-world")
 * is uploaded and maps "/" → index.html the moment it gets the zone route.
 */
export const VOLTAIRE_URL = "https://voltaire.playbeat.digital/index.html";
export const VOLTAIRE_LABEL = "voltaire.playbeat.digital";
