# Lumen

Use Node.js 24. Install with `npm ci`, run `npm test`, and build the portable
Windows app with `npm run build`. Native smoke tests require Windows and use
isolated profiles and simulated services in `test-results/`. Never use real alarms, music playback,
screen brightness, paid speech or actual Codex turns as test fixtures.

Keep the project generic. Do not add personal server addresses, tokens, private
entity dumps, local profiles, logs or real home screenshots to the repository.
Use synthetic screenshots in documentation and exclude `data/` from releases.

Keep the repository root for package metadata, policy and the README. Code belongs
in `src/main`, `src/renderer` or `src/shared`; tests in `tests/unit` or `tests/smoke`;
icons in `assets/icons`; tooling in `scripts`; documentation in `docs`. Run
`npm run check` after moving files, and update imports, HTML paths and build inputs.

Keep modules optional. Preserve saved positions and user-selected mappings.
Do not stream cameras behind an invisible window. Avoid replacing animated DOM
nodes on data polling. Respect economy mode and reduced motion.

Remote status is read-only and must remain authenticated. Never expose shell,
Home Assistant actions, Codex credentials through it.
Do not add automatic Codex resumption or send messages to Codex chats.

Copyright Gaerisson. Retain the notice that Lumen is vibe-coded with OpenAI Codex,
plus the notices for third-party services. Do not imply official affiliation.
