import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import type { ChemicalInventoryItem } from "@pest-patrol/types";
import { CaptureButton, CaptureSection } from "@pest-patrol/ui-native";

import { useChemicalInventory } from "../store/useChemicalInventory";
import { useChemicalLogs } from "../store/useChemicalLogs";
import { useLanguage } from "../store/useLanguage";
import { mobileCaptureControlStyles } from "../styles/routeShellStyles";

interface JobChemicalLogFormProps {
  jobId: string;
}

function chemicalLabel(item: ChemicalInventoryItem) {
  return `${item.name} (${item.unit})`;
}

export function JobChemicalLogForm({ jobId }: JobChemicalLogFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const { error: inventoryError, items, load, status } = useChemicalInventory();
  const { getDraft, queueLog, setDraftField } = useChemicalLogs();
  const drafts = useChemicalLogs((state) => state.drafts);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(jobId), [drafts, getDraft, jobId]);

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

      {error ? (
        <Text style={mobileCaptureControlStyles.errorText}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {copy.common.queuedForSync}
        </Text>
      ) : null}

      <CaptureButton
        disabled={items.length === 0}
        onPress={handleQueue}
        style={
          items.length === 0
            ? mobileCaptureControlStyles.disabledButton
            : undefined
        }
        variant="primary"
      >
        {copy.chemical.queueButton}
      </CaptureButton>
    </CaptureSection>
  );
}
