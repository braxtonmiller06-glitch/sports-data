# Atlas — Settings Page Design Brief

**Status: parked. Nothing built yet.** This file is the handoff so the work can
be picked back up cold.

Drop everything below the line into a fresh Claude session to get a designed
settings page that matches the existing app. It is self-contained — Claude does
not need repo access to use it.

---

## PROMPT — copy from here down

I'm building **Atlas**, a sports betting *research* product (we sell analysis and
information — we never accept wagers). Design and build the **Settings page** for
the member app.

It must look like it was cut from the same cloth as the existing app, so the
design system below is not a suggestion — it is the actual CSS already running in
production. Reuse these exact tokens and class names.

### Stack

- Flask + Jinja2, server-rendered
- **No build step, no framework, no npm.** Vanilla HTML/CSS/JS in a single
  template file, styles in a `<style>` block, script in a `<script>` block.
  That's how every other page in this app is written.
- Fonts already loaded: `Archivo` (600/700/800), `IBM Plex Sans` (400/500/600),
  `IBM Plex Mono` (400/500/600)

### Design tokens — use verbatim

```css
:root{
  --bg:#060A08; --panel:#0C120E; --panel2:#111A14; --rule:#1D2A21;
  --white:#F2F5F3; --text:#B9C6BE; --dim:#7A8C81; --dimmer:#4C5E54;
  --grn:#3FD964; --grn-soft:rgba(63,217,100,.12); --grn-line:rgba(63,217,100,.28);
  --red:#E8604C; --amb:#E8B54C;
  --pad:18px;
}
```

Dark, near-black green-tinted background. Green is the single accent — used for
active state, focus rings, and affirmative numbers, never for decoration.
Amber = locked/upgrade. Red = destructive or losing.

Type rules that hold everywhere in this app:
- Page titles and big numbers: `Archivo` 800, `letter-spacing:-.03em`
- Body copy: `IBM Plex Sans` 15px, `line-height:1.5`
- **Every label, tab, button, breadcrumb and column header:** `IBM Plex Mono`,
  9–11px, `letter-spacing:.13em–.16em`, `text-transform:uppercase`,
  `color:var(--dimmer)`. This mono-microcaps treatment is the app's signature.
- Corners are **square**. No `border-radius` anywhere except a 3px top on nav
  tabs. Do not round cards, inputs or buttons.

### Existing components to reuse — do not reinvent

```css
/* card — the universal container */
.card{border:1px solid var(--rule);background:var(--panel)}
.card-h{display:flex;align-items:center;gap:10px;padding:13px 15px;
  border-bottom:1px solid var(--rule);font-family:'IBM Plex Mono',monospace;
  font-size:9.5px;letter-spacing:.16em;color:var(--dimmer);text-transform:uppercase}
.card-h b{color:var(--grn);font-weight:500}
.card-h .rt{margin-left:auto;color:var(--dimmer)}
.card-b{padding:16px 15px}

/* page header */
.crumb{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.15em;
  color:var(--dimmer);text-transform:uppercase;margin-bottom:10px}
h1{font-family:'Archivo',sans-serif;font-weight:800;font-size:clamp(25px,4.6vw,34px);
  letter-spacing:-.03em;color:var(--white);line-height:1.08}
.sub{font-size:14.5px;color:var(--dim);margin-top:9px;max-width:46em;line-height:1.6}

/* layout */
.wrap{max-width:1180px;margin:0 auto;padding:0 var(--pad)}
.grid{display:grid;gap:14px;margin-top:22px;grid-template-columns:1fr}
@media(min-width:900px){
  .grid.two{grid-template-columns:1fr 1fr}
  .grid.side{grid-template-columns:1fr 320px}
}

/* form field — label sits ABOVE the control, always */
.fld{display:flex;flex-direction:column;gap:5px}
.fld span{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;
  color:var(--dimmer);text-transform:uppercase}
.fld select,.fld input{background:var(--bg);border:1px solid var(--rule);
  color:var(--white);padding:9px 12px;font-family:'IBM Plex Sans',sans-serif;font-size:14px}
.fld select{appearance:none;padding-right:30px;cursor:pointer;min-width:172px;
  background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4.5L6 8.5L10 4.5' stroke='%233FD964' stroke-width='1.4' fill='none'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 11px center;background-size:11px}
.fld select:focus,.fld input:focus{outline:none;border-color:var(--grn)}

/* buttons */
.btn{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:11px;
  letter-spacing:.13em;text-transform:uppercase;padding:9px 16px;cursor:pointer;
  border:1px solid var(--grn);color:var(--grn);background:none;font-weight:500}
.btn:hover{background:var(--grn-soft)}
.btn.solid{background:var(--grn);color:#04160A;font-weight:600}
.btn.ghost{border-color:var(--rule);color:var(--text)}
.btn.sm{padding:9px 18px;font-size:10.5px}

/* selectable card — currently the risk-profile picker, reuse for any
   "pick one of three" setting */
.risk{display:grid;grid-template-columns:1fr;gap:10px;margin-top:6px}
@media(min-width:660px){.risk{grid-template-columns:repeat(3,1fr)}}
.rc{border:1px solid var(--rule);background:var(--panel2);padding:15px 14px;
  cursor:pointer;transition:border-color .15s}
.rc:hover{border-color:var(--grn-line)}
.rc.on{border-color:var(--grn);background:var(--grn-soft)}
.rc h4{font-family:'Archivo',sans-serif;font-weight:700;font-size:16px;color:var(--white)}
.rc .u{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--grn);margin-top:5px}
.rc p{font-size:12.5px;color:var(--dim);margin-top:8px;line-height:1.5}

/* segmented control */
.tabs{display:flex;border:1px solid var(--rule);margin:14px 0}
.tabs button{flex:1;font-family:'IBM Plex Mono',monospace;font-size:10.5px;
  letter-spacing:.11em;padding:9px 4px;background:none;border:none;
  border-right:1px solid var(--rule);color:var(--dim);cursor:pointer}
.tabs button:last-child{border-right:none}
.tabs button.on{background:var(--grn-soft);color:var(--white);font-weight:600}
.tabs button:disabled{color:var(--dimmer);cursor:not-allowed;opacity:.5}

/* paywall / locked state */
.lock{border:1px dashed var(--rule);background:rgba(232,181,76,.045);
  padding:14px 15px;display:flex;gap:12px;align-items:flex-start;margin-top:14px}
.lock svg{width:16px;height:16px;color:var(--amb);flex:0 0 16px;margin-top:2px}
.lock p{font-size:13px;color:var(--dim);line-height:1.55}
.lock p b{color:var(--white);font-weight:500}

/* plan pill */
.tier{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;
  font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;padding:3px 8px;
  border:1px solid var(--rule);color:var(--dim)}
.tier.pro{color:var(--white);border-color:var(--grn-line);background:var(--grn-soft)}
```

**You will need to invent one component that doesn't exist yet: a toggle
switch.** The app has no boolean control today. Build it square-cornered, green
when on, `var(--rule)` border when off, driven by a real `<input type="checkbox">`
so it stays keyboard-operable and screen-reader-correct.

### What the app actually does — so the settings mean something

Member app sections: **Morning Briefing** (daily email), **Ask Atlas**,
**Player Lookup**, **Tools** (Filter Plays, Live Plays, Straight Bets, Hot &
Cold, Head to Head), **Bet Tracking** (Bet Tracker, Bankroll Manager, Betting
Journal). Plans are **Free / Medium / Elite**. There's a public Discord where
picks are posted and graded.

### Page structure

Breadcrumb `Account / Settings`, `<h1>Settings</h1>`, one-line `.sub`.

Then **six sections**, each a `.card` with a `.card-h` label. Left column holds
the sections; use `.grid.side` so a 320px right rail can carry a save-state
summary and a plan card.

**1 — Account**
Email (with change flow), password, plan + billing (`.tier` pill, upgrade/cancel),
sign out, export my data, delete account. Destructive actions go last, separated
by a rule, in `var(--red)`.

**2 — Betting preferences** — the section that matters most, because these feed
the tools
- Bankroll amount and unit size
- Default risk profile — reuse the `.rc` cards: Conservative 1% / Moderate 2% /
  Aggressive 3%
- Default sport
- Odds format — American / Decimal / Fractional (use `.tabs`)
- Preferred sportsbooks — multi-select; drives which books appear in Filter Plays
- Minimum confidence threshold — slider or number
- Timezone — this one is a correctness issue, not a nicety: bet grading keys off
  a settlement timestamp

**3 — Notifications**
Morning Briefing on/off + delivery time. Line-movement alerts, live-play alerts,
graded-result summaries. Channel per alert type: email / Discord DM / push.
A grid of toggles with channel columns reads better here than a stack of rows.

**4 — Responsible gambling** — treat as required, not optional
Deposit and wager limit reminders, session time limit, cool-off period,
self-exclusion. Links to problem-gambling help resources. Give this section a
visually calmer, non-promotional treatment — it should never look like an
upsell. Limits, once set, should be easy to tighten and deliberately slow to
loosen.

**5 — Display**
Theme, density (compact/comfortable), default landing view, show/hide unused
tools.

**6 — Data & integrations**
CSV export of bet history (Medium/Elite — show the `.lock` state on Free),
Discord account linking, clear cached data.

### Rules

- **Autosave each field on change** with a quiet inline confirmation. Do not put
  one giant "Save settings" button at the bottom of a six-section page.
- Free-tier gating uses `.lock`, and the honest version: state plainly what the
  limit is and what upgrading changes. This app's voice never overpromises —
  when data is missing it says so instead of showing a placeholder number.
- Fully responsive at **375 / 768 / 1440**. Single column under 900px.
- Accessibility is not optional here — a previous UI audit failed on exactly
  this. Every control must be keyboard-reachable and use a real semantic element
  (`<button>`, `<input>`, `<label>`), never a clickable `<div>`. All text must
  clear **WCAG AA 4.5:1**. Note that `--dimmer` (#4C5E54) is only ~2.9:1 on the
  page background — it is fine for uppercase micro-labels at large letter-spacing
  but **must not** be used for anything a user has to read.
- Every input needs a visible `:focus` state — `border-color:var(--grn)`.

### Deliver

One complete, self-contained HTML file I can open in a browser: all six sections
built out with realistic content, working toggles and tab controls, and the
Free-tier lock states visible. Static state is fine — no backend calls.

## PROMPT — copy to here

---

## Notes for whoever picks this up

**Build order.** Don't build all six sections. Section 2 (Betting preferences) is
the only one whose settings unblock features that already exist — the Bankroll
Manager currently has no persistent home for bankroll or unit size, and the risk
profile is a per-visit choice that resets. Ship these five first:
bankroll + unit size, risk profile, timezone, odds format, default sport.

**Blocked.** Sections 1 and 3 depend on auth and billing, neither of which
exists — there is no session handling in `server.py` today, and `/join` collects
an email but does not create an account. Those sit downstream of TASK 2 and
TASK 3 in `picks-app/TASKS.md`.

**Where it goes.** The settings page belongs in `picks-app`
(`templates/app.html` + a route in `server.py`), *not* in this repo. Open
question: whether to add it as another `data-go` view inside `app.html`, which
is already 1,203 lines, or split it into its own template. Recommend its own
template — `app.html` is at the point where adding a six-section page to it
makes the file hard to work in.

**Prior art in the codebase.** `templates/app.html:736` has the risk-profile
picker (`#brRisk`) and the bankroll calculator — a settings page should read
those values rather than duplicate the control. `app.html:819` already promises
CSV export as a paid feature that isn't built. `app.html:382` is the Account nav
dropdown that a Settings link needs to be added to; note two of its three items
currently point at the same `pricing` view.
