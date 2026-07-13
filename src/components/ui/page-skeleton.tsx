import { Skeleton } from "./skeleton";

/**
 * Route-level loading fallback that mirrors the shape of a typical page
 * (header, toolbar, data table) so chunk loads don't flash a spinner.
 */
export default function PageSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 py-4">
      {/* Page header: title + action buttons */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Table: header row + body rows */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-4 border-b pb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

/** Dashboard-shaped fallback: tabs, stat cards, charts, recent-sales list. */
export function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 py-4">
      {/* Header: title + date range picker/export */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* Tabs (pill group) */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Row 1: hero metric + compact stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-6 rounded-2xl border bg-muted/60 p-6 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-2xl border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        ))}
      </div>

      {/* Row 2: wide bar chart + billing card */}
      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-8 w-40" />
          <div className="flex h-48 items-end gap-3">
            {[60, 80, 45, 90, 70, 55, 85, 65, 75, 50, 88, 62].map((h, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-44" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sidebar-shaped fallback shown while the current user is resolving. */
export function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      {Array.from({ length: 3 }).map((_, group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 }).map((_, item) => (
            <div key={item} className="flex items-center gap-2 px-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-screen variant for public routes (login, password reset). */
export function AuthPageSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="mx-auto h-10 w-10 rounded-full" />
          <Skeleton className="mx-auto h-6 w-40" />
          <Skeleton className="mx-auto h-4 w-56" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
