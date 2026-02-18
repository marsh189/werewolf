'use client';

import { socket } from '@/lib/socket';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import { useLobbyRealtime } from '@/lib/useLobbyRealtime';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type GameInitResponse = {
  ok: boolean;
  error?: string;
  game?: {
    started: boolean;
    phase: 'lobby' | 'roleReveal' | 'day' | 'night' | 'vote';
    phaseEndsAt: number | null;
    role: string | null;
    hostUserId: string;
  };
};

type SocketAck = {
  ok: boolean;
  error?: string;
};

const ROLE_TITLE_LEAD_MS = 1400;
const ROLE_REVEAL_HOLD_MS = 3000;
const ROLE_REVEAL_FADE_MS = 700;
const FADE_IN_MS = 700;
const TRANSITION_KICKOFF_MS = 30;

export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);
  const [phase, setPhase] = useState<
    'lobby' | 'roleReveal' | 'day' | 'night' | 'vote'
  >('lobby');
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameHostUserId, setGameHostUserId] = useState<string | null>(null);
  const [revealState, setRevealState] = useState<
    'hidden' | 'titlePre' | 'title' | 'rolePre' | 'role' | 'fading'
  >('hidden');

  useEffect(() => {
    if (!lobbyName) return;

    socket.emit('game:init', { lobbyName }, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) {
        console.error(response?.error ?? 'Failed to initialize game');
        return;
      }
      setGameStarted(response.game.started);
      setPhase(response.game.phase);
      setPhaseEndsAt(response.game.phaseEndsAt);
      setRole(response.game.role);
      setGameStarted(response.game.started);
      setGameHostUserId(response.game.hostUserId);
    });
  }, [lobbyName]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const currentPhaseEndsAt = lobbyInfo?.phaseEndsAt ?? phaseEndsAt;
  const hostUserId = lobbyInfo?.hostUserId ?? gameHostUserId;

  useEffect(() => {
    if (started) return;
    if (!lobbyName) return;
    router.push(`/lobby/${encodeURIComponent(lobbyName)}`);
  }, [started, lobbyName, router]);

  useEffect(() => {
    if (currentPhase !== 'roleReveal') {
      const resetId = setTimeout(() => {
        setRevealState('hidden');
      }, 0);
      return () => clearTimeout(resetId);
    }

    const showTitleId = setTimeout(() => {
      setRevealState('titlePre');
    }, 0);
    const showTitleFadeId = setTimeout(() => {
      setRevealState('title');
    }, TRANSITION_KICKOFF_MS);
    const showRoleId = setTimeout(() => {
      setRevealState('rolePre');
    }, ROLE_TITLE_LEAD_MS);
    const showRoleFadeId = setTimeout(() => {
      setRevealState('role');
    }, ROLE_TITLE_LEAD_MS + TRANSITION_KICKOFF_MS);

    const fadeOutDelay = currentPhaseEndsAt
      ? Math.max(0, currentPhaseEndsAt - Date.now() - ROLE_REVEAL_FADE_MS)
      : ROLE_TITLE_LEAD_MS + ROLE_REVEAL_HOLD_MS + FADE_IN_MS;
    const fadeId = setTimeout(() => {
      setRevealState('fading');
    }, fadeOutDelay);

    return () => {
      clearTimeout(showTitleId);
      clearTimeout(showTitleFadeId);
      clearTimeout(showRoleId);
      clearTimeout(showRoleFadeId);
      clearTimeout(fadeId);
    };
  }, [currentPhase, currentPhaseEndsAt]);

  const isHost =
    !!session?.user?.id && !!hostUserId && session.user.id === hostUserId;
  const roleName = role ?? 'Unknown';
  const roleToneClass =
    roleName === 'Werewolf'
      ? 'reveal-role-werewolf'
      : roleName === 'Villager'
        ? 'reveal-role-villager'
        : 'reveal-role-special';
  const endGameButton = isHost ? (
    <button
      type="button"
      className="game-button-secondary max-w-xs mx-auto"
      onClick={() => {
        socket
          .timeout(5000)
          .emit(
            'endGame',
            { lobbyName },
            (err: unknown, res: SocketAck | undefined) => {
              if (err || !res?.ok) {
                console.error(res?.error ?? 'Failed to end game');
              }
            },
          );
      }}
    >
      End Game (Temporary)
    </button>
  ) : null;

  return (
    <>
      {currentPhase === 'roleReveal' ? (
        <RoleRevealScene
          phaseEndsAt={currentPhaseEndsAt}
          revealState={revealState}
          roleName={roleName}
          roleToneClass={roleToneClass}
          endGameButton={endGameButton}
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-xl text-center space-y-6">
            <>
              <h1 className="game-title">Day Phase</h1>
              <p className="text-slate-300 text-sm">
                Lobby: {lobbyName ?? '...'}
              </p>
            </>
            {endGameButton ? <div className="pt-4">{endGameButton}</div> : null}
          </div>
        </div>
      )}
    </>
  );
}
