# Kaki Mark Studio

A local-first batch image marking workspace for artists, photographers and small shops. Add a signature, sequence numbers, sold-out masks and contact-sheet layouts, preview every result live, then export individual JPEGs or a ZIP archive.

## Features

- **Two focused workspaces**
  - **Single-image watermark** — layered emboss, tiled security mark, gradient fade, or a bottom information band.
  - **Contact-sheet collage** — configurable rows and columns, continuous numbering, sold-out masks, and optional signatures inside each cell.
- **Three compositing modules shared by both workspaces**
  - **Full-screen watermark** — import up to eight transparent textures, with per-layer opacity, blend mode, fit mode, and before/after-collage placement.
  - **Watermark frame** — import a transparent frame and control scale, position, rotation, opacity, blend mode, shadow, glow, smooth distance-transformed outline, and a backdrop-blur silhouette.
  - **Small watermark** — import a logo or signature with nine-point placement, offsets, scale, rotation, opacity, blend mode, and the same effect stack.
- **Live preview** — edits are reflected immediately, with no server round-trip.
- **Fine-grained effects** — blur, outline, and shadow distances use 0.1–1 px controls, then scale proportionally with the rendered canvas.
- **Batch export** — render all pages at 1600–4000 px, download one image, or package the set as a ZIP.
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
3. Pick a preset, then optionally layer a full-screen watermark, frame, or small watermark.
4. Adjust opacity, blend modes, placement, and edge effects in the live preview.
5. Export the current image or every page as a ZIP.

In collage mode, a full-screen layer set to **before collage** is composited onto every source photograph before the contact sheet is assembled. **After collage** layers cover the finished sheet.

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
- The soft backdrop uses the already-rendered image beneath the mark: it is blurred, clipped to an expanded, feathered watermark silhouette, and composited behind the original artwork.
- The export resolution is limited by the selected long edge rather than the source pixel dimensions, avoiding oversized canvases on mobile devices.
- Settings persist in `localStorage`; imported images are intentionally not persisted after the tab is closed.
- ZIP compression is set to `STORE` because JPEG data is already compressed, which makes packaging faster without increasing file size in a meaningful way.
