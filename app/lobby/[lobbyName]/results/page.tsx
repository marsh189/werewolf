'use client';

import { useLobbyRealtime } from '@/lib/hooks/useLobbyRealtime';
import { socket } from '@/lib/socket';
import { usePresenceView } from '@/lib/hooks/usePresenceView';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import { lobbyPath } from '@/lib/routes/routePaths';
import { getRoleDisplayName } from '@/models/roles';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/* =============================================================================
   Results Page

   Post-game summary screen that is only valid while the lobby is in the
   `gameResults` phase. If the lobby leaves that phase, we route back to `/lobby`.
============================================================================= */
export default function LobbyResultsPage() {
  const router = useRouter();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const timeline = [...(results.timeline ?? [])];
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
      <div className="mx-auto w-full max-w-6xl space-y-6 flex-1">
        <header className="text-center space-y-2">
          <p className="game-tight-label">Final</p>
          <h1 className={['game-title', titleToneClass].join(' ')}>{title}</h1>
          <p className="text-slate-300 text-sm">{subtitle}</p>
        </header>
        <div className="flex flex-col gap-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.72fr)] lg:items-start lg:gap-6">
          <section className="space-y-3 lg:order-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="game-section-title">Players</h2>
            </div>

            <div className="space-y-2">
              {results.players.map((player) => {
                const roleLabel = player.role
                  ? getRoleDisplayName(player.role)
                  : player.alive
                    ? 'Unknown'
                    : 'Hidden Role';
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
          </section>

          {timeline.length > 0 ? (
            <section className="space-y-3 lg:order-2 lg:max-w-[24rem] lg:justify-self-end lg:w-full">
              <div className="lg:hidden">
                <button
                  type="button"
                  className="w-full py-2 flex items-center justify-between gap-3 border-b border-slate-700/70"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((prev) => !prev)}
                >
                  <span className="game-section-title text-slate-300">
                    History
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {historyOpen ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>

              <div className="hidden lg:flex lg:flex-col gap-2">
                <h2 className="game-section-title">History</h2>
                <p className="text-xs text-slate-400">
                  Night kills, vote outcomes, and stalled rounds in order.
                </p>
              </div>

              {(historyOpen || timeline.length > 0) ? (
                <div className={[historyOpen ? 'block' : 'hidden', 'lg:block'].join(' ')}>
                  <div className="space-y-3 pt-1 lg:pt-0">
                    {timeline.map((event) => {
                      const badgeClass =
                        event.phase === 'night'
                          ? 'results-history-badge-night'
                          : 'results-history-badge-day';
                      const cardClass =
                        event.phase === 'night'
                          ? 'results-history-card-night'
                          : 'results-history-card-day';
                      const titleToneClass =
                        event.tone === 'danger'
                          ? 'text-red-300'
                          : event.tone === 'success'
                            ? 'text-emerald-300'
                            : 'text-sky-300';
                      return (
                        <article
                          key={event.id}
                          className={['results-history-card', cardClass].join(' ')}
                        >
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={['results-history-badge', badgeClass].join(' ')}>
                                {event.phase === 'night'
                                  ? `Night ${event.roundNumber ?? '?'}`
                                  : `Day ${event.roundNumber ?? '?'}`}
                              </span>
                            </div>
                            <p className={['text-sm font-semibold leading-5', titleToneClass].join(' ')}>
                              {event.title}
                            </p>
                            <p className="text-xs leading-5 text-slate-100/90">
                              {event.description}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <div className="pt-8 mt-auto w-full max-w-6xl mx-auto flex justify-center">
        <button
          type="button"
          className="game-button-secondary lg:w-auto lg:min-w-[12rem] lg:px-6"
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
