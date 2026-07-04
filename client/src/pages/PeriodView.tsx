import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import type { Entry, Habit, HabitGroup, HabitType } from '../types';
import { scheduledOccurrences } from '../schedule';
import { meetsGoal } from '../goal';
import { H1, Muted, PageHeader } from '../components/ui';

/** Goal attainment over the range: days the goal was met vs days scheduled. */
type GoalProgress = { completed: number; total: number };

type Aggregate =
  | { kind: 'boolean'; completed: number; total: number }
  | { kind: 'numeric'; entries: number; avg: number | null; sum: number; goal: GoalProgress | null }
  | { kind: 'count'; entries: number };

export interface PeriodRange {
  from: string;
  to: string;
  /** Fixed number of days in the range, or null to derive per-habit (all time). */
  days: number | null;
}

export function PeriodView({
  title,
  subtitle,
  range,
}: {
  title: string;
  subtitle: string;
  range: PeriodRange;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    Promise.all([
      api.listHabits(),
      api.listGroups(),
      api.getRange(range.from, range.to),
    ]).then(([h, g, e]) => {
      setHabits(h);
      setGroups(g);
      setEntries(e);
      setLoaded(true);
    });
  }, [range.from, range.to]);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.sortOrder - b.sortOrder),
    [habits],
  );

  const sections = useMemo(
    () => buildSections(sortedHabits, groups),
    [sortedHabits, groups],
  );

  if (!loaded) return <Muted>Loading…</Muted>;

  return (
    <>
      <PageHeader>
        <H1>{title}</H1>
        <Muted>{subtitle}</Muted>
      </PageHeader>

      <Sections>
        {sections.map(({ group, habits }) => (
          <Section key={group?.id ?? 'ungrouped'}>
            <SectionHeader>
              <SectionTitle $color={group?.color ?? null}>
                {group ? group.name : 'Ungrouped'}
              </SectionTitle>
              <Muted>
                {habits.length} habit{habits.length === 1 ? '' : 's'}
              </Muted>
            </SectionHeader>
            <Grid>
              {habits.map((h) => (
                <HabitTile
                  key={h.id}
                  habit={h}
                  agg={aggregate(h, entries, range)}
                  accent={group?.color ?? null}
                />
              ))}
            </Grid>
          </Section>
        ))}
      </Sections>
    </>
  );
}

interface SectionData {
  group: HabitGroup | null;
  habits: Habit[];
}

function buildSections(habits: Habit[], groups: HabitGroup[]): SectionData[] {
  const byGroup = new Map<string | null, Habit[]>();
  for (const h of habits) {
    const key = h.groupId ?? null;
    const bucket = byGroup.get(key) ?? [];
    bucket.push(h);
    byGroup.set(key, bucket);
  }
  const ordered: SectionData[] = [...groups]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((g) => byGroup.has(g.id))
    .map((g) => ({ group: g, habits: byGroup.get(g.id)! }));
  if (byGroup.has(null)) {
    ordered.push({ group: null, habits: byGroup.get(null)! });
  }
  return ordered;
}

function HabitTile({
  habit,
  agg,
  accent,
}: {
  habit: Habit;
  agg: Aggregate;
  accent: string | null;
}) {
  return (
    <Tile $accent={accent}>
      <Name>{habit.name}</Name>
      {habit.description && <Description>{habit.description}</Description>}
      <Meta>{habit.type}</Meta>
      <Rows>{renderAggregate(agg, habit)}</Rows>
    </Tile>
  );
}

function renderAggregate(agg: Aggregate, habit: Habit) {
  if (agg.kind === 'boolean') {
    const pct = agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) : 0;
    return (
      <>
        <Stat>
          <StatLabel>Completed</StatLabel>
          <StatValue>
            {agg.completed} / {agg.total} <Muted>({pct}%)</Muted>
          </StatValue>
        </Stat>
      </>
    );
  }
  if (agg.kind === 'numeric') {
    const goalPct =
      agg.goal && agg.goal.total > 0 ? Math.round((agg.goal.completed / agg.goal.total) * 100) : 0;
    return (
      <>
        {agg.goal && (
          <Stat>
            <StatLabel>Goal met</StatLabel>
            <StatValue>
              {agg.goal.completed} / {agg.goal.total} <Muted>({goalPct}%)</Muted>
            </StatValue>
          </Stat>
        )}
        <Stat>
          <StatLabel>Average</StatLabel>
          <StatValue>{formatNumber(agg.avg, habit.type)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Total</StatLabel>
          <StatValue>{formatNumber(agg.sum, habit.type)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Entries</StatLabel>
          <StatValue>{agg.entries}</StatValue>
        </Stat>
      </>
    );
  }
  return (
    <Stat>
      <StatLabel>Entries</StatLabel>
      <StatValue>{agg.entries}</StatValue>
    </Stat>
  );
}

function aggregate(habit: Habit, all: Entry[], range: PeriodRange): Aggregate {
  const items = all.filter((e) => e.habitId === habit.id);
  if (habit.type === 'boolean') {
    const completed = items.filter((e) => meetsGoal(habit, e)).length;
    return { kind: 'boolean', completed, total: scheduledTotal(habit, range) };
  }
  if (isNumericType(habit.type)) {
    const nums = items
      .map((e) => (e.valueNum != null ? Number(e.valueNum) : null))
      .filter((v): v is number => v !== null && !Number.isNaN(v));
    const sum = nums.reduce((a, b) => a + b, 0);
    // Goal attainment is only meaningful once a target is set.
    const goal =
      habit.goalTarget != null
        ? { completed: items.filter((e) => meetsGoal(habit, e)).length, total: scheduledTotal(habit, range) }
        : null;
    return {
      kind: 'numeric',
      entries: nums.length,
      avg: nums.length ? sum / nums.length : null,
      sum,
      goal,
    };
  }
  const count = items.filter(
    (e) => e.valueText != null || e.valueTime != null || e.valueBool === true,
  ).length;
  return { kind: 'count', entries: count };
}

/**
 * How many times a habit was *scheduled* in this range — the completion
 * denominator. The range start is clamped to the habit's creation date so it
 * isn't penalised for days before it existed, then we count scheduled
 * occurrences honouring its schedule (daily, weekdays, weekly_count, interval).
 */
function scheduledTotal(habit: Habit, range: PeriodRange): number {
  const created = isoDate(new Date(habit.createdAt));
  const start = created > range.from ? created : range.from;
  if (start > range.to) return 0;
  return scheduledOccurrences(habit, start, range.to);
}

function isNumericType(t: HabitType): boolean {
  return (
    t === 'integer' ||
    t === 'decimal' ||
    t === 'score' ||
    t === 'duration' ||
    t === 'duration_hours' ||
    t === 'multi_boolean'
  );
}

function formatNumber(v: number | null, type: HabitType): string {
  if (v === null) return '—';
  if (type === 'integer') return Math.round(v).toString();
  return (Math.round(v * 100) / 100).toString();
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding-bottom: ${({ theme }) => theme.space.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h3<{ $color: string | null }>`
  position: relative;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin: 0;
  padding-left: 16px;
  color: ${({ theme }) => theme.colors.text};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color, theme }) => $color ?? theme.colors.borderStrong};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: ${({ theme }) => theme.space.md};
`;

const Tile = styled.div<{ $accent: string | null }>`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
  padding-left: calc(${({ theme }) => theme.space.lg} + 6px);
  box-shadow: ${({ theme }) => theme.shadows.xs};
  transition: box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 14px;
    bottom: 14px;
    width: 4px;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ $accent, theme }) => $accent ?? theme.colors.borderStrong};
    opacity: ${({ $accent }) => ($accent ? 1 : 0.6)};
  }
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  letter-spacing: -0.01em;
`;

const Description = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: 2px;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  margin-bottom: ${({ theme }) => theme.space.md};
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`;

const Stat = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StatValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-variant-numeric: tabular-nums;
`;
