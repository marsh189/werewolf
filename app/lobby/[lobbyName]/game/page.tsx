'use client';

import { socket } from '@/lib/socket';
import GameNotebook from '@/components/game/GameNotebook';
import PhaseTimer from '@/components/game/PhaseTimer';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import { useLobbyRealtime } from '@/lib/useLobbyRealtime';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

type GameInitResponse = {
  ok: boolean;
  error?: string;
  game?: {
    started: boolean;
    phase:
      | 'lobby'
      | 'roleReveal'
      | 'day'
      | 'night'
      | 'nightResults'
      | 'vote'
      | 'eliminationResults';
    dayNumber: number | null;
    nightNumber: number | null;
    phaseEndsAt: number | null;
    currentNightDeathReveal: {
      userId: string;
      name: string;
      notebook: string;
    } | null;
    currentEliminationResult:
      | {
          userId: string;
          name: string;
          notebook: string;
          voteCount: number;
          noElimination: false;
        }
      | {
          noElimination: true;
        }
      | null;
    role: string | null;
    werewolfUserIds: string[];
    hostUserId: string;
    canWriteNotebook: boolean;
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
const NIGHT_RESULTS_LINE_1_LEAD_MS = 1100;
const NIGHT_RESULTS_LINE_2_LEAD_MS = 2200;
const NIGHT_RESULTS_NOTEBOOK_LEAD_MS = 4200;
const NIGHT_RESULTS_POST_INFO_PAUSE_MS = 3000;
const NIGHT_RESULTS_FADE_MS = 700;
const PHASE_TRANSITION_FADE_MS = 1200;
const NIGHT_RESULTS_LINE_GAP_MS = 700;

export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);
  const [phase, setPhase] = useState<
    | 'lobby'
    | 'roleReveal'
    | 'day'
    | 'night'
    | 'nightResults'
    | 'vote'
    | 'eliminationResults'
  >('lobby');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [nightNumber, setNightNumber] = useState<number | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [currentNightDeathReveal, setCurrentNightDeathReveal] = useState<{
    userId: string;
    name: string;
    notebook: string;
  } | null>(null);
  const [currentEliminationResult, setCurrentEliminationResult] = useState<
    | {
        userId: string;
        name: string;
        notebook: string;
        voteCount: number;
        noElimination: false;
      }
    | {
        noElimination: true;
      }
    | null
  >(null);
  const [viewingNotebook, setViewingNotebook] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameHostUserId, setGameHostUserId] = useState<string | null>(null);
  const [canWriteNotebook, setCanWriteNotebook] = useState<boolean>(true);
  const [werewolfUserIds, setWerewolfUserIds] = useState<string[]>([]);
  const [selectedNightKillTargetId, setSelectedNightKillTargetId] = useState<
    string | null
  >(null);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(
    null,
  );
  const [revealState, setRevealState] = useState<
    'hidden' | 'titlePre' | 'title' | 'rolePre' | 'role' | 'fading'
  >('hidden');
  const [nightResultRevealState, setNightResultRevealState] = useState<
    'hidden' | 'heading' | 'line1' | 'line2' | 'notebook' | 'fading'
  >('hidden');
  const [phaseOverlayState, setPhaseOverlayState] = useState<{
    mode: 'hidden' | 'fadeIn' | 'fadeOut';
    key: number;
  }>({
    mode: 'hidden',
    key: 0,
  });
  const lastNightResultsSequenceRef = useRef<string | null>(null);
  const previousPhaseRef = useRef<typeof currentPhase | null>(null);

  useEffect(() => {
    if (!lobbyName) return;

    socket.emit('game:init', { lobbyName }, (response: GameInitResponse) => {
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
    });
  }, [lobbyName]);

  useEffect(() => {
    if (!lobbyName || !lobbyInfo) return;
    socket.emit('game:init', { lobbyName }, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) return;
      setCanWriteNotebook(response.game.canWriteNotebook);
      setWerewolfUserIds(response.game.werewolfUserIds ?? []);
    });
  }, [lobbyName, lobbyInfo]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const currentDayNumber = lobbyInfo?.dayNumber ?? dayNumber;
  const currentNightNumber = lobbyInfo?.nightNumber ?? nightNumber;
  const currentPhaseEndsAt = lobbyInfo?.phaseEndsAt ?? phaseEndsAt;
  const revealDeath = lobbyInfo?.currentNightDeathReveal ?? currentNightDeathReveal;
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

  useEffect(() => {
    if (currentPhase !== 'nightResults') {
      lastNightResultsSequenceRef.current = null;
      const resetId = setTimeout(() => {
        setNightResultRevealState('hidden');
      }, 0);
      return () => clearTimeout(resetId);
    }

    const scheduleKey = `${nightResultsSequenceKey}-${currentPhaseEndsAt ?? 'pending'}`;
    if (lastNightResultsSequenceRef.current === scheduleKey) {
      return;
    }
    lastNightResultsSequenceRef.current = scheduleKey;

    const resetToHiddenId = setTimeout(() => {
      setNightResultRevealState('hidden');
    }, 0);

    const now = Date.now();
    const safePhaseEndsAt =
      currentPhaseEndsAt ??
      now + NIGHT_RESULTS_NOTEBOOK_LEAD_MS + NIGHT_RESULTS_POST_INFO_PAUSE_MS;
    const transitionLeadMs = Math.max(
      NIGHT_RESULTS_FADE_MS,
      PHASE_TRANSITION_FADE_MS,
    );
    const transitionStartAt = safePhaseEndsAt - transitionLeadMs;
    const notebookAt = revealDeathUserId
      ? transitionStartAt - NIGHT_RESULTS_POST_INFO_PAUSE_MS
      : null;
    const desiredLine2At = now + NIGHT_RESULTS_LINE_2_LEAD_MS;
    const line2At = notebookAt
      ? Math.min(desiredLine2At, notebookAt - NIGHT_RESULTS_LINE_GAP_MS)
      : desiredLine2At;
    const line1At = Math.min(
      now + NIGHT_RESULTS_LINE_1_LEAD_MS,
      line2At - NIGHT_RESULTS_LINE_GAP_MS,
    );
    const headingAt = Math.min(now + TRANSITION_KICKOFF_MS, line1At - 400);

    const headingDelay = Math.max(0, headingAt - now);
    const line1Delay = Math.max(0, line1At - now);
    const line2Delay = Math.max(0, line2At - now);
    const notebookDelay = notebookAt ? Math.max(0, notebookAt - now) : null;

    const showHeadingId = setTimeout(() => {
      setNightResultRevealState('heading');
    }, headingDelay);
    const showLine1Id = setTimeout(() => {
      setNightResultRevealState('line1');
    }, line1Delay);
    const showLine2Id = setTimeout(() => {
      setNightResultRevealState('line2');
    }, line2Delay);
    const showNotebookId = revealDeathUserId && notebookDelay !== null
      ? setTimeout(() => {
          setNightResultRevealState('notebook');
        }, notebookDelay)
      : null;
    const fadeOutDelay = currentPhaseEndsAt
      ? Math.max(0, currentPhaseEndsAt - Date.now() - NIGHT_RESULTS_FADE_MS)
      : NIGHT_RESULTS_LINE_2_LEAD_MS + 1200;
    const fadeId = setTimeout(() => {
      setNightResultRevealState('fading');
    }, fadeOutDelay);

    return () => {
      clearTimeout(resetToHiddenId);
      clearTimeout(showHeadingId);
      clearTimeout(showLine1Id);
      clearTimeout(showLine2Id);
      if (showNotebookId) {
        clearTimeout(showNotebookId);
      }
      clearTimeout(fadeId);
    };
  }, [
    currentPhase,
    currentPhaseEndsAt,
    nightResultsSequenceKey,
    revealDeathUserId,
  ]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = currentPhase;

    const skipFadeIn =
      previousPhase === 'day' &&
      currentPhase === 'vote' &&
      (currentDayNumber ?? 0) > 0;
    if (skipFadeIn) {
      return;
    }

    const startId = setTimeout(() => {
      setPhaseOverlayState((previous) => ({
        mode: 'fadeIn',
        key: previous.key + 1,
      }));
    }, 0);
    const endId = setTimeout(() => {
      setPhaseOverlayState((previous) =>
        previous.mode === 'fadeIn'
          ? { ...previous, mode: 'hidden' }
          : previous,
      );
    }, PHASE_TRANSITION_FADE_MS);

    return () => {
      clearTimeout(startId);
      clearTimeout(endId);
    };
  }, [currentDayNumber, currentPhase]);

  useEffect(() => {
    if (!currentPhaseEndsAt) return;
    const skipFadeOut =
      currentPhase === 'day' && (currentDayNumber ?? 0) > 0;
    if (skipFadeOut) return;

    const delay = Math.max(
      0,
      currentPhaseEndsAt - Date.now() - PHASE_TRANSITION_FADE_MS,
    );
    const startId = setTimeout(() => {
      setPhaseOverlayState((previous) => ({
        mode: 'fadeOut',
        key: previous.key + 1,
      }));
    }, delay);

    return () => clearTimeout(startId);
  }, [currentDayNumber, currentPhase, currentPhaseEndsAt]);

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
      ) : currentPhase === 'nightResults' ? (
        <div className="game-cinematic-scene min-h-screen px-6 py-12 flex items-center justify-center">
          <div
            className={[
              'w-full max-w-3xl space-y-6 text-center transition-opacity duration-700',
              nightResultRevealState === 'fading' ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          >
            <p
              className={[
                'reveal-prefix transition-all duration-700',
                nightResultRevealState === 'heading' ||
                nightResultRevealState === 'line1' ||
                nightResultRevealState === 'line2' ||
                nightResultRevealState === 'notebook' ||
                nightResultRevealState === 'fading'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3',
              ].join(' ')}
            >
              Who Died and How?
            </p>
            <p
              className={[
                'text-4xl md:text-5xl font-black uppercase tracking-[0.04em] transition-all duration-700',
                revealDeath ? 'text-red-300' : 'text-emerald-300',
                nightResultRevealState === 'line1' ||
                nightResultRevealState === 'line2' ||
                nightResultRevealState === 'notebook' ||
                nightResultRevealState === 'fading'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4',
              ].join(' ')}
            >
              {revealDeath
                ? `${revealDeath.name} died last night.`
                : 'No one died last night.'}
            </p>
            <p
              className={[
                'reveal-subtitle transition-all duration-700',
                nightResultRevealState === 'line2' ||
                nightResultRevealState === 'notebook' ||
                nightResultRevealState === 'fading'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3',
              ].join(' ')}
            >
              {revealDeath
                ? 'They were slain under cover of darkness.'
                : 'Dawn breaks in uneasy silence.'}
            </p>
            {revealDeath ? (
              <div
                className={[
                  'mx-auto w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-left text-sm text-slate-200 whitespace-pre-wrap transition-all duration-700',
                  nightResultRevealState === 'notebook'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3',
                ].join(' ')}
              >
                {revealDeath.notebook.trim() || 'No final notes were left behind.'}
              </div>
            ) : null}
            {endGameButton ? <div className="pt-6 max-w-xs mx-auto">{endGameButton}</div> : null}
          </div>
        </div>
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
                <p className="text-slate-300 text-sm">
                  Lobby: {lobbyName ?? '...'}
                </p>
              </>
              <PhaseTimer phaseEndsAt={currentPhaseEndsAt} />
            </div>

            <div className="space-y-3 pt-2">
              {sortedMembers.length ? (
                sortedMembers.map((member) => (
                  (() => {
                    const canKillAtNight =
                      currentPhase === 'night' &&
                      roleName === 'Werewolf' &&
                      selfAlive &&
                      member.alive &&
                      member.userId !== currentUserId;
                    const canViewDeadNotebook =
                      (currentPhase === 'day' || currentPhase === 'night') &&
                      !member.alive;
                    const canVoteNow =
                      currentPhase === 'vote' && selfAlive && member.alive;
                    const isActionable =
                      canKillAtNight || canViewDeadNotebook || canVoteNow;
                    const isSelectedTarget =
                      (currentPhase === 'night' &&
                        selectedNightKillTargetId === member.userId) ||
                      (currentPhase === 'vote' &&
                        selectedVoteTargetId === member.userId);

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
                            socket.emit('game:nightKill', {
                              lobbyName,
                              targetUserId: member.userId,
                            });
                            return;
                          }

                          if (canViewDeadNotebook) {
                            socket.emit(
                              'game:getNotebook',
                              {
                                lobbyName,
                                targetUserId: member.userId,
                              },
                              (response: {
                                ok: boolean;
                                notebook?: { name: string; content: string };
                              }) => {
                                if (!response?.ok || !response.notebook) return;
                                setViewingNotebook({
                                  name: response.notebook.name,
                                  content: response.notebook.content ?? '',
                                });
                              },
                            );
                            return;
                          }

                          if (canVoteNow) {
                            setSelectedVoteTargetId(member.userId);
                            socket.emit('game:castVote', {
                              lobbyName,
                              targetUserId: member.userId,
                            });
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
                  })()
                ))
              ) : (
                <div className="game-box">
                  <span className="text-slate-300 text-sm">
                    No players found.
                  </span>
                </div>
              )}
            </div>
            {currentPhase === 'eliminationResults' ? (
              <div
                key={eliminationResultsKey}
                className="game-box result-scene-card flex-col items-start gap-3 text-left"
              >
                {eliminationResult?.noElimination === true
                  ? (
                    <p className="result-line-1 text-slate-200 font-semibold">
                      No player was eliminated today.
                    </p>
                    )
                  : eliminationResult
                    ? (
                      <>
                        <p className="result-line-1 text-red-200 font-semibold">
                          {eliminationResult.name} was executed by the town ({eliminationResult.voteCount} votes).
                        </p>
                        <p className="result-line-2 text-slate-300 text-sm">
                          {eliminationResult.notebook.trim()
                            ? 'We found a will next to their body.'
                            : 'We could not find a last will.'}
                        </p>
                        <div className="result-line-3 w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                          {eliminationResult.notebook.trim() || 'No final notes were left behind.'}
                        </div>
                      </>
                      )
                    : (
                      <p className="result-line-1 text-slate-200 font-semibold">
                        Awaiting verdict...
                      </p>
                      )}
              </div>
            ) : null}
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
            socket.emit('game:updateNotebook', { lobbyName, notes });
          }}
        />
      ) : null}
      {viewingNotebook ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="text-slate-100 font-semibold">
                {viewingNotebook.name}&apos;s Notebook
              </h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
                aria-label="Close notebook"
                onClick={() => setViewingNotebook(null)}
              >
                X
              </button>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {viewingNotebook.content.trim() || 'No notes were found.'}
            </div>
          </div>
        </div>
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
