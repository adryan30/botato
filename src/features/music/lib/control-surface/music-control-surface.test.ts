import { describe, expect, it, vi } from 'vitest';
import type { ControlSurfacePayload } from './discord-message-port.js';
import { createFakeDiscordMessages } from './fake-discord-messages.js';
import { MusicControlSurface } from './music-control-surface.js';

const payload = (label: string): ControlSurfacePayload => ({
  embeds: [{ title: label }],
  components: [],
});

describe('MusicControlSurface', () => {
  it('bump posts a new surface and sets the sticky channel on first appearance', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));

    expect(surface.stickyChannelId('guild-1')).toBe('channel-a');
    expect(surface.liveMessageId('guild-1')).toBe('msg-1');
    expect(messages.calls).toEqual([
      {
        op: 'post',
        channelId: 'channel-a',
        payload: payload('first'),
        messageId: 'msg-1',
      },
    ]);
  });

  it('bump posts a new surface and deletes the previous live message', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));
    await surface.bump('guild-1', 'channel-a', payload('second'));

    expect(surface.liveMessageId('guild-1')).toBe('msg-2');
    expect(messages.messages.has('msg-1')).toBe(false);
    expect(messages.calls.map((call) => call.op)).toEqual([
      'post',
      'post',
      'delete',
    ]);
    expect(messages.calls[2]).toEqual({
      op: 'delete',
      channelId: 'channel-a',
      messageId: 'msg-1',
    });
  });

  it('keeps the sticky channel on later bumps from a different channel', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));
    await surface.bump('guild-1', 'channel-b', payload('resummon'));

    expect(surface.stickyChannelId('guild-1')).toBe('channel-a');
    expect(messages.calls.filter((call) => call.op === 'post')).toEqual([
      {
        op: 'post',
        channelId: 'channel-a',
        payload: payload('first'),
        messageId: 'msg-1',
      },
      {
        op: 'post',
        channelId: 'channel-a',
        payload: payload('resummon'),
        messageId: 'msg-2',
      },
    ]);
  });

  it('edit updates the existing live message in place', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));
    await surface.edit('guild-1', payload('edited'));

    expect(surface.liveMessageId('guild-1')).toBe('msg-1');
    expect(messages.messages.get('msg-1')?.payload).toEqual(payload('edited'));
    expect(messages.calls.map((call) => call.op)).toEqual(['post', 'edit']);
  });

  it('edit re-posts when the live message is missing', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));
    messages.dropMessage('msg-1');
    await surface.edit('guild-1', payload('recovered'));

    expect(surface.stickyChannelId('guild-1')).toBe('channel-a');
    expect(surface.liveMessageId('guild-1')).toBe('msg-2');
    expect(messages.messages.get('msg-2')?.payload).toEqual(
      payload('recovered'),
    );
    expect(messages.calls.map((call) => call.op)).toEqual(['post', 'post']);
  });

  it('delete removes the live surface and clears session surface state', async () => {
    const messages = createFakeDiscordMessages();
    const surface = new MusicControlSurface(messages);

    await surface.bump('guild-1', 'channel-a', payload('first'));
    await surface.delete('guild-1');

    expect(surface.stickyChannelId('guild-1')).toBeNull();
    expect(surface.liveMessageId('guild-1')).toBeNull();
    expect(messages.messages.has('msg-1')).toBe(false);
    expect(messages.calls.map((call) => call.op)).toEqual(['post', 'delete']);
  });

  it('logs send, edit, and delete failures without throwing', async () => {
    const messages = createFakeDiscordMessages();
    const logError = vi.fn();
    const surface = new MusicControlSurface(messages, { logError });

    messages.failNext.post = new Error('post failed');
    await expect(
      surface.bump('guild-1', 'channel-a', payload('first')),
    ).resolves.toBeUndefined();
    expect(surface.stickyChannelId('guild-1')).toBeNull();
    expect(surface.liveMessageId('guild-1')).toBeNull();

    await surface.bump('guild-1', 'channel-a', payload('first'));

    messages.failNext.edit = new Error('edit failed');
    await expect(
      surface.edit('guild-1', payload('edited')),
    ).resolves.toBeUndefined();
    expect(surface.liveMessageId('guild-1')).toBe('msg-1');

    messages.failNext.delete = new Error('delete failed');
    await expect(surface.delete('guild-1')).resolves.toBeUndefined();
    expect(surface.stickyChannelId('guild-1')).toBeNull();

    expect(logError).toHaveBeenCalled();
    expect(logError.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
