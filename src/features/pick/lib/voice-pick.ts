export type PickStyle = 'mention' | 'silent' | 'private';

export type VoiceChannelMember = {
  id: string;
  displayName: string;
  bot: boolean;
};

export const EMPTY_VOICE_PICK_MESSAGE = 'No one else to pick.';
export const MISSING_VOICE_CHANNEL_MESSAGE =
  'Join a voice channel or pass one.';

export function resolvePickVoiceChannelId(
  optionChannelId: string | null | undefined,
  requesterVoiceChannelId: string | null | undefined,
): string | null {
  return optionChannelId ?? requesterVoiceChannelId ?? null;
}

export function eligibleVoicePickMembers(
  members: readonly VoiceChannelMember[],
  requesterId: string,
): VoiceChannelMember[] {
  return members.filter(
    (member) => !member.bot && member.id !== requesterId,
  );
}

export function chooseVoicePick(
  eligible: readonly VoiceChannelMember[],
  random: () => number = Math.random,
): VoiceChannelMember | null {
  if (eligible.length === 0) {
    return null;
  }
  const index = Math.floor(random() * eligible.length);
  return eligible[index] ?? null;
}

export function formatVoicePickReply(
  member: VoiceChannelMember,
  style: PickStyle,
): { content: string; ephemeral: boolean } {
  if (style === 'mention') {
    return { content: `Picked <@${member.id}>!`, ephemeral: false };
  }
  return {
    content: `Picked ${member.displayName}!`,
    ephemeral: style === 'private',
  };
}

export function parsePickStyle(value: string | null): PickStyle {
  if (value === 'silent' || value === 'private') {
    return value;
  }
  return 'mention';
}
