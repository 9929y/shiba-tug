# Implementation Notes — Shiba Tug 36-cel rebuild

The production renderer is a single full-scene cel player. It intentionally contains no visible SVG leash, independent hand SVG, dog sprite, text, buttons or status copy; a transparent SVG path only supplies a narrow pointer target over the leash painted inside each cel.

## Timeline

- 3 chapters × 12 real full-scene cels = 36 unique production frames.
- Each chapter has idle, hover, pull, brace, two reaction branches, turn, front refusal, return, slide, replant and settled frames.
- The third pull selects `reactionA` or `reactionB`; the fourth plays the front refusal through to replant.
- Action frames are hard-cut at roughly 10–12fps with intentional holds; only chapter changes and end-to-start looping use a short whole-scene fade.

## State flow

`idle → pull-1 → brace → reaction(A/B) → refusal → slide → next-step → complete`

Each chapter consumes four pulls. The fourth starts the automatic front refusal, returns to side profile, slides a half step, replants, then shifts the whole illustrated stage for the next chapter.

## Production assets

- `assets/cels/source/`: 18 1536×1024 source sheets, each containing two 1536×512 wide cels.
- `assets/cels/frames/`: 36 production WebP cels compressed at quality 88.
- Generation originals remain in the local generation cache; project-local source sheets preserve the selected derivation inputs.

## Validation completed

- Browser: four pulls advances each chapter; all three complete after 12 pulls, fill the gradient rail, then loop to the opening cel.
- Browser: the refusal state reaches the turn cel; transition returns to a side-view slide cel without per-frame dissolves.
- Input: direct rope pointer target, Enter and Space.
- Layout: 390px viewport retains the complete connected scene; reduced-motion code limits frame holds and visual effects.
