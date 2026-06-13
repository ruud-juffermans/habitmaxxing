import { useMemo } from 'react';
import { PeriodView, type PeriodRange } from './PeriodView';

export function Week() {
  const range = useMemo(() => currentWeekRange(new Date()), []);
  return <PeriodView title="Week" subtitle={formatWeekLabel(range)} range={range} />;
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

function formatWeekLabel(range: PeriodRange): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
