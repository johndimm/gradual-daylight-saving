"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function getDSTTransitions(year: number) {
  const march1 = new Date(year, 2, 1);
  const marchFirstSunday = (7 - march1.getDay()) % 7;
  const springForward = new Date(year, 2, 1 + marchFirstSunday + 7, 2, 0, 0);

  const nov1 = new Date(year, 10, 1);
  const novFirstSunday = (7 - nov1.getDay()) % 7;
  const fallBack = new Date(year, 10, 1 + novFirstSunday, 2, 0, 0);

  return { springForward, fallBack };
}

function getGradualOffsetMs(date: Date): number {
  const year = date.getFullYear();
  const { springForward, fallBack } = getDSTTransitions(year);
  const { fallBack: prevFallBack } = getDSTTransitions(year - 1);
  const { springForward: nextSpringForward } = getDSTTransitions(year + 1);

  const t = date.getTime();
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

  if (t < springForward.getTime()) {
    const start = prevFallBack.getTime();
    const end = springForward.getTime();
    const progress = (t - start) / (end - start);
    return ease(progress) * 3600000;
  } else if (t < fallBack.getTime()) {
    const start = springForward.getTime();
    const end = fallBack.getTime();
    const progress = (t - start) / (end - start);
    return -ease(progress) * 3600000;
  } else {
    const start = fallBack.getTime();
    const end = nextSpringForward.getTime();
    const progress = (t - start) / (end - start);
    return ease(progress) * 3600000;
  }
}

function getGradualRate(date: Date): {
  speedPct: number;
  dailyShiftSec: number;
} {
  const year = date.getFullYear();
  const { springForward, fallBack } = getDSTTransitions(year);
  const { fallBack: prevFallBack } = getDSTTransitions(year - 1);
  const { springForward: nextSpringForward } = getDSTTransitions(year + 1);

  const t = date.getTime();
  let periodMs: number;
  let progress: number;
  let sign: number;

  if (t < springForward.getTime()) {
    const start = prevFallBack.getTime();
    const end = springForward.getTime();
    periodMs = end - start;
    progress = (t - start) / periodMs;
    sign = 1;
  } else if (t < fallBack.getTime()) {
    const start = springForward.getTime();
    const end = fallBack.getTime();
    periodMs = end - start;
    progress = (t - start) / periodMs;
    sign = -1;
  } else {
    const start = fallBack.getTime();
    const end = nextSpringForward.getTime();
    periodMs = end - start;
    progress = (t - start) / periodMs;
    sign = 1;
  }

  const ratePerMs =
    (sign * (Math.PI / 2) * Math.sin(Math.PI * progress) * 3600000) / periodMs;
  const speedPct = (1 + ratePerMs) * 100;
  const dailyShiftSec = (ratePerMs * 86400000) / 1000;

  return { speedPct, dailyShiftSec };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatOffsetSeconds(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const sign = totalSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m === 0) return `${sign}${s}s`;
  return `${sign}${m}m ${s}s`;
}

function ClockFace({ time, label, subtitle }: { time: Date; label: string; subtitle?: string }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ms = time.getMilliseconds();

  const secondAngle = ((seconds + ms / 1000) / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = ((hours + minutes / 60) / 12) * 360;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {subtitle && (
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {subtitle}
          </div>
        )}
      </div>
      <svg viewBox="0 0 200 200" className="w-36 h-36 sm:w-48 sm:h-48">
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-200 dark:text-zinc-700"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 100 + 82 * Math.sin(angle);
          const y1 = 100 - 82 * Math.cos(angle);
          const x2 = 100 + 90 * Math.sin(angle);
          const y2 = 100 - 90 * Math.cos(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
              className="text-zinc-400 dark:text-zinc-500"
            />
          );
        })}
        <line
          x1="100"
          y1="100"
          x2={100 + 50 * Math.sin((hourAngle * Math.PI) / 180)}
          y2={100 - 50 * Math.cos((hourAngle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-zinc-800 dark:text-zinc-200"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.sin((minuteAngle * Math.PI) / 180)}
          y2={100 - 70 * Math.cos((minuteAngle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-zinc-600 dark:text-zinc-300"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 75 * Math.sin((secondAngle * Math.PI) / 180)}
          y2={100 - 75 * Math.cos((secondAngle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-red-500"
        />
        <circle
          cx="100"
          cy="100"
          r="4"
          className="fill-zinc-800 dark:fill-zinc-200"
        />
      </svg>
      <div className="text-base font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {formatTime(time)}
      </div>
    </div>
  );
}

function MiniTimeline({
  date,
  onJump,
}: {
  date: Date;
  onJump: (date: Date) => void;
}) {
  const year = date.getFullYear();
  const { springForward, fallBack } = getDSTTransitions(year);

  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();
  const yearLen = yearEnd - yearStart;

  const springPct = ((springForward.getTime() - yearStart) / yearLen) * 100;
  const fallPct = ((fallBack.getTime() - yearStart) / yearLen) * 100;
  const nowPct = ((date.getTime() - yearStart) / yearLen) * 100;

  return (
    <div className="w-full">
      <div
        className="relative h-6 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const yearStart = new Date(year, 0, 1).getTime();
          const yearEnd = new Date(year + 1, 0, 1).getTime();
          onJump(new Date(yearStart + pct * (yearEnd - yearStart)));
        }}
      >
        <div
          className="absolute top-0 bottom-0 bg-blue-100 dark:bg-blue-900/40"
          style={{ left: 0, width: `${springPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-amber-100 dark:bg-amber-900/40"
          style={{ left: `${springPct}%`, width: `${fallPct - springPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-blue-100 dark:bg-blue-900/40"
          style={{ left: `${fallPct}%`, right: 0 }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-500 dark:bg-blue-400"
          style={{ left: `${springPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-500 dark:bg-blue-400"
          style={{ left: `${fallPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${Math.min(100, Math.max(0, nowPct))}%` }}
        />
      </div>
      <div className="relative mt-0.5 text-[9px] text-zinc-500 dark:text-zinc-400 h-3">
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${springPct}%` }}
        >
          Spring fwd
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${fallPct}%` }}
        >
          Fall back
        </span>
      </div>
    </div>
  );
}

const PLAYBACK_SPEEDS = [
  { label: "1 hour/s", msPerTick: 3600000, tickMs: 50 },
  { label: "1 day/s", msPerTick: 86400000, tickMs: 50 },
  { label: "1 week/s", msPerTick: 604800000, tickMs: 50 },
];

const TOUR_STOPS = [
  {
    date: () => new Date(2026, 2, 8, 12, 0, 0),
    label: "Spring forward",
    desc: "The clocks match at the transition. The gradual clock spent all winter slowly gaining time to arrive here.",
  },
  {
    date: () => new Date(2026, 3, 8, 12, 0, 0),
    label: "A month later",
    desc: "Still close — only a couple minutes apart. The cosine easing keeps the rate of change near zero right after the transition.",
  },
  {
    date: () => new Date(2026, 6, 5, 12, 0, 0),
    label: "Mid-summer",
    desc: "Peak difference — the gradual clock is 30 minutes behind. It's been losing about 24 seconds per day. From here it starts catching up, arriving back in sync by fall.",
  },
  {
    date: () => new Date(2026, 9, 31, 12, 0, 0),
    label: "Before fall back",
    desc: "Nearly an hour apart. The gradual clock has given back almost the full hour, matching what the sudden jump will do.",
  },
  {
    date: () => new Date(2026, 10, 1, 12, 0, 0),
    label: "After fall back",
    desc: "Together again. The normal clock jumped back an hour; the gradual clock was already there. The cycle repeats.",
  },
];

const STEPS = [
  { label: "-1d", delta: -86400000 },
  { label: "-1h", delta: -3600000 },
  { label: "-1m", delta: -60000 },
];

const STEPS_FWD = [
  { label: "+1m", delta: 60000 },
  { label: "+1h", delta: 3600000 },
  { label: "+1d", delta: 86400000 },
];

export default function Home() {
  const [simDate, setSimDate] = useState<Date | null>(null);
  const [useRealtime, setUseRealtime] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const playRef = useRef(false);

  useEffect(() => {
    setSimDate(new Date(2026, 6, 5, 12, 0, 0));
  }, []);

  useEffect(() => {
    if (!useRealtime) return;
    const id = setInterval(() => {
      setSimDate(new Date());
    }, 100);
    return () => clearInterval(id);
  }, [useRealtime]);

  useEffect(() => {
    playRef.current = playing;
    if (!playing) return;
    const speed = PLAYBACK_SPEEDS[speedIdx];
    const id = setInterval(() => {
      if (!playRef.current) return;
      setSimDate((prev) =>
        prev ? new Date(prev.getTime() + speed.msPerTick) : prev
      );
    }, speed.tickMs);
    return () => clearInterval(id);
  }, [playing, speedIdx]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      setUseRealtime(false);
      setPlaying(false);
      const [y, m, d] = val.split("-").map(Number);
      setSimDate((prev) => {
        const next = new Date(prev || new Date());
        next.setFullYear(y, m - 1, d);
        return next;
      });
    },
    []
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      setUseRealtime(false);
      setPlaying(false);
      const [h, m] = val.split(":").map(Number);
      setSimDate((prev) => {
        const next = new Date(prev || new Date());
        next.setHours(h, m, 0, 0);
        return next;
      });
    },
    []
  );

  const step = useCallback((delta: number) => {
    setUseRealtime(false);
    setPlaying(false);
    setSimDate((prev) => (prev ? new Date(prev.getTime() + delta) : prev));
  }, []);

  const goToNow = useCallback(() => {
    setUseRealtime(true);
    setPlaying(false);
    setSimDate(new Date());
  }, []);

  const togglePlay = useCallback(() => {
    if (useRealtime) setUseRealtime(false);
    setPlaying((p) => !p);
  }, [useRealtime]);

  if (!simDate) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  const offsetMs = getGradualOffsetMs(simDate);
  const gradualTime = new Date(simDate.getTime() + offsetMs);

  const dateStr = `${simDate.getFullYear()}-${String(simDate.getMonth() + 1).padStart(2, "0")}-${String(simDate.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(simDate.getHours()).padStart(2, "0")}:${String(simDate.getMinutes()).padStart(2, "0")}`;

  const activeTour = TOUR_STOPS.find((stop) => {
    const d = stop.date();
    return (
      simDate.getFullYear() === d.getFullYear() &&
      simDate.getMonth() === d.getMonth() &&
      simDate.getDate() === d.getDate()
    );
  });

  const { speedPct, dailyShiftSec } = getGradualRate(simDate);
  const gSign = dailyShiftSec >= 0 ? "+" : "";
  const dayStart = new Date(
    simDate.getFullYear(),
    simDate.getMonth(),
    simDate.getDate()
  );
  const dayEnd = new Date(
    simDate.getFullYear(),
    simDate.getMonth(),
    simDate.getDate() + 1
  );
  const dayLengthMs = dayEnd.getTime() - dayStart.getTime();
  const normalPct = (dayLengthMs / 86400000) * 100;
  const normalShiftSec = (dayLengthMs - 86400000) / 1000;
  const nSign = normalShiftSec >= 0 ? "+" : "";

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Hero */}
      <div className="flex flex-col items-center px-4 pt-8 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100">
          What if daylight saving happened gradually?
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 text-center max-w-xl leading-relaxed">
          The left clock jumps an hour twice a year, like yours does now.
          The right clock spreads that hour over months — a few seconds per day.
          Click the stops below to see how they diverge and converge through the year.
        </p>
      </div>

      {/* Date label */}
      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium pt-2">
        {formatDate(simDate)}
      </div>

      {/* Clocks + difference */}
      <div className="flex items-center justify-center gap-6 sm:gap-14 px-4 py-4">
        <ClockFace time={simDate} label="Normal" subtitle="Jumps 1 hour overnight" />
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Diff
          </div>
          <div className="text-xl font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
            {formatOffsetSeconds(offsetMs)}
          </div>
        </div>
        <ClockFace time={gradualTime} label="Gradual" subtitle="Shifts seconds per day" />
      </div>

      {/* Tour stops — primary interaction */}
      <div className="flex flex-col items-center px-4 gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {TOUR_STOPS.map((stop, i) => {
            const stopDate = stop.date();
            const isActive =
              simDate.getFullYear() === stopDate.getFullYear() &&
              simDate.getMonth() === stopDate.getMonth() &&
              simDate.getDate() === stopDate.getDate();
            return (
              <button
                key={i}
                onClick={() => {
                  setUseRealtime(false);
                  setPlaying(false);
                  setSimDate(stop.date());
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                {stop.label}
              </button>
            );
          })}
          <button
            onClick={goToNow}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              useRealtime
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            Right now
          </button>
        </div>
        {activeTour && (
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed text-center max-w-lg">
            {activeTour.desc}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="w-full max-w-lg mx-auto px-4 pt-4">
        <MiniTimeline
          date={simDate}
          onJump={(d) => {
            setUseRealtime(false);
            setPlaying(false);
            setSimDate(d);
          }}
        />
      </div>

      {/* Clock speed stats */}
      <div className="flex justify-center gap-10 text-[11px] tabular-nums px-4 pt-2 pb-4">
        <div className="flex flex-col items-center">
          <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[9px]">
            Normal clock
          </span>
          <span
            className={`font-mono ${normalPct !== 100 ? "text-red-500 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {normalPct.toFixed(4)}%
          </span>
          <span
            className={`font-mono ${normalShiftSec !== 0 ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            {nSign}
            {normalShiftSec.toFixed(1)}s/day
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[9px]">
            Gradual clock
          </span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400">
            {speedPct.toFixed(4)}%
          </span>
          <span className="font-mono text-zinc-400 dark:text-zinc-500">
            {gSign}
            {dailyShiftSec.toFixed(1)}s/day
          </span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex flex-wrap items-center justify-center gap-2">
          <input
            type="date"
            value={dateStr}
            onChange={handleDateChange}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
          />
          <input
            type="time"
            value={timeStr}
            onChange={handleTimeChange}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
          />
          <div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-600">
            {STEPS.map((s) => (
              <button
                key={s.label}
                onClick={() => step(s.delta)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={togglePlay}
            className="rounded bg-zinc-200 dark:bg-zinc-700 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-600">
            {STEPS_FWD.map((s) => (
              <button
                key={s.label}
                onClick={() => step(s.delta)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Speed:
            </span>
            <div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-600">
              {PLAYBACK_SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSpeedIdx(i)}
                  className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    i === speedIdx
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
