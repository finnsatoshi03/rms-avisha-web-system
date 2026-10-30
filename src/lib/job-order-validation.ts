export function jobOrderTransitionError(order: {
  status?: string | null;
  labor_description?: string | null;
  technical_report?: string | null;
}, nextStatus: string): string | null {
  const next = nextStatus.trim().toLowerCase();
  if (order.status?.trim().toLowerCase() === next) return null;
  if (next === "repairing" && !order.labor_description?.trim()) {
    return "Fill in the labor description before changing the status to Repairing.";
  }
  if (["ready for pickup", "ready to pickup"].includes(next) && !order.technical_report?.trim()) {
    return "Fill in the technical report before changing the status to Ready for Pickup.";
  }
  return null;
}
