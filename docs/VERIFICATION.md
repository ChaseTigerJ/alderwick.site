# Verification record

Initial GitHub Actions build and Pages deployment succeeded at commit `95ad71cbd3c5fe89beb22c31a248a18ce2507b23`. The initial public page was verified over HTTPS at `https://www.chasetiger.com/alderwick-site/` before the repository rename and custom-domain setup.

- Live deployment: rendered 3D scene and desktop layout inspected, no console warnings/errors; actual hosted ZIP download event verified.
- Website TypeScript check and Vite production build: passed.
- Desktop 1440×900 and small-laptop 1280×720: layout and rendered WebGL scene inspected.
- Mobile 390×844: three-line headline, navigation toggle, download control and scene inspected; no horizontal document overflow.
- Day/night lighting, winter foliage, discovery state and download dialog: exercised in browser.
- Download: browser emitted download event for the 11 MB game ZIP; manifest and SHA-256 recorded in public/downloads.
- Portable game: TypeScript and production build passed; all 242 existing source tests passed.
- Portable game browser smoke: main menu, settlement creation, founder/settler/companion customization flow, voyage launch and rendered ship verified without console errors.
- All 63 game assets served with successful status, matching bytes, and correct JS/CSS MIME types from the included local launcher.
- Archive CRC and launcher syntax checks: passed. The package includes compiled assets and licenses, without game source, credentials, source maps or node_modules.

The portable edition requires a desktop browser with WebGL 2 plus Python 3.8+ or Node.js 18+. Native installer signing and platform-specific installer QA are outside this edition.

## Custom-domain diagnosis

After the repository was renamed to `ChaseTigerJ/alderwick.site`, GitHub Pages was configured for `www.playalderwick.com`. On September 24, 2026 (EDT), authoritative Squarespace DNS returned `www CNAME alderwick.site`, and the public HTTP response was Cloudflare error 1001. All four apex A records already matched GitHub Pages. The required correction is `www CNAME chasetigerj.github.io`; validation and certificate issuance must complete before enabling HTTPS.

## Interactive island update

The following checks cover the interactive island and website administration update. The initial deployment and game-package results above remain historical; the portable game ZIP is unchanged and its 242 tests were not rerun for this website update.

- All 10 focused Node tests passed. Coverage includes the exported GLB hierarchy and animation anchors, a 120-second simulation of safe dog roaming, pause behavior, winter paw prints, discovery animations, and strict configuration validation for availability flags, calendar seasons, computer appearance, and mobile detection.
- The updated Blender export contains 57 meshes, 16,502 triangles, and 1,433,488 bytes.
- Browser layouts were checked at 1440 pixels wide on desktop, 320 and 390 pixels on phones, and 768 pixels on tablet. No horizontal document overflow was found.
- Mobile store buttons opened **Coming Soon** details and exposed zero ZIP links. Resizing an open desktop download dialog into the mobile layout removed its ZIP link.
- With `download.enabled` set to `false`, every desktop download entry changed to **Coming Soon** and the browser contained zero ZIP links. The setting was restored to `true` after testing.
- Night lighting, chimney smoke, winter paw prints, and dog, ship, and letter discovery animations were inspected in the browser.
- TypeScript and the final Vite production build passed. The production preview rendered without console warnings or errors; paused-world wheel zoom repainted correctly, and Pip's unfolded letter remained readable at night.

On September 24, 2026 (EDT), a later public DNS check returned `www CNAME chasetigerj.github.io` and GitHub Pages addresses. Custom-domain HTTPS was still awaiting a valid certificate at the time of this update's local verification.

Physical iOS and Android pinch gestures have not been verified on actual hardware. Browser viewport checks establish the responsive layout and availability behavior, not hardware gesture compatibility.

## Seasonal world and object discoveries

The September 24, 2026 seasonal update replaces floating discovery markers with clickable model geometry and keeps a keyboard discovery list that appears on focus.

- All 18 focused Node tests pass. New coverage includes exactly five-second pawprint expiry, one-shot mailbox/bell/well animations, object picking and occlusion, seasonal particle bounds, frozen motion, shoreline placement, moving-ship foam, cottage clearance, and gull/leaf arrival and departure cycles.
- The revised Blender export has 79 meshes, 17,538 triangles, and 1,525,088 bytes. The source scene and generator are included. Roof footprints are separated and Khloé's torso is slimmer.
- Actual browser clicks on the mailbox, dog, ship, church bell, well, and tree opened the corresponding discovery. A pointer drag rotated the world without adding a discovery. Keyboard Tab revealed the discovery list, and Escape returned focus to the world.
- Winter snowfall and glass dome, spring flowers, autumn foliage, water foam, night illumination, and the new model were visually inspected. Summer gulls and autumn replenishment were additionally checked by deterministic simulation.
- Production preview layouts were inspected at 320, 390, 768, 1024, and 1440 pixels wide with no horizontal document overflow. Floating markers, visible gesture instructions, and the two header navigation links are absent.
- The user's concurrent GitHub change setting `download.enabled` to `false` was preserved. The rebuilt desktop preview shows **Coming Soon!** at all three entry points; phone/tablet layouts show store availability buttons and no ZIP links.
- TypeScript and the final production build pass. Browser console checks returned no warnings or errors. Vite reports its existing dependency directive notices and a 658 kB lazy-loaded Three.js scene chunk warning.

Physical mobile pinch testing and audible bell playback on actual devices remain unverified. The portable game archive is unchanged.

## Colonial village, snowglobe physics, and administration

- All 29 focused tests pass, including the real exported door/mailbox/bell hierarchy, Pip's complete nine-second visit and frozen greeting, actual transformed path triangle exclusion, seasonal garden visibility, snow inertia and dome containment under repeated strong impulses, settling, and the added administrative switches.
- The final Blender export contains 85 meshes, 17,924 triangles, and 1,531,516 bytes. It removes the rear cottage, replaces the central hall with a colonial clapboard church, mounts a small mailbox beside the working cottage doorway, and scales the ship up 12%. One foreground alder was moved to expose the seasonal garden from the default camera.
- Browser checks confirmed Pip exits the clicked cottage door, the door opens, and the model animates. Spring flowerbeds and clear paths, the summer campfire and passing gull, autumn pumpkins, and the winter snowman/globe were inspected. Back-and-forth mouse orbits stir the dense snow; deterministic tests verify inertia and settling after release.
- Zoomed scenery now extends continuously behind the hero text. A mouse drag across the text produced no text selection or accidental discovery, and the drag state was cleared on release.
- Layouts at 320, 768, 1024, and 1440 pixels wide showed no horizontal document overflow. The header contains zero buttons; phone/tablet layouts have no ZIP links.
- A temporary local configuration disabled animation, discoveries, effects, sound, and optional controls. The browser removed the snow overlay, discovery list/section, mood controls, and header buttons while keeping the scene available. The test configuration was restored before building; desktop, iOS, and Android availability remain `false`.
- TypeScript and the final Vite build passed. Browser console checks returned no warnings/errors. The lazy-loaded Three.js scene is approximately 676 kB before gzip; Vite's size warning remains informational.

Physical device touch/pinch QA remains outside these desktop browser checks. The unchanged game archive and DNS configuration were not modified by this visual update.


## Harbor clearance, natural snow, and rare visitors

- All 47 focused tests pass. New checks use the complete exported well roof and path triangles, full projected ship hull against the irregular cliff and dock throughout the actual rocking animation, and every vessel vertex against the sea boundary. The minimum conservative cliff gap is 0.115, dock gap 0.921, and full vessel radius 7.911 inside the 8.35 sea.
- The Blender model contains 90 meshes, 18,571 triangles, and 1,568,916 bytes. The ship is 32% larger than the preceding export, its berth is moved and turned outward, and three light anchors follow the hull. The well and workshop supplies clear the lanes, the cottage-adjacent lamp is removed, and two slate headstones sit behind the church.
- The coin now follows a short underhand arc beneath the well roof and beside the bucket. Its small landing ripple remains within the well water. Browser clicking and geometric flight checks passed.
- Three cloth pennants ripple while their hoists remain fixed. Night candle pools are dimmer and shorter; ship lanterns follow the vessel. Tests cover moving light positions, bounded flicker, daylight, disabled brightness, and pause.
- Winter defaults to 4,500 flakes in a bounded 9,000-particle pool. Varied currents, back-and-forth stirring, glass deflection, inertia, and settling replace the shared flow that caused bunching. Tests include prolonged maximum shaking, distribution across quadrants/heights, containment, settling, and pause. Repeated mouse shakes were visually checked by day and night.
- Shark fin, fish jump, autumn sheet ghost, and grave hand were visually inspected through a temporary local harness using the production animation module. That harness was removed before the final build. Seven visitor tests cover one-shot completion, scheduling, mutual exclusion, autumn gating, pause, disabled effects, and sea-lane clearance.
- The final production build renders without console warnings or errors. Desktop 1440×900 and phone 390×844 were inspected; the phone has no horizontal overflow or ZIP links. Download and both store availability flags remain false.
- TypeScript and Vite pass. The lazy Three.js scene chunk is approximately 694 kB before gzip; its existing size warning remains informational. New administrative settings control candle brightness and rare-visitor frequency/availability.

Physical mobile gesture testing is not included in the desktop viewport check. The game archive and DNS settings are unchanged.
