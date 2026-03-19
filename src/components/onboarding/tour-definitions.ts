export type TourStep = {
  target: string; // CSS selector (data-tour attribute)
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  clickBefore?: string; // CSS selector to click before showing this step
  typeInto?: { selector: string; value: string }; // simulate typing into an input
  waitMs?: number; // ms to wait after actions for DOM to update
};

export type TourDefinition = {
  featureKey: string;
  steps: TourStep[];
};

const tours: Record<string, TourDefinition> = {
  client_auto_suggest: {
    featureKey: "client_auto_suggest",
    steps: [
      {
        target: '[data-tour="client-search-field"]',
        title: "Find your client here",
        content:
          "Just click this field and start typing your client's name or phone number. We'll look them up for you automatically — no need to remember the exact spelling!",
        placement: "bottom",
      },
      {
        target: '[data-tour="client-search-dropdown"]',
        title: "Pick the right client",
        content:
          "Your matches will show up here. If the name isn't spelled exactly right, don't worry — we'll still suggest close matches under \"Did you mean?\" so you can pick the right one.",
        placement: "bottom",
        clickBefore: '[data-tour="client-search-field"]',
        typeInto: { selector: '[cmdk-input]', value: "san" },
        waitMs: 800,
      },
      {
        target: '[data-tour="client-create-button"]',
        title: "New client? Add them here",
        content:
          "If the client is brand new and not in the system yet, just click this button to add them right away — no need to go to a separate page.",
        placement: "top",
        clickBefore: '[data-tour="client-search-field"]',
        waitMs: 400,
      },
    ],
  },
};

export function getTourDefinition(featureKey: string): TourDefinition | null {
  return tours[featureKey] || null;
}
