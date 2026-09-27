# RobCo Unified Operating System (UOS): Research Report v2

This is the spec for building an exact replica of the terminals from Fallout 3, Fallout: New Vegas, Fallout 4 and Fallout 76. It covers every screen, how each one behaves, and the visuals, sound and data model, followed by how each part maps onto our web app.

Version 2 replaces the first draft. Several things in v1 were wrong, and game data corrected them:
- The FO3 and FO4 hacking headers were swapped.
- FO3/NV use `Allowance replenished.`; FO4 uses `Tries Reset.`.
- FO4 menu items do **not** have square brackets.
- The FO4 font is Share Tech Mono.
- The FO4 lockout has no "TERMINAL LOCKED" screen.

## 0. Sources and confidence

The Fallout wikis, Steam, Wikipedia and YouTube are blocked in this environment. That forced the research onto **primary game data** published in open-source repositories, which beats the wikis anyway:

| Code | Source | What it gave |
|---|---|---|
| XE | `TES5Edit/TES5Edit`: `wbDefinitionsFO3/FNV/FO4/FO76.pas` | the exact terminal record structure, enums and flags for every game |
| GS-NV | `cbaoth/Fallout-TTW`: `GameSettings.ALL.ini` | the vanilla value of every New Vegas game setting (GMST), including all UI strings |
| SYM | `ieee802dot11ac/fnv`: Xbox 360 symbol dump | string literals from the NV executable: the junk-character set, bracket sets and word-list path |
| XML | `fakeman42/NVCHS`: `computers_menu.xml`, `hacking_menu.xml`, plus the `.fnt` font files | the FO3/NV screen layout, fonts, colours and highlight rules |
| INI | vanilla `Fallout.ini` for FO3 and NV; `Fallout4.ini` / `Fallout4Prefs.ini` | colours, typing rates, scanline and flicker settings |
| AS3 | `F4CF/Interface`: decompiled FO4 `TerminalMenu.swf` (`Terminal.as`, `MenuItemList.as`, `TerminalButtons.as`) and `README.Fonts.md` | the FO4 layout (pixel exact), font, typing engine, paging and help bar |
| STR4 | `pavelhoral/fallout4-preklad`: a FO4 translation keeping the English source strings | every FO4 UI and hacking string, and real terminal text |
| SS | an in-game FO3/NV hacking screenshot (`owenmccadden/fallout-terminal-solver`) | visual confirmation of the grid, header and log |
| DICT | `bombcheck/Fallout.Terminal-Hacking`, `DeceitfulDragon/fallout-hacking-game` | the game's hacking dictionary, `FalloutDict.txt` |
| FAN | about 25 open-source replicas (listed in §13) | implementation ideas and CSS values |

Each fact below carries a confidence tag:
- **H**: read from game data, decompiled UI or a screenshot.
- **M**: several secondary sources agree, or a strong inference from H data.
- **L**: memory or one weak source.

Anything not tagged is H.

---

## 1. What UOS is (lore)

- **The OS.** The **RobCo Industries Unified Operating System** is published and copyrighted by RobCo Industries (founded in 2042 by Robert House), "in 2075 with an expiration date in 2077". By 2075, UOS, the **MF Boot Agent** and the **RETROS BIOS** were "the de facto industry standard for terminals and mainframes". (M, wiki snippets)
- **Termlink.** The **RobCo Industries Termlink** protocol runs *before* UOS. It handles logon and password recovery or reset, and it is what hackers abuse. (M)
- **Hardware.** The standard terminal is the **RIT-V300**: a green CRT, an alphanumeric keyboard, four function keys, two knobs and 64 KB of RAM. It is sometimes a "dumb" terminal attached to a mainframe. The name nods to the DEC VT100, and the command syntax is VAX/VMS style: `SET FILE/PROTECTION=…`. (M)
- **Related RobCo software.** These are canon strings that can be reused for flavour:
  - `RobcOS v.85 (C)2076 Robco`, the FO3 turret OS
  - `RobCo Service Terminal V 6.0.3.2.1.a`, the FO3/NV Protectron terminals
  - `Standard Protectron Control Interface v2.40`, FO4
  - `Standardized Turret Control Firmware v8.13`, FO4
  - `PIP-OS(R) V7.1.0.8`, the FO4 Pip-Boy
- **Not canon.** "UOS v7.0.2.8" was invented by a fan GitHub org (RobCo-Industries). Don't use it as canon.

---

## 2. Game differences at a glance

| | **FO3 / New Vegas** | **FO4** | **FO76** |
|---|---|---|---|
| Menu header | `ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM` / `COPYRIGHT 2075-2077 ROBCO INDUSTRIES` / `-Server N-` (global, three lines) | Set per terminal; almost always `Welcome to ROBCO Industries (TM) Termlink` | Same as FO4 |
| Hacking intro | Termlink maintenance-mode script (13 lines) | none | none |
| Hacking header | `ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL` / `ENTER PASSWORD NOW` / `4 ATTEMPT(S) LEFT: ■ ■ ■ ■` | `Welcome to ROBCO Industries (TM) Termlink` / `Password Required` / `Attempts Remaining: ■ ■ ■ ■` | Same as FO4 |
| Wrong guess | `>Entry denied` / `>x/y correct.` | `>Entry denied.` / `>Likeness=x` | Same as FO4 |
| Bracket results | `>Dud removed.` / `>Allowance` `>replenished.` | `>Dud Removed.` / `>Tries Reset.` | Same as FO4 |
| Success | `>Exact match!` / `>Please wait` / `>while system` / `>is accessed.` | `>Password Accepted.` | Same as FO4 |
| Last-attempt warning | `!!! WARNING: LOCKOUT IMMINENT !!!` (flashing) | none | none |
| Lockout | permanent: `TERMINAL LOCKED` / `PLEASE CONTACT AN ADMINISTRATOR` | 10 seconds: `>Init Lockout`, then "This terminal has locked you out." | timed; perk cards shorten it |
| Font | `Fixedsys_Comp_uniform_width` (bitmap) | **Share Tech Mono** | Same as FO4 (M) |
| Default colour | `#1AFF80`; the terminal colour setting is `#21E779` | the Pip-Boy tint, default `#14FF17` | green (L) |
| Typing speed | menus and notes 150; hacking output 67, input 20, dump 500 | 60 characters per second | about 450 characters per second (L) |
| Back navigation | an automatic `Back` item in submenus, plus Tab | Tab (`TAB) EXIT`); authors add "return" items | Same as FO4 |
| Visible menu rows | 12 | 12 (it scrolls) | 12 |
| Images | notes can show images | a "Display Image" item type | Same as FO4 |
| Holotapes | none on terminals | `R) LOAD HOLOTAPE`: programs, games and terminal tapes | a holotape item type |

**Recommendation:** build both FO3/NV and FO4 as switchable "firmware" themes on the same engine. Every screen below notes where the two differ.

---

## 3. Visual system

### 3.1 Fonts
- **FO3/NV** use font slot 5, `Textures\Fonts\Fixedsys_Comp_uniform_width.fnt`, labelled "Terminals" in the font config. It is a bitmap font: every glyph advances exactly **17 px**, lines are 25 px, capitals are about 20 px tall, and the hacking-grid rows are 28 px apart. The Pip-Boy and HUD use Monofonto, which terminals do **not** use. The web substitute is **Fixedsys Excelsior 3.01** (`FSEX300`, public domain).
- **FO4/76** use `$Terminal_Font = "Share-TechMono"`, which is **Share Tech Mono** (Google Fonts, SIL OFL, so we can ship it legally). Every text field is **26 px with a 29.05 px line height**; list items add 1 px letter-spacing. Each character is 14.04 px wide, so the body holds **51 columns × 17 lines**.

### 3.2 Colour
| Token | FO3/NV | FO4 | Notes |
|---|---|---|---|
| Phosphor (text) | `#1AFF80` (26,255,128), the HUD/Pip-Boy/system default. `iSystemColorTerminal` = `#21E779` (33,231,121). | `#14FF17` (the `fPipboyEffectColor` default of .08/1/.09) | FO4 draws everything in white and the engine tints it. Whether terminals follow a custom Pip-Boy colour is disputed (M/L); default to green. |
| Highlight | a bar in the phosphor colour at **88% opacity** (`_fill_alpha 224`) with text `rgb(0,5,0)` | a **solid** bar with text `#000000` | inverse video |
| Background | the dark, noisy `pipboy.dds` texture (around `#2C3638` before tint), shown at 90 brightness out of 255 | transparent, over the 3D monitor's dark glass | on the web, use about `#021A0B` to `#031208` with noise |
| Warning / alternate | HUDAlt `#FF432A` (not used on terminals) | | |
| Menu brightness | 255 at high definition, 175 at standard | | |

Themes for our app: green (default), amber `#FFB642` (the New Vegas Pip-Boy default), white, and blue. Canon terminals are green; the other colours are for users who want them.

### 3.3 Layout grids

**FO3/NV terminal** (4:3 canvas, e.g. 1280×960):
- **Header:** three centred lines from y=30: header 1, header 2, then the `-Server N-` line.
- **Welcome text:** at x=50, 20 px below the header, wrapping at 900 px. A separator line sits 10 px below it.
- **Menu list:** 880 px wide, **12 visible items**, scrollbar hidden.
- **Body/note text:** clipped, scrolling in 30 px steps, up to 150 lines.
- **Result prompt:** `>` 30 px above the bottom, with the result text 34 px to its right.
- **Cursor:** a solid **17×17 block** blinking every **400 ms**.
- **Width:** about 51–52 columns of text.

**FO3/NV hacking** (920×630 drawing area):
- **Header block:** 150 px tall.
- **Grid:** 2 columns × 17 rows. Each column is 19 characters: `0xF4F0` + space + 12 data characters.
- **Metrics:** 17 px per character, 28 px per row. Column 2 starts at x=342.
- **Attempt markers:** 17×17 solid blocks, spaced two cells apart.
- **Log:** the space to the right, about 13 characters wide.

**FO4 terminal**: an **826×700** stage (pixel coordinates from the decompiled UI):

| Element | x, y | Size |
|---|---|---|
| Header | 51, 33.9 | 716 wide |
| Welcome | 51, 72.45 | 716 wide |
| Body text | 51, 119.45 | 716 × 497.65 |
| Menu list | 49.85, 122.45 | 12 rows of 34.8 px. After body text finishes typing, the list moves to sit 10 px below it and shrinks to fit. |
| `>` prompt | 51, 634.45 | |
| Response text | 83, 634.45 | 684 wide |
| "Attempts Remaining:" | 51, 115.8 | |
| Attempt blocks | x 332.7 to 432.7 in steps of 25, y 119.25 | 5 slots |
| Image area | 51, 119 | shows a bitmap |

Scroll indicators are small triangles at the left edge of the list. The FO4 cursor is a **12.5×18.5 px** block on a 5-frames-on / 5-frames-off cycle. The attempt blocks use the same graphic, frozen.

The **FO4 help bar** is a separate screen-space strip *below* the monitor, not green:
- It reads **`TAB) EXIT`** and, when a holotape is available, **`R) LOAD HOLOTAPE`**.
- A left-aligned PC hint renders as `KEY) LABEL`; a right-aligned one as `LABEL (KEY`.
- Controller equivalents are B and X.

### 3.4 CRT effects
In both games the menu is rendered to a texture on a **3D monitor model**. The curvature and bezel come from the model; the rest is post-processing. What the game data contains:
- **Scanlines:** in FO3/NV, `bDoRenderedTerminalScanlines=1` with `fRenderedTerminalScanlineScale=130`, i.e. about 130 soft bands per screen height, one every ~7 px at 960 tall. The texture `PipboyScanlines.dds` gives soft bands dimming to about 80%, not hard black lines.
- **Distortion and roll:** `PipboyDistortEffectMap.dds` drives horizontal jitter bands and a rolling line, through the shader `ISTV.pso`. Menu transitions have a **vertical-hold roll** chance of 0.08 and a **shudder** chance of 0.20.
- **Flicker:** enabled for menus and the Pip-Boy. There are brightness bursts of about 200 ms at 2×.
- **Glow:** blur plus brighten. The menu uses a blur radius of 0.3 at 1.7× brightness; the Pip-Boy screen uses 3.5 at 0.25 intensity with 1.3× brightness.
- **Screen light:** the terminal screen casts light into the room: colour (0.68, 0.74, 0.62), intensity 1.2, radius 80.
- **FO4:** the same family of effects through `ImageSpaceEffectPipboyScreen`, controlled by the scanline, flicker and blur settings.

Recommended web values, from the best replicas (AlrikOlson/robco-terminal, cool-retro-term):
- curvature 0.02
- vignette 0.55
- scanline strength 0.55
- noise 0.045
- chromatic aberration 0.012
- brightness wobble `1 + .04·sin(7.3t) + .02·sin(23.1t) + .015·sin(211t)`

A CSS fallback is the classic scanline layer, `linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,.25) 50%)` at 2 px, plus a text-shadow glow, a slow roll bar and a flicker keyframe.

### 3.5 Text animation
- **FO4:** 60 characters per second (`iTerminalDisplayRate`), on 33 ms ticks with fractional carry. The typing order is header, welcome, body (a page at a time), then each menu item. The cursor rides the last character typed. Accept or a click **completes all typing instantly**. Soft wraps become hard line breaks.
- **FO3/NV:** menus and notes type at 150 (`iComputersDisplayRateMenus/Notes`). Hacking prints output at 67, input at 20 and the memory dump at 500. Result text stays up for 5 s. Menus fade in over 0.25 s.
- Both loop a type-out sound while text is appearing.

### 3.6 Sound
| Event | FO3/NV file | FO4 sound record |
|---|---|---|
| Single key / cursor move | `ui_hacking_charsingle_01..08` | `UITerminalCharArrow` |
| Several characters | `ui_hacking_charmultiple_01..04` | |
| Enter / select | `ui_hacking_charenter_01..03` | `UITerminalCharEnter` |
| Type-out loop | `ui_hacking_charscroll(_lp)` | `UITerminalCharScrollLP` |
| Password good / bad | `ui_hacking_passgood` / `ui_hacking_passbad` | `UITerminalPasswordGood` / `…Bad` |
| Ambient hum | `ui_hacking_fanhum_lp` | |
| Holotape load / quit | | `UITerminalHolotapeProgramLoad` / `…Quit` |

The game audio is Bethesda's, so **we synthesize our own**, following AlrikOlson's WebAudio-portable recipe:
- **Key ticks:** short sine bursts plus noise at 1450 Hz for 6 ms, 1260 Hz for 7 ms, 2050 Hz for 4.5 ms and 1560 Hz for 6.5 ms, chosen at random.
- **Hum:** a 2 s loop of `60 Hz×.38 + 120 Hz×.16 + 180 Hz×.10 + 15.7 kHz×.012 + low-passed noise ×.09`.

### 3.7 ASCII art and images
- **Canon has no ASCII art on terminals**, in any of the four games. Decoration is limited to:
  - ruled lines: `=====`, `-----`, `\\\\ … ////`
  - `>` prompts and `>>` user logs
  - the `<!>` warning marker
  - `:::SYSTEM ERROR:::`-style banners
  - the blocks and highlight bars
- Terminals show **real bitmap images** instead: FO3/NV notes can display images, and FO4 has a "Display Image" item type. The holotape games are graphics too.
- **For us:**
  - Support image documents: user uploads rendered in phosphor green through a CSS filter, e.g. `grayscale(1) brightness(.4) sepia(1) hue-rotate(50deg) saturate(10) contrast(.8)`.
  - Optionally add **original** ASCII banners, such as a FIGlet banner generated from the location name. Mark them as our flourish, not canon.
  - Stick to 7-bit ASCII. Braille and block art breaks the monospace grid in Fixedsys and Share Tech Mono.

---

## 4. Terminal data model (the game's own record structure)

This is the most useful part for the build: it is how Bethesda authors a terminal, so our database should mirror it.

### 4.1 FO3/NV TERM record
- **Description ("Welcome Text"):** required. Shown under the global header.
- **Password Note:** if the player holds this note or holotape, hacking is skipped.
- **Base Hacking Difficulty:** `0 Very Easy, 1 Easy, 2 Average, 3 Hard, 4 Very Hard, 5 Requires Key`.
- **Flags:** `Leveled` (difficulty scales with the player), `Unlocked` (no login at all), `Alternate Colors`, `Hide Welcome Text when displaying Image`.
- **Server Type:** `0..9` maps to `-Server 1-` … `-Server 10-`. There are exactly 10.
- **Menu Items** (repeating):
  - `Item Text`
  - `Result Text` (required; typed after `>` when chosen)
  - `Display Note` (a note shown as a document, or an image/sound)
  - `Sub Menu` (another terminal record)
  - `Flags`: `Add Note` (also copies the document into the player's Pip-Boy) and `Force Redraw` (redraw the list and re-evaluate conditions)
  - a Result Script
  - Conditions (show or hide the item)
- **No type enum.** An item's behaviour follows from which fields are filled:
  - a Note: open a document;
  - a Sub Menu: open a folder;
  - neither: an **action**, which prints Result Text and runs the script.
- **Toggle pattern.** The "Unlock Door" / "Lock Door" pair is two items with opposite conditions plus Force Redraw.
- **Limits.** Only about 7–8 items fit comfortably (12 visible in the layout), and the list does not page. Submenus automatically get a **`Back`** item (`sComputersBack`). Tab also goes back, and from the top level it exits.

### 4.2 FO4 TERM record
- **Header Text:** set per terminal, usually `Welcome to ROBCO Industries (TM) Termlink`.
- **Welcome Text.**
- **Body Text:** a list of `{text, conditions}`. The first entry whose conditions pass is shown under the welcome line, e.g. a status line.
- **Menu Items:** each has `Item Text`, `Response Text`, `Item ID`, `Display Text`, `Show Image`, `Submenu`, Conditions and a Papyrus fragment. The **Type** enum is:
  - `4 Submenu – Terminal`: open a child terminal, "like a hyperlink"
  - `5 Submenu – Return to Top Level`: jump back to the root
  - `6 Submenu – Force Redraw`: stay here, redraw, re-check conditions
  - `8 Display Text`: show a document page
  - `16 Display Image`: show a bitmap
- **Holotapes:** a terminal can start with holotapes inside it.
- **Lock levels:** `Novice, Advanced, Expert, Master, Requires Key` plus a Leveled flag. For terminals these need Hacker perk ranks 0, 1, 2 and 3.

### 4.3 FO76 TERM
The same as FO4. The item type becomes a flag set: `Return to Top, Redraw, Submenu, Display Text, Display Image, Holotape, Template`.

### 4.4 Documents (NOTE)
- **FO3 notes** are one of four types: `Sound, Text, Image, Voice`.
- **FO4 holotape notes** are one of four: `Sound, Voice, Program (.swf), Terminal`.

---

## 5. Screen flow

```
                       ┌─────────────────────────────┐
                       │ POWER ON (flash, hum, cursor)│
                       └──────────────┬──────────────┘
              ┌───────────────────────┼─────────────────────────┐
         Unlocked flag            has password               locked
              │                  (owner login)                  │
              │                       ▼                         ▼
              │          [LOGON ADMIN typed sequence]   [FO3/NV: Termlink intro]
              │                       │                         ▼
              │                       │                 [HACKING SCREEN]
              │                       │               success │     │ fail ×4
              ▼                       ▼                       ▼     ▼
        ┌──────────────────── [UOS MENU (root)] ◄───────┘   [LOCKOUT]
        │                        │    │     │
        ▼                        ▼    ▼     ▼
   [SUBMENU / folder]     [DOCUMENT] [IMAGE] [ACTION → response at > prompt]
        │  (Back / Tab)                       (+ Force Redraw toggles)
        ▼
   ...nested...          [HOLOTAPE: program / terminal tape] (FO4, R key)
                                   │
                          TAB at root → [POWER OFF]
```

---

## 6. Every screen, in detail

### S1. Power-on
The screen goes from dark to a flash, the brightness settles, the hum starts, and the cursor blinks. (M; the effect comes from the render and menu-fade code: a 0.25 s fade, possibly a vertical-hold roll.)

### S2. Termlink hacking intro (FO3/NV only)
These are game settings `sHackingIntro01` to `13` (H). The menu file has a dedicated intro stage that hides the header, grid and log while it plays. The operator lines are drawn as if typed at the input rate; the system replies print at the output rate.
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
- The strings are H. The `>` prefixes and blank lines follow replica convention (M).
- "Copyright 2201-2203" is a real mistake in the game; keep it for fidelity.
- In the fiction, the commands mean: query the terminal model, give yourself RWED rights on the accounts file, restart into maintenance mode, then dump the accounts file into memory. That dump *is* the hacking screen.
- How visible the intro is in normal play is disputed (L). It may flash by at the fast rate.

### S3. Owner logon (password known)
- FO3/NV have the string `LOGON ADMIN` (`sComputersLogon`) and a four-line logon intro area in the layout. FO4 has `LOGIN ADMIN`.
- Reconstruction (M):
  ```
  WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK
  >LOGON ADMIN
  ENTER PASSWORD NOW
  >********
  ```
  After that, the menu opens.
- In-game this plays automatically when you hold the password. **In our app the owner actually types the password here**, with the input echoed as `*`.
- FO4 extras: `Accessing system.  Please wait...` and `Loading holotape.  Please wait...` (H).

### S4. Hacking screen

**FO3/NV** (H; checked against the screenshot):
```
ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL
ENTER PASSWORD NOW                      ← at 1 attempt left: "!!! WARNING: LOCKOUT IMMINENT !!!" flashing 750ms on / 500ms off

4 ATTEMPT(S) LEFT: ■ ■ ■ ■

0xF4F0 -|%'_$[!=<=> 0xF5BC PPEARING-.>:
0xF4FC $@/'/{+;@"<? 0xF5C8 '#<_)RECUPER
0xF508 ,]=)%@TRANSC 0xF5D4 ATING\|.*["'
0xF514 RIBING(.={[/ 0xF5E0 %;$>>_"'+"}@
 … 17 rows per column …                    >TRANSCRIBING
0xF5B0 -!;<|=',DISA 0xF67C BORATORIES*> >Entry denied
                                           >1/12 correct.
                                           >█
```

**FO4/76** (H for the strings; M for the grid size):
```
Welcome to ROBCO Industries (TM) Termlink
Password Required

Attempts Remaining: ■ ■ ■ ■

0xF4F0 …12 chars…   0xF5BC …12 chars…      >SPIES
 …                                         >Entry denied.
                                           >Likeness=2
                                           >█
```

**Memory dump rules:**
- The dump is 2 columns × 17 rows × 12 characters = **408 characters**, one continuous buffer read left column then right column.
  - FO4 is most likely the same: its grid width comes from `GetHackingBoardCharWidth()`. Some fans report 16 rows (M).
- **Addresses** are `0x` plus 4 **uppercase** hex digits. They start at a random base (seen: 0xF4F0; replicas use a random value from 0xF000 to 0xF900) and step **+0x0C** per row. Column 2 continues where column 1 ends (0xF5B0 → 0xF5BC).
- **Words** are uppercase and all the same length. They **wrap across rows and across the column break** (screenshot: `DISA` + `PPEARING`). The count is 5 to 20 (`iHackingMinWords`/`MaxWords`), with fewer words when your skill is well above the lock's requirement.
- **Junk characters** (from the NV executable) are exactly these 30: `` ! @ # $ % ^ * ( ) _ + = - ` [ ] { } | ; ' : , . / < > ? \ " ``. There is **no `&` and no `~`**.
- **Dictionary:** `Data\Menus\FalloutDict.txt` (FO4: `Interface\FalloutDict.txt`) holds 4,709 unique words, 555 at 4 letters falling to 3 at 15 letters. It was built from Van Buren design documents. It is Bethesda data, so we build our own list. Borrow the replicas' idea of **clustering similar words** (FEVER/SEVER/SEWER/SEVEN) so that likeness scores tell you something.

**Cursor and selection:**
- The cursor moves one character at a time (arrow keys or mouse).
- Over a word, the **whole word** highlights, in two boxes if it wraps.
- Over junk, only that character highlights.
- Over an **opening bracket** `( [ { <` with its matching closer **later on the same row** and **no letters between**, the whole group highlights. Removed-dud dots count as junk. Brackets never wrap across rows.
- Nesting of different bracket types is allowed. `[ [ ]` gives two groups; `[ ] ]` gives one. Each group works **once**.
- The hovered text is echoed live after the `>` prompt in the log.

**Results:**

| Action | FO3/NV log | FO4/76 log |
|---|---|---|
| Wrong word | `>WORD` `>Entry denied` `>x/y correct.` (x = letters in the right position, y = word length) | `>WORD` `>Entry denied.` `>Likeness=x` |
| Right word | `>Exact match!` `>Please wait` `>while system` `>is accessed.` | `>Password Accepted.` |
| Bracket → dud | `>Dud removed.` (a wrong word turns into `.` characters of the same length and stays in the grid) | `>Dud Removed.` |
| Bracket → reset | `>Allowance` `>replenished.` (attempts back to 4) | `>Tries Reset.` |
| Bracket with no duds left | `>Entry denied` and no effect (M) | |
| Lone junk character | echoed; no attempt lost (L) | `>Error`, no attempt lost (M) |
| Last attempt fails | `>Lockout in` `>progress.` then S5 | `>Init Lockout` then S5 |

- **Bracket odds:** usually a dud is removed, and sometimes attempts are reset. Replicas use about a 1-in-3 or 30% chance of a reset, and cap resets at once per board. The NV menu has a flag, `hasAllowanceReplenished`.
- **Attempts:** 4. The FO3 perk Computer Whiz gives one more try at a locked terminal. In FO4 the display has up to 5 blocks.
- **The log** keeps (board height − 1) lines, each prefixed with `>`, roughly 13 characters wide. The oldest line scrolls off the top.

**Difficulty:**

| FO3/NV | Science needed | Word length (L/M, commonly quoted) | NV XP |
|---|---|---|---|
| Very Easy | 0 | 4–5 | 20 |
| Easy | 25 | 6–8 | 30 |
| Average | 50 | 9–10 | 40 |
| Hard | 75 | 11–12 | 50 |
| Very Hard | 100 | 13–15 | 60 |

- FO4/76 use Novice, Advanced, Expert and Master, gated by Hacker ranks 0, 1, 2 and 3 (FO4 ranks unlock at levels 1, 9, 21 and 33 and need Intelligence 4). **Hacker rank 4 removes lockouts.**
- The canon dictionary has only 12 and 3 words at 14 and 15 letters, so cap generated boards at 12–13 letters or pad from a supplementary list.
- **Exit-and-reset exploit** (all games): leaving before the last attempt and coming back gives a fresh board with full attempts. FO3/NV have a `SECURITY RESET...` string (M). We keep this, since it is iconic, with an owner toggle to disable it.

### S5. Lockout
- **FO3/NV:** a blank screen, centred slightly above and below the middle:
  ```
  TERMINAL LOCKED

  PLEASE CONTACT AN ADMINISTRATOR
  ```
  The lock is permanent for that terminal. The unused NV string "You cannot hack this computer." exists.
- **FO4:** the lockout lasts 10 s (`iTerminalLockoutTime=10`). Using the terminal during it shows the message "This terminal has locked you out." Afterwards you get a new board.
- **FO76:** a timed lockout that the Hacker cards reduce.
- **Requires Key** terminals cannot be hacked. FO3/NV show `A %s skill of %d is required to hack this terminal.` when skill is too low. FO4 shows `Requires a higher level Hacker perk.` and `%s needed for terminal.`
- **For us:** a timed lockout per visitor per slug. The owner chooses "permanent (FO3)" or a number of seconds (FO4 default 10 s; we'd suggest longer).

### S6. UOS menu (root)

**FO3/NV:**
```
        ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
          COPYRIGHT 2075-2077 ROBCO INDUSTRIES
                      -Server 6-

Welcome to ROBCO Industries (TM) Termlink        ← "welcome text", per terminal, may be multi-line
________________________________________________ ← separator line
 Personal Log                                     ← menu items, 12 visible
▐Disable Turrets                                 ▌← highlighted: 88% phosphor bar, black text
 Open Safe
                                                  (submenus add a "Back" item)
>█                                                ← result prompt near bottom
```

**FO4:**
```
Welcome to ROBCO Industries (TM) Termlink         ← header, per terminal
VAULT-TEC RECREATION TERMINAL                     ← welcome
Cryogenic Array: Offline.                         ← body text (conditional status)
 > Personal Logs
▐Open Door                                       ▌
 Disable Automated Turrets
>█
                               TAB) EXIT   R) LOAD HOLOTAPE   ← help bar under the monitor
```
- **Real FO4 item text** from the string data: "Open Door", "Unlock Door", "Open Blast Door", "Open Bulkhead Door", "Disable Automated Turrets", "Activate Light(s)" / "Deactivate Light(s)", "Activate Unit(s)", "Disable Security System", "Unlock the Security Gate", "Unlock cage". These are **plain text, not in brackets**.
- Bracketed tokens in the data are status words such as `[OFFLINE]`, `[INACCESSIBLE]` and `[Locked - Broken]`.
- Some folder items begin with `>`, e.g. `> Personal Logs` (M).

**Real welcome and header lines** (useful as presets; all H unless marked):
- FO3/NV:
  - "Welcome, Comrade!"
  - "Greetings Vault Technician!\nHow Can This Terminal Help You Today?"
  - "RobCo Service Terminal\nV 6.0.3.2.1.a"
  - "Public Server Access" (REPCONN)
  - "REPCONN Badge Processing"
  - "Welcome to PoseidoNet, General." (HELIOS One)
  - the SoftLock lines "SoftLock Solutions, Inc" / "Your Security is Our Security" / ">\ Welcome, USER" (M)
  - "Welcome, Overseer." (M)
  - "ROBCO Model RX-6550 Terminal System" (M)
- FO4:
  - "VAULT-TEC RECREATION TERMINAL"
  - "Thank you for choosing Vault-Tec!"
  - "==== Institute Central Network ====" (M)
- FO76:
  - `\\\\ FACILITY STATUS TERMINAL ////`
  - "CONFIDENTIAL SECURITY EYES ONLY" (M)

**Header details:**
- In FO3/NV the three-line header is **global**; it lives in the game settings `sComputersHeader1/2` and `sTerminalServerText1-10`. A terminal can only choose its server number (1–10) and welcome text.
- In FO4 the header is set per terminal.
- **For us:** the location name becomes the FO4-style header or the FO3 welcome text, and the owner picks the server number.

### S7. Submenu / folder
- It looks the same as the root. FO3/NV redraw the global header plus the folder's own welcome text.
- FO3/NV add an automatic `Back` item.
- FO4 relies on Tab and on authored "return" items (type 5, Return to Top Level). Tab goes back one level, and at the root it **exits**.

### S8. Document reader
- It shows the title and then the body. The text types on, and a key or click completes it.
- **FO4 paging:** a page ends at the last hard line that fits the 716×498 body box (about 17 lines). It then waits for Accept and types the next page. There is no "more" string.
- **FO3/NV:** the body scrolls in 30 px steps, up to 150 lines.
- Mail-style documents use `From:`, `To:` and `Subject:` lines. Logs are titled like "Personal Log - Entry 3" or "Journal Entry 12/08/77".
- **Add Note** (FO3/NV) also gives the reader a copy in their Pip-Boy, shown as `Note Added: %s`. **For us:** a "Save to my Pip-Boy" feature, which copies the document to the hacker's account.

### S9. Image
- FO4's Display Image fills the body area with a bitmap.
- FO3 has a flag to hide the welcome text while an image is displayed.
- **For us:** uploaded images, tinted phosphor green.

### S10. Action and response
- Choosing an action types its **Response/Result Text** after the `>` prompt at the bottom, then may redraw the list. Real examples:

| Terminal | Text |
|---|---|
| Security door | status `STATUS: Locked` / `Busy` / `Unlocked`; response `Security lock released. Opening doors...` / `Security lock engaged. Sealing doors...` |
| FO4 turret | header `Standardized Turret Control Firmware v8.13`; items `Deactivate` / `Activate`, `About your Defense System`, `System Diagnostics` |
| FO3 turret (RobcOS) | the ruled user-log header below; items `Re-configure Targeting Parameters`, `WARNING: No Targeting Data`, `Deactivate Turret System`; responses `Target Data Cleared. Exercise Caution.` and `<!>Please Exercise Caution<!>` |
| Protectron pod | `...Accessing pod... ...Initializing unit... ...Loading assigned subroutines...` then `Please advise any personnel standing near charge pod to make way.`; personality options answered with `Personality parameter reset.` |
| Self-destruct (Easy City Downs) | items `Confirm` / `Cancel`; warning "…Once activated, it cannot be canceled."; response `...activating Emergency Self-Destruct... ...overriding safety protocols... done. A five-second countdown has been initiated. Please evacuate the area.` |

The FO3 turret header (RobcOS):
```
RobcOS v.85 (C)2076 Robco
========================
| User Log:
| >> Administrator (RobcoID 2398-H)
| >> Default Targeting_Param:
| >>> RobcoIndustrial_userGroup
========================
```

- **For us:** owner-defined **switches**, e.g. `Front Door`. Each has ON and OFF item text, a response text and a status line (`STATUS: Locked`), rendered with the toggle pattern. A hacker can flip them, and every flip is logged.

### S11. Holotape (FO4/76)
- Pressing `R) LOAD HOLOTAPE` opens "Choose Holotape To Load". With no holotapes you get "You have no holotapes in your inventory."
- A **Terminal** tape replaces the menu with its own terminal tree.
- A **Program** tape runs a full-screen game in the 826×700 area: Atomic Command, Grognak & the Ruby Ruins, Pipfall, Red Menace, Zeta Invaders, and FO76's Nuka Tapper and Wastelad.
- Sound and voice tapes play audio. R ejects; Tab backs out.
- **For us:**
  - Phase 2: holotapes are portable document bundles a user carries between locations.
  - Phase 3: built-in mini-programs.

### S12. System error screens (canon flavour)
Broken terminals show error codes. These are handy for "offline" locations or a disabled state:
- `ERROR 0x0D890102` Boot sector invalid/corrupt.
- `ERROR 0x357C5001` Bad Sectors Found In Boot Block.
- `ERROR 0xF141A013` No Data Storage Detected. Check Tape Drive Connection.
- `ERROR 0x00B636C6` No Input Device Recognized. Reconnect Keyboard.
- `ERROR 0xFFFFF710` Processor Corru;xsfkleg,,g364[735}3__. (the garbling is intentional)

### S13. Exit / power-off
- Tab at the root closes the terminal. There is no "logging off" text in vanilla.
- The screen fades or collapses. The collapse-to-a-line animation is our flourish, based on real CRTs (L).

### Bonus: Pip-Boy boot (the same RobCo OS family; FO4)
This is a good first-visit splash for our app:
```
*************** PIP-OS(R) V7.1.0.8 ***************



COPYRIGHT 2075 ROBCO(R)
LOADER V1.1
EXEC VERSION 41.10
64K RAM SYSTEM
38911 BYTES FREE
NO HOLOTAPE FOUND
LOAD ROM(1): DEITRIX 303
```

---

## 7. Input model
| Input | Behaviour |
|---|---|
| ↑ ↓ / mouse hover | move the highlight. On the hacking grid, ← → move by character and ↑ ↓ by row. |
| Enter / click | select; during typing, complete the text instantly |
| Tab | back one level; at the root, exit |
| R (FO4) | load or eject a holotape |
| Typing | not used in-game; our app adds it for the password, the document editor and an optional VMS-style command line |

---

## 8. Hacking algorithm (implementation)
1. Choose a length L from the difficulty. Choose N words from 5 to 20. Pick the password, then pick decoys **biased toward high likeness** to it.
2. Fill 408 cells with the 30 junk characters. Place the words at random, non-overlapping offsets. Wrapping is allowed.
3. Compute the bracket groups per row: an opener, then the matching closer later on the same 12-character row, with no letters between. If there are too few, reseed the junk, since replicas aim for a handful per board.
4. Likeness is `Σ[guess[i] == password[i]]`.
5. When a bracket group is used:
   - If no duds are left: deny.
   - Otherwise, if a reset is still available and a roll comes in under p_reset (about 0.3): reset attempts.
   - Otherwise: remove a random dud, replacing it with dots.
6. **Everything is decided on the server.** The client sends a cell index and receives the log lines plus a grid diff. The password never reaches the browser. Rate-limit requests and log them.

---

## 9. What an exact replica must contain
- [ ] Firmware themes FO3/NV and FO4, each with its own strings, font, grid and colours (§2)
- [ ] Share Tech Mono and FSEX300 fonts, the phosphor palettes, inverse highlight (88% bar / solid bar)
- [ ] CRT stack: soft scanlines (~130 per screen), glow, flicker bursts, vertical-hold roll and shudder on transitions, curvature and vignette, bezel
- [ ] A typing engine: rates per theme, Enter/click to complete, cursor riding the text, a type-out sound loop
- [ ] Synthesized sounds: ticks, enter, scroll loop, pass good/bad, hum, power
- [ ] S1 power-on; S2 Termlink intro (FO3/NV); S3 logon
- [ ] S4 hacking: 2×17×12 dump, uppercase `0xHHHH` addresses +0x0C, 30 junk characters, wrap-around words, brackets with the same-row rule and nesting, the exact log strings per theme, flashing lockout warning (FO3/NV), 4 attempts
- [ ] S5 lockout: permanent-style or timed
- [ ] S6/S7 menus: 12 visible rows with scrolling, the global or per-terminal header, `-Server N-`, welcome and body status line, automatic `Back` (FO3/NV), Tab back and exit, the TAB) EXIT help bar (FO4)
- [ ] S8 document reader with FO4-style paging; S9 images; S10 action/response with toggles and a status line
- [ ] S11 holotapes (phase 2); S12 error screens; S13 exit

---

## 10. Mapping to the web app

| Game | App |
|---|---|
| TERM record | **Location**: name, **slug** (the public address), header, welcome text, server number (1–10), theme, difficulty, lockout policy |
| Password / Password Note | the owner's password (argon2-hashed); "password notes" could later be shareable key links |
| Unlocked flag | a public, read-only location |
| Menu items and submenus | a tree of **nodes**: `folder` / `document` / `image` / `switch` / `return` |
| Conditions | visibility rules: owner-only, visible to hackers, hidden when a switch is on or off |
| Result or Response text | the switch's response text |
| Force Redraw toggle | a switch with ON/OFF labels |
| Add Note | "Save to Pip-Boy" (copies the document to the visitor's account) |
| Hacking | anyone with the slug can play. A win creates a **hacker session**, with scope set by the owner. |
| Lockout | per visitor (IP + cookie) per location |
| Access history | an **access log**: logons, hacks, failed hacks, documents read, switches flipped. The owner sees it. |

Routes:
- `/` — Pip-OS boot splash, then create a location or enter a slug
- `/[slug]` — power-on, then logon or hack
- `/[slug]/hack`
- `/[slug]/…path` — the menu tree
- `/[slug]/admin` — the owner editor, drawn in the terminal UI

Stack:
- Next.js App Router with TypeScript and server actions
- Postgres with Drizzle or Prisma
- a signed-cookie session library
- the CRT effect in CSS, with an optional WebGL shader
- WebAudio for sound

## 11. Remaining unknowns
- The FO4 grid height: 17 rows, like FO3, or 16?
- The exact word lengths per tier. The commonly quoted ranges are unverified.
- The bracket reset probability.
- What a lone junk character does in FO3/NV.
- The exact FO4 cursor blink rate.
- FO76 specifics: typing speed about 450 characters per second (L), lockout times.
- Whether FO4 terminals follow a custom Pip-Boy colour.

None of these block the build. They are all tunable constants.

## 12. IP note
Fallout, RobCo, Vault-Tec and all game text belong to ZeniMax/Bethesda. We are safe to ship:
- **Share Tech Mono** (OFL) and **FSEX300** (public domain);
- synthesized sound;
- our own word list;
- original ASCII art.

We should **not** ship ripped `.wav` files, `FalloutDict.txt`, textures or logos. For a public deployment, consider making the "RobCo" brand strings configurable.

## 13. Fan replicas worth studying

| Repo | Why |
|---|---|
| shelbyspeegle/Fallout-Terminal (C, MIT) | full flow; the best bracket-nesting rules |
| euclio/robco-term (Rust, MIT) | grid constants; 1-in-3 reset |
| yrachid/fallout-terminal (TS, ISC) | a written spec; word wrapping; the CSS CRT |
| joshdentremont/fallout-terminal (Python, MIT) | clustered decoy words; typing timings |
| AlrikOlson/robco-terminal (Rust/Bevy, MIT/Apache) | the best CRT shader and synthesized audio values |
| TrickyTaco11/RobCo-Terminal (Python, MIT) | error codes; maintenance mode |
| Codephenomenon/wasteland-terminal (JS, MIT) | `#1AFF80` with Share Tech Mono; power button; glass reflection |
| Sraote/Sraote.github.io | a full palette (`#1bff80`, dim `#0d8544`, dark `#07381c`, background `#0b1c11`) |
| Swordfish90/cool-retro-term (GPL-3) | reference CRT parameters |

---

## 14. Addendum: fidelity pass (verified against real screenshots and the vanilla UI source)

These sources were added in the second pass:
- 21 in-game screenshots from GitHub hacking-solver test sets:
  - FO3/NV: owenmccadden/fallout-terminal-solver, bramucas/fallout_terminal_solver, Gwergilius/Enclave-Terminal-Breach
  - FO4: lemmaandrew/fo4Terminal, erdembircan/fallout-terminal-decoder, andiikaa/fallout-terminal-hack
  - FO76: MsZelia/EasyHackingLockpicking
- A re-read of the decompiled FO4 `TerminalMenu` and the NV `computers_menu.xml` / `hacking_menu.xml`.

### Corrections to earlier sections

| Item | Finding | Source |
|---|---|---|
| FO4 hacking grid | **2 columns × 16 rows** (FO3/NV: 17). Each row is still `0xHHHH` + 12 characters, stepping 0x0C. | FO4 PC screenshots |
| FO4 colours | Text is pure green, about `rgb(0,248,0)`. The background is neutral near-black, `rgb(5–6,6–8,6–7)`. Little vignette; bulging TV-shaped glass; fine scanlines (about 4 px at 1080p, 20% drop); tight green halo. | pixel sampling |
| FO3/NV colours | Mint text, about `#36E68C`, on a *lit* dark-green screen (`#0F3421` centre fading to `#030C07`). Strong vignette; soft glare top-right; scanlines about 8 px at 1080p (±7%). | pixel sampling |
| FO4 menu items | No prefix is added by the UI. `[Brackets]` come from the author's item text, and FO76 uses them for actions (e.g. `[Override Facility Lockdown]`). | FO76 footage, `BSScrollingListEntry.as` |
| FO4 highlight bar | Solid, 100% opacity, black text. It is a fixed full-width bar about 37.5 px tall (1.3× the line). Item letter-spacing is 1 px. | `MenuItemListEntry.xml`, screenshots |
| FO4 separator | None. Rules such as `---- SECURITY STATUS ----` are part of the author's text. | FLA, FO76 footage |
| FO4 back navigation | No automatic Back item. Tab / `[Tab) EXIT]` calls BackLevel. | `TerminalButtons.as` |
| FO4 help bar | `[Tab) EXIT]`, centred under the monitor. "Tab)" is Roboto Condensed Regular and "EXIT" is Bold, green with a black drop shadow, inside green corner brackets on a translucent dark-green fill. | screenshots |
| FO4 paging | Display text is hard-wrapped and paged to fit the 716×498 body; Accept shows the next page. The list moves to 10 px below the text once the last page is shown. | `Terminal.as` 307-363 |
| FO4 scroll arrows | Small triangles in the left margin when the 12-row list overflows. | `MenuItemList.xml` |
| FO4 cursor | 12.5×18.5 px, blinking 5 frames on / 5 off (about 208 ms at 24 fps). It rides the typing head, then sits after the `>` prompt. | `BlinkingCursor.xml`, `Terminal.as` |
| FO4 after logon | The prompt shows `> Password Accepted.` on the menu. | FO76 footage |
| FO3/NV separator | As wide as the **welcome text** (not the full screen), 1 px, 10 px below it. | `computers_menu.xml` 150-164 |
| FO3/NV result text | Cleared after `iComputersResultDisplayTimeout` = 5 s. | GMST |
| FO3/NV hacking log | Newest entry 3 rows above the bottom, i.e. one blank row above the `>` prompt. | `hacking_menu.xml` 302-325, screenshots |
| FO3/NV after a hack | Success text holds ≥2.5 s, then the logon intro plays at x=100: `WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK` / `LOGON ADMIN` / `ENTER PASSWORD NOW` / the password, a blank line apart. | `computers_menu.xml` 55-103, NV symbols, Stewie's tweak |

All of these are implemented in the app. See `docs/product-spec.md`.
