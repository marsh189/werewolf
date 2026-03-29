'use client';

import { useNowTicker } from '@/lib/hooks/useNowTicker';
import { formatMinutesSeconds, getRemainingSecondsCeil } from '@/lib/formatters/timeFormatters';

type PhaseTimerProps = {
  phaseEndsAt: number | null;
};

export default function PhaseTimer({ phaseEndsAt }: PhaseTimerProps) {
  const nowMs = useNowTicker(!!phaseEndsAt, 250);

  if (!phaseEndsAt || nowMs === null) return null;

  const remainingSeconds = getRemainingSecondsCeil(phaseEndsAt, nowMs);
  const remaining = formatMinutesSeconds(remainingSeconds);

  return (
    <div className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">
      Phase ends in {remaining}
    </div>
  );
}
