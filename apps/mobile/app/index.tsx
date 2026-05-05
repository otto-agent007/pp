import { Text, View } from "react-native";

import { useLanguage } from "../src/store/useLanguage";

export default function MobileHomeScreen() {
  const { t } = useLanguage();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#F9FAFB",
      }}
    >
      <Text style={{ color: "#111827", fontSize: 28, fontWeight: "700" }}>
        {t.dashboard.title}
      </Text>
      <Text style={{ color: "#4B5563", fontSize: 16, marginTop: 8 }}>
        {t.dashboard.welcome}
      </Text>
    </View>
  );
}
