import { useEffect, useRef, useState } from 'react';

/* =============================================================================
   Info Popover (Shared)

   Reusable "i" button + pinned popover used across the app.
   Behavior matches the lobby role popover:
   - click toggles pinned open/closed
   - clicking anywhere outside closes it (pointerdown capture)
   - Escape closes it
============================================================================= */

export default function InfoPopover({
  ariaLabel,
  align = 'right',
  widthClassName = 'w-64',
  children,
}: {
  ariaLabel: string;
  align?: 'left' | 'right';
  widthClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (event.target instanceof Node && container.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center z-40">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-bold text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-sky-400"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        onClick={() => setOpen((prev) => !prev)}
      >
        i
      </button>

      <div
        className={[
          'absolute top-full z-[999] mt-2 max-w-[calc(100vw-1rem)] rounded-md border border-slate-600 bg-slate-900/95 p-2 text-left text-xs text-slate-200 shadow-lg transition-opacity',
          widthClassName,
          align === 'left'
            ? 'left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0'
            : 'right-0',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

