import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getIndiaCalendarDate,
  millisecondsUntilNextIndiaMidnight,
  PUBLIC_PARTNER_DAILY_LIMIT,
  PUBLIC_PARTNER_BURST_LIMIT,
} from '../lib/public-usage-policy.ts';

test('free partner policy is five checks per day with a three-in-five-minute burst guard', () => {
  assert.equal(PUBLIC_PARTNER_DAILY_LIMIT, 5);
  assert.equal(PUBLIC_PARTNER_BURST_LIMIT, 3);
});

test('India calendar date follows Asia/Kolkata rather than UTC', () => {
  assert.equal(getIndiaCalendarDate(new Date('2026-10-31T18:40:00.000Z')), '2026-11-01');
  assert.equal(getIndiaCalendarDate(new Date('2026-10-31T18:20:00.000Z')), '2026-10-31');
});

test('daily reset is midnight India time', () => {
  const now = new Date('2026-10-31T18:00:00.000Z'); // 23:30 IST
  assert.equal(millisecondsUntilNextIndiaMidnight(now), 30 * 60 * 1000);
});
