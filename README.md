# Harley's Handmade

Custom woodworking — Owingsville, Kentucky.
Built by Impact Marketing KY.

## What this is

A single-page interactive homepage. On desktop you open looking down at a board
with the maker's mark burned into it, then scroll to pitch down onto the surface
and walk its length — each imperfection in the wood (the knot, the wormhole, the
saw marks, the check crack, the far end) opens a section of the site.

Phones get a different layout entirely: same content, same copy, same prices,
laid out vertically with tap targets and a pinned call bar. Phones never download
the large board texture.

## Stack

Static HTML/CSS. No framework, no build step, no dependencies.
Motion is native CSS scroll-driven animation (`animation-timeline: scroll()`),
so there are no JavaScript scroll handlers and nothing blocks the main thread.
Browsers without scroll-timeline support, and anyone with reduced-motion enabled,
get a plain stacked readable page automatically.

## Deploy

Static. Point Cloudflare Pages at this repo, no build command, output = root.

## Still to come

- shop.html · custom.html · process.html · story.html (linked, not yet built)
- Two blog posts: the three-generation story, and the new shop build-out
- Square checkout wiring (cart is built and persists; payment is the last mile)
- Real Facebook and Google Business Profile URLs
