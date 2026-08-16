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

**DJ mode**:
Session-scoped auto-curation that quietly refills the upcoming queue from the active **DJ vibe**. Off by default; independent of voice connection and of tracks already queued.
_Avoid_: DJ bot, radio mode, autoplay (Discord/YouTube product names)

**DJ vibe**:
The short natural-language taste string that drives **DJ mode** search queries for the current music session (last vibe wins while mode stays on).
_Avoid_: prompt, mood string, genre tag (too narrow)

**Track provenance**:
Whether a music-session queue / now-playing entry was enqueued by a user or by **DJ mode**. Session-level metadata; not part of the music-node **Track** shape.
_Avoid_: source (reserved for YouTube/other on Track), owner, requester

**Play history**:
The last ~20 tracks that left now-playing in the current **music session** (titles and ids). Used by **DJ mode** for do-not-repeat context; session-scoped only.
_Avoid_: taste profile, cross-session memory

**AFK mark**:
Botato's record that a guild member is marked away: the prefix in use and the member's nickname before the mark. It is the source of truth for whether they are AFK; the server nickname is only the visible effect when Discord allows changing it.
_Avoid_: AFK status (ambiguous with Discord presence), AFK mode, AFK state

**AFK prefix**:
The bracketed label prepended to a member's server nickname while an **AFK mark** is active (default `[AFK]`, or a custom label within Discord's nickname length limit).
_Avoid_: AFK tag, AFK title, status text

**Voice pick**:
One randomly chosen eligible member connected to a target voice channel (humans only, excluding the requester). Produced by `/pick`.
_Avoid_: roulette, random user, spin, selection
