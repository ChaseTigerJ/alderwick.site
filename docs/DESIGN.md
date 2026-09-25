# Alderwick design

Reading this as a playful game launch site for curious settlement-builder players, using a colonial New England miniature world and heritage typography.

The generated desktop reference establishes a cream parchment field, evergreen oversized serif headline on the left, dominant autumn harbor diorama across the right two thirds, orange tactile download CTA, and a minimal header. Cormorant Garamond suits the game's historical setting; DM Sans keeps controls readable. The 3D scene is the main visual, never a raster substitute for interaction. The title remains actual HTML.

Reference analysis: header ~80px with generous outer margins and one fine rule; title approximately 110px at 1536px, tight but non-overlapping three-line wrapping; supporting copy ~22px; rectangular 14px-radius orange button with a physical lower edge; low-density utility controls beneath the island. Palette #f4efdf parchment, #153e32 evergreen, #c75a2b terracotta and teal water. No boxed feature grid. The generated image is a direction reference, not gameplay or a screenshot of the finished implementation.

Motion communicates the living world and user feedback: seasonal weather, shoreline foam, chimney smoke, roaming Khloé, changing light, and one-shot object discoveries. Objects are discovered through raycasting; there are no floating pins or visible gesture instructions. A keyboard-only discovery list preserves access without clutter. Day/night and season controls remain in the discreet desktop World mood menu. Reduced motion disables autonomous movement. On mobile the island stacks under the title and store availability replaces the desktop download.

The central landmark is a colonial American clapboard church with tall sash windows, a front bell tower, and an open belfry. Two cottages have clear approaches; the cramped rear cottage is removed. The small mailbox is mounted on Fisher cottage. The garden changes its actual props with the season. Spring planting avoids the paths with petal clearance, and winter snowfall responds to drag impulses with inertia and settling inside the glass.

Pip's visitor model is based on Alderwick's existing `citizen-11` Courier definition, not a new character: copper coat `#ce8757`, light skin `#efc8a0`, auburn hair `#92644a`, cream waistcoat, capotain hat, brown satchel, and sealed letter. Reference files in the supplied game source are `src/simulation/world.ts`, `catalog.ts`, `appearance.ts`, and `src/render/models.ts` (`citizenModel`). The website uses a simplified miniature with separate arm and leg pivots. His nine-second visit opens the cottage door, walks onto the lane, waves, returns inside, and closes the door.

The transparent WebGL canvas spans the hero behind the copy. An offset projection keeps the initial desktop village composition to the right while zoomed scenery can flow behind the text. A captured mouse orbit temporarily suppresses page selection; releasing, cancelling, or blurring restores it. The header contains only the Alderwick home link.

The harbor geometry is original and reproducible from assets-source. Khloé’s adapted CC0 character, Blender source and provenance are documented in [KHLOE.md](KHLOE.md). Download status is driven by release metadata, never fabricated platform availability.
