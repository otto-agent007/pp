import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { buildMobileTechnicianReadinessPanel } from "@pest-patrol/domain";

import {
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useLanguage } from "../store/useLanguage";

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
          <Pressable
            onPress={toggleLanguage}
            style={{
              ...mobileRouteShellStyles.control,
              borderColor: mobileRouteShellPalette.border,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: mobileRouteShellPalette.primaryText,
                fontSize: 13,
                fontWeight: "800",
              }}
            >
              {lang === "en" ? "Español" : "English"}
            </Text>
          </Pressable>
          {onSignOut ? (
            <Pressable
              onPress={onSignOut}
              style={{
                ...mobileRouteShellStyles.control,
                borderColor: mobileRouteShellPalette.border,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color: mobileRouteShellPalette.primaryText,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                Sign out
              </Text>
            </Pressable>
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
          {onRefreshJobs ? (
            <Pressable
              onPress={onRefreshJobs}
              style={{
                ...mobileRouteShellStyles.control,
                backgroundColor: mobileRouteShellPalette.rail,
              }}
            >
              <Text
                style={{
                  color: mobileRouteShellPalette.inverseText,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                Refresh
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text
          style={{
            color: mobileRouteShellPalette.accentText,
            fontSize: 13,
            fontWeight: "800",
            marginTop: 12,
          }}
        >
          {readiness.demoNextLabel}
        </Text>
        <Text
          style={{
            color: mobileRouteShellPalette.secondaryText,
            fontSize: 14,
            lineHeight: 20,
            marginTop: 4,
          }}
        >
          {readiness.demoNextSummary}
        </Text>
      </View>

      <SyncStatusIndicator />
    </View>
  );
}
