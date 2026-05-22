import { useMemo } from "react";
import { Text, View } from "react-native";
import { buildMobileTechnicianReadinessPanel } from "@pest-patrol/domain";
import { Button } from "@pest-patrol/ui-native";

import {
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useLanguage } from "../store/useLanguage";

interface MobileTechnicianHeaderProps {
  assignedJobCount: number;
  error?: string | null;
  onSignOut?: () => void;
  profileId?: string | null;
}

export function MobileTechnicianHeader({
  assignedJobCount,
  error,
  onSignOut,
  profileId,
}: MobileTechnicianHeaderProps) {
  const lang = useLanguage((state) => state.lang);
  const toggleLanguage = useLanguage((state) => state.toggleLanguage);
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
          <Text
            style={{
              color: mobileRouteShellPalette.accentText,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            Technician
          </Text>
          <Text
            style={{
              color: mobileRouteShellPalette.primaryText,
              fontSize: 26,
              fontWeight: "800",
            }}
          >
            {readiness.title}
          </Text>
          <Text
            style={{
              color: mobileRouteShellPalette.mutedText,
              fontSize: 14,
              marginTop: 6,
            }}
          >
            {readiness.identityLabel}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Button onPress={toggleLanguage} size="sm" variant="ghost">
            {lang === "en" ? "Español" : "English"}
          </Button>
          {onSignOut ? (
            <Button onPress={onSignOut} size="sm" variant="ghost">
              Sign out
            </Button>
          ) : null}
        </View>
      </View>

      {error ? (
        <Text
          style={{
            color: mobileRouteShellPalette.signalDanger,
            fontSize: 14,
            marginTop: 12,
          }}
        >
          {error}
        </Text>
      ) : null}

      <View
        style={{
          ...mobileRouteShellStyles.card,
          marginTop: 16,
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
          <Text
            style={{
              color: mobileRouteShellPalette.primaryText,
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            {readiness.assignedJobsLabel}
          </Text>
        </View>

        <Text
          style={{
            color: mobileRouteShellPalette.accentText,
            fontSize: 13,
            fontWeight: "800",
            marginTop: 12,
          }}
        >
          {readiness.routeFocusLabel}
        </Text>
        <Text
          style={{
            color: mobileRouteShellPalette.secondaryText,
            fontSize: 14,
            lineHeight: 20,
            marginTop: 4,
          }}
        >
          {readiness.routeFocusSummary}
        </Text>
      </View>

      <SyncStatusIndicator />
    </View>
  );
}
