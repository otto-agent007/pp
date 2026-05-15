import { useMemo, useRef, useState, type ReactElement } from "react";
import { Text, TextInput, View } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

import { useLanguage } from "../store/useLanguage";
import { useJobSignatures } from "../store/useJobSignatures";

const SignatureCanvasComponent = SignatureCanvas as unknown as (
  props: Record<string, unknown>,
) => ReactElement | null;

interface SignatureCanvasHandle {
  clearSignature: () => void;
  readSignature: () => void;
}

interface JobSignatureCaptureFormProps {
  jobId: string;
}

const signatureWebStyle = `
  .m-signature-pad {
    border: 1px solid #D1D5DB;
    box-shadow: none;
  }
  .m-signature-pad--body {
    border: 0;
  }
  .m-signature-pad--footer {
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }
  .button {
    background-color: #111827;
    border-radius: 8px;
    color: #FFFFFF;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    height: 40px;
    line-height: 40px;
  }
`;

export function JobSignatureCaptureForm({
  jobId,
}: JobSignatureCaptureFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const signatureRef = useRef<SignatureCanvasHandle | null>(null);
  const { getDraft, queueSignature, setSignerName } = useJobSignatures();
  const drafts = useJobSignatures((state) => state.drafts);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(jobId), [drafts, getDraft, jobId]);

  function handleSignature(signature: string) {
    try {
      queueSignature({
        jobId,
        localUri: signature,
      });
      signatureRef.current?.clearSignature();
      setError(null);
    } catch (signatureError) {
      setError(
        signatureError instanceof Error
          ? signatureError.message
          : copy.signature.fallbackError,
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
        {copy.signature.title}
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13 }}>
        {copy.signature.description}
      </Text>

      <TextInput
        onChangeText={(value) => {
          setSignerName(jobId, value);
          setError(null);
        }}
        placeholder={copy.signature.signerPlaceholder}
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          color: "#111827",
          minHeight: 44,
          paddingHorizontal: 12,
        }}
        value={draft.signerName}
      />

      <View
        style={{
          backgroundColor: "#FFFFFF",
          height: 220,
          overflow: "hidden",
        }}
      >
        <SignatureCanvasComponent
          autoClear={false}
          clearText={copy.signature.clear}
          confirmText={copy.signature.queue}
          descriptionText=""
          onEmpty={() => {
            setError(copy.signature.requiredError);
          }}
          onOK={handleSignature}
          penColor="#111827"
          ref={signatureRef as never}
          webStyle={signatureWebStyle}
        />
      </View>

      {error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
          {copy.signature.queuedForSync}
        </Text>
      ) : null}
    </View>
  );
}
