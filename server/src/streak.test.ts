import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, type StreakEntry, type StreakHabit } from './streak.js';

const dailyHabit: StreakHabit = {
  type: 'boolean',
  goalTarget: null,
  goalDirection: 'at_least',
  scheduleKind: 'daily',
  scheduleDays: [],
  scheduleTarget: null,
  scheduleEvery: null,
  scheduleAnchor: null,
};

// Build a "done" boolean entry on a given day.
function done(date: string): StreakEntry {
  return { entryDate: new Date(`${date}T00:00:00.000Z`), valueBool: true, valueNum: null, valueText: null, valueTime: null };
}

// 2026-06-14 (Sun) is "today" throughout; the window starts 30 days earlier.
const today = '2026-06-14';
const since = '2026-05-15';

describe('computeStreak — daily', () => {
  it('counts consecutive completed days ending today', () => {
    const entries = [done('2026-06-14'), done('2026-06-13'), done('2026-06-12')];
    assert.deepEqual(computeStreak(dailyHabit, entries, today, since), { streak: 3, streakUnit: 'days' });
  });

  it("does not break when today isn't logged yet", () => {
    const entries = [done('2026-06-13'), done('2026-06-12')];
    assert.equal(computeStreak(dailyHabit, entries, today, since).streak, 2);
  });

  it('breaks on a missed past day', () => {
    const entries = [done('2026-06-14'), done('2026-06-12')]; // 13th missing
    assert.equal(computeStreak(dailyHabit, entries, today, since).streak, 1);
  });

  it('a bare false boolean does not count', () => {
    const notDone: StreakEntry = { entryDate: new Date('2026-06-14T00:00:00.000Z'), valueBool: false, valueNum: null, valueText: null, valueTime: null };
    assert.equal(computeStreak(dailyHabit, [notDone, done('2026-06-13')], today, since).streak, 1);
  });
});

describe('computeStreak — weekdays', () => {
  const habit: StreakHabit = { ...dailyHabit, scheduleKind: 'weekdays', scheduleDays: [1, 3, 5] };
  it('skips non-scheduled days without breaking', () => {
    // Scheduled days up to Fri 2026-06-12: 6/12(Fri), 6/10(Wed), 6/8(Mon)...
    // today 6/14 is Sun (not scheduled) so it's ignored.
    const entries = [done('2026-06-12'), done('2026-06-10'), done('2026-06-08')];
    assert.equal(computeStreak(habit, entries, today, since).streak, 3);
  });

  it('breaks when a scheduled day was missed', () => {
    const entries = [done('2026-06-12'), done('2026-06-08')]; // missed Wed 6/10
    assert.equal(computeStreak(habit, entries, today, since).streak, 1);
  });
});

describe('computeStreak — interval', () => {
  const habit: StreakHabit = { ...dailyHabit, scheduleKind: 'interval', scheduleEvery: 3, scheduleAnchor: new Date('2026-06-01T00:00:00.000Z') };
  it('counts consecutive anchor-aligned days', () => {
    // Due days: 6/13, 6/10, 6/7, 6/4, 6/1 (today 6/14 is not aligned -> ignored).
    const entries = [done('2026-06-13'), done('2026-06-10'), done('2026-06-07')];
    assert.equal(computeStreak(habit, entries, today, since).streak, 3);
  });
});

describe('computeStreak — weekly_count', () => {
  const habit: StreakHabit = { ...dailyHabit, scheduleKind: 'weekly_count', scheduleTarget: 3 };

  it('reports streak in weeks', () => {
    assert.equal(computeStreak(habit, [], today, since).streakUnit, 'weeks');
  });

  it('counts the current week once the target is met', () => {
    // ISO week of today (Sun 6/14) is Mon 6/8..Sun 6/14.
    const entries = [done('2026-06-08'), done('2026-06-10'), done('2026-06-12')];
    assert.equal(computeStreak(habit, entries, today, since).streak, 1);
  });

  it("does not break while the current week is still short of target", () => {
    // Current week only 1/3, but the prior full week (6/1..6/7) met target.
    const entries = [done('2026-06-08'), done('2026-06-01'), done('2026-06-03'), done('2026-06-05')];
    assert.equal(computeStreak(habit, entries, today, since).streak, 1);
  });

  it('breaks on a fully past week that missed target', () => {
    // Current week met (3), previous week only 1 -> streak stops at 1.
    const entries = [
      done('2026-06-08'), done('2026-06-10'), done('2026-06-12'), // this week: 3
      done('2026-06-01'), // prev week: 1 (< 3)
    ];
    assert.equal(computeStreak(habit, entries, today, since).streak, 1);
  });
});

describe('computeStreak — numeric goal', () => {
  // "8000 steps", daily, counts a day only when the value clears the target.
  const stepsHabit: StreakHabit = { ...dailyHabit, type: 'integer', goalTarget: 8000, goalDirection: 'at_least' };
  function logged(date: string, num: number): StreakEntry {
    return { entryDate: new Date(`${date}T00:00:00.000Z`), valueBool: null, valueNum: num, valueText: null, valueTime: null };
  }

  it('counts only days that met the target', () => {
    const entries = [logged('2026-06-13', 8200), logged('2026-06-12', 9000)];
    assert.equal(computeStreak(stepsHabit, entries, today, since).streak, 2);
  });

  it('a logged-but-short day breaks the streak', () => {
    // 6/13 fell short (4000 < 8000), so the streak ends before it.
    const entries = [logged('2026-06-13', 4000), logged('2026-06-12', 9000)];
    assert.equal(computeStreak(stepsHabit, entries, today, since).streak, 0);
  });

  it('an at_most goal counts days at or below the target', () => {
    // "<= 2 coffees", daily.
    const coffee: StreakHabit = { ...dailyHabit, type: 'integer', goalTarget: 2, goalDirection: 'at_most' };
    const entries = [logged('2026-06-13', 1), logged('2026-06-12', 3)]; // 6/12 over the limit
    assert.equal(computeStreak(coffee, entries, today, since).streak, 1);
  });
});
