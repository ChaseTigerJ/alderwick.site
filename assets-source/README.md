# Alderwick harbor diorama

The harbor geometry is authored procedurally in Blender. Khloé uses DreamNoms’s animated, faceted German Shepherd under CC BY 4.0; see [character sources and provenance](../docs/KHLOE.md).

- `khloe/`: character source, rig, authored animation clips, build script and original CC BY asset provenance.
- `create_island.py`: deterministic construction/export script (seed 41).
- `alderwick-island.blend`: editable scene with individual building parts, joints, and effect anchors.
- `../public/models/alderwick-island.glb`: shipping model, merged by material within each independently animated group.
- `../public/island-poster.webp`: rendered fallback for devices without WebGL.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/khloe/build_khloe.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/create_island.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/create_khloe_404.py
```

The character builder produces the shared rig and clips at 30 fps. The island script preserves that frame rate when exporting animation timestamps. It saves the editable island scene, exports the GLB, then renders `/tmp/alderwick-island-preview.png`. Blender needs permission to initialize its graphics device. The source uses Blender 5.2.2 APIs.

## Design references

The central building is an original colonial church miniature with a sober rectangular clapboard nave, symmetric tall sash windows, centered double entry, shingled gable roof, square front tower, open belfry, brass bell, and simple tapered spire. It replaces the old tavern completely; the rear Clifftop cottage has been removed.

The [National Park Service nomination for Trinity Church, Newport](https://preservation.ri.gov/sites/g/files/xkgbur406/files/pdfs_zips_downloads/national_pdfs/newport/newp_spring-street-141_trinity-church.pdf), hosted by Rhode Island's preservation agency, documents its 1725–26 rectangular timber/clapboard body, rhythmic tall windows, square front tower, belfry, and spire. [Old North Church's own architectural history](https://oldnorth.com/steeple-bell-chamber/) distinguishes its 1723 tower from the wooden spire added in 1740. These primary references inform the model's colonial proportions and restrained details. The miniature is a readable village interpretation, not an exact dated reproduction of either building.

## Coordinates and optimization

Blender is Z-up with front -Y. glTF export converts to Y-up with front +Z. The island surface is at Y=0; water sits near Y=-0.975. The harbor uses faceted geometry; Khloé has a continuous skinned surface. The shipping asset is texture-free, with no runtime decoder extensions. Static parts are merged by material. Animated parts are merged only within their own pivot; the three cloth pennants, flexible ship rigging, and actual ship hull keep separate named geometry for deformation and clearance checks. All seventeen trees and both mast assemblies have independent root pivots; meshes remain merged by material within each pivot. The exported model retains named empties and glTF extras, which Three.js exposes as `userData`.

The shipping model preserves the tree and mast pivots, cloth and rigging deformation, the actual hull boundary, and independently animated actors. Character skins are excluded from static mesh batching.

`leaf_*` and `grass_*` materials identify seasonal vegetation. `roof_*` identifies roofs; `window_glow` identifies warm panes and lantern glass. Dedicated `Khloe*`, `brass`, and `brass_dark` colors stay independent of seasonal vegetation. Material base colors are converted from sRGB swatches to linear space when authored.

## Runtime actors

Positions refer to the exported Y-up GLB. Preserve each node's authored rotation and scale before adding animation.

| Node | Contract |
| --- | --- |
| `Khloe` | Root at `(-0.74, 0, 1.65)`, uniform scale 0.516 (40% smaller), forward +Z. |
| Khloé’s armature and skinned meshes | Deform through exported animation clips; never rotate separate primitive limbs or merge the skin into static batches. |
| `MerchantShip` | Waterline root at `(3.45, -0.88, 5.20)`, authored Y heading -0.55, **uniform scale 1.48** (32% larger than the previous 1.12). Hull, sails, rigging, flags, and light anchors stay parented here. |
| `ShipMast_0`, `ShipMast_1` | Fore/main mast pivots at ship-local `(0, 0.43, 0.48)` and `(0, 0.43, -0.45)`. Mast, yards, square sails, pennant, and attachment collars move together. Preserve their authored local transforms. |
| `TreeBreeze_0`–`TreeBreeze_16` | Ground-rooted pivots: twelve alders followed by five pines. Each owns its trunk, branches, foliage, and any corresponding `TreeCanopy_*` marker. Metadata `kind` is `alder` or `pine`. Very small local X/Z rotation leaves the roots in place. |
| `ShipHullBoundary` | The vessel’s actual hull mesh, preserved separately under `MerchantShip`; use its transformed vertices for island/dock clearance checks. |
| `ChurchBell` | Suspension pivot `(0.604146, 3.24, -0.037276)`, authored Y heading -0.06. Swing local X to ring. |
| `BellHitArea` | Child marker at world `(0.604146, 3.02, -0.037276)`, `userData.radius = 0.25`. |
| `Mailbox` | Tiny box mounted beside Fisher cottage's door at `(-1.616322, 0.125, 0.295257)`, Y heading 0.17, uniform scale 0.30. The root is an authoring origin; visible box starts at Y≈0.325. |
| `MailboxDoor` | Child hinge at local `(0, 0.65, 0.255)` before parent scale. Positive X rotation opens outward/down. |
| `PipLetterAnchor` | Child of Mailbox at world `(-1.599065, 0.386, 0.395786)`. Read its world position. |
| `VillageDoor` | Fisher cottage's actual leaf at world `(-2.340748, 0.17, 0.449034)`, authored Y heading +0.17. **Subtract** from local Y rotation to open outward, up to about 1.25 radians. |
| `DoorVisitorStart` | Just inside Fisher doorway at `(-2.134956, 0.17, 0.170198)`, on the interior foundation. |
| `DoorVisitorEnd` | Outside on the lane at `(-1.984384, 0.03, 1.047368)`. Visitor should descend smoothly from the interior/step height. |
| `WishingWell` | Whole well root `(2.03, 0, 1.94)`, fully clear of the village and harbor paths. |
| `WellBucket` | Child suspension pivot local `(0, 0.8, 0)`; sway X/Z or lift no more than 0.1. |
| `WellTossAnchor` | Child of well, world `(2.235, 0.62, 2.65)`: hand-height start outside the front roof opening. |
| `WellWishAnchor` | Child of well, world `(2.235, 0.414, 1.965)`: water target offset from the hanging bucket. A short arc with less than 0.25 extra height passes under the roof. |
| `GraveHandAnchor` | World `(1.08, 0.025, -3.20)`, lawn in front of the eastern headstone behind the church. |
| `BackIslandGhostAnchor` | World `(-1.8, 0, -3.55)` on the rear lawn beyond the tree canopies. The ±0.50 X / ±0.10 Z loop has at least 0.20 center clearance from the cliff edge and 0.18 clearance from solid scenery. |

Khloé’s `KhloeIdle`, `KhloeWalk`, `KhloeSniff`, `KhloePlay` and `KhloeSitCurious` clips share one character. The website controls her path with the root, blends the skeletal poses and integrated brow shapes, and preserves reduced-motion behavior. The character has no added eye meshes, collar or tag. The 404 renderer uses the same skin and seated pose. See [character documentation](../docs/KHLOE.md).

Fisher cottage has a **real 0.54-unit-wide entry opening**, from Y=0.17 to Y=1.08. Its walls, siding, and lower timber are split around the opening. The 0.50-by-0.91-unit door leaf is separately grouped; there is no solid wall behind it. A dark interior lies farther inside. This clearance accommodates the approximately 0.82-unit-tall Pip visitor. The mailbox is mounted below the right sash; that window's herb box is removed.

## Effect and planting anchors

- `ChimneySmoke_0` and `ChimneySmoke_1`: Fisher cottage and Harbor workshop. **The church has no chimney; the removed rear cottage has no residual geometry or anchors.**
- `WindowLight_0`–`WindowLight_8`: church windows. The first two flank its entry, the next six are its side sashes, and the ninth is on the tower. They have `userData.building = "church"`.
- `WindowLight_9`–`WindowLight_12`: Fisher cottage's front-left, front-right, side-front, side-rear windows.
- `WindowLight_13`–`WindowLight_16`: Harbor workshop in the same window order.
- `LanternLight_0`: the remaining harbor lamp at `(1.38, 1.02, 2.58)`. The cottage-adjacent post, lamp, and old anchor are removed completely.
- `ShipLanternLight_0`, `ShipLanternLight_1`: local positions `(-0.32, 1.025, -0.76)` and `(0.32, 1.025, -0.76)` under `MerchantShip`, at the two new stern lantern glass centers.
- `ShipLanternLight_2`: local `(0, 0.59, -1.13)`, just outside the stern cabin windows, with `userData.kind = "cabin"`. Attach lights to their anchor nodes so the light follows every bob and rock. These coordinates precede the ship’s 1.48 scale.
- `TreeCanopy_0`–`TreeCanopy_11`: centers of the twelve deciduous trees, each with `userData.radius`; tree geometry stays batched by material within its matching `TreeBreeze_*` pivot. The last alder is relocated to ground `(-3.3, 0, 3.15)`, canopy center `(-3.2538, 1.3475, 3.15)`, on the southwest shore. This keeps the garden visible from the default camera `(13, 13, 19)` without moving the plot or fences.
- `GardenPlot`: center `(-3.14, 0, 1.8)`, with `userData.width = 1.22`, `userData.depth = 0.98`. Soil and fence remain authored. **All old cabbage, pumpkin, and stalk meshes are removed** so the runtime owns seasonal planting and props.

The garden lane now stops at Blender `(-3.08, -1.18)`, width 0.26, outside the soil's north edge Y=-1.31. It no longer runs through the planting area.

| Chimney anchor | X | Y | Z |
| --- | ---: | ---: | ---: |
| `ChimneySmoke_0` | -2.69769 | 2.65950 | -0.81764 |
| `ChimneySmoke_1` | 2.97104 | 2.51280 | -1.30989 |

## Building and interaction bounds

There are exactly three `CottageFootprint_*` metadata anchors: index 0 is the church, 1 Fisher cottage, 2 Harbor workshop. All provide a label, wall/roof widths and depths, wall height, and roof height. The church additionally exposes `towerForwardOffset`, `towerDepth`, and `spireTop`. Metadata dimensions describe unrotated local shapes; use each anchor's world transform.

| Building | Ground center | Nave/cottage roof X min/max | Roof Z min/max |
| --- | --- | --- | --- |
| Colonial church | `(0.68, 0, -1.30)` | -0.447563 / 1.807563 | -2.685578 / 0.085578 |
| Fisher cottage | `(-2.25, 0, -0.50)` | -3.33732 / -1.16268 | -1.62406 / 0.62406 |
| Harbor workshop | `(3.22, 0, -0.85)` | 2.13706 / 4.30294 | -2.00509 / 0.30509 |

The church's tower and steps extend forward of its nave roof; its spire reaches Y=4.70. There is no rear cottage to intersect or visually merge with Fisher cottage.

Approximate actor bounds for small interaction volumes:

- Mounted mailbox: X -1.73–-1.50, Y 0.325–0.50, Z 0.18–0.41. Prefer raycasting its actual visible meshes.
- Bell: X about 0.40–0.81, Y 2.80–3.24, Z -0.24–0.17. Use `BellHitArea` for any additional interaction volume.
- Whole well: X 1.45–2.61, Y 0–1.47, Z 1.51–2.37. The complete roof footprint is clear of both paths, not only the smaller stone curb.
- Bucket: X 1.877–2.183, Y 0.445–0.815, Z 1.787–2.093.
- Ship berth: the enlarged hull is southeast of the cliff and east of the dock. Its bowsprit remains inside the existing 8.35-unit water disk; neither the island nor sea needs resizing. The real exported geometry passes a full five-second runtime rock: minimum hull gap 0.115 from a conservatively expanded cliff outline, 0.921 from the dock, and maximum full-vessel radius 7.911 within the 8.35 sea. `tests/island-layout.test.ts` checks the entire projected hull and every vessel mesh vertex, not only the root position.
- Workshop supplies: barrels at `(2.01, 0, -0.28)` and `(2.03, 0, -0.64)`, crate at `(1.77, 0, -0.035)`, in the side yard north of Village lane.
- Churchyard: two plain arched slate markers at `(0.48, 0, -2.95)` and `(1.08, 0, -2.95)`, facing the island’s rear. They clear the church’s rear roof and path.

## Cloth flags

`FlagClothShip_0`, `FlagClothShip_1`, and `FlagClothHarbor` are individual 12-by-4 subdivided triangular pennants. Each ship flag belongs to its corresponding `ShipMast_*` under `MerchantShip`; the harbor pennant is a scene root. They share `flag_cloth`, a two-sided material insulated from seasonal vegetation recoloring. The mailbox’s raised flag remains rigid metal and is not part of this set.

All three expose `userData.hoistAxis = "x"`, `hoistAt = 0`, `waveAxis = "z"`, `flyLength` (0.38 ship / 0.57 harbor), and `waveAmplitude` (0.0255 ship / 0.042 harbor). These extras describe exported Y-up local geometry. Cache original positions and displace depth progressively by distance from the fixed X=0 hoist; retain the object’s local transform. No texture or physics solver is needed.

Preview lights, camera, and water plane are created only after export and are excluded from the runtime GLB.

## Sail and rigging clearance

The four shrouds per mast run entirely aft of the billowed square sails. Their upper endpoints attach to a visible collar at ±0.045 local X, 0.055 aft of the mast center; the deck attachments follow the hull’s interpolated width so even the aft pair stays on the tapered stern deck. This clears both the canvas surface and the upper yards. The jib lies entirely ahead of the square sails’ maximum billow; its lowered head and tack attach to the forestay with short hanks. The upper square sails have a real 0.08-unit gap above the lower sails, including the sagged center of their foot. The forestay terminates at a short projecting mast cleat instead of entering the spar. Actual exported triangle-to-triangle clearance tests cover sail/sail and sail/wood interactions throughout the breeze, rather than checking only rope vertices.

`ShipRigging_0`, `ShipRigging_1`, `ShipForestay`, and `ShipForesail` remain separate children of `MerchantShip`. Each exposes `mastNode`, `breezeBaseHeight`, and `breezeTopHeight`. Geometry is authored in ship-local coordinates before export; after export heights are local Y. Cache original positions, convert through the mesh-to-ship transform, and apply the corresponding mast’s rotation delta weighted from zero at/below the base height to one at the upper attachment. This pins the deck or bowsprit while the upper ties follow the mast. The jib and its forestay use the same height weights, keeping the intermediate hank connections aligned. Ropes have twelve longitudinal sections to keep their small flex smooth.

| Flexible mesh | Mast | Fixed base Y | Upper attachment Y |
| --- | --- | ---: | ---: |
| `ShipRigging_0` | `ShipMast_0` | 0.43 | 2.55 |
| `ShipRigging_1` | `ShipMast_1` | 0.43 | 2.90 |
| `ShipForestay` | `ShipMast_0` | 0.85 | 2.74 |
| `ShipForesail` | `ShipMast_0` | 0.85 | 2.74 |

Tree and mast sway should stay much smaller than the existing ship rocking: the browser runtime caps combined rotation at roughly 0.9° for trees and 0.4° for masts. The animation clock remains frozen when reduced motion or the administrator’s animation setting disables motion.

## Khloé’s 404 portrait

`create_khloe_404.py` reads `khloe/khloe.blend` and samples `KhloeSitCurious` at 0.7 seconds, with grounded forepaws, folded hind legs, and a 12-degree head tilt. It leaves the island source and shipping GLB unchanged. Run Blender in the repository root with `--background --python assets-source/create_khloe_404.py`, then encode the rendered PNG with Pillow using quality 94, method 6, and exact alpha preservation. The shipping `public/images/khloe-404.webp` is 1000×1100 RGBA with fully transparent borders. The page supplies the soft contact shadow.
