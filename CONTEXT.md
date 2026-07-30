# Botato

Personal Discord bot for a private guild: modular capabilities including voice music playback and social voice picks, deployed on a self-hosted Kubernetes cluster.

## Language

**Botato**:
The Discord bot this repository exists to build and run.
_Avoid_: the bot (when naming the product), music bot (Botato is general-purpose; music is one capability)

**Feature module**:
An in-repo unit of bot capability (commands, listeners, and related services) that can be added without changing the core process model.
_Avoid_: plugin (reserved for runtime-loaded extensions, which Botato is not using), package, cog

**Music node**:
A separate process that resolves media sources and streams audio into Discord voice on Botato's behalf.
_Avoid_: Lavalink (implementation), music bot, audio server

**Music session**:
The playback state for one guild's active voice listening (queue, now playing, control surface). It exists only while Botato can use a reachable **music node**; if the node is lost, the session ends.
_Avoid_: queue (the queue is part of a session, not the whole), player (ambiguous with Discord player UI), paused-for-reconnect session

**AFK mark**:
Botato's record that a guild member is marked away: the prefix in use and the member's nickname before the mark. It is the source of truth for whether they are AFK; the server nickname is only the visible effect when Discord allows changing it.
_Avoid_: AFK status (ambiguous with Discord presence), AFK mode, AFK state

**AFK prefix**:
The bracketed label prepended to a member's server nickname while an **AFK mark** is active (default `[AFK]`, or a custom label within Discord's nickname length limit).
_Avoid_: AFK tag, AFK title, status text

**Voice pick**:
One randomly chosen eligible member connected to a target voice channel (humans only, excluding the requester). Produced by `/pick`.
_Avoid_: roulette, random user, spin, selection
