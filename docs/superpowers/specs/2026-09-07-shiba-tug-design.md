# Shiba Tug — Design Spec

## Intent

Create a single-page, joyful browser mini-game in which the player gently pulls a leash and a stubborn Shiba Inu moves only after repeated, varied tugs. The joke is never that the player can overpower the dog; it is that the dog reluctantly negotiates each tiny step.

## Visual language

- Wide, side-on stage on warm ivory paper with one faint ground shadow.
- The Shiba is a rounded warm-ochre and cream character, with a red collar and leash, irregular dark-brown ink contours, and colored-pencil grain. It is a polished illustration rather than a stick figure or flat vector mascot.
- Only the puller’s cropped hand and sleeve enter from the left. The dog owns the scene.
- Motion lines, tiny dust puffs, and squash/stretch are sparse hand-drawn accents, not interface decoration.
- No score, timer, navigation chrome, labels over the dog, or visual clutter. A compact opening instruction and a discreet progress cue are allowed.

## The interaction loop

The leash starts loose in a hanging curve. Hovering or focusing it gives the player an inviting, small wiggle and a hand-shaped affordance. Pressing, dragging left, or tapping invokes one tug.

Each tug advances an internal `resistance` rhythm rather than a deterministic counter. The first few tugs mainly animate the leash: it tightens, stretches, trembles, and springs back. The dog selects an expressive reaction — glance away, planted crouch, puffed cheeks, low-body drag, or a small annoyed recoil. A successful tug moves the dog only a short distance toward the left, then rebuilds resistance for the next step.

The game completes after the dog crosses a short finish distance. Completion is a soft, funny concession: the dog takes one final tiny step with a wounded expression, then receives a warm celebratory beat. Restarting is always available without a page reload.

## 2.5D refusal beat

The primary play view remains horizontal. When a run of forceful-but-unsuccessful tugs reaches the refusal threshold, the game takes control of the camera for about 1.2 seconds:

1. The side-view leash reaches full tension; floor and rope gain a short spring vibration.
2. The paper scene tilts and crossfades through a lightly blurred perspective transition.
3. A front-facing illustration of the same Shiba fills the centre: cheeks full, eyebrows low, collar and red leash diagonally entering from the lower left. This is the silent “NO” face.
4. The scene rotates/crossfades back to the side view; the dog permits a half-step, then immediately plants itself again.

This is an illustrated 2.5D camera illusion, not a 3D dog model. It preserves the handmade linework, avoids uncanny morphing, and is safe to fall back to a brief flat crossfade on reduced-motion devices.

## Artwork plan

Generate and use isolated, consistent character illustrations. Prefer transparent backgrounds; when the image tool delivers a uniform ivory sprite sheet instead, match the game stage to that paper tone and never apply a rectangle-shaped shadow to the sheet:

| Asset | View | Game purpose |
| --- | --- | --- |
| `side-idle` | side, leash slack | opening and reset pose |
| `side-brace` | side, paws planted / body low | tug resistance |
| `side-squash` | side, cheeky compressed resistance | high-tension variation |
| `front-refusal` | front, stubborn face, leash toward viewer | 2.5D refusal beat |
| `side-slide` | side, one reluctant step | small progress success |
| `side-concede` | side, final tiny step / softened face | ending beat |

The dog’s colours, collar, outline weight, paper texture, scale, and ground contact must match across all six assets. The code supplies rope deformation, dust, and camera motion; it does not attempt to generate the dog with CSS. The shipped sheet uses the uniform-ivory fallback, integrated by a matched stage colour rather than a visible card treatment.

## Implementation architecture

The finished project is a dependency-free static site in `shiba-tug/`:

- `index.html` defines the accessible stage, minimal instructions, restart control, and layered art slots.
- `styles.css` contains paper, rope, depth, responsive layout, hover/focus, reduced-motion, and animation keyframes.
- `game.js` is a small finite-state machine (`idle`, `tugging`, `bracing`, `refusal`, `sliding`, `complete`) that maps pointer/keyboard input to animation sequences and prevents conflicting interactions.
- `assets/` contains only approved final Shiba frames and any small texture assets.

State holds the dog’s progress, consecutive resistance count, current pose, whether the refusal beat is available, and a seeded/small shuffled reaction queue. Pointer drag distance affects tug intensity but is clamped so it never rewards brute force or causes abrupt movement.

## Accessibility and failure handling

- The leash is keyboard-operable with Enter and Space; an instruction names this alternative.
- Hover is decorative; clicking/tapping/keyboard input each work independently.
- `prefers-reduced-motion` removes perspective rotation and large vibration while retaining the front-view refusal as a short fade.
- If artwork fails to load, a small hand-drawn fallback silhouette and playable rope remain, with no broken-image chrome.
- Inputs are ignored during camera moves and pose transitions to prevent duplicated events or visual jumps.

## Verification criteria

1. The page opens directly from `index.html` without a build or network connection.
2. The dog visibly stays put through several tugs, then makes small intermittent progress.
3. Slack, stretch, tension, and spring-back are distinct rope states.
4. At least three side-view resistance expressions and the front-view refusal beat occur during ordinary play.
5. The front view transitions automatically and returns to side view without a user-controlled view switch.
6. Mouse, touch, and keyboard each complete a run; the restart control resets all visual and game state.
7. Desktop and narrow mobile views remain legible; reduced-motion has no large rotation or shake.

## Scope boundaries

This version is a tactile single-scene toy, not a level system or productivity-style game. No account, sound requirement, leaderboard, external fonts, analytics, or third-party runtime is included. Sound can be added later only if the silent play loop already feels complete.
