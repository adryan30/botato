import { describe, expect, it } from 'vitest';
import {
  clearBotMessages,
  DM_PAGE_SIZE,
  type DmPageEntry,
  type DmTranscript,
} from './clear-bot-messages.js';

const botId = 'bot';

function transcript(pages: DmPageEntry[][]): DmTranscript & { removed: string[] } {
  const removed: string[] = [];
  return {
    removed,
    async read(before) {
      if (!before) {
        return pages[0] ?? [];
      }
      const index = pages.findIndex((page) => page.at(-1)?.id === before);
      return pages[index + 1] ?? [];
    },
    async remove(messageId) {
      removed.push(messageId);
    },
  };
}

describe('clearBotMessages', () => {
  it('deletes only the bot messages and walks older pages', async () => {
    const first = Array.from({ length: DM_PAGE_SIZE }, (_, index) => ({
      id: String(1_000 - index),
      authorId: index % 2 === 0 ? botId : 'user',
    }));
    const second = [
      { id: '10', authorId: botId },
      { id: '9', authorId: 'user' },
    ];
    const history = transcript([first, second]);

    await expect(clearBotMessages(history, botId)).resolves.toBe(51);
    expect(history.removed).toContain('1000');
    expect(history.removed).toContain('10');
    expect(history.removed).not.toContain('999');
    expect(history.removed).not.toContain('9');
  });

  it('stops when the private channel has no bot messages', async () => {
    const history = transcript([[{ id: '3', authorId: 'user' }]]);

    await expect(clearBotMessages(history, botId)).resolves.toBe(0);
    expect(history.removed).toEqual([]);
  });
});
