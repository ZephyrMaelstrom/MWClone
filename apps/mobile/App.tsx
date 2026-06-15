import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GameProvider, useGame } from "./src/state";
import { theme } from "./src/theme";
import { CrucibleScreen } from "./src/screens/CrucibleScreen";
import { RosterScreen } from "./src/screens/RosterScreen";
import { QuestScreen } from "./src/screens/QuestScreen";
import { RaidScreen } from "./src/screens/RaidScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

type TabKey = "crucible" | "roster" | "quest" | "raid" | "profile";
const TABS: { key: TabKey; label: string }[] = [
  { key: "crucible", label: "Crucible" },
  { key: "roster", label: "Roster" },
  { key: "quest", label: "Quest" },
  { key: "raid", label: "Raid" },
  { key: "profile", label: "Lab" },
];

function HeaderBar() {
  const { player } = useGame();
  if (!player) return null;
  return (
    <View style={styles.header}>
      <Text style={styles.headerName}>
        {player.name} · Lv{player.level}
      </Text>
      <View style={styles.currencies}>
        <Text style={styles.coin}>◈ {player.grist.toLocaleString()}</Text>
        <Text style={styles.elixir}>✦ {player.elixir}</Text>
      </View>
    </View>
  );
}

function Shell() {
  const { loading, error } = useGame();
  const [tab, setTab] = useState<TabKey>("crucible");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.ember} />
        <Text style={styles.dim}>Lighting the hearth…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not reach the lab server.</Text>
        <Text style={styles.dim}>{error}</Text>
        <Text style={styles.dim}>Start it with: pnpm -C packages/server dev</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <HeaderBar />
      <View style={styles.flex}>
        {tab === "crucible" && <CrucibleScreen />}
        {tab === "roster" && <RosterScreen />}
        {tab === "quest" && <QuestScreen />}
        {tab === "raid" && <RaidScreen />}
        {tab === "profile" && <ProfileScreen />}
      </View>
      <View style={styles.tabbar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <GameProvider>
          <Shell />
        </GameProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dim: { color: theme.colors.textDim, marginTop: 8, textAlign: "center" },
  error: { color: theme.colors.ember, fontWeight: "700" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.space(2),
    paddingVertical: theme.space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.panelEdge,
  },
  headerName: { color: theme.colors.text, fontWeight: "800" },
  currencies: { flexDirection: "row", gap: theme.space(2) },
  coin: { color: theme.colors.brass, fontWeight: "700" },
  elixir: { color: "#b39ddb", fontWeight: "700" },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelEdge,
    backgroundColor: theme.colors.panel,
  },
  tab: { flex: 1, paddingVertical: theme.space(1.5), alignItems: "center" },
  tabText: { color: theme.colors.textDim, fontWeight: "700" },
  tabActive: { color: theme.colors.ember },
});
