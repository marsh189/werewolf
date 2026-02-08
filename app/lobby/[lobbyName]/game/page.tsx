'use client';

import { useParams } from 'next/navigation';

export default function LobbyGamePage() {
  const { lobbyName } = useParams<{ lobbyName: string }>();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="text-center space-y-3">
        <h1 className="game-title">Game</h1>
        <p className="text-slate-300 text-sm">
          Lobby: {lobbyName ?? '...'}
        </p>
      </div>
    </div>
  );
}
