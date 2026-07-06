# Reps — build log

A living document: why this app exists, what each version is trying to
be, and what's deliberately parked for later. The changelog records
what shipped; this records what we're building toward and why.

## The goal

A calm, minimal workout tracker for one person's actual training —
fast enough to log a set mid-workout with a plate in the other hand.
The owner currently tracks workouts as free text in Notion: slow to
write, impossible to graph. Reps exists to make the data *shaped* —
every set a structured row — so that trends, PRs, and progress charts
fall out for free later. Logging speed first, data purity always,
features never at the cost of either.

Reps is a sibling of **Tally** (the calorie counter), forked from
Tally v2.3.2. Same design system, same bones: hand-written CSS tokens,
bottom sheets with real drag physics, localStorage + native mirror
storage, backup/restore, optional local account, fluid sizing across
screen widths, the rolling-APK release pipeline. The fork keeps all of
Tally's scar tissue — font-zoom lock, uncageable sheets, no
scrollbars, safe areas — so those lessons never need relearning.

## Core design decisions (settled before day one)

- **The atom is the set**, not the workout: one row per set —
  exercise, weight (nullable for bodyweight work), reps, timestamp,
  session. Never "3×15kg" as a blob. Every future graph depends on
  this.
- **"Last time" is the default.** Opening an exercise shows the
  previous session's sets as ghost rows; logging a repeat is one tap,
  progression is a stepper tap (+2.5 kg / +1 rep). Typing numbers is
  the fallback, not the flow.
- **Sessions are explicit.** Start workout → log sets → **Finish
  workout** (button; auto-close as a safety net after long idle).
  History groups by session.
- **Three tabs, same skeleton as Tally:**
  - **Today** — idle: "Start workout" hero suggesting the next routine
    in the split, others one tap away, week-at-a-glance below.
    Active: live session screen — ticking total volume (kg) as the
    hero number, the routine's exercises as an ordered checklist,
    set-logging in a bottom sheet, Finish at the bottom.
  - **Routines** — Push / Pull / Legs as editable ordered exercise
    lists (the Menu, reborn). Freeform exercise names.
  - **History** — sessions with duration, volume, and PR badges;
    weekly volume bars up top; tap a session for the full set-by-set
    record.
- **Weekly cadence, not daily streaks.** Lifting has rest days; the
  honest streak is sessions-per-week against a target.
- **PR = the celebration moment.** New top weight on an exercise gets
  the sparkle burst. Earned, rare, meaningful.
- **Suggest, never lock.** The app guesses the next routine from the
  last session (owner runs push/pull with legs sometimes skipped —
  reality beats rotation math). Any routine is always one tap away.
- **Azure identity**, ported from Tally. Emerald stays available.
- Days roll over at 2 AM, inherited from Tally — a midnight workout
  belongs to the evening it started.

## v0.x — the core app (current target)

- [x] Strip the calorie domain from the fork (entries, menu, goal
      ring, protein) while keeping the design system and shell.
- [x] Data model: exercises, routines, sessions, sets — versioned
      storage + native mirror + backup format, per-set rows.
- [x] Routines tab: create/edit/reorder Push, Pull, Legs
      (pre-seeded with the owner's real program).
- [x] Today idle state: start-workout hero with next-routine
      suggestion and week-at-a-glance.
- [x] Live session: volume hero, exercise checklist, set sheet with
      "last time" ghosts + steppers, Finish workout.
- [x] History: session list + detail, weekly volume bars, PR badges.
- [x] Weekly session target + streak, in Settings.
- [x] Backup/restore of everything; settings (theme, accent, account
      beta) carried over from Tally.
- [x] Own identity: red launcher icon (0.3.1) — Reps no longer wears
      Tally blue on the home screen. In-app accent stays Azure.
- [x] Rest stopwatch tap-to-restart (0.3.1): tapping the pill zeroes
      the count; a new set always retakes the baseline. No buttons.

## Parked for later (deliberately)

- **Cardio** and **supersets/dropsets** — v1 is strictly sets of
  lifts.
- ~~Rest timer~~ — shipped in 0.3 as a zero-config count-up stopwatch.
- **Per-exercise trend pages** — charts of top-set weight, volume,
  e1RM over time. The schema is ready for them from day one.
- **"Work done" → calories burned** — an estimate of energy burned
  from a session. Honest note: physical work (kg × meters) wildly
  underestimates the metabolic cost of lifting, so this needs a
  MET/volume-based heuristic clearly labelled as an estimate, not
  physics theater. Owner-requested; revisit after some real data
  accumulates.
- **Notion history import** — parse the owner's text log into
  backdated sessions so graphs start with months of data.
- **Multiple routine templates / sharing** — different splits for
  different people; v1 is one person's split.
- **"Ember" accent** — an optional gym-coded warm theme alongside
  Azure/Emerald (owner dislikes red; ember ≠ red).
- **lb/kg toggle** — owner lifts in kg.
- **Sync server** — shared milestone with Tally; the account beta
  rides along in the fork.

## Provenance

Forked from Tally v2.3.2 (versionCode 22) on 2026-07-05. Initial
commit is Tally's code with a Reps identity pass (name, app id
`com.babicean.reps`, storage keys `reps.*`, fresh versioning); the
calorie domain is still aboard until the first real Reps version
replaces it. Tally's launcher icon and store assets are placeholders
to replace before any release matters.
