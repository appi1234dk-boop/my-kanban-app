export default function BoardLoading() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-3">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-2">
            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
          </div>
        ))}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header skeleton */}
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-40 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
              ))}
              <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg ml-2" />
            </div>
          </div>
        </header>

        {/* Board skeleton */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          <div className="flex gap-4 h-full">
            {[
              { cards: 3 },
              { cards: 2 },
              { cards: 4 },
              { cards: 1 },
            ].map((col, colIdx) => (
              <div
                key={colIdx}
                className="w-72 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col p-3 gap-3"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>

                {/* Cards */}
                {Array.from({ length: col.cards }).map((_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5"
                  >
                    {/* Tag placeholder (some cards) */}
                    {cardIdx % 2 === 0 && (
                      <div className="flex gap-1">
                        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                    )}
                    {/* Title */}
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                    {cardIdx % 3 !== 0 && (
                      <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                    )}
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex gap-1">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="h-3 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
