export type JobPurpose =
  | "estimate"
  | "service"
  | "inspection"
  | "follow_up"
  | "callback"
  | "warranty"
  | "project_phase";

export type JobBillingDisposition =
  | "billable"
  | "estimate_only"
  | "included_in_recurring"
  | "no_charge"
  | "warranty_callback"
  | "deposit_required";

export type JobServiceCadence =
  | "none"
  | "one_time"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "annual"
  | "project";

export type JobEstimateStatus =
  | "not_applicable"
  | "draft"
  | "presented"
  | "accepted"
  | "declined"
  | "needs_follow_up";

export type ServiceBillingFamily =
  | "general_pest"
  | "recurring_general_pest"
  | "termite_wdo"
  | "rodent_attic"
  | "bed_bug"
  | "commercial"
  | "hoa_property_management"
  | "bird_gopher"
  | "green_diy"
  | "other";

export type ServiceBillingOfferingId =
  | "general_pest_initial"
  | "general_pest_monthly"
  | "general_pest_bimonthly"
  | "general_pest_quarterly"
  | "ant_control"
  | "bee_wasp_control"
  | "cockroach_control"
  | "earwig_control"
  | "flea_control"
  | "silverfish_control"
  | "spider_control"
  | "bed_bug_inspection"
  | "bed_bug_treatment"
  | "termite_inspection"
  | "termite_fumigation"
  | "termite_localized_treatment"
  | "termite_repair"
  | "wdo_escrow_inspection"
  | "escrow_clearance_document"
  | "rodent_inspection"
  | "rodent_exclusion"
  | "attic_cleanup_sanitation"
  | "insulation_removal"
  | "re_insulation"
  | "gopher_control"
  | "bird_removal"
  | "bird_exclusion"
  | "commercial_single_site"
  | "commercial_multi_site"
  | "hoa_common_area"
  | "property_management_unit_service"
  | "green_pest_treatment"
  | "diy_consultation"
  | "other_service";

export interface ServiceBillingLineItemTemplate {
  description: string;
  quantity: number;
}

export interface ServiceBillingPromotionSuggestion {
  id: string;
  label: string;
  reviewCopy: string;
  searchTerms: string[];
  summary: string;
}

export interface ServiceBillingOffering {
  closeoutGuidance: string[];
  customerSafeDescription: string;
  defaultBillingDisposition?: JobBillingDisposition;
  defaultJobPurpose?: JobPurpose;
  defaultServiceCadence?: JobServiceCadence;
  family: ServiceBillingFamily;
  id: ServiceBillingOfferingId;
  internalBillingGuidance: string;
  label: string;
  pestTags: string[];
  portalSafeSummary: string;
  proofProfile?: "general" | "estimate" | "exclusion" | "wdo_escrow" | "warranty";
  promotionSuggestions: ServiceBillingPromotionSuggestion[];
  searchTerms: string[];
  serviceTags: string[];
  shortLabel: string;
  suggestedLineItems: ServiceBillingLineItemTemplate[];
  suggestedNotes: string[];
  techBadgeLabel?: string;
  techWorkflow?: "general_service" | "estimate" | "inspection" | "project" | "wdo_escrow";
}

export interface ServiceBillingInferenceResult {
  confidence: "fallback" | "high" | "medium";
  matchedTerms: string[];
  offering: ServiceBillingOffering;
  sourceSummary: string;
}

export interface ServiceBillingGuidance {
  family: ServiceBillingFamily;
  items: string[];
  label: string;
  offeringId: ServiceBillingOfferingId;
  summary: string;
}
