# Website administration

Edit [`public/site-config.json`](../public/site-config.json) in GitHub, then commit the change. GitHub Pages deploys it automatically. The website reads this JSON on each visit without relying on a cached copy. No application code changes are required. The desktop download and both mobile stores are currently disabled; preserve those values until you are ready to launch.

## Desktop download

```json
"download": {
  "enabled": false,
  "comingSoonText": "Your next adventure is on its way. Come back soon!"
}
```

- `enabled: true` enables the hero and closing-section desktop download buttons only when `public/downloads/release.json` is also valid and has `available: true`.
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
  "hemisphere": "north",
  "effectsEnabled": true,
  "shakeEnabled": true,
  "snowAmount": 1,
  "soundEnabled": true,
  "animationEnabled": true,
  "discoveriesEnabled": true,
  "easterEggsEnabled": true,
  "easterEggIntervalSeconds": 60,
  "flameIntensity": 0.55
}
```

- `theme`: `system` follows the visitor's computer light/dark preference, including changes while the page is open. If that preference is unavailable, local computer time supplies day from 07:00–18:59 and night from 19:00–06:59. `local-time` always uses that clock. `day` or `night` fixes the initial appearance.
- `season`: `current` follows the visitor's local calendar; `spring`, `summer`, `autumn`, or `winter` selects a fixed season.
- `hemisphere`: `north` is the default for Alderwick's New England setting. Northern meteorological seasons start March 1, June 1, September 1, and December 1. `south` reverses the seasons. No location services or permissions are requested.

Visitors can preview another mood in the discreet desktop **World mood** menu. Their preview lasts for that visit. **Use my current day & season** returns to the configured automatic behavior. Story chapter previews can change the season too. Reduced-motion preferences remain respected. The following administrative controls apply throughout the visit:

| Field | Default | Behavior |
| --- | --- | --- |
| `effectsEnabled` | `true` | Enables decorative world effects and page-wide winter snow. Set `false` for a quieter presentation. |
| `shakeEnabled` | `true` | Allows the miniature's shake interaction. It does not override reduced-motion preferences. |
| `snowAmount` | `1` | Multiplies winter snow density (4,500 globe flakes at `1`, bounded from 2,250 to 9,000), including the page overlay. Any finite number from `0.5` to `2` is valid. |
| `soundEnabled` | `true` | Allows sounds started by a visitor interaction, such as the church bell. Set `false` for a silent site. |
| `animationEnabled` | `true` | Allows world animation. Set `false` to keep a still world; visitors can still inspect the scene. The pause button cannot override this setting. |
| `discoveriesEnabled` | `true` | Enables object discoveries and their stories, keyboard alternatives, and the discovery section. Set `false` to disable them together. |
| `easterEggsEnabled` | `true` | Allows rare sea visitors, an autumn sheet ghost, and a brief hand emerging from the churchyard grave. They are ambient surprises and do not affect discovery progress. |
| `easterEggIntervalSeconds` | `60` | Base interval between surprises, randomized on each appearance. Any finite number from `20` to `300` is valid. Only one surprise plays at a time. |
| `flameIntensity` | `0.55` | Brightness of house, harbor, and ship candlelight. Range `0` (no added light) to `1`. The default casts small, soft pools with a subtle flicker. |

These settings are independent of the download and store switches. Changing visual or sound settings never enables a download.

## Interface visibility

```json
"interface": {
  "showWorldSettings": true,
  "showDiscoveryProgress": true
}
```

- `showWorldSettings`: shows the optional desktop **World mood** menu. Set `false` to hide it. Automatic appearance continues to work.
- `showDiscoveryProgress`: shows the found-count and discovery badges in the discovery section. Set `false` to hide that progress display while keeping discoveries available.

The header contains only the Alderwick home link; there is no header download button. The availability controls remain in the hero and closing section.

## Announcements from the shore

The optional `announcement` section is **disabled by default**. Change only `enabled` to `true` to show the included sample as a sealed village letter when someone visits. Replace the sample copy before using it for real news. It does not change download or store availability.

```json
"announcement": {
  "enabled": false,
  "id": "a-note-from-the-shore",
  "mode": "letter",
  "frequency": "session",
  "kicker": "THE ALDERWICK POST",
  "title": "A little news from the shore.",
  "body": "Every little world has a story to tell. This is where we’ll share the next chapter of Alderwick.\n\nUntil then, take a wander. There’s always something waiting to be discovered.",
  "dismissLabel": "Back to the little world",
  "image": {
    "url": "./island-poster.webp",
    "alt": "Alderwick’s little coastal village, with cottages, a church, and a ship at the dock.",
    "caption": "Small beginnings. Stories still to come."
  },
  "action": null,
  "colors": {
    "background": "#faf6e9",
    "text": "#153e32",
    "accent": "#a74d30"
  }
}
```

| Field | Options and behavior |
| --- | --- |
| `enabled` | `false` hides the entire announcement. `true` shows a valid configured announcement. |
| `id` | A unique news identifier, such as `harbor-update-2`. Use letters, numbers, underscores, or hyphens, up to 80 characters. **Change this for each new announcement**, so people who dismissed an older letter see the new one. |
| `mode` | `letter` opens a centered postcard with a dimmed backdrop. `banner` inserts a dismissible notice above the header without blocking the page. |
| `frequency` | `visit` shows it on every page load. `session` remembers dismissal in the current browser tab until the browsing session ends. `once` remembers dismissal in that browser until the `id` changes or local website data is cleared. Blocked storage falls back to showing on the next visit. |
| `kicker` | The small letterhead above the title, up to 80 characters. |
| `title` | A nonempty heading, up to 140 characters. |
| `body` | Plain text, up to 5,000 characters. Use `\n` for a line break and `\n\n` for a new paragraph. HTML and Markdown are displayed as text, never executed. |
| `dismissLabel` | The text on the return button, up to 70 characters. The separate close button and Escape remain available for letters. |
| `image` | An image object as shown, or `null` for a letter without artwork. `alt` is required (up to 250 characters); `caption` is optional (up to 180). Failed images are removed cleanly. Banner artwork is hidden on small screens. |
| `action` | `null`, or an optional link object like the example below. This is separate from download availability and does not unlock a game download. |
| `colors` | Custom `background`, `text`, and `accent` using `#RGB` or `#RRGGBB`. Text and background must have at least 4.5:1 contrast or the announcement is hidden. Accent button and seal text automatically choose a readable light/dark foreground. |

To add a link below the message, replace `"action": null` with:

```json
"action": {
  "label": "Explore the island",
  "url": "#island",
  "newTab": false
}
```

Images and links accept HTTPS URLs or paths within this website. Upload artwork to `public/news/` and use a path such as `./news/harbor-update.webp`; the existing poster is available as `./island-poster.webp`. Link actions also accept section anchors such as `#world` and `#island`. Use `newTab: true` for an external page that should open separately. Embedded images are supported; executable HTML, iframes, unsafe protocols, credential URLs, and parent-directory paths are not.

Letters support native dialog focus containment, Escape, backdrop dismissal, focus restoration, page scroll locking, and reduced-motion preferences. Long messages scroll inside the letter. Announcements are fetched with the existing configuration on each page visit; they do not appear partway through an already-open page when a later commit changes the file.

If the optional announcement is missing or invalid, **only the announcement is hidden**. Valid world settings and release availability keep working. The `id`, `title`, and `body` are required when enabling it; omitted optional fields use the defaults above. A malformed JSON file still fails closed for the entire site, as described below.

## Validation and safe defaults

Keep `"version": 1` and the existing `download`, `stores`, and `world` sections. The optional world controls and the `interface` section are optional for compatibility with earlier configuration files: omitted fields receive the defaults listed above. Explicit `false` values are preserved.

Invalid JSON, missing required sections, invalid booleans, out-of-range density, light brightness, or visitor intervals, unrecognized appearance values, unavailable configuration, or unsafe enabled store URLs cause the whole configuration to fail closed: desktop downloads and store links remain unavailable. This also applies when a newly added world or interface option is invalid; an otherwise enabled download cannot bypass validation. The optional announcement has independent validation as described above. The world can still be explored using its default system appearance, northern calendar season, and default visual controls.

Use unquoted `true` or `false` for switches and an unquoted number for `snowAmount`. For example, `"snowAmount": 1.5` is valid; `"snowAmount": "1.5"` is not.

Run focused configuration checks with Node.js 24:

```sh
node --test tests/site-config.test.ts
```
