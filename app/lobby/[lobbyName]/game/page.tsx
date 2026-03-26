'use client';

import GameNotebook from '@/components/game/GameNotebook';
import EliminationResultsCard from '@/components/game/EliminationResultsCard';
import EndGameScene from '@/components/game/EndGameScene';
import GameChat from '@/components/game/GameChat';
import NightResultsScene from '@/components/game/NightResultsScene';
import NotebookModal from '@/components/game/NotebookModal';
import PhaseTimer from '@/components/game/PhaseTimer';
import PlayerList from '@/components/game/PlayerList';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import {
  bodyguardGuard,
  castVote,
  curse,
  doctorProtect,
  endGame,
  escortVisit,
  frame,
  getNotebook,
  initGame,
  investigate,
  lookoutWatch,
  nightKill,
  mimic,
  prowl,
  snatch,
  trackerWatch,
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
import type { EliminationResult, LobbyMember } from '@/models/lobby';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const { lobbyInfo } = useLobbyRealtime(lobbyName);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const navigatedToResultsRef = useRef(false);

  useEffect(() => {
    if (!lobbyName || typeof lobbyName !== 'string') return;
    if (!socket.connected) socket.connect();
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
  const [roleInfoPinnedOpen, setRoleInfoPinnedOpen] = useState(false);
  const [roleInfoHovered, setRoleInfoHovered] = useState(false);

  useEffect(() => {
    if (!lobbyName) return;

    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) {
        console.error(response?.error ?? 'Failed to initialize game');
        return;
      }
      const game = response.game;
      setGameStarted(game.started);
      setPhase(game.phase);
      setDayNumber(game.dayNumber);
      setNightNumber(game.nightNumber);
      setPhaseEndsAt(game.phaseEndsAt);
      setCurrentNightDeathReveal(game.currentNightDeathReveal ?? null);
      setCurrentEliminationResult(game.currentEliminationResult ?? null);
      setRole(game.role);
      setWerewolfUserIds(game.werewolfUserIds ?? []);
      setGameHostUserId(game.hostUserId);
      setCanWriteNotebook(game.canWriteNotebook);
      setHunterShotsRemaining(game.hunterShotsRemaining ?? 0);
      setTrapperAlertsRemaining(game.trapperAlertsRemaining ?? 0);
      setTrapperAlertActive(game.trapperAlertActive ?? false);
      setDoctorSelfProtectUsed(game.doctorSelfProtectUsed ?? false);
      setSelectedNightActionTargetId((previous) =>
        game.role === 'AlphaWolf' ||
        game.role === 'Werewolf' ||
        game.role === 'Hunter'
          ? (game.nightKillTargetUserId ?? null)
          : game.role === 'Escort'
            ? (game.escortVisitTargetUserId ?? null)
            : game.role === 'Bodyguard'
              ? (game.bodyguardGuardTargetUserId ?? null)
              : game.role === 'Doctor'
                ? (game.doctorProtectTargetUserId ?? null)
                : game.role === 'Tracker'
                  ? (game.trackerWatchTargetUserId ?? null)
                  : game.role === 'Lookout'
                    ? (game.lookoutWatchTargetUserId ?? null)
                    : game.role === 'Investigator'
                      ? (game.investigatorVisitTargetUserId ?? null)
                      : game.role === 'Framer'
                        ? (game.framerTargetUserId ?? null)
                        : game.role === 'Prowler'
                          ? (game.prowlerTargetUserId ?? null)
                          : game.role === 'Snatcher'
                            ? (game.snatcherTargetUserId ?? null)
                            : game.role === 'Cursed'
                              ? (game.cursedTargetUserId ?? null)
                              : game.role === 'Mimic'
                                ? (game.mimicTargetUserId ?? null)
                                : previous,
      );
      setExecutionerTargetName(game.executionerTargetName ?? null);
      setExecutionerTargetUserId(game.executionerTargetUserId ?? null);
    });
  }, [lobbyName]);

  useEffect(() => {
    if (!lobbyName || !lobbyInfo) return;
    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) return;
      const game = response.game;
      setRole(game.role);
      setCanWriteNotebook(game.canWriteNotebook);
      setWerewolfUserIds(game.werewolfUserIds ?? []);
      setHunterShotsRemaining(game.hunterShotsRemaining ?? 0);
      setTrapperAlertsRemaining(game.trapperAlertsRemaining ?? 0);
      setTrapperAlertActive(game.trapperAlertActive ?? false);
      setDoctorSelfProtectUsed(game.doctorSelfProtectUsed ?? false);
      setSelectedNightActionTargetId((previous) =>
        game.role === 'AlphaWolf' ||
        game.role === 'Werewolf' ||
        game.role === 'Hunter'
          ? (game.nightKillTargetUserId ?? null)
          : game.role === 'Escort'
            ? (game.escortVisitTargetUserId ?? null)
            : game.role === 'Bodyguard'
              ? (game.bodyguardGuardTargetUserId ?? null)
              : game.role === 'Doctor'
                ? (game.doctorProtectTargetUserId ?? null)
                : game.role === 'Tracker'
                  ? (game.trackerWatchTargetUserId ?? null)
                  : game.role === 'Lookout'
                    ? (game.lookoutWatchTargetUserId ?? null)
                    : game.role === 'Investigator'
                      ? (game.investigatorVisitTargetUserId ?? null)
                      : game.role === 'Framer'
                        ? (game.framerTargetUserId ?? null)
                        : game.role === 'Prowler'
                          ? (game.prowlerTargetUserId ?? null)
                          : game.role === 'Snatcher'
                            ? (game.snatcherTargetUserId ?? null)
                            : game.role === 'Cursed'
                              ? (game.cursedTargetUserId ?? null)
                              : game.role === 'Mimic'
                                ? (game.mimicTargetUserId ?? null)
                                : previous,
      );
      setExecutionerTargetName(game.executionerTargetName ?? null);
      setExecutionerTargetUserId(game.executionerTargetUserId ?? null);
    });
  }, [lobbyName, lobbyInfo]);

  useEffect(() => {
    if (!lobbyName) return;
    if (lobbyInfo?.gamePhase !== 'gameResults') return;
    if (navigatedToResultsRef.current) return;
    navigatedToResultsRef.current = true;

    const id = setTimeout(() => {
      router.replace(`/lobby/${encodeURIComponent(lobbyName)}/results`);
    }, 900);
    return () => clearTimeout(id);
  }, [lobbyInfo?.gamePhase, lobbyName, router]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const effectiveDisplayPhase =
    currentPhase === 'nightActionResults' ? 'night' : currentPhase;
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
  const startingRemainingSeconds =
    lobbyInfo?.startingAt && nowMs !== null
      ? Math.max(0, Math.ceil((lobbyInfo.startingAt - nowMs) / 1000))
      : null;

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

  /*
  const legacyNightInstruction = !selfAlive
    ? 'You are dead. You cannot act, but you can observe.'
    : roleName === 'Werewolf'
      ? 'Choose a player to kill. Coordinate with other werewolves in secret chat.'
      : roleName === 'Doctor'
        ? 'Choose a player to protect from a kill tonight.'
        : roleName === 'Bodyguard'
          ? 'Choose a player to guard. You will intercept a hostile attack aimed at them.'
          : roleName === 'Escort'
            ? 'Choose a player to roleblock so their night action fails.'
            : roleName === 'Tracker'
              ? 'Choose a player to track. You will learn who they visited.'
              : roleName === 'Lookout'
                ? 'Choose a player to watch. You will learn who visited them.'
                : roleName === 'Investigator'
                  ? 'Choose a player to investigate. You will receive a list of possible roles.'
                  : roleName === 'Hunter'
                    ? hunterShotsRemaining > 0
                      ? `Choose a player to shoot. Shots remaining: ${hunterShotsRemaining}.`
                      : 'You have no shots remaining tonight.'
                    : roleName === 'Trapper'
                      ? trapperAlertsRemaining > 0
                        ? `Use “Activate Alert” to set a trap on yourself tonight. Alerts remaining: ${trapperAlertsRemaining}.`
                        : 'You have no alerts remaining tonight.'
                      : roleName === 'Executioner'
                        ? 'You have no night action. Push your target during the day vote.'
                        : roleName === 'Jester'
                          ? 'You have no night action. Try to get yourself executed during the day.'
                          : 'You have no night action tonight.';
  */
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
      if (currentPhase !== 'vote') {
        setSelectedVoteTargetId(null);
      }
      if (effectiveDisplayPhase !== 'night') {
        setSelectedNightActionTargetId(null);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [currentPhase, effectiveDisplayPhase]);

  useEffect(() => {
    if (started) return;
    if (!lobbyName) return;
    if (lobbyInfo?.startingAt) return;
    router.push(`/lobby/${encodeURIComponent(lobbyName)}`);
  }, [lobbyInfo?.startingAt, started, lobbyName, router]);

  useEffect(() => {
    if (!lobbyInfo?.startingAt) return;
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

  const showRoleInfo = roleInfoPinnedOpen || roleInfoHovered;

  const renderRoleInfo = () => (
    <div className="relative inline-flex items-center z-40">
      <button
        type="button"
        aria-label={`${roleDisplayName} role info`}
        aria-expanded={showRoleInfo}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-bold text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-sky-400"
        onMouseEnter={() => setRoleInfoHovered(true)}
        onMouseLeave={() => setRoleInfoHovered(false)}
        onFocus={() => setRoleInfoHovered(true)}
        onBlur={() => setRoleInfoHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setRoleInfoPinnedOpen(false);
          }
        }}
        onClick={() => setRoleInfoPinnedOpen((prev) => !prev)}
      >
        i
      </button>
      <div
        className={[
          'pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-md border border-slate-600 bg-slate-900/95 p-2 text-left text-xs text-slate-200 shadow-lg transition-opacity',
          showRoleInfo ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {roleInfo ? (
          <>
            <p className="leading-tight">{roleInfo.ability}</p>
            <p className="mt-1 leading-tight text-amber-300">
              Win: {roleInfo.winCondition}
            </p>
          </>
        ) : (
          <p className="leading-tight text-slate-300">
            Role information unavailable.
          </p>
        )}
        {roleName === 'Hunter' ? (
          <p className="mt-1 leading-tight text-sky-300">
            Shots remaining: {hunterShotsRemaining}
          </p>
        ) : null}
        {roleName === 'Trapper' ? (
          <p className="mt-1 leading-tight text-sky-300">
            Alerts remaining: {trapperAlertsRemaining}
          </p>
        ) : null}
        {roleName === 'Executioner' ? (
          <p className="mt-1 leading-tight text-violet-300">
            Target: {executionerTargetName ?? executionerTargetUserId ?? 'None'}
          </p>
        ) : null}
      </div>
    </div>
  );

  const renderMemberRow = (member: LobbyMember) => {
    const canKillAtNight =
      effectiveDisplayPhase === 'night' &&
      (roleName === 'Werewolf' ||
        roleName === 'AlphaWolf' ||
        (roleName === 'Hunter' && hunterShotsRemaining > 0)) &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canEscortAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Escort' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canGuardAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Bodyguard' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canProtectAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Doctor' &&
      selfAlive &&
      member.alive &&
      (member.userId !== currentUserId || !doctorSelfProtectUsed);
    const canTrackAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Tracker' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canLookoutAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Lookout' &&
      selfAlive &&
      member.alive;
    const canInvestigateAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Investigator' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canFrameAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Framer' &&
      selfAlive &&
      member.alive;
    const canScoutAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Prowler' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canKidnapAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Snatcher' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canCurseAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Cursed' &&
      selfAlive &&
      member.alive;
    const canShapeshiftAtNight =
      effectiveDisplayPhase === 'night' &&
      roleName === 'Mimic' &&
      selfAlive &&
      member.alive &&
      member.userId !== currentUserId;
    const canViewDeadNotebook =
      (effectiveDisplayPhase === 'day' || effectiveDisplayPhase === 'night') &&
      !member.alive;
    const canVoteNow = currentPhase === 'vote' && selfAlive && member.alive;
    const isActionable =
      canKillAtNight ||
      canEscortAtNight ||
      canGuardAtNight ||
      canProtectAtNight ||
      canTrackAtNight ||
      canLookoutAtNight ||
      canInvestigateAtNight ||
      canFrameAtNight ||
      canScoutAtNight ||
      canKidnapAtNight ||
      canCurseAtNight ||
      canShapeshiftAtNight ||
      canViewDeadNotebook ||
      canVoteNow;
    const isSelectedTarget =
      (effectiveDisplayPhase === 'night' &&
        selectedNightActionTargetId === member.userId) ||
      (currentPhase === 'vote' && selectedVoteTargetId === member.userId);

    const isExecutionerTarget =
      roleName === 'Executioner' && executionerTargetUserId === member.userId;

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
          'game-box relative w-full text-left transition-all duration-150',
          isActionable
            ? 'cursor-pointer border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400/70 hover:translate-y-[-1px]'
            : 'opacity-50 cursor-not-allowed border-slate-700/50 bg-slate-900/40',
          isSelectedTarget
            ? 'border-amber-300/90 bg-gradient-to-r from-amber-500/16 to-sky-500/8 ring-4 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_24px_rgba(251,191,36,0.14)] translate-y-0 hover:translate-y-0'
            : '',
        ].join(' ')}
        onClick={() => {
          if (!lobbyName || typeof lobbyName !== 'string') return;

          if (canKillAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              nightKill(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            nightKill(lobbyName, member.userId);
            return;
          }

          if (canEscortAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              escortVisit(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            escortVisit(lobbyName, member.userId);
            return;
          }

          if (canGuardAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              bodyguardGuard(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            bodyguardGuard(lobbyName, member.userId);
            return;
          }

          if (canProtectAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              doctorProtect(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            doctorProtect(lobbyName, member.userId);
            return;
          }

          if (canTrackAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              trackerWatch(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            trackerWatch(lobbyName, member.userId);
            return;
          }

          if (canLookoutAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              lookoutWatch(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            lookoutWatch(lobbyName, member.userId);
            return;
          }

          if (canInvestigateAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              investigate(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            investigate(lobbyName, member.userId);
            return;
          }

          if (canFrameAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              frame(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            frame(lobbyName, member.userId);
            return;
          }

          if (canScoutAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              prowl(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            prowl(lobbyName, member.userId);
            return;
          }

          if (canKidnapAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              snatch(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            snatch(lobbyName, member.userId);
            return;
          }

          if (canCurseAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              curse(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            curse(lobbyName, member.userId);
            return;
          }

          if (canShapeshiftAtNight) {
            if (currentPhase !== 'night') return;
            if (selectedNightActionTargetId === member.userId) {
              setSelectedNightActionTargetId(null);
              mimic(lobbyName, member.userId);
              return;
            }
            setSelectedNightActionTargetId(member.userId);
            mimic(lobbyName, member.userId);
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
            if (selectedVoteTargetId === member.userId) {
              setSelectedVoteTargetId(null);
              castVote(lobbyName, member.userId);
              return;
            }
            setSelectedVoteTargetId(member.userId);
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
                : isExecutionerTarget
                  ? 'text-violet-300'
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
            {member.alive ? '\u25CF' : '\u2620'}
          </span>
        </span>
      </button>
    );
  };

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
                {lobbyName ?? '...'}
              </h1>
            </div>
            <div className="game-box w-full sm:w-auto shrink-0 text-left sm:text-right sm:min-w-[11rem]">
              <p className="game-tight-label">Role</p>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <p className="font-semibold text-slate-100">
                  {roleDisplayName}
                </p>
                {renderRoleInfo()}
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
                      if (!lobbyName || currentPhase !== 'night') return;
                      toggleTrapperAlert(lobbyName);
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
              renderMemberRow={renderMemberRow}
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
          lobbyName={typeof lobbyName === 'string' ? lobbyName : undefined}
          refreshKey={chatRefreshKey}
          currentUserId={session?.user?.id}
        />
      ) : null}
      {currentPhase !== 'roleReveal' &&
      currentPhase !== 'endGame' &&
      currentPhase !== 'gameResults' ? (
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
        <NotebookModal
          notebook={viewingNotebook}
          onClose={() => setViewingNotebook(null)}
        />
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
      {currentPhase === 'gameResults' ? (
        <div
          key="results-route-fadeout"
          className="pointer-events-none fixed inset-0 z-50 bg-black phase-overlay-fade-out"
        />
      ) : null}
    </>
  );
}
