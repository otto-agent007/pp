import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import type { FormField, FormValue } from "@pest-patrol/types";
import { CaptureButton, CaptureSection } from "@pest-patrol/ui-native";

import { useFormDrafts } from "../store/useFormDrafts";
import { useLanguage } from "../store/useLanguage";
import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
} from "../styles/routeShellStyles";

interface JobTreatmentFormProps {
  jobId: string;
}

function fieldValueToText(value: FormValue) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
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
      <CaptureButton
        onPress={() => onChange(!checked)}
        variant="secondary"
        style={{
          alignItems: "center",
          borderColor: checked
            ? mobileRouteShellPalette.rail
            : mobileRouteShellPalette.borderStrong,
          flexDirection: "row",
          gap: 10,
          justifyContent: "flex-start",
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: checked
              ? mobileRouteShellPalette.rail
              : mobileRouteShellPalette.surface,
            borderColor: checked
              ? mobileRouteShellPalette.rail
              : mobileRouteShellPalette.borderStrong,
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
                backgroundColor: mobileRouteShellPalette.inverseText,
                borderRadius: 3,
                height: 10,
                width: 10,
              }}
            />
          ) : null}
        </View>
        <Text style={mobileCaptureControlStyles.secondaryButtonText}>
          {field.label}
        </Text>
      </CaptureButton>
    );
  }

  return (
    <TextInput
      keyboardType={field.type === "number" ? "numeric" : "default"}
      multiline={field.type === "textarea"}
      onChangeText={(nextValue) => onChange(nextValue)}
      placeholder={field.placeholder ?? field.label}
      style={{
        ...mobileCaptureControlStyles.input,
        ...(field.type === "textarea"
          ? mobileCaptureControlStyles.inputMultiline
          : {}),
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
    <CaptureSection>
      <View>
        <Text style={mobileCaptureControlStyles.title}>
          {copy.treatment.title}
        </Text>
        <Text style={mobileCaptureControlStyles.warningBody}>
          {copy.treatment.description}
        </Text>
      </View>

      {template.schema.fields.map((field) => (
        <View key={field.id} style={{ gap: 6 }}>
          {field.type === "boolean" ? null : (
            <Text style={mobileCaptureControlStyles.fieldLabel}>
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
        <Text style={mobileCaptureControlStyles.errorText}>{error}</Text>
      ) : null}
      {draft.queued_at ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {copy.common.queuedForSync}
        </Text>
      ) : null}

      <CaptureButton onPress={handleSubmit} variant="primary">
        {copy.treatment.queueButton}
      </CaptureButton>
    </CaptureSection>
  );
}
