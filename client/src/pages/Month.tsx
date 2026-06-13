import { useMemo } from 'react';
import { PeriodView, type PeriodRange } from './PeriodView';

export function Month() {
  const range = useMemo(() => currentMonthRange(new Date()), []);
  return <PeriodView title="Month" subtitle={formatMonthLabel(range)} range={range} />;
}

function currentMonthRange(today: Date): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: isoDate(first), to: isoDate(last), days: last.getDate() };
}

function formatMonthLabel(range: PeriodRange): string {
  const d = new Date(`${range.from}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
