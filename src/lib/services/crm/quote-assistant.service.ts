export interface AuthoritativePriceItem {
  id: string;
  name: string;
  category: "PAGES" | "COMPONENTS" | "INTEGRATIONS" | "INFRASTRUCTURE";
  unitPriceMinor: number; // in cents/centavos (e.g. 2000000 = ₱20,000.00)
  description: string;
}

export const AUTHORITATIVE_CATALOG: AuthoritativePriceItem[] = [
  { id: "ITEM-HOME", name: "Modern Homepage & Hero Section", category: "PAGES", unitPriceMinor: 2000000, description: "High-performance responsive landing page with company overview and value props." },
  { id: "ITEM-CATALOG", name: "Product Catalog Grid", category: "COMPONENTS", unitPriceMinor: 3000000, description: "Filterable product directory for hardware supplies and construction materials." },
  { id: "ITEM-CALCULATOR", name: "Interactive Quote Calculator", category: "COMPONENTS", unitPriceMinor: 2500000, description: "Dynamic materials estimator with real-time budget calculation." },
  { id: "ITEM-CONTACT", name: "Contact & Direct Inquiries Form", category: "COMPONENTS", unitPriceMinor: 1000000, description: "Lead capture form with validation and direct email routing." },
  { id: "ITEM-DOMAIN-SSL", name: "Custom Domain & Cloudflare SSL Setup", category: "INFRASTRUCTURE", unitPriceMinor: 300000, description: "Production edge DNS and SSL certificate provisioning." },
];

export interface QuoteDraft {
  quoteId: string;
  organizationId: string;
  opportunityId: string;
  currency: string;
  lineItems: {
    itemId: string;
    name: string;
    unitPriceMinor: number;
    quantity: number;
    totalMinor: number;
    provenance: "AUTHORITATIVE_CATALOG" | "OPERATOR_OVERRIDE";
  }[];
  subtotalMinor: number;
  paymentMilestones: {
    milestoneName: string;
    percent: number;
    amountMinor: number;
  }[];
  isAuthoritative: true;
  generatedAt: string;
}

export class QuoteAssistantService {
  buildQuoteFromRequirements(params: {
    organizationId: string;
    opportunityId: string;
    selectedItemIds: string[];
    operatorOverrides?: { itemId: string; name: string; unitPriceMinor: number }[];
  }): QuoteDraft {
    const lineItems: QuoteDraft["lineItems"] = [];
    let subtotalMinor = 0;

    for (const id of params.selectedItemIds) {
      const catalogItem = AUTHORITATIVE_CATALOG.find((c) => c.id === id);
      const override = params.operatorOverrides?.find((o) => o.itemId === id);

      if (override) {
        if (override.unitPriceMinor <= 0) {
          throw new Error(`INVALID_PRICING: Operator override for '${override.name}' must be a positive price.`);
        }
        lineItems.push({
          itemId: override.itemId,
          name: override.name,
          unitPriceMinor: override.unitPriceMinor,
          quantity: 1,
          totalMinor: override.unitPriceMinor,
          provenance: "OPERATOR_OVERRIDE",
        });
        subtotalMinor += override.unitPriceMinor;
      } else if (catalogItem) {
        lineItems.push({
          itemId: catalogItem.id,
          name: catalogItem.name,
          unitPriceMinor: catalogItem.unitPriceMinor,
          quantity: 1,
          totalMinor: catalogItem.unitPriceMinor,
          provenance: "AUTHORITATIVE_CATALOG",
        });
        subtotalMinor += catalogItem.unitPriceMinor;
      } else {
        throw new Error(`UNGROUNDED_PRICING_ERROR: Item '${id}' not found in authoritative catalog. The AI is strictly prohibited from inventing arbitrary prices.`);
      }
    }

    const paymentMilestones = [
      { milestoneName: "Initial Deposit (50%)", percent: 50, amountMinor: Math.round(subtotalMinor * 0.5) },
      { milestoneName: "Project Handover & Source Delivery (50%)", percent: 50, amountMinor: subtotalMinor - Math.round(subtotalMinor * 0.5) },
    ];

    return {
      quoteId: `QUO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      organizationId: params.organizationId,
      opportunityId: params.opportunityId,
      currency: "PHP",
      lineItems,
      subtotalMinor,
      paymentMilestones,
      isAuthoritative: true,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const quoteAssistantService = new QuoteAssistantService();