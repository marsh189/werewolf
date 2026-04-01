'use client';

import EliminationResultsCard from '@/components/game/EliminationResultsCard';
import GameFloatingPanels from '@/components/game/GameFloatingPanels';
import GameOverlays from '@/components/game/GameOverlays';
import GamePhaseScene from '@/components/game/GamePhaseScene';
import MemberActionRow from '@/components/game/MemberActionRow';
import PhaseTimer from '@/components/game/PhaseTimer';
import PlayerList from '@/components/game/PlayerList';
import PlayerRoleCard from '@/components/game/PlayerRoleCard';
import TrapperAlertButton from '@/components/game/TrapperAlertButton';
import HeaderMenu from '@/components/shared/HeaderMenu';
import {
  endGame,
  toggleTrapperAlert,
  updateNotebook,
} from '@/lib/actions/gameSocketActions';
import { leaveLobby } from '@/lib/actions/lobbySocketActions';
import { useGamePhaseAnimation } from '@/lib/hooks/useGamePhaseAnimation';
import { useGameSoundEffects } from '@/lib/hooks/useGameSoundEffects';
import { useLobbyGameState } from '@/lib/hooks/useLobbyGameState';
import { useLobbyRealtime } from '@/lib/hooks/useLobbyRealtime';
import { usePresenceView } from '@/lib/hooks/usePresenceView';
import {
  buildChatRefreshKey,
  buildNightResultsSequenceKey,
  sortMembersAliveFirst,
} from '@/lib/selectors/gameUiSelectors';
import { getGamePhaseCopy } from '@/lib/selectors/gamePhaseCopy';
import {
  DEFAULT_PHASE_DURATIONS,
  getStartingRemainingSeconds,
} from '@/lib/selectors/lobbyUiSelectors';
import { normalizeLobbyNameParam } from '@/lib/routes/lobbyName';
import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';
import type { SocketAck } from '@/models/game';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/* =============================================================================
   Game Page

   Main gameplay screen for a lobby. Responsibilities:
   - render the current phase UI (day/night/vote/results/etc.)
   - wire realtime lobby snapshots + game snapshots into one UI state
   - drive "cinematic" animations using authoritative server timers
   - expose per-role actions via socket events (server validates everything)
============================================================================= */
export default function LobbyGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { lobbyName } = useParams<{ lobbyName: string }>();

  const lobbyNameParam = normalizeLobbyNameParam(
    typeof lobbyName === 'string' ? lobbyName : undefined,
  );

  // Subscribe using the param-derived name so the hook doesn't thrash when the
  // server later returns the canonical lobby name.
  const { lobbyInfo } = useLobbyRealtime(lobbyNameParam);

  // Canonical key to use for *emits* (prevents double-encoded lobby keys).
  const lobbyNameKey = lobbyInfo?.lobbyName ?? lobbyNameParam;

  /* -----------------------------------------------------------------------
     Presence Tracking

     Lets the server know this user is actively viewing the game screen.
  ----------------------------------------------------------------------- */
  usePresenceView(lobbyNameKey, 'game');

  /* -----------------------------------------------------------------------
     Orchestrated Game UI State

     `useLobbyGameState` owns the "fetch + reconcile + redirect" logic so this
     page can focus on rendering.
  ----------------------------------------------------------------------- */
  const {
    nowMs,
    started,
    effectiveDisplayPhase,
    phase,
    dayNumber,
    nightNumber,
    phaseEndsAt,
    currentNightDeathReveal,
    currentEliminationResult,
    role,
    canWriteNotebook,
    werewolfUserIds,
    hunterShotsRemaining,
    trapperAlertsRemaining,
    trapperAlertActive,
    doctorSelfProtectUsed,
    executionerTargetName,
    executionerTargetUserId,
    viewingNotebook,
    setViewingNotebook,
    selectedNightActionTargetId,
    setSelectedNightActionTargetId,
    selectedVoteTargetId,
    setSelectedVoteTargetId,
  } = useLobbyGameState({
    lobbyName: lobbyNameKey,
    lobbyInfo,
    navigation: router,
  });

  /* -----------------------------------------------------------------------
     Authoritative Phase Snapshot

     Lobby realtime (`useLobbyRealtime`) is the source of truth for phase and
     membership; `useLobbyGameState` provides fallback state for resilience.
  ----------------------------------------------------------------------- */
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const currentDayNumber = lobbyInfo?.dayNumber ?? dayNumber;
  const currentNightNumber = lobbyInfo?.nightNumber ?? nightNumber;
  const currentPhaseEndsAt = lobbyInfo?.phaseEndsAt ?? phaseEndsAt;
  const revealDeath = lobbyInfo?.currentNightDeathReveal ?? currentNightDeathReveal;
  const revealDeathUserId = revealDeath?.userId ?? null;

  /* -----------------------------------------------------------------------
     Night Results Sequence Key

     Used to restart the animated night-results sequence when the revealed death
     changes (without restarting on duplicate snapshots).
  ----------------------------------------------------------------------- */
  const nightResultsSequenceKey = buildNightResultsSequenceKey(
    revealDeathUserId,
    currentNightNumber,
  );
  const eliminationResult = lobbyInfo?.currentEliminationResult ?? currentEliminationResult;
  const hostUserId = lobbyInfo?.hostUserId ?? null;

  /* -----------------------------------------------------------------------
     Local Player + Member Ordering

     We keep alive players at the top for readability, while preserving the
     original server ordering within each alive/dead group.
  ----------------------------------------------------------------------- */
  const currentUserId = session?.user?.id;
  const selfMember = (lobbyInfo?.members ?? []).find(
    (member) => member.userId === currentUserId,
  );
  const sortedMembers = sortMembersAliveFirst(lobbyInfo?.members ?? []);
  const selfAlive = selfMember?.alive ?? true;
  const startingRemainingSeconds = getStartingRemainingSeconds(
    lobbyInfo?.startingAt,
    nowMs,
  );
  const phaseDurations = lobbyInfo?.phaseDurations ?? DEFAULT_PHASE_DURATIONS;
  const phaseDurationMs =
    currentPhase === 'day'
      ? (phaseDurations.daySeconds ?? DEFAULT_PHASE_DURATIONS.daySeconds) * 1000
      : currentPhase === 'night'
        ? (phaseDurations.nightSeconds ?? DEFAULT_PHASE_DURATIONS.nightSeconds) *
          1000
        : currentPhase === 'vote'
          ? (phaseDurations.voteSeconds ?? DEFAULT_PHASE_DURATIONS.voteSeconds) *
            1000
          : null;

  /* -----------------------------------------------------------------------
     Phase Animations

     Drives cinematic fades + role/night reveal animations based on the
     authoritative phase timers (`phaseEndsAt`) sent by the server.
  ----------------------------------------------------------------------- */
  const { revealState, nightResultRevealState, eliminationRevealState, phaseOverlayState } =
    useGamePhaseAnimation({
      currentPhase,
      currentPhaseEndsAt,
      currentDayNumber,
      nightResultsSequenceKey,
      revealDeathUserId,
    });

  const isNightCyclePhase = effectiveDisplayPhase === 'night';
  const roleName = role ?? 'Unknown';
  const roleInfo = role && role in ROLES ? ROLES[role as Role] : null;
  const roleDisplayName = getRoleDisplayName(roleName);
  const winningFaction = lobbyInfo?.gameResults?.winningFaction ?? null;
  const didWin = (() => {
    if (!roleInfo) return null;
    if (!winningFaction) return roleInfo.faction === 'Village';
    if (winningFaction === 'Village') return roleInfo.faction === 'Village';
    if (winningFaction === 'Enemy') return roleInfo.faction === 'Enemy';
    if (winningFaction === 'Jester') return roleName === 'Jester';
    if (winningFaction === 'Executioner') return roleName === 'Executioner';
    return null;
  })();

  useGameSoundEffects({
    currentPhase,
    startingAt: lobbyInfo?.startingAt,
    phaseEndsAt: currentPhaseEndsAt,
    canWriteNotebook,
    didWin,
  });
  const { phaseTitle, phaseSubLabel, phaseSubInstruction, instructionNode } =
    getGamePhaseCopy({
      effectiveDisplayPhase,
      currentDayNumber,
      currentNightNumber,
      selfAlive,
      roleName,
      roleInfo,
      hunterShotsRemaining,
      trapperAlertsRemaining,
      trapperAlertActive,
    });
  const eliminationResultsKey =
    eliminationResult?.noElimination === true
      ? `elim-result-none-${currentDayNumber ?? 0}`
      : eliminationResult && 'userId' in eliminationResult
        ? `elim-result-${eliminationResult.userId}`
        : `elim-result-waiting-${currentDayNumber ?? 0}`;
  const isHost =
    !!session?.user?.id && !!hostUserId && session.user.id === hostUserId;

  /* -----------------------------------------------------------------------
     Chat Refresh Key

     Forces `GameChat` to refresh when phase/role/alive status changes (which
     changes the user's chat audience/permissions).
  ----------------------------------------------------------------------- */
  const chatRefreshKey = buildChatRefreshKey({
    currentPhase,
    roleName,
    selfAlive,
    started,
  });
  const roleToneClass =
    roleInfo?.faction === 'Enemy'
      ? 'reveal-role-werewolf'
      : roleName === 'Jester'
        ? 'reveal-role-jester'
        : roleName === 'Executioner'
        ? 'reveal-role-executioner'
      : roleName === 'Villager'
        ? 'reveal-role-villager'
        : 'reveal-role-special';
  const leaveGameAction = lobbyNameKey
    ? {
        label: 'Leave Game',
        title: 'Leave game?',
        description: 'You will leave this lobby and return to the home screen.',
        confirmLabel: 'Leave Game',
        onConfirm: () => {
          leaveLobby(lobbyNameKey);
          router.push('/');
        },
      }
    : null;
  const endGameAction =
    isHost && lobbyNameKey
      ? {
          label: 'End Game',
          title: 'End this game?',
          description: 'This will immediately stop the current match for everyone in the lobby.',
          confirmLabel: 'End Game',
          onConfirm: () => {
            endGame(lobbyNameKey, (err: unknown, res: SocketAck | undefined) => {
              if (err || !res?.ok) {
                console.error(res?.error ?? 'Failed to end game');
              }
            });
          },
        }
      : null;
  const headerMenuProps = {
    leaveAction: leaveGameAction,
    endGameAction,
  };

  return (
    <>
      <GamePhaseScene
        currentPhase={currentPhase}
        startingAt={lobbyInfo?.startingAt}
        startingRemainingSeconds={startingRemainingSeconds}
        phaseEndsAt={currentPhaseEndsAt}
        revealState={revealState}
        roleName={roleName}
        roleToneClass={roleToneClass}
        nightResultRevealState={nightResultRevealState}
        revealDeath={revealDeath}
        didWin={didWin}
        winningFaction={winningFaction}
      />
      {currentPhase !== 'lobby' &&
      currentPhase !== 'roleReveal' &&
      currentPhase !== 'nightResults' &&
      currentPhase !== 'endGame' &&
      currentPhase !== 'gameResults' ? (
        <div
          className={[
            'min-h-[100svh] px-4 sm:px-6 py-6 sm:py-12 pb-80',
            isNightCyclePhase ? 'game-cinematic-scene' : '',
          ].join(' ')}
        >
          <header className="mx-auto w-full max-w-3xl mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="text-left">
                <p className="game-tight-label">Lobby</p>
                <h1 className="game-title text-left leading-tight">
                  {lobbyNameKey ?? '...'}
                </h1>
              </div>
              <div className="sm:hidden shrink-0">
                <HeaderMenu {...headerMenuProps} />
              </div>
            </div>
            <div className="flex items-start gap-3 sm:justify-end">
              <PlayerRoleCard
                roleName={roleName}
                roleDisplayName={roleDisplayName}
                roleInfo={roleInfo}
                hunterShotsRemaining={hunterShotsRemaining}
                trapperAlertsRemaining={trapperAlertsRemaining}
                executionerTargetName={executionerTargetName}
                executionerTargetUserId={executionerTargetUserId}
              />
              <div className="hidden sm:block shrink-0">
                <HeaderMenu {...headerMenuProps} />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-3xl text-center space-y-6">
            <div className="space-y-6">
              <h1 className="game-title">
                {phaseTitle}
              </h1>
              {phaseSubLabel ? (
                <p className="text-slate-300/90 text-xs uppercase tracking-[0.2em]">
                  {phaseSubLabel}
                </p>
              ) : null}
              {phaseSubInstruction ? (
                <p className="text-slate-300 text-sm">{instructionNode}</p>
              ) : null}
              <div className="flex flex-col items-center gap-3">
                {currentPhase !== 'nightActionResults' &&
                currentPhase !== 'eliminationResults' ? (
                  <PhaseTimer
                    phaseEndsAt={currentPhaseEndsAt}
                    phaseDurationMs={phaseDurationMs}
                  />
                ) : null}
                <TrapperAlertButton
                  lobbyName={lobbyNameKey}
                  currentPhase={currentPhase}
                  effectiveDisplayPhase={effectiveDisplayPhase}
                  roleName={roleName}
                  selfAlive={selfAlive}
                  trapperAlertActive={trapperAlertActive}
                  trapperAlertsRemaining={trapperAlertsRemaining}
                  onToggle={toggleTrapperAlert}
                />
              </div>
            </div>

            <PlayerList
              members={sortedMembers}
              renderMemberRow={(member) => (
                <MemberActionRow
                  key={member.userId}
                  lobbyName={lobbyNameKey}
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
                  eliminationRevealState={eliminationRevealState}
                />
              )}
            />
            <EliminationResultsCard
              currentPhase={currentPhase}
              eliminationResultsKey={eliminationResultsKey}
              eliminationResult={eliminationResult}
              revealState={eliminationRevealState}
            />
          </div>
        </div>
      ) : null}
      <GameFloatingPanels
        currentPhase={currentPhase}
        lobbyName={lobbyNameKey}
        currentUserId={session?.user?.id}
        chatRefreshKey={chatRefreshKey}
        canWriteNotebook={canWriteNotebook}
        onNotesChange={(notes) => {
          if (!lobbyNameKey) return;
          updateNotebook(lobbyNameKey, notes);
        }}
        viewingNotebook={viewingNotebook}
        onCloseNotebook={() => setViewingNotebook(null)}
      />
      <GameOverlays
        phaseOverlayState={phaseOverlayState}
        showResultsFadeOut={currentPhase === 'gameResults'}
      />
    </>
  );
}
