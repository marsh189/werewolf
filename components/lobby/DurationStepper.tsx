type DurationStepperProps = {
  label: string;
  valueSeconds: number;
  minSeconds: number;
  isHost: boolean;
  onChange: (nextSeconds: number) => void;
  formatSeconds: (totalSeconds: number) => string;
};

export default function DurationStepper({
  label,
  valueSeconds,
  minSeconds,
  isHost,
  onChange,
  formatSeconds,
}: DurationStepperProps) {
  const canDecrease = valueSeconds > minSeconds;

  return (
    <div className="flex items-center justify-between">
      <label className="game-section-title">{label}</label>
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-[4ch] text-center">
          {formatSeconds(valueSeconds)}
        </span>
        {isHost && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={[
                'px-2 py-1 rounded-md border transition',
                canDecrease
                  ? 'border-slate-600/60 text-slate-200 hover:bg-slate-800/40'
                  : 'border-slate-600/20 text-slate-200/40 cursor-not-allowed',
              ].join(' ')}
              onClick={() => onChange(Math.max(minSeconds, valueSeconds - 30))}
              disabled={!canDecrease}
              aria-label={`Decrease ${label.toLowerCase()} timer`}
            >
              -
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded-md border border-slate-600/60 text-slate-200 hover:bg-slate-800/40 transition"
              onClick={() => onChange(valueSeconds + 30)}
              aria-label={`Increase ${label.toLowerCase()} timer`}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
