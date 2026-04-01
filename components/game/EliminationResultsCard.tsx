import type { EliminationResult } from '@/models/lobby';
import type { EliminationRevealState, GamePhase } from '@/models/game';
import { getRoleDisplayName } from '@/models/roles';

type EliminationResultsCardProps = {
  currentPhase: GamePhase;
  eliminationResultsKey: string;
  eliminationResult: EliminationResult | null;
  revealState: EliminationRevealState;
};

export default function EliminationResultsCard({
  currentPhase,
  eliminationResultsKey,
  eliminationResult,
  revealState,
}: EliminationResultsCardProps) {
  if (currentPhase !== 'eliminationResults') return null;

  const roleLabel =
    eliminationResult && !eliminationResult.noElimination && eliminationResult.role
      ? getRoleDisplayName(eliminationResult.role)
      : null;
  const factionToneClass =
    eliminationResult && !eliminationResult.noElimination
      ? eliminationResult.faction === 'Village'
        ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'
        : eliminationResult.faction === 'Enemy'
          ? 'text-red-200 border-red-500/30 bg-red-500/10'
          : eliminationResult.faction === 'Neutral'
            ? 'text-violet-200 border-violet-500/30 bg-violet-500/10'
            : 'text-slate-200 border-slate-600/40 bg-slate-800/40'
      : 'text-slate-200 border-slate-600/40 bg-slate-800/40';

  return (
    <div
      key={eliminationResultsKey}
      className={[
        'game-box result-scene-card flex-col items-start gap-3 text-left transition-opacity duration-700',
        revealState === 'fading' ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      {eliminationResult?.noElimination === true
        ? (
          <div
            className={[
              'w-full space-y-3 transition-all duration-700',
              revealState === 'verdict' || revealState === 'details' || revealState === 'fading'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3',
            ].join(' ')}
          >
            <p className="result-line-1 text-slate-200 font-semibold">
              No player was eliminated today.
            </p>
            {revealState === 'details' || revealState === 'fading' ? (
              <div className="w-full space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-300">
                  {eliminationResult.totalVotes > 0
                    ? `${eliminationResult.totalVotes} total votes were cast, but the village failed to reach a clean execution.`
                    : 'The village let the day end without a vote.'}
                </p>
                {eliminationResult.tiedTargetNames.length > 0 ? (
                  <p className="text-xs text-amber-200">
                    Split vote: {eliminationResult.tiedTargetNames.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          )
        : eliminationResult
          ? (
            <>
              <p
                className={[
                  'result-line-1 text-red-200 font-semibold transition-all duration-700',
                  revealState === 'verdict' || revealState === 'details' || revealState === 'fading'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3',
                ].join(' ')}
              >
                {eliminationResult.name} was executed by the town ({eliminationResult.voteCount} votes).
              </p>
              <div
                className={[
                  'w-full space-y-3 transition-all duration-700',
                  revealState === 'details' || revealState === 'fading'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3',
                ].join(' ')}
              >
                <p className="result-line-2 text-slate-300 text-sm">
                  {eliminationResult.eliminationSummary ?? 'The village carried out the execution.'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
                  {eliminationResult.faction ? (
                    <span className={['rounded-full border px-3 py-1 font-semibold', factionToneClass].join(' ')}>
                      {eliminationResult.faction}
                    </span>
                  ) : null}
                  {roleLabel ? (
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 font-semibold text-slate-100">
                      {roleLabel}
                    </span>
                  ) : null}
                </div>
                <div className="result-line-3 w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                  {eliminationResult.notebook.trim() || 'No final notes were left behind.'}
                </div>
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
