'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('join-room', roomId);

    socket.on('player-joined', (playerId) => {
      setPlayers((prev) => [...prev, playerId]);
      console.log('Player joined:', playerId);
    });

    return () => {
      socket.off('player-joined');
    };
  }, [roomId]);

  return (
    <div>
      <h1>Room: {roomId}</h1>

      <h2>Players</h2>
      <ul>
        {players.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
