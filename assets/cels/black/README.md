# Black-and-tan Shiba alternate cels

22 individual 1536 × 512 WebPs, one for every active yellow pose in `frames.js`. Each was edited with the built-in imagegen tool, using its matching yellow frame as the edit target. `idle.webp` was reviewed first and used as the coat-reference image for the remaining 21 poses. Full generated PNGs live in `../source/v2/black-*.png`.

Shared prompt (all poses):

> Image 1 is the exact animation cel to edit. Image 2 is coat-color reference only, not the pose. Change only the orange dog's coat to a black-and-tan Shiba. Preserve image 1 pose, expression, silhouette, location, scale, paws, tail and ground. Warm charcoal crown/back/flanks/outer ears and outer tail; tan eyebrow dots, cheeks and legs; cream muzzle/chest/belly/inner tail. Preserve colored-pencil fur and brown ink outlines. Keep hand, sleeve, red leash/collar, metal clip, ivory paper and lighting unchanged. Full scene 3:1, no cropping, new objects, text, panels, borders or blur.

Only production resizing and WebP encoding followed generation; no CSS recolor/filter is used. All 22 outputs were visually inspected for full feet, connected leash, pencil texture and consistent coat markings. Generative edits retain small line/texture differences; they are matched alternate illustrations, not exact pixel masks.

Switching is transactional: decode the target set first, then replace the current pose, retain distance and cancel stale playback. A failed target load retains the previous breed and offers retry. Only the selected breed's decoded image references are retained after a successful switch.
