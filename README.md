# Kaki Mark Studio

A local-first batch image marking workspace for artists, photographers and small shops. Add a signature, sequence numbers, occlusion masks and contact-sheet layouts, preview every result live, then export individual images or a ZIP archive.

## Features

- **Two focused workspaces**
  - **Single-image watermark** — tiled pattern, gradient fade, or a bottom information band with optional date, custom text, or RMB price.
  - **Contact-sheet collage** — automatic ratio grouping, fixed or custom ratios, configurable rows and columns, and numbered occlusion masks.
- **Three compositing modules shared by both workspaces**
  - **Full-screen watermark** — import up to eight transparent textures, with per-layer opacity, blend mode, fit mode, and before/after-collage placement.
  - **Watermark frame** — import a frame, replace its ink color while preserving the detected foreground, add a shadow, and choose whether it is applied to each cell or the finished sheet.
  - **Small watermark** — import a logo or signature with nine-point placement, offsets, scale, rotation, shadow, and cell-or-sheet compositing.
- **Live preview** — edits are reflected immediately, with no server round-trip.
- **Independent quick presets** — signature presets and the full-screen tiled preset keep separate settings, can run together, and each can be cleared by clicking its active card again.
- **Fine-grained controls** — shadow distances and text outline strength use fine steps and scale proportionally with the rendered canvas.
- **Batch export** — write JPEG or PNG at a locked 2400 px long edge by default, unlock other sizes when needed, download one image, package the set as a ZIP, or load every finished image into an iOS-friendly long-press gallery.
- **First-run guide** — an animated three-step introduction appears on the first visit and can be reopened from the header.
- **Image inspection** — double-click any queued thumbnail to inspect the original image at a larger size; destructive removal requires confirmation.
- **Number styling** — choose font, color, opacity, outline, shadow, size, and six placement anchors, including a centered-sheet position.
- **Local and private** — files stay in the browser tab. There is no upload endpoint, account, tracking pixel, or analytics script.
- **Resilient by design** — validated controls, bounded canvas sizes, failed-image handling, object URL cleanup, keyboard navigation, and a responsive mobile layout.
- **Self-contained dependencies** — JSZip is vendored in this repository, so the core export flow does not depend on a third-party CDN.

## Use

Open the GitHub Pages deployment for this repository, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

1. Drop in a group of images.
2. Choose **Single-image watermark** or **Contact-sheet collage**.
3. Pick a signature preset and/or the full-screen tiled preset; click an active preset again to clear that group.
4. Adjust opacity, blend modes, placement, and edge effects in the live preview.
5. Export the current image or every page as a ZIP.

In collage mode, a full-screen layer set to **before collage** is composited onto every source photograph before the contact sheet is assembled. **After collage** layers cover the finished sheet. Watermark frames and small watermarks can independently target every cell or the finished sheet.

Automatic ratio mode groups only consecutive images with similar shapes, so the original import order is always preserved. A later image never jumps backward into an earlier ratio group. Fixed presets and custom width/height ratios use a consistent crop frame.

The loaded-results gallery uses a two-column masonry-style flow based on each image's real aspect ratio, so portrait, square, and landscape outputs do not force empty card space.

### Number tokens

In watermark text, `{n}` is replaced with the current item number and `{nn}` with a zero-padded number.

### Sold-out syntax

The sold-out field accepts comma-separated values and ranges:

```text
1, 3-5, 8, 12
```

Chinese punctuation such as `，`, `、` and `。` is also accepted.

## Project structure

```text
index.html               Application shell
styles.css               Visual system and responsive layout
app.js                   Image pipeline, watermark renderer, collage renderer and export
assets/vendor/jszip.min.js  Local ZIP dependency
```

## Notes

- All processing uses the Canvas API inside the browser.
- Frame recoloring derives a foreground mask from transparency or image contrast, so a black mark on a white background can be converted to a clean single-color stamp.
- The export resolution is limited by the selected long edge rather than the source pixel dimensions, avoiding oversized canvases on mobile devices.
- Settings persist in `localStorage`; imported images are intentionally not persisted after the tab is closed.
- ZIP compression is set to `STORE` because JPEG data is already compressed, which makes packaging faster without increasing file size in a meaningful way.
