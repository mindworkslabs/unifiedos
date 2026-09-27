# RobCo Unified Operating System (UOS): Research Report

This is the research behind the build. It covers what the terminal OS in the Fallout games is, every screen it shows, how each screen behaves, and how it looks and sounds. At the end it maps each screen onto the web app.

> **About the sources.** This environment's network policy blocks the Fallout wikis (fallout.fandom.com, fallout.wiki), Steam guides and Wikipedia, so they could not be read directly. The strings and mechanics below come from:
> - my knowledge of Fallout 3, New Vegas, Fallout 4 and Fallout 76;
> - fan recreations on GitHub that transcribe in-game text, especially `dayuna/RobCo-UOS` (a Fallout 3 replica). That repo confirms the Termlink boot script word for word.
>
> Items marked **[verify]** are ones I'm less sure of, such as exact punctuation, or which game uses which wording. They should be checked against gameplay footage before we call the build "exact".

---

## 1. What UOS is (lore)

| Item | Detail |
|---|---|
| Full name | **RobCo Industries Unified Operating System** (UOS) |
| Maker | RobCo Industries (Robert House's company) |
| Copyright line | `COPYRIGHT 2075-2077 ROBCO INDUSTRIES` |
| Hardware | RobCo terminals, model **RT-V300** (the terminal reports itself as `RIT-V300` during Termlink inquiry), attached to a server/mainframe |
| Login layer | **RobCo Industries Termlink**, the protocol that handles login and password recovery. Hackers abuse it by putting the terminal into *maintenance mode* and dumping the accounts file into memory. |
| Boot chain | **RETROS BIOS**, then the **MF Boot Agent**, then UOS |
| Interface | A text-only, menu-driven command-line interface. Menus are chosen with the cursor or keyboard; the player never types free text. |
| Games | Fallout 3 (2008), Fallout: New Vegas (2010), Fallout 4 (2015), Fallout 76 (2018). The look and wording differ slightly between games (see §9). |

In the fiction, terminals run everything: personal diaries, corporate memos, email, door and safe locks, turrets, robots, lights, alarms, holotape programs and minigames. Each terminal belongs to a location: a Vault, a factory, an office or a house. That is exactly the model this app turns into a real product.

---

## 2. Visual design system

### 2.1 Colour
Terminals are single-colour phosphor CRTs. Each colour is one hue at different brightness levels.

| Token | Approx. value | Use |
|---|---|---|
| `--phosphor` | `#1AFF80` (FO3/FO4 "Pip-Boy green"). Some rooms read nearer `#14FDCE` or `#33FF66`. | All text, borders, the cursor |
| `--phosphor-dim` | about 60% of `--phosphor`, e.g. `#0F9A4D` | Inactive text, junk characters in the hacking grid after they are used |
| `--screen-bg` | near-black green, `#021A0B` to `#031208` | Screen background |
| `--glow` | `--phosphor` at 35–60% alpha, 4–10px blur | Text-shadow bloom on every glyph |
| Highlight / selection | **Inverted**: background `--phosphor`, text `--screen-bg` | The hovered menu item, the highlighted word or bracket in the hacking grid |

Alternatives worth offering as themes: amber `#FFB642` (the default New Vegas Pip-Boy colour; NV *terminals* are still green), white and blue. Several fan projects ship these four schemes.

The hex values are approximations taken from screenshots. The games apply bloom, tint and a lot of post-processing, so there is no single "true" RGB value. **[verify against screenshots]**

### 2.2 Font
- **Terminals:** a bitmap-style **Fixedsys** face. Fans usually identify it as **Fixedsys Excelsior**. It is monospaced and blocky, with every character the same width. **[verify]**
- **Pip-Boy UI (not terminals):** **Monofonto** (Typodermic). Worth knowing so we don't mix the two.
- Web-safe open substitutes: `VT323` (Google Fonts, closest CRT feel), `Share Tech Mono`, or a self-hosted Fixedsys Excelsior (free licence; check its terms).
- All-caps is common but not required. Headers are uppercase; document bodies use mixed case.

### 2.3 CRT effects
Every one of these shows up in the games, and the replica needs all of them:
1. **Scanlines**: horizontal lines every 2–3px.
2. **Phosphor bloom and glow** on text.
3. **Screen curvature and vignette**: dark, rounded corners and a slightly convex look. The screen sits inside a physical bezel.
4. **Flicker**: a subtle brightness wobble.
5. **Rolling refresh bar** (most visible in FO4): a lighter horizontal band that slowly scrolls from top to bottom.
6. **Power-on/off**: power-on is a flash, then text appears; power-off collapses the picture to a horizontal line and then a dot.
7. **Type-on text**: output is drawn a character or a line at a time with a teletype click. FO4 is the most noticeable; FO3/NV draw faster.
8. **Blinking block cursor** `█` after the `>` prompt.

### 2.4 Layout grid
- The screen is 4:3 with a generous margin inside the bezel.
- Text is roughly 50–60 characters wide in-game, not a full 80. Fan projects use 80×24 as a practical grid.
- There are no windows, icons or mouse pointer. The only "graphics" are text characters:
  - `■` or `▮` attempt blocks
  - inverted highlight bars
  - `>` prompts
  - `█` cursor
  - `=`/`-` divider lines
  - `[ ]` brackets around actions (FO4)

### 2.5 ASCII "images"
Canon terminals show **almost no ASCII art**. The games are text and menus, and the holotape games (Red Menace, Atomic Command, Grognak, Pipfall, Zeta Invaders) are *raster* graphics in the same colour, not ASCII. The "images" people remember are:
- the attempt blocks `■ ■ ■ ■`;
- the hacking memory-dump grid, which *looks* like a picture of garbage memory;
- divider rules and centred headers;
- the centred `TERMINAL LOCKED` screen.

**For our app:** we should add *original* ASCII art in the same style: a boot logo, location banners generated from the location name (FIGlet-style), and simple glyph-based charts for "status" screens. It fits the aesthetic but isn't canon. RobCo, Vault-Tec, Vault Boy and Fallout are Bethesda/ZeniMax trademarks. See §11.

### 2.6 Sound
| Event | Sound |
|---|---|
| Keypress / menu move | a short mechanical keyboard click (several variants, chosen at random) |
| Each character typed onto the screen | a soft tick or "chirp" |
| Menu select | a heavier click or beep |
| Background | a constant CRT hum or fan noise |
| Power on / off | a relay clunk, then rising or falling hum |
| Hack: wrong word | an error buzz |
| Hack: dud removed or tries reset | a positive blip |
| Hack: success | an accepting chime or "unlock" |
| Lockout | a harsh buzz |

---

## 3. Screen map (every screen, in flow order)

```
[Power On] ─► [Termlink Boot Script]* ─► [Login / Password]
                                              │
                   ┌──────────────────────────┴──────────────┐
             (owner knows password)                (no password: HACK)
                   │                                          │
                   │                                 [Hacking Minigame]
                   │                                  │                │
                   │                           (success)        (4 misses)
                   │                                  │                ▼
                   ▼                                  ▼       [TERMINAL LOCKED]
            [Password Accepted] ───────────────► [UOS Main Menu]
                                                   │
          ┌─────────────┬──────────────┬───────────┼──────────────┬─────────────┐
     [Document /   [Sub-menu /     [Action      [Mail /       [Holotape /    [Log Off /
      Log Reader]   Folder]         (door, turret, Messages]   Program]       Exit]
                                    robot…) + result]
```
\* In the games, the boot script plays when you access a terminal or start a hack. We'll play it on every visit to a location slug.

---

## 4. Screen-by-screen specification

### 4.1 Power-on
- The screen is dark. A relay clicks, the screen flashes and brightens, and the hum starts.
- The cursor blinks top-left for a moment before any text appears.

### 4.2 Termlink boot / maintenance-mode script
This types out line by line. Lines starting with `>` look as if an operator typed them, character by character. The other lines are system responses and appear quickly. The text is confirmed word for word by `dayuna/RobCo-UOS`; the blank lines are approximate.

```
WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK

>SET TERMINAL/INQUIRE

RIT-V300

>SET FILE/PROTECTION=OWNER:RWED ACCOUNTS.F
>SET HALT RESTART/MAINT

Initializing Robco Industries(TM) MF Boot Agent v2.3.0
RETROS BIOS
RBIOS-4.02.08.00 52EE5.E7.E8
Copyright 2201-2203 Robco Ind.
Uppermem: 64 KB
Root (5A8)
Maintenance Mode

>RUN DEBUG/ACCOUNTS.F
```
What the script means in the fiction:
1. `SET TERMINAL/INQUIRE` asks for the terminal model.
2. `SET FILE/PROTECTION=OWNER:RWED ACCOUNTS.F` gives the owner Read, Write, Execute and Delete rights on the accounts file.
3. `SET HALT RESTART/MAINT` restarts into maintenance mode.
4. `RUN DEBUG/ACCOUNTS.F` dumps the accounts file into memory.

That dump is the hacking screen. An invalid command returns `INVALID FUNCTION OR ARGUMENT(S)`.

### 4.3 Hacking minigame (the core screen)

**Header.** The wording differs by game:

Fallout 3:
```
Welcome to ROBCO Industries (TM) Termlink
Password Required

Attempts Remaining: ▮ ▮ ▮ ▮
```
New Vegas / Fallout 4 / Fallout 76:
```
ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL
ENTER PASSWORD NOW

4 ATTEMPT(S) LEFT: ■ ■ ■ ■
```
When one attempt is left, the second line changes to a blinking `!!! WARNING: LOCKOUT IMMINENT !!!`.

**Memory dump.** Below the header:
- There are **two columns side by side, 17 rows each**.
- Each row is `0xHHHH` followed by **12 characters** of dump, so the dump holds 2 × 17 × 12 = 408 characters.
- The addresses are random 16-bit hex. They start at a random base (e.g. `0xF4F0`) and each row is `+0x000C` (12 in decimal). The right column continues on from the left.
- The dump is junk characters, `! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ { | } ~ \``, with **candidate words** (uppercase) hidden inside it.
- A word can wrap from the end of one row to the start of the next.
- All candidate words are the same length. Their number and length depend on difficulty.

Example (NV/FO4):
```
0xF4F0 $#(.{]>?-|;=  0xF5C4 .%;_[%?FORCE
0xF4FC !?_{SPIES+(/  0xF5D0 -=,!:;#>{"*@
0xF508 <*&,%!/TRIED  0xF5DC ]WANTS^(=&#?}
...
```

**Right panel.** A narrow column to the right of the dump:
- It shows a scrolling log of the results, newest at the bottom, each line prefixed `>`.
- The last line is a live prompt, `>` followed by the item under the cursor and then `█`.

**Cursor behaviour:**
- The cursor moves one character at a time with the arrow keys, or follows the mouse.
- Over a **letter of a word**, the **whole word** highlights (inverted).
- Over a **junk character**, only that character highlights.
- Over an **opening bracket** (`(`, `[`, `{`, `<`) that has a matching closing bracket **later on the same row**, the whole bracket group highlights, e.g. `[#$%]`.
  - Words may not sit inside a bracket group. Words in between break the pair.
  - Each bracket group works **once**.
  - Several pairs can start at different openers on the same row.

**Selecting a word.**

Wrong word, Fallout 3:
```
>SPIES
>Entry denied.
>2/5 correct.
```
Wrong word, NV/FO4/76:
```
>SPIES
>Entry denied
>Likeness=2
```
**Likeness** is the number of letters that match the password *in the same position*. Each wrong guess costs one attempt block.

Right word:
```
>FORCE
>Exact match!
>Please wait
>while system
>is accessed.
```
Then the screen clears and moves on to the UOS main menu (§4.6).

**Selecting a bracket group** has one of two random effects:
- **Dud removed.** One wrong word in the grid is replaced with `.` characters. Log line: `>Dud removed.`
- **Tries reset.** Attempts go back to 4. Log line: FO3 `>Allowance replenished.`, NV/FO4 `>Tries reset.` **[verify which wording each game uses]**

Selecting a plain junk character just echoes it and says `>Error` **[verify]**.

**Difficulty.** In FO3/NV the tiers and word lengths are:

| Tier | Skill required | Word length |
|---|---|---|
| Very Easy | Science 0 (FO3/NV) | 4–5 letters |
| Easy | Science 25 | 6–8 |
| Average | Science 50 | 9–10 |
| Hard | Science 75 | 11–12 |
| Very Hard | Science 100 | 13–15 |

FO4/76 use Novice, Advanced, Expert and Master instead, gated by ranks of the Hacker perk. Hacker rank 4 in FO4 prevents lockout. There are typically **12–20 candidate words**, and harder tiers have more similar words.

**Exploit (FO3/NV).** Leaving the terminal before the last attempt is used, then coming back, resets the attempts. We can keep this as a deliberate "feature".

### 4.4 Lockout screen
After the 4th wrong guess:
```
                TERMINAL LOCKED

         PLEASE CONTACT AN ADMINISTRATOR
```
- The text is centred on an otherwise blank screen. Any input exits.
- **FO3/NV:** the lock is permanent for that terminal.
- **FO4/76:** the lock is temporary, about 10 seconds, and then you can try again with a new puzzle **[verify timing]**.

For the web app, we make it a timed lockout per visitor per slug, with owner-configurable duration.

### 4.5 Password login (owner path)
In-game, a terminal is unlocked without hacking by having the password (found as a note or holotape) or by being authorised. The game then shows the terminal already unlocked, or briefly shows `Password accepted`-style feedback **[verify exact string]**. The player never types the password.

For the web app, the owner types a password at a `>` prompt, and the characters are echoed as `*`. On success, the same `Exact match! / Please wait / while system / is accessed.` sequence plays, which reuses the hacking success animation.

### 4.6 UOS main menu
**Header.** The same in all games, with the server number varying:
```
ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
COPYRIGHT 2075-2077 ROBCO INDUSTRIES
-Server 1-
```
- The server number varies by terminal: `-Server 1-`, `-Server 6-`, `-Server 12-` and so on.
- Below the header is a blank line, then the terminal's own **welcome/title line**, set by the location. Examples: `Welcome, Overseer.`, `Vault-Tec Security Terminal`, `Red Rocket Station 55 - Manager's Terminal`.
- Some terminals follow that with a divider (`===` or `---`) and a status line.

**Menu entries:**
- They are listed one per line, left-aligned.
- The hovered entry is **inverted** (a full-width highlight bar).
- **FO3/NV:** entries are plain text, e.g. `Personal Log 1`, `Disable Turrets`, `Open Safe`, sometimes prefixed with `> `.
- **FO4:** entries that *do* something are wrapped in brackets, e.g. `[Unlock Door]`, `[Disable Turrets]`, `[Open Safe]`, `[Robot Status]`. Documents and folders are plain text.
- Navigation: Up/Down (or mouse) and Enter/click to select. **Tab** (PC) goes back up a level. Some menus also end with an explicit `[Return]`/`Back` entry **[verify wording]**.

### 4.7 Sub-menu / folder
This is identical to the main menu, but the header is the folder name (e.g. `Personal Logs`, `Security Protocols`, `Mail`). Folders nest, usually two or three levels deep.

### 4.8 Document / log reader
- The title comes first, followed by a blank line. Examples: `Personal Log - Entry 3`, `RE: Rad-X shipment`, `Memo to all staff`.
- The body is prose in mixed case, typed on quickly.
- Long entries: FO3/NV show one screen at a time and page with the scroll keys; FO4 lets you scroll and shows a `▼`/more marker **[verify]**.
- Mail-style documents have `From:`, `To:` and `Subject:` lines, sometimes a `Date:` line, a blank line, then the body.
- Tab or Back returns to the menu.

### 4.9 Action entries (control screens)
Selecting an action either runs it immediately and shows a one-line result, or asks for a Yes/No confirmation. Common actions:

| Action | Typical result text (paraphrased) |
|---|---|
| `[Unlock Door]` / `Unlock Safe` / `Open Safe` | door or safe opens; the entry disappears or changes to `Lock Door` |
| `[Disable Turrets]` / `Enable Turrets` / `Retarget Turrets` | turrets go idle or turn hostile to their owners |
| `[Robot Status]`, `Set Robot to Friendly/Hostile`, `Activate Robot`, `Initiate Self-Destruct` | the robot behaviour changes |
| `[Disable Alarm]`, `[Lights On/Off]` | environment toggles |
| `Access Vault Door` / `Open Vault Door` | the story door opens |
| `[Load Holotape]` / program entries | runs a holotape program or game (FO4) |

In the app these become **"switches"**: simple owner-defined toggles with ON/OFF state and log text. For example, "Front Door: LOCKED" or "Turrets: ACTIVE". A hacker can flip them, and the owner sees it in an access log.

### 4.10 Holotape / program
- FO4 terminals with a tape deck can run holotape programs and games.
- The screen is taken over by the program, still in the single phosphor colour.
- Tab exits back to the terminal.

For the app this is a later feature: "programs" such as a built-in snake/Atomic-Command-style mini game, or a chat room.

### 4.11 Mail / messages
There is no separate mail app. Mail is a folder of documents (see §4.8). Fallout 76 terminals also carry messages from other characters.

For the app, a public "Leave a message" entry lets hackers or visitors drop notes into the owner's inbox. That is the social hook.

### 4.12 Log off / exit
- Exiting (Tab from the top menu) powers the screen down and returns to the world.
- Some terminals include an explicit `Log Off`/`Exit` entry.
- The screen collapses to a line and goes dark.

---

## 5. Input model summary

| Key | FO3/NV/FO4 behaviour |
|---|---|
| ↑ ↓ ← → / mouse | move the highlight (in the hacking grid, ← → move across characters and rows) |
| Enter / click | select |
| Tab | back or exit |
| No free text | the player never types in-game |

The app adds real typing in three places: the **password prompt**, the **document editor**, and an optional **command line**. The command line accepts `HELP`, `DIR`, `TYPE <doc>`, `LOGOUT` and the Termlink commands from §4.2, in the same VMS-like syntax the games imply.

---

## 6. Hacking algorithm (implementation notes)
1. Choose a difficulty and a word length L. Pick N candidate words of length L from a dictionary, one of which is the password. Bias the choice toward words that share letters in the same positions, so that likeness numbers carry information.
2. Build a 408-character dump from junk characters and insert the words at random, non-overlapping positions. Wrapping across rows is allowed, but never across the gap between the two columns.
3. After placing the words, check the bracket pairs. A pair is an opener, then the matching closer later on the same 12-character row, with no word letters between them. There should be a few of these.
4. Likeness is `count(i: guess[i] == password[i])`.
5. Bracket use: remove a dud (never the password) with probability p, otherwise reset tries. If no duds are left, always reset tries.
6. Everything is computed on the server. The client never receives the password. It sends a "select position X" request and gets back the log line.

---

## 7. What an "exact replica" contains, as a checklist
- [ ] CRT frame, scanlines, glow, flicker, roll bar, curvature
- [ ] Fixedsys-style font, phosphor palette, inverted selection
- [ ] Sound set (clicks, hum, success/fail, power on/off), with a mute toggle
- [ ] Power-on animation
- [ ] Termlink boot script (typed)
- [ ] Hacking minigame: FO3 header and wording, NV/FO4 header and wording (as a setting), 2×17×12 dump, likeness, brackets (dud removal and tries reset), lockout warning
- [ ] Lockout screen (timed)
- [ ] UOS header with a `-Server N-` line and a custom welcome line
- [ ] Nested menus and folders, keyboard and mouse navigation, Tab to go back
- [ ] Document reader with paging
- [ ] Action/switch entries with bracket styling (FO4) or plain styling (FO3)
- [ ] Log off / power-down animation
- [ ] Theme option: green (default), amber, white, blue

---

## 8. Mapping to the web app

| Game concept | App concept |
|---|---|
| A terminal at a location | a **Location**: a name plus a unique **slug**, e.g. `/t/megaton-water-plant` |
| The terminal's password | the owner's password (hashed on the server) |
| Hacking | anyone with the slug can play the minigame. Winning gives a **hacker session** for that location. |
| Menus, folders and logs | owner-created **folders** and **documents** |
| Doors, turrets and safes | owner-defined **switches** (cosmetic state plus an access log) |
| `-Server N-` and the welcome line | location settings |
| Difficulty (Very Easy to Very Hard) | owner-chosen hack difficulty per location |
| Lockout | a timed lockout per visitor per location |
| The terminal's history | an **access log** (logins, hacks, failed hacks, documents read) that the owner can see |

Proposed routes:
- `/` — power-on, then a "new location / enter slug" prompt
- `/t/[slug]` — boot script, then the login-or-hack choice
- `/t/[slug]/hack` — the minigame
- `/t/[slug]/menu`, `/t/[slug]/doc/[id]`, `/t/[slug]/edit/[id]`

Proposed stack:
- Next.js App Router with server actions
- PostgreSQL via Prisma or Drizzle
- `iron-session` or NextAuth credentials for sessions
- canvas or CSS for the CRT effects

---

## 9. Differences between games (summary)

| | Fallout 3 | New Vegas | Fallout 4 | Fallout 76 |
|---|---|---|---|---|
| Hack header | `Welcome to ROBCO Industries (TM) Termlink` / `Password Required` | `ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL` / `ENTER PASSWORD NOW` | same as NV | same as NV |
| Attempts line | `Attempts Remaining: ▮ ▮ ▮ ▮` | `4 ATTEMPT(S) LEFT: ■ ■ ■ ■` | same as NV | same as NV |
| Wrong-guess feedback | `x/y correct.` | `Likeness=x` | `Likeness=x` | `Likeness=x` |
| Difficulty gate | Science skill | Science skill | Hacker perk | Hacker perk cards |
| Lockout | permanent | permanent | timed | timed |
| Action styling | plain | plain | `[Bracketed]` | `[Bracketed]` |
| Text speed | fast | fast | slower type-on | slower type-on |

---

## 10. Open questions for you, before the build
1. **Which game's style should be the default:** FO3, NV or FO4? My recommendation is FO4 wording, with an FO3 theme toggle.
2. **What a successful hack grants:** read-only access, full owner access, or read access plus flipping switches? My recommendation is read-only access plus switches, and the owner gets a notification.
3. **Accounts:** one owner per location, or a user account that can own several locations?
4. **Hosting and database:** Vercel with Postgres (Neon or Supabase), or something else?
5. **Branding:** keep "RobCo" and "Vault-Tec" names, or use lookalike names for a public deployment? See §11.

## 11. IP note
Fallout, RobCo, Vault-Tec, Vault Boy and the game text are ZeniMax/Bethesda property.
- A private fan project using these names is common.
- A public or monetised app is safer if it:
  - uses parody names (or makes the brand configurable);
  - uses original ASCII art;
  - uses a free font instead of ripped assets;
  - uses original sound effects.
