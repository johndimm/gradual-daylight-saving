"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { generateOffsets } from "../gradual-offsets";

function OffsetTable({ year }: { year: number }) {
  const offsets = useMemo(() => generateOffsets(year), [year]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [today, setToday] = useState(-1);

  useEffect(() => {
    const now = new Date();
    if (now.getFullYear() === year) {
      setToday(Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1);
    }
  }, [year]);

  useEffect(() => {
    if (!tableRef.current || today < 0) return;
    const row = tableRef.current.querySelector("[data-current]");
    if (row) row.scrollIntoView({ block: "center" });
  }, [today]);

  function fmt(sec: number): string {
    const m = Math.floor(Math.abs(sec) / 60);
    const s = Math.abs(sec) % 60;
    if (m === 0) return `${sec >= 0 ? "+" : "-"}${s}s`;
    return `+${m}m ${s}s`;
  }

  return (
    <div ref={tableRef} className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm font-mono">
        <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Day</th>
            <th className="text-left px-4 py-2 font-medium">Date</th>
            <th className="text-right px-4 py-2 font-medium">Offset</th>
            <th className="text-right px-4 py-2 font-medium">Daily change</th>
          </tr>
        </thead>
        <tbody>
          {offsets.map((row) => {
            const isCurrent = row.day === today;
            return (
              <tr
                key={row.day}
                data-current={isCurrent || undefined}
                className={isCurrent
                  ? "bg-amber-100 dark:bg-amber-900/40 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 even:bg-zinc-50 dark:even:bg-zinc-900/30"
                }
              >
                <td className="px-4 py-1">{row.day}</td>
                <td className="px-4 py-1">{row.date}</td>
                <td className="px-4 py-1 text-right tabular-nums">{fmt(row.offsetSeconds)}</td>
                <td className="px-4 py-1 text-right tabular-nums">
                  {row.dailyChangeSeconds >= 0 ? "+" : ""}{row.dailyChangeSeconds}s
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AboutPage() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <article className="max-w-2xl mx-auto px-6 py-12 sm:py-20">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          The DST debate has three options.<br />
          <span className="text-zinc-500 dark:text-zinc-400">There should be four.</span>
        </h1>

        <div className="mt-8 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Spring forward and you lose an hour of sleep. Twice a year the clock-change debate
            flares up, and it&apos;s always the same three options:
          </p>

          <ol className="list-decimal pl-6 space-y-2">
            <li><strong className="text-zinc-800 dark:text-zinc-100">Keep the current system</strong> — two jarring shifts a year</li>
            <li><strong className="text-zinc-800 dark:text-zinc-100">Permanent standard time</strong> — aligned with the sun, but dark evenings year-round</li>
            <li><strong className="text-zinc-800 dark:text-zinc-100">Permanent daylight saving</strong> — brighter evenings, but dark winter mornings that worry doctors and school parents</li>
          </ol>

          <p>
            These have been argued for decades and nobody can agree. Permanent standard
            sacrifices evening light. Permanent daylight saving means kids waiting for the
            school bus in the dark in January. The current system means everyone loses an
            hour of sleep and spends a week adjusting. Each side has real points, and the
            debate is stuck.
          </p>
        </div>

        {/* The fourth option */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
          <div className="text-sm uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">The fourth option</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Gradual daylight saving</h2>
          <p className="text-lg text-zinc-300 dark:text-zinc-600 leading-relaxed">
            Shift continuously, a few seconds a day, so you get the sunlight benefit with
            no abrupt jump at all. It doesn&apos;t pick a side — it removes the tradeoff.
          </p>
        </div>

        {/* Why it's possible now */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Why now?</h2>

          <p>
            When DST was invented over a century ago, every clock had to be reset by hand.
            That made each shift expensive and error-prone, so we settled on two per year —
            one hour each. But that was a compromise between two forces pulling in opposite
            directions:
          </p>

          <ul className="space-y-2 pl-6 list-disc">
            <li><strong className="text-zinc-800 dark:text-zinc-100">Fewer shifts are better</strong> — less hassle, but each shift is bigger</li>
            <li><strong className="text-zinc-800 dark:text-zinc-100">Shorter shifts are better</strong> — less disruption, but you need more of them</li>
          </ul>

          <p>
            A hundred years ago, &ldquo;fewer&rdquo; won by a landslide. Today? Cellphones
            changed everything. Your phone&apos;s clock is whatever the network says it is.
            When was the last time you set it manually? The cost of a time shift has dropped
            to zero.
          </p>

          <p>
            If your main complaint is losing an hour of sleep, you don&apos;t have to go all
            the way to continuous shifting to fix it. Make four half-hour shifts instead of two
            one-hour shifts. Or eight fifteen-minute shifts. Each one is small enough that your
            body barely notices.
          </p>

          <p>
            But why stop there? If shifting is free, go all the way.
          </p>
        </div>

        {/* The lookup table */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            The entire system fits on an index card
          </h2>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Make a table of 365 offsets — one for each day of the year. On January 1, the
            clock is 32 seconds ahead of standard. By the summer solstice, it&apos;s the full
            60 minutes. By winter solstice, it&apos;s back to zero. The maximum daily change?
            About 32 seconds.
          </p>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            No exotic physics, no redefining the second. Just a lookup table. Your phone
            applies today&apos;s offset automatically. You never notice.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                365 daily offsets for {year}
              </h3>
              <a
                href="/gradual-offsets-2026.json"
                download
                className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
              >
                Download JSON
              </a>
            </div>
            <OffsetTable year={year} />
          </div>
        </div>

        {/* Objections */}
        <div className="mt-16 space-y-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            &ldquo;But what about...&rdquo;
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                &ldquo;Does school start at a different time every day?&rdquo;
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                No. School starts at 8:00 AM — it always says 8:00 on the clock. The shift is
                in the relationship between clock time and solar time, not in anyone&apos;s schedule.
                You don&apos;t reschedule your life. The network adjusts the seconds. Everything
                that runs on clock time — meetings, classes, business hours — stays exactly where it is.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                &ldquo;What about cross-timezone scheduling?&rdquo;
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Meeting software and phones already handle timezone math automatically. Google
                Calendar doesn&apos;t care whether your offset is UTC-5 or UTC-4:58:20. It shows
                everyone the right time in their own zone. The infrastructure already exists — we
                just aren&apos;t using it.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                &ldquo;The IT industry would have a meltdown.&rdquo;
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Computers already handle leap seconds, timezone database updates, and the complexity
                of regions that observe DST at different dates. A gradual shift is actually{" "}
                <em>simpler</em> than the current system — it&apos;s a smooth function, not an
                abrupt discontinuity. No more &ldquo;is this timestamp before or after the
                spring-forward gap?&rdquo; edge cases. No more impossible 2:30 AM on the second
                Sunday in March.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                &ldquo;Just pick standard or daylight and stick with it.&rdquo;
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                A perfectly reasonable position. But it&apos;s been stuck in legislatures for
                years precisely because permanent standard and permanent daylight each have real
                downsides that block consensus. Gradual doesn&apos;t require that fight. It gives
                you the same sunlight tracking as DST with none of the disruption.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                &ldquo;What about the kitchen wall clock? The $20,000 Rolex?&rdquo;
              </h3>
              <div className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-3">
                <p>
                  Not every clock is networked. The honest answer: those clocks already can&apos;t
                  handle DST gracefully. Twice a year someone walks around the house resetting them.
                  Under gradual shifting, they&apos;d drift by at most 32 seconds a day — about 4
                  minutes a week at the peak. That&apos;s less noticeable than the hour we ask people
                  to swallow in a single night.
                </p>
                <p>
                  Before standardized clocks, humanity kept time with variable-length hours for
                  millennia. The period from sunrise to sunset was always &ldquo;12 hours,&rdquo;
                  whether it was June or December. Our ancestors handled fluid time just fine. We&apos;re
                  more equipped than they were.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Closing */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center leading-relaxed">
            The seasons change gradually.<br />Our clocks should too.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              See the interactive demo
            </a>
            <a
              href="/clock"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Try Smooth Time clock
            </a>
          </div>

          <div className="flex justify-center gap-6 mt-6">
            <a
              href="https://claude.ai/artifact/GZinF4RFc4dW15BD6TXFDh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              How the math works
            </a>
            <a
              href="https://github.com/johndimm/gradual-daylight-saving"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
