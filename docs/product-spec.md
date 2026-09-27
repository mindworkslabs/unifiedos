# UnifiedOS: Product Spec v1

> **The premise.** You are not a player hacking a terminal. You are a person living in that world, and this is **your** RobCo terminal. You log in to it, write your files on it, and send and receive mail through it. It sits at a location (your slug) that other people can find and try to break into.
>
> The look, sound and behaviour follow the games exactly (see `research/unified-os.md`). What changes is *who it's for*: every screen is written as in-universe software, with no game layer on top.

## 1. What "in-universe" changes

| Game version (player-facing) | Our version (resident-facing) |
|---|---|
| Hacking is gated by the Science skill or the Hacker perk, and awards XP | No skills, no XP. Anyone at the slug may attempt the Termlink exploit. The difficulty is the **security level** the administrator configures. |
| "Very Easy" through "Very Hard" are game tiers | The admin setting `SECURITY LEVEL: 1–5`, which controls word length and word count |
| The Pip-Boy collects notes | Visitors can **copy a file to holotape**: it is saved to their own terminal's Holotapes folder |
| Terminals are read-only lore | Everything is live: create, edit and delete files, folders and switches, and mail |
| One terminal = one static record | One **account** can run one or more terminals (locations) |
| Lockout is a game penalty | Lockout is real security: rate-limiting per visitor per location |
| Player never types | The resident types: password, documents, mail, and an optional command line |

The strings, fonts, colours, timings, typing engine, sounds and CRT effects all stay as they are in the research doc. Two firmware themes are available: **UOS (FO3/NV)** and **Termlink (FO4)**.

## 2. Users and roles

- **Resident**: an account holder who owns a terminal. They log in with real credentials: email + password, or "Sign in with Google".
- **Operator (admin)**: a resident on their own terminal. They have full control.
- **Intruder**: anyone who reaches `/<slug>` and wins the hacking game. They get a **session limited to that terminal's Public Server partition** (see §4).
- **Guest**: sees only the terminal's boot screen and logon/hack prompt. For a terminal flagged "Public Access", guests can read the public partition without hacking.

## 3. Apps: the menu of a resident's terminal

Each app is a UOS menu entry, drawn exactly like an in-game terminal menu.

```
ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
COPYRIGHT 2075-2077 ROBCO INDUSTRIES
-Server 3-

Welcome, <Resident Name>.
________________________________________
 Personal Files          → documents & folders (private)
 Public Server           → documents visible to intruders/guests
 Termlink Mail           → inbox / compose / sent / drafts (Gmail-synced)
 Holotapes               → files copied from other terminals
 Security Systems        → switches (door, turrets, lights…), status lines
 Access Log              → who logged on / hacked / read what
 Terminal Configuration  → name, slug, welcome text, server #, theme, security level
 Log Off
```

### 3.1 Documents ("Personal Files" and "Public Server")
- Folders nest. Menus show 12 rows and scroll. Submenus get an automatic `Back` entry in the UOS theme, and Tab goes back.
- **The reader** follows the research spec: text types on, and Enter completes it. The FO4 theme pages the text; the UOS theme scrolls it.
- **The editor** is an in-universe line editor that looks like the terminal:
  - Full-screen text in the terminal font, with a block cursor and key-click sounds.
  - The bottom line reads `^S SAVE  ^X EXIT  ^D DELETE`.
  - Word wrap is fixed at 51 columns.
  - Documents are plain text, with an optional `From:/To:/Subject:` memo template and a "Personal Log - Entry N" template.
- **Images** are uploaded, stored and shown tinted in the phosphor colour. This matches the games' "Display Image".
- **Move to Public Server / Personal** is a single command.

### 3.2 Termlink Mail (with Gmail sync)
- **Folders:** `Inbox`, `Sent`, `Drafts`, `Compose`, and optionally Gmail labels as submenus.
- **Message view:** rendered like in-game mail. It shows `From:`, `To:`, `Date:` and `Subject:` lines, a rule, then the body converted to plain text. Attachments are listed and can be downloaded. HTML mail is stripped to text, since this is a terminal.
- **Compose:** the same editor as documents. `To:`/`Subject:` are prompted line by line (`>TO: _`). Sending shows `Transmitting... ...done.`
- **Two delivery paths:**
  1. **Termlink-to-Termlink** (internal): address a message to `@slug`. It is delivered instantly, with no Google involved. This works for everyone.
  2. **Gmail**: the resident links their Google account, and real mail is sent and received through the Gmail API as their own address.
- **Sync:**
  - The first link imports the last N days.
  - After that, sync is incremental through `users.history.list`.
  - New mail can be pushed through Gmail `users.watch` and Google Pub/Sub, or found by polling every 1–5 minutes as a simpler first version.
  - Read/unread and archive state is mirrored back to Gmail.
- **Mail is never reachable by intruders.** Hacking the terminal gives Public Server access only.

### 3.3 Security Systems (switches)
- The owner defines switches, e.g. `Front Door`. Each switch has ON/OFF item text, response text and a status line such as `STATUS: Locked`. They follow the games' Force-Redraw toggle pattern.
- They are cosmetic or social: state is shared and visible, and intruders can flip switches marked "exposed". Every flip is written to the Access Log.
- Later: webhooks, so a switch can drive something real, e.g. a smart light.

### 3.4 Access Log
Events recorded: logons, failed logons, hack attempts (success or failure, with attempt count), lockouts, files read by intruders, switches flipped, and holotape copies. The log is shown in the terminal style, e.g. `2077-10-23 09:47  INTRUDER 7F3A  HACK SUCCESS (2 ATTEMPTS)`.

### 3.5 Holotapes
- Intruders and guests can copy a Public Server file "to holotape". The copy lands in *their* terminal's Holotapes folder, if they have one.
- An **export/import** bundle (a JSON file) lets residents move a folder between terminals.

### 3.6 Terminal Configuration

| Setting | Values |
|---|---|
| Terminal name | free text; generates the slug (unique; editable once) |
| Header and welcome text | UOS theme: the global 3-line header plus a custom welcome. Termlink theme: a custom header. |
| Server number | 1–10 |
| Firmware theme | UOS (FO3/NV) or Termlink (FO4) |
| Phosphor colour | green (default), amber, white, blue |
| Security level | 1–5, or **Requires Key**: no hacking, logon only |
| Lockout policy | permanent until the owner resets it, or N seconds |
| Exit-and-reset exploit | on or off |
| Public Access | on or off: guests can read the Public Server without hacking |
| Sound | on/off and volume; CRT effects intensity (accessibility) |

## 4. Security model (important with real email involved)

There are two separate layers. They must never mix.

| Layer | Who | How they get in | What they can reach |
|---|---|---|---|
| **Account** | the resident | real authentication: password (argon2) or Google OAuth; optional TOTP | everything: private files, mail, config |
| **Terminal (Termlink)** | intruders and guests | winning the hacking puzzle, or Public Access | **only** the Public Server partition and exposed switches, and only for that slug |

Rules:
1. **The hacking game is theatre, not authentication.** It never grants account access, mail, private files or config. A hacked session is a signed cookie scoped to `{slug, role: intruder, exp}`.
2. The puzzle runs entirely **on the server**. The client never receives the password word, and each guess is rate-limited.
3. The resident's in-fiction "terminal password" is only a **logon shortcut shown in the UOS style**. The real credentials sit behind it, and owner logon at `/<slug>` still checks the account password (and TOTP, if enabled).
4. **Gmail tokens** are encrypted at rest (AES-GCM with a KMS or env key). We request the minimum scopes, keep a disconnect button, and let users revoke.
5. There is no server-side rendering of mail HTML, so no tracking pixels or remote loads. Mail is converted to text and sanitised.
6. Audit everything in the Access Log.

## 5. Gmail integration: what it costs
- **Scopes needed:** `gmail.modify` (read, label, mark read) and `gmail.send`. Google classes both as **restricted scopes**.
- **While the Google Cloud app is in "Testing" or unverified mode:** up to **100 manually listed test users**, plus an "unverified app" warning. That's fine for you, friends and a beta.
- **Going public** requires Google's OAuth verification **plus an annual third-party security assessment (CASA)**, which takes weeks and costs money.
- **Alternatives** if that is too heavy:
  - (a) keep Gmail sync invite-only and use Termlink-internal mail for everyone else;
  - (b) IMAP/SMTP with a Google **app password**. This needs no verification, but it's clunkier for users and has weaker security properties.
- **Recommendation:** build internal Termlink Mail first, and add Gmail OAuth in testing mode behind an allow-list. Decide on verification once there are real users.

## 6. Architecture

- **Next.js 15, App Router, TypeScript.** Route handlers and server actions do the work. The terminal UI is a client component tree over a small **terminal engine**:
  - a screen buffer of 51–52 columns;
  - a typing scheduler;
  - an input focus model;
  - sound;
  - CRT layers.
- **Postgres** through **Drizzle ORM**. Hosting: Vercel with Neon or Supabase (the proposed default).
- **Auth:** Auth.js (NextAuth v5) with Credentials and Google providers. Separate signed "termlink" cookies carry intruder sessions.
- **Storage** for images and attachments: S3-compatible (Vercel Blob, R2 or Supabase Storage).
- **Gmail:** the `googleapis` client, with a sync worker (Vercel Cron to start with, a Pub/Sub push endpoint later).
- **Fonts:** Share Tech Mono (OFL) and FSEX300 (public domain), self-hosted.
- **Sound:** synthesised with WebAudio. We ship no game audio.

### Data model (first cut)
```
users(id, email, name, password_hash?, totp_secret?, created_at)
accounts(user_id, provider, provider_account_id, …)          -- Auth.js
terminals(id, owner_id, slug unique, name, header, welcome, server_no, theme,
          color, security_level, requires_key, lockout_mode, lockout_seconds,
          exploit_enabled, public_access, created_at)
nodes(id, terminal_id, parent_id?, kind[folder|document|image|switch],
      partition[private|public], title, body?, blob_key?, sort, created_at, updated_at)
switches(node_id, on_label, off_label, on_response, off_response,
         status_on, status_off, state, exposed)
hack_boards(id, terminal_id, visitor_id, words[], password_idx, grid, used_brackets[],
            attempts_left, resets_used, status, created_at)   -- server-only
lockouts(terminal_id, visitor_id, until)
access_log(id, terminal_id, actor[owner|intruder|guest], visitor_id?, event, detail, at)
mail_accounts(user_id, provider[gmail], email, enc_refresh_token, history_id, synced_at)
messages(id, user_id, source[termlink|gmail], external_id?, thread_id?, folder,
         from, to[], cc[], subject, text_body, date, unread, labels[])
attachments(id, message_id, filename, mime, size, blob_key)
holotapes(id, owner_terminal_id, source_terminal_id, node_snapshot, copied_at)
```

## 7. Screens and routes

| Route | Screen |
|---|---|
| `/` | Pip-OS boot splash, then `>` prompt: `LOGON` / `NEW TERMINAL` / `CONNECT <slug>` |
| `/register`, `/logon` | account creation and sign-in, drawn in the terminal style (typed prompts) |
| `/<slug>` | power-on, then the choice: owner logon (UOS `LOGON ADMIN` sequence) or intrude (Termlink intro, then the hack) |
| `/<slug>/hack` | the hacking board (server-driven) |
| `/<slug>/locked` | the lockout screen |
| `/<slug>/~/…` | the menu tree: folders, documents, images, switches |
| `/<slug>/edit/<id>` | the document editor |
| `/<slug>/mail/…` | inbox, message, compose (owner only) |
| `/<slug>/log` | the access log (owner only) |
| `/<slug>/config` | terminal configuration (owner only) |

## 8. Delivery plan

| Milestone | Scope |
|---|---|
| **M1: Terminal engine** | CRT shell, both themes, typing engine, menus, sound, keyboard and mouse input. A static demo terminal. |
| **M2: Accounts + terminals** | register and logon; create a terminal (name → slug); config screen |
| **M3: Documents** | folders, the reader, the editor, Public/Private partitions, images |
| **M4: Termlink hacking** | server-side board, intruder sessions, lockouts, access log |
| **M5: Termlink Mail (internal)** | slug-to-slug mail |
| **M6: Gmail sync** | OAuth link, import, incremental sync, send, read-state mirroring |
| **M7: Switches, holotapes, polish** | switches, copy-to-holotape, export/import, accessibility settings |

## 9. Open decisions
See the questions in the chat. The defaults assumed above:
- Vercel + Neon Postgres;
- one account can own several terminals;
- intruders get the Public Server only;
- Gmail in testing mode, behind an allow-list;
- RobCo branding in-app.
