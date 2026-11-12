export const DM_PAGE_SIZE = 100;

export type DmPageEntry = {
  id: string;
  authorId: string;
};

export type DmTranscript = {
  /** Newest first. `before` is the oldest id already seen. */
  read(before?: string): Promise<DmPageEntry[]>;
  remove(messageId: string): Promise<void>;
};

export async function clearBotMessages(
  transcript: DmTranscript,
  botUserId: string,
): Promise<number> {
  let removed = 0;
  let before: string | undefined;

  for (;;) {
    const page = await transcript.read(before);
    if (page.length === 0) {
      return removed;
    }

    for (const message of page) {
      if (message.authorId !== botUserId) {
        continue;
      }
      await transcript.remove(message.id);
      removed += 1;
    }

    const oldest = page.at(-1);
    if (!oldest || oldest.id === before || page.length < DM_PAGE_SIZE) {
      return removed;
    }
    before = oldest.id;
  }
}
