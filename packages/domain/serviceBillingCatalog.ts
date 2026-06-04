import type {
  InvoiceLineItemInput,
  Job,
  ServiceBillingFamily,
  ServiceBillingGuidance,
  ServiceBillingInferenceResult,
  ServiceBillingOffering,
  ServiceBillingOfferingId,
  ServiceBillingPromotionSuggestion,
} from "@pest-patrol/types";

const familyLabels: Record<ServiceBillingFamily, string> = {
  bed_bug: "Bed Bugs",
  bird_gopher: "Bird/Gopher",
  commercial: "Commercial",
  general_pest: "General Pest",
  green_diy: "Green/DIY",
  hoa_property_management: "HOA/Property Mgmt",
  other: "Other",
  recurring_general_pest: "Recurring",
  rodent_attic: "Rodent/Attic",
  termite_wdo: "Termite/WDO",
};

const newCustomerReferralOffer: ServiceBillingPromotionSuggestion = {
  id: "new_customer_referral_offer",
  label: "New customer/referral offer",
  reviewCopy:
    "Review whether the current public new-customer or referral offer applies before adjusting the invoice manually.",
  searchTerms: ["new customer", "referral", "refer a friend"],
  summary: "Review promo eligibility; do not change the invoice total automatically.",
};

const realEstateAgentOffer: ServiceBillingPromotionSuggestion = {
  id: "real_estate_agent_first_service_offer",
  label: "Real estate agent first-service offer",
  reviewCopy:
    "Review real estate agent first-service eligibility before changing billing manually.",
  searchTerms: ["real estate", "agent", "first service", "escrow"],
  summary: "Office-reviewed suggestion only for real estate/escrow work.",
};

const atticRestorationOffer: ServiceBillingPromotionSuggestion = {
  id: "attic_restoration_offer",
  label: "Attic restoration offer",
  reviewCopy:
    "Review any current attic restoration offer before changing the invoice manually.",
  searchTerms: ["attic", "restoration", "insulation", "sanitation"],
  summary: "Suggestion only; keep restoration pricing office-reviewed.",
};

const termiteRepairOffer: ServiceBillingPromotionSuggestion = {
  id: "termite_repair_related_offer",
  label: "Termite/repair-related offer",
  reviewCopy:
    "Review any current termite or repair-related offer before changing the invoice manually.",
  searchTerms: ["termite", "repair", "wdo", "wood destroying"],
  summary: "Suggestion only for termite or repair-related work.",
};

function offering(input: ServiceBillingOffering): ServiceBillingOffering {
  return input;
}

const serviceBillingOfferings = [
  offering({
    closeoutGuidance: [
      "Confirm target pests and service scope match the invoice copy.",
      "Confirm any recurring cadence before billing as a recurring service.",
    ],
    customerSafeDescription: "General pest initial service",
    family: "general_pest",
    id: "general_pest_initial",
    internalBillingGuidance:
      "Use for one-time or initial general pest service when a specific pest preset is not a better fit.",
    label: "General Pest Initial",
    pestTags: ["ants", "cockroaches", "earwigs", "fleas", "silverfish", "spiders"],
    portalSafeSummary: "General pest service for the listed service location.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["general pest", "initial", "pest control", "bugs", "insects"],
    serviceTags: ["initial service", "general pest control"],
    shortLabel: "Initial",
    suggestedLineItems: [{ description: "General pest initial service", quantity: 1 }],
    suggestedNotes: ["General pest service completed for the listed service location."],
  }),
  offering({
    closeoutGuidance: ["Confirm the monthly cadence before invoice release."],
    customerSafeDescription: "Monthly general pest service",
    family: "recurring_general_pest",
    id: "general_pest_monthly",
    internalBillingGuidance:
      "Use when the account is on a monthly general pest cadence.",
    label: "Monthly General Pest",
    pestTags: ["ants", "cockroaches", "spiders"],
    portalSafeSummary: "Monthly general pest service.",
    promotionSuggestions: [],
    searchTerms: ["monthly", "recurring", "routine", "route", "subscription"],
    serviceTags: ["monthly service", "recurring service"],
    shortLabel: "Monthly",
    suggestedLineItems: [{ description: "Monthly general pest service", quantity: 1 }],
    suggestedNotes: ["Monthly general pest service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm the bi-monthly cadence before invoice release."],
    customerSafeDescription: "Bi-monthly general pest service",
    family: "recurring_general_pest",
    id: "general_pest_bimonthly",
    internalBillingGuidance:
      "Use when the account is on a bi-monthly general pest cadence.",
    label: "Bi-monthly General Pest",
    pestTags: ["ants", "cockroaches", "spiders"],
    portalSafeSummary: "Bi-monthly general pest service.",
    promotionSuggestions: [],
    searchTerms: ["bi-monthly", "bimonthly", "every other month", "recurring"],
    serviceTags: ["bi-monthly service", "recurring service"],
    shortLabel: "Bi-monthly",
    suggestedLineItems: [
      { description: "Bi-monthly general pest service", quantity: 1 },
    ],
    suggestedNotes: ["Bi-monthly general pest service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm the quarterly cadence before invoice release."],
    customerSafeDescription: "Quarterly general pest service",
    family: "recurring_general_pest",
    id: "general_pest_quarterly",
    internalBillingGuidance:
      "Use when the account is on a quarterly general pest cadence.",
    label: "Quarterly General Pest",
    pestTags: ["ants", "cockroaches", "spiders"],
    portalSafeSummary: "Quarterly general pest service.",
    promotionSuggestions: [],
    searchTerms: ["quarterly", "recurring", "routine", "route"],
    serviceTags: ["quarterly service", "recurring service"],
    shortLabel: "Quarterly",
    suggestedLineItems: [
      { description: "Quarterly general pest service", quantity: 1 },
    ],
    suggestedNotes: ["Quarterly general pest service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm ant treatment areas and follow-up needs."],
    customerSafeDescription: "Ant control service",
    family: "general_pest",
    id: "ant_control",
    internalBillingGuidance: "Use for ant-focused general pest service.",
    label: "Ant Control",
    pestTags: ["ants"],
    portalSafeSummary: "Ant control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["ant", "ants", "trail", "mound"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Ants",
    suggestedLineItems: [{ description: "Ant control service", quantity: 1 }],
    suggestedNotes: ["Ant control service completed for the listed service location."],
  }),
  offering({
    closeoutGuidance: ["Confirm nest removal or wasp/bee treatment scope."],
    customerSafeDescription: "Bee and wasp control service",
    family: "general_pest",
    id: "bee_wasp_control",
    internalBillingGuidance: "Use for bee, wasp, hornet, or nest service.",
    label: "Bee and Wasp Control",
    pestTags: ["bees", "wasps"],
    portalSafeSummary: "Bee and wasp control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["bee", "bees", "wasp", "wasps", "hornet", "nest", "bees/wasps"],
    serviceTags: ["targeted pest treatment", "nest service"],
    shortLabel: "Bees/Wasps",
    suggestedLineItems: [
      { description: "Bee and wasp control service", quantity: 1 },
    ],
    suggestedNotes: ["Bee and wasp control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm treated areas and sanitation follow-up notes."],
    customerSafeDescription: "Cockroach control service",
    family: "general_pest",
    id: "cockroach_control",
    internalBillingGuidance: "Use for cockroach-focused service.",
    label: "Cockroach Control",
    pestTags: ["cockroaches"],
    portalSafeSummary: "Cockroach control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["cockroach", "cockroaches", "roach", "roaches"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Cockroaches",
    suggestedLineItems: [{ description: "Cockroach control service", quantity: 1 }],
    suggestedNotes: ["Cockroach control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm earwig service scope."],
    customerSafeDescription: "Earwig control service",
    family: "general_pest",
    id: "earwig_control",
    internalBillingGuidance: "Use for earwig-focused service.",
    label: "Earwig Control",
    pestTags: ["earwigs"],
    portalSafeSummary: "Earwig control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["earwig", "earwigs"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Earwigs",
    suggestedLineItems: [{ description: "Earwig control service", quantity: 1 }],
    suggestedNotes: ["Earwig control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm flea service scope and follow-up guidance."],
    customerSafeDescription: "Flea control service",
    family: "general_pest",
    id: "flea_control",
    internalBillingGuidance: "Use for flea-focused service.",
    label: "Flea Control",
    pestTags: ["fleas"],
    portalSafeSummary: "Flea control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["flea", "fleas"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Fleas",
    suggestedLineItems: [{ description: "Flea control service", quantity: 1 }],
    suggestedNotes: ["Flea control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm silverfish service scope."],
    customerSafeDescription: "Silverfish control service",
    family: "general_pest",
    id: "silverfish_control",
    internalBillingGuidance: "Use for silverfish-focused service.",
    label: "Silverfish Control",
    pestTags: ["silverfish"],
    portalSafeSummary: "Silverfish control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["silverfish"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Silverfish",
    suggestedLineItems: [{ description: "Silverfish control service", quantity: 1 }],
    suggestedNotes: ["Silverfish control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm spider service scope and web removal if included."],
    customerSafeDescription: "Spider control service",
    family: "general_pest",
    id: "spider_control",
    internalBillingGuidance: "Use for spider-focused service.",
    label: "Spider Control",
    pestTags: ["spiders"],
    portalSafeSummary: "Spider control service.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["spider", "spiders", "web", "webs"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Spiders",
    suggestedLineItems: [{ description: "Spider control service", quantity: 1 }],
    suggestedNotes: ["Spider control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm inspection findings and treatment recommendation status."],
    customerSafeDescription: "Bed bug inspection",
    family: "bed_bug",
    id: "bed_bug_inspection",
    internalBillingGuidance: "Use for bed bug inspections without treatment billing.",
    label: "Bed Bug Inspection",
    pestTags: ["bed bugs"],
    portalSafeSummary: "Bed bug inspection.",
    promotionSuggestions: [],
    searchTerms: ["bed bug", "bedbug", "bed bugs", "inspection"],
    serviceTags: ["inspection"],
    shortLabel: "Bed Bug Inspection",
    suggestedLineItems: [{ description: "Bed bug inspection", quantity: 1 }],
    suggestedNotes: ["Bed bug inspection completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm treatment areas, preparation, and follow-up needs."],
    customerSafeDescription: "Bed bug treatment",
    family: "bed_bug",
    id: "bed_bug_treatment",
    internalBillingGuidance: "Use for bed bug treatment work.",
    label: "Bed Bug Treatment",
    pestTags: ["bed bugs"],
    portalSafeSummary: "Bed bug treatment.",
    promotionSuggestions: [],
    searchTerms: ["bed bug", "bedbug", "bed bugs", "treatment"],
    serviceTags: ["targeted pest treatment"],
    shortLabel: "Bed Bugs",
    suggestedLineItems: [{ description: "Bed bug treatment", quantity: 1 }],
    suggestedNotes: ["Bed bug treatment completed."],
  }),
  offering({
    closeoutGuidance: [
      "Confirm WDO report, findings, recommendations, and escrow document handoff before release.",
    ],
    customerSafeDescription: "Termite inspection",
    family: "termite_wdo",
    id: "termite_inspection",
    internalBillingGuidance:
      "Use for termite or Branch 3 inspection when escrow/WDO copy is not required.",
    label: "Termite Inspection",
    pestTags: ["termites"],
    portalSafeSummary: "Termite inspection.",
    promotionSuggestions: [termiteRepairOffer, realEstateAgentOffer],
    searchTerms: ["termite", "branch 3", "branch three", "inspection", "drywood", "subterranean"],
    serviceTags: ["inspection", "branch 3"],
    shortLabel: "Termite Inspection",
    suggestedLineItems: [{ description: "Termite inspection", quantity: 1 }],
    suggestedNotes: ["Termite inspection completed."],
  }),
  offering({
    closeoutGuidance: [
      "Confirm fumigation scope, documents, and customer handoff before release.",
    ],
    customerSafeDescription: "Termite fumigation",
    family: "termite_wdo",
    id: "termite_fumigation",
    internalBillingGuidance: "Use for termite fumigation billing.",
    label: "Termite Fumigation",
    pestTags: ["termites"],
    portalSafeSummary: "Termite fumigation service.",
    promotionSuggestions: [termiteRepairOffer],
    searchTerms: ["termite", "fumigation", "tent", "drywood"],
    serviceTags: ["fumigation", "branch 3"],
    shortLabel: "Fumigation",
    suggestedLineItems: [{ description: "Termite fumigation", quantity: 1 }],
    suggestedNotes: ["Termite fumigation service completed."],
  }),
  offering({
    closeoutGuidance: [
      "Confirm localized treatment method and findings before release.",
      "If orange oil, heat, or chemical options are referenced, keep wording customer-safe.",
    ],
    customerSafeDescription: "Termite localized treatment",
    family: "termite_wdo",
    id: "termite_localized_treatment",
    internalBillingGuidance:
      "Use for localized termite treatment, including heat, orange oil, or chemical options when applicable.",
    label: "Termite Localized Treatment",
    pestTags: ["termites"],
    portalSafeSummary: "Termite localized treatment.",
    promotionSuggestions: [termiteRepairOffer],
    searchTerms: [
      "termite",
      "localized",
      "local treatment",
      "spot treatment",
      "heat",
      "orange oil",
      "chemical option",
    ],
    serviceTags: ["localized treatment", "branch 3"],
    shortLabel: "Localized",
    suggestedLineItems: [
      { description: "Termite localized treatment", quantity: 1 },
    ],
    suggestedNotes: ["Termite localized treatment completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm repair scope and document handoff before release."],
    customerSafeDescription: "Termite repair",
    family: "termite_wdo",
    id: "termite_repair",
    internalBillingGuidance: "Use for termite repair-related billing.",
    label: "Termite Repair",
    pestTags: ["termites"],
    portalSafeSummary: "Termite repair service.",
    promotionSuggestions: [termiteRepairOffer],
    searchTerms: ["termite", "repair", "wood repair", "damage", "damaged members"],
    serviceTags: ["repair", "branch 3"],
    shortLabel: "Repair",
    suggestedLineItems: [{ description: "Termite repair", quantity: 1 }],
    suggestedNotes: ["Termite repair service completed."],
  }),
  offering({
    closeoutGuidance: [
      "Confirm WDO report, findings, recommendations, and escrow document handoff before release.",
    ],
    customerSafeDescription: "WDO / escrow inspection",
    family: "termite_wdo",
    id: "wdo_escrow_inspection",
    internalBillingGuidance:
      "Use for escrow inspections, real estate termite clearance, and WDO work.",
    label: "WDO / Escrow Inspection",
    pestTags: ["termites", "wood destroying organisms"],
    portalSafeSummary: "WDO / escrow inspection.",
    promotionSuggestions: [realEstateAgentOffer, termiteRepairOffer],
    searchTerms: [
      "wdo",
      "escrow",
      "real estate",
      "termite clearance",
      "wood destroying",
      "branch 3",
      "branch three",
      "certificate",
    ],
    serviceTags: ["inspection", "escrow", "document handoff"],
    shortLabel: "WDO/Escrow",
    suggestedLineItems: [{ description: "WDO / escrow inspection", quantity: 1 }],
    suggestedNotes: [
      "WDO / escrow inspection completed. Office to confirm report and document handoff.",
    ],
  }),
  offering({
    closeoutGuidance: ["Confirm escrow clearance document handoff before release."],
    customerSafeDescription: "Escrow clearance document",
    family: "termite_wdo",
    id: "escrow_clearance_document",
    internalBillingGuidance: "Use for escrow clearance document handoff billing.",
    label: "Escrow Clearance Document",
    pestTags: ["termites", "wood destroying organisms"],
    portalSafeSummary: "Escrow clearance document.",
    promotionSuggestions: [realEstateAgentOffer],
    searchTerms: ["escrow", "clearance", "certificate", "document", "real estate"],
    serviceTags: ["document handoff", "escrow"],
    shortLabel: "Clearance",
    suggestedLineItems: [{ description: "Escrow clearance document", quantity: 1 }],
    suggestedNotes: ["Escrow clearance document prepared for handoff."],
  }),
  offering({
    closeoutGuidance: ["Confirm inspection findings and follow-up needs."],
    customerSafeDescription: "Rodent inspection",
    family: "rodent_attic",
    id: "rodent_inspection",
    internalBillingGuidance: "Use for rodent inspections before exclusion or attic work.",
    label: "Rodent Inspection",
    pestTags: ["rodents", "rats", "mice"],
    portalSafeSummary: "Rodent inspection.",
    promotionSuggestions: [],
    searchTerms: ["rodent", "rat", "rats", "mouse", "mice", "inspection"],
    serviceTags: ["inspection"],
    shortLabel: "Rodent Inspection",
    suggestedLineItems: [{ description: "Rodent inspection", quantity: 1 }],
    suggestedNotes: ["Rodent inspection completed."],
  }),
  offering({
    closeoutGuidance: [
      "Confirm photo proof, cleanup/sanitation, exclusion, and follow-up needs.",
    ],
    customerSafeDescription: "Rodent exclusion and attic sanitation",
    family: "rodent_attic",
    id: "rodent_exclusion",
    internalBillingGuidance:
      "Use for access-point sealing, exterior rodent proofing, and related attic sanitation.",
    label: "Rodent Exclusion",
    pestTags: ["rodents", "rats", "mice"],
    portalSafeSummary: "Rodent exclusion and attic sanitation.",
    promotionSuggestions: [atticRestorationOffer],
    searchTerms: [
      "rodent",
      "rat",
      "rats",
      "mouse",
      "mice",
      "exclusion",
      "access-point sealing",
      "access point sealing",
      "sealing",
      "rodent proofing",
      "proofing",
      "attic",
      "sanitation",
    ],
    serviceTags: ["exclusion", "access-point sealing", "exterior rodent proofing"],
    shortLabel: "Exclusion",
    suggestedLineItems: [
      { description: "Rodent exclusion and attic sanitation", quantity: 1 },
    ],
    suggestedNotes: [
      "Rodent exclusion and attic sanitation completed. Office to confirm follow-up needs.",
    ],
  }),
  offering({
    closeoutGuidance: ["Confirm cleanup, sanitation, and photo proof before release."],
    customerSafeDescription: "Attic cleanup and sanitation",
    family: "rodent_attic",
    id: "attic_cleanup_sanitation",
    internalBillingGuidance: "Use for attic cleanup and sanitation billing.",
    label: "Attic Cleanup and Sanitation",
    pestTags: ["rodents"],
    portalSafeSummary: "Attic cleanup and sanitation.",
    promotionSuggestions: [atticRestorationOffer],
    searchTerms: ["attic", "cleanup", "clean up", "sanitation", "sanitize", "restoration"],
    serviceTags: ["attic cleanup", "sanitation"],
    shortLabel: "Cleanup",
    suggestedLineItems: [
      { description: "Attic cleanup and sanitation", quantity: 1 },
    ],
    suggestedNotes: ["Attic cleanup and sanitation completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm insulation removal scope and disposal handoff."],
    customerSafeDescription: "Insulation removal",
    family: "rodent_attic",
    id: "insulation_removal",
    internalBillingGuidance: "Use for insulation removal in rodent/attic work.",
    label: "Insulation Removal",
    pestTags: ["rodents"],
    portalSafeSummary: "Insulation removal.",
    promotionSuggestions: [atticRestorationOffer],
    searchTerms: ["insulation removal", "remove insulation", "attic", "restoration"],
    serviceTags: ["insulation removal", "attic restoration"],
    shortLabel: "Removal",
    suggestedLineItems: [{ description: "Insulation removal", quantity: 1 }],
    suggestedNotes: ["Insulation removal completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm re-insulation scope and photo proof."],
    customerSafeDescription: "Attic re-insulation",
    family: "rodent_attic",
    id: "re_insulation",
    internalBillingGuidance: "Use for re-insulation after attic restoration work.",
    label: "Attic Re-insulation",
    pestTags: ["rodents"],
    portalSafeSummary: "Attic re-insulation.",
    promotionSuggestions: [atticRestorationOffer],
    searchTerms: ["re-insulation", "re insulation", "reinsulation", "insulation", "attic restoration"],
    serviceTags: ["re-insulation", "attic restoration"],
    shortLabel: "Re-insulation",
    suggestedLineItems: [{ description: "Attic re-insulation", quantity: 1 }],
    suggestedNotes: ["Attic re-insulation completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm gopher treatment scope and follow-up needs."],
    customerSafeDescription: "Gopher control service",
    family: "bird_gopher",
    id: "gopher_control",
    internalBillingGuidance: "Use for gopher control billing.",
    label: "Gopher Control",
    pestTags: ["gophers"],
    portalSafeSummary: "Gopher control service.",
    promotionSuggestions: [],
    searchTerms: ["gopher", "gophers", "burrow", "mound"],
    serviceTags: ["gopher control"],
    shortLabel: "Gopher",
    suggestedLineItems: [{ description: "Gopher control service", quantity: 1 }],
    suggestedNotes: ["Gopher control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm bird removal scope and cleanup needs."],
    customerSafeDescription: "Bird removal service",
    family: "bird_gopher",
    id: "bird_removal",
    internalBillingGuidance: "Use for bird removal billing.",
    label: "Bird Removal",
    pestTags: ["birds"],
    portalSafeSummary: "Bird removal service.",
    promotionSuggestions: [],
    searchTerms: ["bird", "birds", "nest", "removal"],
    serviceTags: ["bird removal"],
    shortLabel: "Bird Removal",
    suggestedLineItems: [{ description: "Bird removal service", quantity: 1 }],
    suggestedNotes: ["Bird removal service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm bird exclusion scope and access points."],
    customerSafeDescription: "Bird exclusion service",
    family: "bird_gopher",
    id: "bird_exclusion",
    internalBillingGuidance: "Use for bird exclusion billing.",
    label: "Bird Exclusion",
    pestTags: ["birds"],
    portalSafeSummary: "Bird exclusion service.",
    promotionSuggestions: [],
    searchTerms: ["bird", "birds", "exclusion", "nest", "netting", "spikes"],
    serviceTags: ["bird exclusion"],
    shortLabel: "Bird Exclusion",
    suggestedLineItems: [{ description: "Bird exclusion service", quantity: 1 }],
    suggestedNotes: ["Bird exclusion service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm location/site grouping and billing contact."],
    customerSafeDescription: "Commercial pest control service",
    family: "commercial",
    id: "commercial_single_site",
    internalBillingGuidance:
      "Use for single-site commercial pest control service.",
    label: "Commercial Single Site",
    pestTags: ["general pests"],
    portalSafeSummary: "Commercial pest control service.",
    promotionSuggestions: [],
    searchTerms: ["commercial", "business", "restaurant", "office", "warehouse", "single site"],
    serviceTags: ["commercial", "single site"],
    shortLabel: "Commercial",
    suggestedLineItems: [
      { description: "Commercial pest control service", quantity: 1 },
    ],
    suggestedNotes: ["Commercial pest control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm site grouping and billing contact before release."],
    customerSafeDescription: "Commercial multi-site pest control service",
    family: "commercial",
    id: "commercial_multi_site",
    internalBillingGuidance: "Use for commercial multi-site billing.",
    label: "Commercial Multi-site",
    pestTags: ["general pests"],
    portalSafeSummary: "Commercial multi-site pest control service.",
    promotionSuggestions: [],
    searchTerms: ["commercial", "multi-site", "multi site", "business", "restaurant", "office", "warehouse"],
    serviceTags: ["commercial", "multi-site"],
    shortLabel: "Multi-site",
    suggestedLineItems: [
      { description: "Commercial multi-site pest control service", quantity: 1 },
    ],
    suggestedNotes: ["Commercial multi-site pest control service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm common area vs unit-specific responsibility."],
    customerSafeDescription: "HOA common area pest service",
    family: "hoa_property_management",
    id: "hoa_common_area",
    internalBillingGuidance: "Use for HOA common-area pest control billing.",
    label: "HOA Common Area",
    pestTags: ["general pests"],
    portalSafeSummary: "HOA common area pest service.",
    promotionSuggestions: [],
    searchTerms: ["hoa", "homeowners association", "association", "common area", "community"],
    serviceTags: ["hoa", "common area"],
    shortLabel: "HOA",
    suggestedLineItems: [
      { description: "HOA common area pest service", quantity: 1 },
    ],
    suggestedNotes: ["HOA common area pest service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm common area vs unit-specific responsibility."],
    customerSafeDescription: "Property management unit pest service",
    family: "hoa_property_management",
    id: "property_management_unit_service",
    internalBillingGuidance:
      "Use for property management, tenant, unit, or apartment service billing.",
    label: "Property Management Unit Service",
    pestTags: ["general pests"],
    portalSafeSummary: "Property management unit pest service.",
    promotionSuggestions: [],
    searchTerms: [
      "property management",
      "tenant",
      "unit",
      "apartment",
      "rental",
      "manager",
    ],
    serviceTags: ["property management", "unit service"],
    shortLabel: "Property Mgmt",
    suggestedLineItems: [
      { description: "Property management unit pest service", quantity: 1 },
    ],
    suggestedNotes: ["Property management unit pest service completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm green treatment request and customer-safe copy."],
    customerSafeDescription: "Green pest treatment",
    family: "green_diy",
    id: "green_pest_treatment",
    internalBillingGuidance:
      "Use for green, organic, or eco-focused pest service when not better classified as termite localized treatment.",
    label: "Green Pest Treatment",
    pestTags: ["general pests"],
    portalSafeSummary: "Green pest treatment.",
    promotionSuggestions: [newCustomerReferralOffer],
    searchTerms: ["green", "organic", "eco", "eco-friendly", "natural"],
    serviceTags: ["green pest control", "eco service"],
    shortLabel: "Green",
    suggestedLineItems: [{ description: "Green pest treatment", quantity: 1 }],
    suggestedNotes: ["Green pest treatment completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm consultation scope and customer follow-up."],
    customerSafeDescription: "DIY pest consultation",
    family: "green_diy",
    id: "diy_consultation",
    internalBillingGuidance: "Use for DIY pest control consultation billing.",
    label: "DIY Pest Consultation",
    pestTags: ["general pests"],
    portalSafeSummary: "DIY pest consultation.",
    promotionSuggestions: [],
    searchTerms: ["diy", "do it yourself", "consultation", "consult"],
    serviceTags: ["diy pest control", "consultation"],
    shortLabel: "DIY",
    suggestedLineItems: [{ description: "DIY pest consultation", quantity: 1 }],
    suggestedNotes: ["DIY pest consultation completed."],
  }),
  offering({
    closeoutGuidance: ["Confirm service scope before invoice release."],
    customerSafeDescription: "Pest control service",
    family: "other",
    id: "other_service",
    internalBillingGuidance:
      "Use only when no specific Pest Patrol service preset fits the job.",
    label: "Other Service",
    pestTags: [],
    portalSafeSummary: "Pest control service.",
    promotionSuggestions: [],
    searchTerms: ["other", "service"],
    serviceTags: ["manual review"],
    shortLabel: "Other",
    suggestedLineItems: [{ description: "Pest control service", quantity: 1 }],
    suggestedNotes: ["Pest control service completed."],
  }),
] satisfies ServiceBillingOffering[];

const offeringsById = new Map(
  serviceBillingOfferings.map((item) => [item.id, item]),
);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[-/]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term);
  return normalizeText(text).includes(normalizedTerm);
}

function collectText(job: Job) {
  return [
    job.service_notes,
    job.customer?.service_notes,
    job.location?.service_notes,
    job.location?.nickname,
    job.location?.address,
    job.customer?.name,
    job.customer?.property_type,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function matchingTerms(text: string, terms: string[]) {
  return terms.filter((term) => hasTerm(text, term));
}

function result(
  job: Job,
  offeringId: ServiceBillingOfferingId,
  matchedTerms: string[],
  confidence: ServiceBillingInferenceResult["confidence"] = "high",
): ServiceBillingInferenceResult {
  return {
    confidence,
    matchedTerms,
    offering: getServiceBillingOffering(offeringId),
    sourceSummary: matchedTerms.length
      ? `Matched ${matchedTerms.slice(0, 4).join(", ")} from job context.`
      : `Defaulted from ${job.customer?.property_type ?? "job"} context.`,
  };
}

function firstMatch(
  text: string,
  options: Array<{ id: ServiceBillingOfferingId; terms: string[] }>,
) {
  for (const option of options) {
    const matched = matchingTerms(text, option.terms);
    if (matched.length > 0) return { id: option.id, matched };
  }

  return null;
}

function offeringSearchText(offering: ServiceBillingOffering) {
  return [
    offering.id,
    offering.family,
    familyLabels[offering.family],
    offering.label,
    offering.shortLabel,
    offering.customerSafeDescription,
    offering.internalBillingGuidance,
    offering.portalSafeSummary,
    ...offering.pestTags,
    ...offering.serviceTags,
    ...offering.searchTerms,
    ...offering.suggestedLineItems.map((item) => item.description),
    ...offering.suggestedNotes,
    ...offering.closeoutGuidance,
    ...offering.promotionSuggestions.flatMap((suggestion) => [
      suggestion.label,
      suggestion.summary,
      ...suggestion.searchTerms,
    ]),
  ].join(" ");
}

export function listServiceBillingOfferings() {
  return serviceBillingOfferings;
}

export function getServiceBillingOffering(id: ServiceBillingOfferingId) {
  const offering = offeringsById.get(id);

  if (!offering) {
    throw new Error(`Unknown service billing offering: ${id}`);
  }

  return offering;
}

export function searchServiceBillingOfferings(query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return listServiceBillingOfferings();
  }

  return serviceBillingOfferings.filter((item) =>
    normalizeText(offeringSearchText(item)).includes(normalizedQuery),
  );
}

export function getServiceBillingFamilyLabel(family: ServiceBillingFamily) {
  return familyLabels[family];
}

export function getServiceBillingFamilyOptions() {
  return Object.entries(familyLabels).map(([family, label]) => ({
    family: family as ServiceBillingFamily,
    label,
  }));
}

export function inferServiceBillingOfferingFromJob(
  job: Job,
): ServiceBillingInferenceResult {
  const text = collectText(job);
  const propertyType = job.customer?.property_type;

  const termite = firstMatch(text, [
    {
      id: "wdo_escrow_inspection",
      terms: ["wdo", "escrow", "wood destroying", "branch 3", "branch three", "real estate"],
    },
    { id: "termite_fumigation", terms: ["fumigation", "tent"] },
    { id: "termite_repair", terms: ["termite repair", "wood repair", "damaged members"] },
    {
      id: "termite_localized_treatment",
      terms: ["localized", "local treatment", "spot treatment", "orange oil", "heat"],
    },
    { id: "termite_inspection", terms: ["termite", "drywood", "subterranean"] },
  ]);
  if (termite) return result(job, termite.id, termite.matched);

  const rodent = firstMatch(text, [
    { id: "insulation_removal", terms: ["insulation removal", "remove insulation"] },
    { id: "re_insulation", terms: ["re-insulation", "re insulation", "reinsulation"] },
    {
      id: "rodent_exclusion",
      terms: ["rodent exclusion", "rat exclusion", "mouse exclusion", "access-point sealing", "access point sealing", "rodent proofing", "proofing", "attic"],
    },
    {
      id: "attic_cleanup_sanitation",
      terms: ["attic cleanup", "cleanup", "sanitation", "sanitize"],
    },
    { id: "rodent_inspection", terms: ["rodent", "rat", "rats", "mouse", "mice"] },
  ]);
  if (rodent) return result(job, rodent.id, rodent.matched);

  const direct = firstMatch(text, [
    { id: "bed_bug_treatment", terms: ["bed bug treatment", "bedbug treatment"] },
    { id: "bed_bug_inspection", terms: ["bed bug", "bedbug", "bed bugs"] },
    { id: "commercial_multi_site", terms: ["multi-site", "multi site"] },
    { id: "commercial_single_site", terms: ["commercial", "business", "restaurant", "office", "warehouse"] },
    { id: "hoa_common_area", terms: ["hoa", "homeowners association", "association", "common area"] },
    { id: "property_management_unit_service", terms: ["property management", "tenant", "unit", "apartment", "rental"] },
    { id: "bird_exclusion", terms: ["bird exclusion", "bird proofing", "netting", "spikes"] },
    { id: "bird_removal", terms: ["bird", "birds", "nest"] },
    { id: "gopher_control", terms: ["gopher", "gophers", "burrow"] },
    { id: "diy_consultation", terms: ["diy", "do it yourself", "consultation"] },
    { id: "green_pest_treatment", terms: ["green", "organic", "eco", "eco-friendly"] },
    { id: "bee_wasp_control", terms: ["bee", "bees", "wasp", "wasps", "hornet"] },
    { id: "cockroach_control", terms: ["cockroach", "cockroaches", "roach", "roaches"] },
    { id: "earwig_control", terms: ["earwig", "earwigs"] },
    { id: "flea_control", terms: ["flea", "fleas"] },
    { id: "silverfish_control", terms: ["silverfish"] },
    { id: "spider_control", terms: ["spider", "spiders"] },
    { id: "ant_control", terms: ["ant", "ants"] },
  ]);
  if (direct) return result(job, direct.id, direct.matched);

  const recurring = firstMatch(text, [
    { id: "general_pest_monthly", terms: ["monthly"] },
    { id: "general_pest_bimonthly", terms: ["bi-monthly", "bimonthly", "every other month"] },
    { id: "general_pest_quarterly", terms: ["quarterly"] },
    { id: "general_pest_quarterly", terms: ["recurring", "routine", "route"] },
  ]);
  if (recurring) return result(job, recurring.id, recurring.matched, "medium");

  if (propertyType === "commercial") {
    return result(job, "commercial_single_site", ["commercial"], "medium");
  }

  return result(job, "general_pest_initial", [], "fallback");
}

export function buildInvoiceLineItemsFromOffering(
  offering: ServiceBillingOffering,
  amountCents: number,
): InvoiceLineItemInput[] {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Line item amount must be greater than zero");
  }

  const template = offering.suggestedLineItems[0] ?? {
    description: offering.customerSafeDescription,
    quantity: 1,
  };

  return [
    {
      description: template.description,
      quantity: template.quantity,
      unit_amount_cents: amountCents,
    },
  ];
}

export function buildInvoiceNotesFromOffering(
  job: Job,
  offering: ServiceBillingOffering,
) {
  return [
    ...offering.suggestedNotes,
    job.location?.nickname ? `Service location: ${job.location.nickname}.` : null,
    offering.portalSafeSummary,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

export function getPromotionSuggestionsForOffering(
  offering: ServiceBillingOffering,
) {
  return offering.promotionSuggestions;
}

export function getServiceBillingGuidanceForJob(job: Job): ServiceBillingGuidance {
  const inference = inferServiceBillingOfferingFromJob(job);
  const { offering } = inference;

  return {
    family: offering.family,
    items: offering.closeoutGuidance,
    label: `${familyLabels[offering.family]} billing guidance`,
    offeringId: offering.id,
    summary: offering.internalBillingGuidance,
  };
}
