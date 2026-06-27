/**
 * Skeleton.jsx — shimmer placeholders shown while route chunks (React.lazy)
 * download and while page data loads. The page-level skeletons mirror each
 * page's real layout so swapping in the content doesn't shift things around.
 */

/** Base shimmer block. Size it with Tailwind classes via `className`. */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

/** Title + optional subtitle placeholder. */
export function HeadingSkeleton({ subtitle = true }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      {subtitle && <Skeleton className="h-4 w-72 max-w-full" />}
    </div>
  );
}

// Literal class strings so Tailwind's JIT keeps both grid widths.
const KPI_GRID = {
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-5',
};

/** Row of KPI cards. */
export function SkeletonKpis({ count = 4 }) {
  return (
    <div className={KPI_GRID[count] || KPI_GRID[4]}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A card-wrapped table with header + body rows. */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grid of generic content cards. */
export function SkeletonCards({ count = 2, lines = 3, cols = 2 }) {
  const grid = cols === 2 ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : 'grid grid-cols-1 gap-4';
  return (
    <div className={grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: lines }).map((_, l) => (
            <Skeleton key={l} className="h-3 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---- Page-level skeletons (used as Suspense fallbacks & data-loading states) ---- */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />
      <SkeletonKpis count={4} />
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}

/** Heading + action button + table. For AdminUsers / project lists. */
export function ListPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <HeadingSkeleton />
        <Skeleton className="h-9 w-28" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}

export function ProjectViewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}

/** Back link + heading with badges + two content cards. For detail pages. */
export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonCards count={2} lines={4} cols={1} />
    </div>
  );
}

export function IntegrationsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <HeadingSkeleton />
        <Skeleton className="h-9 w-24" />
      </div>
      <SkeletonCards count={2} lines={4} cols={2} />
      <SkeletonCards count={1} lines={2} cols={1} />
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="space-y-5">
      <HeadingSkeleton />
      <SkeletonCards count={2} lines={4} cols={2} />
    </div>
  );
}

/** KPIs + two summary cards + chart card. For the report dashboard. */
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonKpis count={5} />
      <SkeletonCards count={2} lines={4} cols={2} />
      <div className="card space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
