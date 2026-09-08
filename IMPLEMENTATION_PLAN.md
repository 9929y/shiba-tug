# Implementation Notes — Shiba Tug 60-cel drag rebuild

The production renderer is a single full-scene cel player. It intentionally contains no visible SVG leash, independent hand SVG, dog sprite, text, buttons or status copy; a transparent SVG path only supplies a narrow pointer target over the leash painted inside each cel.

## Timeline

- 3 chapters × 20 real full-scene cels = 60 unique production frames.
- Each chapter contains idle, hover, take-up, two extra tension stages, two crouch stages, two alternating reactions, two 3/4 turn stages, front refusal, return, an added slide inbetween, slide, replant and settled frames.
- Action frames hard-cut at roughly 10–12fps with intentional holds; only chapter changes and end-to-start looping use a short whole-scene fade.

## State flow

`idle → take-up → tension → crouch → reaction(A/B) → turn → refusal → slide → next-step → complete`

Pointer distance is normalized from 4% to 22% of current stage width. A valid release permanently adds 0.035–0.14 stored progress. The current live tension selects the matching cel immediately; crossings at 1/3, 2/3 and 1 play the remaining forward cels through a real slide. No valid release is discarded, and the reaction branch alternates rather than repeating randomly.

## Production assets

- `assets/cels/source/`: original and transition-generation source sheets.
- `assets/cels/frames/`: 60 production WebP cels compressed at quality 88.
- Generation originals remain in the local generation cache; project-local source sheets preserve the selected derivation inputs.

## Validation completed

- Browser: 10 standard-strength releases accumulate smoothly to the complete rail, cross all three scene milestones and loop to the opening cel.
- Browser: the high-tension path reaches the 3/4 and front refusal cels; forward continuation returns to a side-view slide without replaying the drag-in frames.
- Input: direct rope pointer target, touch, Enter and Space.
- Layout: 390px viewport retains the complete connected scene; reduced-motion code limits frame holds and visual effects.
