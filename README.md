# Privacy Toolkit

Free PDF and image tools that run entirely in your browser. Your files never leave your device.

**Live site:** https://siddichandu02.github.io/privacy-toolkit/

> Work in progress. More tools are on the way.

## Why

Most "free" online PDF and image tools upload your files to a server. Privacy Toolkit does all the
work locally, in your browser, using Web Workers. There are no uploads, no analytics, no trackers and
no third-party requests at runtime. Fonts are self-hosted.

## Tools

Ready now:

- **Merge PDF**: join PDFs in the order you choose.
- **Split PDF**: pull out page ranges, as one PDF or one PDF per range (zipped).
- **Rotate pages**: turn pages and drop the ones you do not need.
- **Images to PDF**: one page per image, A4, Letter or sized to the photo, with margins.
  Phone photos are turned upright using their EXIF orientation.
- **Sign PDF**: draw or type a signature, drag it into place on one page or all of them.

On the way: Compress PDF, Compress image, Convert image, Resize and crop, Remove EXIF.

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
