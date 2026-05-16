import { useMemo, useRef, useState, type ReactElement } from "react";
import { Text, TextInput, View } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

import { useLanguage } from "../store/useLanguage";
import { useJobSignatures } from "../store/useJobSignatures";
import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
} from "../styles/routeShellStyles";

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
    border: 1px solid ${mobileRouteShellPalette.borderStrong};
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
    background-color: ${mobileRouteShellPalette.rail};
    border-radius: 8px;
    color: ${mobileRouteShellPalette.inverseText};
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
    <View style={mobileCaptureControlStyles.section}>
      <Text style={mobileCaptureControlStyles.title}>
        {copy.signature.title}
      </Text>
      <Text style={mobileCaptureControlStyles.warningBody}>
        {copy.signature.description}
      </Text>

      <TextInput
        onChangeText={(value) => {
          setSignerName(jobId, value);
          setError(null);
        }}
        placeholder={copy.signature.signerPlaceholder}
        style={mobileCaptureControlStyles.input}
        value={draft.signerName}
      />

      <View
        style={{
          ...mobileCaptureControlStyles.preview,
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
          penColor={mobileRouteShellPalette.primaryText}
          ref={signatureRef as never}
          webStyle={signatureWebStyle}
        />
      </View>

      {error ? (
        <Text style={mobileCaptureControlStyles.errorText}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {copy.signature.queuedForSync}
        </Text>
      ) : null}
    </View>
  );
}
