"use client";

import { useState, useEffect } from "react";
import { OffsetChart } from "../offset-chart";

export default function MathPage() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const summerSolstice = new Date(year, 5, 21, 12, 0, 0);

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <article className="max-w-2xl mx-auto px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          How the math works
        </h1>

        <div className="mt-8 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            The gradual offset uses a cosine easing function to produce a smooth
            S-curve between two anchor points. The offset at any moment is:
          </p>

          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-900 p-4 font-mono text-sm text-zinc-800 dark:text-zinc-200 text-center">
            offset(p) = (1 &minus; cos(&pi; &middot; p)) / 2 &times; 60 minutes
          </div>

          <p>
            where <strong>p</strong> is the progress from 0 to 1 between two
            anchor dates. At p=0 the offset is 0. At p=0.5 the offset is
            changing fastest. At p=1 it reaches +60 minutes. The cosine gives
            the curve a gentle start and stop &mdash; it accelerates in the
            middle and decelerates at the ends, so the daily shift is largest
            at the midpoint (~32 seconds/day) and near zero at the anchors.
          </p>

          <p>
            The offset is computed as a continuous function of the exact
            timestamp, not a daily lookup table. There is no jump at midnight
            or any other boundary. The 365-row table on the about page is just
            a daily snapshot of this continuous function.
          </p>
        </div>

        {/* Two sync methods */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Two ways to sync
          </h2>

          <p>
            The anchor points define when the gradual clock agrees with the
            normal clock. There are two natural choices, each with trade-offs.
          </p>
        </div>

        {/* Method 1: DST Transitions */}
        <div className="mt-10 space-y-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            1. Sync at DST transitions
          </h3>

          <p>
            The gradual clock matches the normal clock exactly at the two
            moments everyone notices: spring forward and fall back. The curve
            rises from fall back to spring forward (winter &rarr; spring), then
            falls from spring forward to fall back (spring &rarr; autumn).
          </p>

          <div className="my-6">
            <OffsetChart syncMethod="transitions" simDate={summerSolstice} />
          </div>

          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Pros:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              The two clocks agree at the exact moments people pay attention to
              the time change. No visible gap on the day everyone
              is talking about DST.
            </li>
            <li>
              If you switched from normal DST to gradual DST, the transition
              would be seamless at the switchover date.
            </li>
          </ul>

          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Cons:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              DST transition dates are set by law and vary by country, so
              the curve is tied to a political schedule rather than
              the natural daylight cycle.
            </li>
            <li>
              The asymmetry between the long summer DST period (~8 months)
              and the short winter standard period (~4 months) means the
              curve isn&rsquo;t a clean sine wave &mdash; the winter half
              rises faster than the summer half falls.
            </li>
          </ul>
        </div>

        {/* Method 2: Solstices */}
        <div className="mt-10 space-y-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            2. Sync at solstices
          </h3>

          <p>
            The gradual clock follows the natural daylight cycle. The offset
            rises from 0 at the winter solstice (Dec 21) to +60 minutes at the
            summer solstice (Jun 21), then falls back to 0. The curve is
            symmetric because the two halves of the year are nearly equal in
            length.
          </p>

          <div className="my-6">
            <OffsetChart syncMethod="solstices" simDate={summerSolstice} />
          </div>

          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Pros:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Tied to astronomy, not politics. The curve tracks the actual
              daylight cycle, which is what DST is trying to approximate.
              Works the same everywhere regardless of local DST rules.
            </li>
            <li>
              Perfectly symmetric &mdash; a clean cosine wave. The daily shift
              rate is the same in spring and autumn.
            </li>
          </ul>

          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Cons:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              At spring forward, the gradual clock is only partway up
              (~20 minutes ahead of standard) while the normal clock jumps a
              full hour. So the two clocks disagree by ~40 minutes right when
              people are most aware of the time change.
            </li>
            <li>
              You can&rsquo;t do a clean one-day switchover from normal DST
              to solstice-synced gradual DST &mdash; there would be a gap on
              the transition day.
            </li>
          </ul>
        </div>

        {/* Which is better? */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Which is better?
          </h2>

          <p>
            It depends on what you&rsquo;re optimizing for. If you want a drop-in
            replacement for current DST that people can adopt without
            noticing, sync at transitions. If you want the most natural and
            elegant system &mdash; one that tracks the actual daylight cycle
            and works the same worldwide &mdash; sync at solstices.
          </p>

          <p>
            The demo lets you toggle between both and see the difference on
            the chart.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <a
            href="/"
            className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            &larr; Back to demo
          </a>
        </div>
      </article>
    </div>
  );
}
