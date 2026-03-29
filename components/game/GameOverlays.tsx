'use client';

/* =============================================================================
   Game Overlays

   Centralized overlay rendering:
   - phase fade overlay (entry/exit transitions)
   - results route fadeout overlay
============================================================================= */

type PhaseOverlayState = {
  mode: 'hidden' | 'fadeIn' | 'fadeOut';
  key: number;
};

export default function GameOverlays({
  phaseOverlayState,
  showResultsFadeOut,
}: {
  phaseOverlayState: PhaseOverlayState;
  showResultsFadeOut: boolean;
}) {
  return (
    <>
      <div
        key={phaseOverlayState.key}
        className={[
          'game-phase-overlay z-40',
          phaseOverlayState.mode === 'fadeIn'
            ? 'phase-overlay-fade-in'
            : phaseOverlayState.mode === 'fadeOut'
              ? 'phase-overlay-fade-out'
              : 'opacity-0',
        ].join(' ')}
      />

      {showResultsFadeOut ? (
        <div
          key="results-route-fadeout"
          className="game-phase-overlay z-50 phase-overlay-fade-out"
        />
      ) : null}
    </>
  );
}

