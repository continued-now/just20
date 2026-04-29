import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizeInviteCode,
  normalizeUsername,
  validateInviteCode,
  validateUsername,
} from '../lib/validation.ts';

test('normalizeUsername trims and collapses whitespace', () => {
  assert.equal(normalizeUsername('  Jake   The   Floor  '), 'Jake The Floor');
});

test('validateUsername blocks invalid names', () => {
  assert.equal(validateUsername('A').error, 'Use at least 2 characters.');
  assert.equal(
    validateUsername('bad/name').error,
    'Use letters, numbers, spaces, dots, dashes, or underscores.'
  );
  assert.equal(validateUsername('Just20 Admin').error, 'Choose a different name.');
});

test('normalizeInviteCode accepts pasted separators', () => {
  assert.equal(normalizeInviteCode(' just abc-234 '), 'JUST-ABC234');
});

test('validateInviteCode enforces Just 20 code shape', () => {
  assert.equal(validateInviteCode('just abc234').code, 'JUST-ABC234');
  assert.equal(validateInviteCode('abc').error, 'Use a valid Just 20 invite code.');
});
