'use client';

import { LobbyGuard } from '@/components/LobbyGuard';
import { socket } from '@/lib/socket';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import LobbySettings from '@/components/LobbySettings';
import type { LobbyView, LobbySettingsUpdate } from '@/models/lobby';

export default function Lobby() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();

  const [lobbyInfo, setLobbyInfo] = useState<LobbyView | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!lobbyName) return;

    socket.emit('initiateLobby', { lobbyName }, (response: any) => {
      if (!response.ok) {
        console.log(response.error);
        return;
      }
      setLobbyInfo(response.lobbyInfo);
    });

    const onUpdate = (data: LobbyView) => setLobbyInfo(data);

    socket.on('update', onUpdate);

    return () => {
      socket.off('update', onUpdate);
    };
  }, [lobbyName]);

  useEffect(() => {
    if (!lobbyInfo?.started) return;
    const name =
      typeof lobbyName === 'string' ? lobbyName : lobbyInfo.lobbyName;
    if (!name) return;
    router.push(`/lobby/${encodeURIComponent(name)}/game`);
  }, [lobbyInfo?.started, lobbyInfo?.lobbyName, lobbyName, router]);

  useEffect(() => {
    if (!lobbyInfo?.startingAt) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, [lobbyInfo?.startingAt]);

  const startingRemainingSeconds = lobbyInfo?.startingAt
    ? Math.max(0, Math.ceil((lobbyInfo.startingAt - nowMs) / 1000))
    : null;

  const isHost =
    lobbyInfo?.hostUserId && session?.user?.id
      ? lobbyInfo.hostUserId === session.user.id
      : false;

  console.log(session?.user.id);

  const updateLobbySettings = (next: LobbySettingsUpdate) => {
    if (!lobbyName) return;
    socket
      .timeout(5000)
      .emit('lobby:updateSettings', { lobbyName, ...next }, (err: any, res: any) => {
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
    updateLobbySettings({
      werewolfCount: Math.max(1, count),
      extraRoles: lobbyInfo.extraRoles ?? [],
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handleAddRole = (role: string) => {
    if (!lobbyInfo) return;
    const nextRoles = lobbyInfo.extraRoles?.includes(role)
      ? lobbyInfo.extraRoles
      : [...(lobbyInfo.extraRoles ?? []), role];
    updateLobbySettings({
      werewolfCount: lobbyInfo.werewolfCount ?? 1,
      extraRoles: nextRoles,
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handleRemoveRole = (role: string) => {
    if (!lobbyInfo) return;
    updateLobbySettings({
      werewolfCount: lobbyInfo.werewolfCount ?? 1,
      extraRoles: (lobbyInfo.extraRoles ?? []).filter((r) => r !== role),
      phaseDurations: lobbyInfo.phaseDurations,
    });
  };

  const handlePhaseChange = (next: {
    daySeconds: number;
    nightSeconds: number;
    voteSeconds: number;
  }) => {
    if (!lobbyInfo) return;
    updateLobbySettings({
      werewolfCount: lobbyInfo.werewolfCount ?? 1,
      extraRoles: lobbyInfo.extraRoles ?? [],
      phaseDurations: next,
    });
  };

  return (
    <LobbyGuard>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-6xl">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="game-title text-left">
              {lobbyInfo?.lobbyName ?? 'Loading Lobby...'}
            </h1>

            {lobbyInfo && (
              <span
                className={[
                  'px-3 py-1 rounded-full text-xs font-semibold border',
                  lobbyInfo.started
                    ? 'bg-red-500/10 text-red-200 border-red-500/30'
                    : 'bg-sky-500/10 text-sky-200 border-sky-500/30',
                ].join(' ')}
              >
                {lobbyInfo.started
                  ? 'In Progress'
                  : startingRemainingSeconds !== null
                    ? `Starting... ${startingRemainingSeconds}`
                    : 'Waiting'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch min-h-[70vh]">
            <div className="w-full lg:w-1/3 flex flex-col">
              {/* Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="game-section-title">
                    Players
                  </h2>
                </div>

                <div className="space-y-3">
                  {lobbyInfo?.members?.length ? (
                    lobbyInfo.members.map((member) => (
                      <div key={member.userId} className="game-box">
                        <span className="text-white font-semibold">
                          {member.name}
                        </span>

                        <span className="text-xs text-slate-400">
                          {member.userId === lobbyInfo.hostUserId ? 'Host' : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="game-box">
                      <span className="text-slate-300">
                        No members yet (or still loading)...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions (placeholders; wire up later) */}

              <div className="mt-auto pt-10 space-y-3">
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
            <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-sky-400/60 to-transparent" />
            <div className="w-full lg:w-2/3 lg:pl-8 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="game-section-title">
                  Settings
                </h2>
              </div>

              <div className="mt-6">
                <LobbySettings
                  isHost={isHost}
                  werewolfCount={lobbyInfo?.werewolfCount ?? 1}
                  extraRoles={lobbyInfo?.extraRoles ?? []}
                  phaseDurations={
                    lobbyInfo?.phaseDurations ?? {
                      daySeconds: 60,
                      nightSeconds: 60,
                      voteSeconds: 30,
                    }
                  }
                  onWerewolfChange={handleWerewolfChange}
                  onAddRole={handleAddRole}
                  onRemoveRole={handleRemoveRole}
                  onPhaseChange={handlePhaseChange}
                />
              </div>

              {/* Actions (placeholders; wire up later) */}

              <div className="mt-auto pt-10 space-y-3">
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
                          // hook up later: socket.emit('startGame', { lobbyName })
                          socket
                            .timeout(5000)
                            .emit('startGame', { lobbyName }, (err: any, res: any) => {
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
    </LobbyGuard>
  );
}
