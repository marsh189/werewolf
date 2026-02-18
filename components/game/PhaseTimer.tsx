'use client';

import { useEffect, useState } from 'react';

type PhaseTimerProps = {
  phaseEndsAt: number | null;
};

const formatRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function PhaseTimer({ phaseEndsAt }: PhaseTimerProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) return;

    const kickoffId = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      clearTimeout(kickoffId);
      clearInterval(id);
    };
  }, [phaseEndsAt]);

  if (!phaseEndsAt || nowMs === null) return null;

  const remaining = formatRemaining(phaseEndsAt - nowMs);

  return (
    <div className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">
      Phase ends in {remaining}
    </div>
  );
}
