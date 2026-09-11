# Interaction baseline and response pass

Baseline commit: `0c1511e`. Desktop browser viewport: 1280 × 720.

Observed with browser pointer input:
- 20px left drag: returns to idle, progress stays at `0.035`.
- 250px left drag: advances progress to `0.16640104529162802`; after release the button is disabled and stage is `settling`.
- Existing image has one illustrated hand plus the extra cursor hand. The painted leash and body are baked into the same cel.

Code-derived, not end-to-end latency measurements:
- Initial intent threshold is 4% of stage width (about 47px at the observed 1178px stage).
- Drag has about 13 tension poses, not all 60 assets in one continuous animation.
- Release locks input during 82ms/118ms-per-pose sequences and chapter transitions.
- At 390px viewport the fixed 3:1 stage is 122px high. Mobile visual verification remains pending: the browser connection ended before viewport testing.

Response pass:
- Separate the 4 CSS-pixel intent threshold from continuous visual tension.
- Cache stage bounds; update on resize, scroll, and new pointer interaction.
- Retain decoded images; stale image requests cannot replace a newer requested frame.
- Use a playback generation to invalidate previous asynchronous sequences when a new drag starts. Apply progress/chapter synchronously so interrupted milestones are retained.
- Remove cursor transform tween and native image dragging; cancel on lost capture and blur.

Verification: `node --test tests/interaction.test.cjs` covers short drags, interrupted playback, canceled queued input, and rapid milestone transitions with deterministic timers. These are state-machine regression checks, not GPU frame-time measurements. Browser retest, mobile rendering and resource-failure checks remain for final validation.

Follow-up after the browser connection was restored: `tests/baseline-check.html` loads the historical HTML/CSS/JS from commit 0c1511e. At 390px the measured stage is 366×122px. Two immediate button clicks both leave fill at 0.13441146381189384, with state settling / disabled true; measured lock for this sample is about 228ms. Further inputs reach ch2-idle, confirming the original milestone movement. These are browser-programmatic checks, not physical touch measurements.
