import { useEffect, useRef, useState } from 'react';
import type { PdfPages } from '../drop/preview';

const THUMB_WIDTH = 132;

/** Draws its page once it scrolls near the screen, then keeps the image. */
export function PageThumb({ pages, page }: { pages: PdfPages; page: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let made: string | null = null;
    const draw = () => {
      pages.render(page, THUMB_WIDTH).then(
        (u) => {
          made = u;
          if (alive) setUrl(u);
          else if (u) URL.revokeObjectURL(u);
        },
        () => {},
      );
    };
    if (typeof IntersectionObserver === 'undefined') {
      draw();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            draw();
          }
        },
        { rootMargin: '300px' },
      );
      io.observe(el);
      return () => {
        alive = false;
        io.disconnect();
        if (made) URL.revokeObjectURL(made);
      };
    }
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [pages, page]);

  return (
    <div ref={ref} className="absolute inset-0">
      {url ? (
        <img src={url} alt="" className="size-full object-contain" draggable={false} />
      ) : (
        <div className="size-full animate-pulse bg-line" />
      )}
    </div>
  );
}
