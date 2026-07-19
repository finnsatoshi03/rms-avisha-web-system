import { formatDistanceToNow } from "date-fns";
import { History, X } from "lucide-react";
import { PrintJobRecord } from "./print-jobs-store";
import { SHEETS } from "./print-config";

interface RecentJobsProps {
  jobs: PrintJobRecord[];
  onRestore: (job: PrintJobRecord) => void;
  onDelete: (id: string) => void;
}

/** Auto-saved sheets from this device — one click reprints a botched cut. */
export default function RecentJobs({ jobs, onRestore, onDelete }: RecentJobsProps) {
  if (jobs.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <History size={14} className="text-muted-foreground" />
        Recent jobs
      </h2>
      <div className="space-y-1.5">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="group flex items-center gap-2.5 rounded-lg border bg-card p-2 transition-colors hover:border-gray-300 hover:bg-muted/40"
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-2.5 text-left"
              onClick={() => onRestore(job)}
              title="Restore this job"
            >
              {job.thumbnail ? (
                <img
                  src={job.thumbnail}
                  alt=""
                  className="h-11 w-auto rounded-[3px] border bg-white"
                />
              ) : (
                <div className="h-11 w-8 rounded-[3px] border bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{job.packageName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {SHEETS[job.sheetId]?.label ?? job.sheetId} ·{" "}
                  {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                </p>
              </div>
            </button>
            <button
              type="button"
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={() => onDelete(job.id)}
              aria-label="Delete saved job"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
