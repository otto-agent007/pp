import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import type { ChemicalInventoryItem } from "@pest-patrol/types";
import { CaptureButton, CaptureSection } from "@pest-patrol/ui-native";

import { useChemicalInventory } from "../store/useChemicalInventory";
import { useChemicalLogs } from "../store/useChemicalLogs";
import { useFormDrafts } from "../store/useFormDrafts";
import { useLanguage } from "../store/useLanguage";
import { useSyncStatus } from "../store/useSyncStatus";
import { mobileCaptureControlStyles } from "../styles/routeShellStyles";

interface JobChemicalLogFormProps {
  jobId: string;
}

function chemicalLabel(item: ChemicalInventoryItem) {
  return `${item.name} (${item.unit})`;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseAmount(value: string) {
  if (!value.trim()) {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

export function JobChemicalLogForm({ jobId }: JobChemicalLogFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const networkStatus = useSyncStatus((state) => state.networkStatus);
  const treatmentDraft = useFormDrafts((state) =>
    state.getDraft(jobId, defaultTreatmentFormTemplate),
  );
  const { error: inventoryError, items, load, status } = useChemicalInventory();
  const { getDraft, queueLog, setDraftField } = useChemicalLogs();
  const drafts = useChemicalLogs((state) => state.drafts);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(jobId), [drafts, getDraft, jobId]);
  const selectedChemical = useMemo(
    () => items.find((item) => item.id === draft.chemicalId) ?? null,
    [draft.chemicalId, items],
  );
  const amount = parseAmount(draft.amount);
  const hasAmount = amount !== null && amount > 0;
  const hasContext =
    hasText(treatmentDraft.values.target_pests) &&
    hasText(treatmentDraft.values.areas_treated);
  const validationError =
    !selectedChemical
      ? copy.chemical.validation.productRequired
      : !hasText(selectedChemical.unit)
        ? copy.chemical.validation.unitRequired
        : !hasAmount
          ? copy.chemical.validation.amountRequired
          : !hasContext
            ? copy.chemical.validation.targetContextRequired
            : null;
  const displayMessage = error ?? validationError;
  const canQueue =
    status !== "loading" && items.length > 0 && validationError === null;

  useEffect(() => {
    if (status === "idle") {
      void load();
    }
  }, [load, status]);

  useEffect(() => {
    if (!draft.chemicalId && items[0]) {
      setDraftField(jobId, "chemicalId", items[0].id);
    }
  }, [draft.chemicalId, items, jobId, setDraftField]);

  function handleQueue() {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      queueLog(jobId);
      setError(null);
    } catch (queueError) {
      setError(
        queueError instanceof Error
          ? queueError.message
          : copy.chemical.fallbackError,
      );
    }
  }

  return (
    <CaptureSection>
      <Text style={mobileCaptureControlStyles.title}>
        {copy.chemical.title}
      </Text>
      <Text style={mobileCaptureControlStyles.warningBody}>
        {copy.chemical.description}
      </Text>

      {status === "loading" ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <ActivityIndicator color={mobileCaptureControlStyles.title.color} />
          <Text style={mobileCaptureControlStyles.warningBody}>
            {copy.chemical.loading}
          </Text>
        </View>
      ) : null}

      {status === "error" ? (
        <Text style={mobileCaptureControlStyles.errorText}>
          {inventoryError}
        </Text>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <Text style={mobileCaptureControlStyles.warningBody}>
          {copy.chemical.empty}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {items.map((item) => {
            const isActive = draft.chemicalId === item.id;

            return (
              <CaptureButton
                key={item.id}
                onPress={() => {
                  setDraftField(jobId, "chemicalId", item.id);
                  setError(null);
                }}
                variant={isActive ? "primary" : "secondary"}
                style={{
                  minHeight: 40,
                }}
              >
                {chemicalLabel(item)}
              </CaptureButton>
            );
          })}
        </View>
      ) : null}

      <TextInput
        keyboardType="numeric"
        onChangeText={(value) => {
          setDraftField(jobId, "amount", value);
          setError(null);
        }}
        placeholder={copy.chemical.amountPlaceholder}
        style={mobileCaptureControlStyles.input}
        value={draft.amount}
      />
      <TextInput
        multiline
        onChangeText={(value) => {
          setDraftField(jobId, "notes", value);
          setError(null);
        }}
        placeholder={copy.chemical.notesPlaceholder}
        style={{
          ...mobileCaptureControlStyles.input,
          ...mobileCaptureControlStyles.inputMultiline,
          minHeight: 64,
        }}
        value={draft.notes}
      />

      {networkStatus === "offline" ? (
        <Text style={mobileCaptureControlStyles.warningBody}>
          {copy.chemical.validation.offlineReconcileNote}
        </Text>
      ) : null}

      {displayMessage ? (
        <Text
          style={
            error || validationError
              ? mobileCaptureControlStyles.errorText
              : mobileCaptureControlStyles.warningBody
          }
        >
          {displayMessage}
        </Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {copy.common.savedOffline}
        </Text>
      ) : null}

      <CaptureButton
        disabled={!canQueue}
        onPress={handleQueue}
        style={
          !canQueue ? mobileCaptureControlStyles.disabledButton : undefined
        }
        variant="primary"
      >
        {copy.chemical.queueButton}
      </CaptureButton>
    </CaptureSection>
  );
}
