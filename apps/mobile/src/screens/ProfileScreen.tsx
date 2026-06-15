import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGame } from "../state";
import { theme } from "../theme";

export function ProfileScreen() {
  const { player, resetProgress, newProfile } = useGame();
  const [busy, setBusy] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      "Reset progress?",
      "This wipes your critters, Grist and levels back to a fresh start. Your profile id is kept. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await resetProgress();
              Alert.alert("Fresh start", "Your lab has been wiped clean.");
            } catch (e) {
              Alert.alert("Could not reset", (e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const confirmNew = () => {
    Alert.alert("Start a new profile?", "Abandons this profile and creates a brand-new one.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New profile",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await newProfile();
          } catch (e) {
            Alert.alert("Could not create", (e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>{player?.name}</Text>
        <Row label="Level" value={String(player?.level ?? 0)} />
        <Row label="Grist" value={(player?.grist ?? 0).toLocaleString()} />
        <Row label="Elixir" value={String(player?.elixir ?? 0)} />
        <Row label="Critters" value={String(player?.critters.length ?? 0)} />
        <Row label="Residue shards" value={String(player?.residueShards ?? 0)} />
        <Text style={styles.idText}>id: {player?.id}</Text>
      </View>

      <Pressable onPress={confirmReset} disabled={busy} style={[styles.button, styles.warn]}>
        <Text style={styles.buttonText}>Reset Progress</Text>
      </Pressable>
      <Pressable onPress={confirmNew} disabled={busy} style={[styles.button, styles.danger]}>
        <Text style={styles.buttonText}>Start New Profile</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.space(2) },
  panel: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginBottom: theme.space(2),
  },
  title: { color: theme.colors.brass, fontWeight: "800", fontSize: 18, marginBottom: theme.space(1) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { color: theme.colors.textDim },
  value: { color: theme.colors.text, fontWeight: "700" },
  idText: { color: theme.colors.textDim, fontSize: 11, marginTop: theme.space(1) },
  button: {
    borderRadius: theme.radius,
    paddingVertical: theme.space(2),
    alignItems: "center",
    marginBottom: theme.space(1),
  },
  warn: { backgroundColor: theme.colors.brass },
  danger: { backgroundColor: "#a23b2c" },
  buttonText: { color: "#1c1410", fontWeight: "800" },
});
