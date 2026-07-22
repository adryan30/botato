# Sapphire as Botato's application framework

Botato is a TypeScript discord.js modular monolith that needs first-class slash commands, component interactions, and in-repo feature modules. We standardize on **`@sapphire/framework` 5.x** with day-one plugins **`@sapphire/plugin-logger`**, **`@sapphire/plugin-hmr`** (development only), and **`@sapphire/plugin-subcommands`**.

## Considered options

- **Thin DIY discord.js layer** — viable and lean, but owns command deployment and component routing forever.
- **discordx** — capable decorator model; weaker folder/piece modularity for in-repo feature modules.
- **Necord** — Nest tax is disproportionate for a personal-guild bot.

## Consequences

Deferred Sapphire plugins (i18next, scheduled-tasks, api, editable-commands, pattern-commands, utilities-store) stay out until a feature needs them. Feature-module layout is decided in [ADR 0003](./0003-feature-module-layout.md).
