import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { TIERS } from "@cc/engine";
import { api } from "../api";
import { useGame } from "../state";
import { theme } from "../theme";

export function QuestScreen() {
  const { player, setPlayer } = useGame();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const runQuest = async () => {
    if (!player) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.quest(player.id);
      setPlayer(state);
      const line = outcome.captured
        ? `+${outcome.gristGained} Grist, +${outcome.xpGained} XP — captured a ${TIERS[outcome.captured.tier].name} ${outcome.captured.essence}!`
        : `+${outcome.gristGained} Grist, +${outcome.xpGained} XP`;
      setLog((l) => [line, ...l].slice(0, 12));
    } catch (e) {
      Alert.alert("Cannot quest", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    if (!player) return;
    const { gained, state } = await api.claim(player.id);
    setPlayer(state);
    setLog((l) => [`Collected ${gained.toLocaleString()} Grist from your apparatus`, ...l].slice(0, 12));
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.dim}>Energy</Text>
        <Text style={styles.big}>{player?.energy ?? 0}</Text>
        <Text style={styles.dim}>Idle Grist waiting: {player?.pendingIdleGrist?.toLocaleString() ?? 0}</Text>
      </View>

      <Pressable onPress={runQuest} disabled={busy} style={[styles.button, busy && styles.dimBtn]}>
        <Text style={styles.buttonText}>Quest (−5 Energy)</Text>
      </Pressable>
      <Pressable onPress={claim} style={[styles.button, styles.secondary]}>
        <Text style={styles.buttonText}>Collect Apparatus Grist</Text>
      </Pressable>

      <Text style={styles.section}>Journal</Text>
      {log.map((l, i) => (
        <Text key={i} style={styles.logLine}>
          • {l}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.space(2), flex: 1 },
  panel: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginBottom: theme.space(2),
  },
  big: { color: theme.colors.text, fontSize: 22, fontWeight: "800" },
  dim: { color: theme.colors.textDim },
  button: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(2),
    alignItems: "center",
    marginBottom: theme.space(1),
  },
  secondary: { backgroundColor: theme.colors.brass },
  dimBtn: { opacity: 0.4 },
  buttonText: { color: "#1c1410", fontWeight: "800" },
  section: { color: theme.colors.brass, fontWeight: "800", marginVertical: theme.space(1) },
  logLine: { color: theme.colors.textDim, marginBottom: 4 },
});
