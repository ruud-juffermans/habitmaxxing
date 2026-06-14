import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import type { Entry, Habit, HabitGroup, HabitType } from '../types';
import { scheduledOccurrences } from '../schedule';
import { H1, Muted, PageHeader } from '../components/ui';

type Aggregate =
  | { kind: 'boolean'; completed: number; total: number }
  | { kind: 'numeric'; entries: number; avg: number | null; sum: number }
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
    return (
      <>
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
    const completed = items.filter((e) => e.valueBool === true).length;
    return { kind: 'boolean', completed, total: booleanTotal(habit, range) };
  }
  if (isNumericType(habit.type)) {
    const nums = items
      .map((e) => (e.valueNum != null ? Number(e.valueNum) : null))
      .filter((v): v is number => v !== null && !Number.isNaN(v));
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      kind: 'numeric',
      entries: nums.length,
      avg: nums.length ? sum / nums.length : null,
      sum,
    };
  }
  const count = items.filter(
    (e) => e.valueText != null || e.valueTime != null || e.valueBool === true,
  ).length;
  return { kind: 'count', entries: count };
}

/**
 * How many times a boolean habit was *scheduled* in this range — the completion
 * denominator. The range start is clamped to the habit's creation date so it
 * isn't penalised for days before it existed, then we count scheduled
 * occurrences honouring its schedule (daily, weekdays, weekly_count, interval).
 */
function booleanTotal(habit: Habit, range: PeriodRange): number {
  const created = isoDate(new Date(habit.createdAt));
  const start = created > range.from ? created : range.from;
  if (start > range.to) return 0;
  return scheduledOccurrences(habit, start, range.to);
}

function isNumericType(t: HabitType): boolean {
  return t === 'integer' || t === 'decimal' || t === 'score' || t === 'duration';
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
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin: 0;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: ${({ theme }) => theme.space.md};
`;

const Tile = styled.div<{ $accent: string | null }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $accent, theme }) => $accent ?? theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
`;

const Name = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.lg};
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
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;
