'use client';

import GameChat from '@/components/game/GameChat';
import GameNotebook from '@/components/game/GameNotebook';
import NotebookModal from '@/components/game/NotebookModal';
import type { GamePhase, NotebookView } from '@/models/game';

/* =============================================================================
   Game Floating Panels

   Renders optional "always available" UI panels that float above the game:
   - chat (hidden during certain cinematic phases)
   - notebook (hidden during role reveal + game end)
   - notebook modal (view another player's notebook)
============================================================================= */

export default function GameFloatingPanels({
  currentPhase,
  lobbyName,
  currentUserId,
  chatRefreshKey,
  canWriteNotebook,
  onNotesChange,
  viewingNotebook,
  onCloseNotebook,
}: {
  currentPhase: GamePhase;
  lobbyName: string | undefined;
  currentUserId: string | undefined;
  chatRefreshKey: string;
  canWriteNotebook: boolean;
  onNotesChange: (notes: string) => void;
  viewingNotebook: NotebookView | null;
  onCloseNotebook: () => void;
}) {
  const showChat =
    currentPhase !== 'nightResults' &&
    currentPhase !== 'endGame' &&
    currentPhase !== 'gameResults';

  const showNotebook =
    currentPhase !== 'roleReveal' &&
    currentPhase !== 'endGame' &&
    currentPhase !== 'gameResults';

  return (
    <>
      {showChat ? (
        <GameChat
          lobbyName={lobbyName}
          refreshKey={chatRefreshKey}
          currentUserId={currentUserId}
        />
      ) : null}

      {showNotebook ? (
        <GameNotebook
          lobbyName={lobbyName}
          userId={currentUserId}
          canWrite={canWriteNotebook}
          onNotesChange={onNotesChange}
        />
      ) : null}

      {viewingNotebook ? (
        <NotebookModal notebook={viewingNotebook} onClose={onCloseNotebook} />
      ) : null}
    </>
  );
}

