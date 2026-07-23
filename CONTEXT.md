# Botato

Personal Discord bot for a private guild: modular capabilities with voice music playback, deployed on a self-hosted Kubernetes cluster.

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
