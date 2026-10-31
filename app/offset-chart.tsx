"use client";

import { useRef, useMemo, useEffect, useCallback, memo } from "react";

export type SyncMethod = "transitions" | "solstices";

export function getDSTTransitions(year: number) {
  const march1 = new Date(year, 2, 1);
  const marchFirstSunday = (7 - march1.getDay()) % 7;
  const springForward = new Date(year, 2, 1 + marchFirstSunday + 7, 2, 0, 0);

  const nov1 = new Date(year, 10, 1);
  const novFirstSunday = (7 - nov1.getDay()) % 7;
  const fallBack = new Date(year, 10, 1 + novFirstSunday, 2, 0, 0);

  return { springForward, fallBack };
}

export function getTourStops(method: SyncMethod, year: number) {
  const { springForward, fallBack } = getDSTTransitions(year);
  const sfDate = springForward;
  const fbDate = fallBack;
  const afterFb = new Date(fbDate.getFullYear(), fbDate.getMonth(), fbDate.getDate(), 12, 0, 0);

  if (method === "solstices") {
    return [
      {
        date: () => new Date(year, sfDate.getMonth(), sfDate.getDate(), 12, 0, 0),
        label: "Spring forward",
        desc: "The normal clock jumps ahead an hour. The gradual clock is partway through its smooth rise — about 20 minutes ahead of standard time. The gap between them shifts suddenly.",
      },
      {
        date: () => new Date(year, 5, 21, 12, 0, 0),
        label: "Summer solstice",
        desc: "The gradual clock catches up to the normal clock — both are a full hour ahead of standard time. This is one of two sync points per year.",
      },
      {
        date: () => afterFb,
        label: "Fall back",
        desc: "The normal clock jumped back an hour. The gradual clock is still easing down smoothly — now slightly ahead of the normal clock.",
      },
      {
        date: () => new Date(year, 11, 21, 12, 0, 0),
        label: "Winter solstice",
        desc: "Back in sync. Both clocks are on standard time. The gradual clock smoothly reached what the normal clock jumped to. The cycle repeats.",
      },
    ];
  }
  return [
    {
      date: () => new Date(year, sfDate.getMonth(), sfDate.getDate(), 12, 0, 0),
      label: "Spring forward",
      desc: "The clocks match at the transition. The gradual clock spent all winter slowly gaining time to arrive here.",
    },
    {
      date: () => {
        const d = new Date(sfDate);
        d.setDate(d.getDate() + 31);
        d.setHours(12, 0, 0, 0);
        return d;
      },
      label: "A month later",
      desc: "Still close — only a couple minutes apart. The cosine easing keeps the rate of change near zero right after the transition.",
    },
    {
      date: () => new Date(year, 6, 5, 12, 0, 0),
      label: "Mid-summer",
      desc: "Halfway there — the gradual clock is 30 minutes behind and still falling back. The drift rate peaks here at about 24 seconds per day.",
    },
    {
      date: () => afterFb,
      label: "Fall back",
      desc: "Together again. The normal clock jumped back an hour; the gradual clock was already there. The cycle repeats.",
    },
  ];
}

export const OffsetChart = memo(function OffsetChart({ syncMethod, simDate, onJump }: { syncMethod: SyncMethod; simDate: Date; onJump?: (date: Date) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const year = simDate.getFullYear();
  const springFwd = useMemo(() => {
    const { springForward } = getDSTTransitions(year);
    const yearStart = new Date(year, 0, 1).getTime();
    return (springForward.getTime() - yearStart) / (86400000);
  }, [year]);
  const fallBackDay = useMemo(() => {
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
    const fb = fallBackDay;
    const sumSol = 172;
    const winSol = 355;

    const xPos = (day: number) => pad.left + (day / 365) * plotW;
    const yPos = (min: number) => pad.top + plotH - (min / 70) * plotH;
    const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= 60; m += 30) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yPos(m));
      ctx.lineTo(cw - pad.right, yPos(m));
      ctx.stroke();
    }

    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yPos(0));
    ctx.lineTo(cw - pad.right, yPos(0));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = muted;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let m = 0; m <= 60; m += 30) {
      ctx.fillText(m === 0 ? "0" : "+" + m + "m", pad.left - 6, yPos(m));
    }

    const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    const monthDays = [0,31,59,90,120,151,181,212,243,273,304,334];
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "10px system-ui";
    for (let i = 0; i < 12; i++) {
      const mid = monthDays[i] + (i < 11 ? (monthDays[i+1] - monthDays[i]) / 2 : 15);
      ctx.fillText(months[i], xPos(mid), ch - pad.bottom + 6);
    }

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

    function transitionOffset(d: number) {
      const prevFb = fb - 365;
      if (d < sf) return ease((d - prevFb) / (sf - prevFb)) * 60;
      if (d < fb) return 60 - ease((d - sf) / (fb - sf)) * 60;
      return ease((d - fb) / (sf + 365 - fb)) * 60;
    }

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

    if (syncMethod === "solstices") {
      drawSmooth(transitionOffset, lineCurrent, false);
      drawSmooth(solsticeOffset, lineSolstice, true);
    } else {
      drawSmooth(solsticeOffset, lineSolstice, false);
      drawSmooth(transitionOffset, lineCurrent, true);
    }

    const yearStart = new Date(year, 0, 1).getTime();
    const activeFn = syncMethod === "solstices" ? solsticeOffset : transitionOffset;
    const activeColor = syncMethod === "solstices" ? lineSolstice : lineCurrent;
    const stops = getTourStops(syncMethod, year);
    const simDayOfYear = (simDate.getTime() - yearStart) / 86400000;

    for (const stop of stops) {
      const d = stop.date();
      const stopDay = (d.getTime() - yearStart) / 86400000;
      const val = activeFn(stopDay);
      const sx = xPos(stopDay);
      const sy = yPos(val);
      const isActive = Math.abs(stopDay - simDayOfYear) < 1 ||
        (stop.label === "Fall back" && Math.abs(stopDay - 1 - simDayOfYear) < 1);

      ctx.beginPath();
      ctx.arc(sx, sy, isActive ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? activeColor : (dark ? "#d6d3d1" : "#57534e");
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = dark ? "#1c1917" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const isFallBack = stop.label === "Fall back";
      const isWinter = stop.label === "Winter solstice";
      ctx.font = "bold 9px system-ui";
      const fg = dark ? "#d6d3d1" : "#57534e";
      const halo = dark ? "#1c1917" : "#fafaf9";
      const shortLabel = stop.label.replace("A month later", "Month later");

      function drawLabel(text: string, lx: number, ly: number) {
        ctx.strokeStyle = halo;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeText(text, lx, ly);
        ctx.fillStyle = fg;
        ctx.fillText(text, lx, ly);
      }

      if (isWinter) {
        const maxRight = cw - pad.right;
        const textWidth = ctx.measureText(shortLabel).width;
        const labelX = Math.min(sx, maxRight - textWidth / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        drawLabel(shortLabel, labelX, sy - 16);
      } else if (isFallBack) {
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        drawLabel(shortLabel, sx - 4, sy - 8);
      } else {
        const above = val > 20;
        ctx.textAlign = sx < pad.left + 40 ? "left" : "center";
        ctx.textBaseline = above ? "bottom" : "top";
        drawLabel(shortLabel, sx, sy + (above ? -8 : 8));
      }
    }

    const markerX = xPos(simDayOfYear);
    ctx.strokeStyle = dark ? "#fbbf24" : "#d97706";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(markerX, pad.top);
    ctx.lineTo(markerX, ch - pad.bottom);
    ctx.stroke();
    ctx.fillStyle = dark ? "#fbbf24" : "#d97706";
    ctx.beginPath();
    ctx.moveTo(markerX, pad.top - 2);
    ctx.lineTo(markerX - 4, pad.top - 8);
    ctx.lineTo(markerX + 4, pad.top - 8);
    ctx.closePath();
    ctx.fill();
  }, [syncMethod, simDate, year, springFwd, fallBackDay]);

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

  const jumpFromX = useCallback((clientX: number) => {
    if (!onJump || !containerRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const cw = containerRef.current.clientWidth;
    const padL = 40, padR = 12;
    const plotW = cw - padL - padR;
    const day = Math.max(0, Math.min(365, ((x - padL) / plotW) * 365));
    const yearStart = new Date(year, 0, 1).getTime();
    onJump(new Date(yearStart + day * 86400000));
  }, [onJump, year]);

  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onJump) return;

    const onMouseDown = (e: MouseEvent) => { dragging.current = true; jumpFromX(e.clientX); };
    const onMouseMove = (e: MouseEvent) => { if (dragging.current) jumpFromX(e.clientX); };
    const onMouseUp = () => { dragging.current = false; };
    const onTouchStart = (e: TouchEvent) => { dragging.current = true; jumpFromX(e.touches[0].clientX); };
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) { e.preventDefault(); jumpFromX(e.touches[0].clientX); } };
    const onTouchEnd = () => { dragging.current = false; };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [jumpFromX, onJump]);

  return (
    <div ref={containerRef} className="w-full max-w-lg mx-auto px-4">
      <canvas ref={canvasRef} className="w-full cursor-pointer" />
      <div className="flex justify-center gap-4 text-[10px] mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded bg-red-500 dark:bg-red-400" />
          <span className="text-zinc-500 dark:text-zinc-400">Official</span>
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
}, (prev, next) => {
  const prevDay = Math.floor(prev.simDate.getTime() / 86400000);
  const nextDay = Math.floor(next.simDate.getTime() / 86400000);
  return prev.syncMethod === next.syncMethod && prevDay === nextDay && prev.onJump === next.onJump;
});
