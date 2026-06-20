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
          {entry?.valueBool === true ? '✓' : ''}
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
    width: 56px;
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
  gap: 4px;
`;

const Dot = styled.button<{ $filled: boolean }>`
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid ${({ theme, $filled }) => ($filled ? theme.colors.success : theme.colors.border)};
  background: ${({ theme, $filled }) => ($filled ? theme.colors.success : 'transparent')};
  cursor: pointer;
`;

const Plus = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const MbCount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
`;

const Check = styled.button<{ $checked: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 2px solid ${({ theme, $checked }) => ($checked ? theme.colors.success : theme.colors.border)};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.success : 'transparent')};
  color: ${({ theme }) => theme.colors.primaryText};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
