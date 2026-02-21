'use client';

import GameNotebook from '@/components/game/GameNotebook';
import EliminationResultsCard from '@/components/game/EliminationResultsCard';
import NightResultsScene from '@/components/game/NightResultsScene';
import NotebookModal from '@/components/game/NotebookModal';
import PhaseTimer from '@/components/game/PhaseTimer';
import PlayerList from '@/components/game/PlayerList';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import {
  castVote,
  endGame,
  getNotebook,
  initGame,
  nightKill,
  toggleTrapperAlert,
  updateNotebook,
} from '@/lib/gameSocketActions';
import { useGamePhaseAnimation } from '@/lib/useGamePhaseAnimation';
import { useLobbyRealtime } from '@/lib/useLobbyRealtime';
import type {
  GameInitResponse,
  GamePhase,
  NotebookView,
  SocketAck,
} from '@/models/game';
import type { EliminationResult, LobbyMember } from '@/models/lobby';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [nightNumber, setNightNumber] = useState<number | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [currentNightDeathReveal, setCurrentNightDeathReveal] = useState<{
    userId: string;
    name: string;
    notebook: string;
  } | null>(null);
  const [currentEliminationResult, setCurrentEliminationResult] =
    useState<EliminationResult | null>(null);
  const [viewingNotebook, setViewingNotebook] = useState<NotebookView | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameHostUserId, setGameHostUserId] = useState<string | null>(null);
  const [canWriteNotebook, setCanWriteNotebook] = useState<boolean>(true);
  const [werewolfUserIds, setWerewolfUserIds] = useState<string[]>([]);
  const [hunterShotsRemaining, setHunterShotsRemaining] = useState<number>(0);
  const [trapperAlertsRemaining, setTrapperAlertsRemaining] = useState<number>(0);
  const [trapperAlertActive, setTrapperAlertActive] = useState<boolean>(false);
  const [selectedNightKillTargetId, setSelectedNightKillTargetId] = useState<
    string | null
  >(null);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!lobbyName) return;

    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) {
        console.error(response?.error ?? 'Failed to initialize game');
        return;
      }
      setGameStarted(response.game.started);
      setPhase(response.game.phase);
      setDayNumber(response.game.dayNumber);
      setNightNumber(response.game.nightNumber);
      setPhaseEndsAt(response.game.phaseEndsAt);
      setCurrentNightDeathReveal(response.game.currentNightDeathReveal ?? null);
      setCurrentEliminationResult(response.game.currentEliminationResult ?? null);
      setRole(response.game.role);
      setWerewolfUserIds(response.game.werewolfUserIds ?? []);
      setGameHostUserId(response.game.hostUserId);
      setCanWriteNotebook(response.game.canWriteNotebook);
      setHunterShotsRemaining(response.game.hunterShotsRemaining ?? 0);
      setTrapperAlertsRemaining(response.game.trapperAlertsRemaining ?? 0);
      setTrapperAlertActive(response.game.trapperAlertActive ?? false);
    });
  }, [lobbyName]);

  useEffect(() => {
    if (!lobbyName || !lobbyInfo) return;
    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) return;
      setCanWriteNotebook(response.game.canWriteNotebook);
      setWerewolfUserIds(response.game.werewolfUserIds ?? []);
      setHunterShotsRemaining(response.game.hunterShotsRemaining ?? 0);
      setTrapperAlertsRemaining(response.game.trapperAlertsRemaining ?? 0);
      setTrapperAlertActive(response.game.trapperAlertActive ?? false);
    });
  }, [lobbyName, lobbyInfo]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const currentDayNumber = lobbyInfo?.dayNumber ?? dayNumber;
  const currentNightNumber = lobbyInfo?.nightNumber ?? nightNumber;
  const currentPhaseEndsAt = lobbyInfo?.phaseEndsAt ?? phaseEndsAt;
  const revealDeath =
    lobbyInfo?.currentNightDeathReveal ?? currentNightDeathReveal;
  const revealDeathUserId = revealDeath?.userId ?? null;
  const nightResultsSequenceKey = revealDeathUserId
    ? `death-${revealDeathUserId}`
    : `none-${currentNightNumber ?? 0}`;
  const eliminationResult =
    lobbyInfo?.currentEliminationResult ?? currentEliminationResult;
  const hostUserId = lobbyInfo?.hostUserId ?? gameHostUserId;
  const currentUserId = session?.user?.id;
  const selfMember = (lobbyInfo?.members ?? []).find(
    (member) => member.userId === currentUserId,
  );
  const sortedMembers = (lobbyInfo?.members ?? [])
    .map((member, index) => ({ member, index }))
    .sort((a, b) => {
      if (a.member.alive === b.member.alive) return a.index - b.index;
      return a.member.alive ? -1 : 1;
    })
    .map(({ member }) => member);
  const selfAlive = selfMember?.alive ?? true;

  const { revealState, nightResultRevealState, phaseOverlayState } =
    useGamePhaseAnimation({
      currentPhase,
      currentPhaseEndsAt,
      currentDayNumber,
      nightResultsSequenceKey,
      revealDeathUserId,
    });

  const isDayCyclePhase =
    currentPhase === 'day' ||
    currentPhase === 'vote' ||
    currentPhase === 'eliminationResults';
  const daySubPhaseLabel =
    currentPhase === 'day'
      ? 'The village gathers by torchlight.'
      : currentPhase === 'vote'
        ? 'Whispers turn to accusations.'
        : currentPhase === 'eliminationResults'
          ? 'The village passes judgment.'
          : null;
  const daySubPhaseInstruction =
    currentPhase === 'day'
      ? (currentDayNumber ?? 0) === 0
        ? 'Steel your nerves. The first night is coming.'
        : 'Discuss what happened last night and share suspicions.'
      : currentPhase === 'vote'
        ? 'Cast your vote for the player you believe is a werewolf.'
        : currentPhase === 'eliminationResults'
          ? 'Review the outcome and prepare for the coming night.'
          : null;
  const eliminationResultsKey =
    eliminationResult?.noElimination === true
      ? `elim-result-none-${currentDayNumber ?? 0}`
      : eliminationResult && 'userId' in eliminationResult
        ? `elim-result-${eliminationResult.userId}`
        : `elim-result-waiting-${currentDayNumber ?? 0}`;

  useEffect(() => {
    if (currentPhase === 'day' || currentPhase === 'night') return;
    const id = setTimeout(() => {
      setViewingNotebook(null);
    }, 0);
    return () => clearTimeout(id);
  }, [currentPhase]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (currentPhase !== 'vote') {
        setSelectedVoteTargetId(null);
      }
      if (currentPhase !== 'night') {
        setSelectedNightKillTargetId(null);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [currentPhase]);

  useEffect(() => {
    if (started) return;
    if (!lobbyName) return;
    router.push(`/lobby/${encodeURIComponent(lobbyName)}`);
  }, [started, lobbyName, router]);

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
        if (!lobbyName) return;
        endGame(lobbyName, (err: unknown, res: SocketAck | undefined) => {
          if (err || !res?.ok) {
            console.error(res?.error ?? 'Failed to end game');
          }
        });
      }}
    >
      End Game (Temporary)
    </button>
  ) : null;

  const renderMemberRow = (member: LobbyMember) => {
    const canKillAtNight =
      currentPhase === 'night' &&
      (roleName === 'Werewolf' || (roleName === 'Hunter' && hunterShotsRemaining > 0)) &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canViewDeadNotebook =
      (currentPhase === 'day' || currentPhase === 'night') && !member.alive;
    const canVoteNow = currentPhase === 'vote' && selfAlive && member.alive;
    const isActionable = canKillAtNight || canViewDeadNotebook || canVoteNow;
    const isSelectedTarget =
      (currentPhase === 'night' &&
        selectedNightKillTargetId === member.userId) ||
      (currentPhase === 'vote' && selectedVoteTargetId === member.userId);

    return (
      <button
        key={member.userId}
        type="button"
        disabled={!isActionable}
        aria-label={
          isActionable
            ? `${member.name} is selectable`
            : `${member.name} is not selectable right now`
        }
        className={[
          'game-box w-full text-left transition-all duration-150',
          isSelectedTarget
            ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_0_1px_rgba(251,191,36,0.6)]'
            : '',
          isActionable
            ? 'cursor-pointer border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400/70 hover:translate-y-[-1px]'
            : 'opacity-50 cursor-not-allowed border-slate-700/50 bg-slate-900/40',
        ].join(' ')}
        onClick={() => {
          if (!lobbyName || typeof lobbyName !== 'string') return;

          if (canKillAtNight) {
            setSelectedNightKillTargetId(member.userId);
            nightKill(lobbyName, member.userId);
            return;
          }

          if (canViewDeadNotebook) {
            getNotebook(lobbyName, member.userId, (response) => {
              if (!response?.ok || !response.notebook) return;
              setViewingNotebook({
                name: response.notebook.name,
                content: response.notebook.content ?? '',
              });
            });
            return;
          }

          if (canVoteNow) {
            setSelectedVoteTargetId((previous) =>
              previous === member.userId ? null : member.userId,
            );
            castVote(lobbyName, member.userId);
          }
        }}
      >
        <span className="flex items-center gap-3">
          <span
            className={[
              'font-semibold',
              werewolfUserIds.includes(member.userId)
                ? 'text-red-300'
                : 'text-white',
            ].join(' ')}
          >
            {member.name}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center justify-center h-7 w-7 rounded-full border',
              member.alive
                ? 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10'
                : 'text-red-200 border-red-500/40 bg-red-500/10',
            ].join(' ')}
            role="img"
            aria-label={member.alive ? 'Alive' : 'Dead'}
            title={member.alive ? 'Alive' : 'Dead'}
          >
            {member.alive ? '●' : '☠'}
          </span>
          {isSelectedTarget ? (
            <span
              className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-amber-400/70 bg-amber-500/15 text-amber-200"
              aria-label="Selected target"
              title="Selected target"
            >
              ✓
            </span>
          ) : null}
        </span>
      </button>
    );
  };

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
      ) : currentPhase === 'nightResults' ? (
        <NightResultsScene
          revealState={nightResultRevealState}
          revealDeath={revealDeath}
          endGameButton={endGameButton}
        />
      ) : (
        <div
          className={[
            'min-h-screen px-6 py-12',
            currentPhase === 'night' ? 'game-cinematic-scene' : '',
          ].join(' ')}
        >
          <div className="mx-auto w-full max-w-3xl text-center space-y-6">
            <div className="space-y-6">
              <>
                <h1 className="game-title">
                  {isDayCyclePhase
                    ? `Day ${currentDayNumber ?? 0}`
                    : currentPhase === 'night'
                      ? `Night ${currentNightNumber ?? 1}`
                      : 'Game'}
                </h1>
                {daySubPhaseLabel ? (
                  <p className="text-slate-300/90 text-xs uppercase tracking-[0.2em]">
                    {daySubPhaseLabel}
                  </p>
                ) : null}
                {daySubPhaseInstruction ? (
                  <p className="text-slate-300 text-sm">
                    {daySubPhaseInstruction}
                  </p>
                ) : null}
                {roleName === 'Hunter' ? (
                  <p className="text-slate-300 text-xs">
                    Hunter shots remaining: {hunterShotsRemaining}
                  </p>
                ) : null}
                {roleName === 'Trapper' ? (
                  <p className="text-slate-300 text-xs">
                    Trapper alerts remaining: {trapperAlertsRemaining}
                  </p>
                ) : null}
                <p className="text-slate-300 text-sm">
                  Lobby: {lobbyName ?? '...'}
                </p>
              </>
              <PhaseTimer phaseEndsAt={currentPhaseEndsAt} />
              {currentPhase === 'night' &&
              roleName === 'Trapper' &&
              selfAlive ? (
                <button
                  type="button"
                  className="game-button-secondary max-w-xs mx-auto"
                  disabled={trapperAlertActive || trapperAlertsRemaining <= 0}
                  onClick={() => {
                    if (!lobbyName) return;
                    toggleTrapperAlert(lobbyName);
                  }}
                >
                  {trapperAlertActive
                    ? 'Alert Active'
                    : trapperAlertsRemaining <= 0
                      ? 'No Alerts Remaining'
                      : 'Activate Alert'}
                </button>
              ) : null}
            </div>

            <PlayerList members={sortedMembers} renderMemberRow={renderMemberRow} />
            <EliminationResultsCard
              currentPhase={currentPhase}
              eliminationResultsKey={eliminationResultsKey}
              eliminationResult={eliminationResult}
            />
            {endGameButton ? <div className="pt-4">{endGameButton}</div> : null}
          </div>
        </div>
      )}
      {currentPhase !== 'roleReveal' ? (
        <GameNotebook
          lobbyName={typeof lobbyName === 'string' ? lobbyName : undefined}
          userId={session?.user?.id}
          canWrite={canWriteNotebook}
          onNotesChange={(notes) => {
            if (!lobbyName) return;
            updateNotebook(lobbyName, notes);
          }}
        />
      ) : null}
      {viewingNotebook ? (
        <NotebookModal notebook={viewingNotebook} onClose={() => setViewingNotebook(null)} />
      ) : null}
      <div
        key={phaseOverlayState.key}
        className={[
          'pointer-events-none fixed inset-0 z-40 bg-black',
          phaseOverlayState.mode === 'fadeIn'
            ? 'phase-overlay-fade-in'
            : phaseOverlayState.mode === 'fadeOut'
              ? 'phase-overlay-fade-out'
              : 'opacity-0',
        ].join(' ')}
      />
    </>
  );
}
