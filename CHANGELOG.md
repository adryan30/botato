# Changelog

## [1.4.0](https://github.com/adryan30/botato/compare/v1.3.0...v1.4.0) (2026-07-30)


### Features

* **pick:** add /pick voice channel random member command ([#74](https://github.com/adryan30/botato/issues/74)) ([41ef5cd](https://github.com/adryan30/botato/commit/41ef5cd96d2e5d8b08f32bf0200fdd3a78de9028))


### Bug Fixes

* **ci:** do not skip chained release image publishes ([#72](https://github.com/adryan30/botato/issues/72)) ([c38968f](https://github.com/adryan30/botato/commit/c38968fb5f3b5262b38b6b81b96b8f83d5cef8a9))

## [1.3.0](https://github.com/adryan30/botato/compare/v1.2.1...v1.3.0) (2026-07-29)


### Features

* **afk:** add /afk command with Sphere-backed marks ([#70](https://github.com/adryan30/botato/issues/70)) ([8ebcd8a](https://github.com/adryan30/botato/commit/8ebcd8a3f6c3b03b845247a6cdd2cc17a80909db))

## [1.2.1](https://github.com/adryan30/botato/compare/v1.2.0...v1.2.1) (2026-07-28)


### Bug Fixes

* **music:** confirm /play from added tracks, not snapshot ([#65](https://github.com/adryan30/botato/issues/65)) ([e7cdd59](https://github.com/adryan30/botato/commit/e7cdd59c13e877c2eed200b0df967a950c32b817))

## [1.2.0](https://github.com/adryan30/botato/compare/v1.1.2...v1.2.0) (2026-07-28)


### Features

* **music:** control surface lifecycle module ([#55](https://github.com/adryan30/botato/issues/55)) ([#61](https://github.com/adryan30/botato/issues/61)) ([2d1f56f](https://github.com/adryan30/botato/commit/2d1f56f06c6b8bba4d84b21d7124f268d1bff8f6))
* **music:** control-surface embed and transport builders ([#53](https://github.com/adryan30/botato/issues/53)) ([#60](https://github.com/adryan30/botato/issues/60)) ([3cf12d0](https://github.com/adryan30/botato/commit/3cf12d0a681ecc565993231a22659ea9954d457f))
* **music:** gate surface transport by session voice ([#56](https://github.com/adryan30/botato/issues/56)) ([#63](https://github.com/adryan30/botato/issues/63)) ([1f3f591](https://github.com/adryan30/botato/commit/1f3f591a6b331176d0ee407d8c200b347b2d1c81))
* **music:** re-summon queue, full peek, and session-end teardown ([#57](https://github.com/adryan30/botato/issues/57)) ([#64](https://github.com/adryan30/botato/issues/64)) ([6882cdd](https://github.com/adryan30/botato/commit/6882cdd0608b7f0fb82d61c1515dabe76243936e))
* **music:** wire sticky surface into play and search ([#54](https://github.com/adryan30/botato/issues/54)) ([#62](https://github.com/adryan30/botato/issues/62)) ([2927d6e](https://github.com/adryan30/botato/commit/2927d6e8851c2d61ffe01efe4a71414e94647124))


### Bug Fixes

* **music:** bump youtube-plugin and use remote cipher ([#58](https://github.com/adryan30/botato/issues/58)) ([366accb](https://github.com/adryan30/botato/commit/366accb2bf697e2997bd953549af5914b22ee8db))

## [1.1.2](https://github.com/adryan30/botato/compare/v1.1.1...v1.1.2) (2026-07-23)


### Bug Fixes

* **ci:** chain image publish after release-please ([#41](https://github.com/adryan30/botato/issues/41)) ([dda2460](https://github.com/adryan30/botato/commit/dda2460e75cb55bac01bfaf9af07f3f80b19099f))
* **music:** enable YouTube OAuth TV client and document token setup ([#50](https://github.com/adryan30/botato/issues/50)) ([84e40cf](https://github.com/adryan30/botato/commit/84e40cf47fa89274cc326b6906e7d496437bdffd))

## [1.1.1](https://github.com/adryan30/botato/compare/v1.1.0...v1.1.1) (2026-07-23)


### Bug Fixes

* **ci:** emit v* tags from release-please ([#39](https://github.com/adryan30/botato/issues/39)) ([2212cde](https://github.com/adryan30/botato/commit/2212cdef0b56aebab98d087f46f6e389df315066))

## [1.1.0](https://github.com/adryan30/botato/compare/botato-v1.0.0...botato-v1.1.0) (2026-07-23)


### Features

* bootstrap runnable Sapphire Botato ([#17](https://github.com/adryan30/botato/issues/17)) ([#25](https://github.com/adryan30/botato/issues/25)) ([01b5cb7](https://github.com/adryan30/botato/commit/01b5cb726dc4034ec5de13439d278452ba576439))
* **music:** add queue commands and session controls ([#22](https://github.com/adryan30/botato/issues/22)) ([#35](https://github.com/adryan30/botato/issues/35)) ([4273f4c](https://github.com/adryan30/botato/commit/4273f4c7ab34891fa58266ceaa7f8509bf751f5b))
* **music:** add search and transport slash commands ([#21](https://github.com/adryan30/botato/issues/21)) ([#34](https://github.com/adryan30/botato/issues/34)) ([faa6175](https://github.com/adryan30/botato/commit/faa6175441cf9bac53f7cf63d3c681dd3ca3896a))
* **music:** guild-scoped music-session service ([#19](https://github.com/adryan30/botato/issues/19)) ([#26](https://github.com/adryan30/botato/issues/26)) ([8beac51](https://github.com/adryan30/botato/commit/8beac515d26a35bb738165e52f449119e839916b))
* **music:** keep Botato up when the music node is down ([#38](https://github.com/adryan30/botato/issues/38)) ([b93c8d4](https://github.com/adryan30/botato/commit/b93c8d4d79d1cd7f3629d407cd77418bf0b8cdaa))
* **music:** wire Shoukaku/Kazagumo play path ([#20](https://github.com/adryan30/botato/issues/20)) ([#27](https://github.com/adryan30/botato/issues/27)) ([10a87ed](https://github.com/adryan30/botato/commit/10a87ed1bdb04b62c89d9cb71b200b094dd77ba4))
* publish linux/arm64 Botato image to GHCR ([#23](https://github.com/adryan30/botato/issues/23)) ([#36](https://github.com/adryan30/botato/issues/36)) ([eb6910e](https://github.com/adryan30/botato/commit/eb6910e24a840285e7929d2c62e5472f0cc357f0))


### Bug Fixes

* **music:** drop Spotify and LavaSrc from v1 ([#29](https://github.com/adryan30/botato/issues/29)) ([#33](https://github.com/adryan30/botato/issues/33)) ([c91604b](https://github.com/adryan30/botato/commit/c91604bec1e04d538aee6f706ed6f95a6fb21866))
