'use client';

import { useLobbyRealtime } from '@/lib/hooks/useLobbyRealtime';
import { socket } from '@/lib/socket';
import { usePresenceView } from '@/lib/hooks/usePresenceView';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import { lobbyPath } from '@/lib/routes/routePaths';
import { getRoleDisplayName } from '@/models/roles';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/* =============================================================================
   Results Page

   Post-game summary screen that is only valid while the lobby is in the
   `gameResults` phase. If the lobby leaves that phase, we route back to `/lobby`.
============================================================================= */
export default function LobbyResultsPage() {
  const router = useRouter();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);

  /* -----------------------------------------------------------------------
     Presence Tracking

     Lets the server know this user is actively viewing the results screen.
  ----------------------------------------------------------------------- */
  usePresenceView(typeof lobbyName === 'string' ? lobbyName : undefined, 'results');

  useEffect(() => {
    /* -----------------------------------------------------------------------
       Results Route Guard

       If the server transitions away from `gameResults`, this route is no
       longer valid, so we send the user back to the lobby.
    ----------------------------------------------------------------------- */

    if (!lobbyName || !lobbyInfo) return;
    if (lobbyInfo.gamePhase === 'gameResults') return;
    router.replace(lobbyPath(lobbyName));
  }, [lobbyInfo, lobbyName, router]);

  const results = lobbyInfo?.gameResults ?? null;

  if (!lobbyInfo || !results) {
    return (
      <div className="min-h-[100svh] px-4 sm:px-6 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-3xl text-center space-y-4">
          <h1 className="game-title">Game Results</h1>
          <p className="text-slate-300">Loading results...</p>
        </div>
      </div>
    );
  }

  const outcome = results.winningFaction ?? 'Village';
  const { title, subtitle, titleToneClass } = (() => {
    if (outcome === 'Executioner') {
      return {
        title: 'Executioner Wins',
        subtitle: "The Executioner's target was executed by vote.",
        titleToneClass: 'text-amber-200',
      };
    }

    if (outcome === 'Jester') {
      return {
        title: 'Jester Wins',
        subtitle: 'The Jester was executed by vote. Chaos wins.',
        titleToneClass: 'text-violet-200',
      };
    }

    if (outcome === 'Enemy') {
      return {
        title: 'Werewolves Win',
        subtitle: 'The village has fallen.',
        titleToneClass: 'text-red-200',
      };
    }

    return {
      title: 'Villagers Win',
      subtitle: 'The last werewolf has been eliminated.',
      titleToneClass: 'text-emerald-200',
    };
  })();

  return (
    <div className="game-cinematic-scene min-h-[100svh] flex flex-col px-4 sm:px-6 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6 flex-1">
        <header className="text-center space-y-2">
          <p className="game-tight-label">Final</p>
          <h1 className={['game-title', titleToneClass].join(' ')}>{title}</h1>
          <p className="text-slate-300 text-sm">{subtitle}</p>
        </header>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="game-section-title">Players</h2>
          </div>

          <div className="space-y-2">
            {results.players.map((player) => {
              const roleLabel = player.role
                ? getRoleDisplayName(player.role)
                : 'Unknown';
              const roleToneClass =
                player.faction === 'Village'
                  ? 'text-emerald-200'
                  : player.faction === 'Enemy'
                    ? 'text-red-200'
                    : player.faction === 'Neutral'
                      ? 'text-violet-200'
                      : 'text-slate-100';

              return (
                <div
                  key={player.userId}
                  className="game-box py-2 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={[
                          'inline-flex items-center justify-center h-6 w-6 rounded-full border text-[11px] font-bold',
                          player.alive
                            ? 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10'
                            : 'text-red-200 border-red-500/40 bg-red-500/10',
                        ].join(' ')}
                        aria-label={player.alive ? 'Alive' : 'Dead'}
                        title={player.alive ? 'Alive' : 'Dead'}
                      >
                        {player.alive ? '\u25CF' : '\u2620'}
                      </span>
                      <span className="text-white font-semibold truncate">
                        {player.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className={player.alive ? 'text-emerald-300' : 'text-red-300'}>
                        {player.alive ? 'Alive' : 'Dead'}
                      </span>
                      {!player.alive ? (
                        <span className="text-amber-200">
                          {` - ${player.eliminationSummary ?? 'Eliminated.'}`}
                        </span>
                      ) : null}
                      {player.faction ? (
                        <span
                          className={[
                            'font-semibold',
                            player.faction === 'Village'
                              ? 'text-emerald-200'
                              : player.faction === 'Enemy'
                                ? 'text-red-200'
                                : player.faction === 'Neutral'
                                  ? 'text-violet-200'
                                  : 'text-slate-200',
                          ].join(' ')}
                        >
                          {` - ${player.faction}`}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={['text-sm font-semibold', roleToneClass].join(' ')}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-8 mt-auto w-full max-w-3xl mx-auto">
        <button
          type="button"
          className="game-button-secondary"
          onClick={() => {
            if (!lobbyName) return;

            /* -----------------------------------------------------------
               Back To Lobby

               We proactively tell the server our view changed so it can
               make cleanup/auto-reset decisions without waiting for the
               route transition to fully complete.
            ----------------------------------------------------------- */

            connectSocketIfNeeded();
            socket.emit('presence:setView', { lobbyName, view: 'lobby' });
            router.push(lobbyPath(lobbyName));
          }}
        >
          Back to Lobby
        </button>
      </div>
      <div
        key="results-fadein"
        className="pointer-events-none fixed inset-0 z-50 bg-black phase-overlay-fade-in"
      />
    </div>
  );
}
