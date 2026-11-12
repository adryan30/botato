import { describe, expect, it } from 'vitest';
import { repairCycle } from './repair-cycle.js';

describe('repairCycle', () => {
  it('points the giver at the person the dropout was going to gift', () => {
    const signups = [
      { userId: 'a', targetUserId: 'b' },
      { userId: 'b', targetUserId: 'c' },
      { userId: 'c', targetUserId: 'd' },
      { userId: 'd', targetUserId: 'a' },
    ];

    expect(repairCycle(signups, 'c')).toEqual({
      ok: true,
      giverUserId: 'b',
      newTargetUserId: 'd',
    });
  });

  it('refuses a repair that would leave one person', () => {
    const signups = [
      { userId: 'a', targetUserId: 'b' },
      { userId: 'b', targetUserId: 'a' },
    ];

    expect(repairCycle(signups, 'b')).toEqual({
      ok: false,
      reason: 'too-small',
    });
  });
});
