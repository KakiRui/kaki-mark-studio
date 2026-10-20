# Kaki Mark Studio

A local-first batch image marking workspace for artists, photographers and small shops. Add a signature, sequence numbers, sold-out masks and contact-sheet layouts, preview every result live, then export individual JPEGs or a ZIP archive.

## Features

- **Two focused workspaces**
  - **Single-image watermark** — corner signature, tiled security mark, centered brand mark, or a bottom information band.
  - **Contact-sheet collage** — configurable rows and columns, continuous numbering, sold-out masks, and optional signatures inside each cell.
- **Live preview** — edits are reflected immediately, with no server round-trip.
- **Batch export** — render all pages at 1600–4000 px, download one image, or package the set as a ZIP.
- **Local and private** — files stay in the browser tab. There is no upload endpoint, account, tracking pixel, or analytics script.
- **Resilient by design** — validated controls, bounded canvas sizes, failed-image handling, object URL cleanup, keyboard navigation, and a responsive mobile layout.
- **Self-contained dependencies** — JSZip is vendored in this repository, so the core export flow does not depend on a third-party CDN.

## Use

Open the live app at **https://kakirui.github.io/kaki-mark-studio/**, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

1. Drop in a group of images.
2. Choose **Single-image watermark** or **Contact-sheet collage**.
3. Pick a preset and adjust the live preview.
4. Export the current image or every page as a ZIP.

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
- The export resolution is limited by the selected long edge rather than the source pixel dimensions, avoiding oversized canvases on mobile devices.
- Settings persist in `localStorage`; imported images are intentionally not persisted after the tab is closed.
- ZIP compression is set to `STORE` because JPEG data is already compressed, which makes packaging faster without increasing file size in a meaningful way.
