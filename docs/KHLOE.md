# Khloé: character source and animation

Khloé uses the exact **Stylized Low Poly German Shepherd** selected by the site owner, created by **DreamNoms**, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

[Original model and author](https://sketchfab.com/3d-models/stylized-low-poly-german-shepherd-18d8fbe184c5448283762893b6ea9752). The original glTF, binary, license and pinned download receipt are in `assets-source/khloe/vendor/dreamnoms/`. They came from a public CC-BY redistribution in the QtMeshEditor motion corpus. The receipt records exact hashes and distinguishes mirror verification from an unavailable authenticated source comparison.

The original model’s anatomy, attached ears, broad muzzle, faceted coat, skeleton and twelve animations are preserved. The added eye pieces, collar and tag have been removed. Her expressions now gently lift the existing brow geometry with two shape keys; there are no separate facial accessories. These shapes share the skeletal animation clips, crossfades and pause behavior. The island character is 40% smaller than before (root scale 0.516 instead of 0.86), with pawprint size, stride spacing and walking speed reduced to match. Her full-size 404 portrait is unchanged in framing.

`build_khloe.py` imports the vendored model, adds the brow deformations, and saves `khloe.blend`. The editable file retains all twelve original `DreamNoms_*` actions. Five runtime clips are sampled from those original performances:

| Clip | Source | Use |
| --- | --- | --- |
| `KhloeIdle` | Idle1 | Resting tail and head movement |
| `KhloeWalk` | WalkCycle | Roaming, retimed to a relaxed 1.6-second stride |
| `KhloeSniff` | IdleEarTwitch | Inquisitive pause; legacy runtime name, no new sniff animation |
| `KhloePlay` | SitDown → SitScratchEar → StandUp | One bounded 4.7-second discovery |
| `KhloeSitCurious` | IdleSit, with a 12-degree head roll | Seated 404 portrait |

The island source appends the `Khloe*` objects and actions and excludes the character from static material batching. The `Khloe` root moves along the safe clearing path; the skeleton supplies the performance. The existing shared clock, crossfades, reduced-motion handling, repeated-click debounce and five-second snow-print expiry remain intact.

The 404 portrait comes from the same editable character, not a separately drawn interpretation. The 404 still returns home after five seconds. Content hashes invalidate the island and portrait caches on each build.

Visible attribution is available from both the homepage and the 404 page through `/credits.html`. Retain that credit and the source license when redistributing the model or derived renders.
