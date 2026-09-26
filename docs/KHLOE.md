# Khloé: character source and animation

Khloé uses the exact **Stylized Low Poly German Shepherd** selected by the site owner, created by **DreamNoms**, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

[Original model and author](https://sketchfab.com/3d-models/stylized-low-poly-german-shepherd-18d8fbe184c5448283762893b6ea9752). The original glTF, binary, license and pinned download receipt are in `assets-source/khloe/vendor/dreamnoms/`. They came from a public CC-BY redistribution in the QtMeshEditor motion corpus. The receipt records exact hashes and distinguishes mirror verification from an unavailable authenticated source comparison.

The original model’s anatomy, attached ears, broad muzzle, faceted coat, skeleton and twelve animations are preserved. Alderwick adds amber eyes with small highlights, a pink collar and brass tag. The eyes are about 30% smaller than the first adaptation and form continuous shallow surfaces fitted to the actual face triangles. Each vertex inherits interpolated coat weights (including the forehead’s ear influences) and is transformed back through that blended skin matrix. Colored iris, pupil and highlight regions share this surface, eliminating floating or intersecting eye layers. The collar follows the neck. A regression check measures the eyes’ distance from the actual animated face throughout all five runtime clips. The model is normalized to the island’s scale without changing its proportions.

`build_khloe.py` imports the vendored model, adds the details, and saves `khloe.blend`. The editable file retains all twelve original `DreamNoms_*` actions. Five runtime clips are sampled from those original performances:

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
