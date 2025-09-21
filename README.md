# Trail Whisper

[![Build](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/github/deployments/smeir/trail-whisper/github-pages?label=pages&logo=github)](https://github.com/smeir/trail-whisper/deployments/github-pages)
[![React](https://img.shields.io/npm/v/react?label=react)](https://www.npmjs.com/package/react)
[![Vite](https://img.shields.io/npm/v/vite?label=vite)](https://www.npmjs.com/package/vite)

This is a minimalist Hello World React application created with [Vite](https://vite.dev/). The app is implemented as a pure client-side application and is served via GitHub Pages.

## Start Development

```bash
npm install
npm run dev
```

After that, the application is available at http://localhost:5173.

## Build for Production

```bash
npm run build
```

The production build is generated in the `dist/` folder and is used by the GitHub Pages deployment.

## Deployment to GitHub Pages

The workflow located at `.github/workflows/deploy.yml` builds the application and automatically publishes it to GitHub Pages whenever changes are pushed to the `main` branch. Manual triggering via "Run workflow" is also possible.

Make sure that GitHub Pages in the repository settings is configured to use the source "GitHub Actions".
