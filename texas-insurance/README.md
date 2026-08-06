# Texas Insurance Education Platform

**This is a separate project from the sports picks app in this repository.** It shares
nothing with it — no code, no dependencies, no build. It lives here only because this
branch was the working space available when the project was started, and it is confined
to this directory so the two never mix.

Intended home: its own repository. Until then, nothing in here should be merged to `main`.

## Contents

| Path | What it is |
|---|---|
| `roadmap.md` | Build roadmap v0.1 (2026-08-05, R. Miller) — phasing, regulatory critical path, content estimates, open verification queue |
| `prototype/cleq-engine.html` | Working single-file prototype of the classroom-equivalent delivery engine |

## The prototype

`prototype/cleq-engine.html` runs standalone — open it in a browser, no build step, no
server. It demonstrates the 28 TAC §19.1009(h) control set: seat-time accrual with idle
detection, inquiry periods gated at 70%, alternate question sets on retry, per-answer
rationales, identity challenges on entry/periodic/exit, forced progression, and an
append-only compliance ledger with CSV export.

The **Demo speed** toggle in the masthead compresses the timers (25s sections instead of
15min) so a full run takes about two minutes. Turn it off for anything shown to TDI.

Two caveats carried over from the roadmap, both deliberate in a prototype and both
disqualifying in production:

- **Seat time accrues client-side.** A student who edits their local clock gains time.
  Production must make the server the sole authority on accrued time (roadmap §2.2).
- **Certificate fields are placeholders.** Required elements are fixed by §19.1007 and
  have not been reconciled against the rule text (verification queue item 4).

The file also loads webfonts from Google Fonts, so it needs network access to render as
designed — and it will not render as designed inside a strict-CSP host.

## Status

Nothing here is certified, filed, or in front of a regulator. Phase 0 (provider
registration) is the blocking step and is not an engineering task. The seven items in the
roadmap's verification queue are unresolved — item 7, whether the 40-hour PE course can be
delivered fully online, is the one that can reshape the plan.
