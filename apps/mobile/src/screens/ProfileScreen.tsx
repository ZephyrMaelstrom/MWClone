import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type SkillKey } from "../api";
import { useGame } from "../state";
import { confirmDialog, notify } from "../dialog";
import { theme } from "../theme";

const SKILLS: { key: SkillKey; label: string; hint: string }[] = [
  { key: "stamina", label: "Stamina", hint: "more raids/bosses (recommended)" },
  { key: "energy", label: "Energy", hint: "more quests (recommended)" },
  { key: "hp", label: "Health", hint: "survive raids" },
  { key: "attack", label: "Attack", hint: "flat ATK (critters give more)" },
  { key: "defense", label: "Defense", hint: "flat DEF (critters give more)" },
];

export function ProfileScreen() {
  const { player, setPlayer, resetProgress, newProfile } = useGame();
  const [busy, setBusy] = useState(false);

  const spend = async (stat: SkillKey) => {
    if (!player || player.skillPoints <= 0 || busy) return;
    setBusy(true);
    try {
      setPlayer(await api.spendSkill(player.id, stat));
    } catch (e) {
      notify("Cannot spend", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    const ok = await confirmDialog(
      "Reset progress?",
      "This wipes your critters, Grist and levels back to a fresh start. Your profile id is kept. This cannot be undone.",
      "Reset",
      true,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await resetProgress();
      notify("Fresh start", "Your lab has been wiped clean.");
    } catch (e) {
      notify("Could not reset", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmNew = async () => {
    const ok = await confirmDialog(
      "Start a new profile?",
      "Abandons this profile and creates a brand-new one.",
      "New profile",
      true,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await newProfile();
    } catch (e) {
      notify("Could not create", (e as Error).message);
    } finally {
      setBusy(false);
    }
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

      <Text style={styles.heading}>Skill points · {player?.skillPoints ?? 0} to spend</Text>
      <View style={styles.panel}>
        {SKILLS.map((s) => (
          <View key={s.key} style={styles.skillRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skillLabel}>
                {s.label} <Text style={styles.dim}>+{player?.skills?.[s.key] ?? 0}</Text>
              </Text>
              <Text style={styles.hint}>{s.hint}</Text>
            </View>
            <Pressable
              onPress={() => spend(s.key)}
              disabled={busy || (player?.skillPoints ?? 0) <= 0}
              style={[styles.plus, (busy || (player?.skillPoints ?? 0) <= 0) && styles.dim2]}
            >
              <Text style={styles.plusText}>＋</Text>
            </Pressable>
          </View>
        ))}
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
  dim: { color: theme.colors.textDim },
  heading: { color: theme.colors.brass, fontWeight: "800", marginBottom: theme.space(1) },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space(1),
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelEdge,
  },
  skillLabel: { color: theme.colors.text, fontWeight: "700" },
  hint: { color: theme.colors.textDim, fontSize: 11 },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { color: "#1c1410", fontWeight: "800", fontSize: 20 },
  dim2: { opacity: 0.35 },
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
