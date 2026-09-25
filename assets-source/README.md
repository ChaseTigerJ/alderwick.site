# Alderwick harbor diorama

Original geometry authored procedurally for Alderwick in Blender. No third-party models, textures, or asset licenses are required.

- `create_island.py`: deterministic construction and export script (seed 41).
- `alderwick-island.blend`: editable construction scene with individual building parts and props.
- `../public/models/alderwick-island.glb`: shipping model, consolidated into 28 material batches.
- `../public/island-poster.webp`: Blender-rendered fallback for devices without WebGL.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets-source/create_island.py
```

The script saves the editable Blender scene, exports the GLB, then renders `/tmp/alderwick-island-preview.png`. Run from a system environment that permits Blender to initialize its graphics device. Blender 5.2.2 was used for the original export.

## Runtime contract

Blender source uses Z up and -Y front. Standard glTF export converts this to Y up and +Z front. The island surface is at Y=0. Its approximate exported bounds are X -6.1 to 6.1, Y -1.3 to 4.4, Z -4.6 to 6.4. The ship and pier face the positive Z side. A water surface near Y=-0.975 surrounds the rocky shore.

The model contains about 15,540 triangles and 37,600 split-normal vertices; it is approximately 1.3 MB uncompressed. It intentionally uses no textures and no decoder extensions. Twenty-eight shared material meshes minimize draw calls without introducing a runtime decoder or a texture download. All geometry is static and flat shaded. Meshes and materials use descriptive matching names; `leaf_*` and `grass_*` identify seasonal vegetation, and `window_glow` identifies emissive panes and lanterns. Material base colors are authored in linear color space from sRGB swatches.

The asset includes four colonial cottages, a cupola and bell, window boxes, roof courses, chimneys, village well, fence and vegetable garden, autumn alders and pines, lanterns, an oak dock, supply crates and barrels, a rigged merchant vessel, and a German Shepherd with a pink collar. Preview lighting, camera, and water plane are added after export and never appear in the runtime GLB.
