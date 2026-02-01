'use client';

import Title from '@/components/Title';
import { SyntheticEvent, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Joinlobby() {
  const router = useRouter();
  const [lobbyName, setlobbyName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!socket.connected) socket.connect();
  });

  const joinLobby = (event: SyntheticEvent) => {
    event.preventDefault();

    console.log('trying to join Lobby: ', lobbyName);
    socket
      .timeout(5000)
      .emit(
        'joinLobby',
        { lobbyName: lobbyName.trim() },
        (
          err: any,
          response: { ok: boolean; lobbyName?: string; error?: string },
        ) => {
          // Timeout / transport error
          if (err) {
            console.error('Join request timed out');
            return;
          }

          // Server-side rejection
          if (!response.ok) {
            console.error(response.error);
            setErrorMessage(response.error as string);
            return;
          }

          // Success
          console.log('Joined lobby:', response.lobbyName);
          router.push(`/lobby/${response.lobbyName}`);
        },
      );
  };

  return (
    <>
      <Title />
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="game-card">
          <div className="game-card-glow">
            <h1 className="game-title mb-10">Join Lobby</h1>
            <form onSubmit={joinLobby} className="space-y-10">
              <div className="space-y-3">
                <label className="game-label">Lobby Name</label>
                <input
                  required
                  type="text"
                  value={lobbyName}
                  onChange={(e) => setlobbyName(e.target.value)}
                  placeholder="Enter A Lobby Name"
                  className="game-input"
                />
                <p className="text-center text-red-300">{errorMessage}</p>
              </div>

              <div className="pt-4">
                <button type="submit" className="game-button-primary">
                  Join
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
