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
| `KhloeBody` | Torso centered near shoulder height; use for breathing or a gentle bounce. |
| `KhloeHead` | Neck-base pivot; head, neck, ears, muzzle, and pink collar move together. |
| `KhloeTail` | Pivot at the rump; wag sideways about local Y. |
| `KhloeLegFL`, `KhloeLegFR` | Front shoulder pivots. Swing about local X for gait. |
| `KhloeLegBL`, `KhloeLegBR` | Rear hip pivots. Preserve the modeled bent hocks. |
| `MerchantShip` | Waterline pivot at `(2.9, -0.88, 4.62)`; all hull, sail, and rigging geometry is parented here. Add bob/rock to its authored heading. |
| `PipLetterAnchor` | Letter emergence/delivery marker at `(-0.44, 0.85, 2.45)`. |

Khloe is rebuilt as a tan-and-black German Shepherd with a dark saddle, sable neck ruff, long dark wedge muzzle, erect triangular ears, tan eyebrow markings, deep chest, sloped hind legs, a low feathered tail, and her pink collar. The unscaled dog is about 1.36 units from nose to tail and 0.82 units to ear tips. The exported root scale brings those dimensions to about 1.17 and 0.70 units.

## Effect anchors

The exporter preserves named empty nodes. Read their world positions rather than duplicating building measurements in application code.

- `ChimneySmoke_0` through `ChimneySmoke_3`: directly over each chimney opening, including cottage translation and rotation. They map to the Alder and Anchor, Fisher cottage, Harbor workshop, and Clifftop cottage respectively.
- `WindowLight_0` through `WindowLight_15`: four per cottage in the same building order, front left, front right, side front, and side rear. Each emitter sits 0.28 units outward from its window frame so real lighting can reach the facade and ground.
- `LanternLight_0`, `LanternLight_1`: glass centers at `(-1.15, 1.02, 0.66)` and `(1.38, 1.02, 2.58)`.

Chimney mouth positions after glTF coordinate conversion:

| Node | X | Y | Z |
| --- | ---: | ---: | ---: |
| `ChimneySmoke_0` | 0.16792 | 3.33450 | -1.70185 |
| `ChimneySmoke_1` | -2.84769 | 2.65950 | -0.96764 |
| `ChimneySmoke_2` | 2.65104 | 2.51280 | -1.30989 |
| `ChimneySmoke_3` | -3.83294 | 2.28250 | -2.41661 |

The source also contains four colonial cottages, a cupola and bell, window boxes, roof courses, village well, fence and vegetable garden, autumn alders and pines, an oak dock, supply crates and barrels. Preview lighting, camera, and water plane are added after export and never appear in the runtime GLB.
