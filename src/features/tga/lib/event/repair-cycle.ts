export type CycleRepair =
  | { ok: true; giverUserId: string; newTargetUserId: string }
  | { ok: false; reason: 'too-small' | 'not-in-cycle' };

type CycleSignup = {
  userId: string;
  targetUserId: string | null;
};

/**
 * Drop one person from a drawn cycle and point their giver at the person
 * they were going to gift. Everyone else's match stays put.
 */
export function repairCycle(
  signups: readonly CycleSignup[],
  removedUserId: string,
): CycleRepair {
  const removed = signups.find((signup) => signup.userId === removedUserId);
  const giver = signups.find((signup) => signup.targetUserId === removedUserId);
  if (!removed?.targetUserId || !giver) {
    return { ok: false, reason: 'not-in-cycle' };
  }
  if (signups.length - 1 < 2 || giver.userId === removed.targetUserId) {
    return { ok: false, reason: 'too-small' };
  }
  return {
    ok: true,
    giverUserId: giver.userId,
    newTargetUserId: removed.targetUserId,
  };
}
