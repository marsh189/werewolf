'use client';

import GameNotebook from '@/components/game/GameNotebook';
import EliminationResultsCard from '@/components/game/EliminationResultsCard';
import EndGameScene from '@/components/game/EndGameScene';
import GameChat from '@/components/game/GameChat';
import MemberActionRow from '@/components/game/MemberActionRow';
import NightResultsScene from '@/components/game/NightResultsScene';
import NotebookModal from '@/components/game/NotebookModal';
import PhaseTimer from '@/components/game/PhaseTimer';
import PlayerList from '@/components/game/PlayerList';
import RoleInfoPopover from '@/components/game/RoleInfoPopover';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import {
  endGame,
  initGame,
  toggleTrapperAlert,
  updateNotebook,
} from '@/lib/gameSocketActions';
import { useGamePhaseAnimation } from '@/lib/useGamePhaseAnimation';
import { useLobbyRealtime } from '@/lib/useLobbyRealtime';
import { socket } from '@/lib/socket';
import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { NightInstructionContext, Role } from '@/models/roles';
import type {
  GameInitResponse,
  GamePhase,
  NotebookView,
  SocketAck,
} from '@/models/game';
import type { EliminationResult } from '@/models/lobby';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type GameSnapshot = NonNullable<GameInitResponse['game']>;

const getSelectedNightTargetFromSnapshot = (game: GameSnapshot) => {
  switch (game.role) {
    case 'AlphaWolf':
    case 'Werewolf':
    case 'Hunter':
      return game.nightKillTargetUserId ?? null;
    case 'Escort':
      return game.escortVisitTargetUserId ?? null;
    case 'Bodyguard':
      return game.bodyguardGuardTargetUserId ?? null;
    case 'Doctor':
      return game.doctorProtectTargetUserId ?? null;
    case 'Tracker':
      return game.trackerWatchTargetUserId ?? null;
    case 'Lookout':
      return game.lookoutWatchTargetUserId ?? null;
    case 'Investigator':
      return game.investigatorVisitTargetUserId ?? null;
    case 'Framer':
      return game.framerTargetUserId ?? null;
    case 'Prowler':
      return game.prowlerTargetUserId ?? null;
    case 'Snatcher':
      return game.snatcherTargetUserId ?? null;
    case 'Cursed':
      return game.cursedTargetUserId ?? null;
    case 'Mimic':
      return game.mimicTargetUserId ?? null;
    default:
      return null;
  }
};

export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const lobbyNameString = typeof lobbyName === 'string' ? lobbyName : undefined;
  const { lobbyInfo } = useLobbyRealtime(lobbyName);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const navigatedToResultsRef = useRef(false);

  useEffect(() => {
    if (!lobbyName || typeof lobbyName !== 'string') return;
    if (!socket.connected) socket.connect();
    // Server-side presence and view tracking.
    socket.emit('presence:setView', { lobbyName, view: 'game' });
  }, [lobbyName]);

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
  const [viewingNotebook, setViewingNotebook] = useState<NotebookView | null>(
    null,
  );
  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameHostUserId, setGameHostUserId] = useState<string | null>(null);
  const [canWriteNotebook, setCanWriteNotebook] = useState<boolean>(true);
  const [werewolfUserIds, setWerewolfUserIds] = useState<string[]>([]);
  const [hunterShotsRemaining, setHunterShotsRemaining] = useState<number>(0);
  const [trapperAlertsRemaining, setTrapperAlertsRemaining] =
    useState<number>(0);
  const [trapperAlertActive, setTrapperAlertActive] = useState<boolean>(false);
  const [doctorSelfProtectUsed, setDoctorSelfProtectUsed] =
    useState<boolean>(false);
  const [executionerTargetName, setExecutionerTargetName] = useState<
    string | null
  >(null);
  const [executionerTargetUserId, setExecutionerTargetUserId] = useState<
    string | null
  >(null);
  const [selectedNightActionTargetId, setSelectedNightActionTargetId] =
    useState<string | null>(null);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<
    string | null
  >(null);

  // Apply a server-provided snapshot (via `game:init`) into local UI state.
  // This is used on first load and again when lobby realtime state changes to keep the UI resilient to refreshes.
  const applyCommonSnapshot = useCallback((game: GameSnapshot) => {
    setRole(game.role);
    setCanWriteNotebook(game.canWriteNotebook);
    setWerewolfUserIds(game.werewolfUserIds ?? []);
    setHunterShotsRemaining(game.hunterShotsRemaining ?? 0);
    setTrapperAlertsRemaining(game.trapperAlertsRemaining ?? 0);
    setTrapperAlertActive(game.trapperAlertActive ?? false);
    setDoctorSelfProtectUsed(game.doctorSelfProtectUsed ?? false);
    setSelectedNightActionTargetId(getSelectedNightTargetFromSnapshot(game));
    setExecutionerTargetName(game.executionerTargetName ?? null);
    setExecutionerTargetUserId(game.executionerTargetUserId ?? null);
    setGameHostUserId(game.hostUserId);
  }, []);

  const applyFullSnapshot = useCallback((game: GameSnapshot) => {
    setGameStarted(game.started);
    setPhase(game.phase);
    setDayNumber(game.dayNumber);
    setNightNumber(game.nightNumber);
    setPhaseEndsAt(game.phaseEndsAt);
    setCurrentNightDeathReveal(game.currentNightDeathReveal ?? null);
    setCurrentEliminationResult(game.currentEliminationResult ?? null);
    applyCommonSnapshot(game);
  }, [applyCommonSnapshot]);

  useEffect(() => {
    if (!lobbyNameString) return;

    initGame(lobbyNameString, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) {
        console.error(response?.error ?? 'Failed to initialize game');
        return;
      }
      applyFullSnapshot(response.game);
    });
  }, [applyFullSnapshot, lobbyNameString]);

  useEffect(() => {
    if (!lobbyNameString || !lobbyInfo) return;
    initGame(lobbyNameString, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) return;
      applyCommonSnapshot(response.game);
    });
  }, [applyCommonSnapshot, lobbyNameString, lobbyInfo]);

  useEffect(() => {
    if (!lobbyNameString) return;
    if (lobbyInfo?.gamePhase !== 'gameResults') return;
    if (navigatedToResultsRef.current) return;
    navigatedToResultsRef.current = true;

    // Give the results overlay time to fade out before route transition.
    const id = setTimeout(() => {
      router.replace(`/lobby/${encodeURIComponent(lobbyNameString)}/results`);
    }, 900);
    return () => clearTimeout(id);
  }, [lobbyInfo?.gamePhase, lobbyNameString, router]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  // "nightActionResults" is presented as night, but player actions are still gated by `currentPhase === 'night'`.
  const effectiveDisplayPhase =
    currentPhase === 'nightActionResults' ? 'night' : currentPhase;
  const currentDayNumber = lobbyInfo?.dayNumber ?? dayNumber;
  const currentNightNumber = lobbyInfo?.nightNumber ?? nightNumber;
  const currentPhaseEndsAt = lobbyInfo?.phaseEndsAt ?? phaseEndsAt;
  const revealDeath =
    lobbyInfo?.currentNightDeathReveal ?? currentNightDeathReveal;
  const revealDeathUserId = revealDeath?.userId ?? null;
  // Used to restart the animated night-results sequence when the revealed death changes.
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
  const startingRemainingSeconds =
    lobbyInfo?.startingAt && nowMs !== null
      ? Math.max(0, Math.ceil((lobbyInfo.startingAt - nowMs) / 1000))
      : null;

  // Drives cinematic fades + role/night reveal animations based on the authoritative phase timers.
  const { revealState, nightResultRevealState, phaseOverlayState } =
    useGamePhaseAnimation({
      currentPhase,
      currentPhaseEndsAt,
      currentDayNumber,
      nightResultsSequenceKey,
      revealDeathUserId,
    });

  const isDayCyclePhase =
    effectiveDisplayPhase === 'day' ||
    effectiveDisplayPhase === 'vote' ||
    effectiveDisplayPhase === 'eliminationResults';
  const isNightCyclePhase = effectiveDisplayPhase === 'night';
  const roleName = role ?? 'Unknown';
  const roleInfo = role && role in ROLES ? ROLES[role as Role] : null;
  const roleDisplayName = getRoleDisplayName(roleName);
  const didWin = roleInfo ? roleInfo.faction === 'Village' : null;
  const phaseSubLabel =
    effectiveDisplayPhase === 'day'
      ? 'The village gathers by torchlight.'
      : effectiveDisplayPhase === 'vote'
        ? 'Whispers turn to accusations.'
        : effectiveDisplayPhase === 'eliminationResults'
          ? 'The village passes judgment.'
          : effectiveDisplayPhase === 'night'
            ? 'Shadows deepen and choices are made in secret.'
            : null;

  const nightInstruction = (() => {
    if (!selfAlive) return 'You are dead. You cannot act, but you can observe.';

    const nightInstructionContext: NightInstructionContext = {
      hunterShotsRemaining,
      trapperAlertsRemaining,
      trapperAlertActive,
    };

    if (typeof roleInfo?.nightInstruction === 'function') {
      return roleInfo.nightInstruction(nightInstructionContext);
    }

    return roleInfo?.nightInstruction ?? 'You have no night action tonight.';
  })();
  const phaseSubInstruction =
    effectiveDisplayPhase === 'day'
      ? (currentDayNumber ?? 0) === 0
        ? 'Steel your nerves. The first night is coming.'
        : 'Discuss what happened last night and share suspicions.'
      : effectiveDisplayPhase === 'vote'
        ? 'Cast your vote for the player you believe is a werewolf.'
        : effectiveDisplayPhase === 'eliminationResults'
          ? 'Review the outcome and prepare for the coming night.'
          : effectiveDisplayPhase === 'night'
            ? nightInstruction
            : null;
  const eliminationResultsKey =
    eliminationResult?.noElimination === true
      ? `elim-result-none-${currentDayNumber ?? 0}`
      : eliminationResult && 'userId' in eliminationResult
        ? `elim-result-${eliminationResult.userId}`
        : `elim-result-waiting-${currentDayNumber ?? 0}`;

  useEffect(() => {
    if (effectiveDisplayPhase === 'day' || effectiveDisplayPhase === 'night')
      return;
    const id = setTimeout(() => {
      setViewingNotebook(null);
    }, 0);
    return () => clearTimeout(id);
  }, [effectiveDisplayPhase]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (currentPhase !== 'vote') setSelectedVoteTargetId(null);
      if (effectiveDisplayPhase !== 'night') setSelectedNightActionTargetId(null);
    }, 0);
    return () => clearTimeout(id);
  }, [currentPhase, effectiveDisplayPhase]);

  useEffect(() => {
    if (started) return;
    if (!lobbyNameString) return;
    if (lobbyInfo?.startingAt) return;
    router.push(`/lobby/${encodeURIComponent(lobbyNameString)}`);
  }, [lobbyInfo?.startingAt, started, lobbyNameString, router]);

  useEffect(() => {
    if (!lobbyInfo?.startingAt) return;
    // Local clock tick for displaying "Starting in N seconds" without relying on server pushes.
    const kickoffId = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => {
      clearTimeout(kickoffId);
      clearInterval(id);
    };
  }, [lobbyInfo?.startingAt]);

  const isHost =
    !!session?.user?.id && !!hostUserId && session.user.id === hostUserId;
  // Forces `GameChat` to refresh when phase/role/alive status changes (and thus the user's chat audience changes).
  const chatRefreshKey = `${currentPhase}:${roleName}:${selfAlive ? 'alive' : 'dead'}:${started ? 'started' : 'stopped'}`;
  const roleToneClass =
    roleInfo?.faction === 'Enemy'
      ? 'reveal-role-werewolf'
      : roleName === 'Villager'
        ? 'reveal-role-villager'
        : 'reveal-role-special';
  const endGameButton = isHost ? (
    <button
      type="button"
      className="game-button-secondary max-w-xs mx-auto"
      onClick={() => {
        if (!lobbyNameString) return;
        endGame(lobbyNameString, (err: unknown, res: SocketAck | undefined) => {
          if (err || !res?.ok) {
            console.error(res?.error ?? 'Failed to end game');
          }
        });
      }}
    >
      End Game (Temporary)
    </button>
  ) : null;

  return (
    <>
      {currentPhase === 'lobby' && lobbyInfo?.startingAt ? (
        <div className="game-cinematic-scene min-h-[100svh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
          <div className="w-full max-w-3xl text-center space-y-4">
            <p className="game-tight-label">Starting</p>
            <h1 className="game-title">Game begins soon</h1>
            <p className="text-slate-300 text-sm">
              {startingRemainingSeconds !== null
                ? `Starting in ${startingRemainingSeconds}s...`
                : 'Preparing the lobby...'}
            </p>
          </div>
        </div>
      ) : currentPhase === 'roleReveal' ? (
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
      ) : currentPhase === 'endGame' ? (
        <EndGameScene
          phaseEndsAt={currentPhaseEndsAt}
          didWin={didWin}
          endGameButton={endGameButton}
        />
      ) : currentPhase === 'gameResults' ? (
        <div className="game-cinematic-scene min-h-[100svh]" />
      ) : (
        <div
          className={[
            'min-h-[100svh] px-4 sm:px-6 py-6 sm:py-12 pb-80',
            isNightCyclePhase ? 'game-cinematic-scene' : '',
          ].join(' ')}
        >
          <header className="mx-auto w-full max-w-3xl mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-left">
              <p className="game-tight-label">Lobby</p>
              <h1 className="game-title text-left leading-tight">
                {lobbyNameString ?? '...'}
              </h1>
            </div>
            <div className="game-box w-full sm:w-auto shrink-0 text-left sm:text-right sm:min-w-[11rem]">
              <p className="game-tight-label">Role</p>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <p className="font-semibold text-slate-100">
                  {roleDisplayName}
                </p>
                <RoleInfoPopover
                  roleDisplayName={roleDisplayName}
                  roleName={roleName}
                  roleInfo={roleInfo}
                  hunterShotsRemaining={hunterShotsRemaining}
                  trapperAlertsRemaining={trapperAlertsRemaining}
                  executionerTargetName={executionerTargetName}
                  executionerTargetUserId={executionerTargetUserId}
                />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-3xl text-center space-y-6">
            <div className="space-y-6">
              <>
                <h1 className="game-title">
                  {isDayCyclePhase
                    ? `Day ${currentDayNumber ?? 0}`
                    : isNightCyclePhase
                      ? `Night ${currentNightNumber ?? 1}`
                      : 'Game'}
                </h1>
                {phaseSubLabel ? (
                  <p className="text-slate-300/90 text-xs uppercase tracking-[0.2em]">
                    {phaseSubLabel}
                  </p>
                ) : null}
                {phaseSubInstruction ? (
                  <p className="text-slate-300 text-sm">
                    {phaseSubInstruction}
                  </p>
                ) : null}
              </>
              <div className="flex flex-col items-center gap-3">
                <PhaseTimer phaseEndsAt={currentPhaseEndsAt} />
                {effectiveDisplayPhase === 'night' &&
                roleName === 'Trapper' &&
                selfAlive ? (
                  <button
                    type="button"
                    className={[
                      'game-button-secondary max-w-xs mx-auto',
                      trapperAlertActive
                        ? 'game-button-alert-active'
                        : trapperAlertsRemaining > 0
                          ? 'game-button-alert-ready'
                          : '',
                      'disabled:cursor-not-allowed disabled:opacity-100',
                    ].join(' ')}
                    disabled={
                      currentPhase !== 'night' ||
                      (!trapperAlertActive && trapperAlertsRemaining <= 0)
                    }
                    onClick={() => {
                      if (!lobbyNameString || currentPhase !== 'night') return;
                      toggleTrapperAlert(lobbyNameString);
                    }}
                  >
                    {trapperAlertActive ? (
                      <span className="flex flex-col items-center justify-center leading-tight">
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                          </span>
                          Alert Active
                        </span>
                        <span className="mt-1 text-[11px] font-semibold text-emerald-100/90">
                          Click to deactivate
                        </span>
                      </span>
                    ) : trapperAlertsRemaining <= 0 ? (
                      <span className="flex flex-col items-center justify-center leading-tight">
                        <span>No Alerts Remaining</span>
                      </span>
                    ) : (
                      <span className="flex flex-col items-center justify-center leading-tight">
                        <span>Activate Alert</span>
                        <span className="mt-1 text-[11px] font-semibold text-emerald-100/90">
                          {trapperAlertsRemaining} left
                        </span>
                      </span>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <PlayerList
              members={sortedMembers}
              renderMemberRow={(member) => (
                <MemberActionRow
                  key={member.userId}
                  lobbyName={lobbyNameString}
                  member={member}
                  currentPhase={currentPhase}
                  effectiveDisplayPhase={effectiveDisplayPhase}
                  roleName={roleName}
                  selfAlive={selfAlive}
                  currentUserId={session?.user?.id}
                  werewolfUserIds={werewolfUserIds}
                  hunterShotsRemaining={hunterShotsRemaining}
                  doctorSelfProtectUsed={doctorSelfProtectUsed}
                  executionerTargetUserId={executionerTargetUserId}
                  selectedNightActionTargetId={selectedNightActionTargetId}
                  setSelectedNightActionTargetId={setSelectedNightActionTargetId}
                  selectedVoteTargetId={selectedVoteTargetId}
                  setSelectedVoteTargetId={setSelectedVoteTargetId}
                  setViewingNotebook={setViewingNotebook}
                />
              )}
            />
            <EliminationResultsCard
              currentPhase={currentPhase}
              eliminationResultsKey={eliminationResultsKey}
              eliminationResult={eliminationResult}
            />
            {endGameButton ? <div className="pt-4">{endGameButton}</div> : null}
          </div>
        </div>
      )}
      {currentPhase !== 'nightResults' &&
      currentPhase !== 'endGame' &&
      currentPhase !== 'gameResults' ? (
        <GameChat
          lobbyName={lobbyNameString}
          refreshKey={chatRefreshKey}
          currentUserId={session?.user?.id}
        />
      ) : null}
      {currentPhase !== 'roleReveal' &&
      currentPhase !== 'endGame' &&
      currentPhase !== 'gameResults' ? (
        <GameNotebook
          lobbyName={lobbyNameString}
          userId={session?.user?.id}
          canWrite={canWriteNotebook}
          onNotesChange={(notes) => {
            if (!lobbyNameString) return;
            updateNotebook(lobbyNameString, notes);
          }}
        />
      ) : null}
      {viewingNotebook ? (
        <NotebookModal
          notebook={viewingNotebook}
          onClose={() => setViewingNotebook(null)}
        />
      ) : null}
      <div
        key={phaseOverlayState.key}
        className={[
          'game-phase-overlay z-40',
          phaseOverlayState.mode === 'fadeIn'
            ? 'phase-overlay-fade-in'
            : phaseOverlayState.mode === 'fadeOut'
              ? 'phase-overlay-fade-out'
              : 'opacity-0',
        ].join(' ')}
      />
      {currentPhase === 'gameResults' ? (
        <div
          key="results-route-fadeout"
          className="game-phase-overlay z-50 phase-overlay-fade-out"
        />
      ) : null}
    </>
  );
}
