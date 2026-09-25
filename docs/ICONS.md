# Game icon provenance

The website uses Alderwick’s original house-and-flag icon, copied byte for byte from `public/downloads/Alderwick-Portable-2026.09.25.zip`. Its `BUILD-INFO.json` records game source commit `606a3908b4264dc8040dbde52e43f84e3192d0fd`. The archived source paths are under `Alderwick-Portable/game/`.

| Website file | Source archive path | SHA-256 |
| --- | --- | --- |
| `public/favicon.svg` | `Alderwick-Portable/game/favicon.svg` | `9f6f9a727855f091bb18e72da21489eb55633334765c9d56cbebee5d0bfcfb5b` |
| `public/apple-touch-icon.png` | `Alderwick-Portable/game/apple-touch-icon.png` | `1c1f437e66314365be55e77fa0f116db3828d23d6c2b777c726d56462f94a55c` |
| `public/icons/alderwick-192.png` | `Alderwick-Portable/game/icons/alderwick-192.png` | `72739c5da92ea7469b2f9dc6937c63e917de650fec26c4bf8f4c48a224ddbf39` |
| `public/icons/alderwick-512.png` | `Alderwick-Portable/game/icons/alderwick-512.png` | `e5b05236b0be71b2244e446607ec44e74e27660ed095f06281cd3f832779f593` |

`index.html` explicitly declares the SVG browser favicon, PNG fallback, and 180×180 Apple touch icon. The Apple icon has an opaque green background and the original game padding; iOS applies its own rounded mask. No icon was redrawn or recolored.

`manifest.webmanifest` uses the original 192×192 and 512×512 maskable game icons. Its display remains `browser` and it does not lock orientation, since this is the game’s website rather than the game runtime. All URLs are relative so the icons work with either a custom domain or a repository subpath.

When checking an existing iOS Home Screen bookmark, remove that bookmark and add the website again if iOS retains the old cached icon.
