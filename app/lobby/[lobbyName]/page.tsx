'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LobbyHeaderStatus from '@/components/lobby/LobbyHeaderStatus';
import LobbyMembersList from '@/components/lobby/LobbyMembersList';
import LobbySettings from '@/components/lobby/LobbySettings';
import Navbar from '@/components/shared/Navbar';
import { useSession } from 'next-auth/react';
import { useLobbyRealtime } from '@/lib/hooks/useLobbyRealtime';
import { useGameSoundEffects } from '@/lib/hooks/useGameSoundEffects';
import { usePresenceView } from '@/lib/hooks/usePresenceView';
import { useNowTicker } from '@/lib/hooks/useNowTicker';
import type { LobbyPhaseDurations, LobbySettingsUpdate } from '@/models/lobby';
import {
  leaveLobby,
  startGame,
  updateLobbySettings,
} from '@/lib/actions/lobbySocketActions';
import {
  buildLobbySettingsPayload,
  DEFAULT_PHASE_DURATIONS,
  getStartingRemainingSeconds,
} from '@/lib/selectors/lobbyUiSelectors';
import { gamePath } from '@/lib/routes/routePaths';
import { normalizeLobbyNameParam } from '@/lib/routes/lobbyName';

/* =============================================================================
   Lobby Page

   Pre-game staging area for a single lobby. Responsibilities:
   - render members + lobby status
   - allow host to tweak settings + start the game
   - show a local "starting in..." countdown (based on server `startingAt`)
   - redirect into `/game` once the server marks the lobby started
============================================================================= */
export default function Lobby() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();

  const lobbyNameParam = normalizeLobbyNameParam(
    typeof lobbyName === 'string' ? lobbyName : undefined,
  );

  const { lobbyInfo, setLobbyInfo } = useLobbyRealtime(lobbyNameParam);

  /* -----------------------------------------------------------------------
     Lobby Name (Canonical)

     Prefer the server-provided lobby name once we have a snapshot. This avoids
     edge cases where the URL param is encoded/decoded differently (ex: spaces).
  ----------------------------------------------------------------------- */
  const lobbyNameCanonical =
    lobbyInfo?.lobbyName ?? lobbyNameParam;

  useEffect(() => {
    /* -----------------------------------------------------------------------
       Lobby -> Game Redirect

       The lobby view is only for pre-game setup. Once the server marks the
       lobby as started, we immediately route into `/game` (unless the lobby is
       already in the end/results phases).
    ----------------------------------------------------------------------- */

    if (!lobbyInfo?.started) return;
    const name = lobbyInfo?.lobbyName ?? lobbyNameCanonical;
    if (!name) return;
    if (lobbyInfo.gamePhase === 'endGame' || lobbyInfo.gamePhase === 'gameResults') {
      return;
    }
    router.push(gamePath(name));
  }, [
    lobbyInfo?.started,
    lobbyInfo?.lobbyName,
    lobbyInfo?.gamePhase,
    lobbyNameCanonical,
    router,
  ]);

  /* -----------------------------------------------------------------------
     Countdown Ticker

     `startingAt` is a server timestamp. We keep a short interval clock so the
     UI can render a smooth "Starting in..." countdown without server spam.
  ----------------------------------------------------------------------- */
  const nowMs = useNowTicker(!!lobbyInfo?.startingAt, 250);

  /* -----------------------------------------------------------------------
     Presence Tracking

     Lets the server know the user is actively viewing the lobby screen.
  ----------------------------------------------------------------------- */
  usePresenceView(lobbyNameCanonical, 'lobby');
  useGameSoundEffects({
    currentPhase: lobbyInfo?.gamePhase ?? 'lobby',
    startingAt: lobbyInfo?.startingAt,
  });

  /* -----------------------------------------------------------------------
     Derived Display Values
  ----------------------------------------------------------------------- */

  const startingRemainingSeconds = getStartingRemainingSeconds(
    lobbyInfo?.startingAt,
    nowMs,
  );

  const settingsDisplay = lobbyInfo ? buildLobbySettingsPayload(lobbyInfo) : null;

  /* -----------------------------------------------------------------------
     Host Permissions

     Host-only controls (settings + start game).
  ----------------------------------------------------------------------- */
  const isHost =
    lobbyInfo?.hostUserId && session?.user?.id
      ? lobbyInfo.hostUserId === session.user.id
      : false;

  const [settingsOpen, setSettingsOpen] = useState(false);

  const applyLobbySettings = (next: LobbySettingsUpdate) => {
    /* -----------------------------------------------------------------------
       Host Settings Updates

       `useLobbyRealtime` keeps us in sync with the server. We still optimistically
       merge the successful update into local state so the UI reacts immediately.
    ----------------------------------------------------------------------- */

    if (!lobbyNameCanonical) return;

    updateLobbySettings(lobbyNameCanonical, next, (err, res) => {
      if (err || !res?.ok) {
        console.error(res?.error ?? 'Failed to update lobby settings');
        return;
      }

      setLobbyInfo((prev) => (prev ? { ...prev, ...next } : prev));
    });
  };

  const handleWerewolfChange = (count: number) => {
    if (!lobbyInfo) return;
    applyLobbySettings(buildLobbySettingsPayload(lobbyInfo, { werewolfCount: count }));
  };

  const handleSpecialRolesEnabledChange = (enabled: boolean) => {
    if (!lobbyInfo) return;
    applyLobbySettings(buildLobbySettingsPayload(lobbyInfo, { specialRolesEnabled: enabled }));
  };

  const handleNeutralRolesEnabledChange = (enabled: boolean) => {
    if (!lobbyInfo) return;
    applyLobbySettings(buildLobbySettingsPayload(lobbyInfo, { neutralRolesEnabled: enabled }));
  };

  const handleRoleRevealOnEliminationChange = (enabled: boolean) => {
    if (!lobbyInfo) return;
    applyLobbySettings(buildLobbySettingsPayload(lobbyInfo, { roleRevealOnElimination: enabled }));
  };

  const handlePhaseChange = (next: LobbyPhaseDurations) => {
    if (!lobbyInfo) return;
    applyLobbySettings(buildLobbySettingsPayload(lobbyInfo, { phaseDurations: next }));
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[100svh] flex flex-col items-center px-4 py-4 sm:px-6 sm:py-6">
        <div className="w-full max-w-6xl">
          {lobbyInfo ? (
            <LobbyHeaderStatus
              lobbyName={lobbyInfo.lobbyName}
              started={lobbyInfo.started}
              startingRemainingSeconds={startingRemainingSeconds}
            />
          ) : (
            <div className="flex items-center gap-4 mb-3">
              <h1 className="game-title text-left">Loading Lobby...</h1>
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6 lg:min-h-[calc(100svh-12rem)]">
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              <LobbyMembersList
                key={`${lobbyNameCanonical ?? lobbyNameParam ?? ''}:${String(lobbyInfo?.startingAt ?? 'none')}`}
                members={lobbyInfo?.members ?? []}
                hostUserId={lobbyInfo?.hostUserId ?? ''}
                currentUserId={session?.user?.id}
                lobbyName={lobbyNameCanonical ?? lobbyNameParam ?? ''}
                nameLocked={Boolean(lobbyInfo?.startingAt)}
              />

              <div className="hidden lg:block pt-2 space-y-2 mt-auto">
                {sessionStatus === 'loading' && (
                  <div className="text-xs text-slate-400">
                    Checking session...
                  </div>
                )}
                <button
                  type="button"
                  className="game-button-secondary"
                  onClick={() => {
                    leaveLobby(lobbyName);
                    router.push('/');
                  }}
                >
                  Leave Lobby
                </button>
              </div>
            </div>

            <div className="hidden lg:block lg:self-stretch w-px bg-gradient-to-b from-transparent via-sky-400/60 to-transparent" />

            <div className="w-full lg:w-2/3 lg:pl-6 flex flex-col">
              <div className="lg:hidden">
                <button
                  type="button"
                  className="w-full py-2 flex items-center justify-between gap-3 border-b border-slate-700/70"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((prev) => !prev)}
                >
                  <span className="game-section-title text-slate-300">
                    Settings
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {settingsOpen ? 'Hide' : 'Show'}
                  </span>
                </button>

                {settingsOpen ? (
                  <div className="mt-4 space-y-4">
                    <LobbySettings
                      isHost={isHost}
                      werewolfCount={settingsDisplay?.werewolfCount ?? 1}
                      specialRolesEnabled={settingsDisplay?.specialRolesEnabled ?? false}
                      neutralRolesEnabled={settingsDisplay?.neutralRolesEnabled ?? false}
                      roleRevealOnElimination={settingsDisplay?.roleRevealOnElimination ?? true}
                      phaseDurations={settingsDisplay?.phaseDurations ?? DEFAULT_PHASE_DURATIONS}
                      onWerewolfChange={handleWerewolfChange}
                      onSpecialRolesEnabledChange={handleSpecialRolesEnabledChange}
                      onNeutralRolesEnabledChange={handleNeutralRolesEnabledChange}
                      onRoleRevealOnEliminationChange={handleRoleRevealOnEliminationChange}
                      onPhaseChange={handlePhaseChange}
                    />
                  </div>
                ) : null}

                <div className="pt-4 space-y-2">
                  {sessionStatus === 'loading' && (
                    <div className="text-xs text-slate-400">
                      Checking session...
                    </div>
                  )}
                  <button
                    type="button"
                    className="game-button-secondary"
                    onClick={() => {
                      if (!lobbyNameCanonical) return;
                      leaveLobby(lobbyNameCanonical);
                      router.push('/');
                    }}
                  >
                    Leave Lobby
                  </button>
                  {isHost && (
                    <button
                      type="button"
                      className="game-button-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={
                        !lobbyInfo ||
                        lobbyInfo.started ||
                        lobbyInfo.startingAt !== null
                      }
                      onClick={() => {
                        if (!lobbyNameCanonical) return;
                        startGame(lobbyNameCanonical, (err, res) => {
                          if (err || !res?.ok) {
                            console.error(res?.error ?? 'Failed to start game');
                          }
                        });
                      }}
                    >
                      {lobbyInfo?.startingAt !== null
                        ? 'Starting...'
                        : lobbyInfo?.started
                          ? 'Game Started'
                          : 'Start Game'}
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex lg:flex-col lg:flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="game-section-title">Settings</h2>
                </div>

                <div className="mt-4">
                  <LobbySettings
                    isHost={isHost}
                    werewolfCount={settingsDisplay?.werewolfCount ?? 1}
                    specialRolesEnabled={settingsDisplay?.specialRolesEnabled ?? false}
                    neutralRolesEnabled={settingsDisplay?.neutralRolesEnabled ?? false}
                    roleRevealOnElimination={settingsDisplay?.roleRevealOnElimination ?? true}
                    phaseDurations={settingsDisplay?.phaseDurations ?? DEFAULT_PHASE_DURATIONS}
                    onWerewolfChange={handleWerewolfChange}
                    onSpecialRolesEnabledChange={handleSpecialRolesEnabledChange}
                    onNeutralRolesEnabledChange={handleNeutralRolesEnabledChange}
                    onRoleRevealOnEliminationChange={handleRoleRevealOnEliminationChange}
                    onPhaseChange={handlePhaseChange}
                  />
                </div>

                <div className="pt-4 space-y-2 mt-auto">
                  {sessionStatus === 'loading' && (
                    <div className="text-xs text-slate-400">
                      Checking session...
                    </div>
                  )}
                  {isHost && (
                    <button
                      type="button"
                      className="game-button-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={
                        !lobbyInfo ||
                        lobbyInfo.started ||
                        lobbyInfo.startingAt !== null
                      }
                      onClick={() => {
                        if (!lobbyNameCanonical) return;
                        startGame(lobbyNameCanonical, (err, res) => {
                          if (err || !res?.ok) {
                            console.error(res?.error ?? 'Failed to start game');
                          }
                        });
                      }}
                    >
                      {lobbyInfo?.startingAt !== null
                        ? 'Starting...'
                        : lobbyInfo?.started
                          ? 'Game Started'
                          : 'Start Game'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
