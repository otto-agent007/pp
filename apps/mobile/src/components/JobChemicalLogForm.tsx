import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import type { ChemicalInventoryItem } from "@pest-patrol/types";

import { useChemicalInventory } from "../store/useChemicalInventory";
import { useChemicalLogs } from "../store/useChemicalLogs";
import { useLanguage } from "../store/useLanguage";

interface JobChemicalLogFormProps {
  jobId: string;
}

function chemicalLabel(item: ChemicalInventoryItem) {
  return `${item.name} (${item.unit})`;
}

export function JobChemicalLogForm({ jobId }: JobChemicalLogFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const {
    error: inventoryError,
    items,
    load,
    status,
  } = useChemicalInventory();
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
    <View
      style={{
        borderColor: "#E5E7EB",
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "800" }}>
        {copy.chemical.title}
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13 }}>
        {copy.chemical.description}
      </Text>

      {status === "loading" ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <ActivityIndicator color="#1E3A8A" />
          <Text style={{ color: "#6B7280", fontSize: 13 }}>
            {copy.chemical.loading}
          </Text>
        </View>
      ) : null}

      {status === "error" ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{inventoryError}</Text>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <Text style={{ color: "#6B7280", fontSize: 13 }}>
          {copy.chemical.empty}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {items.map((item) => {
            const isActive = draft.chemicalId === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setDraftField(jobId, "chemicalId", item.id);
                  setError(null);
                }}
                style={{
                  backgroundColor: isActive ? "#1E3A8A" : "#FFFFFF",
                  borderColor: isActive ? "#1E3A8A" : "#D1D5DB",
                  borderRadius: 8,
                  borderWidth: 1,
                  justifyContent: "center",
                  minHeight: 40,
                  paddingHorizontal: 10,
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#FFFFFF" : "#111827",
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {chemicalLabel(item)}
                </Text>
              </Pressable>
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
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          color: "#111827",
          minHeight: 44,
          paddingHorizontal: 12,
        }}
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
          backgroundColor: "#FFFFFF",
          borderColor: "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          color: "#111827",
          minHeight: 64,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: "top",
        }}
        value={draft.notes}
      />

      {error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
          {copy.common.queuedForSync}
        </Text>
      ) : null}

      <Pressable
        disabled={items.length === 0}
        onPress={handleQueue}
        style={{
          alignItems: "center",
          backgroundColor: items.length === 0 ? "#9CA3AF" : "#111827",
          borderRadius: 8,
          justifyContent: "center",
          minHeight: 44,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
          {copy.chemical.queueButton}
        </Text>
      </Pressable>
    </View>
  );
}
