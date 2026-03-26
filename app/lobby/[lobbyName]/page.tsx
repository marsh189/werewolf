'use client';

import { socket } from '@/lib/socket';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LobbyHeaderStatus from '@/components/lobby/LobbyHeaderStatus';
import LobbyMembersList from '@/components/lobby/LobbyMembersList';
import LobbySettings from '@/components/lobby/LobbySettings';
import Navbar from '@/components/shared/Navbar';
import { useSession } from 'next-auth/react';
import { useLobbyRealtime } from '@/lib/useLobbyRealtime';
import type { LobbySettingsUpdate } from '@/models/lobby';
type SocketAck = { ok: boolean; error?: string };

export default function Lobby() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();

  const { lobbyInfo, setLobbyInfo } = useLobbyRealtime(lobbyName);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!lobbyInfo?.started) return;
    const name =
      typeof lobbyName === 'string' ? lobbyName : lobbyInfo.lobbyName;
    if (!name) return;
    if (lobbyInfo.gamePhase === 'endGame' || lobbyInfo.gamePhase === 'gameResults') {
      return;
    }
    router.push(`/lobby/${encodeURIComponent(name)}/game`);
  }, [lobbyInfo?.started, lobbyInfo?.lobbyName, lobbyInfo?.gamePhase, lobbyName, router]);

  useEffect(() => {
    if (!lobbyInfo?.startingAt) return;
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
  }, [lobbyInfo?.startingAt]);

  useEffect(() => {
    if (!lobbyName) return;
    if (!socket.connected) socket.connect();
    socket.emit('presence:setView', { lobbyName, view: 'lobby' });
  }, [lobbyName]);

  const startingRemainingSeconds = lobbyInfo?.startingAt && nowMs !== null
    ? Math.max(0, Math.ceil((lobbyInfo.startingAt - nowMs) / 1000))
    : null;

  const isHost =
    lobbyInfo?.hostUserId && session?.user?.id
      ? lobbyInfo.hostUserId === session.user.id
      : false;

  const [settingsOpen, setSettingsOpen] = useState(false);

  const updateLobbySettings = (next: LobbySettingsUpdate) => {
    if (!lobbyName) return;
    socket
      .timeout(5000)
      .emit('lobby:updateSettings', { lobbyName, ...next }, (err: unknown, res: SocketAck | undefined) => {
        if (err || !res?.ok) {
          console.error(res?.error ?? 'Failed to update lobby settings');
          return;
        }
        setLobbyInfo((prev) =>
          prev ? { ...prev, ...next } : prev,
        );
      });
  };

  const handleWerewolfChange = (count: number) => {
    if (!lobbyInfo) return;
    const minWerewolves = (lobbyInfo.specialRolesEnabled ?? false) ? 2 : 1;
    updateLobbySettings({
      werewolfCount: Math.max(minWerewolves, count),
      specialRolesEnabled: lobbyInfo.specialRolesEnabled ?? false,
      neutralRolesEnabled: lobbyInfo.neutralRolesEnabled ?? false,
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handleSpecialRolesEnabledChange = (enabled: boolean) => {
    if (!lobbyInfo) return;
    const minWerewolves = enabled ? 2 : 1;
    const nextWerewolfCount = Math.max(
      minWerewolves,
      lobbyInfo.werewolfCount ?? minWerewolves,
    );
    updateLobbySettings({
      werewolfCount: nextWerewolfCount,
      specialRolesEnabled: enabled,
      neutralRolesEnabled: enabled
        ? (lobbyInfo.neutralRolesEnabled ?? false)
        : false,
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handleNeutralRolesEnabledChange = (enabled: boolean) => {
    if (!lobbyInfo) return;
    const minWerewolves = (lobbyInfo.specialRolesEnabled ?? false) ? 2 : 1;
    updateLobbySettings({
      werewolfCount: Math.max(
        minWerewolves,
        lobbyInfo.werewolfCount ?? minWerewolves,
      ),
      specialRolesEnabled: lobbyInfo.specialRolesEnabled ?? false,
      neutralRolesEnabled: enabled,
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handlePhaseChange = (next: {
    daySeconds: number;
    nightSeconds: number;
    voteSeconds: number;
  }) => {
    if (!lobbyInfo) return;
    const minWerewolves = (lobbyInfo.specialRolesEnabled ?? false) ? 2 : 1;
    updateLobbySettings({
      werewolfCount: Math.max(
        minWerewolves,
        lobbyInfo.werewolfCount ?? minWerewolves,
      ),
      specialRolesEnabled: lobbyInfo.specialRolesEnabled ?? false,
      neutralRolesEnabled: lobbyInfo.neutralRolesEnabled ?? false,
      phaseDurations: next,
    });
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
                members={lobbyInfo?.members ?? []}
                hostUserId={lobbyInfo?.hostUserId ?? ''}
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
                    socket.emit('leaveLobby', { lobbyName });
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
                      werewolfCount={Math.max(
                        (lobbyInfo?.specialRolesEnabled ?? false) ? 2 : 1,
                        lobbyInfo?.werewolfCount ?? 1,
                      )}
                      specialRolesEnabled={lobbyInfo?.specialRolesEnabled ?? false}
                      neutralRolesEnabled={lobbyInfo?.neutralRolesEnabled ?? false}
                      phaseDurations={
                        lobbyInfo?.phaseDurations ?? {
                          daySeconds: 10,
                          nightSeconds: 10,
                          voteSeconds: 10,
                        }
                      }
                      onWerewolfChange={handleWerewolfChange}
                      onSpecialRolesEnabledChange={handleSpecialRolesEnabledChange}
                      onNeutralRolesEnabledChange={handleNeutralRolesEnabledChange}
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
                      socket.emit('leaveLobby', { lobbyName });
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
                        socket
                          .timeout(5000)
                          .emit('startGame', { lobbyName }, (err: unknown, res: SocketAck | undefined) => {
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
                    werewolfCount={Math.max(
                      (lobbyInfo?.specialRolesEnabled ?? false) ? 2 : 1,
                      lobbyInfo?.werewolfCount ?? 1,
                    )}
                    specialRolesEnabled={lobbyInfo?.specialRolesEnabled ?? false}
                    neutralRolesEnabled={lobbyInfo?.neutralRolesEnabled ?? false}
                    phaseDurations={
                      lobbyInfo?.phaseDurations ?? {
                        daySeconds: 10,
                        nightSeconds: 10,
                        voteSeconds: 10,
                      }
                    }
                    onWerewolfChange={handleWerewolfChange}
                    onSpecialRolesEnabledChange={handleSpecialRolesEnabledChange}
                    onNeutralRolesEnabledChange={handleNeutralRolesEnabledChange}
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
                        socket
                          .timeout(5000)
                          .emit('startGame', { lobbyName }, (err: unknown, res: SocketAck | undefined) => {
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
