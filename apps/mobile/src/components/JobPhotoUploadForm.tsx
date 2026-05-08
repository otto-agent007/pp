import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

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
        borderColor: "#E5E7EB",
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "800" }}>
        Photos
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13 }}>
        Capture clear before, during, or after photos. Each photo queues on this
        device and syncs when service is available.
      </Text>

      {lastPhoto ? (
        <Image
          source={{ uri: lastPhoto.local_uri }}
          style={{
            backgroundColor: "#F3F4F6",
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
          backgroundColor: "#FFFFFF",
          borderColor: "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          color: "#111827",
          minHeight: 44,
          paddingHorizontal: 12,
        }}
        value={draft.description}
      />

      {error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.queuedAt ? (
        <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
          Queued locally for sync
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => void handleCamera()}
          style={{
            alignItems: "center",
            backgroundColor: "#111827",
            borderRadius: 8,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
            Camera
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void handleLibrary()}
          style={{
            alignItems: "center",
            borderColor: "#D1D5DB",
            borderRadius: 8,
            borderWidth: 1,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
          }}
        >
          <Text style={{ color: "#111827", fontSize: 14, fontWeight: "800" }}>
            Library
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
