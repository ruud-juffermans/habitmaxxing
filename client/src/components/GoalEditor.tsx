import styled from 'styled-components';
import type { GoalDirection, Habit, HabitType } from '../types';
import { isGoalableType } from '../goal';
import { Select } from './ui';

/** The goal fields of a habit, edited as a unit. */
export interface HabitGoal {
  goalTarget: number | null;
  goalDirection: GoalDirection;
}

const DIRECTION_LABELS: Record<GoalDirection, string> = {
  at_least: 'At least',
  at_most: 'At most',
};

const DIRECTION_ORDER: GoalDirection[] = ['at_least', 'at_most'];

// Math symbol for each direction, used in the compact summary.
const DIRECTION_SYMBOL: Record<GoalDirection, string> = {
  at_least: '≥',
  at_most: '≤',
};

/** Pull just the goal fields off a habit row, coercing the target to a number. */
export function goalOf(h: Habit): HabitGoal {
  return {
    goalTarget: h.goalTarget == null || h.goalTarget === '' ? null : Number(h.goalTarget),
    goalDirection: h.goalDirection,
  };
}

/**
 * Compact human label for a goal, e.g. "≥ 8000 steps", "≤ 2 cups", "No goal".
 * Non-numeric habit types have no goal concept and return "—".
 */
export function goalSummary(type: HabitType, unit: string | null, goal: HabitGoal): string {
  if (!isGoalableType(type)) return '—';
  if (goal.goalTarget == null) return 'No goal';
  const suffix = unit ? ` ${unit}` : '';
  return `${DIRECTION_SYMBOL[goal.goalDirection]} ${goal.goalTarget}${suffix}`;
}

function parseTarget(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function GoalEditor({
  type,
  unit,
  value,
  onChange,
}: {
  type: HabitType;
  unit: string | null;
  value: HabitGoal;
  onChange: (next: HabitGoal) => void;
}) {
  // A goal is only meaningful for numeric value types. Boolean habits are "done"
  // when checked; time/text habits when an entry exists.
  if (!isGoalableType(type)) {
    return (
      <Hint>
        {type === 'boolean'
          ? 'Done when checked — no target needed.'
          : 'Goals apply to numeric habits (number, score, duration, counter).'}
      </Hint>
    );
  }

  return (
    <Wrap>
      <Select
        aria-label="Goal direction"
        value={value.goalDirection}
        onChange={(e) => onChange({ ...value, goalDirection: e.target.value as GoalDirection })}
      >
        {DIRECTION_ORDER.map((d) => (
          <option key={d} value={d}>
            {DIRECTION_LABELS[d]}
          </option>
        ))}
      </Select>
      <NumInput
        type="number"
        step="any"
        placeholder="target"
        aria-label="Goal target"
        value={value.goalTarget ?? ''}
        onChange={(e) => onChange({ ...value, goalTarget: parseTarget(e.target.value) })}
      />
      <Suffix>{unit ? unit : 'to count as done'}</Suffix>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Suffix = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
`;

const NumInput = styled.input`
  width: 96px;
  min-height: 42px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition:
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textFaint};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
`;
