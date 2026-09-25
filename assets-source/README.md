# Alderwick harbor diorama

Original low-poly geometry authored procedurally in Blender. No third-party models or textures are included.

- `create_island.py`: deterministic construction/export script (seed 41).
- `alderwick-island.blend`: editable scene with individual building parts, joints, and effect anchors.
- `../public/models/alderwick-island.glb`: shipping model, merged by material within each independently animated group.
- `../public/island-poster.webp`: rendered fallback for devices without WebGL.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/create_island.py
```

The script saves the editable Blender scene, exports the GLB, then renders `/tmp/alderwick-island-preview.png`. Blender needs permission to initialize its graphics device. The source uses Blender 5.2.2 APIs.

## Design references

The central building is an original colonial church miniature with a sober rectangular clapboard nave, symmetric tall sash windows, centered double entry, shingled gable roof, square front tower, open belfry, brass bell, and simple tapered spire. It replaces the old tavern completely; the rear Clifftop cottage has been removed.

The [National Park Service nomination for Trinity Church, Newport](https://preservation.ri.gov/sites/g/files/xkgbur406/files/pdfs_zips_downloads/national_pdfs/newport/newp_spring-street-141_trinity-church.pdf), hosted by Rhode Island's preservation agency, documents its 1725–26 rectangular timber/clapboard body, rhythmic tall windows, square front tower, belfry, and spire. [Old North Church's own architectural history](https://oldnorth.com/steeple-bell-chamber/) distinguishes its 1723 tower from the wooden spire added in 1740. These primary references inform the model's colonial proportions and restrained details. The miniature is a readable village interpretation, not an exact dated reproduction of either building.

## Coordinates and optimization

Blender is Z-up with front -Y. glTF export converts to Y-up with front +Z. The island surface is at Y=0; water sits near Y=-0.975. Geometry is flat shaded and texture-free, with no runtime decoder extensions. Static parts are merged by material. Animated parts are merged only within their own pivot. The exported model retains named empties and glTF extras, which Three.js exposes as `userData`.

`leaf_*` and `grass_*` materials identify seasonal vegetation. `roof_*` identifies roofs; `window_glow` identifies warm panes and lantern glass. Dedicated `shepherd_*`, `brass`, and `brass_dark` colors stay independent of seasonal vegetation. Material base colors are converted from sRGB swatches to linear space when authored.

## Runtime actors

Positions refer to the exported Y-up GLB. Preserve each node's authored rotation and scale before adding animation.

| Node | Contract |
| --- | --- |
| `Khloe` | Root at `(-0.74, 0, 1.65)`, uniform scale 0.86, forward +Z. |
| `KhloeBody` | Torso pivot; preserve slimmed scale `(0.82, 0.90, 1)`. |
| `KhloeHead` | Neck-base pivot; neck, muzzle, upright ears, and pink collar move together. |
| `KhloeTail` | Rump pivot; wag about local Y. |
| `KhloeLegFL`, `KhloeLegFR`, `KhloeLegBL`, `KhloeLegBR` | Shoulder/hip pivots; swing about local X. |
| `MerchantShip` | Waterline root at `(2.9, -0.88, 4.62)`, authored Y heading -0.35, **uniform scale 1.12**. Hull, sails, and rigging stay parented here. |
| `ChurchBell` | Suspension pivot `(0.604146, 3.24, -0.037276)`, authored Y heading -0.06. Swing local X to ring. |
| `BellHitArea` | Child marker at world `(0.604146, 3.02, -0.037276)`, `userData.radius = 0.25`. |
| `Mailbox` | Tiny box mounted beside Fisher cottage's door at `(-1.616322, 0.125, 0.295257)`, Y heading 0.17, uniform scale 0.30. The root is an authoring origin; visible box starts at Y≈0.325. |
| `MailboxDoor` | Child hinge at local `(0, 0.65, 0.255)` before parent scale. Positive X rotation opens outward/down. |
| `PipLetterAnchor` | Child of Mailbox at world `(-1.599065, 0.386, 0.395786)`. Read its world position. |
| `VillageDoor` | Fisher cottage's actual leaf at world `(-2.340748, 0.17, 0.449034)`, authored Y heading +0.17. **Subtract** from local Y rotation to open outward, up to about 1.25 radians. |
| `DoorVisitorStart` | Just inside Fisher doorway at `(-2.134956, 0.17, 0.170198)`, on the interior foundation. |
| `DoorVisitorEnd` | Outside on the lane at `(-1.984384, 0.03, 1.047368)`. Visitor should descend smoothly from the interior/step height. |
| `WishingWell` | Whole well root `(0.9, 0, 1.23)`. |
| `WellBucket` | Child suspension pivot local `(0, 0.8, 0)`; sway X/Z or lift no more than 0.1. |

Khloe remains a slender tan-and-black German Shepherd with a dark saddle, long wedge muzzle, erect ears, bent rear hocks, low feathered tail, and pink collar. Her complete nose-to-tail length is about 1.17 units and ear-tip height about 0.70 units after root scaling.

Fisher cottage has a **real 0.54-unit-wide entry opening**, from Y=0.17 to Y=1.08. Its walls, siding, and lower timber are split around the opening. The 0.50-by-0.91-unit door leaf is separately grouped; there is no solid wall behind it. A dark interior lies farther inside. This clearance accommodates the approximately 0.82-unit-tall Pip visitor. The mailbox is mounted below the right sash; that window's herb box is removed.

## Effect and planting anchors

- `ChimneySmoke_0` and `ChimneySmoke_1`: Fisher cottage and Harbor workshop. **The church has no chimney; the removed rear cottage has no residual geometry or anchors.**
- `WindowLight_0`–`WindowLight_8`: church windows. The first two flank its entry, the next six are its side sashes, and the ninth is on the tower. They have `userData.building = "church"`.
- `WindowLight_9`–`WindowLight_12`: Fisher cottage's front-left, front-right, side-front, side-rear windows.
- `WindowLight_13`–`WindowLight_16`: Harbor workshop in the same window order.
- `LanternLight_0`, `LanternLight_1`: centers `(-1.15, 1.02, 0.66)` and `(1.38, 1.02, 2.58)`.
- `TreeCanopy_0`–`TreeCanopy_11`: centers of the twelve deciduous trees, each with `userData.radius`; tree geometry stays batched. The last alder is relocated to ground `(-3.3, 0, 3.15)`, canopy center `(-3.2538, 1.3475, 3.15)`, on the southwest shore. This keeps the garden visible from the default camera `(13, 13, 19)` without moving the plot or fences.
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
- Whole well: X 0.32–1.48, Y 0–1.47, Z 0.80–1.66.
- Bucket: X 0.747–1.053, Y 0.445–0.815, Z 1.077–1.383.

Preview lights, camera, and water plane are created only after export and are excluded from the runtime GLB.
