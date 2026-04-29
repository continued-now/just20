import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  localDayKey,
  localDaysBetween,
  offsetLocalDay,
  startOfLocalWeekKey,
} from '../lib/dates.ts';

test('localDayKey formats local dates without UTC conversion', () => {
  assert.equal(localDayKey(new Date(2026, 3, 30, 23, 45)), '2026-04-30');
});

test('offsetLocalDay handles month boundaries', () => {
  assert.equal(offsetLocalDay('2026-03-01', -1), '2026-02-28');
  assert.equal(offsetLocalDay('2026-12-31', 1), '2027-01-01');
});

test('localDaysBetween reports signed day distance', () => {
  assert.equal(localDaysBetween('2026-04-28', '2026-04-30'), 2);
  assert.equal(localDaysBetween('2026-04-30', '2026-04-28'), -2);
});

test('startOfLocalWeekKey returns Monday', () => {
  assert.equal(startOfLocalWeekKey(new Date(2026, 3, 30)), '2026-04-27');
  assert.equal(startOfLocalWeekKey(new Date(2026, 4, 3)), '2026-04-27');
});
