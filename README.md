# Reps

A calm, minimal workout tracker. Log a set in two taps — exercise,
weight, reps — built for push/pull/legs training and for turning
workouts into structured data: every set is a row, so trends, PRs,
and progress charts come for free.

Sibling of [Tally](https://github.com/Babicean/Tally), the calorie
counter, and forked from it: same hand-written design system, bottom
sheets with real drag physics, on-device storage with a native
mirror, backup/restore, and the rolling-APK release pipeline.

**Status: pre-1.0.** The fork currently carries Tally's calorie
domain as scaffolding while the workout domain is built. See
`BUILDLOG.md` for the goal, the v1 scope, and what's parked for
later; see `CHANGELOG.md` for what has actually shipped.

## Running it

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm test         # unit tests
```

## Android

Capacitor wraps the web app (`com.babicean.reps`). Every push to
`main` builds a signed sideload APK and refreshes the rolling
`latest` GitHub release.
