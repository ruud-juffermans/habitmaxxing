import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { api } from '../api';
import type { Habit, HabitGroup, HabitType } from '../types';
import { Button, H1, Input, PageHeader, Select, Muted, TextArea } from '../components/ui';

const TYPES: HabitType[] = ['boolean', 'integer', 'decimal', 'score', 'time', 'duration', 'text'];
const DEFAULT_COLOR = '#3357ff';

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
  const [newGroupId, setNewGroupId] = useState<string>('');

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_COLOR);

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
      sortOrder: (habits[habits.length - 1]?.sortOrder ?? 0) + 10,
      groupId: newGroupId || null,
    });
    setNewName('');
    setNewDescription('');
    setNewUnit('');
    setNewMin('');
    setNewMax('');
    setNewType('boolean');
    setNewGroupId('');
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

  return (
    <>
      <PageHeader>
        <H1>Settings</H1>
        <Muted>Customize what you track</Muted>
      </PageHeader>

      <Section>
        <SectionTitle>Groups</SectionTitle>
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
                <Swatch style={{ background: g.color }} />
                <Input
                  value={g.name}
                  onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, name: e.target.value } : x))}
                  onBlur={(e) => e.target.value !== '' && onUpdateGroup(g.id, { name: e.target.value })}
                />
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
                  type="number"
                  value={String(g.sortOrder)}
                  onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, sortOrder: Number(e.target.value) } : x))}
                  onBlur={(e) => onUpdateGroup(g.id, { sortOrder: Number(e.target.value) })}
                />
                <Button variant="danger" onClick={() => onDeleteGroup(g.id)}>Delete</Button>
              </GroupRow>
            ))}
          </GroupList>
        )}
</Section>
<Section>
        <SectionTitle>Add habit</SectionTitle>
        <AddRow>
          <Input
            placeholder="Habit name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Select value={newType} onChange={(e) => setNewType(e.target.value as HabitType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
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
      </Section>

      <Section>
        <SectionTitle>Habits</SectionTitle>
        {loading ? (
          <Muted>Loading…</Muted>
        ) : (
          <TableWrap>
          <Table>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Group</Th>
                <Th>Unit</Th>
                <Th>Min</Th>
                <Th>Max</Th>
                <Th>Order</Th>
                <Th>Archived</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.id}>
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
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
              ))}
            </tbody>
          </Table>
          </TableWrap>
        )}
      </Section>
    </>
  );
}

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

const AddRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 80px 80px auto;
  gap: ${({ theme }) => theme.space.sm};

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

const GroupAddRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 48px auto;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.md};

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
  grid-template-columns: 16px 1fr 48px 80px auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
`;

const Swatch = styled.div`
  width: 16px;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ColorInput = styled.input`
  width: 48px;
  height: 36px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
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
