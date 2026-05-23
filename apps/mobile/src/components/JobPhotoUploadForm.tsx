import { useMemo, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CaptureButton, CaptureSection } from "@pest-patrol/ui-native";

import { useLanguage } from "../store/useLanguage";
import { useJobPhotos } from "../store/useJobPhotos";
import { mobileCaptureControlStyles } from "../styles/routeShellStyles";

interface JobPhotoUploadFormProps {
  jobId: string;
}

interface PhotoActionButtonsProps {
  cameraLabel: string;
  libraryLabel: string;
  onCamera: () => void;
  onLibrary: () => void;
}

function getAssetFileName(asset: ImagePicker.ImagePickerAsset) {
  return asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
}

export function PhotoActionButtons({
  cameraLabel,
  libraryLabel,
  onCamera,
  onLibrary,
}: PhotoActionButtonsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <CaptureButton
        onPress={onCamera}
        variant="primary"
        style={{
          flex: 1,
        }}
      >
        {cameraLabel}
      </CaptureButton>
      <CaptureButton
        onPress={onLibrary}
        variant="secondary"
        style={{
          flex: 1,
        }}
      >
        {libraryLabel}
      </CaptureButton>
    </View>
  );
}

export function JobPhotoUploadForm({ jobId }: JobPhotoUploadFormProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const { getDraft, queuePhoto, setDescription } = useJobPhotos();
  const drafts = useJobPhotos((state) => state.drafts);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(jobId), [drafts, getDraft, jobId]);
  const lastPhoto = draft.queuedPhotos[draft.queuedPhotos.length - 1];

  async function queueAsset(asset: ImagePicker.ImagePickerAsset) {
    try {
      queuePhoto({
        jobId,
        localUri: asset.uri,
        fileName: getAssetFileName(asset),
        contentType: asset.mimeType,
      });
      setError(null);
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : copy.photos.fallbackError,
      );
    }
  }

  async function handleCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError(copy.photos.cameraPermissionError);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      await queueAsset(result.assets[0]);
    }
  }

  async function handleLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(copy.photos.libraryPermissionError);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      await queueAsset(result.assets[0]);
    }
  }

  return (
    <CaptureSection>
      <Text style={mobileCaptureControlStyles.title}>{copy.photos.title}</Text>
      <Text style={mobileCaptureControlStyles.warningBody}>
        {copy.photos.description}
      </Text>

      {lastPhoto ? (
        <Image
          source={{ uri: lastPhoto.local_uri }}
          style={{
            ...mobileCaptureControlStyles.preview,
            height: 140,
            width: "100%",
          }}
        />
      ) : null}

      <TextInput
        onChangeText={(value) => {
          setDescription(jobId, value);
          setError(null);
        }}
        placeholder={copy.photos.descriptionPlaceholder}
        style={mobileCaptureControlStyles.input}
        value={draft.description}
      />

      {error ? (
        <Text style={mobileCaptureControlStyles.errorText}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {copy.common.queuedForSync}
        </Text>
      ) : null}

      <PhotoActionButtons
        cameraLabel={copy.photos.camera}
        libraryLabel={copy.photos.library}
        onCamera={() => void handleCamera()}
        onLibrary={() => void handleLibrary()}
      />
    </CaptureSection>
  );
}
