import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { semantic } from "@pest-patrol/ui-tokens";

import { useJobPhotos } from "../store/useJobPhotos";

interface JobPhotoUploadFormProps {
  jobId: string;
}

function getAssetFileName(asset: ImagePicker.ImagePickerAsset) {
  return asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
}

export function JobPhotoUploadForm({ jobId }: JobPhotoUploadFormProps) {
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
        photoError instanceof Error ? photoError.message : "Unable to queue photo",
      );
    }
  }

  async function handleCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError("Camera permission is required");
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
      setError("Photo library permission is required");
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
    <View
      style={{
        borderColor: semantic.border.subtle,
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={{ color: semantic.text.primary, fontSize: 15, fontWeight: "800" }}>
        Photos
      </Text>
      <Text style={{ color: semantic.text.muted, fontSize: 13 }}>
        Capture clear before, during, or after photos. Each photo queues on this
        device and syncs when service is available.
      </Text>

      {lastPhoto ? (
        <Image
          source={{ uri: lastPhoto.local_uri }}
          style={{
            backgroundColor: semantic.background.subtle,
            borderRadius: 8,
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
        placeholder="Description"
        style={{
          backgroundColor: semantic.background.surface,
          borderColor: semantic.border.default,
          borderRadius: 8,
          borderWidth: 1,
          color: semantic.text.primary,
          minHeight: 44,
          paddingHorizontal: 12,
        }}
        value={draft.description}
      />

      {error ? (
        <Text style={{ color: semantic.status.danger.fg, fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={{ color: semantic.status.success.solid, fontSize: 13, fontWeight: "700" }}>
          Queued locally for sync
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => void handleCamera()}
          style={{
            alignItems: "center",
            backgroundColor: semantic.background.inverse,
            borderRadius: 8,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
          }}
        >
          <Text style={{ color: semantic.text.inverse, fontSize: 14, fontWeight: "800" }}>
            Camera
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void handleLibrary()}
          style={{
            alignItems: "center",
            borderColor: semantic.border.default,
            borderRadius: 8,
            borderWidth: 1,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
          }}
        >
          <Text style={{ color: semantic.text.primary, fontSize: 14, fontWeight: "800" }}>
            Library
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
