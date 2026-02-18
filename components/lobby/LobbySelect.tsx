import { useRouter } from 'next/navigation';
import { LobbyGuard } from './LobbyGuard';
import LobbyCard from './LobbyCard';
import CreateLobbyModal from './CreateLobbyModal';
import RefreshIcon from '@/components/shared/RefreshIcon';
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

  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [lobbies, setLobbies] = useState<LobbyListItem[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [creatingLobby, setCreatingLobby] = useState(false);

  const filteredLobbies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lobbies;

    return lobbies.filter((l) => l.lobbyName.toLowerCase().includes(q));
  }, [lobbies, search]);

  const openFilteredLobbies = useMemo(
    () => filteredLobbies.filter((lobby) => !lobby.started),
    [filteredLobbies],
  );

  const displayedLobbies = openOnly ? openFilteredLobbies : filteredLobbies;

  const requestLobbiesList = () => {
    setErrorMessage('');

    socket
      .timeout(5000)
      .emit('lobbiesList', {}, (err: unknown, res: ListAck<LobbyListItem>) => {
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
        (err: unknown, response: JoinAck) => {
          if (err) {
            setErrorMessage('Join request timed out.');
            return;
          }

          if (!response?.ok) {
            setErrorMessage(response?.error ?? 'Could not join lobby.');
            return;
          }
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
        (err: unknown, response: CreateAck) => {
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
    };

    socket.on('lobbiesList', onOpenLobbies);

    // initial load
    const kickoffId = setTimeout(() => {
      requestLobbiesList();
    }, 0);

    return () => {
      clearTimeout(kickoffId);
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
                onClick={requestLobbiesList}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="game-input py-2 pl-10 bg-slate-900/70 border-slate-700/80"
                placeholder="Find a game"
              />
            </div>
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
                className="game-tight-label"
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
            <div className="w-full overflow-hidden max-h-[520px] overflow-y-scroll lobby-scroll">
              <table className="w-full text-center text-sm table-fixed">
                <colgroup>
                  <col className="w-2/3" />
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                </colgroup>
                <thead className="sticky top-0 z-10 text-slate-300 border-b border-slate-700/60 bg-slate-950/80 backdrop-blur">
                  <tr>
                    <th className="pl-3 py-3 text-left game-table-head">
                      Lobby Name
                    </th>
                    <th className="pr-12 py-3 text-right game-table-head">
                      Players
                    </th>
                    <th className="pr-6 py-3 text-right game-table-head">
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
      <CreateLobbyModal
        isOpen={isCreateOpen}
        newLobbyName={newLobbyName}
        creatingLobby={creatingLobby}
        onNameChange={setNewLobbyName}
        onCreate={() => createLobby(newLobbyName)}
        onClose={() => setIsCreateOpen(false)}
      />
    </LobbyGuard>
  );
}
