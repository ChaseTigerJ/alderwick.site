# Alderwick harbor diorama

Original geometry authored procedurally for Alderwick in Blender. No third-party models, textures, or asset licenses are required.

- `create_island.py`: deterministic construction and export script (seed 41).
- `alderwick-island.blend`: editable construction scene with individual building parts, animation pivots, and light/smoke anchors.
- `../public/models/alderwick-island.glb`: shipping model, consolidated by material within each independently animated group.
- `../public/island-poster.webp`: Blender-rendered fallback for devices without WebGL.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/create_island.py
```

The script saves the editable Blender scene, exports the GLB, then renders `/tmp/alderwick-island-preview.png`. Run from a system environment that permits Blender to initialize its graphics device. Blender 5.2.2 was used for the original export.

## Coordinates and optimization

Blender source uses Z up and -Y front. Standard glTF export converts this to Y up and +Z front. The island surface is at Y=0. Its approximate exported bounds are X -6.1 to 6.1, Y -1.3 to 4.4, Z -4.6 to 6.4. The ship and pier face the positive Z side. A water surface near Y=-0.975 surrounds the rocky shore.

The model intentionally uses no textures or decoder extensions. Geometry is flat shaded. Static geometry is merged by material to reduce draw calls. Moving geometry is merged only within its own pivot, preserving the hierarchy below. Mesh names combine their parent pivot and material; static mesh names match their materials. `leaf_*` and `grass_*` identify seasonal vegetation; `window_glow` identifies emissive panes and lantern glass. Material base colors are authored in linear color space from sRGB swatches. Khloe uses dedicated `shepherd_*` colors, so season changes do not recolor her coat.

## Runtime animation contract

All positions below refer to the exported, Y-up glTF. Preserve the authored base transforms before applying runtime animation.

| Node | Purpose |
| --- | --- |
| `Khloe` | Ground-level dog root, initially `(-0.74, 0, 1.65)`, uniform scale `0.86`. Forward is local +Z. Move/turn this node to roam. |
| `KhloeBody` | Torso centered near shoulder height; use for breathing or a gentle bounce. Preserve its slimmed glTF scale `(0.82, 0.90, 1)`. |
| `KhloeHead` | Neck-base pivot; head, neck, ears, muzzle, and pink collar move together. |
| `KhloeTail` | Pivot at the rump; wag sideways about local Y. |
| `KhloeLegFL`, `KhloeLegFR` | Front shoulder pivots. Swing about local X for gait. |
| `KhloeLegBL`, `KhloeLegBR` | Rear hip pivots. Preserve the modeled bent hocks. |
| `MerchantShip` | Waterline pivot at `(2.9, -0.88, 4.62)`; all hull, sail, and rigging geometry is parented here. Add bob/rock to its authored heading. |
| `Mailbox` | Freestanding letterbox root at `(1.62, 0, 3.18)`, containing the post, box, roof, and flag. Front faces +Z. |
| `MailboxDoor` | Child of `Mailbox`, lower hinge at local `(0, 0.65, 0.255)`. Add positive X rotation (up to about 1.25 radians) to open outward and down. |
| `PipLetterAnchor` | Child of `Mailbox`. Letter emergence at world `(1.62, 0.87, 3.52)`; read its world position. |
| `ChurchBell` | Belfry suspension pivot at `(0.66799, 3.6795, -1.47946)`, with authored Y heading `-0.06`. Add local X rotation to ring the bell. |
| `BellHitArea` | Nonrendering child marker centered on the bell at world `(0.66799, 3.4595, -1.47946)`; `userData.radius` is `0.26`. |
| `WishingWell` | Whole well root at `(0.9, 0, 1.23)`. Its static architecture remains individually selectable from the island. |
| `WellBucket` | Child of `WishingWell`, handle suspension pivot at local `(0, 0.8, 0)`. Swing local X/Z gently or lift by at most 0.1 units. |

Khloe is rebuilt as a tan-and-black German Shepherd with a dark saddle, sable neck ruff, long dark wedge muzzle, erect triangular ears, tan eyebrow markings, deep chest, sloped hind legs, a low feathered tail, and her pink collar. The unscaled dog is about 1.36 units from nose to tail and 0.82 units to ear tips. The exported root scale brings those dimensions to about 1.17 and 0.70 units. Her torso is 18% narrower and 10% slimmer vertically than the initial articulated model, retaining the same head, leg, and tail proportions and pivot names.

## Effect anchors

The exporter preserves named empty nodes. Read their world positions rather than duplicating building measurements in application code.

- `ChimneySmoke_0` through `ChimneySmoke_3`: directly over each chimney opening, including cottage translation and rotation. They map to the Alder and Anchor, Fisher cottage, Harbor workshop, and Clifftop cottage respectively.
- `WindowLight_0` through `WindowLight_15`: four per cottage in the same building order, front left, front right, side front, and side rear. Each emitter sits 0.28 units outward from its window frame so real lighting can reach the facade and ground.
- `LanternLight_0`, `LanternLight_1`: glass centers at `(-1.15, 1.02, 0.66)` and `(1.38, 1.02, 2.58)`.
- `TreeCanopy_0` through `TreeCanopy_11`: canopy centers for the twelve deciduous trees in construction order. Each has `userData.radius` for modest interaction volumes. Tree geometry remains statically batched.
- `CottageFootprint_0` through `CottageFootprint_3`: ground-level centers/orientations of the four cottages in the same order as chimney anchors. glTF extras expose `label`, `wallWidth`, `wallDepth`, `roofWidth`, `roofDepth`, `wallHeight`, and `roofTop`; Three.js reads these as `userData`.

Chimney mouth positions after glTF coordinate conversion:

| Node | X | Y | Z |
| --- | ---: | ---: | ---: |
| `ChimneySmoke_0` | 0.16792 | 3.33450 | -1.70185 |
| `ChimneySmoke_1` | -2.69769 | 2.65950 | -0.81764 |
| `ChimneySmoke_2` | 2.97104 | 2.51280 | -1.30989 |
| `ChimneySmoke_3` | -3.80457 | 2.07500 | -2.43231 |

The source also contains four colonial cottages, a cupola and bell, window boxes, roof courses, village well, fence and vegetable garden, autumn alders and pines, an oak dock, supply crates and barrels. Preview lighting, camera, and water plane are added after export and never appear in the runtime GLB.

## Building clearances and interaction bounds

The rear cottage previously overlapped Fisher cottage's roof by approximately 0.154 units. Fisher now sits at `(-2.25, 0, -0.5)`, and the smaller Clifftop cottage sits at `(-3.5, 0, -2.25)` with a 1.0 by 1.05 wall footprint. Their rotated roof rectangles now have a separating gap of 0.258 units. The workshop moved right to `(3.22, 0, -0.85)`; its roof separates from the Alder and Anchor by 0.363 units. Every pair of cottage roof rectangles is disjoint. These gaps use the oriented roof rectangles, so their axis-aligned bounding boxes can still overlap without actual roof intersections.

| Cottage | Roof X min/max | Roof Z min/max | Roof dimensions before rotation |
| --- | --- | --- | --- |
| Alder and Anchor | -0.60452 / 1.90452 | -2.44391 / 0.08391 | 2.37 × 2.39 |
| Fisher cottage | -3.33732 / -1.16268 | -1.62406 / 0.62406 | 1.87 × 1.96 |
| Harbor workshop | 2.13706 / 4.30294 | -2.00509 / 0.30509 | 1.74 × 1.94 |
| Clifftop cottage | -4.31143 / -2.68857 | -3.08668 / -1.41332 | 1.32 × 1.39 |

Useful approximate interaction bounds in world coordinates:

- Mailbox: X 1.295–1.945, Y 0–1.25, Z 2.85–3.51. The closed door spans X 1.3925–1.8475, Y 0.665–1.035, Z 3.4215–3.4685.
- Church bell: X about 0.47–0.87, Y 3.24–3.68, Z about -1.68–-1.28. Its center marker and radius are preferable to a large belfry click box.
- Whole well: X 0.32–1.48, Y 0–1.47, Z 0.80–1.66. Bucket: X 0.747–1.053, Y 0.445–0.815, Z 1.077–1.383.

The mailbox sits outside Khloe's central roaming loop and beside the approach to the dock. The well bucket is actual grouped geometry, including stave body, iron hoops, opening, and handle; no runtime mesh replacement is needed. Dedicated `brass` and `brass_dark` materials prevent the bell and mailbox details from changing color with tree seasons.
