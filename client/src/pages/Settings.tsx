import { Fragment, useEffect, useState, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { api } from '../api';
import type { GoalDirection, Habit, HabitGroup, HabitSchedule, HabitType } from '../types';
import { isGoalableType } from '../goal';
import { Button, H1, Input, PageHeader, Select, Muted, TextArea } from '../components/ui';
import {
  ScheduleEditor,
  defaultSchedule,
  isValidSchedule,
  scheduleSummary,
} from '../components/ScheduleEditor';
import { GoalEditor, goalOf, goalSummary, type HabitGoal } from '../components/GoalEditor';
import { AccountSection } from './AccountSection';

const TYPES: HabitType[] = [
  'boolean',
  'integer',
  'decimal',
  'score',
  'time',
  'duration',
  'duration_hours',
  'multi_boolean',
  'text',
];
// Human labels for the enum values whose raw form reads awkwardly.
const TYPE_LABELS: Partial<Record<HabitType, string>> = {
  duration_hours: 'duration (hours)',
  multi_boolean: 'multi-boolean',
};
const typeLabel = (t: HabitType) => TYPE_LABELS[t] ?? t;
const DEFAULT_COLOR = '#dd2e5a';

// Pull just the schedule fields out of a habit row.
function scheduleOf(h: Habit): HabitSchedule {
  return {
    scheduleKind: h.scheduleKind,
    scheduleDays: h.scheduleDays,
    scheduleTarget: h.scheduleTarget,
    scheduleEvery: h.scheduleEvery,
    scheduleAnchor: h.scheduleAnchor,
  };
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Section>
      <SectionHeader type="button" onClick={onToggle} aria-expanded={open}>
        <SectionTitle>{title}</SectionTitle>
        <Chevron $open={open}>
          <ChevronIcon />
        </Chevron>
      </SectionHeader>
      <SectionBody $open={open}>{children}</SectionBody>
    </Section>
  );
}

export function Settings() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<HabitType>('boolean');
  const [newUnit, setNewUnit] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDirection, setNewGoalDirection] = useState<GoalDirection>('at_least');
  const [newGroupId, setNewGroupId] = useState<string>('');
  const [newSchedule, setNewSchedule] = useState<HabitSchedule>(() => defaultSchedule('daily'));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_COLOR);

  const [groupsOpen, setGroupsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');

  const reload = async () => {
    setLoading(true);
    const [h, g] = await Promise.all([api.listHabits(true), api.listGroups()]);
    setHabits(h);
    setGroups(g);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const onCreate = async () => {
    if (!newName.trim()) return;
    await api.createHabit({
      name: newName.trim(),
      description: newDescription.trim() || null,
      type: newType,
      unit: newUnit.trim() || null,
      min: newMin === '' ? null : Number(newMin),
      max: newMax === '' ? null : Number(newMax),
      // A goal only applies to numeric types; ignore the field for the rest.
      goalTarget: isGoalableType(newType) && newGoalTarget !== '' ? Number(newGoalTarget) : null,
      goalDirection: newGoalDirection,
      sortOrder: (habits[habits.length - 1]?.sortOrder ?? 0) + 10,
      groupId: newGroupId || null,
      ...newSchedule,
    });
    setNewName('');
    setNewDescription('');
    setNewUnit('');
    setNewMin('');
    setNewMax('');
    setNewGoalTarget('');
    setNewGoalDirection('at_least');
    setNewType('boolean');
    setNewGroupId('');
    setNewSchedule(defaultSchedule('daily'));
    reload();
  };

  const onUpdate = async (id: string, patch: Partial<Habit>) => {
    const cleaned: Record<string, unknown> = { ...patch };
    if ('min' in cleaned) cleaned.min = cleaned.min === '' || cleaned.min == null ? null : Number(cleaned.min);
    if ('max' in cleaned) cleaned.max = cleaned.max === '' || cleaned.max == null ? null : Number(cleaned.max);
    await api.updateHabit(id, cleaned as Partial<Habit>);
    reload();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this habit and all its entries?')) return;
    await api.deleteHabit(id);
    reload();
  };

  // Schedule edits update local state immediately (so weekday toggles feel
  // instant) and persist once the schedule is valid — no full reload/flash.
  const onScheduleChange = async (id: string, schedule: HabitSchedule) => {
    setHabits((prev) => prev.map((x) => (x.id === id ? { ...x, ...schedule } : x)));
    if (isValidSchedule(schedule)) {
      await api.updateHabit(id, schedule);
    }
  };

  // Goal edits mirror schedule edits: update local state immediately, then
  // persist. A null target is always valid (it just clears the goal).
  const onGoalChange = async (id: string, goal: HabitGoal) => {
    setHabits((prev) => prev.map((x) => (x.id === id ? { ...x, ...goal } : x)));
    await api.updateHabit(id, goal);
  };

  const onCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await api.createGroup({
      name: newGroupName.trim(),
      color: newGroupColor,
      sortOrder: (groups[groups.length - 1]?.sortOrder ?? 0) + 10,
    });
    setNewGroupName('');
    setNewGroupColor(DEFAULT_COLOR);
    reload();
  };

  const onUpdateGroup = async (id: string, patch: Partial<HabitGroup>) => {
    await api.updateGroup(id, patch);
    reload();
  };

  const onDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Habits will be ungrouped.')) return;
    await api.deleteGroup(id);
    reload();
  };

  const filteredHabits = habits.filter((h) => {
    const matchesName = h.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesGroup = !filterGroupId || h.groupId === filterGroupId;
    return matchesName && matchesGroup;
  });

  return (
    <>
      <PageHeader>
        <H1>Settings</H1>
        <Muted>Customize what you track</Muted>
      </PageHeader>

      <TopRow>
      <CollapsibleSection title="Groups" open={groupsOpen} onToggle={() => setGroupsOpen((v) => !v)}>
        <GroupAddRow>
          <Input
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <ColorInput
            type="color"
            value={newGroupColor}
            onChange={(e) => setNewGroupColor(e.target.value)}
          />
          <Button variant="primary" onClick={onCreateGroup}>Add group</Button>
        </GroupAddRow>
        {groups.length > 0 && (
          <GroupList>
            {groups.map((g) => (
              <GroupRow key={g.id}>
                <ColorInput
                  type="color"
                  value={g.color}
                  onChange={(e) => {
                    const color = e.target.value;
                    setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, color } : x));
                  }}
                  onBlur={(e) => onUpdateGroup(g.id, { color: e.target.value })}
                />
                <Input
                  value={g.name}
                  onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, name: e.target.value } : x))}
                  onBlur={(e) => e.target.value !== '' && onUpdateGroup(g.id, { name: e.target.value })}
                />
                <Input
                  type="number"
                  value={String(g.sortOrder)}
                  onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, sortOrder: Number(e.target.value) } : x))}
                  onBlur={(e) => onUpdateGroup(g.id, { sortOrder: Number(e.target.value) })}
                />
                <IconButton variant="danger" aria-label="Delete group" onClick={() => onDeleteGroup(g.id)}>
                  <TrashIcon />
                </IconButton>
              </GroupRow>
            ))}
          </GroupList>
        )}
      </CollapsibleSection>
      <CollapsibleSection title="Add habit" open={addOpen} onToggle={() => setAddOpen((v) => !v)}>
        <AddRow>
          <Input
            placeholder="Habit name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Select value={newType} onChange={(e) => setNewType(e.target.value as HabitType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </Select>
          <Select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)}>
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
          <Input
            placeholder="Unit (optional)"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
          />
          <Input
            placeholder="Min"
            type="number"
            value={newMin}
            onChange={(e) => setNewMin(e.target.value)}
          />
          <Input
            placeholder="Max"
            type="number"
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
          />
          <Button variant="primary" onClick={onCreate}>Add</Button>
        </AddRow>
        <DescriptionRow>
          <TextArea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </DescriptionRow>
        <ScheduleRow>
          <ScheduleLabel>Schedule</ScheduleLabel>
          <ScheduleEditor value={newSchedule} onChange={setNewSchedule} />
        </ScheduleRow>
        {isGoalableType(newType) && (
          <ScheduleRow>
            <ScheduleLabel>Goal</ScheduleLabel>
            <GoalEditor
              type={newType}
              unit={newUnit.trim() || null}
              value={{ goalTarget: newGoalTarget === '' ? null : Number(newGoalTarget), goalDirection: newGoalDirection }}
              onChange={(g) => {
                setNewGoalTarget(g.goalTarget == null ? '' : String(g.goalTarget));
                setNewGoalDirection(g.goalDirection);
              }}
            />
          </ScheduleRow>
        )}
      </CollapsibleSection>
      </TopRow>

      <HabitsSection>
        <SectionTitle>Habits</SectionTitle>
        <HabitsToolbar>
          <Input
            placeholder="Search habits by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </HabitsToolbar>
        {loading ? (
          <Muted>Loading…</Muted>
        ) : filteredHabits.length === 0 ? (
          <Muted>No habits found.</Muted>
        ) : (
          <TableWrap>
          <Table>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Group</Th>
                <Th>Schedule</Th>
                <Th>Unit</Th>
                <Th>Min</Th>
                <Th>Max</Th>
                <Th>Goal</Th>
                <Th>Order</Th>
                <Th>Archived</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filteredHabits.map((h) => (
                <Fragment key={h.id}>
                <tr>
                  <Td data-label="Name" $full>
                    <Input
                      value={h.name}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, name: e.target.value } : x))}
                      onBlur={(e) => e.target.value !== '' && onUpdate(h.id, { name: e.target.value })}
                    />
                  </Td>
                  <Td data-label="Description" $full>
                    <Input
                      value={h.description ?? ''}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, description: e.target.value } : x))}
                      onBlur={(e) => onUpdate(h.id, { description: e.target.value || null })}
                    />
                  </Td>
                  <Td data-label="Type">
                    <Select
                      value={h.type}
                      onChange={(e) => onUpdate(h.id, { type: e.target.value as HabitType })}
                    >
                      {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                    </Select>
                  </Td>
                  <Td data-label="Group">
                    <Select
                      value={h.groupId ?? ''}
                      onChange={(e) => onUpdate(h.id, { groupId: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Select>
                  </Td>
                  <Td data-label="Schedule">
                    <ScheduleToggle
                      type="button"
                      $open={expandedId === h.id}
                      aria-expanded={expandedId === h.id}
                      onClick={() => setExpandedId((cur) => (cur === h.id ? null : h.id))}
                    >
                      {scheduleSummary(scheduleOf(h))}
                    </ScheduleToggle>
                  </Td>
                  <Td data-label="Unit">
                    <Input
                      value={h.unit ?? ''}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, unit: e.target.value } : x))}
                      onBlur={(e) => onUpdate(h.id, { unit: e.target.value || null })}
                    />
                  </Td>
                  <Td data-label="Min">
                    <Input
                      type="number"
                      value={h.min != null ? String(h.min) : ''}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, min: e.target.value === '' ? null : Number(e.target.value) } : x))}
                      onBlur={(e) => onUpdate(h.id, { min: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Td>
                  <Td data-label="Max">
                    <Input
                      type="number"
                      value={h.max != null ? String(h.max) : ''}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, max: e.target.value === '' ? null : Number(e.target.value) } : x))}
                      onBlur={(e) => onUpdate(h.id, { max: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Td>
                  <Td data-label="Goal">
                    <ScheduleToggle
                      type="button"
                      $open={expandedId === h.id}
                      aria-expanded={expandedId === h.id}
                      disabled={!isGoalableType(h.type)}
                      onClick={() => setExpandedId((cur) => (cur === h.id ? null : h.id))}
                    >
                      {goalSummary(h.type, h.unit, goalOf(h))}
                    </ScheduleToggle>
                  </Td>
                  <Td data-label="Order">
                    <Input
                      type="number"
                      value={String(h.sortOrder)}
                      onChange={(e) => setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, sortOrder: Number(e.target.value) } : x))}
                      onBlur={(e) => onUpdate(h.id, { sortOrder: Number(e.target.value) })}
                    />
                  </Td>
                  <Td data-label="Archived">
                    <input
                      type="checkbox"
                      checked={h.archived}
                      onChange={(e) => onUpdate(h.id, { archived: e.target.checked })}
                    />
                  </Td>
                  <Td data-label="" $full>
                    <DeleteButton variant="danger" onClick={() => onDelete(h.id)}>
                      <TrashIcon />
                      Delete
                    </DeleteButton>
                  </Td>
                </tr>
                {expandedId === h.id && (
                  <tr>
                    <EditorTd colSpan={12}>
                      <EditorGroup>
                        <EditorHeading>Schedule</EditorHeading>
                        <ScheduleEditor
                          value={scheduleOf(h)}
                          onChange={(s) => onScheduleChange(h.id, s)}
                        />
                      </EditorGroup>
                      <EditorGroup>
                        <EditorHeading>Goal</EditorHeading>
                        <GoalEditor
                          type={h.type}
                          unit={h.unit}
                          value={goalOf(h)}
                          onChange={(g) => onGoalChange(h.id, g)}
                        />
                      </EditorGroup>
                    </EditorTd>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </Table>
          </TableWrap>
        )}
      </HabitsSection>
    </>
  );
}

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space.lg};
  margin-bottom: ${({ theme }) => theme.space.lg};
  align-items: stretch;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr 2fr;
  }

  & > section {
    margin-bottom: 0;
  }
`;

const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
  margin-bottom: ${({ theme }) => theme.space.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.space.md};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin: 0 0 ${({ theme }) => theme.space.md};
`;

const SectionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;

  & > h2 {
    margin: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    cursor: pointer;
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  display: none;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: transform 0.15s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: inline-flex;
  }
`;

const SectionBody = styled.div<{ $open: boolean }>`
  margin-top: ${({ theme }) => theme.space.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
  }
`;

const HabitsSection = styled.section`
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

const HabitsToolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(0, 220px);
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.md};

  & > input,
  & > select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const AddRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr minmax(0, 80px) minmax(0, 80px) auto;
  gap: ${({ theme }) => theme.space.sm};

  & > input,
  & > select {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const DescriptionRow = styled.div`
  margin-top: ${({ theme }) => theme.space.sm};
  width: 100%;
`;

const ScheduleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  margin-top: ${({ theme }) => theme.space.md};
`;

const ScheduleLabel = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ScheduleToggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const EditorGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};

  & + & {
    margin-top: ${({ theme }) => theme.space.md};
  }
`;

const EditorHeading = styled.span`
  min-width: 64px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const EditorTd = styled.td`
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.sm}
    ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: block;
    grid-column: 1 / -1;
    padding: 0;
    border-bottom: none;
  }
`;

const GroupAddRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 48px auto;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.md};

  & > input {
    min-width: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr 48px;

    & > button {
      grid-column: 1 / -1;
    }
  }
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const GroupRow = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 80px auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;

  & > input {
    min-width: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 48px 1fr 64px auto;
  }
`;

const ColorInput = styled.input`
  width: 48px;
  height: 36px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  overflow: hidden;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: ${({ theme }) => theme.radii.md};
  }
  &::-moz-color-swatch {
    border: none;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    min-width: 720px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    min-width: 0;
    display: block;

    colgroup,
    thead {
      display: none;
    }

    tbody {
      display: block;
    }

    tr {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${({ theme }) => theme.space.sm};
      padding: ${({ theme }) => theme.space.md};
      margin-bottom: ${({ theme }) => theme.space.md};
      border: 1px solid ${({ theme }) => theme.colors.border};
      border-radius: ${({ theme }) => theme.radii.md};
    }
  }
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.space.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Td = styled.td<{ $full?: boolean }>`
  padding: ${({ theme }) => theme.space.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: middle;

  input,
  select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  input[type='checkbox'] {
    width: auto;
  }

  button {
    width: 100%;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space.xs};
    padding: 0;
    border-bottom: none;
    ${({ $full }) => $full && css`grid-column: 1 / -1;`}

    &::before {
      content: attr(data-label);
      font-size: ${({ theme }) => theme.fontSizes.xs};
      color: ${({ theme }) => theme.colors.textMuted};
      font-weight: ${({ theme }) => theme.fontWeights.medium};
    }

    &[data-label='']::before {
      display: none;
    }
  }
`;

const DeleteButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs};
`;

const IconButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
`;
