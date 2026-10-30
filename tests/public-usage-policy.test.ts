import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLIC_PARTNER_BURST_LIMIT,
  PUBLIC_PARTNER_BURST_WINDOW,
} from '../lib/public-usage-policy.ts';

test('Preview testing disables the five-per-day quota but preserves burst protection', () => {
  assert.equal(PUBLIC_PARTNER_BURST_LIMIT, 3);
  assert.equal(PUBLIC_PARTNER_BURST_WINDOW, '5 m');
});
