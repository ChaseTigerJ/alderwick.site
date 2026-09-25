# Website administration

Edit [`public/site-config.json`](../public/site-config.json) in GitHub, then commit the change. GitHub Pages deploys it automatically. The website reads this JSON on each visit without relying on a cached copy. No application code changes are required.

## Desktop download

```json
"download": {
  "enabled": false,
  "comingSoonText": "Your next adventure is on its way. Come back soon!"
}
```

- `enabled: true` enables desktop download buttons only when `public/downloads/release.json` is also valid and has `available: true`.
- `enabled: false` changes the desktop buttons to **Coming Soon!** and removes all download links from the interface, including an open dialog.
- `comingSoonText` is the message in the availability dialog. Use a nonempty string of at most 250 characters.
- Keep JSON booleans unquoted: `false`, not `"false"`.

This controls the website interface, not file access. A previously shared ZIP URL continues to work while that file remains in the public repository. To withdraw the actual package, remove the ZIP in a separate commit too.

Keep the existing release manifest for title, version, size, download URL, SHA-256, requirements, and the package's `available` flag. Download URLs must be a relative website path such as `./downloads/Alderwick-Portable-2026.09.25.zip` or an HTTPS URL. Executable protocols, protocol-relative URLs, and parent-directory paths are rejected.

## Phones and tablets

Phones, tablets, touch-first devices, and windows 1024 pixels wide or narrower receive App Store and Google Play buttons instead of the desktop ZIP. Device detection includes iPads using a desktop browser identity. An already-open download dialog also removes its ZIP link if the window changes to this layout.

Both store buttons currently show **Coming Soon** and open a matching availability message. To activate a store after the app is published:

```json
"stores": {
  "ios": {
    "enabled": true,
    "url": "https://apps.apple.com/us/app/alderwick/idYOUR_ACTUAL_APP_ID"
  },
  "android": {
    "enabled": false,
    "url": ""
  },
  "comingSoonText": "A little world, soon in your pocket. Alderwick for phones and tablets is coming soon."
}
```

Use the actual published app URL. The iOS link must be on `https://apps.apple.com/`; Android must be on `https://play.google.com/`. Enabled store links open in a new tab. A disabled store can keep an empty URL. Each platform can launch independently. The desktop download setting does not change store availability.

## Automatic world appearance

```json
"world": {
  "theme": "system",
  "season": "current",
  "hemisphere": "north"
}
```

- `theme`: `system` follows the visitor's computer light/dark preference, including changes while the page is open. If that preference is unavailable, local computer time supplies day from 07:00–18:59 and night from 19:00–06:59. `local-time` always uses that clock. `day` or `night` fixes the initial appearance.
- `season`: `current` follows the visitor's local calendar; `spring`, `summer`, `autumn`, or `winter` selects a fixed season.
- `hemisphere`: `north` is the default for Alderwick's New England setting. Northern meteorological seasons start March 1, June 1, September 1, and December 1. `south` reverses the seasons. No location services or permissions are requested.

Visitors can preview another mood in the discreet desktop **World mood** menu. Their preview lasts for that visit. **Use my current day & season** returns to the configured automatic behavior. Story chapter previews can change the season too. Reduced-motion preferences remain respected, and the world has an animation pause control.

## Validation and safe defaults

Keep `"version": 1` and all documented sections in the file. Invalid JSON, missing sections, invalid booleans, unrecognized world values, unavailable configuration, or unsafe enabled store URLs cause the configuration to fail closed: desktop downloads and store links remain unavailable. The world can still be explored using system appearance and the northern calendar season.

Run focused configuration checks with Node.js 24:

```sh
node --test tests/site-config.test.ts
```
