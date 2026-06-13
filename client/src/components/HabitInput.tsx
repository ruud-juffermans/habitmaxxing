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
