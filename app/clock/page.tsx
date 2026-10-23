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
    return ease((t - start) / (end - start)) * 3600000;
  } else if (t < fallBack.getTime()) {
    const start = springForward.getTime();
    const end = fallBack.getTime();
    return -ease((t - start) / (end - start)) * 3600000;
  } else {
    const start = fallBack.getTime();
    const end = nextSpringForward.getTime();
    return ease((t - start) / (end - start)) * 3600000;
  }
}

// --- Display styles ---

type DisplayStyle = "digital" | "analog" | "minimal" | "flip";

const DISPLAY_STYLES: { id: DisplayStyle; label: string; desc: string }[] = [
  { id: "digital", label: "Digital", desc: "Large digital readout with analog clock" },
  { id: "analog", label: "Analog", desc: "Large analog clock, small digital below" },
  { id: "minimal", label: "Minimal", desc: "Time only, nothing else" },
  { id: "flip", label: "Flip", desc: "Retro flip-clock style digits" },
];

// --- Alarm sounds ---

type AlarmSound = "chime" | "pulse" | "rising" | "birds" | "radar";

const ALARM_SOUNDS: { id: AlarmSound; label: string; desc: string }[] = [
  { id: "chime", label: "Chime", desc: "Gentle repeating chime" },
  { id: "pulse", label: "Pulse", desc: "Soft pulsing tone" },
  { id: "rising", label: "Rising", desc: "Gradually rising pitch" },
  { id: "birds", label: "Birds", desc: "Chirping birdsong pattern" },
  { id: "radar", label: "Radar", desc: "Classic alarm beep" },
];

function playAlarm(ctx: AudioContext, sound: AlarmSound) {
  const t = ctx.currentTime;

  if (sound === "chime") {
    const freqs = [523, 659, 784, 659];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = f;
      osc.type = "sine";
      const start = t + i * 0.3;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } else if (sound === "pulse") {
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = "sine";
      const start = t + i * 0.5;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.1);
      gain.gain.linearRampToValueAtTime(0, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.4);
    }
  } else if (sound === "rising") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 1.5);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.start(t);
    osc.stop(t + 1.5);
  } else if (sound === "birds") {
    const chirps = [
      { f: 2200, start: 0, dur: 0.08 },
      { f: 2600, start: 0.1, dur: 0.06 },
      { f: 2400, start: 0.25, dur: 0.07 },
      { f: 2800, start: 0.35, dur: 0.05 },
      { f: 2100, start: 0.55, dur: 0.09 },
      { f: 2500, start: 0.65, dur: 0.06 },
      { f: 2700, start: 0.8, dur: 0.07 },
      { f: 2300, start: 0.95, dur: 0.08 },
    ];
    for (const c of chirps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(c.f, t + c.start);
      osc.frequency.exponentialRampToValueAtTime(c.f * 0.8, t + c.start + c.dur);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, t + c.start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + c.start + c.dur);
      osc.start(t + c.start);
      osc.stop(t + c.start + c.dur);
    }
  } else {
    // radar
    const pattern = [0, 0.15, 0.3, 0.45, 0.8, 0.95, 1.1, 1.25];
    for (const offset of pattern) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "square";
      gain.gain.setValueAtTime(0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);
      osc.start(t + offset);
      osc.stop(t + offset + 0.1);
    }
  }
}

// --- Time formatting ---

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
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// --- Clock displays ---

function AnalogClock({
  hours,
  minutes,
  seconds,
  ms,
  size,
}: {
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  size: string;
}) {
  const secondAngle = ((seconds + ms / 1000) / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = (((hours % 12) + minutes / 60) / 12) * 360;

  return (
    <svg viewBox="0 0 200 200" className={size}>
      <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={100 + 82 * Math.sin(angle)}
            y1={100 - 82 * Math.cos(angle)}
            x2={100 + 90 * Math.sin(angle)}
            y2={100 - 90 * Math.cos(angle)}
            stroke="white"
            strokeWidth={i % 3 === 0 ? 3 : 1.5}
            opacity="0.4"
          />
        );
      })}
      <line
        x1="100" y1="100"
        x2={100 + 50 * Math.sin((hourAngle * Math.PI) / 180)}
        y2={100 - 50 * Math.cos((hourAngle * Math.PI) / 180)}
        stroke="white" strokeWidth="4" strokeLinecap="round"
      />
      <line
        x1="100" y1="100"
        x2={100 + 70 * Math.sin((minuteAngle * Math.PI) / 180)}
        y2={100 - 70 * Math.cos((minuteAngle * Math.PI) / 180)}
        stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8"
      />
      <line
        x1="100" y1="100"
        x2={100 + 75 * Math.sin((secondAngle * Math.PI) / 180)}
        y2={100 - 75 * Math.cos((secondAngle * Math.PI) / 180)}
        stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="4" fill="white" />
    </svg>
  );
}

function FlipDigit({ value }: { value: string }) {
  return (
    <div className="inline-flex flex-col bg-zinc-800 rounded-lg overflow-hidden mx-0.5 sm:mx-1">
      <div className="px-3 sm:px-5 py-2 sm:py-4 text-4xl sm:text-7xl font-mono font-bold tabular-nums border-b border-zinc-900/50 text-white">
        {value}
      </div>
    </div>
  );
}

function FlipClock({ time }: { time: Date }) {
  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const hStr = String(h12).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  const sStr = String(s).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <FlipDigit value={hStr[0]} />
      <FlipDigit value={hStr[1]} />
      <span className="text-4xl sm:text-7xl font-mono font-bold text-zinc-600 mx-0.5">:</span>
      <FlipDigit value={mStr[0]} />
      <FlipDigit value={mStr[1]} />
      <span className="text-4xl sm:text-7xl font-mono font-bold text-zinc-600 mx-0.5">:</span>
      <FlipDigit value={sStr[0]} />
      <FlipDigit value={sStr[1]} />
      <span className="text-lg sm:text-2xl font-mono text-zinc-500 ml-2 self-end mb-1 sm:mb-2">{ampm}</span>
    </div>
  );
}

// --- Settings persistence ---

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// --- Main component ---

export default function SmoothClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [alarmTime, setAlarmTime] = useState("");
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmFiring, setAlarmFiring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>("digital");
  const [alarmSound, setAlarmSound] = useState<AlarmSound>("chime");
  const [bedsideMode, setBedsideMode] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedForMinuteRef = useRef("");
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setDisplayStyle(loadSetting("smoothclock-display", "digital"));
    setAlarmSound(loadSetting("smoothclock-sound", "chime"));
    setAlarmTime(loadSetting("smoothclock-alarm-time", ""));
    setAlarmEnabled(loadSetting("smoothclock-alarm-on", false));
    setBedsideMode(loadSetting("smoothclock-bedside", false));
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!bedsideMode) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      return;
    }
    let cancelled = false;
    async function requestLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {}
    }
    requestLock();
    const reacquire = () => {
      if (!cancelled && bedsideMode && document.visibilityState === 'visible') {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', reacquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', reacquire);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [bedsideMode]);

  useEffect(() => {
    if (!alarmFiring) {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      return;
    }
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    playAlarm(ctx, alarmSound);
    alarmIntervalRef.current = setInterval(() => playAlarm(ctx, alarmSound), 2000);
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [alarmFiring, alarmSound]);

  const checkAlarm = useCallback(
    (smoothTime: Date) => {
      if (!alarmEnabled || alarmFiring || !alarmTime) return;
      const [h, m] = alarmTime.split(":").map(Number);
      const smoothH = smoothTime.getHours();
      const smoothM = smoothTime.getMinutes();
      const minuteKey = `${smoothH}:${smoothM}`;
      if (smoothH === h && smoothM === m && firedForMinuteRef.current !== minuteKey) {
        firedForMinuteRef.current = minuteKey;
        setAlarmFiring(true);
      }
    },
    [alarmEnabled, alarmFiring, alarmTime]
  );

  const dismissAlarm = useCallback(() => setAlarmFiring(false), []);

  const snoozeAlarm = useCallback(() => {
    setAlarmFiring(false);
    firedForMinuteRef.current = "";
    setAlarmTime((prev) => {
      if (!prev) return prev;
      const [h, m] = prev.split(":").map(Number);
      const total = h * 60 + m + 9;
      const newH = Math.floor(total / 60) % 24;
      const newM = total % 60;
      const v = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
      saveSetting("smoothclock-alarm-time", v);
      return v;
    });
  }, []);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  }, []);

  const previewSound = useCallback(
    (sound: AlarmSound) => {
      initAudio();
      playAlarm(audioCtxRef.current!, sound);
    },
    [initAudio]
  );

  if (!now) return null;

  const offsetMs = getGradualOffsetMs(now);
  const smoothTime = new Date(now.getTime() + offsetMs);
  checkAlarm(smoothTime);

  const offsetSec = Math.round(offsetMs / 1000);
  const offsetSign = offsetSec >= 0 ? "+" : "";
  const absOffsetSec = Math.abs(offsetSec);
  const offsetMin = Math.floor(absOffsetSec / 60);
  const offsetRemSec = absOffsetSec % 60;
  const offsetLabel =
    offsetMin > 0
      ? `${offsetSign}${offsetSec < 0 ? "-" : ""}${offsetMin}m ${offsetRemSec}s`
      : `${offsetSign}${offsetSec}s`;

  const h = smoothTime.getHours();
  const m = smoothTime.getMinutes();
  const s = smoothTime.getSeconds();
  const ms = smoothTime.getMilliseconds();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh bg-black text-white select-none cursor-pointer"
      onClick={() => {
        initAudio();
        if (!alarmFiring) setShowSettings((v) => !v);
      }}
    >
      {/* Alarm firing overlay */}
      {alarmFiring && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
          <div className="text-6xl sm:text-8xl font-mono font-bold tabular-nums mb-4 animate-pulse">
            {formatTime(smoothTime)}
          </div>
          <div className="text-2xl text-zinc-400 mb-12">Alarm</div>
          <div className="flex gap-6">
            <button
              onClick={(e) => { e.stopPropagation(); snoozeAlarm(); }}
              className="px-8 py-4 rounded-2xl bg-zinc-800 text-xl font-medium hover:bg-zinc-700 transition-colors"
            >
              Snooze 9m
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); dismissAlarm(); }}
              className="px-8 py-4 rounded-2xl bg-white text-black text-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="text-sm uppercase tracking-widest text-zinc-700 mb-1">Smooth Clock</div>

      {/* Clock display */}
      {displayStyle === "digital" && (
        <>
          <div className="text-lg sm:text-xl text-zinc-500 mb-2">{formatDate(smoothTime)}</div>
          <AnalogClock hours={h} minutes={m} seconds={s} ms={ms} size="w-48 h-48 sm:w-64 sm:h-64" />
          <div className="text-5xl sm:text-7xl font-mono font-bold tabular-nums mt-4">
            {formatTime(smoothTime)}
          </div>
          <div className="text-sm text-zinc-600 mt-2 font-mono">{offsetLabel} from normal</div>
        </>
      )}

      {displayStyle === "analog" && (
        <>
          <div className="text-lg sm:text-xl text-zinc-500 mb-4">{formatDate(smoothTime)}</div>
          <AnalogClock hours={h} minutes={m} seconds={s} ms={ms} size="w-64 h-64 sm:w-80 sm:h-80" />
          <div className="text-2xl sm:text-3xl font-mono font-bold tabular-nums mt-6">
            {formatTime(smoothTime)}
          </div>
          <div className="text-sm text-zinc-600 mt-2 font-mono">{offsetLabel} from normal</div>
        </>
      )}

      {displayStyle === "minimal" && (
        <>
          <div className="text-7xl sm:text-9xl font-mono font-bold tabular-nums">
            {formatTime(smoothTime)}
          </div>
          <div className="text-lg text-zinc-700 mt-3 font-mono">{formatDate(smoothTime)}</div>
        </>
      )}

      {displayStyle === "flip" && (
        <>
          <div className="text-lg sm:text-xl text-zinc-500 mb-6">{formatDate(smoothTime)}</div>
          <FlipClock time={smoothTime} />
          <div className="text-sm text-zinc-600 mt-6 font-mono">{offsetLabel} from normal</div>
        </>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mt-8 bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Alarm */}
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-3">Alarm</div>
            <div className="flex items-center gap-4">
              <input
                type="time"
                value={alarmTime}
                onChange={(e) => {
                  setAlarmTime(e.target.value);
                  saveSetting("smoothclock-alarm-time", e.target.value);
                  firedForMinuteRef.current = "";
                }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg font-mono text-white"
              />
              <button
                onClick={() => {
                  initAudio();
                  const next = !alarmEnabled;
                  setAlarmEnabled(next);
                  saveSetting("smoothclock-alarm-on", next);
                  firedForMinuteRef.current = "";
                }}
                className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  alarmEnabled
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {alarmEnabled ? "On" : "Off"}
              </button>
            </div>
            {alarmEnabled && alarmTime && (
              <div className="text-xs text-zinc-500 mt-2">Alarm set for {alarmTime} smooth time</div>
            )}
          </div>

          {/* Alarm sound */}
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-3">Alarm Sound</div>
            <div className="grid grid-cols-1 gap-2">
              {ALARM_SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setAlarmSound(s.id);
                    saveSetting("smoothclock-sound", s.id);
                    previewSound(s.id);
                  }}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                    alarmSound === s.id
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className={`text-xs ${alarmSound === s.id ? "text-zinc-500" : "text-zinc-500"}`}>
                      {s.desc}
                    </div>
                  </div>
                  {alarmSound === s.id && (
                    <span className="text-xs font-medium ml-3">&#10003;</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Display style */}
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-3">Display Style</div>
            <div className="grid grid-cols-2 gap-2">
              {DISPLAY_STYLES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDisplayStyle(d.id);
                    saveSetting("smoothclock-display", d.id);
                  }}
                  className={`rounded-lg px-4 py-3 text-left transition-colors ${
                    displayStyle === d.id
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className={`text-xs ${displayStyle === d.id ? "text-zinc-500" : "text-zinc-500"}`}>
                    {d.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bedside mode */}
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-3">Bedside Mode</div>
            <button
              onClick={() => {
                const next = !bedsideMode;
                setBedsideMode(next);
                saveSetting("smoothclock-bedside", next);
              }}
              className={`w-full flex items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                bedsideMode
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <div>
                <div className="text-sm font-medium">Keep screen on</div>
                <div className="text-xs text-zinc-500">
                  Prevents sleep so the alarm fires reliably
                </div>
              </div>
              <span className="text-sm font-medium">{bedsideMode ? "On" : "Off"}</span>
            </button>
          </div>

          {/* About */}
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-3">What is Smooth Clock?</div>
            <div className="text-sm text-zinc-400 leading-relaxed space-y-2">
              <p>
                This clock doesn&apos;t jump an hour twice a year. Instead, it shifts
                by a few seconds each day, spreading the daylight saving transition
                over months.
              </p>
              <p>
                Set your alarm to smooth time and you&apos;ll never lose an hour of
                sleep overnight. By the time the official clocks spring forward,
                you&apos;ve already adjusted — gradually, without noticing.
              </p>
              <p>
                Right now this clock is <span className="text-zinc-200 font-mono">{offsetLabel}</span> from
                normal time. The drift rate varies through the year — near zero
                close to DST transitions, peaking at about 24 seconds per day
                at the midpoints.
              </p>
            </div>
            <a href="/" className="inline-block mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              See the interactive explainer →
            </a>
          </div>
        </div>
      )}

      {/* Alarm indicator */}
      {!showSettings && alarmEnabled && alarmTime && (
        <div className="mt-6 text-sm text-zinc-600 font-mono">&#9200; {alarmTime}</div>
      )}

      {/* Hint */}
      {!showSettings && !alarmFiring && (
        <div className="fixed bottom-6 text-xs text-zinc-800">tap anywhere for settings</div>
      )}
    </div>
  );
}
