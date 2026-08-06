# Texas Insurance Education Platform — Build Roadmap

**Version 0.1 · drafted 2026-08-05 · owner: R. Miller**

---

## The organizing principle

Nothing on this platform earns a dollar until TDI certifies a course, and TDI will not
look at a course until the provider registration is active. That makes the regulator the
critical path, not the code. Every phase below is sequenced so that the slow, externally
controlled steps start early and run in the background while engineering proceeds.

Two facts drive the whole strategy:

**1. The prelicensing course replaces the state exam.** Per TDI, a passing PE course and
its corresponding final exam qualifies a candidate for licensure. The NAIC licensing chart
states the same: a prelicensing course satisfies the examination requirement where the
course runs a minimum of 40 hours including 30 hours of classroom or equivalent
coursework. A candidate who finishes your course does not sit for a state exam at all.
That is not a study aid. That is the licensure event, and it is the single most valuable
thing this platform can sell.

**2. Half of all Texas CE must be classroom-equivalent.** At least 12 of the 24 required
hours must be CLEQ. Self-study cannot satisfy it. The engine in the prototype is the
product; the course text is the commodity wrapped around it.

**3. The state wrote your content spec.** 28 TAC §19.1018 publishes the all-lines adjuster
exam blueprint with exact weightings — insurance terms and related concepts at 40%,
personal lines at 10%, commercial lines at 10%, standard fire policy at 3%, and so on. You
are not guessing at an outline. You are filling in a table the state published.

---

## Phase 0 — Provider registration

**Weeks 1–4 · ~$50 · blocking everything downstream · not an engineering task**

Start this now. It gates every other phase and none of it depends on the platform existing.

- Create the Sircon account (Education Providers → Sign Up) and file the provider
  application. Fee is $50, registration valid two years.
- If the entity is subject to Texas franchise tax, attach the Franchise Tax Account Status
  certificate. Decide first whether the provider is Miller Claims Services or a new entity —
  the provider ID attaches to it permanently, and a lapse inactivates the ID *and every
  course registered under it*, forcing full re-registration and re-submission.
- Read 28 TAC §19.1016 end to end. It enumerates the circumstances that trigger automatic
  fines on providers. Build the operational calendar against it before you have students.
- Identify the instructor of record and collect the written qualification statement
  §19.1005(d) requires providers to keep on file.

**Exit criterion:** active provider ID in Sircon.

---

## Phase 1 — Certify one small course first

**Weeks 3–12 · ~$30 filing · runs parallel to Phase 2**

Do not make a 40-hour adjuster course your first filing. File a **3-hour CLEQ ethics /
consumer protection CE course** instead.

The reasoning is about learning cost, not ambition. A 3-hour course needs 12 inquiry
periods and roughly 120 questions. A 40-hour course needs about 160 periods and 1,600+
questions. If TDI rejects your compliance narrative, your hour-calculation method, or your
inquiry design, you want to find that out having spent 120 questions, not 1,600. Every
Texas licensee needs ethics hours, so the small course is also independently saleable.

Filing package, per TDI's course application requirements:

- Statement of the knowledge, skills, or abilities the licensee gains.
- Detailed **timed outline** with major topics and sub-topics and minutes on each.
- Documentation supporting the hour calculation method, per §19.1010(2).
- Narrative describing how the course satisfies §19.1009(h), plus **screenshots of two
  interactive inquiries showing ten questions total**.
- Example certificate of completion meeting §19.1007(7) — or a statement that you will
  generate certificates in Sircon at reporting time. *Using Sircon's certificate is the
  right call for v1; it removes an entire compliance surface.*

The prototype engine produces the screenshots and the compliance narrative directly. That
is what it was built for.

**Exit criterion:** one certified CLEQ course number in hand, and a documented account of
what TDI questioned during review.

---

## Phase 2 — Platform build

**Weeks 4–20 · the engineering phase**

Substantial reuse from Waypoint applies here. This is not a greenfield build.

### 2.1 Carried over from Waypoint (weeks 4–7)

The following are already solved in `mcs-claims-core` and should be lifted, not rewritten:

| Waypoint foundation | Use here |
|---|---|
| Per-tenant RLS with RESTRICTIVE org walls | Multi-provider isolation if you ever white-label |
| Audit immutability (tamper-evident) | The compliance ledger — this is the whole product |
| TOTP MFA + httpOnly cookie sessions | Provider/operator portal auth |
| Durable ARQ job queue | Sircon reporting, certificate issuance, reminder sweeps |
| Idempotency on money-moving endpoints | Enrollment purchase, refunds |
| Operator portal (k03–k07 pattern) | Course authoring, roster, filing management |

Apply the same whole-build standard: exact decimal math on money, auth fails closed,
bounded inputs on every surface. A course provider is auditable by TDI at any time; the
audit posture you already build to is the correct one here.

### 2.2 The regulated core (weeks 6–13)

Harden the prototype into production. The engine is the moat; everything else is CRUD.

- **Seat-time accrual, server-authoritative.** The prototype accrues client-side. In
  production the client reports heartbeats and the server is the sole authority on accrued
  time. A student who edits their local clock must gain nothing. Assume adversarial users —
  the incentive to skip 40 hours is enormous.
- **Inquiry period engine.** Four periods per certified hour, evenly spaced, one at the end
  of the course; 70% to advance; at least two distinct sets per period with a different set
  served on retry; every wrong answer identified and explained. All of this is §19.1009(h)(2)
  and none of it is negotiable.
- **Identity authentication.** On entry, hourly during, on exit. Failure policy and lockout
  semantics defined and logged.
- **Forced progression.** Section N+1 unreachable until N's inquiry period is cleared.
- **Append-only ledger.** Hash-chained, per-enrollment, exportable. This is your evidence
  file in an audit and your demo artifact in a filing.

### 2.3 Commerce and delivery (weeks 12–18)

- Enrollment, checkout, refunds. Watch the advertising rules: advertisements must state
  whether credit is classroom, classroom-equivalent, or self-study, list required equipment,
  and state all completion requirements including whether a monitored final exam is needed.
  Misleading course advertising is a fineable offense.
- Certificate issuance (Sircon-generated in v1).
- **Sircon completion reporting.** Course completion fees are $1.30 per credit hour per
  person as of 2024-10-01. Confirm the current PE reporting fee before modeling margin.
  Build this as a durable queued job with retry and a reconciliation report — a silent
  reporting failure is a fine, not a bug.

### 2.4 Study tools (weeks 16–20, revenue-optional)

Flashcards, practice banks, readiness scoring. These are unregulated and margin-rich, and
they are what WebCE actually competes on. They are also the correct place to spend design
effort, because the regulated core has no room for creativity.

---

## Phase 3 — The 40-hour adjuster course

**Weeks 14–36 · the real product · content is the bottleneck**

This is where the money is and where the work actually lives. Build it against §19.1018's
published weightings:

| §19.1018 topic | Weight | Hours of a 40-hour course |
|---|---|---|
| Insurance terms and related concepts | 40% | ~16 |
| Personal lines (ISO + TX HO-A/B/C) | 10% | ~4 |
| Commercial lines coverage | 10% | ~4 |
| Additional coverages, exclusions, extensions | 7% | ~3 |
| Standard fire policy | 3% | ~1.2 |
| Auto liability incl. Texas PAP | 3% | ~1.2 |
| Bonds | 3% | ~1.2 |
| Inland marine | 2% | ~0.8 |
| Ocean marine | 2% | ~0.8 |

*Remaining topics under §19.1018 not captured above must be pulled from the full rule text
before the outline is finalized — the percentages above are the portion confirmed to date.*

**Content volume, stated honestly:** 40 hours × 4 inquiry periods = 160 periods. At two
sets of five questions each, that is 1,600 questions minimum, plus a separate final exam
bank, plus roughly 40 hours of instructional prose. Question quality is not fungible —
§19.1009(h)(2)(C) requires an explanation of the correct answer for every item, so each
question carries a written rationale too.

At a sustainable 15 questions a day with rationales, that is roughly six months of writing
alone. This is the schedule risk on the whole project, and it is the reason Phase 3 starts
in week 14 rather than week 30.

Realistic mitigations, in order of preference:

1. **Draft with AI, review as the SME.** You have 30 years in P&C. Generation is cheap;
   your review is the expensive, non-delegable part. Budget review time, not writing time.
2. **Hire a second licensed reviewer** for independent verification. PE exam integrity is
   explicitly audited by TDI.
3. Do not license a third-party bank without confirming it can be filed under your provider
   ID. Modification beyond 25% requires a new course filing anyway.

The final exam is a separate build: §19.1018 defines the tested areas, and application-level
question construction is a distinct skill from writing knowledge-level checks.

---

## Phase 4 — Widen

**Month 9+, and only after Phase 3 is certified and selling**

Expand along the axis with the least new regulatory surface:

1. **More Texas courses under the existing provider ID.** Public adjuster, general lines
   agent, additional CE. Same regulator, same Sircon account, same engine. Cheapest growth
   available.
2. **CE catalog depth.** Recurring revenue every two years, forever, protected by the
   12-hour CLEQ mandate. Less glamorous than PE, better business.
3. **Additional states.** Each is a new regulator, new rules, new filings. Expect the
   engine to need per-state configuration — inquiry cadence, identity policy, and seat-time
   rules all vary. Design the engine as rule-configurable now; do not hardcode Texas.

---

## What I'd cut

**Nursing.** Different regulator (Texas BON), different accreditation regime, zero content
overlap, and no domain edge for you. It roughly doubles compliance surface to reach a market
where you have nothing proprietary. If nursing CE is genuinely interesting, it is a separate
company.

**A proctored final exam for CE courses.** §19.1009(h)(3) states a comprehensive final
examination is not required for classroom-equivalent courses. Building proctoring for CE is
work the rule does not ask for. PE is different — that exam is the licensure event and its
integrity is audited.

**"Pass guarantee" marketing on day one.** For PE it is close to meaningless, since passing
your course *is* the licensure path. Save the guarantee for products where a separate state
exam exists.

---

## Verification queue

Open items that must be confirmed from primary sources before anything downstream depends
on them. None of these should be taken from a summary, including this one.

| # | Item | Why it matters | Source to read |
|---|---|---|---|
| 1 | Adjuster CE hours: sources conflict — one industry chart says 30 hours biennially with 2 ethics hours; CE providers say 24 with 3. Agent requirement (24/3) is corroborated. | Determines CE catalog sizing | 28 TAC §19.1003, TDI CE pages |
| 2 | Current PE completion reporting fee per student | Direct margin input | TDI provider fee schedule |
| 3 | Full §19.1018 topic list and weightings | Course outline is built from it | 28 TAC §19.1018, complete text |
| 4 | §19.1007(7) certificate elements | Only if not using Sircon certificates | 28 TAC §19.1007 |
| 5 | §19.1010 hour-calculation method | Required filing attachment | 28 TAC §19.1010(2) |
| 6 | §19.1016 automatic fine triggers | Operational calendar depends on it | 28 TAC §19.1016 |
| 7 | Whether "30 hours classroom or equivalent" within the 40 constrains CLEQ delivery | Could affect whether the course can be 100% online | §19.1017, §19.602 |

**Item 7 is the highest-risk open question on this roadmap.** If some portion of the
40 hours must be delivered live rather than classroom-equivalent, the fully-online PE
model changes shape. Resolve it before Phase 3 content work begins.

---

## Critical path summary

```
Wk 1   ├─ Phase 0: provider registration ────┐
Wk 3   │                                     ├─ Phase 1: small CE course filing ──┐
Wk 4   ├─ Phase 2.1: lift Waypoint foundations                                    │
Wk 6   ├─ Phase 2.2: regulated core (server-authoritative seat time)              │
Wk 12  ├─ Phase 2.3: commerce + Sircon reporting                                  │
Wk 12  │                                    └─ first certified course live ───────┘
Wk 14  ├─ Phase 3: 40-hour adjuster content ─────────────────────────┐
Wk 36  │                                    └─ PE course filed ──────┘
Mo 9   └─ Phase 4: widen
```

First revenue lands around week 12 from the small CE course. The adjuster PE course — the
actual business — lands around month 9. The gap between those is the content-writing
bottleneck, and no amount of engineering shortens it.
