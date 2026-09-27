# UnifiedOS: Product Spec

> **The premise.** You are not a player hacking a terminal. You are a person living in that world, and this is **your** RobCo terminal. You log in to it, write your files on it, and send and receive mail with other operators. It sits at a location (your slug) that anyone can find and try to break into.
>
> The look, sound and behaviour follow the games (see `research/unified-os.md`). What changes is *who it's for*: every screen is written as in-universe software, with no game layer on top.

Status markers: ✅ built in v1 · 🔜 planned.

## 1. What "in-universe" changes

| Game version (player-facing) | Our version (resident-facing) |
|---|---|
| Hacking is gated by the Science skill or the Hacker perk, and awards XP | No skills, no XP. Anyone at the address may attempt the Termlink maintenance exploit. Difficulty is the operator's **security level** (1–5). ✅ |
| Terminals are read-only lore | Residents create, edit and delete files and folders, and send and receive mail. ✅ |
| Lockout is a game penalty | Lockout is real rate-limiting: per visitor (cookie and IP) per terminal, for a time the operator chooses. ✅ |
| The player never types | The resident types their password, documents and mail. ✅ |
| Dates are 2077 | Timestamps are shown shifted into the 2070s–80s (current year + 51). ✅ |

## 2. Roles

- **Default firmware:** RobCo Termlink (Series 4, the Fallout 4 style). Operators can switch to UOS (Series 3) in Terminal Configuration. ✅
- **Operator** (owner). Logs on with username + password, from `/logon` or `LOGON <USER>` at their own address. Has full control. ✅
- **Intruder**. Anyone who wins the hacking game at `/<slug>`. Gets **read-only** access to that terminal's files and mail for 30 minutes. Every screen shows `>> MAINTENANCE MODE: READ ONLY (N MIN REMAINING)`. They cannot edit, delete, send, or open configuration or the access log. ✅
- **Visitor**. Sees the boot screen, `Password Required`, and the choices *Logon*, *Enter Maintenance Mode* (hack) and *Disconnect*. ✅

## 3. Screens (v1)

| Route | Screen |
|---|---|
| `/` | Pip-OS boot text, then the Termlink network menu: Logon / Register New Terminal / Connect to Remote Terminal (or Access Terminal / Log Off when logged on) |
| `/register` | Prompts for username, password, confirmation and location name. The location name becomes the slug. |
| `/logon` | Operator logon (username + password) |
| `/connect` | Type a terminal address to go there |
| `/<slug>` | For a visitor: the entry screen, or TERMINAL LOCKED when locked out. For the operator or an intruder: the main menu (Personal Files, Termlink Mail (n new), Access Log*, Terminal Configuration*, Log Off / Disconnect). *Operator only. |
| `/<slug>/logon` | `WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK` / `>LOGON <USER>` / `ENTER PASSWORD NOW` |
| `/<slug>/hack` | UOS firmware plays the Termlink boot script first. Then the memory dump (2×17×12), likeness feedback, brackets (dud removed / allowance replenished) and lockout. |
| `/<slug>/files[/<id>]` | Folder listing, or a document reader. The operator also gets `[Create Document]`, `[Create Folder]`, `[Rename]`, `[Delete]` and `[Edit]`. |
| `/<slug>/files/<id>/edit` | Full-screen editor: `^S` saves, `Esc` exits (warns about unsaved changes) |
| `/<slug>/mail` | Inbox (count, new), Sent, `[Compose Message]` |
| `/<slug>/mail/inbox`, `/sent`, `/<id>` | Message lists. The message view shows From / To / Date / Subject. The operator can Reply or Delete. |
| `/<slug>/mail/compose` | TO / SUBJECT / body. `^S` transmits (`Transmitting... ...done.`). |
| `/<slug>/log` | Access log: logons, failed logons, maintenance-mode entries, security resets, hacks, lockouts, files and mail read by intruders, mail received |
| `/<slug>/config` | Firmware (UOS Series 3 / Termlink Series 4), phosphor (green, amber, white, blue), server number, welcome message, security level, lockout duration, the maintenance reset exploit (unpatched or patched), reset lockouts, change password |

Navigation works as in the games: ↑/↓ or hover to move, Enter or click to select, Tab or Esc to go back. Enter or a click while text is typing finishes it instantly. The hint bar under the monitor has clickable Back, Sound and CRT-FX toggles.

## 4. Security model

1. **Hacking grants read-only access to one terminal.** It never grants the account: no password change, no sending mail as the owner, no edits. The grant is a sealed session cookie (`intrusions[terminalId] = expiry`).
2. **The puzzle is solved on the server.** The browser never receives the password word. Boards use a cryptographic RNG. Each selection is checked against a board owned by that visitor.
3. **Lockouts** apply per visitor cookie *and* per IP hash.
4. **Operator logon** uses argon2 password hashes and gives up after 8 failures per visitor per 15 minutes. Failures are logged.
5. **All content is plain text.** No HTML is ever rendered.
6. Residents are told, in the seeded "Operator's Guide", that successful intruders can read their files and mail.

## 5. Architecture

- **Next.js 15 (App Router) with TypeScript.** Pages are server components that describe a screen as `Block[]` (lines, text, rules, menus). Server actions handle every mutation.
- **The client terminal engine** lives in `src/components/`:
  - `Crt`: the monitor bezel, scanlines, roll bar, vignette and power-on, plus the hint bar.
  - `Terminal`: the typing engine and menus.
  - `PromptForm`: `>LABEL: value█` prompts.
  - `DocEditor` and `MailComposer`.
  - `HackScreen`.
- **Hacking engine:** `src/lib/hack/engine.ts`. It is pure and unit-tested, and follows the research doc's rules (the 30-character junk set, same-row bracket pairs, likeness, and the per-firmware strings).
- **Database:** Postgres through Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`). When `DATABASE_URL` is unset, an embedded **PGlite** database in `./.pglite` is used and migrated automatically.
- **Sessions:** `iron-session` sealed cookies. The anonymous visitor id is set by `middleware.ts`.
- **Fonts:**
  - Share Tech Mono (OFL): Fallout 4's actual terminal font.
  - Fixedsys Excelsior (public domain): stands in for the FO3/NV Fixedsys.
- **Sound:** synthesised with WebAudio (`src/lib/sound.ts`). No game audio is shipped.
- **Word list:** SCOWL common English words (`src/lib/hack/words.json`, licence alongside). It is not Bethesda's `FalloutDict.txt`.

### Data model (v1)
```
users(id, username unique, password_hash, created_at)
terminals(id, owner_id unique, slug unique, name, welcome, server_no, firmware, phosphor,
          security_level, lockout_seconds, exploit_enabled, created_at)
nodes(id, terminal_id, parent_id?, kind[folder|document], title, body, created_at, updated_at)
messages(id, from_user_id, to_user_id, subject, body, created_at, read_at,
         deleted_by_sender, deleted_by_recipient)
hack_sessions(id, terminal_id, visitor_id, state jsonb, status, created_at, updated_at)
lockouts(terminal_id, visitor_id, ip_hash, until)
access_log(id, terminal_id, actor[owner|intruder|visitor], visitor_id?, event, detail, created_at)
```

## 6. Roadmap
- 🔜 **Security Systems (switches).** Owner-defined toggles with ON/OFF labels, a status line and response text, e.g. `Front Door: STATUS: Locked`. Intruders can flip switches the owner marks as exposed.
- 🔜 **Holotapes.** Intruders copy a file to their own terminal. Folders can be exported and imported between terminals.
- 🔜 **Image documents,** displayed tinted in phosphor green (the games' "Display Image").
- 🔜 **FO4-style paging** for long documents, plus a `TYPE`/`DIR` command line.
- 🔜 **More than one terminal per account,** and account deletion.
- 🔜 **Built-in holotape programs** (mini-games).
