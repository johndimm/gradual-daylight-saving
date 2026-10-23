# Gradual Daylight Saving

**What if daylight saving happened gradually?**

Instead of jumping an hour overnight twice a year, clocks could shift by a few seconds each day — spreading the transition over months. Since most clocks already sync from the network, time servers could ease us in without anyone noticing.

[Live demo](https://gradual-daylight-saving-five.vercel.app/)

## The idea

Daylight saving time transitions are jarring. Every spring we lose an hour of sleep; every fall our schedules lurch the other way. But the underlying problem — aligning our clocks with the seasons — doesn't require a sudden jump. The seasons change gradually, and our clocks could too.

This app shows two clocks side by side:

- **Normal clock** — works like your clock does today, jumping 1 hour overnight at each DST transition
- **Gradual clock** — spreads that same hour over the months between transitions, shifting just a few seconds per day

Both clocks are in sync at each transition point. In between, they diverge steadily — the gradual clock falls further and further behind (or ahead), reaching nearly a full hour of difference just before the next transition. At that moment, the normal clock jumps to meet it and they're back in sync.

## How it works

The gradual offset uses **cosine easing** to smooth the transition:

```
offset = (1 - cos(π × progress)) / 2 × 3600000ms
```

Where `progress` is how far we are between two DST transitions (0 at one transition, 1 at the next).

This has two nice properties:

1. **Zero offset at transitions** — the clocks match exactly when DST changes happen
2. **Zero rate of change at transitions** — the gradual clock doesn't suddenly start or stop drifting; it eases in and out smoothly

At its fastest drift (mid-summer/mid-winter), the gradual clock loses or gains about 24 seconds per day — imperceptible in daily life.

## The app

The interactive demo lets you explore the concept:

- **Tour stops** walk through key moments: spring forward, mid-summer peak, fall back
- **Timeline bar** — click anywhere to jump to that point in the year
- **Playback controls** — step by minute/hour/day or play continuously at various speeds
- **Clock speed stats** — shows the instantaneous rate of each clock (the normal clock shows 95.83% on spring-forward day and 104.17% on fall-back day; the gradual clock never deviates more than ~0.03%)

## Smooth Clock

If there were a single source of truth for time, we could tweak it to give the benefits of daylight saving without the jarring jumps. There isn't. The next best thing is to tweak your own daily routine.

**Smooth Clock** is a bedside alarm clock that shifts your wake-up time by seconds per day — so you adapt to daylight saving gradually, without ever losing an hour of sleep. Available at `/clock` in the app.

Features:

- **4 display styles** — Digital (analog + digital), Analog, Minimal, and Flip (retro split-flap)
- **5 alarm sounds** — Chime, Pulse, Rising, Birds, and Radar, all generated with Web Audio API
- **Bedside mode** — keeps the screen on using the Wake Lock API so the alarm fires reliably on a phone
- **Alarm on smooth time** — fires based on the gradually-adjusted time, with snooze and dismiss
- All settings persist to localStorage

## Implementation

If there were a single source of truth for time — a global NTP adjustment — this wouldn't require any hardware changes. The servers would simply report a slightly adjusted time following the cosine easing curve. But since there isn't, Smooth Clock applies the adjustment personally: set your alarm to smooth time and your wake-up shifts by seconds per day instead of an hour overnight.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Built with Next.js, React, and Tailwind CSS.
