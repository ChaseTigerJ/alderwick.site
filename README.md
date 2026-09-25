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

Drag to orbit and scroll to zoom on desktop; use two fingers to orbit/pinch on touchscreens while one finger scrolls the page. Keyboard arrows, plus/minus, and Home offer the same view controls. The discreet desktop World mood menu previews day/night and seasons. Click the actual objects to discover six surprises, with no floating markers: Khloé, the mailbox, ship, church bell, well, and trees. Each click starts one bounded performance; repeated clicks during playback do not stack it. Keyboard users can Tab to an alternate discovery list. Khloé roams the clearing, leaves snowprints that disappear after five seconds, and performs a play bow and happy hops when clicked. The mailbox opens for Pip’s unfolding letter, the ship rocks, the bell swings with a quiet synthesized chime, and a coin drops into the wishing well. Chimney smoke and flickering flame lights use exported Blender anchors. Reduced-motion settings disable autonomous movement; the world stops rendering while outside the viewport. On WebGL failure the Blender render remains available.

Winter adds a transparent snowglobe and light snowfall across the page; autumn leaves occasionally blow away and are replenished from the trees; spring flowers grow; summer gulls make occasional passing visits. Foam and splashes follow the irregular shoreline, dock posts, and moving ship. All effect pools are bounded and pause with the world.

The game download lives in `public/downloads/`. `release.json` supplies the visible version, size, filename and setup requirements. This is a **portable browser edition**, not a signed native macOS/Windows installer. It runs the actual compiled Alderwick game on a local-only server and keeps saves in the browser.

## Publishing

Every push to `main` builds and deploys using `.github/workflows/pages.yml`. **Settings → Pages → Source → GitHub Actions** is configured. Enable HTTPS after the custom-domain DNS check and certificate issuance complete. Build output uses relative paths, supporting both the GitHub project URL and a custom domain.

The website source and Blender authoring script are committed here. The original game’s private source history remains in its Sites repository. Only its compiled playable build is distributed in the download.

Edit [`public/site-config.json`](public/site-config.json) to enable or disable desktop downloads, set store links, and choose automatic world defaults. Read the [administration guide](docs/CONFIG.md). Phones and tablets show store availability instead of the desktop ZIP.

See [domain setup](docs/DOMAIN.md), [design notes](docs/DESIGN.md), and [asset credits](docs/CREDITS.md).

## Refresh the game download

1. Build the current game with relative asset URLs.
2. Package only compiled browser assets, launchers, instructions and required third-party licenses. Do not include environment files, credentials, source maps or private source.
3. Test startup, assets, save persistence and offline operation.
4. Replace the ZIP and update `public/downloads/release.json`, including SHA-256 and accurate requirements.
5. Commit and push. The website deployment carries the updated download.

## Hosting costs

This repository must be public to use GitHub Pages with GitHub Free. Domain registration and renewal are billed separately by Squarespace. Very large game builds should move to GitHub Releases, with the release URL updated in the manifest.
