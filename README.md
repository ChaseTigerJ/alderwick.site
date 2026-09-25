# Alderwick

A playful website for Alderwick, built with React, TypeScript, Three.js and an original Blender harbor diorama. Static output runs on GitHub Pages without a paid server.

Live website: [Alderwick](https://www.chasetiger.com/alderwick-site/). The intended custom domain is `playalderwick.com`; purchase and DNS connection are still pending. The temporary URL inherits this GitHub account’s existing Pages domain.

## Develop

Use Node.js 24 and pnpm 11.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` checks TypeScript and produces `dist/`. `pnpm preview` serves the production build. Dependencies and fonts are self-hosted in the build.

## The world

Drag to orbit. The small view buttons support keyboard rotation and zoom. Switch day/night, change seasons, pause the scene, or discover the three glimmers. Reduced-motion settings disable autonomous movement; the world stops rendering while outside the viewport. On WebGL failure the Blender render remains available.

The game download lives in `public/downloads/`. `release.json` supplies the visible version, size, filename and setup requirements. This is a **portable browser edition**, not a signed native macOS/Windows installer. It runs the actual compiled Alderwick game on a local-only server and keeps saves in the browser.

## Publishing

Every push to `main` builds and deploys using `.github/workflows/pages.yml`. **Settings → Pages → Source → GitHub Actions** is configured, and HTTPS is enforced. Build output uses relative paths, supporting both the GitHub project URL and a custom domain.

The website source and Blender authoring script are committed here. The original game’s private source history remains in its Sites repository. Only its compiled playable build is distributed in the download.

See [domain setup](docs/DOMAIN.md), [design notes](docs/DESIGN.md), and [asset credits](docs/CREDITS.md).

## Refresh the game download

1. Build the current game with relative asset URLs.
2. Package only compiled browser assets, launchers, instructions and required third-party licenses. Do not include environment files, credentials, source maps or private source.
3. Test startup, assets, save persistence and offline operation.
4. Replace the ZIP and update `public/downloads/release.json`, including SHA-256 and accurate requirements.
5. Commit and push. The website deployment carries the updated download.

## Hosting costs

This repository must be public to use GitHub Pages with GitHub Free. The planned domain purchase and renewal are billed separately by Squarespace. Very large game builds should move to GitHub Releases, with the release URL updated in the manifest.
