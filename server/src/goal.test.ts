import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { meetsGoal, isGoalableType, type Goalable, type GoalEntry } from './goal.js';

// A blank entry; spread overrides to set the value(s) under test.
function entry(over: Partial<GoalEntry> = {}): GoalEntry {
  return { valueBool: null, valueNum: null, valueText: null, valueTime: null, ...over };
}

function habit(over: Partial<Goalable>): Goalable {
  return { type: 'integer', goalTarget: null, goalDirection: 'at_least', ...over };
}

describe('meetsGoal — boolean', () => {
  it('is done only when checked', () => {
    const h = habit({ type: 'boolean' });
    assert.equal(meetsGoal(h, entry({ valueBool: true })), true);
    assert.equal(meetsGoal(h, entry({ valueBool: false })), false);
    assert.equal(meetsGoal(h, entry()), false);
  });
});

describe('meetsGoal — numeric with an at_least goal', () => {
  const h = habit({ type: 'integer', goalTarget: 8000, goalDirection: 'at_least' });
  it('meets the goal at or above the target', () => {
    assert.equal(meetsGoal(h, entry({ valueNum: 8000 })), true);
    assert.equal(meetsGoal(h, entry({ valueNum: 12000 })), true);
  });
  it('misses below the target', () => {
    assert.equal(meetsGoal(h, entry({ valueNum: 7999 })), false);
    assert.equal(meetsGoal(h, entry({ valueNum: 0 })), false);
  });
  it('an absent value is not done', () => {
    assert.equal(meetsGoal(h, entry()), false);
  });
});

describe('meetsGoal — numeric with an at_most goal', () => {
  const h = habit({ type: 'decimal', goalTarget: 2, goalDirection: 'at_most' });
  it('meets the goal at or below the target', () => {
    assert.equal(meetsGoal(h, entry({ valueNum: 2 })), true);
    assert.equal(meetsGoal(h, entry({ valueNum: 1.5 })), true);
    assert.equal(meetsGoal(h, entry({ valueNum: 0 })), true);
  });
  it('misses above the target', () => {
    assert.equal(meetsGoal(h, entry({ valueNum: 2.1 })), false);
  });
});

describe('meetsGoal — numeric without a goal (back-compat)', () => {
  const h = habit({ type: 'integer', goalTarget: null });
  it('any logged value counts as done', () => {
    assert.equal(meetsGoal(h, entry({ valueNum: 0 })), true);
    assert.equal(meetsGoal(h, entry({ valueNum: 42 })), true);
  });
  it('no value is not done', () => {
    assert.equal(meetsGoal(h, entry()), false);
  });
});

describe('meetsGoal — value/target coercion', () => {
  it('handles string/Decimal-like values and targets', () => {
    const h = habit({ type: 'decimal', goalTarget: '2.0', goalDirection: 'at_least' });
    assert.equal(meetsGoal(h, entry({ valueNum: '2.5' })), true);
    assert.equal(meetsGoal(h, entry({ valueNum: '1.0' })), false);
  });
  it('a non-numeric value never meets a goal', () => {
    const h = habit({ type: 'integer', goalTarget: 5 });
    assert.equal(meetsGoal(h, entry({ valueNum: 'abc' })), false);
  });
});

describe('meetsGoal — time/text fall back to presence', () => {
  it('text is done when non-empty', () => {
    const h = habit({ type: 'text' });
    assert.equal(meetsGoal(h, entry({ valueText: 'note' })), true);
    assert.equal(meetsGoal(h, entry({ valueText: '' })), false);
    assert.equal(meetsGoal(h, entry()), false);
  });
  it('time is done when present', () => {
    const h = habit({ type: 'time' });
    assert.equal(meetsGoal(h, entry({ valueTime: '07:30' })), true);
    assert.equal(meetsGoal(h, entry()), false);
  });
});

describe('isGoalableType', () => {
  it('only numeric value types support a goal target', () => {
    for (const t of ['integer', 'decimal', 'score', 'duration', 'duration_hours', 'multi_boolean'] as const) {
      assert.equal(isGoalableType(t), true);
    }
    for (const t of ['boolean', 'time', 'text'] as const) {
      assert.equal(isGoalableType(t), false);
    }
  });
});
