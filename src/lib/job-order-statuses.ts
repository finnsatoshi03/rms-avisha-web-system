// Labels are persisted in joborders.status; values are used by menu/search UI.
// Keep legacy Quotation records distinct from the active quotation work stages.
function status(label: string, className: string, agingDays?: number) {
  return { value: label.toLowerCase(), label, className, agingDays };
}

export const JOB_ORDER_STATUS_GROUPS = [
  {
    label: "Intake",
    items: [
      status("Pending", "status-pending", 2),
      status("For Quotation", "status-for-quotation", 3),
      status("For Approval", "status-for-approval", 3),
    ],
  },
  {
    label: "In Progress",
    items: [
      status("Quotation in Progress", "status-quotation-in-progress", 3),
      status("Repairing", "status-repairing", 5),
      status("Waiting Parts", "status-waiting-parts", 7),
      status("On hold", "status-on-hold", 14),
    ],
  },
  {
    label: "Ready & Billing",
    items: [
      status("Ready for Pickup", "status-ready-for-pickup", 5),
      status("For Pullout", "status-for-pullout", 5),
      status("For Collection", "status-for-collection", 5),
      status("For Billing", "status-for-billing", 7),
    ],
  },
  {
    label: "Closed",
    items: [
      status("Completed", "status-completed"),
      status("Pull Out", "status-pull-out"),
      status("Canceled", "status-canceled"),
    ],
  },
];

export const JOB_ORDER_STATUSES = JOB_ORDER_STATUS_GROUPS.flatMap(
  (group) => group.items,
);

// Legacy Quotation remains filterable/reportable but is not a workflow action.
export const ALL_JOB_ORDER_STATUSES = [
  status("Quotation", "status-quotation"),
  ...JOB_ORDER_STATUSES,
];

export const JOB_ORDER_STATUS_PRIORITY: Record<string, number> =
  Object.fromEntries(
    ALL_JOB_ORDER_STATUSES.map((item, index) => [item.value, index + 1]),
  );

export function jobOrderStatusClass(value: string): string | undefined {
  const normalized = value.toLowerCase();
  if (normalized === "ready to pickup") return "status-ready-for-pickup";
  return ALL_JOB_ORDER_STATUSES.find((item) => item.value === normalized)
    ?.className;
}
