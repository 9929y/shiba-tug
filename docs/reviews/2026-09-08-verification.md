# Final verification

## Baseline evidence

Original commit `0c1511e`, browser viewport 1280×720: 20px drag does not advance, 250px drag advances but disables further interaction during settling. See `2026-09-08-input-baseline.md`. A later replay of the unmodified baseline in a 390px browser iframe measured an actual 366×122px stage, two immediate button activations retaining the same progress (the second was ignored), about 228ms of input lock for that sample, and successful progression to chapter 2. `tests/baseline-check.html` reproduces this. No physical phone was used.

## Current browser evidence

- Desktop 1280×720: full scene, breed picker, status and controls fit the viewport. Real 110px left drag advances from 0% to 8%.
- Switch to black: selected control and canvas description change to black, pose stays matched, progress stays 8%.
- Enter and Space on the visible gentle-pull button advance black from 8% to 32%. Browser error/warning log empty for this run.
- 390px iframe: taller composition, complete dog, readable controls, no horizontal page overflow. PointerEvent with touch type is synthetic and is not an actual mobile-device latency test.
- Browser diagnostics: short pull, interrupt, cancel, excessive-pull refusal, switch mid-animation, persistent finish, restart, 44 successful image loads/decodes, and phone overflow check pass.
- Final 40-sample probe: synchronous input-dispatch → DOM feedback median **0.60ms**, p95 **1.40ms**. This includes the input handler; decoded art redraws only on a pose change. Walking timing remains rAF-driven.
- Canvas draw calls during the probe: 624 calls across 26 renders, total measured draw CPU 4.20ms. The smooth rope mapping uses 21 strips, reduced from 105.
- Browser scheduling remained variable: the initial rAF probe was 16.80/18.50ms median/p95; later runs included 31.40/72.40ms and 41.00/116.00ms. The final probe was 32.20/80.90ms. These are environment-dependent observations, not physical input-to-photon measurements. The application now avoids imposing this rAF wait on input handling, but does **not** guarantee a stable 60fps display on every device.

## Automated checks

`node --test tests/interaction.test.cjs`: ten tests pass. Coverage includes moderate vs excessive force, rigid hand/dog geometry, interruption, cancellation, retained progress, persistent completion, breed switch during a step, missing target asset, final-step switch, reduced-motion behavior, and immediate pointer feedback before rAF.

`git diff --check` passes. All 44 active full-scene production images are 1536×512. Generated outputs were visually reviewed while produced. Seven yellow inbetweens and 22 black alternates preserve the existing medium; slight texture/line differences remain.

## Implementation limits

This is a deliberately small, silent game with three progress beats, not a level editor or a 3D simulation. The artwork is still discrete cels. The leash span uses continuous horizontal remapping for position; the dog is never scaled or stretched as it walks. On mobile only the far-left sleeve is cropped. No deployment or remote Git push is part of this local change set.
