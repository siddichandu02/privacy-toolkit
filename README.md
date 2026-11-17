# Privacy Toolkit

Free PDF and image tools that run entirely in your browser. Your files never leave your device.

**Live site:** https://siddichandu02.github.io/privacy-toolkit/

> Work in progress. More tools are on the way.

## Why

Most "free" online PDF and image tools upload your files to a server. Privacy Toolkit does all the
work locally, in your browser, using Web Workers. There are no uploads, no analytics, no trackers and
no third-party requests at runtime. Fonts are self-hosted.

## Tools (planned)

| PDF           | Image           |
| ------------- | --------------- |
| Merge PDF     | Compress image  |
| Split PDF     | Convert image   |
| Rotate pages  | Resize and crop |
| Images to PDF | Remove EXIF     |
| Sign PDF      |                 |
| Compress PDF  |                 |

## Develop

Requires Node 22 or newer.

```bash
npm install
npm run dev          # start the dev server
npm run lint         # ESLint + Prettier check
npm run test         # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, builds first)
npm run build        # type-check and production build
```

## Stack

React 18, Vite, TypeScript (strict), Tailwind CSS, Framer Motion, React Router, pdf-lib, pdfjs-dist,
Vitest, Testing Library and Playwright. Deployed to GitHub Pages by GitHub Actions on every push to
`main`.

## License

[MIT](LICENSE)
