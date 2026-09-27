# UnifiedOS: RobCo Termlink

A working RobCo Industries Unified Operating System, as if you lived in the Fallout world. Register a terminal at a location of your choice. Its name becomes its network address, for example `/craterside-supply`. Keep files on it and exchange Termlink mail with other operators by username. Anyone who knows your address can try the Termlink maintenance exploit (the hacking minigame). If they win, they can read what's on your terminal.

- `docs/research/unified-os.md`: the in-game UOS, screen by screen, verified against game data.
- `docs/product-spec.md`: what this app is, its screens, security model and roadmap.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

With no `DATABASE_URL`, an embedded Postgres (PGlite) is created in `./.pglite` and migrated automatically.

## Checks

```bash
npm test             # hacking engine unit tests
npm run typecheck
npm run lint
npm run build
```

## Deploy (e.g. Vercel + Neon)

1. Create a Postgres database and set `DATABASE_URL`.
2. Set `SESSION_SECRET` to 32+ random characters (`openssl rand -base64 48`).
3. Apply migrations: `DATABASE_URL=... npm run db:migrate`.
4. Deploy. After changing `src/db/schema.ts`, run `npm run db:generate` to create a new migration.

## Controls

| Key | Action |
|---|---|
| ↑ ↓ / mouse | move the selection |
| Enter / click | select; also finishes text that is still typing |
| Tab / Esc | back |
| Ctrl+S | save a document / transmit mail |

## Credits and licences

- **Share Tech Mono:** SIL Open Font License (`src/fonts/ShareTechMono-OFL.txt`).
- **Fixedsys Excelsior 3.01:** public domain.
- **Hacking word list:** derived from SCOWL (`src/lib/hack/WORDS-LICENSE.txt`).
- **Sounds:** synthesised at runtime.

Fallout, RobCo and Vault-Tec are trademarks of ZeniMax Media / Bethesda Softworks. This is an unofficial fan project and is not affiliated with or endorsed by them.
