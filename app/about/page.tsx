"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { generateOffsets } from "../gradual-offsets";
import { getDSTTransitions } from "../offset-chart";

function ProgressionChart({ year }: { year: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = 240;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const muted = dark ? "#a8a29e" : "#78716c";
    const grid = dark ? "#292524" : "#e7e5e4";

    const pad = { top: 20, right: 12, bottom: 36, left: 44 };
    const plotW = cw - pad.left - pad.right;
    const plotH = ch - pad.top - pad.bottom;
    const maxMin = 80;

    const xPos = (day: number) => pad.left + (day / 365) * plotW;
    const yPos = (min: number) => pad.top + plotH - (min / maxMin) * plotH;
    const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

    const yearStart = new Date(year, 0, 1).getTime();
    const dayOf = (d: Date) => (d.getTime() - yearStart) / 86400000;
    const { springForward, fallBack } = getDSTTransitions(year);
    const sf = dayOf(springForward);
    const fb = dayOf(fallBack);

    // Grid
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= maxMin; m += 20) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yPos(m));
      ctx.lineTo(cw - pad.right, yPos(m));
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = muted;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let m = 0; m <= maxMin; m += 20) {
      ctx.fillText(m === 0 ? "0" : "+" + m + "m", pad.left - 6, yPos(m));
    }

    // Month labels
    const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    const monthDays = [0,31,59,90,120,151,181,212,243,273,304,334];
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < 12; i++) {
      const mid = monthDays[i] + (i < 11 ? (monthDays[i+1] - monthDays[i]) / 2 : 15);
      ctx.fillText(months[i], xPos(mid), ch - pad.bottom + 6);
    }

    // 1. Current DST (red step)
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(0));
    ctx.lineTo(xPos(sf - 0.5), yPos(0));
    ctx.lineTo(xPos(sf), yPos(60));
    ctx.lineTo(xPos(fb - 0.5), yPos(60));
    ctx.lineTo(xPos(fb), yPos(0));
    ctx.lineTo(xPos(365), yPos(0));
    ctx.strokeStyle = dark ? "#f87171" : "#dc2626";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Willett's 8-shift staircase (amber)
    // 4 Sundays in April stepping up 20 min each
    const apr1 = new Date(year, 3, 1);
    const aprFirstSunday = (7 - apr1.getDay()) % 7 || 7;
    const willettUp: number[] = [];
    for (let i = 0; i < 4; i++) {
      willettUp.push(dayOf(new Date(year, 3, aprFirstSunday + i * 7)));
    }
    // 4 Sundays in September stepping down 20 min each
    const sep1 = new Date(year, 8, 1);
    const sepFirstSunday = (7 - sep1.getDay()) % 7 || 7;
    const willettDown: number[] = [];
    for (let i = 0; i < 4; i++) {
      willettDown.push(dayOf(new Date(year, 8, sepFirstSunday + i * 7)));
    }

    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(0));
    let level = 0;
    for (const d of willettUp) {
      ctx.lineTo(xPos(d - 0.5), yPos(level));
      level += 20;
      ctx.lineTo(xPos(d), yPos(level));
    }
    ctx.lineTo(xPos(willettDown[0] - 0.5), yPos(level));
    for (const d of willettDown) {
      ctx.lineTo(xPos(d - 0.5), yPos(level));
      level -= 20;
      ctx.lineTo(xPos(d), yPos(level));
    }
    ctx.lineTo(xPos(365), yPos(0));
    ctx.strokeStyle = dark ? "#60a5fa" : "#2563eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Gradual (green smooth curve, solstice-synced)
    const sumSol = 172;
    const winSol = 355;
    const prevWin = winSol - 365;
    ctx.beginPath();
    for (let d = 0; d <= 365; d++) {
      let val: number;
      if (d < sumSol) {
        val = ease((d - prevWin) / (sumSol - prevWin)) * 60;
      } else if (d < winSol) {
        val = 60 - ease((d - sumSol) / (winSol - sumSol)) * 60;
      } else {
        val = ease((d - winSol) / (sumSol + 365 - winSol)) * 60;
      }
      const x = xPos(d), y = yPos(val);
      d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = dark ? "#4ade80" : "#16a34a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [year]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full max-w-lg mx-auto">
      <canvas ref={canvasRef} className="w-full" />
      <div className="flex justify-center gap-4 text-[10px] mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-red-500 dark:bg-red-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Current (2 shifts)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-blue-600 dark:bg-blue-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Willett (8 shifts)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-green-600 dark:bg-green-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Gradual (365)</span>
        </span>
      </div>
    </div>
  );
}

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
    const row = tableRef.current.querySelector("[data-current]") as HTMLElement | null;
    if (row) tableRef.current.scrollTop = row.offsetTop - tableRef.current.clientHeight / 2;
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
          An idea whose time has come
        </h1>

        <div className="mt-8 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <figure className="float-right ml-6 mb-4 w-40 sm:w-52">
            <img
              src="/waste-of-daylight-title.png"
              alt="Title page of The Waste of Daylight by William Willett, Nineteenth Edition, March 1914"
              className="rounded-lg shadow-lg"
            />
            <figcaption className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
              Willett&apos;s pamphlet, 19th edition, 1914
            </figcaption>
          </figure>

          <p>
            In 1907, William Willett published a pamphlet
            called <em>The Waste of Daylight</em>. He proposed shifting clocks
            forward in spring and back in autumn to gain evening daylight. His
            original plan called for eight shifts of 20 minutes each &mdash;
            four forward in spring, four back in autumn. A gentler approach
            than a single jump. He thought the benefits were
            obvious: more time outdoors, better health, less money spent on
            artificial light.
          </p>

          <p>
            By 1914, his proposal had been simplified to a single 60-minute
            shift &mdash; the version that eventually became law. The concern
            was always cost. Every clock had to be reset by hand.
            Even one shift was disruptive. Eight was unthinkable.
          </p>
        </div>

        {/* Step 1: Willett's original plan is now feasible */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Today, shifting is nearly free.
          </p>

          <p>
            The time on your phone is whatever the network says it is. When was
            the last time you set it manually? For most clocks in the modern
            world, the cost of a time shift has dropped to zero. Not all &mdash;
            wall clocks, wristwatches, and some industrial systems still need
            manual adjustment. But the balance has flipped: in Willett&apos;s day
            every clock was manual. Today most are networked.
          </p>

          <p>
            That means Willett&apos;s original plan &mdash; eight shifts of
            20 minutes &mdash; could actually work now. Your phone would apply
            each shift automatically. No manual clock-setting required. Would
            it be better than what we have? Almost certainly. The people who
            dread losing an hour of sleep twice a year would lose 20 minutes
            instead &mdash; barely enough to notice. That alone would be
            an improvement.
          </p>
        </div>

        {/* Step 2: But we can do better */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            But why stop at eight?
          </p>

          <p>
            Twenty minutes is still a shift you can feel. If the cost of
            resetting is zero, there&apos;s no reason to limit ourselves to eight
            shifts a year. Why not 365 &mdash; one for each day? Each shift
            would be about 32 seconds. Your phone applies today&apos;s offset
            automatically. You never notice.
          </p>

          <p>
            A smooth curve from 0 at the winter solstice to +60 minutes at the summer
            solstice and back again. No lost sleep. No jet lag. No jarring reset. Just
            the same sunlight tracking we already have, delivered so gradually that
            nobody feels it.
          </p>
        </div>

        {/* The progression */}
        <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900">
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">2</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">shifts/year</div>
            <div className="text-lg font-semibold text-red-500 dark:text-red-400 mt-2">60 min</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">each shift</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900">
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">8</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">shifts/year</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-2">20 min</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">Willett, 1907</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 ring-2 ring-green-500 dark:ring-green-400">
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">365</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">shifts/year</div>
            <div className="text-lg font-semibold text-green-500 dark:text-green-400 mt-2">32 sec</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">gradual</div>
          </div>
        </div>

        <div className="mt-8">
          <ProgressionChart year={year} />
        </div>

        {/* The future of watches */}
        <div className="mt-12 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            The future of watches
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Some clever horloger will find a simple mechanism to perform calendar-based warping.</li>
            <li>Makers will add the ability to move forward or back by seconds.</li>
            <li>After spending that much money on a watch, you&apos;ll be glad to be forced to play with it every few days.</li>
            <li>Our AI overlords will come to the same conclusion on their own and will not care about watches.</li>
          </ul>
        </div>

        {/* The lookup table */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            The entire system is 365 numbers
          </h2>

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

        {/* Closing */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center leading-relaxed">
            Seasons change gradually. Why can&apos;t our clocks?
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
              href="/math"
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
