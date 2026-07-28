import { describe, expect, it } from 'vitest';
import { createFakeMusicNode } from '../music-node/fake-music-node.js';
import type { Track } from '../music-node/music-node-port.js';
import { MusicSessionService } from '../session/music-session-service.js';
import { bindControlSurface } from './bind-control-surface.js';
import { createFakeDiscordMessages } from './fake-discord-messages.js';
import { MusicControlSurface } from './music-control-surface.js';
import { sessionReplyPayload } from './session-ui.js';

const first: Track = {
  id: 'yt-1',
  title: 'First Track',
  uri: 'https://youtube.com/watch?v=yt-1',
  source: 'youtube',
};

const second: Track = {
  id: 'yt-2',
  title: 'Second Track',
  uri: 'https://youtube.com/watch?v=yt-2',
  source: 'youtube',
};

function setup() {
  let resolveCall = 0;
  const tracks = [first, second];
  const node = createFakeMusicNode({
    resolveImpl: async () => {
      const track = tracks[Math.min(resolveCall, tracks.length - 1)]!;
      resolveCall += 1;
      return { kind: 'track', track };
    },
  });
  const sessions = new MusicSessionService(node);
  const messages = createFakeDiscordMessages();
  const surface = new MusicControlSurface(messages);
  const bound = bindControlSurface(sessions, surface);
  return { sessions, messages, surface, bound };
}

describe('bindControlSurface', () => {
  it('bumps on session birth and track start when playback begins', async () => {
    const { sessions, messages, surface, bound } = setup();
    bound.noteTextChannel('guild-1', 'text-1');

    await sessions.play('guild-1', 'first', 'voice-1');
    await bound.whenIdle();

    expect(surface.stickyChannelId('guild-1')).toBe('text-1');
    expect(messages.calls.map((call) => call.op)).toEqual([
      'post',
      'post',
      'delete',
    ]);
    expect(messages.calls[0]?.channelId).toBe('text-1');
    expect(messages.calls[1]?.channelId).toBe('text-1');
    expect(surface.liveMessageId('guild-1')).toBe('msg-2');
    expect(messages.messages.get('msg-2')?.payload).toEqual(
      sessionReplyPayload(sessions.snapshot('guild-1')),
    );
  });

  it('edits the live surface when enqueueing while something is already playing', async () => {
    const { sessions, messages, surface, bound } = setup();
    bound.noteTextChannel('guild-1', 'text-1');
    await sessions.play('guild-1', 'first', 'voice-1');
    await bound.whenIdle();
    messages.calls.length = 0;

    await sessions.play('guild-1', 'second');
    await bound.whenIdle();

    expect(messages.calls.map((call) => call.op)).toEqual(['edit']);
    expect(surface.liveMessageId('guild-1')).toBe('msg-2');
    expect(messages.messages.get('msg-2')?.payload).toEqual(
      sessionReplyPayload(sessions.snapshot('guild-1')),
    );
  });

  it('bumps on track start when auto-advancing the queue', async () => {
    const { sessions, messages, surface, bound } = setup();
    bound.noteTextChannel('guild-1', 'text-1');
    await sessions.play('guild-1', 'first', 'voice-1');
    await sessions.play('guild-1', 'second');
    await bound.whenIdle();
    messages.calls.length = 0;

    await sessions.skip('guild-1');
    await bound.whenIdle();

    expect(messages.calls.map((call) => call.op)).toEqual([
      'post',
      'delete',
    ]);
    expect(surface.liveMessageId('guild-1')).toBe('msg-3');
    expect(sessions.nowPlaying('guild-1')?.id).toBe('yt-2');
    expect(messages.messages.get('msg-3')?.payload).toEqual(
      sessionReplyPayload(sessions.snapshot('guild-1')),
    );
  });

  it('does not treat a missing text channel note as a surface home', async () => {
    const { sessions, messages, surface, bound } = setup();

    await sessions.play('guild-1', 'first', 'voice-1');
    await bound.whenIdle();

    expect(surface.stickyChannelId('guild-1')).toBeNull();
    expect(messages.calls).toEqual([]);
  });

  it('playTrack follows the same bump and edit rules as play', async () => {
    const { sessions, messages, surface, bound } = setup();
    bound.noteTextChannel('guild-1', 'text-1');

    await sessions.playTrack('guild-1', first, 'voice-1');
    await bound.whenIdle();
    expect(messages.calls.map((call) => call.op)).toEqual([
      'post',
      'post',
      'delete',
    ]);

    messages.calls.length = 0;
    await sessions.playTrack('guild-1', second);
    await bound.whenIdle();

    expect(messages.calls.map((call) => call.op)).toEqual(['edit']);
    expect(surface.liveMessageId('guild-1')).toBe('msg-2');
  });
});
