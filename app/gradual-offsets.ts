export interface DailyOffset {
  day: number;
  date: string;
  offsetSeconds: number;
  dailyChangeSeconds: number;
}

function ease(p: number): number {
  return (1 - Math.cos(Math.PI * p)) / 2;
}

export function generateOffsets(year: number): DailyOffset[] {
  const summer = new Date(year, 5, 21, 12, 0, 0).getTime();
  const winter = new Date(year, 11, 21, 12, 0, 0).getTime();
  const prevWinter = new Date(year - 1, 11, 21, 12, 0, 0).getTime();
  const nextSummer = new Date(year + 1, 5, 21, 12, 0, 0).getTime();

  const isLeap = new Date(year, 1, 29).getDate() === 29;
  const daysInYear = isLeap ? 366 : 365;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  function offsetAtNoon(dayOffset: number): number {
    const t = new Date(year, 0, 1 + dayOffset, 12, 0, 0).getTime();
    let fraction: number;
    if (t < summer) {
      fraction = ease((t - prevWinter) / (summer - prevWinter));
    } else if (t < winter) {
      fraction = 1 - ease((t - summer) / (winter - summer));
    } else {
      fraction = ease((t - winter) / (nextSummer - winter));
    }
    return Math.round(fraction * 3600);
  }

  const results: DailyOffset[] = [];
  const prevDayOffset = offsetAtNoon(-1);

  for (let d = 0; d < daysInYear; d++) {
    const date = new Date(year, 0, 1 + d);
    const offset = offsetAtNoon(d);
    const prev = d === 0 ? prevDayOffset : results[d - 1].offsetSeconds;

    results.push({
      day: d + 1,
      date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
      offsetSeconds: offset,
      dailyChangeSeconds: offset - prev,
    });
  }

  return results;
}
