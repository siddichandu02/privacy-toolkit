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
- **Compress image**: a quality slider, JPG/WebP output and size presets, with a live before
  and after view of your own photo. Several photos come back in one ZIP, and camera and
  location details are left out of the new copies.
- **Convert image**: HEIC, PNG, WebP, JPG or GIF to JPG, PNG or WebP. iPhone HEIC photos are
  decoded in the browser too (the decoder, heic2any, is bundled with the site and only loads
  when a HEIC photo is added). Several photos come back in one ZIP.
- **Resize and crop**: passport, Instagram, story, LinkedIn banner, profile photo and YouTube
  sizes, or your own numbers. Drag or pinch the photo under the frame (arrow keys work too) to
  choose what stays, or keep the whole photo and just scale it. Warns when a photo is too small
  for the size and would look soft. Add several photos to cut them all to one size: each is
  centred, and a strip of previews lets you move the frame on any of them.
- **Remove EXIF**: see what a photo gives away before you share it (where it was taken, when,
  whose it is, the camera, the apps that edited it) on a small globe and a plain list, then
  strip all of it. JPG, PNG and WebP are cut losslessly, so every pixel stays the same and the
  photo keeps its colour profile and stays upright. HEIC is saved as JPG. The cleaned photo is
  read again on the device to check nothing is left.

Compress image, Convert image, Resize and crop and Remove EXIF all take batches. The results come
back in one ZIP, and the finished card lists each file with its own save button for when you only need one or two.

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
exifr (reading photo details), heic2any,
three.js (the 3D paper helpers in the wait animations, loaded only when a tool has files),
Vitest, Testing Library and Playwright. Deployed to GitHub Pages by GitHub Actions on every push to
`main`.

## License

[MIT](LICENSE)
