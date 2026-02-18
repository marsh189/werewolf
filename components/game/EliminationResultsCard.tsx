import type { EliminationResult } from '@/models/lobby';
import type { GamePhase } from '@/models/game';

type EliminationResultsCardProps = {
  currentPhase: GamePhase;
  eliminationResultsKey: string;
  eliminationResult: EliminationResult | null;
};

export default function EliminationResultsCard({
  currentPhase,
  eliminationResultsKey,
  eliminationResult,
}: EliminationResultsCardProps) {
  if (currentPhase !== 'eliminationResults') return null;

  return (
    <div
      key={eliminationResultsKey}
      className="game-box result-scene-card flex-col items-start gap-3 text-left"
    >
      {eliminationResult?.noElimination === true
        ? (
          <p className="result-line-1 text-slate-200 font-semibold">
            No player was eliminated today.
          </p>
          )
        : eliminationResult
          ? (
            <>
              <p className="result-line-1 text-red-200 font-semibold">
                {eliminationResult.name} was executed by the town ({eliminationResult.voteCount} votes).
              </p>
              <p className="result-line-2 text-slate-300 text-sm">
                {eliminationResult.notebook.trim()
                  ? 'We found a will next to their body.'
                  : 'We could not find a last will.'}
              </p>
              <div className="result-line-3 w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                {eliminationResult.notebook.trim() || 'No final notes were left behind.'}
              </div>
            </>
            )
          : (
            <p className="result-line-1 text-slate-200 font-semibold">
              Awaiting verdict...
            </p>
            )}
    </div>
  );
}
