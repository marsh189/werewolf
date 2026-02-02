'use client';

import Title from '@/components/Title';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type OpenLobby = {
  lobbyName: string;
  hostUserId: string;
  memberCount: number;
  started: boolean;
  cap: number | null;
};

type ListAck =
  | { ok: true; lobbies: OpenLobby[] }
  | { ok: false; error?: string };

type JoinAck = { ok: true; lobbyName: string } | { ok: false; error?: string };

export default function Joinlobby() {
  const router = useRouter();

  const [lobbyName, setLobbyName] = useState('');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [openLobbies, setOpenLobbies] = useState<OpenLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredLobbies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return openLobbies;

    return openLobbies.filter((l) => l.lobbyName.toLowerCase().includes(q));
  }, [openLobbies, search]);

  const requestOpenLobbies = () => {
    setErrorMessage('');
    setRefreshing(true);

    socket
      .timeout(5000)
      .emit('list-open-lobbies', {}, (err: any, res: ListAck) => {
        setRefreshing(false);
        setLoadingLobbies(false);

        if (err) {
          setErrorMessage('Server did not respond. Try refresh again.');
          return;
        }

        if (!res?.ok) {
          setErrorMessage(res?.error ?? 'Failed to fetch lobbies.');
          return;
        }

        setOpenLobbies(res.lobbies ?? []);
      });
  };

  const joinByName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setErrorMessage('');

    socket
      .timeout(5000)
      .emit(
        'joinLobby',
        { lobbyName: trimmed },
        (err: any, response: JoinAck) => {
          if (err) {
            setErrorMessage('Join request timed out.');
            return;
          }

          if (!response?.ok) {
            setErrorMessage(response?.error ?? 'Could not join lobby.');
            return;
          }
          console.log(response.lobbyName);
          router.push(`/lobby/${encodeURIComponent(response.lobbyName)}`);
        },
      );
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onOpenLobbies = (list: OpenLobby[]) => {
      setOpenLobbies(list ?? []);
      setLoadingLobbies(false);
    };

    socket.on('openLobbies', onOpenLobbies);

    // initial load
    requestOpenLobbies();

    return () => {
      socket.off('openLobbies', onOpenLobbies);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Title />

      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl game-card">
          <div className="game-card-glow">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="game-title text-left">Join Lobby</h1>
                <p className="mt-2 text-slate-300">
                  Search for an open lobby, or join by name.
                </p>
              </div>

              <button
                type="button"
                onClick={requestOpenLobbies}
                disabled={refreshing}
                className="px-4 py-2 rounded-xl text-sm font-semibold
                           bg-slate-800/70 border border-slate-700 text-white
                           hover:bg-slate-800 transition
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* Search */}
            <div className="space-y-3 mb-6">
              <label className="game-label">Search</label>
              <input
                className="game-input"
                placeholder="Search lobby name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="mb-6 game-box border-red-500/30 bg-red-500/10">
                <span className="text-red-200 text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Scrollable list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-widest text-slate-400">
                  Open Lobbies
                </h2>
                <span className="text-xs text-slate-400">
                  {filteredLobbies.length} shown
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {loadingLobbies ? (
                  <div className="game-box">
                    <span className="text-slate-300">Loading lobbies…</span>
                  </div>
                ) : filteredLobbies.length === 0 ? (
                  <div className="game-box">
                    <span className="text-slate-300">
                      No matching lobbies. Try a different search or refresh.
                    </span>
                  </div>
                ) : (
                  filteredLobbies.map((lobby) => (
                    <button
                      key={lobby.lobbyName}
                      type="button"
                      onClick={() => {
                        setLobbyName(lobby.lobbyName);
                        joinByName(lobby.lobbyName); // ✅ click-to-join
                      }}
                      className="game-box w-full text-left hover:bg-slate-800/80 transition"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="min-w-0">
                          <div className="text-white font-semibold truncate">
                            {lobby.lobbyName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {lobby.memberCount}
                            {lobby.cap ? ` / ${lobby.cap}` : ''} players
                            {lobby.started ? ' • In progress' : ''}
                          </div>
                        </div>

                        <span className="text-xs px-3 py-1 rounded-full border bg-sky-500/10 text-sky-200 border-sky-500/30">
                          Join
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Back */}
            <div className="mt-10 text-center">
              <Link href="/" className="game-link">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
