import { useRouter } from 'next/navigation';
import { LobbyGuard } from './LobbyGuard';
import RefreshIcon from './RefreshIcon';
import LobbyCard from './LobbyCard';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/lib/socket';
import type {
  LobbyListItem,
  ListAck,
  JoinAck,
  CreateAck,
} from '@/models/lobby';

export default function LobbySelect() {
  const router = useRouter();

  const [lobbyName, setLobbyName] = useState('');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [lobbies, setLobbies] = useState<LobbyListItem[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [creatingLobby, setCreatingLobby] = useState(false);

  const filteredLobbies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lobbies;

    return lobbies.filter((l) => l.lobbyName.toLowerCase().includes(q));
  }, [lobbies, search]);

  const displayedLobbies = openOnly ? filteredLobbies : lobbies;

  const requestLobbiesList = () => {
    setErrorMessage('');
    setRefreshing(true);

    socket
      .timeout(5000)
      .emit('lobbiesList', {}, (err: any, res: ListAck<LobbyListItem>) => {
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

      setLobbies(res.lobbies ?? []);
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

  const createLobby = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creatingLobby) return;

    setErrorMessage('');
    setCreatingLobby(true);

    socket
      .timeout(5000)
      .emit(
        'createLobby',
        { lobbyName: trimmed },
        (err: any, response: CreateAck) => {
          setCreatingLobby(false);
          if (err) {
            setErrorMessage('Create lobby request timed out.');
            return;
          }

          if (!response?.ok) {
            setErrorMessage(response?.error ?? 'Could not create lobby.');
            return;
          }

          setIsCreateOpen(false);
          setNewLobbyName('');
          router.push(`/lobby/${encodeURIComponent(response.lobbyName)}`);
        },
      );
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onOpenLobbies = (list: LobbyListItem[]) => {
      setLobbies(list ?? []);
      setLoadingLobbies(false);
    };

    socket.on('lobbiesList', onOpenLobbies);

    // initial load
    requestLobbiesList();

    return () => {
      socket.off('lobbiesList', onOpenLobbies);
    };
  }, []);

  return (
    <LobbyGuard>
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="game-title text-left mt-2">Lobbies</h1>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                className="game-button-primary py-1.5 md:w-auto md:px-6"
                type="button"
                onClick={() => setIsCreateOpen(true)}
              >
                Create New Lobby
              </button>
              <button
                type="button"
                aria-label="Refresh"
                className="game-button-primary py-1.5 md:w-auto md:px-2"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <label className="sr-only" htmlFor="lobby-search">
                Search for a Lobby
              </label>
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                🔍
              </span>
              <input
                id="lobby-search"
                className="game-input py-2 pl-10 bg-slate-900/70 border-slate-700/80"
                placeholder="Find a game"
              />
            </div>
            <button className="game-button-primary py-2 md:w-auto md:px-6">
              Search
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <input
                id="open-lobbies"
                type="checkbox"
                value="open"
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900/60 text-sky-400 focus:ring-2 focus:ring-sky-400"
              />
              <label
                htmlFor="open-lobbies"
                className="uppercase tracking-[0.2em] text-[11px]"
              >
                Show Open Lobbies
              </label>
            </div>
          </div>
          {/* Error */}
          {errorMessage && (
            <div className="mb-6 game-box border-red-500/30 bg-red-500/10">
              <span className="text-red-200 text-sm">{errorMessage}</span>
            </div>
          )}

          <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
          <div className="flex justify-center">
            <div className="w-full overflow-hidden">
              <table className="w-full text-center text-sm">
                <thead className="text-slate-300">
                  <tr>
                    <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Lobby Name
                    </th>
                    <th className="text-right py-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Players
                    </th>
                    <th className="text-right py-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="text-slate-100">
                  {displayedLobbies.map((lobby) => (
                    <LobbyCard
                      key={lobby.lobbyName}
                      lobbyName={lobby.lobbyName}
                      memberCount={lobby.memberCount}
                      status={lobby.started}
                      onJoin={(name) => {
                        setLobbyName(name);
                        joinByName(name);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-lobby-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2
                id="create-lobby-title"
                className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300"
              >
                Create Lobby
              </h2>
            </div>

            <div className="mt-4">
              <label className="sr-only" htmlFor="new-lobby-name">
                Lobby Name
              </label>
              <input
                id="new-lobby-name"
                value={newLobbyName}
                onChange={(e) => setNewLobbyName(e.target.value)}
                className="game-input py-2"
                placeholder="Enter lobby name"
                required
                autoFocus
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="game-button-secondary py-2 px-4 md:w-auto"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="game-button-primary py-2 px-4 md:w-auto"
                onClick={() => createLobby(newLobbyName)}
                disabled={creatingLobby || !newLobbyName.trim()}
              >
                {creatingLobby ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LobbyGuard>
  );
}
