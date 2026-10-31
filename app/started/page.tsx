export default function StartedPage() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <article className="max-w-2xl mx-auto px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          How this app started
        </h1>

        <div className="mt-8 space-y-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            This app was built entirely by Claude Code from a single prompt:
          </p>

          <blockquote className="pl-4 border-l-2 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 italic">
            I want an app that shows 2 clocks. The first is a normal clock
            showing standard time or daylight saving time. The second is a
            hypothetical clock that follows the daylight saving pattern without
            making the sudden 1-hour jumps. Instead, it makes microchanges every
            day (or hour or second) to satisfy 2 conditions: it tracks the
            normal time shifts, and there is no sudden jump in time. The changes
            are smoothed out over the entire period. There is a calendar to
            switch to a different day or month so you can watch how the times
            differ. Maybe a play button to sit back and watch.
          </blockquote>

          <p>
            From there it evolved through conversation &mdash; adding the offset
            chart, tour stops, sync methods, the about page, and the Smooth Time
            clock &mdash; all built iteratively with Claude Code.
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
