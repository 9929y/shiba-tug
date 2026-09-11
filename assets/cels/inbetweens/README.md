# Response inbetweens, 2026-09-08

Generated with the built-in imagegen tool using the existing cels as edit references. Seven production WebPs, 1536 × 512, quality 88. Original generated PNGs are retained in `../source/v2/`. `tools/import-cel.cjs` only resizes and encodes; it does not synthesize intermediate motion or recolor art.

Prompt set (shared invariants): one full-scene 3:1 animation inbetween, same dog identity/scale, ochre cream colored-pencil fur, brown contours, ivory paper, same red collar and continuous red leash/metal clip, same complete human hand/beige sleeve, all paws and tail visible, no text/panels/blur/duplicate contours.

| Output | References / requested change |
|---|---|
| ch1-soften | idle → new takeup, halfway, pronounced rope sag, dog upright |
| ch1-takeup | idle → pull, halfway, rope halfway tightened |
| ch1-tight-1 | pull → brace, halfway bent elbows |
| ch1-tight-2 | brace → reaction-a, one-third lowered chest |
| ch1-crouch-1 | brace → reaction-a, two-thirds lowered chest |
| ch1-lift | return → slide-1, halfway lowered front paw |
| ch1-land | slide → replant, halfway rising body and relaxing rope |

Review: new takeup/tight-1/tight-2/crouch-1 retain feet within the image; the old versions clipped feet and changed scale. New soften/lift/land add temporal samples. Direct decoded swaps are used, with no alpha blending/ghosting. For return+lift and slide+land each pair shares the original hold budget. The sample is integrated in chapter one first; shared-coordinate expansion is part of the movement pass, rather than blindly inserting chapter-one positions in later chapters.

`tests/art-review.html` compares the first six tension poses at the same frame positions and timing, and includes a 390px game viewport. Generation improves the major cropping errors but is not pixel-perfect interpolation; small pencil/ground texture changes remain.
