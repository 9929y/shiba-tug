# Immersive interaction revision — 2026-09-08

## Delivered behavior

Full-viewport cream paper scene replaces the editorial card. Old heading, explanatory footer, chapter text, scoring button and result paragraph are removed. Only breed portraits, a route, an initial short drag hint, and a final restart icon remain visible. Screen-reader instructions and announcements remain available.

Pointer input begins on the leash hit path (minimum 44 CSS px width), captures the pointer, and updates pose, hand translation and preview in the event handler. Normalized horizontal distance drives the shared preview/commit function. Velocity can trigger a defensive response, but comfortable backoff held 150ms clears it. No physical force is inferred from mouse hardware.

Committed distance is retained immediately, displayed distance advances over 640ms with walking frames. Interrupting that animation retains earned distance. Cancel/blur/resize/switch discard only the current uncommitted preview. A completed route has a 5.2s rear-walk/look-back animation, with a 500ms reduced-motion alternative.

Eight distinct personality poses, eight side-walk poses and eight rear-walk/look-back poses are added. Black refusal alternates smug and laughing expressions; yellow refusal alternates a pout and head tilt. Success and backoff trigger affectionate expressions. These are behavior-triggered alternatives rather than palette substitutions.

## Checks

- 12 Node tests: responsive thresholds, continuous gains, backoff recovery, hit gating, immediate preview, preview/commit equality, cancel, interruption, breed failure/retention, full ending/restart, keyboard hold/release, reduced motion.
- Actual desktop mouse: 110px drag advanced to 8.44%; 250px black drag produced the refusal smile with 0% gain.
- Browser synthetic touch at 390px: hit gating, live preview, equal commit, overpull/recovery/cancel, successive input, skin persistence, ending/restart and no horizontal overflow passed.
- Initial 390px sample (30 events): dispatch→feedback median 0.30ms / P95 0.40ms; next rAF median 16.60ms / P95 17.40ms. These are browser scheduling/handler measurements, not input-to-photon or a guarantee for other devices.

## Limits

No physical phone was tested. Generated keyframes have some natural pencil/anatomy variation, so this is not continuous skeletal animation. Rendering interpolates hand/rope position and walk translation; character pose changes use reviewed cels. Builds are static, local only; no push or deployment was performed.

Final browser passes: yellow ending at 390px and black ending at 1280px both completed all checks. Yellow run: handler median/P95 0.40/0.60ms, next rAF 16.50/17.60ms. Desktop black run: handler 0.50/0.90ms, next rAF 16.60/18.20ms. Final camera was checked visually: full dog visible inside the doorway; no rectangular stage background. The browser tool also logged two unlocalized MutationObserver errors; this app and its current harness do not instantiate MutationObserver, and no behavioral check failed.

## Follow-up: repeat grip input, English UI and collar artifact

Reproduced a real hit-test failure at 7.91%: dragging the visible hand at (270,510) did not start another pull. Personality rendering switched the rope hit path to a cubic starting at source x=480, omitting the visible hand and front leash. Added a separate persistent grip hit path in both layouts, accepted by the same pointer state machine. Blank-stage presses still do nothing.

All production UI strings, accessibility descriptions, status/error messages and document language are now English; versioned entrypoint resources avoid stale mixed-language scripts. Removed the decorative collar ellipse that was being drawn on the chin, and derive the leash anchor from the widest saturated red band instead of averaging all red pixels (including mouth pixels).

Verification: 14 Node tests pass, including black grip input through completion and a production-language check. Actual CUA mouse drags from (270,510) to (125,510), nine consecutive pulls, reached 100% and the completed homecoming screen. Actual restart and overpull work; visual inspection confirms no chin circle. This addresses the gap in prior synthetic tests, which dispatched directly to the rope element and bypassed browser hit testing.
