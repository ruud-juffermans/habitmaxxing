import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import { HabitInput } from '../components/HabitInput';
import type { DayPayload, Entry, Habit, HabitGroup } from '../types';
import { H1, Muted, PageHeader } from '../components/ui';

export function History() {
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<DayPayload | null>(null);

  useEffect(() => {
    const { from, to } = monthRange(month);
    Promise.all([api.getRange(from, to), api.listHabits(true), api.listGroups()]).then(([e, h, g]) => {
      setEntries(e);
      setHabits(h);
      setGroups(g);
    });
  }, [month]);

  const groupById = useMemo(() => {
    const map = new Map<string, HabitGroup>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  const habitById = useMemo(() => {
    const map = new Map<string, Habit>();
    habits.forEach((h) => map.set(h.id, h));
    return map;
  }, [habits]);

  useEffect(() => {
    if (!selectedDate) {
      setDayData(null);
      return;
    }
    api.getDay(selectedDate).then(setDayData);
  }, [selectedDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.entryDate) ?? [];
      arr.push(e);
      map.set(e.entryDate, arr);
    });
    return map;
  }, [entries]);

  const days = useMemo(() => buildMonthGrid(month), [month]);

  const saveEntry = useCallback(
    async (habit: Habit, patch: Pick<Entry, 'valueBool' | 'valueNum' | 'valueText' | 'valueTime'>) => {
      if (!selectedDate) return;
      const saved = await api.upsertEntry({
        habitId: habit.id,
        entryDate: selectedDate,
        valueBool: patch.valueBool,
        valueNum: patch.valueNum != null ? Number(patch.valueNum) : null,
        valueText: patch.valueText,
        valueTime: patch.valueTime,
      });
      setDayData((prev) => {
        if (!prev) return prev;
        const others = prev.entries.filter((e) => e.habitId !== saved.habitId);
        return { ...prev, entries: [...others, saved] };
      });
      const { from, to } = monthRange(month);
      api.getRange(from, to).then(setEntries);
    },
    [selectedDate, month],
  );

  return (
    <>
      <PageHeader>
        <H1>History</H1>
        <Muted>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Muted>
      </PageHeader>

      <Grid>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <WeekdayCell key={d}>{d}</WeekdayCell>
        ))}
        {days.map((d) => {
          const entriesForDay = byDate.get(d.iso) ?? [];
          const bars = entriesForDay
            .map((e) => {
              const habit = habitById.get(e.habitId);
              if (!habit || habit.archived) return null;
              if (!isCompleted(habit, e)) return null;
              const group = habit.groupId ? groupById.get(habit.groupId) : null;
              return {
                id: e.id,
                color: group?.color ?? 'var(--bar-fallback)',
                groupOrder: group?.sortOrder ?? Number.POSITIVE_INFINITY,
                habitOrder: habit.sortOrder,
              };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null)
            .sort((a, b) => a.groupOrder - b.groupOrder || a.habitOrder - b.habitOrder);
          return (
            <DayCell
              key={d.iso}
              $inMonth={d.inMonth}
              $selected={selectedDate === d.iso}
              onClick={() => setSelectedDate(d.iso)}
            >
              <DayNum>{d.day}</DayNum>
              {bars.length > 0 && (
                <Bars>
                  {bars.map((b) => (
                    <Bar key={b.id} $color={b.color} />
                  ))}
                </Bars>
              )}
            </DayCell>
          );
        })}
      </Grid>

      {selectedDate && dayData && (
        <DayEditor>
          <H2Style>{formatHumanDate(selectedDate)}</H2Style>
          <EntryList>
            {dayData.habits.map((habit) => {
              const entry = dayData.entries.find((e) => e.habitId === habit.id) ?? null;
              const group = habit.groupId ? groupById.get(habit.groupId) : null;
              return (
                <EntryRow key={habit.id} $accent={group?.color ?? null}>
                  <EntryLabel>
                    <NameLine>
                      <span>{habit.name}</span>
                      {group && <GroupTag $color={group.color}>{group.name}</GroupTag>}
                    </NameLine>
                    {habit.description && <EntryDescription>{habit.description}</EntryDescription>}
                  </EntryLabel>
                  <HabitInput habit={habit} entry={entry} onChange={(v) => saveEntry(habit, v)} />
                </EntryRow>
              );
            })}
          </EntryList>
        </DayEditor>
      )}
    </>
  );
}

function monthISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return { from: isoDate(first), to: isoDate(last) };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildMonthGrid(month: string): Array<{ iso: string; day: number; inMonth: boolean }> {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - firstWeekday);
  const days: Array<{ iso: string; day: number; inMonth: boolean }> = [];
  const totalCells = Math.ceil((firstWeekday + last.getUTCDate()) / 7) * 7;
  for (let i = 0; i < totalCells; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push({
      iso: isoDate(d),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m - 1,
    });
  }
  return days;
}

function isCompleted(habit: Habit, entry: Entry): boolean {
  if (habit.type === 'boolean') return entry.valueBool === true;
  return (
    entry.valueNum != null ||
    entry.valueText != null ||
    entry.valueTime != null ||
    entry.valueBool === true
  );
}

function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.space.xs};
  margin-bottom: ${({ theme }) => theme.space.xl};
`;

const WeekdayCell = styled.div`
  padding: ${({ theme }) => theme.space.xs};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const DayCell = styled.button<{ $inMonth: boolean; $selected: boolean }>`
  position: relative;
  aspect-ratio: 1 / 1;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $selected, $inMonth }) =>
    $selected ? theme.colors.primaryText : $inMonth ? theme.colors.text : theme.colors.textMuted};
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space.xs};
  cursor: pointer;
  opacity: ${({ $inMonth }) => ($inMonth ? 1 : 0.4)};

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const DayNum = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.space.xs};
  left: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Bars = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.space.xs};
  right: ${({ theme }) => theme.space.xs};
  bottom: ${({ theme }) => theme.space.xs};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Bar = styled.span<{ $color: string }>`
  width: 100%;
  height: 5px;
  margin-bottom: 5px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $color, theme }) =>
    $color === 'var(--bar-fallback)' ? theme.colors.textMuted : $color};
`;

const DayEditor = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
`;

const H2Style = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin: 0 0 ${({ theme }) => theme.space.md};
`;

const EntryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const EntryRow = styled.div<{ $accent: string | null }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  padding: ${({ theme }) => theme.space.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent ?? 'transparent'};

  &:last-child { border-bottom: none; }
`;

const NameLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const GroupTag = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 20%, transparent)`};
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const EntryLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const EntryDescription = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;
