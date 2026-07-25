import { useMemo } from "react";
import { formatDistanceStrict, formatDistanceToNow } from "date-fns";
import { History, Info, Loader2 } from "lucide-react";

import { useJobOrderEvents } from "../../hooks/useJobOrderEvents";
import { getStatusClass, formatReadableDate } from "../../lib/helpers";
import { JobOrderEvent } from "../../lib/types";
import { getServerNow } from "../../lib/server-time";

function actorLabel(event: JobOrderEvent): string {
  // Backfilled rows predate the history feature — we don't know who set the
  // status, so attributing them to a person would be a lie.
  if (event.note === "backfilled") return "System (backfilled)";
  const actor = event.actor;
  if (!actor) return "Unknown user";
  return actor.fullname?.trim() || actor.email || "Unknown user";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function humanizeDuration(startISO: string, end: Date): string {
  const start = new Date(startISO);
  const ms = end.getTime() - start.getTime();
  if (ms < 60 * 1000) return "under a minute";
  return formatDistanceStrict(end, start);
}

export default function JobOrderTimeline({
  jobOrderId,
}: {
  jobOrderId: number;
}) {
  const { data: events, isLoading, isError } = useJobOrderEvents(jobOrderId);

  // Events arrive oldest-first. Compute how long each status lasted (until the
  // next transition, or until now for the current one), then reverse so the
  // most recent change is at the top.
  const rows = useMemo(() => {
    if (!events) return [];
    const now = getServerNow();
    return events
      .map((event, i) => {
        const isCurrent = i === events.length - 1;
        const end = isCurrent ? now : new Date(events[i + 1].changed_at);
        return { event, end, isCurrent };
      })
      .reverse();
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading status history…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 py-4">
        Status history could not be loaded.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No status history recorded yet.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-gray-500" />
        <h4 className="font-semibold text-sm">Status History</h4>
      </div>

      <ol className="relative border-l border-gray-200 ml-2">
        {rows.map(({ event, end, isCurrent }) => {
          const isBackfilled = event.note === "backfilled";
          return (
            <li key={event.id} className="ml-4 pb-5 last:pb-0">
              <span
                className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-white ${
                  isCurrent ? "bg-brand-deep" : "bg-gray-300"
                }`}
              />

              <div className="flex flex-wrap items-center gap-2">
                {event.from_status && (
                  <>
                    <StatusPill status={event.from_status} />
                    <span className="text-gray-400 text-xs">→</span>
                  </>
                )}
                <StatusPill status={event.to_status} />
                {isCurrent && (
                  <span className="text-[11px] font-medium text-brand-deep">
                    current
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                <p>
                  {isBackfilled ? (
                    <>
                      In this status since at most{" "}
                      <span className="text-gray-700">
                        {formatReadableDate(event.changed_at)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-700">
                        {actorLabel(event)}
                      </span>{" "}
                      · {formatReadableDate(event.changed_at)} (
                      {formatDistanceToNow(new Date(event.changed_at), {
                        addSuffix: true,
                      })}
                      )
                    </>
                  )}
                </p>
                <p>
                  {isCurrent ? "In this status for " : "Lasted "}
                  <span className="text-gray-700">
                    {humanizeDuration(event.changed_at, end)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {rows.some((r) => r.event.note === "backfilled") && (
        <p className="flex items-start gap-1.5 mt-2 text-[11px] text-gray-400">
          <Info size={12} className="mt-0.5 shrink-0" />
          Entries marked “backfilled” predate status tracking; their timestamp is
          an estimate, not the exact moment the status changed.
        </p>
      )}
    </div>
  );
}
