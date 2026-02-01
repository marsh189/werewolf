'use client';

import { socket } from '@/lib/socket';
import Link from 'next/link';
import {
  ChangeEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ROLES } from '@/models/roles';
import Title from '@/components/Title';
import { useRouter } from 'next/navigation';

export default function CreateLobby() {
  const router = useRouter();
  const MIN_ROOM: number = 5;
  const MAX_ROOM: number = 10;
  const lobbyCapArray = Array.from(
    { length: MAX_ROOM - MIN_ROOM + 1 },
    (_, i) => MIN_ROOM + i,
  );

  const [extraRoles, setExtraRoles] = useState<string[]>([]);
  const [lobbyNameValue, setLobbyNameValue] = useState<string>('');
  const [selectedCap, setSelectedCap] = useState<number>(MIN_ROOM);
  const [maxEnemy, setMaxEnemy] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [rolePickerValue, setRolePickerValue] = useState<string>('DEFAULT');

  useEffect(() => {
    if (!socket.connected) socket.connect();
  });

  const newRoles = ROLES.filter((role) => {
    return (
      !extraRoles.includes(role) && role !== 'Villager' && role !== 'Werewolf'
    );
  });

  const createNewLobby = (event: SyntheticEvent) => {
    event.preventDefault();

    console.log('trying to join Lobby: ', lobbyNameValue);
    socket
      .timeout(5000)
      .emit(
        'createLobby',
        { lobbyName: lobbyNameValue.trim() },
        (
          err: any,
          response: { ok: boolean; lobbyName?: string; error?: string },
        ) => {
          // Timeout / transport error
          if (err) {
            console.error('Create request timed out');
            return;
          }

          // Server-side rejection
          if (!response.ok) {
            console.error(response.error);
            setErrorMessage(response.error as string);
            return;
          }

          // Success
          console.log('Created and Joined lobby:', response.lobbyName);
          router.push(`/lobby/${response.lobbyName}`);
        },
      );
  };
  const changeLobbyLimit = (event: ChangeEvent<HTMLSelectElement>) => {
    const size = Number(event.target.value);
    setSelectedCap(size);
    if (size > MIN_ROOM) {
      setMaxEnemy(2);
    } else {
      setMaxEnemy(1);
    }
  };
  const addRole = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value || value === 'DEFAULT') return;

    setExtraRoles((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setRolePickerValue('DEFAULT');
  };
  const removeRole = (role: string) => {
    setExtraRoles(extraRoles.filter((r) => r !== role));
  };

  return (
    <>
      <Title />
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="game-card">
          <div className="game-card-glow">
            <h1 className="game-title mb-10">Create Lobby</h1>

            <form onSubmit={createNewLobby} className="space-y-10">
              {/* Lobby Name */}
              <div className="space-y-3">
                <label className="game-label">Lobby Name</label>
                <input
                  required
                  type="text"
                  value={lobbyNameValue}
                  onChange={(e) => setLobbyNameValue(e.target.value)}
                  placeholder="Enter A Lobby Name"
                  className="game-input"
                />
              </div>

              {/* Player Count */}
              <div className="space-y-3">
                <label className="game-label">Player Count</label>
                <select
                  value={selectedCap}
                  onChange={changeLobbyLimit}
                  className="game-input"
                >
                  {lobbyCapArray.map((num) => (
                    <option key={num} value={num}>
                      {num} Players
                    </option>
                  ))}
                </select>
              </div>

              {/* Roles */}
              <div className="space-y-5">
                <label className="game-label">Roles</label>

                <div className="space-y-3">
                  {/* Werewolf */}
                  <div className="game-box game-box-werewolf">
                    <span>🐺 Werewolf</span>
                    <span>x{maxEnemy}</span>
                  </div>

                  {/* Extra Roles */}
                  {extraRoles.map((role) => (
                    <div key={role} className="game-box game-box-role">
                      <span>✨ {role}</span>
                      <button
                        type="button"
                        onClick={() => removeRole(role)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Role */}
                {newRoles.length > 0 && (
                  <div className="pt-2">
                    <select
                      value={rolePickerValue}
                      onChange={(e) => {
                        setRolePickerValue(e.target.value);
                        addRole(e);
                      }}
                      className="game-input"
                    >
                      <option value="DEFAULT" disabled>
                        ➕ Add New Role
                      </option>
                      {newRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-center text-red-300">{errorMessage}</p>

              {/* Create Button */}
              <div className="pt-4">
                <button type="submit" className="game-button-primary">
                  Create Lobby
                </button>
              </div>
            </form>

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
