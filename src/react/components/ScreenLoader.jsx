const ScreenLoader = () => (
  <div role="status" aria-label="Loading workspace" className="flex min-h-[60vh] grow flex-col items-center justify-center gap-4">
    <div className="loading-orbit"><span /></div>
    <p className="text-sm text-mist-muted">Loading…</p>
  </div>
);

export { ScreenLoader };

export function PageSkeleton() {
  return (
    <div className="page-skeleton space-y-7" role="status" aria-label="Loading page">
      <span className="sr-only">Loading page…</span>
      <div className="space-y-3" aria-hidden="true">
        <div className="skeleton-bar h-8 w-48" />
        <div className="skeleton-bar h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => <div key={i} className="card space-y-5 p-6"><div className="skeleton-bar h-3 w-20" /><div className="skeleton-bar h-8 w-28" /></div>)}
      </div>
      <div className="card space-y-6 p-6" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-bar h-4" style={{ width: `${90 - i * 12}%` }} />)}
      </div>
    </div>
  );
}
