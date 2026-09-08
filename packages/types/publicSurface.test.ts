import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import ts from "typescript";

const BARREL = "index.ts";

/**
 * The directory holding this test, and therefore the package under test.
 *
 * Taken from vitest's own state rather than `import.meta.url`, which the jsdom
 * environment rewrites to a non-`file:` document URL, and rather than
 * `process.cwd()`, which differs between a root `vitest run` and the
 * per-project run turbo performs inside the package directory.
 */
function packageDir(): string {
  const { testPath } = expect.getState();

  if (!testPath) {
    throw new Error("vitest did not report a test path");
  }

  return dirname(testPath);
}

/**
 * The public surface of `@pest-patrol/types`, frozen at CR02.
 *
 * Every one of these names resolved from the bare `@pest-patrol/types`
 * specifier before the bounded-context split and must continue to. Removing or
 * renaming an entry is a breaking change to every consumer and belongs in a
 * slice that owns those consumers, not in a move.
 */
const PUBLIC_SURFACE: readonly string[] = [
  "ApiRateLimitPolicyId",
  "ArrivalNotificationDecision",
  "ArrivalNotificationQueuePayload",
  "AutomationRule",
  "AutomationRuleInput",
  "AutomationRuleStatus",
  "AutomationRuleType",
  "AutomationSchedulerResult",
  "AutomationSchedulerRun",
  "AutomationSchedulerRunStatus",
  "AutomationSchedulerRunTrigger",
  "ChemicalInventoryInput",
  "ChemicalInventoryItem",
  "ChemicalLog",
  "ChemicalLogInput",
  "ChemicalLogQueuePayload",
  "CloseoutCaptureSummary",
  "ComplianceAdvisory",
  "ComplianceAdvisoryAudit",
  "ComplianceAdvisoryRequest",
  "ComplianceAdvisoryStatus",
  "ComplianceAuthority",
  "ComplianceBranch",
  "ComplianceChunk",
  "ComplianceCitation",
  "ComplianceDocument",
  "ComplianceFinding",
  "ComplianceFindingSeverity",
  "ComplianceJurisdiction",
  "ComplianceRequiredField",
  "ComplianceRequiredFieldStatus",
  "ComplianceReviewStatus",
  "ComplianceSetupReadiness",
  "ComplianceSetupStatus",
  "ComplianceSource",
  "ComplianceWorkflow",
  "Customer",
  "CustomerInput",
  "CustomerLocationInput",
  "CustomerPortalAccessEventKind",
  "CustomerPortalAccessGrant",
  "CustomerPortalAccessInput",
  "CustomerPortalAccessStatus",
  "CustomerPortalAccessToken",
  "CustomerPortalAccessTokenEventListResponse",
  "CustomerPortalAccessTokenEventSummary",
  "CustomerPortalAccessTokenListResponse",
  "CustomerPortalAccessTokenSummary",
  "CustomerPortalBillingResponse",
  "CustomerPortalCloseout",
  "CustomerPortalCloseoutResponse",
  "CustomerPortalCustomer",
  "CustomerPortalDeliveryProvider",
  "CustomerPortalFormSubmission",
  "CustomerPortalInvoice",
  "CustomerPortalInvoiceLineItem",
  "CustomerPortalInvoiceStatus",
  "CustomerPortalJob",
  "CustomerPortalLocation",
  "CustomerPortalMedia",
  "CustomerPortalProviderStatus",
  "CustomerPortalSendInput",
  "CustomerPortalSendProviderPayload",
  "CustomerPortalSendResult",
  "CustomerPortalUpgradeIntentInput",
  "CustomerPortalUpgradeIntentRequest",
  "CustomerPortalUpgradeIntentResult",
  "CustomerPortalUpgradeIntentStatus",
  "CustomerPortalUpgradePlanId",
  "CustomerStatus",
  "DemoSeedAction",
  "DemoSeedActionInput",
  "DemoSeedActionResponse",
  "DemoSeedRuntimeStatus",
  "DemoSeedStatusResponse",
  "DemoSeedSummary",
  "DemoSeedTarget",
  "EstimateConversionInput",
  "EstimateConversionReadiness",
  "EstimateConversionResult",
  "EstimateConversionStatus",
  "FormDraft",
  "FormField",
  "FormFieldOption",
  "FormFieldType",
  "FormSubmissionQueuePayload",
  "FormTemplate",
  "FormTemplateInput",
  "FormTemplateSchema",
  "FormTemplateStatus",
  "FormValue",
  "InventoryStatus",
  "InventoryUnit",
  "Invoice",
  "InvoiceInput",
  "InvoiceLineItem",
  "InvoiceLineItemInput",
  "InvoicePaymentLinkInput",
  "InvoicePaymentLinkResult",
  "InvoiceStatus",
  "Job",
  "JobBillingDisposition",
  "JobClassification",
  "JobCloseoutReview",
  "JobEstimateStatus",
  "JobFormData",
  "JobFormSubmission",
  "JobFormSubmissionInput",
  "JobGeofenceEvent",
  "JobGeofenceEventInput",
  "JobGeofenceEventQueuePayload",
  "JobGeofenceEventType",
  "JobInput",
  "JobMedia",
  "JobMediaInput",
  "JobMediaType",
  "JobPhotoUploadQueuePayload",
  "JobPurpose",
  "JobServiceCadence",
  "JobSignatureCaptureQueuePayload",
  "JobStatus",
  "JobStatusUpdateQueuePayload",
  "JobUnitAuditItem",
  "JobUnitAuditItemInput",
  "JobUnitAuditStatus",
  "Location",
  "LocationUnit",
  "LocationUnitAreaType",
  "LocationUnitInput",
  "LocationUnitStatus",
  "NotificationDeliveryProvider",
  "NotificationDeliveryProviderPayload",
  "NotificationDeliveryResult",
  "NotificationDeliveryStatus",
  "NotificationEvent",
  "NotificationEventInput",
  "NotificationEventStatus",
  "NotificationEventType",
  "NotificationProviderReadinessState",
  "NotificationProviderStatus",
  "NotificationTemplate",
  "NotificationTemplateInput",
  "NotificationTemplateStatus",
  "OfflineQueueAction",
  "OfflineQueueInput",
  "OfflineQueueItem",
  "OfflineQueueStatus",
  "PaymentProvider",
  "PaymentRecord",
  "PaymentStatus",
  "PaymentWebhookReconciliationResult",
  "PaymentWebhookReconciliationStatus",
  "PropertyType",
  "ServiceBillingFamily",
  "ServiceBillingGuidance",
  "ServiceBillingInferenceResult",
  "ServiceBillingLineItemTemplate",
  "ServiceBillingOffering",
  "ServiceBillingOfferingId",
  "ServiceBillingPromotionSuggestion",
  "StripeKeyMode",
  "StripePaymentProviderReadinessState",
  "StripePaymentProviderStatus",
  "TechnicianInviteInput",
  "TechnicianInviteResult",
  "TechnicianLicense",
  "TechnicianLicenseBranch",
  "TechnicianLicenseInput",
  "TechnicianLicenseStatus",
  "TechnicianLicenseType",
  "TechnicianProfile",
  "TechnicianStatus",
  "UserProfile",
  "UserRole",
  "WorkOrderConversionCandidate",
];

function parse(fileName: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    readFileSync(join(packageDir(), fileName), "utf8"),
    ts.ScriptTarget.ES2022,
    true,
  );
}

function contextModuleFileNames(): string[] {
  return readdirSync(packageDir())
    .filter(
      (entry) =>
        entry.endsWith(".ts") &&
        !entry.endsWith(".test.ts") &&
        entry !== BARREL,
    )
    .sort();
}

/** Names the barrel re-exports, grouped by the module they come from. */
function barrelReExports(): Map<string, string[]> {
  const byModule = new Map<string, string[]>();

  for (const statement of parse(BARREL).statements) {
    if (!ts.isExportDeclaration(statement)) {
      throw new Error(
        `${BARREL} must contain only re-export declarations; found ` +
          ts.SyntaxKind[statement.kind],
      );
    }

    const { exportClause, moduleSpecifier } = statement;

    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
      throw new Error(`${BARREL} has a re-export with no module specifier`);
    }

    if (!exportClause || !ts.isNamedExports(exportClause)) {
      throw new Error(
        `${BARREL} re-exports "${moduleSpecifier.text}" with a wildcard; the ` +
          "public surface must stay explicit",
      );
    }

    const module = `${moduleSpecifier.text.replace(/^\.\//, "")}.ts`;
    const names = exportClause.elements.map((element) => element.name.text);
    byModule.set(module, [...(byModule.get(module) ?? []), ...names]);
  }

  return byModule;
}

/** Type and interface names a context module declares as exported. */
function moduleExports(fileName: string): string[] {
  const exported: string[] = [];

  for (const statement of parse(fileName).statements) {
    if (
      !ts.isTypeAliasDeclaration(statement) &&
      !ts.isInterfaceDeclaration(statement)
    ) {
      continue;
    }

    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );

    if (isExported) {
      exported.push(statement.name.text);
    }
  }

  return exported;
}

describe("@pest-patrol/types public surface", () => {
  it("exports exactly the frozen set of names", () => {
    const exported = [...barrelReExports().values()].flat().sort();

    expect(exported).toEqual([...PUBLIC_SURFACE].sort());
  });

  it("declares no runtime value, so every import of the package is erased", () => {
    for (const fileName of [BARREL, ...contextModuleFileNames()]) {
      for (const statement of parse(fileName).statements) {
        expect(
          ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement) ||
            ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement),
        ).toBe(true);
      }
    }
  });

  it("partitions the surface across context modules without overlap", () => {
    const seen = new Map<string, string>();

    for (const fileName of contextModuleFileNames()) {
      for (const name of moduleExports(fileName)) {
        const previous = seen.get(name);

        expect(
          previous,
          `${name} is declared in both ${previous} and ${fileName}`,
        ).toBeUndefined();

        seen.set(name, fileName);
      }
    }

    expect([...seen.keys()].sort()).toEqual([...PUBLIC_SURFACE].sort());
  });

  it("re-exports each context module's declarations from its own module", () => {
    const reExports = barrelReExports();

    for (const fileName of contextModuleFileNames()) {
      expect(
        [...(reExports.get(fileName) ?? [])].sort(),
        `${BARREL} does not re-export ${fileName}'s declarations`,
      ).toEqual(moduleExports(fileName).sort());
    }

    expect([...reExports.keys()].sort()).toEqual(contextModuleFileNames());
  });
});
