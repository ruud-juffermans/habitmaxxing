import styled from 'styled-components';
import type { HabitSchedule, ScheduleKind } from '../types';
import { Select } from './ui';
import { todayISO } from '../api';

const KIND_LABELS: Record<ScheduleKind, string> = {
  daily: 'Daily',
  weekdays: 'Specific weekdays',
  weekly_count: 'Times per week',
  interval: 'Every N days',
};

const KIND_ORDER: ScheduleKind[] = ['daily', 'weekdays', 'weekly_count', 'interval'];

// ISO weekday 1..7 (Mon..Sun) — toggle labels and the longer summary names.
const TOGGLE_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SHORT_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A valid starter schedule for each kind, used when switching kinds. */
export function defaultSchedule(kind: ScheduleKind): HabitSchedule {
  const base: HabitSchedule = {
    scheduleKind: kind,
    scheduleDays: [],
    scheduleTarget: null,
    scheduleEvery: null,
    scheduleAnchor: null,
  };
  switch (kind) {
    case 'weekdays':
      return { ...base, scheduleDays: [1, 2, 3, 4, 5] };
    case 'weekly_count':
      return { ...base, scheduleTarget: 3 };
    case 'interval':
      return { ...base, scheduleEvery: 2, scheduleAnchor: todayISO() };
    default:
      return base;
  }
}

/** Whether a schedule has the fields its kind requires (mirrors server Zod). */
export function isValidSchedule(s: HabitSchedule): boolean {
  switch (s.scheduleKind) {
    case 'weekdays':
      return s.scheduleDays.length > 0;
    case 'weekly_count':
      return s.scheduleTarget != null && s.scheduleTarget >= 1;
    case 'interval':
      return s.scheduleEvery != null && s.scheduleEvery >= 1 && !!s.scheduleAnchor;
    default:
      return true;
  }
}

/** Compact human label for a schedule, e.g. "Mon·Wed·Fri", "3×/week", "Every 3d". */
export function scheduleSummary(s: HabitSchedule): string {
  switch (s.scheduleKind) {
    case 'weekdays':
      return s.scheduleDays.length
        ? [...s.scheduleDays].sort((a, b) => a - b).map((d) => SHORT_NAMES[d - 1]).join('·')
        : 'No days';
    case 'weekly_count':
      return s.scheduleTarget ? `${s.scheduleTarget}×/week` : 'Times per week';
    case 'interval':
      return s.scheduleEvery ? `Every ${s.scheduleEvery}d` : 'Every N days';
    default:
      return 'Daily';
  }
}

function clampInt(raw: string, lo: number, hi: number): number | null {
  if (raw === '') return null;
  const n = Math.round(Number(raw));
  if (Number.isNaN(n)) return null;
  return Math.min(hi, Math.max(lo, n));
}

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: HabitSchedule;
  onChange: (next: HabitSchedule) => void;
}) {
  const toggleDay = (iso: number) => {
    const has = value.scheduleDays.includes(iso);
    const scheduleDays = has
      ? value.scheduleDays.filter((d) => d !== iso)
      : [...value.scheduleDays, iso].sort((a, b) => a - b);
    onChange({ ...value, scheduleDays });
  };

  return (
    <Wrap>
      <Select
        aria-label="Schedule"
        value={value.scheduleKind}
        onChange={(e) => onChange(defaultSchedule(e.target.value as ScheduleKind))}
      >
        {KIND_ORDER.map((k) => (
          <option key={k} value={k}>
            {KIND_LABELS[k]}
          </option>
        ))}
      </Select>

      {value.scheduleKind === 'weekdays' && (
        <Days role="group" aria-label="Weekdays">
          {TOGGLE_LABELS.map((label, i) => {
            const iso = i + 1;
            const on = value.scheduleDays.includes(iso);
            return (
              <DayToggle
                key={iso}
                type="button"
                $on={on}
                aria-pressed={on}
                aria-label={SHORT_NAMES[i]}
                onClick={() => toggleDay(iso)}
              >
                {label}
              </DayToggle>
            );
          })}
        </Days>
      )}

      {value.scheduleKind === 'weekly_count' && (
        <Inline>
          <NumInput
            type="number"
            min={1}
            max={7}
            value={value.scheduleTarget ?? ''}
            onChange={(e) => onChange({ ...value, scheduleTarget: clampInt(e.target.value, 1, 7) })}
          />
          <Suffix>× per week</Suffix>
        </Inline>
      )}

      {value.scheduleKind === 'interval' && (
        <Inline>
          <Suffix>every</Suffix>
          <NumInput
            type="number"
            min={1}
            max={365}
            value={value.scheduleEvery ?? ''}
            onChange={(e) => onChange({ ...value, scheduleEvery: clampInt(e.target.value, 1, 365) })}
          />
          <Suffix>days from</Suffix>
          <DateInput
            type="date"
            value={value.scheduleAnchor ?? ''}
            onChange={(e) => onChange({ ...value, scheduleAnchor: e.target.value || null })}
          />
        </Inline>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const Days = styled.div`
  display: inline-flex;
  gap: 4px;
`;

const DayToggle = styled.button<{ $on: boolean }>`
  width: 30px;
  height: 32px;
  padding: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $on }) => ($on ? theme.colors.primaryText : theme.colors.textMuted)};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Inline = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const Suffix = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
`;

const NumInput = styled.input`
  width: 64px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const DateInput = styled(NumInput)`
  width: auto;
`;
