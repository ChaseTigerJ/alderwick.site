# Alderwick

A playful website for Alderwick, built with React, TypeScript, Three.js and an original Blender harbor diorama. Static output runs on GitHub Pages without a paid server.

Custom domain: [www.playalderwick.com](https://www.playalderwick.com/). GitHub Pages is configured to use this domain. See [domain setup](docs/DOMAIN.md) for DNS and HTTPS validation. Repository: `ChaseTigerJ/alderwick.site`.

## Develop

Use Node.js 24 and pnpm 11.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`node --test tests/*.test.ts` checks configuration, object picking, GLB animation contracts, and bounded seasonal effects. GitHub Actions runs these checks before every deployment.

`pnpm build` checks TypeScript and produces `dist/`. `pnpm preview` serves the production build. Dependencies and fonts are self-hosted in the build.

## The world

Drag to orbit and scroll to zoom on desktop; use one finger to orbit, two fingers to pinch-zoom, and a single tap to discover objects on touchscreens. The page scrolls normally outside the island. Keyboard arrows, plus/minus, and Home offer the same view controls. While idle, the harbor turns very slowly; any interaction stops that motion until three seconds after release. It then gently returns to the usual viewing elevation while preserving the visitor’s zoom. The discreet desktop World mood menu previews day/night and seasons. Click actual objects to discover seven surprises, with no floating markers: Khloé, the small cottage mailbox, ship, church bell, well, trees, and Pip's cottage door. Each click starts one bounded performance; repeated clicks during playback do not stack it. Keyboard users can Tab to an alternate discovery list. Khloé roams the clearing, leaves snowprints that disappear after five seconds, and performs a play bow and happy hops when clicked. The mailbox opens for Pip’s unfolding letter, the ship rocks, the bell swings with a quiet synthesized chime, and a coin follows a short underhand arc into the wishing well. Knock on the cottage door and Pip steps out, waves, then returns inside. Cloth pennants ripple from fixed hoists. The masts and all seventeen trees respond to a gentle breeze, with planted roots, fixed deck attachments, and rigging that stays clear of the sails. Water carries a faint, rippling reflection of the scenery and moving ship. Outdoor lighting shares one direction, and a fresh shadow map follows each rendered pose. Reflection resolution is capped at 640 pixels on desktop and 384 on coarse-pointer devices. There are no visitor play/pause buttons; administrative animation and reduced-motion settings still apply. Chimney smoke and gentle candlelight use exported Blender anchors; the ship’s lamps follow its rocking hull. Reduced-motion settings disable autonomous movement; the world stops rendering while outside the viewport. On WebGL failure the Blender render remains available.

Winter adds a glass snowglobe with dense snow that stirs, swirls, and settles when the world is dragged, plus light snowfall across the page. The default 4,500 globe flakes use varied currents and turn along the glass to avoid bunching. Autumn leaves occasionally blow away and are replenished from the trees; spring flowers grow clear of the actual path geometry; summer gulls make occasional passing visits. The fenced garden becomes spring flowerbeds, a summer campfire, autumn pumpkins, or a winter snowman. Foam and splashes follow the irregular shoreline, dock posts, and moving ship. Rare visitors include a passing shark fin, a leaping fish, an autumn sheet ghost behind the village, and a hand briefly reaching from a churchyard grave. They appear one at a time at randomized intervals. All effect pools are bounded and pause with the world. Administrative controls in `public/site-config.json` set snow density, effects, candle brightness, rare-visitor timing, sound, animation, discoveries, and optional interface visibility; see [CONFIG.md](docs/CONFIG.md).

The game download lives in `public/downloads/`. `release.json` supplies the visible version, size, filename and setup requirements. This is a **portable browser edition**, not a signed native macOS/Windows installer. It runs the actual compiled Alderwick game on a local-only server and keeps saves in the browser.

## Publishing

Every push to `main` builds and deploys using `.github/workflows/pages.yml`. **Settings → Pages → Source → GitHub Actions** is configured. Enable HTTPS after the custom-domain DNS check and certificate issuance complete. Build output uses relative paths, supporting both the GitHub project URL and a custom domain.

The website source and Blender authoring script are committed here. The original game’s private source history remains in its Sites repository. Only its compiled playable build is distributed in the download.

Edit [`public/site-config.json`](public/site-config.json) to enable or disable desktop downloads, set store links, choose automatic world defaults, and publish an optional announcement. Announcements start disabled and can be a postcard-style letter or top banner, with custom copy, colors, artwork, a link, and dismissal frequency. Read the [administration guide](docs/CONFIG.md). Phones and tablets show store availability instead of the desktop ZIP.

See [domain setup](docs/DOMAIN.md), [design notes](docs/DESIGN.md), and [asset credits](docs/CREDITS.md).

## Refresh the game download

1. Build the current game with relative asset URLs.
2. Package only compiled browser assets, launchers, instructions and required third-party licenses. Do not include environment files, credentials, source maps or private source.
3. Test startup, assets, save persistence and offline operation.
4. Replace the ZIP and update `public/downloads/release.json`, including SHA-256 and accurate requirements.
5. Commit and push. The website deployment carries the updated download.

## Hosting costs

This repository must be public to use GitHub Pages with GitHub Free. Domain registration and renewal are billed separately by Squarespace. Very large game builds should move to GitHub Releases, with the release URL updated in the manifest.

The browser favicon and iOS Home Screen icon use the original game’s gold house-and-flag artwork, copied exactly from the included game package. See [icon provenance](docs/ICONS.md).

The build adds a content hash to the Blender model URL so returning visitors receive geometry changes alongside the corresponding animation code.
