import { useMemo } from 'react';
import { todayISO } from '../api';
import { PeriodView, type PeriodRange } from './PeriodView';

// Far enough back to cover every entry; the per-habit boolean total is derived
// from each habit's creation date, so this only bounds the entries we fetch.
const EPOCH = '2000-01-01';

export function AllTime() {
  const range = useMemo<PeriodRange>(
    () => ({ from: EPOCH, to: todayISO(), days: null }),
    [],
  );
  return <PeriodView title="All time" subtitle="Everything so far" range={range} />;
}
