import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MARGINS, placeImage, type ImagesOptions } from '../../lib/pdf/page-layout';
import { useStillMotion } from '../../useStillMotion';
import { useObjectUrl } from '../result/useObjectUrl';
import { useDrawableFile } from './useDrawableFile';
import type { Accent } from '../ui/accent';

/** Room the preview sheet can take, in CSS pixels. */
const BOX = { w: 200, h: 240 };

interface Size {
  width: number;
  height: number;
}

/** The image's own size once the browser has opened it; null while loading or if it cannot. */
function useImageSize(url: string | null) {
  const [state, setState] = useState<{ url: string; size: Size | null; failed: boolean } | null>(
    null,
  );
  useEffect(() => {
    if (!url) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live)
        setState({
          url,
          size: { width: img.naturalWidth, height: img.naturalHeight },
          failed: false,
        });
    };
    img.onerror = () => {
      if (live) setState({ url, size: null, failed: true });
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  return state && state.url === url ? state : null;
}

/**
 * A paper sheet showing exactly where one image lands on its page with the
 * chosen size, orientation and margin. Changes spring into place, so the
 * options feel like moving real paper around.
 */
export function PagePreview({
  file,
  options,
  accent,
  behind,
}: {
  file: File;
  options: ImagesOptions;
  accent: Accent;
  /** How many more pages to hint at behind this one (0 to 2 drawn). */
  behind: number;
}) {
  const still = useStillMotion();
  const url = useObjectUrl(useDrawableFile(file));
  const loaded = useImageSize(url);
  // Until the image opens, lay out a 4:3 photo so the sheet still answers the options.
  const size = loaded?.size ?? { width: 4, height: 3 };
  const spot = placeImage(size.width, size.height, options);
  const scale = Math.min(BOX.w / spot.pageW, BOX.h / spot.pageH);
  const page = { w: spot.pageW * scale, h: spot.pageH * scale };
  const pic = {
    left: spot.x * scale,
    top: (spot.pageH - spot.y - spot.h) * scale,
    width: spot.w * scale,
    height: spot.h * scale,
  };
  const spring = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 26 };
  const landscape = spot.pageW > spot.pageH;
  const m = MARGINS[options.margin] * scale;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: BOX.w + 24, height: BOX.h + 24 }}
      data-testid="page-preview"
      data-orientation={landscape ? 'landscape' : 'portrait'}
    >
      {Array.from({ length: Math.min(2, behind) }, (_, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          className="absolute rounded-md border border-line bg-surface-strong shadow-soft"
          initial={false}
          animate={{
            width: page.w,
            height: page.h,
            rotate: i === 0 ? 4 : -3,
            x: i === 0 ? 8 : -6,
            y: 4,
          }}
          transition={spring}
        />
      ))}
      <motion.div
        className="relative overflow-hidden rounded-md bg-[#fbf9ff] shadow-lifted ring-1 ring-black/5"
        initial={false}
        animate={{ width: page.w, height: page.h }}
        transition={spring}
      >
        {/* Margin guide: a dashed line where the printable area starts. */}
        {options.margin !== 'none' ? (
          <motion.div
            aria-hidden="true"
            className="absolute rounded-[3px] border border-dashed"
            style={{ borderColor: `color-mix(in srgb, var(--${accent}) 55%, transparent)` }}
            initial={false}
            animate={{ left: m, top: m, width: page.w - 2 * m, height: page.h - 2 * m }}
            transition={spring}
          />
        ) : null}
        <motion.div
          className="absolute overflow-hidden"
          initial={false}
          animate={pic}
          transition={spring}
          style={{ background: `color-mix(in srgb, var(--${accent}) 22%, #e9e4f5)` }}
        >
          {url && loaded?.size ? (
            <img src={url} alt="" className="size-full object-fill" draggable={false} />
          ) : (
            <PhotoGlyph accent={accent} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

function PhotoGlyph({ accent }: { accent: Accent }) {
  return (
    <svg
      viewBox="0 0 40 30"
      className="size-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="29" cy="9" r="4" fill={`var(--${accent})`} opacity="0.7" />
      <path
        d="M0 30 L0 22 L12 12 L22 21 L28 16 L40 25 L40 30 Z"
        fill={`var(--${accent})`}
        opacity="0.5"
      />
    </svg>
  );
}
