import styled from 'styled-components';
import type { Entry, Habit } from '../types';
import { Input, Select } from './ui';

type Value = Pick<Entry, 'valueBool' | 'valueNum' | 'valueText' | 'valueTime'>;

interface Props {
  habit: Habit;
  entry: Entry | null;
  onChange: (value: Value) => void;
}

export function HabitInput({ habit, entry, onChange }: Props) {
  // Workout / journal habits are completed by their app (finish a workout,
  // write an entry), never by hand: render a read-only checkmark instead of
  // an interactive input.
  if (habit.type === 'workout' || habit.type === 'journal') {
    const done = entry?.valueBool === true;
    return (
      <AutoCheck
        $checked={done}
        role="img"
        aria-label={done ? 'Completed automatically' : 'Not completed yet'}
        title={
          habit.type === 'workout'
            ? 'Completed automatically when you finish a workout'
            : 'Completed automatically when you write a journal entry'
        }
      >
        <CheckMark viewBox="0 0 24 24" aria-hidden="true" $visible={done}>
          <polyline points="5 12.5 10 17.5 19 7.5" />
        </CheckMark>
      </AutoCheck>
    );
  }
  switch (habit.type) {
    case 'boolean':
      return (
        <Check
          type="button"
          $checked={entry?.valueBool === true}
          aria-pressed={entry?.valueBool === true}
          onClick={() =>
            onChange({
              valueBool: !(entry?.valueBool === true),
              valueNum: null,
              valueText: null,
              valueTime: null,
            })
          }
        >
          <CheckMark viewBox="0 0 24 24" aria-hidden="true" $visible={entry?.valueBool === true}>
            <polyline points="5 12.5 10 17.5 19 7.5" />
          </CheckMark>
        </Check>
      );
    case 'integer':
      return (
        <NumberInput
          step={1}
          habit={habit}
          value={entry?.valueNum}
          onChange={(n) => onChange({ valueBool: null, valueNum: n, valueText: null, valueTime: null })}
        />
      );
    case 'decimal':
    case 'duration':
      return (
        <NumberInput
          step={habit.type === 'duration' ? 1 : 0.1}
          habit={habit}
          value={entry?.valueNum}
          onChange={(n) => onChange({ valueBool: null, valueNum: n, valueText: null, valueTime: null })}
        />
      );
    case 'duration_hours':
      return (
        <DurationHoursInput
          value={entry?.valueNum}
          onChange={(n) => onChange({ valueBool: null, valueNum: n, valueText: null, valueTime: null })}
        />
      );
    case 'multi_boolean':
      return (
        <MultiBooleanInput
          habit={habit}
          value={entry?.valueNum}
          onChange={(n) => onChange({ valueBool: null, valueNum: n, valueText: null, valueTime: null })}
        />
      );
    case 'score': {
      const min = habit.min != null ? Number(habit.min) : 1;
      const max = habit.max != null ? Number(habit.max) : 10;
      const options: number[] = [];
      for (let i = min; i <= max; i += 1) options.push(i);
      return (
        <Select
          value={entry?.valueNum != null ? String(entry.valueNum) : ''}
          onChange={(e) =>
            onChange({
              valueBool: null,
              valueNum: e.target.value === '' ? null : Number(e.target.value),
              valueText: null,
              valueTime: null,
            })
          }
        >
          <option value="">—</option>
          {options.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Select>
      );
    }
    case 'time':
      return (
        <Input
          type="time"
          value={entry?.valueTime ?? ''}
          onChange={(e) =>
            onChange({
              valueBool: null,
              valueNum: null,
              valueText: null,
              valueTime: e.target.value || null,
            })
          }
        />
      );
    case 'text':
      return (
        <Input
          type="text"
          value={entry?.valueText ?? ''}
          onChange={(e) =>
            onChange({
              valueBool: null,
              valueNum: null,
              valueText: e.target.value || null,
              valueTime: null,
            })
          }
        />
      );
  }
}

function NumberInput({
  step,
  habit,
  value,
  onChange,
}: {
  step: number;
  habit: Habit;
  value: string | number | null | undefined;
  onChange: (n: number | null) => void;
}) {
  return (
    <Input
      type="number"
      step={step}
      min={habit.min != null ? Number(habit.min) : undefined}
      max={habit.max != null ? Number(habit.max) : undefined}
      value={value != null ? String(value) : ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}

// A duration entered as HH:MM but stored as a decimal number of hours in
// valueNum (e.g. 1h30m → 1.5). Both sub-fields empty clears the entry.
function DurationHoursInput({
  value,
  onChange,
}: {
  value: string | number | null | undefined;
  onChange: (n: number | null) => void;
}) {
  const total = value != null && value !== '' ? Number(value) : null;
  const whole = total != null ? Math.floor(total) : null;
  const hours = whole != null ? String(whole) : '';
  const minutes = total != null ? String(Math.round((total - whole!) * 60)) : '';

  const emit = (h: string, m: string) => {
    if (h === '' && m === '') return onChange(null);
    const hh = h === '' ? 0 : Number(h);
    const mm = m === '' ? 0 : Number(m);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    onChange(hh + mm / 60);
  };

  return (
    <HmWrap>
      <HmField>
        <Input
          type="number"
          step={1}
          min={0}
          value={hours}
          aria-label="hours"
          onChange={(e) => emit(e.target.value, minutes)}
        />
        <HmUnit>h</HmUnit>
      </HmField>
      <HmField>
        <Input
          type="number"
          step={1}
          min={0}
          max={59}
          value={minutes}
          aria-label="minutes"
          onChange={(e) => emit(hours, e.target.value)}
        />
        <HmUnit>m</HmUnit>
      </HmField>
    </HmWrap>
  );
}

// A tap-to-count tracker (e.g. 5 glasses of water): N dots that fill as you
// press +. The target N is the habit's goal target (falling back to max, then
// a sane default). The count is stored in valueNum; tapping a dot sets/clears
// the count up to that position, and + is capped at the target.
function MultiBooleanInput({
  habit,
  value,
  onChange,
}: {
  habit: Habit;
  value: string | number | null | undefined;
  onChange: (n: number | null) => void;
}) {
  const target =
    habit.goalTarget != null ? Number(habit.goalTarget) : habit.max != null ? Number(habit.max) : 5;
  const count = value != null && value !== '' ? Number(value) : 0;
  const set = (n: number) => onChange(n <= 0 ? null : n);

  return (
    <MbWrap>
      <Dots>
        {Array.from({ length: target }, (_, i) => {
          const filled = i < count;
          // Tap the highest filled dot to step down; any other dot fills to it.
          const next = filled && i + 1 === count ? i : i + 1;
          return (
            <Dot
              key={i}
              type="button"
              $filled={filled}
              aria-label={`Set to ${next}`}
              onClick={() => set(next)}
            />
          );
        })}
      </Dots>
      <Plus
        type="button"
        aria-label="Add one"
        disabled={count >= target}
        onClick={() => set(Math.min(count + 1, target))}
      >
        +
      </Plus>
      <MbCount>
        {count} / {target}
      </MbCount>
    </MbWrap>
  );
}

const HmWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const HmField = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  input {
    width: 60px;
  }
`;

const HmUnit = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MbWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const Dots = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

const Dot = styled.button<{ $filled: boolean }>`
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid
    ${({ theme, $filled }) => ($filled ? theme.colors.success : theme.colors.borderStrong)};
  background: ${({ theme, $filled }) => ($filled ? theme.colors.success : 'transparent')};
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.spring};

  &:hover {
    border-color: ${({ theme }) => theme.colors.success};
  }

  &:active {
    transform: scale(0.85);
  }
`;

const Plus = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1;
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const MbCount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const CheckMark = styled.svg<{ $visible: boolean }>`
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;

  /* Draw-in effect: the check strokes itself when it appears. */
  polyline {
    stroke-dasharray: 24;
    stroke-dashoffset: ${({ $visible }) => ($visible ? 0 : 24)};
    transition: stroke-dashoffset ${({ theme }) => theme.motion.normal}
      ${({ theme }) => theme.motion.ease};
  }
`;

// The read-only counterpart of Check for linked habits: same look, but a plain
// span with no hover/press affordances — the source app flips it, not the user.
const AutoCheck = styled.span<{ $checked: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px dashed
    ${({ theme, $checked }) => ($checked ? 'transparent' : theme.colors.borderStrong)};
  background: ${({ theme, $checked }) =>
    $checked
      ? `linear-gradient(135deg, ${theme.colors.success}, color-mix(in srgb, ${theme.colors.success} 72%, #0a4426))`
      : 'transparent'};
  box-shadow: ${({ theme, $checked }) =>
    $checked ? `0 4px 14px ${theme.colors.successSoft}` : 'none'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Check = styled.button<{ $checked: boolean }>`
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid
    ${({ theme, $checked }) => ($checked ? 'transparent' : theme.colors.borderStrong)};
  background: ${({ theme, $checked }) =>
    $checked
      ? `linear-gradient(135deg, ${theme.colors.success}, color-mix(in srgb, ${theme.colors.success} 72%, #0a4426))`
      : 'transparent'};
  box-shadow: ${({ theme, $checked }) =>
    $checked ? `0 4px 14px ${theme.colors.successSoft}` : 'none'};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.spring};

  &:hover {
    border-color: ${({ theme, $checked }) => ($checked ? 'transparent' : theme.colors.success)};
  }

  &:active {
    transform: scale(0.88);
  }
`;
