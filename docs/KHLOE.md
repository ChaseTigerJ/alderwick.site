# Khloé: character source and animation

Khloé is Alderwick’s German Shepherd companion. Her website character uses one articulated skin for both the island and the seated 404 portrait, with a pink collar and brass tag. The collar and eyes are separate details; the body, neck, muzzle and upright ears share continuous geometry.

## Reference and source

The design follows the [American Kennel Club’s German Shepherd standard](https://images.akc.org/pdf/breeds/standards/GermanShepherdDog.pdf): a lean, longer-than-tall silhouette, a long tapered muzzle, upright ears with substantial roots, and almond-shaped eyes. [Bethesda’s account of River, the real dog behind Dogmeat](https://bethesda.net/en-US/news/fallout-4-dogmeat-and-other-companions), informed the emphasis on attentive expression and companion behavior. No Fallout models or textures are used.

The mesh and skeleton start from Quaternius’s German Shepherd in the [Zombie Apocalypse Kit](https://quaternius.com/packs/zombieapocalypsekit.html), released by its author under CC0. The adapted Blender source and reproducible character script are in `assets-source/khloe/`. The original model, included license, download provenance and checksums are retained alongside them. The author’s download host was quota-blocked during development, so the source copy came from a pinned public redistribution mirror; the receipt distinguishes verified file metadata from an unavailable author-hosted binary hash comparison.

## Integration

The island generator appends the character’s source objects and animation actions. Character skins bypass static material batching, preserving bone weights and hierarchy. The `Khloe` root controls movement around the safe clearing; skeletal clips control the body. `src/khloe-animation.ts` blends between authored clips using the island’s existing clock. Paused, offscreen and reduced-motion states do not start a separate animation loop. Discoveries play once, and repeated clicks during the performance do not stack.

The portrait renderer poses the same character and renders a transparent image for the standalone 404 page. Its five-second return to the homepage remains independent of artwork loading. The build versions both the island model and portrait by content so returning visitors receive the matching assets.

| Clip | Duration | Purpose |
| --- | --- | --- |
| `KhloeIdle` | 4 seconds | Attentive resting motion and tail movement. |
| `KhloeWalk` | 2.2 seconds | Articulated walking cycle while the island root follows its path. |
| `KhloeSniff` | 3.2 seconds | Lowered head and an inquisitive pause. |
| `KhloePlay` | 4.7 seconds | One play bow, tail wag, and curious head tilt after a discovery. |
| `KhloeSitCurious` | 4 seconds | Seated companion pose; the 404 portrait samples 0.7 seconds. |

The face, collar and paw details inherit interpolated weights from the underlying coat triangles. When changing proportions, rebuild their fit and weights together through `build_khloe.py`; moving these details independently can make them slide during animation. Rebuild the island and portrait afterward using the commands in [the asset source guide](../assets-source/README.md).
