import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { api, todayISO } from '../api';
import type { DayPayload, Entry, Habit, HabitGroup } from '../types';
import { HabitInput } from '../components/HabitInput';
import { goalOf, goalSummary } from '../components/GoalEditor';
import { isGoalableType, meetsGoal } from '../goal';
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

  // Only the habits scheduled (due) today are shown; the rest are reachable
  // from History. weekly_count habits drop off once their weekly target is met.
  const dueHabits = useMemo(() => {
    if (!data) return [];
    const due = new Set(data.dueHabitIds);
    return data.habits.filter((h) => due.has(h.id));
  }, [data]);

  // Day progress: how many due habits count as "done" (goal met).
  const doneCount = useMemo(
    () =>
      dueHabits.filter((h) => {
        const entry = entriesByHabit.get(h.id);
        return entry != null && meetsGoal(h, entry);
      }).length,
    [dueHabits, entriesByHabit],
  );

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
    // Tap/select inputs commit instantly; free-typed values wait for a pause.
    const instant =
      habit.type === 'boolean' ||
      habit.type === 'score' ||
      habit.type === 'time' ||
      habit.type === 'multi_boolean';
    const debounce = instant ? 0 : 500;
    const t = setTimeout(() => saveEntry(habit, patch), debounce);
    saveTimers.current.set(habit.id, t);
  };

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Muted>Loading…</Muted>;

  const progressPct = dueHabits.length > 0 ? Math.round((doneCount / dueHabits.length) * 100) : 0;

  return (
    <>
      <PageHeader>
        <H1>Today</H1>
        <Muted>{formatHumanDate(date)}</Muted>
      </PageHeader>

      {dueHabits.length > 0 && (
        <ProgressCard>
          <ProgressText>
            <ProgressCount>
              {doneCount}<ProgressTotal> / {dueHabits.length} done</ProgressTotal>
            </ProgressCount>
            <ProgressPct $complete={progressPct === 100}>
              {progressPct === 100 ? 'All done 🎉' : `${progressPct}%`}
            </ProgressPct>
          </ProgressText>
          <ProgressTrack>
            <ProgressFill style={{ width: `${progressPct}%` }} $complete={progressPct === 100} />
          </ProgressTrack>
        </ProgressCard>
      )}

      {data.habits.length === 0 ? (
        <Card>
          <Muted>No habits yet. Add some on the Settings page.</Muted>
        </Card>
      ) : dueHabits.length === 0 ? (
        <Card>
          <Muted>Nothing scheduled for today 🎉</Muted>
        </Card>
      ) : (
        <List>
          {dueHabits.map((habit) => {
            const entry = entriesByHabit.get(habit.id) ?? null;
            const group = habit.groupId ? groupById.get(habit.groupId) : null;
            const hasGoal = isGoalableType(habit.type) && habit.goalTarget != null;
            const met = hasGoal && entry != null && meetsGoal(habit, entry);
            const done = entry != null && meetsGoal(habit, entry);
            return (
              <HabitRow key={habit.id} $accent={group?.color ?? null} $done={done}>
                <Label>
                  <Name>{habit.name}</Name>
                  {habit.description && <Description>{habit.description}</Description>}
                  <Meta>
                    {group && <GroupTag $color={group.color}>{group.name}</GroupTag>}
                    <TypeTag>{typeLabel(habit)}</TypeTag>
                    {hasGoal && (
                      <GoalBadge $met={met}>
                        {met ? '✓ ' : ''}
                        {goalSummary(habit.type, habit.unit, goalOf(habit))}
                      </GoalBadge>
                    )}
                    {savingIds.has(habit.id) && <SavingDot />}
                  </Meta>
                </Label>
                <Control>
                  <HabitInput habit={habit} entry={entry} onChange={(v) => onChange(habit, v)} />
                </Control>
              </HabitRow>
            );
          })}
        </List>
      )}
    </>
  );
}

// Friendlier display names for the enum values that read awkwardly raw.
const TYPE_LABELS: Partial<Record<Habit['type'], string>> = {
  duration_hours: 'duration',
  multi_boolean: 'multi-boolean',
};

function typeLabel(h: Habit): string {
  // Linked habits: show where the auto-completion comes from, not the raw type.
  if (h.source) return h.source === 'fitness_workout' ? 'auto · fitness' : 'auto · journal';
  const base = TYPE_LABELS[h.type] ?? h.type;
  if (h.type === 'multi_boolean') {
    const target = h.goalTarget != null ? Number(h.goalTarget) : h.max != null ? Number(h.max) : null;
    return target != null ? `${base} · 0–${target}` : base;
  }
  if (h.unit) return `${base} · ${h.unit}`;
  if (h.type === 'score' && h.min != null && h.max != null) return `score ${h.min}–${h.max}`;
  return base;
}

function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

const ProgressCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.lg};
  margin-bottom: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ProgressText = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const ProgressCount = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-variant-numeric: tabular-nums;
`;

const ProgressTotal = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ProgressPct = styled.span<{ $complete: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $complete }) => ($complete ? theme.colors.success : theme.colors.textMuted)};
`;

const ProgressTrack = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $complete: boolean }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $complete }) =>
    $complete
      ? `linear-gradient(90deg, ${theme.colors.success}, color-mix(in srgb, ${theme.colors.success} 70%, #fff))`
      : theme.colors.gradientPrimary};
  transition: width ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease};
`;

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space.md};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space.sm};
  }
`;

const HabitRow = styled.div<{ $accent: string | null; $done: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  padding-left: calc(${({ theme }) => theme.space.lg} + 6px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid
    ${({ theme, $done }) =>
      $done ? `color-mix(in srgb, ${theme.colors.success} 32%, ${theme.colors.border})` : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.xs};
  transition:
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  /* Rounded group-color accent bar, inset from the card edges. */
  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 12px;
    bottom: 12px;
    width: 4px;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ $accent, theme }) => $accent ?? theme.colors.borderStrong};
    opacity: ${({ $accent }) => ($accent ? 1 : 0.6)};
  }
`;

const GroupTag = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 16%, transparent)`};
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Label = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const Name = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Description = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  margin-top: 2px;
`;

const TypeTag = styled.span`
  color: ${({ theme }) => theme.colors.textFaint};
`;

const GoalBadge = styled.span<{ $met: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $met }) => ($met ? 'transparent' : theme.colors.border)};
  background: ${({ theme, $met }) => ($met ? theme.colors.successSoft : 'transparent')};
  color: ${({ theme, $met }) => ($met ? theme.colors.success : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
`;

const SavingDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.warning};
  animation: pulse 1s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
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
