# Changelog

All notable changes to Reps, newest first. Each entry lists the app
version, the Android `versionCode`, and the date. See BUILDLOG.md for
where this is all going.

When cutting a new version: bump `package.json` and
`android/app/build.gradle` (`versionCode` always +1), add a section
here.

## 0.3 — code 4 — 2026-07-06

First feedback from a real workout:

- **Reps gets its own icon**: a white barbell on azure, everywhere —
  launcher (adaptive + legacy + round), PWA, and Apple touch icon. No
  more Tally marks on the gym app.
- **Rest stopwatch.** Log a set and a small "rest 0:47" pill starts
  counting up — in the live hero and inside the set logger. No
  configuration, no alarms; it resets with every set and bows out
  after 30 minutes. Lightweight on purpose.
- Parked with a note: a "work done" metric converting training volume
  into estimated calories burned — needs an honest model, not just
  physics theater (see BUILDLOG).

## 0.2.1 — code 3 — 2026-07-05

- **All-time counters** at the bottom of the History chart card:
  workouts, sets, and total kg lifted, forever. The number that only
  ever goes up.

## 0.2 — code 2 — 2026-07-05

The workout domain, replacing the calorie scaffolding. Reps is now a
working workout tracker.

- **Today, two lives.** Idle: a Start-workout hero suggesting the next
  routine in the split, other routines and a blank workout one tap
  away, and the week at a glance against the weekly target. Active:
  total kg lifted as the ticking hero number, the routine as an
  ordered checklist, and a two-tap Finish workout (a set-less session
  discards itself).
- **The set logger.** Tap an exercise, get a sheet with "last time"
  (or your program seed on day one) and prefilled fields — repeat is
  one tap, progression is a stepper tap (+2.5 kg / +1 rep). Blank
  weight = bodyweight. Today's sets listed with undo-able delete.
- **PRs celebrated.** Beat your heaviest ever on an exercise and the
  sparkle burst fires with a "PR" toast.
- **Routines tab**, pre-seeded with the owner's real push/pull/legs
  program from the Notion log — editable, reorderable, deletable.
- **History**: sessions with sets, volume, and duration; tap for the
  set-by-set record; weekly volume bars up top; delete with two taps.
- **Weekly cadence**: sessions-per-week target in Settings (default 3)
  with an honest weekly streak — lifting has rest days.
- Backup/restore of sessions, sets, routines, and settings (merge by
  id, never duplicates). Theme, accent, and the local account beta
  carry over from Tally.

## 0.1 — code 1 — 2026-07-05

- Forked from Tally v2.3.2 with a full identity pass: app name Reps,
  id `com.babicean.reps`, storage keys `reps.*`, fresh versioning.
  The calorie domain is still aboard as scaffolding; the workout
  domain replaces it next. Not a usable workout tracker yet.
