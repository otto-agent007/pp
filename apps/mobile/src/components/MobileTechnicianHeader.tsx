import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { brand, semantic } from "@pest-patrol/ui-tokens";
import { buildMobileTechnicianReadinessPanel } from "@pest-patrol/domain";

import { SyncStatusIndicator } from "./SyncStatusIndicator";

interface MobileTechnicianHeaderProps {
  assignedJobCount: number;
  error?: string | null;
  onRefreshJobs?: () => void;
  onSignOut?: () => void;
  profileId?: string | null;
}

export function MobileTechnicianHeader({
  assignedJobCount,
  error,
  onRefreshJobs,
  onSignOut,
  profileId,
}: MobileTechnicianHeaderProps) {
  const readiness = useMemo(
    () =>
      buildMobileTechnicianReadinessPanel({
        assignedJobCount,
        profileId,
      }),
    [assignedJobCount, profileId],
  );

  return (
    <View>
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: brand.primary, fontSize: 13, fontWeight: "700" }}>
            Technician
          </Text>
          <Text style={{ color: semantic.text.primary, fontSize: 26, fontWeight: "800" }}>
            {readiness.title}
          </Text>
          <Text style={{ color: semantic.text.muted, fontSize: 14, marginTop: 6 }}>
            {readiness.identityLabel}
          </Text>
        </View>

        {onSignOut ? (
          <Pressable
            onPress={onSignOut}
            style={{
              alignItems: "center",
              borderColor: semantic.border.default,
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 40,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: semantic.text.primary, fontSize: 13, fontWeight: "800" }}>
              Sign out
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: semantic.status.danger.fg, fontSize: 14, marginTop: 12 }}>
          {error}
        </Text>
      ) : null}

      <View
        style={{
          backgroundColor: semantic.background.surface,
          borderColor: semantic.border.subtle,
          borderRadius: 8,
          borderWidth: 1,
          marginTop: 16,
          padding: 14,
        }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: semantic.text.primary, fontSize: 16, fontWeight: "800" }}>
            {readiness.assignedJobsLabel}
          </Text>
          {onRefreshJobs ? (
            <Pressable
              onPress={onRefreshJobs}
              style={{
                alignItems: "center",
                backgroundColor: semantic.background.inverse,
                borderRadius: 8,
                justifyContent: "center",
                minHeight: 36,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: semantic.text.inverse, fontSize: 13, fontWeight: "800" }}>
                Refresh
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={{ color: brand.primary, fontSize: 13, fontWeight: "800", marginTop: 12 }}>
          {readiness.demoNextLabel}
        </Text>
        <Text style={{ color: semantic.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
          {readiness.demoNextSummary}
        </Text>
      </View>

      <SyncStatusIndicator />
    </View>
  );
}
