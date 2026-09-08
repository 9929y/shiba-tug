# Personality and homecoming art

Generated using the built-in image_gen tool on 2026-09-08. Source PNGs are in ../cels/source/v3; production WebP encoding uses sharp quality 92 with original alpha preserved. There are no remote asset dependencies.

## Active atlas cells

- yellow.webp / black.webp: 4 columns × 2 rows, 1536×1024. Only first-row cells 0–3 are used: two refusal reactions and two affectionate/success reactions. Unused second-row drafts remain in the source sheet, but are not counted as active poses.
- walk.webp: 4 columns × 2 rows. Yellow on row 0, black on row 1; four left-facing contact/passing poses each.
- home.webp: 4 columns × 2 rows. Yellow on row 0, black on row 1; two rear walking poses plus two look-back/tail positions each.
- house.webp: 1536×1024 pencil cottage with open door. Paper white point is normalized at load time onto the same page paper as the original cels.

The renderer measures occupied alpha bounds and red collar pixels once at load time for consistent foot baselines and leash connection anchors. The entire dog remains rigid between poses. Render-time rope curves bridge the hand and collar without stretching the dog.

## Prompt set (built-in tool)

House: realistic colored pencil and fine ink matching original yellow idle; small welcoming Japanese countryside cottage, open dark wooden door, amber interior, potted plants, full cottage centered, generous cream margins; no dog/person/text.

Black reactions: exact charcoal/tan/cream Shiba reference, transparent 4×2 atlas; front three-quarter planted smug squint/crooked grin, broad self-satisfied smile, left-facing ingratiating smile/tongue tip, affectionate grin; full paws/tail, red collar, no hand/leash/text.

Yellow reactions: exact original golden/cream Shiba reference, same atlas format; shy pout and puppy eyes, ears-back confused head tilt, hopeful sweet smile, happy closed-eye smile; same anatomy and pencil texture.

Home: reference both personality sheets; 4×2 transparent atlas, yellow row then black row, rear three-quarter upper-left walking with alternating feet followed by two smiling look-back poses with different tail positions; red collar, full paws, no house/leash/text.

Walk: 4×2 transparent atlas, golden row then charcoal/tan row; four LEFT-FACING side-profile contact/down/opposite-contact/passing poses, happy relaxed expression, red collars, fine ink and realistic colored-pencil fur, full dog within each cell, no leash/person/text.

A subsequent walking style edit produced a baked checkerboard background and was rejected; it is not shipped. Every shipped character atlas has a real alpha channel.
