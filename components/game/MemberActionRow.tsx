import type { Dispatch, SetStateAction } from 'react';
import type { EliminationRevealState, GamePhase, NotebookView } from '@/models/game';
import type { LobbyMember } from '@/models/lobby';
import {
  bodyguardGuard,
  castVote,
  curse,
  doctorProtect,
  escortVisit,
  frame,
  getNotebook,
  investigate,
  lookoutWatch,
  mimic,
  nightKill,
  prowl,
  snatch,
  trackerWatch,
} from '@/lib/actions/gameSocketActions';

type MemberActionRowProps = {
  lobbyName: string | undefined;
  member: LobbyMember;
  currentPhase: GamePhase;
  effectiveDisplayPhase: GamePhase;
  roleName: string;
  selfAlive: boolean;
  currentUserId: string | undefined;
  werewolfUserIds: string[];
  hunterShotsRemaining: number;
  doctorSelfProtectUsed: boolean;
  executionerTargetUserId: string | null;
  selectedNightActionTargetId: string | null;
  setSelectedNightActionTargetId: Dispatch<SetStateAction<string | null>>;
  selectedVoteTargetId: string | null;
  setSelectedVoteTargetId: Dispatch<SetStateAction<string | null>>;
  setViewingNotebook: Dispatch<SetStateAction<NotebookView | null>>;
  eliminationRevealState?: EliminationRevealState;
};

type NightAction = {
  kind:
    | 'nightKill'
    | 'escortVisit'
    | 'bodyguardGuard'
    | 'doctorProtect'
    | 'trackerWatch'
    | 'lookoutWatch'
    | 'investigate'
    | 'frame'
    | 'prowl'
    | 'snatch'
    | 'curse'
    | 'mimic';
  dispatch: (lobbyName: string, targetUserId: string) => void;
};

const getNightActionForRole = (roleName: string): NightAction | null => {
  switch (roleName) {
    case 'Werewolf':
    case 'AlphaWolf':
    case 'Hunter':
      return { kind: 'nightKill', dispatch: nightKill };
    case 'Escort':
      return { kind: 'escortVisit', dispatch: escortVisit };
    case 'Bodyguard':
      return { kind: 'bodyguardGuard', dispatch: bodyguardGuard };
    case 'Doctor':
      return { kind: 'doctorProtect', dispatch: doctorProtect };
    case 'Tracker':
      return { kind: 'trackerWatch', dispatch: trackerWatch };
    case 'Lookout':
      return { kind: 'lookoutWatch', dispatch: lookoutWatch };
    case 'Investigator':
      return { kind: 'investigate', dispatch: investigate };
    case 'Framer':
      return { kind: 'frame', dispatch: frame };
    case 'Prowler':
      return { kind: 'prowl', dispatch: prowl };
    case 'Snatcher':
      return { kind: 'snatch', dispatch: snatch };
    case 'Cursed':
      return { kind: 'curse', dispatch: curse };
    case 'Mimic':
      return { kind: 'mimic', dispatch: mimic };
    default:
      return null;
  }
};

const canTargetSelfForNightAction = (nightAction: NightAction) =>
  nightAction.kind === 'lookoutWatch' ||
  nightAction.kind === 'doctorProtect' ||
  nightAction.kind === 'frame' ||
  nightAction.kind === 'curse';

export default function MemberActionRow({
  lobbyName,
  member,
  currentPhase,
  effectiveDisplayPhase,
  roleName,
  selfAlive,
  currentUserId,
  werewolfUserIds,
  hunterShotsRemaining,
  doctorSelfProtectUsed,
  executionerTargetUserId,
  selectedNightActionTargetId,
  setSelectedNightActionTargetId,
  selectedVoteTargetId,
  setSelectedVoteTargetId,
  setViewingNotebook,
  eliminationRevealState = 'hidden',
}: MemberActionRowProps) {
  const isNightActionOpen = currentPhase === 'night';
  const nightAction = getNightActionForRole(roleName);
  const needsNightTarget =
    isNightActionOpen && selfAlive && member.alive && nightAction !== null;

  const disallowSelfTarget =
    currentUserId &&
    member.userId === currentUserId &&
    nightAction !== null &&
    !canTargetSelfForNightAction(nightAction);

  const disallowHunterNoShots =
    roleName === 'Hunter' && hunterShotsRemaining <= 0;

  const disallowDoctorSelfProtect =
    roleName === 'Doctor' &&
    currentUserId &&
    member.userId === currentUserId &&
    doctorSelfProtectUsed;

  const canDoNightAction =
    needsNightTarget &&
    !disallowSelfTarget &&
    !disallowHunterNoShots &&
    !disallowDoctorSelfProtect;

  const canViewDeadNotebook =
    (effectiveDisplayPhase === 'day' || effectiveDisplayPhase === 'night') &&
    !member.alive;
  const canVoteNow = currentPhase === 'vote' && selfAlive && member.alive;

  const isActionable =
    (canDoNightAction && nightAction !== null) || canViewDeadNotebook || canVoteNow;
  const isSelectedTarget =
    (canDoNightAction && selectedNightActionTargetId === member.userId) ||
    (canVoteNow && selectedVoteTargetId === member.userId);

  const isExecutionerTarget =
    roleName === 'Executioner' && executionerTargetUserId === member.userId;
  const showVoteCount =
    currentPhase === 'eliminationResults' &&
    eliminationRevealState !== 'hidden' &&
    (member.voteCount ?? 0) > 0;

  return (
    <button
      type="button"
      disabled={!isActionable || !lobbyName}
      aria-pressed={isSelectedTarget}
      aria-label={
        isActionable
          ? `${member.name} is selectable`
          : `${member.name} is not selectable right now`
      }
      className={[
        'game-box relative w-full text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80',
        isActionable
          ? 'cursor-pointer border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400/70 hover:translate-y-[-1px]'
          : 'opacity-50 cursor-not-allowed border-slate-700/50 bg-slate-900/40',
        isSelectedTarget
          ? 'border-amber-300/90 bg-gradient-to-r from-amber-500/16 to-sky-500/8 ring-4 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_24px_rgba(251,191,36,0.14)] translate-y-0 hover:translate-y-0'
          : '',
      ].join(' ')}
      onClick={() => {
        if (!lobbyName) return;

        if (canDoNightAction && nightAction) {
          setSelectedNightActionTargetId((previous) =>
            previous === member.userId ? null : member.userId,
          );
          nightAction.dispatch(lobbyName, member.userId);
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
              : isExecutionerTarget
                ? 'text-violet-300'
                : 'text-white',
          ].join(' ')}
        >
          {member.name}
        </span>
      </span>
      <span className="flex items-center gap-2">
        {showVoteCount ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
            {member.voteCount} vote{member.voteCount === 1 ? '' : 's'}
          </span>
        ) : null}
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
}
