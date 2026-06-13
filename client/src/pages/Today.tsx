import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { api, todayISO } from '../api';
import type { DayPayload, Entry, Habit, HabitGroup } from '../types';
import { HabitInput } from '../components/HabitInput';
import { Card, H1, Muted, PageHeader } from '../components/ui';

export function Today() {
  const date = todayISO();
  const [data, setData] = useState<DayPayload | null>(null);
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDay(date).then(setData).catch((e) => setError(String(e)));
    api.listGroups().then(setGroups).catch(() => {});
  }, [date]);

  const groupById = useMemo(() => {
    const map = new Map<string, HabitGroup>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  const entriesByHabit = useMemo(() => {
    const map = new Map<string, Entry>();
    data?.entries.forEach((e) => map.set(e.habitId, e));
    return map;
  }, [data]);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const saveEntry = useCallback(
    async (habit: Habit, patch: Pick<Entry, 'valueBool' | 'valueNum' | 'valueText' | 'valueTime'>) => {
      setSavingIds((s) => new Set(s).add(habit.id));
      try {
        const saved = await api.upsertEntry({
          habitId: habit.id,
          entryDate: date,
          valueBool: patch.valueBool,
          valueNum: patch.valueNum != null ? Number(patch.valueNum) : null,
          valueText: patch.valueText,
          valueTime: patch.valueTime,
        });
        setData((prev) => {
          if (!prev) return prev;
          const others = prev.entries.filter((e) => e.habitId !== saved.habitId);
          return { ...prev, entries: [...others, saved] };
        });
      } catch (e) {
        setError(String(e));
      } finally {
        setSavingIds((s) => {
          const next = new Set(s);
          next.delete(habit.id);
          return next;
        });
      }
    },
    [date],
  );

  const onChange = (habit: Habit, patch: Pick<Entry, 'valueBool' | 'valueNum' | 'valueText' | 'valueTime'>) => {
    setData((prev) => {
      if (!prev) return prev;
      const others = prev.entries.filter((e) => e.habitId !== habit.id);
      const placeholder: Entry = {
        id: `tmp-${habit.id}`,
        habitId: habit.id,
        entryDate: date,
        valueBool: patch.valueBool ?? null,
        valueNum: patch.valueNum ?? null,
        valueText: patch.valueText ?? null,
        valueTime: patch.valueTime ?? null,
        updatedAt: new Date().toISOString(),
      };
      return { ...prev, entries: [...others, placeholder] };
    });

    const existing = saveTimers.current.get(habit.id);
    if (existing) clearTimeout(existing);
    const debounce = habit.type === 'boolean' || habit.type === 'score' || habit.type === 'time' ? 0 : 500;
    const t = setTimeout(() => saveEntry(habit, patch), debounce);
    saveTimers.current.set(habit.id, t);
  };

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Muted>Loading…</Muted>;

  return (
    <>
      <PageHeader>
        <H1>Today</H1>
        <Muted>{formatHumanDate(date)}</Muted>
      </PageHeader>

      {data.habits.length === 0 ? (
        <Card>
          <Muted>No habits yet. Add some on the Settings page.</Muted>
        </Card>
      ) : (
        <List>
          {data.habits.map((habit) => {
            const entry = entriesByHabit.get(habit.id) ?? null;
            const group = habit.groupId ? groupById.get(habit.groupId) : null;
            return (
              <Row key={habit.id} $accent={group?.color ?? null}>
                <Label>
                  <Name>{habit.name}</Name>
                  {habit.description && <Description>{habit.description}</Description>}
                  <Meta>
                    {group && <GroupTag $color={group.color}>{group.name}</GroupTag>}
                    {typeLabel(habit)}
                    {savingIds.has(habit.id) && <SavingDot />}
                  </Meta>
                </Label>
                <Control>
                  <HabitInput habit={habit} entry={entry} onChange={(v) => onChange(habit, v)} />
                </Control>
              </Row>
            );
          })}
        </List>
      )}
    </>
  );
}

function typeLabel(h: Habit): string {
  if (h.unit) return `${h.type} · ${h.unit}`;
  if (h.type === 'score' && h.min != null && h.max != null) return `score ${h.min}–${h.max}`;
  return h.type;
}

function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Row = styled.div<{ $accent: string | null }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $accent, theme }) => $accent ?? theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const GroupTag = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 20%, transparent)`};
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Label = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Description = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
`;

const SavingDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.warning};
`;

const Control = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const ErrorBox = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  padding: ${({ theme }) => theme.space.lg};
`;
