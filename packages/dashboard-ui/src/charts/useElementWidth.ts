import { useEffect, useRef, useState } from 'react';

/** The element's width, so charts draw at real pixel size and text stays readable on phones. */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0);
      // Apply on the next frame, and only real changes: redrawing at the new width can toggle
      // the page scrollbar, which would otherwise feed straight back into this observer.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth((prev) => (w > 0 && Math.abs(w - prev) >= 1 ? w : prev)));
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return { ref, width };
}
