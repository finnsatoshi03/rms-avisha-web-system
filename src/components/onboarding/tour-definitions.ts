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

  rental_assets: {
    featureKey: "rental_assets",
    steps: [
      {
        target: '[data-tour="rental-assets-search"]',
        title: "Search your printers",
        content:
          "Quickly find any printer by typing its name, model, or serial number. Results filter instantly as you type.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-assets-add"]',
        title: "Add a new printer",
        content:
          "Click here to register a new rental printer. You'll set the unit name, model, serial number, daily and monthly rates, and assign it to a branch.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-assets-table"]',
        title: "Your printer fleet",
        content:
          "All your rental printers are listed here. You can see each unit's name, model, serial number, status, branch, and billing rates at a glance.",
        placement: "top",
      },
      {
        target: '[data-tour="rental-assets-status"]',
        title: "Track printer status",
        content:
          "Each printer shows its current status — Available, Rented, Maintenance, or Retired. Hover over a rented printer to see which client has it.",
        placement: "left",
      },
      {
        target: '[data-tour="rental-assets-rates"]',
        title: "Daily & monthly rates",
        content:
          "These columns show the billing rates for each printer. When creating a rental, the rate is automatically pulled based on the rental type you choose.",
        placement: "left",
      },
    ],
  },

  rental_management: {
    featureKey: "rental_management",
    steps: [
      {
        target: '[data-tour="rentals-search"]',
        title: "Find any rental",
        content:
          "Search by rental number, client name, status, or technician. Results update as you type so you can find what you need fast.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-add"]',
        title: "Create a new rental",
        content:
          "Click here to start a new rental. You'll fill in the client details, pick a printer, set the rental period, and add any consumables — all in one form.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-add-printer"]',
        title: "Quick-add a printer",
        content:
          "Need to add a new printer first? This shortcut takes you straight to the Rental Printers page to register one.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-overdue-filter"]',
        title: "Spot overdue rentals",
        content:
          "Click here to filter and show only overdue rentals. Overdue rows are also highlighted in red in the table so they're easy to spot.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-status-filters"]',
        title: "Filter by status",
        content:
          "Click any status badge to filter rentals — Created, Released, Ongoing, Returned, Completed, or Cancelled. You can combine multiple filters too.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rentals-table"]',
        title: "Your rental records",
        content:
          "All rentals are listed here with key details — rental number, client, printer, status, dates, technician, and total amount. Click any row to view full details, manage consumables, record inspections, and more.",
        placement: "top",
      },
    ],
  },
  rental_create: {
    featureKey: "rental_create",
    steps: [
      {
        target: '[data-tour="rental-create-client"]',
        title: "Start with the client",
        content:
          "Search for an existing client by name or phone number, or create a new one right here. Their contact info fills in automatically.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-basic-info"]',
        title: "Contact & technician",
        content:
          "Review the client's contact number and email, and assign a technician who will handle this rental.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-details"]',
        title: "Set up the rental",
        content:
          "Pick a printer, choose daily or monthly billing, and set the start date. The rate and due date calculate automatically based on your selections.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-consumables"]',
        title: "Add consumables",
        content:
          "Need to include ink, toner, or other supplies? Add them here — pick from inventory (stock is auto-deducted) or enter items manually.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-create-summary"]',
        title: "Review & submit",
        content:
          "Check the billing summary — rate, consumables, discount, and downpayment all roll up into the grand total. Hit Create Rental when you're ready!",
        placement: "left",
      },
    ],
  },

  rental_asset_create: {
    featureKey: "rental_asset_create",
    steps: [
      {
        target: '[data-tour="rental-asset-create-info"]',
        title: "Identify the printer",
        content:
          "Enter the printer's name (e.g., \"Epson L3210\"), model number, and serial number so your team can easily find and track it.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-asset-create-rates"]',
        title: "Set the rental rates",
        content:
          "Enter the daily and monthly rates. When someone creates a rental, the correct rate fills in automatically based on the billing type they choose.",
        placement: "bottom",
      },
      {
        target: '[data-tour="rental-asset-create-submit"]',
        title: "Save the printer",
        content:
          "Add any notes if needed, then click the button to register this printer. It'll show up as Available and ready to rent out!",
        placement: "top",
      },
    ],
  },
};

export function getTourDefinition(featureKey: string): TourDefinition | null {
  return tours[featureKey] || null;
}
