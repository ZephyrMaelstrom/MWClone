import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TIERS } from "@cc/engine";
import { api } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";

function mmss(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function QuestScreen() {
  const { player, setPlayer, refresh } = useGame();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Local 1s ticker for the "next energy" countdown; resync from server on hit.
  useEffect(() => {
    setCountdown(player?.energyNext ?? 0);
  }, [player?.energyNext, player?.energy]);

  useEffect(() => {
    if (!player || player.energy >= player.energyMax) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refresh(); // a point should have regenerated — pull fresh state
          return player.energyNext;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [player, refresh]);

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
      notify("Cannot quest", (e as Error).message);
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

  const full = !!player && player.energy >= player.energyMax;
  const canQuest = !!player && player.energy >= 5;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.dim}>Energy</Text>
        <Text style={styles.big}>
          {player?.energy ?? 0}
          <Text style={styles.max}> / {player?.energyMax ?? 0}</Text>
        </Text>
        <Text style={styles.dim}>
          {full ? "Full" : `+1 in ${mmss(countdown)}`} · 5 Energy per quest
        </Text>
        <Text style={[styles.dim, styles.idle]}>
          Idle Grist waiting: {player?.pendingIdleGrist?.toLocaleString() ?? 0}
        </Text>
      </View>

      <Pressable onPress={runQuest} disabled={busy || !canQuest} style={[styles.button, (busy || !canQuest) && styles.dimBtn]}>
        <Text style={styles.buttonText}>{canQuest ? "Quest (−5 Energy)" : "Not enough Energy"}</Text>
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
  max: { color: theme.colors.textDim, fontSize: 16, fontWeight: "600" },
  dim: { color: theme.colors.textDim },
  idle: { marginTop: theme.space(1) },
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
