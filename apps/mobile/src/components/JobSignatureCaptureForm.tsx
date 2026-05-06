import { useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

import { useJobSignatures } from "../store/useJobSignatures";

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
          : "Unable to queue signature",
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
        Signature
      </Text>

      <TextInput
        onChangeText={(value) => {
          setSignerName(jobId, value);
          setError(null);
        }}
        placeholder="Signer name"
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
        <SignatureCanvas
          autoClear={false}
          clearText="Clear"
          confirmText="Queue"
          descriptionText=""
          onEmpty={() => {
            setError("Signature is required");
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
          Signature queued for sync
        </Text>
      ) : null}
    </View>
  );
}
