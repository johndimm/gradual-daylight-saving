"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

function getDSTTransitions(year: number) {
  const march1 = new Date(year, 2, 1);
  const marchFirstSunday = (7 - march1.getDay()) % 7;
  const springForward = new Date(year, 2, 1 + marchFirstSunday + 7, 2, 0, 0);

  const nov1 = new Date(year, 10, 1);
  const novFirstSunday = (7 - nov1.getDay()) % 7;
  const fallBack = new Date(year, 10, 1 + novFirstSunday, 2, 0, 0);

  return { springForward, fallBack };
}

type SyncMethod = "transitions" | "solstices";

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

function OffsetChart({ syncMethod, simDate }: { syncMethod: SyncMethod; simDate: Date }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const year = simDate.getFullYear();
  const springFwd = useMemo(() => {
    const { springForward } = getDSTTransitions(year);
    const yearStart = new Date(year, 0, 1).getTime();
    return (springForward.getTime() - yearStart) / (86400000);
  }, [year]);
  const fallBack = useMemo(() => {
    const { fallBack } = getDSTTransitions(year);
    const yearStart = new Date(year, 0, 1).getTime();
    return (fallBack.getTime() - yearStart) / (86400000);
  }, [year]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = 220;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const muted = dark ? "#a8a29e" : "#78716c";
    const grid = dark ? "#292524" : "#e7e5e4";
    const lineNormal = dark ? "#f87171" : "#dc2626";
    const lineCurrent = dark ? "#60a5fa" : "#2563eb";
    const lineSolstice = dark ? "#4ade80" : "#16a34a";

    const pad = { top: 20, right: 12, bottom: 36, left: 40 };
    const plotW = cw - pad.left - pad.right;
    const plotH = ch - pad.top - pad.bottom;

    const sf = springFwd;
    const fb = fallBack;
    const sumSol = 172;
    const winSol = 355;

    const xPos = (day: number) => pad.left + (day / 365) * plotW;
    const yPos = (min: number) => pad.top + plotH - (min / 70) * plotH;
    const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

    // Grid
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= 60; m += 30) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yPos(m));
      ctx.lineTo(cw - pad.right, yPos(m));
      ctx.stroke();
    }

    // Zero baseline
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yPos(0));
    ctx.lineTo(cw - pad.right, yPos(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Y labels
    ctx.fillStyle = muted;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let m = 0; m <= 60; m += 30) {
      ctx.fillText(m === 0 ? "0" : "+" + m + "m", pad.left - 6, yPos(m));
    }

    // Month labels
    const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    const monthDays = [0,31,59,90,120,151,181,212,243,273,304,334];
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "10px system-ui";
    for (let i = 0; i < 12; i++) {
      const mid = monthDays[i] + (i < 11 ? (monthDays[i+1] - monthDays[i]) / 2 : 15);
      ctx.fillText(months[i], xPos(mid), ch - pad.bottom + 6);
    }

    // Normal (step)
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(0));
    ctx.lineTo(xPos(sf - 0.5), yPos(0));
    ctx.lineTo(xPos(sf), yPos(60));
    ctx.lineTo(xPos(fb - 0.5), yPos(60));
    ctx.lineTo(xPos(fb), yPos(0));
    ctx.lineTo(xPos(365), yPos(0));
    ctx.strokeStyle = lineNormal;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Transition curve
    function transitionOffset(d: number) {
      const prevFb = fb - 365;
      if (d < sf) return ease((d - prevFb) / (sf - prevFb)) * 60;
      if (d < fb) return 60 - ease((d - sf) / (fb - sf)) * 60;
      return ease((d - fb) / (sf + 365 - fb)) * 60;
    }

    // Solstice curve
    function solsticeOffset(d: number) {
      const prevWin = winSol - 365;
      if (d < sumSol) return ease((d - prevWin) / (sumSol - prevWin)) * 60;
      if (d < winSol) return 60 - ease((d - sumSol) / (winSol - sumSol)) * 60;
      return ease((d - winSol) / (sumSol + 365 - winSol)) * 60;
    }

    function drawSmooth(fn: (d: number) => number, color: string, highlight: boolean) {
      ctx.beginPath();
      for (let d = 0; d <= 365; d++) {
        const x = xPos(d), y = yPos(fn(d));
        d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = highlight ? 2.5 : 1.5;
      ctx.globalAlpha = highlight ? 1 : 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw non-selected method dimmed, selected method bright
    if (syncMethod === "solstices") {
      drawSmooth(transitionOffset, lineCurrent, false);
      drawSmooth(solsticeOffset, lineSolstice, true);
    } else {
      drawSmooth(solsticeOffset, lineSolstice, false);
      drawSmooth(transitionOffset, lineCurrent, true);
    }

    // Tour stop dots on the active curve
    const yearStart = new Date(year, 0, 1).getTime();
    const activeFn = syncMethod === "solstices" ? solsticeOffset : transitionOffset;
    const activeColor = syncMethod === "solstices" ? lineSolstice : lineCurrent;
    const stops = getTourStops(syncMethod);
    const simDayOfYear = (simDate.getTime() - yearStart) / 86400000;

    for (const stop of stops) {
      const d = stop.date();
      const stopDay = (d.getTime() - yearStart) / 86400000;
      const val = activeFn(stopDay);
      const sx = xPos(stopDay);
      const sy = yPos(val);
      const isActive = Math.abs(stopDay - simDayOfYear) < 1;

      // Dot
      ctx.beginPath();
      ctx.arc(sx, sy, isActive ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? activeColor : (dark ? "#d6d3d1" : "#57534e");
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = dark ? "#1c1917" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const isBefore = stop.label === "Before fall back";
      const isAfter = stop.label === "After fall back";
      const above = isAfter ? true : isBefore ? false : val > 20;
      ctx.fillStyle = muted;
      ctx.font = "9px system-ui";
      ctx.textAlign = sx > cw - pad.right - 40 ? "right" : sx < pad.left + 40 ? "left" : "center";
      ctx.textBaseline = above ? "bottom" : "top";
      const shortLabel = stop.label
        .replace("Summer solstice", "Summer sol.")
        .replace("Winter solstice", "Winter sol.")
        .replace("Before fall back", "Pre-fall")
        .replace("After fall back", "Post-fall")
        .replace("A month later", "Month later");
      ctx.fillText(shortLabel, sx, sy + (above ? -8 : 8));
    }

    // Current date marker
    const markerX = xPos(simDayOfYear);
    ctx.strokeStyle = dark ? "#fbbf24" : "#d97706";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(markerX, pad.top);
    ctx.lineTo(markerX, ch - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [syncMethod, simDate, year, springFwd, fallBack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.dispatchEvent(new Event("resize"));
    });
    const container = containerRef.current;
    if (container) ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-lg mx-auto px-4">
      <canvas ref={canvasRef} className="w-full" />
      <div className="flex justify-center gap-4 text-[10px] mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-red-500 dark:bg-red-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Normal</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-blue-600 dark:bg-blue-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Transitions</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-green-600 dark:bg-green-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Solstices</span>
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

function getTourStops(method: SyncMethod) {
  if (method === "solstices") {
    return [
      {
        date: () => new Date(2026, 2, 8, 12, 0, 0),
        label: "Spring forward",
        desc: "The normal clock jumps ahead an hour. The gradual clock is partway through its smooth rise — about 20 minutes ahead of standard time. The gap between them shifts suddenly.",
      },
      {
        date: () => new Date(2026, 5, 21, 12, 0, 0),
        label: "Summer solstice",
        desc: "The gradual clock catches up to the normal clock — both are a full hour ahead of standard time. This is one of two sync points per year.",
      },
      {
        date: () => new Date(2026, 9, 31, 12, 0, 0),
        label: "Before fall back",
        desc: "The gradual clock has been easing back down toward standard time, while the normal clock stays an hour ahead. The gap between them is near its peak.",
      },
      {
        date: () => new Date(2026, 10, 1, 12, 0, 0),
        label: "After fall back",
        desc: "The normal clock jumped back an hour. The gradual clock is still easing down smoothly — now slightly ahead of the normal clock.",
      },
      {
        date: () => new Date(2026, 11, 21, 12, 0, 0),
        label: "Winter solstice",
        desc: "Back in sync. Both clocks are on standard time. The gradual clock smoothly reached what the normal clock jumped to. The cycle repeats.",
      },
    ];
  }
  return [
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
      desc: "Halfway there — the gradual clock is 30 minutes behind and still falling back. The drift rate peaks here at about 24 seconds per day, then gradually slows as it approaches a full hour behind by fall.",
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
}

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
  const [syncMethod, setSyncMethod] = useState<SyncMethod>("solstices");
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

  const offsetMs = getGradualOffsetMs(simDate, syncMethod);
  const gradualTime = new Date(simDate.getTime() + offsetMs);

  const dateStr = `${simDate.getFullYear()}-${String(simDate.getMonth() + 1).padStart(2, "0")}-${String(simDate.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(simDate.getHours()).padStart(2, "0")}:${String(simDate.getMinutes()).padStart(2, "0")}`;

  const tourStops = getTourStops(syncMethod);
  const activeTour = tourStops.find((stop) => {
    const d = stop.date();
    return (
      simDate.getFullYear() === d.getFullYear() &&
      simDate.getMonth() === d.getMonth() &&
      simDate.getDate() === d.getDate()
    );
  });

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
      <div className="flex items-center justify-center gap-2 sm:gap-14 px-3 sm:px-4 py-4">
        <ClockFace time={simDate} label="Normal" subtitle="Jumps 1 hour overnight" />
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Diff
          </div>
          <div className="text-base sm:text-xl font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
            {formatOffsetSeconds(offsetMs)}
          </div>
        </div>
        <ClockFace time={gradualTime} label="Gradual" subtitle="Shifts seconds per day" />
      </div>

      {/* Tour stops — primary interaction */}
      <div className="flex flex-col items-center px-4 gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {tourStops.map((stop, i) => {
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
        {/* Sync method selector + chart */}
        <div className="flex items-center justify-center gap-2 pt-4">
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
        <div className="pt-2">
          <OffsetChart syncMethod={syncMethod} simDate={simDate} />
        </div>
        {/* Origin */}
        <div className="max-w-md mx-auto mt-6 px-4">
          <details className="group">
            <summary className="text-xs font-medium text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              How this app started
            </summary>
            <blockquote className="mt-2 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
              I want an app that shows 2 clocks. The first is a normal clock showing standard time or daylight saving time. The second is a hypothetical clock that follows the daylight saving pattern without making the sudden 1-hour jumps. Instead, it makes microchanges every day (or hour or second) to satisfy 2 conditions: it tracks the normal time shifts, and there is no sudden jump in time. The changes are smoothed out over the entire period. There is a calendar to switch to a different day or month so you can watch how the times differ. Maybe a play button to sit back and watch.
            </blockquote>
            <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              — the prompt to Claude Code that built this app
            </p>
          </details>
        </div>
        {/* Smooth Clock CTA */}
        <div className="mt-6 mx-4">
          <div className="max-w-md mx-auto text-center mb-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              If there were a single source of truth for time, we could tweak it to give the benefits of daylight saving without the jarring jumps. There isn&apos;t. The next best thing is to tweak your own daily routine.
            </p>
          </div>
          <a
            href="/clock"
            className="block max-w-md mx-auto rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-5 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <div className="text-lg font-semibold mb-1">Try Smooth Clock</div>
            <div className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
              A bedside alarm clock that shifts your wake-up time by seconds per day — so you adapt to daylight saving gradually, without ever losing an hour of sleep.
            </div>
          </a>
        </div>
        <div className="flex justify-center mt-3">
          <a
            href="https://github.com/johndimm/gradual-daylight-saving"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
