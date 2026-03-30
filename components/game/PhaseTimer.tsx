'use client';

import { useNowTicker } from '@/lib/hooks/useNowTicker';
import { formatMinutesSeconds } from '@/lib/formatters/timeFormatters';
import { useEffect, useMemo, useRef } from 'react';

type PhaseTimerProps = {
  phaseEndsAt: number | null;
  phaseDurationMs?: number | null;
};

function PhaseTimerBar({
  phaseEndsAt,
  phaseDurationMs,
  barClassName,
}: {
  phaseEndsAt: number;
  phaseDurationMs: number;
  barClassName: string;
}) {
  const fillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    const now = Date.now();
    const startAt = phaseEndsAt - phaseDurationMs;
    const elapsedMs = Math.min(phaseDurationMs, Math.max(0, now - startAt));

    // Restart the CSS animation at the correct progress point.
    fill.style.animation = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    fill.offsetHeight;
    fill.style.animation = '';
    fill.style.animationDuration = `${phaseDurationMs}ms`;
    fill.style.animationDelay = `-${elapsedMs}ms`;
  }, [phaseDurationMs, phaseEndsAt]);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        ref={fillRef}
        className={['h-full w-full rounded-full phase-timer-bar-fill', barClassName].join(' ')}
      />
    </div>
  );
}

export default function PhaseTimer({ phaseEndsAt, phaseDurationMs }: PhaseTimerProps) {
  const nowMs = useNowTicker(!!phaseEndsAt, 250);

  const isReady = phaseEndsAt !== null && nowMs !== null;
  const remainingSeconds = isReady
    ? Math.max(0, Math.floor((phaseEndsAt - nowMs) / 1000))
    : 0;

  const remaining = formatMinutesSeconds(remainingSeconds);

  const { intentClassName, barClassName, showPulse } = useMemo(() => {
    const seconds = remainingSeconds;
    const intent = seconds <= 15 ? 'danger' : 'normal';

    const intentClassName =
      intent === 'danger'
        ? 'border-red-400/50 bg-red-500/10 text-red-200'
        : 'border-sky-500/40 bg-sky-500/10 text-sky-200';

    const barClassName =
      intent === 'danger'
        ? 'bg-red-400'
        : 'bg-sky-400';

    return {
      intentClassName,
      barClassName,
      showPulse: seconds <= 10,
    };
  }, [remainingSeconds]);

  if (!isReady) return null;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Phase ends in ${remaining}`}
      className={[
        'inline-flex flex-col gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em]',
        intentClassName,
        showPulse ? 'phase-timer-pulse' : '',
      ].join(' ')}
    >
      <div className="inline-flex items-center justify-between gap-3">
        <span>Phase ends in</span>
        <span className="tabular-nums">{remaining}</span>
      </div>
      {phaseDurationMs && phaseDurationMs > 0 ? (
        <PhaseTimerBar
          // Use a 1s-bucketed key so minor server end-time adjustments don't restart.
          key={Math.floor(phaseEndsAt / 1000)}
          phaseEndsAt={phaseEndsAt}
          phaseDurationMs={phaseDurationMs}
          barClassName={barClassName}
        />
      ) : null}
    </div>
  );
}
