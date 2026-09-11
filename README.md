# Shiba Tug

A full-screen, paper-textured, hand-drawn leash-walking mini-game. Hold the red leash and drag it left to build up progress, release to take a step; switch between the yellow shiba and the black shiba avatars.

## Run

From this directory, run `python3 -m http.server 8767 --bind 127.0.0.1`, then open http://127.0.0.1:8767/ in a browser. It's a pure static site with no build step, backend, or runtime dependencies. Don't open the HTML file directly — asset loading requires same-origin HTTP.

## Game rules

- While dragging, a light-colored preview shows this pull's projected gain; after releasing, the solid progress bar advances with each step.
- A full pull spans 24% of the stage width, clamped to 90–220 CSS px.
- Pulling less than 8% adds no progress; 8%–25% gives small steps; 25%–70% gives continuous gains; 70%–90% gives diminishing gains; reaching 90% causes resistance first, then an 8% advance — it never gets stuck in a zero-progress loop.
- Easing off appropriately grants a 2% bonus, capped at 14% per pull. A moderate pull earns 6%–14%; after overpulling, returning to 25%–70% and holding for 150ms restores it.
- When the black shiba refuses, it alternates between a smug squint and a laugh, then turns endearing after easing off; the yellow shiba looks upset and tilts its head when refusing, and looks happy on success. Success poses alternate expressions.
- On finishing the course, a 5.2-second animation plays of walking home and looking back to wag its tail; after a pause, the game can be replayed.
- The leash area can be focused and controlled with the left arrow key to pull and the right arrow key to ease off; releasing both keys settles the result. Reduced-motion settings shorten the step and ending animations.

## Assets and verification

The existing two sets of 22 frames are kept, plus 24 newly added character poses actually in use (8 personality reactions, 8 side-walking, 8 homecoming poses). See `assets/personality/README.md` for the new assets. Original generated images are stored in `assets/cels/source/v3/`.

Run `node --test tests/interaction.test.cjs`; open `tests/browser-check.html` in a browser to run synthetic touch and response-time checks. Synthetic input tests are not the same as measuring latency on a physical phone or from input to screen photon.

See `docs/reviews/immersive-v3.md` for the current implementation and verification record. Earlier reviews and superpowers docs are historical and do not reflect the current interface.
