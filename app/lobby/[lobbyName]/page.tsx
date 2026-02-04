'use client';

import { LobbyGuard } from '@/components/LobbyGuard';
import { socket } from '@/lib/socket';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Title from '@/components/Title';
import { useSession } from 'next-auth/react';

export type LobbyView = {
  lobbyName: string;
  hostUserId: string;
  members: { userId: string; name: string }[];
  started: boolean;
};

export default function Lobby() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();

  const [lobbyInfo, setLobbyInfo] = useState<LobbyView | null>(null);

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

  const isHost =
    lobbyInfo?.hostUserId && session?.user?.id
      ? lobbyInfo.hostUserId === session.user.id
      : false;

  console.log(session?.user.id);

  return (
    <LobbyGuard>
      <Title />
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl game-card">
          <div className="game-card-glow px-8 py-10">
            <div className="flex items-start justify-between gap-4 mb-10">
              <div>
                <h1 className="game-title text-left">
                  {lobbyInfo?.lobbyName ?? 'Loading Lobby…'}
                </h1>
                <p className="mt-2 text-slate-300">
                  {lobbyInfo
                    ? `${lobbyInfo.members.length} member${
                        lobbyInfo.members.length === 1 ? '' : 's'
                      }`
                    : 'Connecting to lobby…'}
                </p>
              </div>

              {lobbyInfo && (
                <span
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold border',
                    lobbyInfo.started
                      ? 'bg-red-500/10 text-red-200 border-red-500/30'
                      : 'bg-sky-500/10 text-sky-200 border-sky-500/30',
                  ].join(' ')}
                >
                  {lobbyInfo.started ? 'In Progress' : 'Waiting'}
                </span>
              )}
            </div>

            {/* Members */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-widest text-slate-400">
                  Players
                </h2>

                {/* Optional host hint */}
                {lobbyInfo?.hostUserId && (
                  <span className="text-xs text-slate-400">
                    Host ID: {lobbyInfo.hostUserId}
                  </span>
                )}
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
                      No members yet (or still loading)…
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions (placeholders; wire up later) */}

            <div className="mt-10 space-y-3">
              {sessionStatus === 'loading' && (
                <div className="text-xs text-slate-400">
                  Checking sessionâ€¦
                </div>
              )}
              {isHost && (
                <button
                  type="button"
                  className="game-button-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!lobbyInfo || lobbyInfo.started}
                  onClick={() => {
                    // hook up later: socket.emit('startGame', { lobbyName })
                    console.log('Start game (todo)');
                  }}
                >
                  {lobbyInfo?.started ? 'Game Started' : 'Start Game'}
                </button>
              )}

              <button
                type="button"
                className="w-full py-4 rounded-xl font-bold text-white bg-slate-800/70 border border-slate-700 hover:bg-slate-800 transition shadow-xl"
                onClick={() => {
                  socket.emit('leaveLobby', { lobbyName });
                  router.push('/');
                }}
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    </LobbyGuard>
  );
}
