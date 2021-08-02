import { CommandMessage, Command, Infos } from "@typeit/discord";

const category = ":writing_hand: Prefix";
export abstract class PrefixService {
  @Command("prefix")
  @Infos({
    category,
    description: "Adiciona um prefixo ao nome",
    syntax: "=prefix <prefixo>",
  })
  async changePrefix(message: CommandMessage<{ flair: string }>) {
    const [, ...args] = message.commandContent.split(" ");

    const oldNickname = message.member.displayName;
    await message.member
      .setNickname(`[${args.join(" ")}] ${oldNickname}`)
      .catch((err) => console.error(err));
  }

  @Command("rp")
  @Infos({
    category,
    description: "Remove o prefixo do nome",
    syntax: "=rp",
  })
  async removePrefix(message: CommandMessage) {
    const oldNickname = message.member.displayName;
    await message.member.setNickname(oldNickname.replace(/\[.*\]\s/, ""));
  }
}
