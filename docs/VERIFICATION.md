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
