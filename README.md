# Privacy Toolkit

Free PDF and image tools that run entirely in your browser. Your files never leave your device.

**Live site:** https://siddichandu02.github.io/privacy-toolkit/

> Work in progress. More tools are on the way.

## Why

Most "free" online PDF and image tools send your files to a server to do the work. Privacy Toolkit
processes them locally, in your browser, using Web Workers. Your files are never sent anywhere, and
there are no analytics, no trackers and no third-party requests at runtime. Fonts are self-hosted.

## Tools

Ready now:

- **Merge PDF**: join PDFs in the order you choose.
- **Split PDF**: pull out page ranges, as one PDF or one PDF per range (zipped).
- **Rotate pages**: turn pages and drop the ones you do not need.
- **Images to PDF**: one page per image, A4, Letter or sized to the photo, with margins.
  Phone photos are turned upright using their EXIF orientation.
- **Sign PDF**: draw or type a signature, drag it into place on one page or all of them.
- **Compress PDF**: three levels, from a lossless tidy-up to re-saving large photos as smaller
  JPEGs. Shows the size before and after, and never hands back a bigger file.

On the way: Compress image, Convert image, Resize and crop, Remove EXIF.

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
three.js (the 3D paper helpers in the wait animations, loaded only when a tool has files),
Vitest, Testing Library and Playwright. Deployed to GitHub Pages by GitHub Actions on every push to
`main`.

## License

[MIT](LICENSE)
