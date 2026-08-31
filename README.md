# Gridelle

A browser-only image collage editor for Instagram formats. Build flexible photo grids, adjust each image in place, and export a high-resolution JPG or PNG.

## Privacy

Gridelle has no backend, account system, analytics, or cloud storage. Images remain in browser memory and are never uploaded.

## Features

- Instagram canvas formats: Portrait (`1080 x 1350`), Square (`1080 x 1080`), Landscape (`1080 x 566`), and Stories & Reels (`1080 x 1920`)
- Add or remove rows and set the column count for each row independently
- Drag row and column dividers to resize adjacent cells
- Configure divider thickness, color, and optional outer border
- Choose an empty-cell background color with automatic readable upload-control contrast
- Upload, replace, clear, pan, pinch-zoom, scroll-zoom, or reset an image per cell
- Export true-resolution JPG with a quality control or PNG
- Download locally or share through the Web Share API where supported
- Installable PWA with offline app-shell support and online service-worker updates

## Development

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Additional commands:

```bash
npm run build
npm run preview
npm run lint
```

## GitHub Pages Deployment

The workflow at [`.github/workflows/deploy-gh-pages.yml`](.github/workflows/deploy-gh-pages.yml) publishes a production build to the `gh-pages` branch whenever a tag beginning with `v` is pushed.

```bash
git tag v1.0.0
git push origin v1.0.0
```

In the repository settings, configure GitHub Pages to deploy from the `gh-pages` branch. GitHub Actions must also be allowed to use a read/write `GITHUB_TOKEN`.

## Technology

- React 19
- Vite
- HTML Canvas export
- Vite PWA / Workbox
