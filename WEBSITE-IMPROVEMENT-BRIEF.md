# Atlas — Whole-Site Improvement Brief

Everything below the line is a drop-in prompt for Claude. It's self-contained —
Claude does not need repo access.

The findings section is not guesswork. Every item was verified against the
actual files in `picks-app`, with line numbers. Keeping those specifics in the
prompt is what stops the output from being generic design advice.

**Run it in three passes.** Pass 1 is the foundation and the other two get much
worse if you skip it. Paste the whole thing, then say "start with Pass 1."

---

## PROMPT — copy from here down

I run **Atlas Analytics**, a sports betting *research* product — we sell
analysis and information, we never accept wagers. I want you to improve the
whole website, and I've already audited it, so you can skip discovery and go
straight to work.

### Stack and constraints — these are firm

- **Flask + Jinja2**, server-rendered. Python 3, deployed on Railway.
- **No build step. No npm. No framework. No Tailwind.** Vanilla HTML/CSS/JS.
  Every page today is a single self-contained template with a `<style>` block
  and a `<script>` block. Do not introduce a toolchain.
- Fonts (already loaded via Google Fonts): `Archivo` 600/700/800,
  `IBM Plex Sans` 400/500/600, `IBM Plex Mono` 400/500/600.
- Four templates today: `landing.html` (761 lines), `app.html` (1,203),
  `join.html` (150), `tools.html` (343). Plus `server.py` (207 lines, thin —
  all DB access is isolated in `atlas/db.py`).

### The design system — already exists, do not redesign it

This identical `:root` block is declared in all four templates:

```css
:root{
  --bg:#060A08; --panel:#0C120E; --panel2:#111A14; --rule:#1D2A21;
  --white:#F2F5F3; --text:#B9C6BE; --dim:#7A8C81; --dimmer:#4C5E54;
  --grn:#3FD964; --grn-soft:rgba(63,217,100,.12); --grn-line:rgba(63,217,100,.28);
  --red:#E8604C; --amb:#E8B54C;
  --pad:20px;   /* app.html uses 18px */
}
```

Near-black green-tinted dark UI. Green is the only accent — active state, focus,
affirmative numbers. Amber = locked/upgrade. Red = destructive/losing.

Non-negotiable house style, because it's consistent across every page today:
- **Square corners.** No `border-radius` anywhere except a 3px top edge on nav
  tabs. Do not round cards, inputs, or buttons.
- Headings and big numbers: `Archivo` 800, `letter-spacing:-.03em`.
- Body: `IBM Plex Sans` 15–16px.
- **Every label, tab, button, breadcrumb, column header:** `IBM Plex Mono`,
  9–11px, `letter-spacing:.13em–.16em`, uppercase. This is the signature.
- Core components already built and named: `.card` / `.card-h` / `.card-b`,
  `.btn` (+ `.solid` `.ghost` `.sm`), `.fld` (label above control), `.tabs`,
  `.rc` (selectable card), `.lock` (paywall), `.tier` (plan pill), `.chip`.

**Improve the site, not the visual language.** I don't want a new look — I want
the existing one applied correctly and consistently.

### Verified problems — fix these

**A. The member app's navigation is keyboard-unreachable.**
In `app.html` the entire nav is built from non-interactive elements: 6
`<div class="nlink">` and 3 `<div class="ghd acc">`. They're wired with click
handlers and `data-go` attributes. You cannot tab to any of them, screen readers
announce nothing, and there's no `aria-expanded` on the dropdowns.

This exact bug was already fixed in `landing.html` — it now uses
`<button class="nlink" type="button" aria-expanded="false" aria-haspopup="true">`
and `<button class="ghd acc" type="button" data-acc aria-expanded="false">`, with
Escape-to-close and click-outside handlers. **The fix was never carried over to
`app.html`.** Port it, and match the landing page's JS behavior exactly.

**B. 881 lines of CSS duplicated across four files.**
Style blocks: landing 377 lines, app 337, join 55, tools 112. The token block,
`.btn`, `.fld`, `.card`, the nav, the mobile menu, and the focus rules are all
copy-pasted. `static/` contains nothing but a `README.md`. There is no Jinja
base template.

This is why bug A exists: a fix landed in one copy and not the other. It will
keep happening.

**C. The CSS is append-only and self-contradicting.**
`landing.html` has three stacked override blocks — one labeled
`/* ===== PREMIUM PASS ===== */` at line 274, an unlabeled one at ~323, and
`/* ---- Task 4 fixes ---- */` at 366. Between them they re-declare `*`, `body`,
`.fld`, `.card`, and `:focus` on top of the originals. Concretely:
`.card{cursor:pointer}` (line 150) is silently overridden by
`.card{cursor:default}` (line 347). `app.html` has the same pattern.

**D. ~80 lines of dead CSS in `landing.html`.**
These selectors are fully styled and used zero times — the markup they belonged
to was deleted, the CSS wasn't: `.quotes` `.quote` (testimonials),
`.dash` `.dash-bar` `.dash-grid` `.side` `.rail` `.main` `.tbl-h` `.tbl-r`
`.c1`–`.c4` `.ck` `.ck-score` (a whole dashboard preview), `.stack` `.panel`
`.big` `.wl` `.bar` `.bar-t` `.bar-g`. The override blocks also reference
`.tool` `.check` `.demo` `.stat` `.pill` `.ex-hit`, none of which exist in any
markup.

**E. The navigation is dishonest.**
On `landing.html`, 11 nav links resolve to just 2 destinations — eight point at
`#advantage`, three at `#pricing`. Clicking "Live Plays," "Head to Head," and
"Bet Tracker" all scroll you to the same generic grid. "Contact" links to
`/join`, which has no contact form on it.

**F. Seven dead footer links.** Methodology, About, FAQ, Terms of Service,
Privacy Policy, Responsible Gambling, and Refund Policy are all `href="#"`.
The legal pages genuinely don't exist yet. A dead `#` is the worst option — it
looks broken and, for the legal and responsible-gambling links specifically,
it's a bad look for a gambling-adjacent business. Give me a better pattern for
"real page, not built yet."

**G. `/tools` is orphaned.** `tools.html` is a working, well-built tool console
— a sport chip row, a tab bar, per-tool filter definitions in a clean table, and
real calls to `/api/tools/<name>`. **Zero links point to it from anywhere on the
site.** The route exists and nothing reaches it. Meanwhile the member app's
Tools dropdown routes to a placeholder view that renders a title and a
paragraph.

**H. No proof, on a product whose entire pitch is proof.**
The tagline is "Real data. Real models. Real transparency." The meta description
says "Every play graded in public." The footer says "public result tracking."
There is no track record anywhere on the site. The hero's Top Play card — the
one proof element — currently renders "Coming soon." The testimonial CSS is
orphaned (see D), so there's no social proof either. A skeptical visitor has
nothing to evaluate.

I'd rather show an honest empty state than fake numbers. Design something that
earns trust *before* the results data exists, and that upgrades gracefully into
a real record once it does.

**I. Naming is inconsistent across pages.** "Player Card" (landing grid) vs
"Player Lookup" (nav and app). "Hot & Cold" vs "Hot / Cold" (tools.html tab).
"Straight Bets" vs "Straight Bet." Pick one name each and use it everywhere.

Related: the headline says "Eight tools," but the nav exposes 11 named things
across three groups (5 Tools + 3 Bet Tracking + Morning Briefing, Ask Atlas,
Player Lookup). The information architecture and the marketing claim disagree.
Fix the IA; don't just change the number.

**J. Social previews have no image.** `landing.html` has `og:title`,
`og:description`, `og:type` and `twitter:*`, but **no `og:image`** — and
`twitter:card` is `summary`, not `summary_large_image`. Links shared into
Discord (where the community lives) preview as a bare text block. The favicon is
an inline SVG data URI, which is a reasonable pattern — extend it.

**K. Accessibility, beyond bug A.**
- `:focus{outline:none}` is set globally, then restored only for `a`, `button`,
  and `.nlink`. Anything else focusable gets no visible focus at all.
- `landing.html` JS assigns `tabindex="0"` to the eight `.card[data-detail]`
  tool cards, making `<div>`s focusable with no role and no accessible name. The
  hover popover they trigger has no `aria` relationship to them.
- **Contrast.** I measured these against `--bg` #060A08:
  `--text` #B9C6BE = **11.2:1** ✓, `--dim` #7A8C81 = **5.6:1** ✓,
  `--dimmer` #4C5E54 = **2.9:1** ✗ — fails AA.
  `--dimmer` is fine for uppercase mono micro-labels at wide letter-spacing, but
  it's currently carrying real readable copy: `.drop small` (the descriptive
  line under every nav dropdown item, 11.5px) and the footer tagline "Sports
  betting research and public result tracking." Move body copy to `--dim` or
  lighter. **The rule: `--dimmer` for micro-labels only, never for sentences.**
- No `<main>` landmark on `landing.html` or `app.html`. The nav is
  `<div class="nav">`, not `<nav>`. No skip link.
- No `prefers-reduced-motion` handling anywhere, despite
  `html{scroll-behavior:smooth}`, `translateY` hover lifts on cards and buttons,
  and transitions throughout.

**L. Small correctness stuff.**
- Client-side email validation only checks for `@`; the server also requires a
  `.` in the domain (`server.py:176`). A user typing `me@localhost` gets a
  silent red border on the landing page with no message explaining why.
- Success messages interpolate the user's email into `innerHTML`
  (`landing.html:711`, `join.html:134`, and the same pattern in `app.html`).
  Self-inflicted only, but use `textContent`.
- `server.py:28` `_brand_logo()` resolves `static/logo.svg|png` and injects
  `brand_logo` into every template — but only `tools.html:129` ever uses it. The
  other three hardcode the `AT/LAS` wordmark, so uploading a logo would change
  one page out of four.

### Voice — match it, it's good

Atlas's copy is plain, specific, and refuses to overpromise. It says "even a
genuinely profitable bettor loses 45% of the time." When data is missing it says
so instead of showing a placeholder number. Tool descriptions state a mechanism
("re-checked every thirty seconds," "the threshold shown so you can judge it
yourself") rather than adjectives. No hype, no urgency tricks, no fake scarcity.
Keep that. It's the most valuable thing the site has.

### Do the work in three passes

**Pass 1 — Structural foundation.** Fixes B, C, D, and the `app.html` half of A.
Create `templates/base.html` with the shared head, nav, mobile menu, and footer
as Jinja blocks. Extract all shared CSS into `static/css/atlas.css`, resolving
every duplicate and contradiction and deleting all dead selectors. Leave only
genuinely page-specific CSS in each template. Port the accessible nav markup
from `landing.html` into the shared base so every page gets it. Tell me what
`server.py` needs (a `static_url_path`? nothing?) and what to verify after.

**Pass 2 — Navigation, IA and trust.** Fixes E, F, G, H, I, J. Real destinations
for every nav link; wire `/tools` into the app properly; settle the tool
taxonomy and naming; a "not built yet" pattern that doesn't read as broken; a
proof/track-record section that's honest today and upgrades later; `og:image`
and `summary_large_image`.

**Pass 3 — Accessibility and polish.** Fixes K and L, plus a full pass at
375 / 768 / 1440. Every interactive element a real semantic element with a
visible focus state; landmarks and a skip link; `prefers-reduced-motion`; all
text ≥ 4.5:1.

### For each pass

1. Start with a short plan — what changes, which files, in what order. Wait for
   my go-ahead before writing code.
2. Then give me **complete files**, not diffs or fragments. I'll be pasting them
   over the originals.
3. End with a specific verification checklist: what to click, what to tab
   through, what to look at on each breakpoint.

If you think I've mis-prioritized something, or one of these findings is wrong,
say so before you start. Begin with Pass 1.

## PROMPT — copy to here

---

## Notes for me

**How this was verified.** Line numbers and counts came from reading the four
templates and `server.py` directly. Contrast ratios were computed from the hex
values in the token block against `--bg` #060A08.

**The single most valuable fix is Pass 1**, and it isn't a design change. Four
copies of the same stylesheet is why the keyboard-nav fix from TASK 4 landed on
the landing page and never reached the member app — where it matters more,
because that's the page people actually use. Every future fix has the same
50% chance of only landing halfway until this is resolved.

**Deliberately left out of the prompt:**
- The settings page — that has its own brief in `SETTINGS-PAGE-BRIEF.md`. Slot
  it in after Pass 1 so it inherits the base template instead of becoming a
  fifth copy of the stylesheet.
- Legal pages (TASK 5) — the prompt asks for a *pattern* for unbuilt pages, not
  the pages themselves. Drafting terms and a privacy policy is separate work and
  needs review before publishing.
- Anything requiring auth or billing, which don't exist yet.
- The `atlas/` Python package. This brief is front-end only. The tools, grading
  engine, and pipeline are tracked in `picks-app/TASKS.md`.
