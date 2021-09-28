// import {
//   CommandMessage,
//   Client,
//   Command,
//   Infos,
//   CommandInfos,
// } from "discordx";
// import { MessageEmbed, TextChannel } from "discord.js";
// import { DiscordEmbedPages } from "../utils";
// import { theme } from "../config";
// import { findDrolhosEmoji } from "../utils";

// const category = ":globe_with_meridians: Geral";
// export abstract class HelpService {
//   @Command("help")
//   @Infos({
//     category,
//     description: "Lista os comandos do bot",
//     syntax: "=help",
//   })
//   showHelp(message: CommandMessage) {
//     const title = "Comandos Botato";
//     const channel = message.channel;
//     const infos: { [index: string]: Array<CommandInfos> } = {};
//     const commands = Client.getCommands().filter((c) => !c.infos["hide"]);
//     commands.forEach((command) => {
//       const {
//         infos: { category },
//       } = command;
//       if (!infos[category]) infos[category] = [command];
//       else infos[category] = [...infos[category], command];
//     });
//     const pages = Object.entries(infos).map(([category, commands]) => {
//       return new MessageEmbed({
//         title,
//         color: theme.default,
//         fields: [
//           {
//             name: category,
//             value: `${commands
//               .map(({ description: d, infos: { syntax: s } }) => {
//                 return `**${s}** - ${d}`;
//               })
//               .join("\n")}`,
//           },
//         ],
//       });
//     });

//     if (!((c): c is TextChannel => c.type === "text")(channel)) return;
//     const embedPages = new DiscordEmbedPages(pages, channel, {});
//     embedPages.createPages();
//   }

//   @Command("drolhos")
//   @Infos({
//     category,
//     description: "Provê uma explicação sobre as drolhoscoins",
//     syntax: "=drolhos",
//   })
//   drolhos(message: CommandMessage) {
//     const drolhosEmoji = findDrolhosEmoji(message);
//     const channel = message.channel;
//     const title = "Ajuda geral sobre os Drolhos";

//     const pages: MessageEmbed[] = [
//       new MessageEmbed({
//         title,
//         fields: [
//           {
//             name: "Para que servem os Drolhos?",
//             value: `Drolho(s), ou ${drolhosEmoji}, é a moeda oficial da **Terceira Guilda**, é uma forma de engajar e recompensar a comunidade pelas suas conquistas. Com ${drolhosEmoji} você consegue comprar recompensas especiais no *#mercado-negro*.`,
//           },
//         ],
//       }),
//       new MessageEmbed({
//         title,
//         fields: [
//           {
//             name: "Como ganhar Drolhos?",
//             value: `Participando de torneios e eventos do servidor, alcançando algumas conquistas, negociando com outros membros ou magicamente pode aparecer um Drolho ou outro na sua carteira ${drolhosEmoji}.`,
//           },
//         ],
//       }),
//       new MessageEmbed({
//         title,
//         fields: [
//           {
//             name: "E como eu uso os Drolhos?",
//             value: `Depois de ganhar seus ${drolhosEmoji}, eles ficarão guardados na sua carteira pessoal, e de lá eles podem ir aonde a sua imaginação desejar. Quer vender um item? Que tal usar Drolhos? Quer recompensar um jogador do seu time pela play que virou o jogo? Drolhos, talvez? Não há restrições em como usar seus ${drolhosEmoji}. Apenas tenha consciência e responsabilidade com suas ações.\n\nAlém disso, você tem acesso ao #mercado-negro, e lá você pode comprar efeitos, itens, emblemas e até waifus/husbandos únicos.`,
//           },
//         ],
//       }),
//       new MessageEmbed({
//         title,
//         fields: [
//           {
//             name: "Comandos",
//             value: `**=register**: registra uma carteira caso não possua uma.
//                         **=balance**: para ver seu saldo de ${drolhosEmoji}, bilhetes, e emblemas.
//                         **=give <membro> <quantidade>**: envia ${drolhosEmoji} da sua carteira para carteira do membro marcado.
//                         **=givet <membro>**: envia um bilhete seu para o membro marcado.`,
//           },
//         ],
//       }),
//     ];
//     if (!((c): c is TextChannel => c.type === "text")(channel)) return;
//     const embedPages = new DiscordEmbedPages(pages, channel, {});
//     embedPages.createPages();
//   }
// }
