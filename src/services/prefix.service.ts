import { CommandMessage, Command, Description } from "@typeit/discord";

export abstract class PrefixService {
  @Command("prefix")
  @Description("Muda/remove seu prefixo no servidor")
  async changePrefix(message: CommandMessage<{ flair: string }>) {
    const [, ...args] = message.commandContent.split(" ");

    const oldNickname = message.member.displayName;
    await message.member
      .setNickname(`[${args.join(" ")}] ${oldNickname}`)
      .catch((err) => console.error(err));
  }

  @Command("rp")
  async removePrefix(message: CommandMessage) {
    const oldNickname = message.member.displayName;
    await message.member.setNickname(oldNickname.replace(/\[.*\]\s/, ""));
  }
}
