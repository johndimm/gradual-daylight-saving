# Gradual Daylight Saving

**What if daylight saving happened gradually?**

Instead of jumping an hour overnight twice a year, clocks could shift by a few seconds each day — spreading the transition over months. Since most clocks already sync from the network, time servers could ease us in without anyone noticing.

[Live demo](https://gradual-daylight-saving-five.vercel.app/)

## The idea

Daylight saving time transitions are jarring. Every spring we lose an hour of sleep; every fall our schedules lurch the other way. But the underlying problem — aligning our clocks with the seasons — doesn't require a sudden jump. The seasons change gradually, and our clocks could too.

This app shows two clocks side by side:

- **Normal clock** — works like your clock does today, jumping 1 hour overnight at each DST transition
- **Gradual clock** — spreads that same hour over the months between transitions, shifting just a few seconds per day

Both clocks arrive at the same time at each transition point. They diverge in between, reaching a maximum difference of about 30 minutes at the midpoint (mid-summer and mid-winter).

## How it works

The gradual offset uses **cosine easing** to smooth the transition:

```
offset = (1 - cos(π × progress)) / 2 × 3600000ms
```

Where `progress` is how far we are between two DST transitions (0 at one transition, 1 at the next).

This has two nice properties:

1. **Zero offset at transitions** — the clocks match exactly when DST changes happen
2. **Zero rate of change at transitions** — the gradual clock doesn't suddenly start or stop drifting; it eases in and out smoothly

At the midpoint (peak drift), the gradual clock runs about 24 seconds slow or fast per day — imperceptible in daily life.

## The app

The interactive demo lets you explore the concept:

- **Tour stops** walk through key moments: spring forward, mid-summer peak, fall back
- **Timeline bar** — click anywhere to jump to that point in the year
- **Playback controls** — step by minute/hour/day or play continuously at various speeds
- **Clock speed stats** — shows the instantaneous rate of each clock (the normal clock shows 95.83% on spring-forward day and 104.17% on fall-back day; the gradual clock never deviates more than ~0.03%)

## Implementation

Since most devices already sync time from NTP servers, this wouldn't require any hardware changes. The servers would simply report a slightly adjusted time — a few seconds off from UTC — following the cosine easing curve. Devices that sync frequently would track the gradual shift smoothly. Devices that sync less often (once a day, say) would still get a much gentler transition than the current 1-hour jump.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Built with Next.js, React, and Tailwind CSS.
