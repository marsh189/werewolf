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

export default function CreateRoom() {
  const MIN_ROOM: number = 5;
  const MAX_ROOM: number = 10;
  const roomCapArray = Array.from(
    { length: MAX_ROOM - MIN_ROOM + 1 },
    (_, i) => MIN_ROOM + i,
  );

  const [extraRoles, setExtraRoles] = useState<string[]>([]);
  const [roomNameValue, setRoomNameValue] = useState<string>('');
  const [selectedCap, setSelectedCap] = useState<number>(MIN_ROOM);
  const [maxEnemy, setMaxEnemy] = useState<number>(1);
  const [rolePickerValue, setRolePickerValue] = useState<string>('DEFAULT');

  const roomNameRef = useRef('');

  const newRoles = ROLES.filter((role) => {
    return (
      !extraRoles.includes(role) && role !== 'Villager' && role !== 'Werewolf'
    );
  });
  useEffect(() => {});

  const createNewRoom = (event: SyntheticEvent) => {
    event.preventDefault();
    const room = roomNameRef.current;
    socket.emit('createRoom', { roomName: room });
  };
  const changeRoomLimit = (event: ChangeEvent<HTMLSelectElement>) => {
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

            <form onSubmit={createNewRoom} className="space-y-10">
              {/* Room Name */}
              <div className="space-y-3">
                <label className="game-label">Room Name</label>
                <input
                  required
                  type="text"
                  value={roomNameValue}
                  onChange={(e) => setRoomNameValue(e.target.value)}
                  placeholder="Enter A Room Name"
                  className="game-input"
                />
              </div>

              {/* Player Count */}
              <div className="space-y-3">
                <label className="game-label">Player Count</label>
                <select
                  value={selectedCap}
                  onChange={changeRoomLimit}
                  className="game-input"
                >
                  {roomCapArray.map((num) => (
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
