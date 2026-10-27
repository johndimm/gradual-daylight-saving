# Gradual Daylight Saving

**What if daylight saving happened gradually?**

Instead of jumping an hour overnight twice a year, clocks could shift by a few seconds each day — spreading the transition over months. Since most clocks already sync from the network, time servers could ease us in without anyone noticing.

[Live demo](https://gradual.johndimm.org/)

## Origin

This app started as a prompt to Claude Code:

> I want an app that shows 2 clocks. The first is a normal clock showing standard time or daylight saving time. The second is a hypothetical clock that follows the daylight saving pattern without making the sudden 1-hour jumps. Instead, it makes microchanges every day (or hour or second) to satisfy 2 conditions:
>
> - it tracks the normal time shifts. When the clocks change by one hour, the new clock matches the time after the jump.
> - but there is no sudden jump in time. The changes are smoothed out over the entire period.
>
> There is a calendar to switch to a different day or month so you can watch how the times differ. Maybe a play button to sit back and watch.

## The idea

Daylight saving time transitions are jarring. Every spring we lose an hour of sleep; every fall our schedules lurch the other way. But the underlying problem — aligning our clocks with the seasons — doesn't require a sudden jump. The seasons change gradually, and our clocks could too.

This app shows two clocks side by side:

- **Official clock** — works like your clock does today, jumping 1 hour overnight at each DST transition
- **Smooth clock** — spreads that same hour over months, shifting just a few seconds per day

By default, the smooth clock syncs at the **solstices** — zero offset at the summer and winter solstices, smoothly easing between them. This is a better smoothing of the official DST step function, with about half the total cumulative deviation from official time compared to syncing at DST transitions.

## How it works

The gradual offset uses **cosine easing** to smooth the transition:

```
offset = (1 - cos(π × progress)) / 2 × 3600000ms
```

Where `progress` is how far between two sync points (0 at one, 1 at the next). With solstice sync, those points are the summer and winter solstices; with transition sync, they're spring forward and fall back.

This has two nice properties:

1. **Zero offset at sync points** — the smooth and official clocks match exactly
2. **Zero rate of change at sync points** — the smooth clock doesn't suddenly start or stop drifting; it eases in and out smoothly

At its fastest drift, the smooth clock shifts about 24 seconds per day — imperceptible in daily life.

## The app

The interactive demo lets you explore the concept:

- **Sync method selector** — choose when the smooth clock syncs with the official clock:
  - **Solstices** (default) — zero offset at summer and winter solstices; ~50 min max offset from official; lowest total deviation
  - **DST transitions** — zero offset at spring forward and fall back; max 1-hour drift mid-season
- **Tour stops** walk through key moments in the year, with descriptions that adapt to the selected sync method
- **Timeline bar** — click anywhere to jump to that point in the year
- **Playback controls** — step by minute/hour/day or play continuously at various speeds
- **Clock speed stats** — shows the instantaneous rate of each clock (the official clock shows 95.83% on spring-forward day and 104.17% on fall-back day; the smooth clock never deviates more than ~0.03%)

## Smooth Time

If there were a single source of truth for time, we could tweak it to give the benefits of daylight saving without the jarring jumps. There isn't. The next best thing is to tweak your own daily routine.

**Smooth Time** is a bedside alarm clock that shifts your wake-up time by seconds per day — so you adapt to daylight saving gradually, without ever losing an hour of sleep. Available at `/clock` in the app.

Features:

- **4 display styles** — Digital (analog + digital), Analog, Minimal, and Flip (retro split-flap)
- **5 alarm sounds** — Chime, Pulse, Rising, Birds, and Radar, all generated with Web Audio API
- **Bedside mode** — keeps the screen on using the Wake Lock API so the alarm fires reliably on a phone
- **Sync point** — choose to sync at DST transitions or solstices (same as the explainer)
- **Alarm on smooth time** — fires based on the gradually-adjusted time, with snooze and dismiss
- All settings persist to localStorage

## Implementation

If there were a single source of truth for time — a global NTP adjustment — this wouldn't require any hardware changes. The servers would simply report a slightly adjusted time following the cosine easing curve. But since there isn't, Smooth Time applies the adjustment personally: set your alarm to smooth time and your wake-up shifts by seconds per day instead of an hour overnight.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Built with Next.js, React, and Tailwind CSS.
