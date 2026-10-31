"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { OffsetChart, getDSTTransitions, getTourStops, type SyncMethod } from "./offset-chart";

function getSolstice(year: number, summer: boolean): Date {
  return summer ? new Date(year, 5, 21, 0, 0, 0) : new Date(year, 11, 21, 0, 0, 0);
}

function getGradualOffsetMs(date: Date, syncMethod: SyncMethod = "transitions"): number {
  const year = date.getFullYear();
  const t = date.getTime();
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

  if (syncMethod === "solstices") {
    const summer = getSolstice(year, true);
    const winter = getSolstice(year, false);
    const prevWinter = getSolstice(year - 1, false);
    const nextSummer = getSolstice(year + 1, true);

    // Gradual offset from standard time: smooth 0 → +1hr → 0 synced to solstices
    let gradualStdOffset: number;
    if (t < summer.getTime()) {
      const p = (t - prevWinter.getTime()) / (summer.getTime() - prevWinter.getTime());
      gradualStdOffset = ease(p) * 3600000;
    } else if (t < winter.getTime()) {
      const p = (t - summer.getTime()) / (winter.getTime() - summer.getTime());
      gradualStdOffset = (1 - ease(p)) * 3600000;
    } else {
      const p = (t - winter.getTime()) / (nextSummer.getTime() - winter.getTime());
      gradualStdOffset = ease(p) * 3600000;
    }

    // Subtract normal DST offset to get offset relative to normal clock
    const { springForward, fallBack } = getDSTTransitions(year);
    const normalDSTOffset = (t >= springForward.getTime() && t < fallBack.getTime()) ? 3600000 : 0;
    return gradualStdOffset - normalDSTOffset;
  }

  const { springForward, fallBack } = getDSTTransitions(year);
  const { fallBack: prevFallBack } = getDSTTransitions(year - 1);
  const { springForward: nextSpringForward } = getDSTTransitions(year + 1);

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

function getGradualRate(date: Date, syncMethod: SyncMethod = "solstices"): {
  speedPct: number;
  dailyShiftSec: number;
} {
  const year = date.getFullYear();
  const t = date.getTime();
  let periodMs: number;
  let progress: number;
  let sign: number;

  if (syncMethod === "solstices") {
    const summer = getSolstice(year, true);
    const winter = getSolstice(year, false);
    const prevWinter = getSolstice(year - 1, false);
    const nextSummer = getSolstice(year + 1, true);

    if (t < summer.getTime()) {
      periodMs = summer.getTime() - prevWinter.getTime();
      progress = (t - prevWinter.getTime()) / periodMs;
      sign = 1;
    } else if (t < winter.getTime()) {
      periodMs = winter.getTime() - summer.getTime();
      progress = (t - summer.getTime()) / periodMs;
      sign = -1;
    } else {
      periodMs = nextSummer.getTime() - winter.getTime();
      progress = (t - winter.getTime()) / periodMs;
      sign = 1;
    }
  } else {
    const { springForward, fallBack } = getDSTTransitions(year);
    const { fallBack: prevFallBack } = getDSTTransitions(year - 1);
    const { springForward: nextSpringForward } = getDSTTransitions(year + 1);

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
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="text-center">
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {subtitle && (
          <div className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500">
            {subtitle}
          </div>
        )}
      </div>
      <svg viewBox="0 0 200 200" className="w-32 h-32 sm:w-48 sm:h-48">
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
      <div className="text-sm sm:text-base font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
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
        className="mini-timeline relative h-6 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
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
      <div className="relative mt-0.5 mb-2 text-[9px] text-zinc-500 dark:text-zinc-400 h-3">
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
  { label: "1 min/s", msPerTick: 3000, tickMs: 50 },
  { label: "1 hr/s", msPerTick: 180000, tickMs: 50 },
  { label: "1 day/s", msPerTick: 4320000, tickMs: 50 },
  { label: "1 week/s", msPerTick: 30240000, tickMs: 50 },
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
  const [syncMethod, setSyncMethodState] = useState<SyncMethod>("solstices");
  const [activeTourIdx, setActiveTourIdx] = useState<number | null>(null);
  const playRef = useRef(false);

  const setSyncMethod = (m: SyncMethod) => {
    setSyncMethodState(m);
    try { localStorage.setItem("smoothclock-sync", JSON.stringify(m)); } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("smoothclock-sync");
      if (saved) setSyncMethodState(JSON.parse(saved));
    } catch {}
    setSimDate(new Date(2026, 5, 21, 12, 0, 0));
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
    let lastFrame = 0;
    let rafId: number;
    const tick = (timestamp: number) => {
      if (!playRef.current) return;
      if (lastFrame === 0) lastFrame = timestamp;
      const elapsed = timestamp - lastFrame;
      if (elapsed >= speed.tickMs) {
        const steps = Math.floor(elapsed / speed.tickMs);
        lastFrame = timestamp - (elapsed % speed.tickMs);
        setSimDate((prev) =>
          prev ? new Date(prev.getTime() + speed.msPerTick * steps) : prev
        );
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, speedIdx]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      setUseRealtime(false);
      setPlaying(false);
      setActiveTourIdx(null);
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
      setActiveTourIdx(null);
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
    setActiveTourIdx(null);
    setSimDate((prev) => (prev ? new Date(prev.getTime() + delta) : prev));
  }, []);

  const goToNow = useCallback(() => {
    setUseRealtime(true);
    setPlaying(false);
    setActiveTourIdx(null);
    setSimDate(new Date());
  }, []);

  const togglePlay = useCallback(() => {
    if (useRealtime) setUseRealtime(false);
    setPlaying((p) => !p);
  }, [useRealtime]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, canvas, details, [role='button']")) return;
    togglePlay();
  }, [togglePlay]);

  if (!simDate) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  const offsetMs = getGradualOffsetMs(simDate, syncMethod);
  const gradualTime = new Date(simDate.getTime() + offsetMs);

  const dateStr = `${simDate.getFullYear()}-${String(simDate.getMonth() + 1).padStart(2, "0")}-${String(simDate.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(simDate.getHours()).padStart(2, "0")}:${String(simDate.getMinutes()).padStart(2, "0")}`;

  const tourStops = getTourStops(syncMethod, simDate.getFullYear());
  const activeTour = activeTourIdx !== null ? tourStops[activeTourIdx] ?? null : null;

  const { speedPct, dailyShiftSec } = getGradualRate(simDate, syncMethod);
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
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans cursor-pointer" onClick={handleBackgroundClick}>
      {/* Hero */}
      <div className="flex flex-col items-center px-4 pt-8 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100">
          What if daylight saving happened gradually?
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 text-center max-w-xl leading-relaxed">
          The left clock jumps an hour twice a year, like yours does now.
          The right clock spreads that hour over months — up to half a minute per day.
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
          <a href="/about" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            The argument
          </a>
          <a href="/started" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            How this app started
          </a>
          <a href="/clock" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            Smooth Time clock
          </a>
          <a href="/math" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            How the math works
          </a>
          <a href="https://github.com/johndimm/gradual-daylight-saving" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            GitHub
          </a>
          <a href="https://www.johndimm.org" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
            johndimm.org
          </a>
        </div>
      </div>

      {/* Date label */}
      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium pt-2">
        {formatDate(simDate)}
      </div>

      {/* Clocks + difference */}
      <div className="relative flex items-center justify-center gap-2 sm:gap-14 px-3 sm:px-4 py-4">
        <ClockFace time={simDate} label="Official" subtitle="Jumps 1 hour overnight" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-0.5 bg-zinc-50/90 dark:bg-zinc-950/90 px-3 py-1 rounded-lg">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Diff
            </div>
            <div className="text-base sm:text-xl font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
              {formatOffsetSeconds(offsetMs)}
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
              {gSign}{dailyShiftSec.toFixed(1)}s/day
            </div>
          </div>
        </div>
        <ClockFace time={gradualTime} label="Smooth" subtitle="Shifts seconds per day" />
      </div>

      {/* Chart + sync method selector */}
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="pt-2">
          <OffsetChart syncMethod={syncMethod} simDate={simDate} onJump={(d) => {
            setUseRealtime(false);
            setPlaying(false);
            const stops = getTourStops(syncMethod, d.getFullYear());
            const clickDay = (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000;
            let nearestIdx: number | null = null;
            let nearestDist = Infinity;
            for (let i = 0; i < stops.length; i++) {
              const stopDay = (stops[i].date().getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000;
              const dist = Math.abs(clickDay - stopDay);
              if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
            }
            if (nearestDist < 7) {
              setSimDate(stops[nearestIdx!].date());
              setActiveTourIdx(nearestIdx);
            } else {
              setSimDate(d);
              setActiveTourIdx(null);
            }
          }} />
        </div>
        <div className="flex items-center justify-center gap-2 pt-3 pb-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Sync at:</span>
          <div className="flex rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600">
            {(["transitions", "solstices"] as SyncMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setSyncMethod(m)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  syncMethod === m
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                {m === "transitions" ? "DST transitions" : "Solstices"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tour description (when a labeled point on the chart is clicked) */}
      <div className="flex flex-col items-center px-4 gap-2">
        {activeTour ? (
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed text-center max-w-lg">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeTour.label}.</span>{" "}
            {activeTour.desc}
          </p>
        ) : (
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
        )}
      </div>

      {/* Controls bar */}
      <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
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
        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} John Dimm
        </div>
      </div>
    </div>
  );
}
