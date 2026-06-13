import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import type { Entry, Habit, HabitGroup, HabitType } from '../types';
import { H1, Muted, PageHeader } from '../components/ui';

type Aggregate =
  | { kind: 'boolean'; completed: number; total: number }
  | { kind: 'numeric'; entries: number; avg: number | null; sum: number }
  | { kind: 'count'; entries: number };

interface PeriodRange {
  from: string;
  to: string;
  days: number;
}

export function Periods() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [weekEntries, setWeekEntries] = useState<Entry[]>([]);
  const [monthEntries, setMonthEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const week = useMemo(() => currentWeekRange(new Date()), []);
  const month = useMemo(() => currentMonthRange(new Date()), []);

  useEffect(() => {
    Promise.all([
      api.listHabits(),
      api.listGroups(),
      api.getRange(week.from, week.to),
      api.getRange(month.from, month.to),
    ]).then(([h, g, w, m]) => {
      setHabits(h);
      setGroups(g);
      setWeekEntries(w);
      setMonthEntries(m);
      setLoaded(true);
    });
  }, [week.from, week.to, month.from, month.to]);

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
        <H1>Periods</H1>
        <Muted>Current week & month</Muted>
      </PageHeader>

      <Periods2Col>
        <PeriodColumn
          title="This week"
          subtitle={formatWeekLabel(week)}
          entries={weekEntries}
          range={week}
          sections={sections}
        />
        <PeriodColumn
          title="This month"
          subtitle={formatMonthLabel(month)}
          entries={monthEntries}
          range={month}
          sections={sections}
        />
      </Periods2Col>
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

function PeriodColumn({
  title,
  subtitle,
  entries,
  range,
  sections,
}: {
  title: string;
  subtitle: string;
  entries: Entry[];
  range: PeriodRange;
  sections: SectionData[];
}) {
  return (
    <Column>
      <ColumnHeader>
        <ColumnTitle>{title}</ColumnTitle>
        <Muted>{subtitle}</Muted>
      </ColumnHeader>
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
                  agg={aggregate(h, entries, range.days)}
                  accent={group?.color ?? null}
                />
              ))}
            </Grid>
          </Section>
        ))}
      </Sections>
    </Column>
  );
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

function aggregate(habit: Habit, all: Entry[], daysInRange: number): Aggregate {
  const items = all.filter((e) => e.habitId === habit.id);
  if (habit.type === 'boolean') {
    const completed = items.filter((e) => e.valueBool === true).length;
    return { kind: 'boolean', completed, total: daysInRange };
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

function currentWeekRange(today: Date): PeriodRange {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diffToMon = (dow + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoDate(monday), to: isoDate(sunday), days: 7 };
}

function currentMonthRange(today: Date): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: isoDate(first), to: isoDate(last), days: last.getDate() };
}

function formatWeekLabel(range: PeriodRange): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function formatMonthLabel(range: PeriodRange): string {
  const d = new Date(`${range.from}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const Periods2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  gap: ${({ theme }) => theme.space.xl};
  align-items: start;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  min-width: 0;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding-bottom: ${({ theme }) => theme.space.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const ColumnTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin: 0;
`;

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
