'use client';

import EliminationResultsCard from '@/components/game/EliminationResultsCard';
import EndGameScene from '@/components/game/EndGameScene';
import GameFloatingPanels from '@/components/game/GameFloatingPanels';
import GameOverlays from '@/components/game/GameOverlays';
import GameStartingScene from '@/components/game/GameStartingScene';
import MemberActionRow from '@/components/game/MemberActionRow';
import NightResultsScene from '@/components/game/NightResultsScene';
import PhaseTimer from '@/components/game/PhaseTimer';
import PlayerList from '@/components/game/PlayerList';
import PlayerRoleCard from '@/components/game/PlayerRoleCard';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import {
  endGame,
  toggleTrapperAlert,
  updateNotebook,
} from '@/lib/actions/gameSocketActions';
import { useGamePhaseAnimation } from '@/lib/hooks/useGamePhaseAnimation';
import { useLobbyGameState } from '@/lib/hooks/useLobbyGameState';
import { useLobbyRealtime } from '@/lib/hooks/useLobbyRealtime';
import { usePresenceView } from '@/lib/hooks/usePresenceView';
import {
  buildChatRefreshKey,
  buildNightResultsSequenceKey,
  sortMembersAliveFirst,
} from '@/lib/selectors/gameUiSelectors';
import { getStartingRemainingSeconds } from '@/lib/selectors/lobbyUiSelectors';
import { normalizeLobbyNameParam } from '@/lib/routes/lobbyName';
import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { NightInstructionContext, Role } from '@/models/roles';
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
    gameHostUserId,
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
  const hostUserId = lobbyInfo?.hostUserId ?? gameHostUserId;

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

  /* -----------------------------------------------------------------------
     Phase Animations

     Drives cinematic fades + role/night reveal animations based on the
     authoritative phase timers (`phaseEndsAt`) sent by the server.
  ----------------------------------------------------------------------- */
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
  const instructionNode = (() => {
    if (!phaseSubInstruction) return null;

    // For roles that have limited resources (ex: Hunter shots, Trapper alerts, Doctor self-protect),
    // highlight the resource portion of the instruction text to match the info popover color.
    if (effectiveDisplayPhase !== 'night') {
      return phaseSubInstruction;
    }

    if (typeof phaseSubInstruction !== 'string') return phaseSubInstruction;

    const highlightFromMarkerToEnd = (marker: string) => {
      const idx = phaseSubInstruction.indexOf(marker);
      if (idx === -1) return null;
      const before = phaseSubInstruction.slice(0, idx).trimEnd();
      const after = phaseSubInstruction.slice(idx);
      return (
        <>
          <span>{before} </span>
          <span className="text-sky-300 font-semibold">{after}</span>
        </>
      );
    };

    const highlightExactSentence = (sentence: string) => {
      const idx = phaseSubInstruction.indexOf(sentence);
      if (idx === -1) return null;
      const before = phaseSubInstruction.slice(0, idx).trimEnd();
      const after = phaseSubInstruction.slice(idx + sentence.length).trimStart();
      return (
        <>
          {before ? <span>{before} </span> : null}
          <span className="text-sky-300 font-semibold">{sentence}</span>
          {after ? <span> {after}</span> : null}
        </>
      );
    };

    if (roleName === 'Hunter') {
      return (
        highlightFromMarkerToEnd('Shots remaining:') ?? phaseSubInstruction
      );
    }

    if (roleName === 'Trapper') {
      return (
        highlightFromMarkerToEnd('Alerts remaining:') ?? phaseSubInstruction
      );
    }

    if (roleName === 'Doctor') {
      return (
        highlightExactSentence('You may protect yourself once per game.') ?? phaseSubInstruction
      );
    }

    return phaseSubInstruction;
  })();
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
  const endGameButton = isHost ? (
    <button
      type="button"
      className="game-button-secondary max-w-xs mx-auto"
      onClick={() => {
        if (!lobbyNameKey) return;
        endGame(lobbyNameKey, (err: unknown, res: SocketAck | undefined) => {
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
        <GameStartingScene startingRemainingSeconds={startingRemainingSeconds} />
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
          didWin={didWin}
          winningFaction={winningFaction}
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
                {lobbyNameKey ?? '...'}
              </h1>
            </div>
            <PlayerRoleCard
              roleName={roleName}
              roleDisplayName={roleDisplayName}
              roleInfo={roleInfo}
              hunterShotsRemaining={hunterShotsRemaining}
              trapperAlertsRemaining={trapperAlertsRemaining}
              executionerTargetName={executionerTargetName}
              executionerTargetUserId={executionerTargetUserId}
            />
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
                  <p className="text-slate-300 text-sm">{instructionNode}</p>
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
                      if (!lobbyNameKey || currentPhase !== 'night') return;
                      toggleTrapperAlert(lobbyNameKey);
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
