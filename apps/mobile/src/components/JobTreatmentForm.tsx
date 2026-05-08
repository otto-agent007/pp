import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { brand, palette, semantic } from "@pest-patrol/ui-tokens";
import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import type { FormField, FormValue } from "@pest-patrol/types";

import { useFormDrafts } from "../store/useFormDrafts";

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
          borderColor: checked ? brand.primary : semantic.border.default,
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
            backgroundColor: checked ? brand.primary : semantic.background.surface,
            borderColor: checked ? brand.primary : palette.gray[400],
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
                backgroundColor: semantic.background.surface,
                borderRadius: 3,
                height: 10,
                width: 10,
              }}
            />
          ) : null}
        </View>
        <Text style={{ color: semantic.text.primary, fontSize: 14, fontWeight: "700" }}>
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
        backgroundColor: semantic.background.surface,
        borderColor: semantic.border.default,
        borderRadius: 8,
        borderWidth: 1,
        color: semantic.text.primary,
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
          : "Unable to queue treatment form",
      );
    }
  }

  return (
    <View
      style={{
        borderColor: semantic.border.subtle,
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <View>
        <Text style={{ color: semantic.text.primary, fontSize: 15, fontWeight: "800" }}>
          Treatment form
        </Text>
        <Text style={{ color: semantic.text.muted, fontSize: 13, marginTop: 4 }}>
          Record the field notes before leaving the stop. Queued forms stay on
          this device and sync when the connection is ready.
        </Text>
      </View>

      {template.schema.fields.map((field) => (
        <View key={field.id} style={{ gap: 6 }}>
          {field.type === "boolean" ? null : (
            <Text style={{ color: semantic.text.secondary, fontSize: 13, fontWeight: "700" }}>
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
        <Text style={{ color: semantic.status.danger.fg, fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queued_at ? (
        <Text style={{ color: semantic.status.success.solid, fontSize: 13, fontWeight: "700" }}>
          Queued locally for sync
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        style={{
          alignItems: "center",
          backgroundColor: semantic.background.inverse,
          borderRadius: 8,
          justifyContent: "center",
          minHeight: 44,
        }}
      >
        <Text style={{ color: semantic.text.inverse, fontSize: 14, fontWeight: "800" }}>
          Queue form
        </Text>
      </Pressable>
    </View>
  );
}
