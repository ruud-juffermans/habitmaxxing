import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoWeekday,
  weekStart,
  daysBetween,
  shiftDays,
  isDueOn,
  scheduledOccurrences,
  type Schedulable,
} from './schedule.js';

// A base habit with every schedule field nulled out; spread + override per case.
const base: Schedulable = {
  scheduleKind: 'daily',
  scheduleDays: [],
  scheduleTarget: null,
  scheduleEvery: null,
  scheduleAnchor: null,
};

// 2026-06-14 is a Sunday; 2026-06-15 a Monday. Used throughout.
describe('date helpers', () => {
  it('isoWeekday maps Mon..Sun to 1..7', () => {
    assert.equal(isoWeekday('2026-06-15'), 1); // Monday
    assert.equal(isoWeekday('2026-06-17'), 3); // Wednesday
    assert.equal(isoWeekday('2026-06-19'), 5); // Friday
    assert.equal(isoWeekday('2026-06-14'), 7); // Sunday
  });

  it('weekStart returns the Monday of the ISO week', () => {
    assert.equal(weekStart('2026-06-15'), '2026-06-15'); // Monday -> itself
    assert.equal(weekStart('2026-06-17'), '2026-06-15'); // Wednesday
    assert.equal(weekStart('2026-06-14'), '2026-06-08'); // Sunday -> prior Monday
  });

  it('daysBetween and shiftDays span calendar boundaries (incl. DST)', () => {
    assert.equal(daysBetween('2026-06-01', '2026-06-30'), 29);
    assert.equal(daysBetween('2026-06-30', '2026-06-01'), -29);
    // CET->CEST DST change is 2026-03-29; string math must ignore it.
    assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
    assert.equal(shiftDays('2026-12-31', 1), '2027-01-01');
  });
});

describe('isDueOn — daily', () => {
  it('is always due', () => {
    assert.equal(isDueOn(base, '2026-06-14'), true);
    assert.equal(isDueOn(base, '2026-06-15'), true);
  });
});

describe('isDueOn — weekdays', () => {
  const habit: Schedulable = { ...base, scheduleKind: 'weekdays', scheduleDays: [1, 3, 5] };
  it('is due only on configured ISO weekdays', () => {
    assert.equal(isDueOn(habit, '2026-06-15'), true); // Mon
    assert.equal(isDueOn(habit, '2026-06-16'), false); // Tue
    assert.equal(isDueOn(habit, '2026-06-17'), true); // Wed
    assert.equal(isDueOn(habit, '2026-06-14'), false); // Sun
  });
});

describe('isDueOn — weekly_count', () => {
  const habit: Schedulable = { ...base, scheduleKind: 'weekly_count', scheduleTarget: 3 };
  it('is due until the weekly target is met', () => {
    assert.equal(isDueOn(habit, '2026-06-15', 0), true);
    assert.equal(isDueOn(habit, '2026-06-15', 2), true);
    assert.equal(isDueOn(habit, '2026-06-15', 3), false);
    assert.equal(isDueOn(habit, '2026-06-15', 4), false);
  });
});

describe('isDueOn — interval', () => {
  const habit: Schedulable = { ...base, scheduleKind: 'interval', scheduleEvery: 3, scheduleAnchor: '2026-06-01' };
  it('is due on anchor-aligned days, never before the anchor', () => {
    assert.equal(isDueOn(habit, '2026-06-01'), true); // anchor
    assert.equal(isDueOn(habit, '2026-06-02'), false);
    assert.equal(isDueOn(habit, '2026-06-04'), true); // +3
    assert.equal(isDueOn(habit, '2026-06-07'), true); // +6
    assert.equal(isDueOn(habit, '2026-05-29'), false); // before anchor (would align)
  });
  it('is never due without a valid every/anchor', () => {
    assert.equal(isDueOn({ ...habit, scheduleEvery: null }, '2026-06-04'), false);
    assert.equal(isDueOn({ ...habit, scheduleAnchor: null }, '2026-06-04'), false);
  });
});

describe('scheduledOccurrences', () => {
  it('returns 0 for an inverted range', () => {
    assert.equal(scheduledOccurrences(base, '2026-06-30', '2026-06-01'), 0);
  });

  it('daily counts every day inclusive', () => {
    assert.equal(scheduledOccurrences(base, '2026-06-01', '2026-06-07'), 7);
    assert.equal(scheduledOccurrences(base, '2026-06-01', '2026-06-01'), 1);
  });

  it('weekdays counts matching days across a full month', () => {
    const habit: Schedulable = { ...base, scheduleKind: 'weekdays', scheduleDays: [1, 3, 5] };
    // June 2026: Mondays 1,8,15,22,29 (5); Wednesdays 3,10,17,24 (4); Fridays 5,12,19,26 (4) = 13.
    assert.equal(scheduledOccurrences(habit, '2026-06-01', '2026-06-30'), 13);
  });

  it('interval counts anchor-aligned days within the range', () => {
    const habit: Schedulable = { ...base, scheduleKind: 'interval', scheduleEvery: 3, scheduleAnchor: '2026-06-01' };
    // Due 1,4,7,10,13,16,19,22,25,28 in June = 10.
    assert.equal(scheduledOccurrences(habit, '2026-06-01', '2026-06-30'), 10);
    // Range starting mid-cycle: first due >= 2026-06-02 is 2026-06-04.
    assert.equal(scheduledOccurrences(habit, '2026-06-02', '2026-06-10'), 3); // 4,7,10
    // Anchor after the range end => 0.
    assert.equal(scheduledOccurrences(habit, '2026-05-01', '2026-05-31'), 0);
  });

  it('weekly_count is target × overlapping ISO weeks', () => {
    const habit: Schedulable = { ...base, scheduleKind: 'weekly_count', scheduleTarget: 3 };
    // Single ISO week (Mon 2026-06-15 .. Sun 2026-06-21).
    assert.equal(scheduledOccurrences(habit, '2026-06-15', '2026-06-21'), 3);
    // Two ISO weeks.
    assert.equal(scheduledOccurrences(habit, '2026-06-15', '2026-06-28'), 6);
    // Partial weeks at both ends still count as whole weeks (Sun..Mon spans 2 weeks).
    assert.equal(scheduledOccurrences(habit, '2026-06-14', '2026-06-15'), 6);
  });
});
