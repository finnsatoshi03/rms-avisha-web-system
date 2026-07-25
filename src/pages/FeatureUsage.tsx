import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronRight } from "lucide-react";

import HeaderText from "../components/ui/headerText";
import PageSkeleton from "../components/ui/page-skeleton";
import ErrorBoundary from "../components/error-boundery";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { getFeatureUsage, FeatureUsageEvent } from "../services/apiFeatureUsage";

type Range = { label: string; days: number | null };
const RANGES: Range[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "All", days: null },
];

function displayName(u: FeatureUsageEvent["user"]): string {
  return u?.fullname?.trim() || u?.email || "Unknown user";
}

const AVATAR_TINTS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];
function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

export default function FeatureUsage() {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const range = RANGES[rangeIdx];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["feature_usage", range.days],
    queryFn: () => getFeatureUsage({ sinceDays: range.days }),
    staleTime: 60 * 1000,
  });

  const events = useMemo(() => data ?? [], [data]);

  const features = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => map.set(e.feature, (map.get(e.feature) ?? 0) + 1));
    return Array.from(map, ([feature, count]) => ({ feature, count })).sort(
      (a, b) => b.count - a.count
    );
  }, [events]);

  const users = useMemo(() => {
    const map = new Map<
      string,
      { name: string; role: string; visits: number; last: string }
    >();
    events.forEach((e) => {
      const existing = map.get(e.user_id);
      if (existing) {
        existing.visits += 1;
        if (e.created_at > existing.last) existing.last = e.created_at;
      } else {
        map.set(e.user_id, {
          name: displayName(e.user),
          role: e.user?.role ?? "—",
          visits: 1,
          last: e.created_at,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [events]);

  // Drill-down for a single feature — computed from the events already loaded.
  const featureDetail = useMemo(() => {
    if (!selectedFeature) return null;
    const evs = events.filter((e) => e.feature === selectedFeature);
    const map = new Map<string, { name: string; count: number; last: string }>();
    evs.forEach((e) => {
      const ex = map.get(e.user_id);
      if (ex) {
        ex.count += 1;
        if (e.created_at > ex.last) ex.last = e.created_at;
      } else {
        map.set(e.user_id, {
          name: displayName(e.user),
          count: 1,
          last: e.created_at,
        });
      }
    });
    const byUser = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return { total: evs.length, byUser, recent: evs.slice(0, 30) };
  }, [selectedFeature, events]);

  const maxFeature = features[0]?.count ?? 0;
  const recent = events.slice(0, 12);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="h-full w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <HeaderText>Feature Usage</HeaderText>
          <p className="text-sm text-muted-foreground mt-1">
            Which pages the team opens, and how often. Dev activity isn’t tracked.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-0.5 shrink-0">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                i === rangeIdx
                  ? "bg-card text-brand-deep shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        {isError ? (
          <p className="text-sm text-red-600 py-6">
            Feature usage could not be loaded.
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            No activity recorded in this range yet.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1 mt-6 mb-7">
              <Stat value={events.length} label="visits" />
              <Stat value={users.length} label="active users" />
              <div className="text-sm text-muted-foreground">
                top{" "}
                <span className="font-semibold text-red-600">
                  {features[0]?.feature ?? "—"}
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-x-12 gap-y-9">
              {/* Most used — each row opens a detail sheet */}
              <section>
                <SectionLabel>Most used</SectionLabel>
                <div className="space-y-1">
                  {features.map((f, i) => (
                    <button
                      key={f.feature}
                      onClick={() => setSelectedFeature(f.feature)}
                      className="group w-full flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors"
                    >
                      <span className="w-36 shrink-0 text-left text-sm font-medium text-foreground truncate">
                        {f.feature}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? "bg-brand-deep" : "bg-brand-deep/45"
                          }`}
                          style={{
                            width: `${maxFeature ? (f.count / maxFeature) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
                        {f.count}
                      </span>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                      />
                    </button>
                  ))}
                </div>
              </section>

              {/* People */}
              <section>
                <SectionLabel>People</SectionLabel>
                <div className="divide-y divide-border/60">
                  {users.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <span
                        className={`h-8 w-8 shrink-0 rounded-full grid place-items-center text-xs font-bold ${tintFor(
                          u.name
                        )}`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {u.role} ·{" "}
                          {formatDistanceToNow(new Date(u.last), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                        {u.visits}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Recent — with a "see all" sheet */}
            <section className="mt-9">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel className="mb-0">Recent</SectionLabel>
                <button
                  onClick={() => setShowAllRecent(true)}
                  className="text-xs font-medium text-brand-deep hover:underline flex items-center gap-0.5"
                >
                  See all {events.length}
                  <ChevronRight size={13} />
                </button>
              </div>
              <ul className="space-y-1.5">
                {recent.map((e) => (
                  <ActivityRow key={e.id} event={e} />
                ))}
              </ul>
            </section>
          </>
        )}
      </ErrorBoundary>

      {/* Feature detail sheet */}
      <Sheet
        open={selectedFeature != null}
        onOpenChange={(o) => !o && setSelectedFeature(null)}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">{selectedFeature}</SheetTitle>
          </SheetHeader>
          {featureDetail && (
            <div className="mt-4">
              <div className="flex items-baseline gap-6 mb-6">
                <Stat value={featureDetail.total} label="visits" />
                <Stat value={featureDetail.byUser.length} label="users" />
              </div>

              <SectionLabel>Who opened it</SectionLabel>
              <div className="divide-y divide-border/60 mb-6">
                {featureDetail.byUser.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <span
                      className={`h-7 w-7 shrink-0 rounded-full grid place-items-center text-[11px] font-bold ${tintFor(
                        u.name
                      )}`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                      {u.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {u.count}
                    </span>
                  </div>
                ))}
              </div>

              <SectionLabel>Recent visits</SectionLabel>
              <ul className="space-y-1.5">
                {featureDetail.recent.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground truncate">
                      {displayName(e.user)}
                    </span>
                    <span
                      className="text-[11px] text-muted-foreground shrink-0 ml-2"
                      title={format(new Date(e.created_at), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(e.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* See-all recent sheet */}
      <Sheet open={showAllRecent} onOpenChange={setShowAllRecent}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">
              Recent activity · {events.length}
            </SheetTitle>
          </SheetHeader>
          <ul className="mt-4 space-y-1.5">
            {events.slice(0, 500).map((e) => (
              <ActivityRow key={e.id} event={e} />
            ))}
          </ul>
          {events.length > 500 && (
            <p className="text-[11px] text-muted-foreground mt-3">
              Showing the 500 most recent of {events.length}.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ActivityRow({ event }: { event: FeatureUsageEvent }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground truncate">
        <span className="font-semibold text-foreground">
          {displayName(event.user)}
        </span>{" "}
        opened{" "}
        <span className="font-medium text-red-600">{event.feature}</span>
      </span>
      <span
        className="text-[11px] text-muted-foreground shrink-0 ml-2 tabular-nums"
        title={format(new Date(event.created_at), "PPpp")}
      >
        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
      </span>
    </li>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 ${className}`}
    >
      {children}
    </h3>
  );
}
