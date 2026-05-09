import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import type { FormField, FormValue } from "@pest-patrol/types";

import { useFormDrafts } from "../store/useFormDrafts";
import { useLanguage } from "../store/useLanguage";

interface JobTreatmentFormProps {
  jobId: string;
}

function fieldValueToText(value: FormValue) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function FieldInput({
  field,
  onChange,
  value,
}: {
  field: FormField;
  onChange: (value: FormValue) => void;
  value: FormValue;
}) {
  if (field.type === "boolean") {
    const checked = value === true;

    return (
      <Pressable
        onPress={() => onChange(!checked)}
        style={{
          alignItems: "center",
          borderColor: checked ? "#1E3A8A" : "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row",
          gap: 10,
          minHeight: 44,
          paddingHorizontal: 12,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: checked ? "#1E3A8A" : "#FFFFFF",
            borderColor: checked ? "#1E3A8A" : "#9CA3AF",
            borderRadius: 4,
            borderWidth: 1,
            height: 20,
            justifyContent: "center",
            width: 20,
          }}
        >
          {checked ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 3,
                height: 10,
                width: 10,
              }}
            />
          ) : null}
        </View>
        <Text style={{ color: "#111827", fontSize: 14, fontWeight: "700" }}>
          {field.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      keyboardType={field.type === "number" ? "numeric" : "default"}
      multiline={field.type === "textarea"}
      onChangeText={(nextValue) => onChange(nextValue)}
      placeholder={field.placeholder ?? field.label}
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#D1D5DB",
        borderRadius: 8,
        borderWidth: 1,
        color: "#111827",
        minHeight: field.type === "textarea" ? 72 : 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        textAlignVertical: "top",
      }}
      value={fieldValueToText(value)}
    />
  );
}

export function JobTreatmentForm({ jobId }: JobTreatmentFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const { enqueueDraft, getDraft, setFieldValue } = useFormDrafts();
  const drafts = useFormDrafts((state) => state.drafts);
  const [error, setError] = useState<string | null>(null);
  const template = defaultTreatmentFormTemplate;
  const draft = useMemo(
    () => getDraft(jobId, template),
    [drafts, getDraft, jobId, template],
  );

  function handleSubmit() {
    try {
      enqueueDraft(jobId, template);
      setError(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : copy.treatment.fallbackError,
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
      <View>
        <Text style={{ color: "#111827", fontSize: 15, fontWeight: "800" }}>
          {copy.treatment.title}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {copy.treatment.description}
        </Text>
      </View>

      {template.schema.fields.map((field) => (
        <View key={field.id} style={{ gap: 6 }}>
          {field.type === "boolean" ? null : (
            <Text style={{ color: "#374151", fontSize: 13, fontWeight: "700" }}>
              {field.label}
              {field.required ? " *" : ""}
            </Text>
          )}
          <FieldInput
            field={field}
            onChange={(value) => {
              setFieldValue(jobId, field.id, value, template);
              setError(null);
            }}
            value={draft.values[field.id]}
          />
        </View>
      ))}

      {error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queued_at ? (
        <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
          {copy.common.queuedForSync}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        style={{
          alignItems: "center",
          backgroundColor: "#111827",
          borderRadius: 8,
          justifyContent: "center",
          minHeight: 44,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
          {copy.treatment.queueButton}
        </Text>
      </Pressable>
    </View>
  );
}
