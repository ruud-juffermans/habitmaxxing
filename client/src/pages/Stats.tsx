import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import type { Habit, HabitGroup, HabitStats } from '../types';
import { H1, Muted, PageHeader } from '../components/ui';

export function Stats() {
  const [stats, setStats] = useState<HabitStats[] | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<HabitGroup[]>([]);

  useEffect(() => {
    api.getStats().then(setStats);
    api.listHabits().then(setHabits);
    api.listGroups().then(setGroups);
  }, []);

  const habitById = useMemo(() => {
    const map = new Map<string, Habit>();
    habits.forEach((h) => map.set(h.id, h));
    return map;
  }, [habits]);

  const sections = useMemo(() => {
    if (!stats) return [];
    const byGroup = new Map<string | null, HabitStats[]>();
    for (const s of stats) {
      const groupId = habitById.get(s.habitId)?.groupId ?? null;
      const bucket = byGroup.get(groupId) ?? [];
      bucket.push(s);
      byGroup.set(groupId, bucket);
    }
    const ordered = [...groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((g) => byGroup.has(g.id))
      .map((g) => ({ group: g as HabitGroup | null, items: byGroup.get(g.id)! }));
    if (byGroup.has(null)) {
      ordered.push({ group: null, items: byGroup.get(null)! });
    }
    return ordered;
  }, [stats, groups, habitById]);

  if (!stats) return <Muted>Loading…</Muted>;

  return (
    <>
      <PageHeader>
        <H1>Stats</H1>
        <Muted>Last 30 days</Muted>
      </PageHeader>

      <Sections>
        {sections.map(({ group, items }) => (
          <Section key={group?.id ?? 'ungrouped'}>
            <SectionHeader>
              <SectionTitle $color={group?.color ?? null}>
                {group ? group.name : 'Ungrouped'}
              </SectionTitle>
              <Muted>{items.length} habit{items.length === 1 ? '' : 's'}</Muted>
            </SectionHeader>
            <Grid>
              {items.map((s) => (
                <Tile key={s.habitId} $accent={group?.color ?? null}>
                  <Name>{s.name}</Name>
                  {s.description && <Description>{s.description}</Description>}
                  <Meta>{s.type}</Meta>
                  <Rows>
                    {s.type === 'boolean' && (
                      <Stat>
                        <StatLabel>Current streak</StatLabel>
                        <StatValue>{s.streak} <Muted>day{s.streak === 1 ? '' : 's'}</Muted></StatValue>
                      </Stat>
                    )}
                    <Stat>
                      <StatLabel>7-day avg</StatLabel>
                      <StatValue>{formatAvg(s.avg7, s.type)}</StatValue>
                    </Stat>
                    <Stat>
                      <StatLabel>30-day avg</StatLabel>
                      <StatValue>{formatAvg(s.avg30, s.type)}</StatValue>
                    </Stat>
                    <Stat>
                      <StatLabel>Entries (30d)</StatLabel>
                      <StatValue>{s.totalEntries}</StatValue>
                    </Stat>
                  </Rows>
                </Tile>
              ))}
            </Grid>
          </Section>
        ))}
      </Sections>
    </>
  );
}

function formatAvg(v: number | null, type: string): string {
  if (v === null) return '—';
  if (type === 'boolean') return `${Math.round(v * 100)}%`;
  return (Math.round(v * 100) / 100).toString();
}

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
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

const SectionTitle = styled.h2<{ $color: string | null }>`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin: 0;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
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
