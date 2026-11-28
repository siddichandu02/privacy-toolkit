# PDFPip

Free PDF and image tools that stay on your device. Everything runs in your browser, so your files are never sent anywhere.

**Live site:** https://siddichandu02.github.io/pdfpip/

> Work in progress. More tools are on the way.

## Why

Most "free" online PDF and image tools send your files to a server to do the work. PDFPip
processes them locally, in your browser, using Web Workers. Your files are never sent anywhere, and
there are no analytics, no trackers and no third-party requests at runtime. Fonts are self-hosted.

## Tools

Ready now:

- **Merge PDF**: join PDFs in the order you choose.
- **Split PDF**: three ways to cut a PDF. Extract pages into one new PDF, split into parts (your own ranges, every N pages or N equal parts, zipped), or split every page into its own PDF. A live preview shows each file that will come out, and pages on the grid take the colour of the file they go to.
- **Rotate pages**: turn pages and drop the ones you do not need.
- **Images to PDF**: one page per image, A4, Letter or sized to the photo, with margins.
  Phone photos are turned upright using their EXIF orientation.
- **Sign PDF**: draw or type a signature, drag it into place on one page or all of them. Zoom
  in up to 400% (buttons, Ctrl + scroll or a pinch) to line it up exactly with the signature line;
  the page is redrawn sharply at every zoom and a magnifier follows the signature while you drag.
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

Every image tool opens iPhone HEIC photos, decoded on the device. Compress image saves them as
JPG, and Images to PDF puts them on the page as JPEG so the PDF stays photo-sized.

## Offline and install

After the first visit the whole app (every tool, its workers and the fonts) is kept in your
browser, so it opens and works with no connection. It can also be installed: Chrome, Edge and
Android show an "Install app" offer on the home page, and on iPhone or iPad you add it from
Safari's Share menu. The offline copy only holds the app's own files, never anything you open.

## Keyboard

Press <kbd>Ctrl</kbd> <kbd>K</kbd> (<kbd>⌘</kbd> <kbd>K</kbd> on a Mac) on any page to search
every tool by name or by what you want to do ("join", "passport", "gps"). The tools you opened
lately come first, and are also listed above the tool grid on the home page. They are kept in
your browser's local storage and nowhere else. Press <kbd>?</kbd> to see every shortcut.

## On a phone

Swipe a file to the left to remove it (Undo brings it back). When the list gets long, the main
button stays at the bottom of the screen so you never have to scroll to find it. Sheets such as
the shortcuts list slide up from the bottom and close when you pull them down. Pinch to zoom
works where you place a signature or crop a photo.

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

## Name

The project was called Privacy Toolkit until November 2026. Saved settings (theme, recent tools)
carry over to the new name on their own.

## License

[MIT](LICENSE)
