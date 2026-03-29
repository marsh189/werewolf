import { useRouter } from 'next/navigation';
import LobbyCard from './LobbyCard';
import CreateLobbyModal from './CreateLobbyModal';
import RefreshIcon from '@/components/shared/RefreshIcon';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/lib/socket';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import type { LobbyListItem } from '@/models/lobby';
import {
  createLobby as createLobbyAction,
  joinLobby,
  requestLobbiesList as requestLobbiesListAction,
} from '@/lib/actions/lobbySocketActions';
import { lobbyPath } from '@/lib/routes/routePaths';

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

    requestLobbiesListAction((err, res) => {
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

    joinLobby(trimmed, (err, response) => {
      if (err) {
        setErrorMessage('Join request timed out.');
        return;
      }

      if (!response?.ok) {
        setErrorMessage(response?.error ?? 'Could not join lobby.');
        return;
      }
      router.push(lobbyPath(response.lobbyName));
    });
  };

  const createLobby = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creatingLobby) return;

    setErrorMessage('');
    setCreatingLobby(true);

    createLobbyAction(trimmed, (err, response) => {
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
      router.push(lobbyPath(response.lobbyName));
    });
  };

  useEffect(() => {
    /* -------------------------------------------------------------------------
       Lobby List Realtime

       We fetch once on mount and then subscribe to server push updates.
    ------------------------------------------------------------------------- */

    connectSocketIfNeeded();

    const onOpenLobbies = (list: LobbyListItem[]) => {
      setLobbies(list ?? []);
    };

    /* -----------------------------------------------------------------------
       Server Push Subscription: `lobbiesList`

       Payload: `LobbyListItem[]` list of current open lobbies.
       Why: the lobby browser updates live as lobbies are created/started.
       Cleanup: remove listener on unmount.
    ----------------------------------------------------------------------- */
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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="game-title text-left mt-2">Lobbies</h1>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-3">
              <button
                className="game-button-primary w-auto px-6 py-1.5"
                type="button"
                onClick={() => setIsCreateOpen(true)}
              >
                Create New Lobby
              </button>
              <button
                type="button"
                aria-label="Refresh"
                className="game-button-primary w-auto px-2 py-1.5"
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
            <div className="w-full">
              <div className="sm:hidden space-y-2">
                {displayedLobbies.length ? (
                  displayedLobbies.map((lobby) => (
                    <button
                      key={lobby.lobbyName}
                      type="button"
                      className="w-full game-box py-3 text-left flex items-center justify-between gap-3"
                      onClick={() => joinByName(lobby.lobbyName)}
                    >
                      <div className="min-w-0">
                        <span className="text-white font-semibold truncate block">
                          {lobby.lobbyName}
                        </span>
                        <p className="text-xs text-slate-400">
                          {lobby.memberCount} player{lobby.memberCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold',
                          lobby.started
                            ? 'border-red-500/40 bg-red-500/10 text-red-200'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
                        ].join(' ')}
                      >
                        {lobby.started ? 'Playing' : 'Open'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="game-box py-4">
                    <span className="text-slate-300 text-sm">
                      No lobbies found.
                    </span>
                  </div>
                )}
              </div>

              <div className="hidden sm:block max-h-[520px] overflow-auto lobby-scroll">
                <table className="w-full min-w-[32rem] text-center text-xs sm:text-sm table-fixed">
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
    </div>
  );
}
