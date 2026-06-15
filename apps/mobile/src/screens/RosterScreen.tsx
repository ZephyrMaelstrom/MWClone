import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TIERS, broodTotals, type Critter, type Tier } from "@cc/engine";
import { api } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";
import { CritterCard } from "../components/CritterCard";

type Mode = "field" | "leader";

export function RosterScreen() {
  const { player, setPlayer } = useGame();
  const [mode, setMode] = useState<Mode>("field");
  const [busy, setBusy] = useState(false);
  const critters = player?.critters ?? [];
  const broodIds = useMemo(() => new Set(player?.broodIds ?? []), [player?.broodIds]);

  const byTier = useMemo(() => {
    const map = new Map<Tier, Critter[]>();
    for (const c of critters) {
      const arr = map.get(c.tier) ?? [];
      arr.push(c);
      map.set(c.tier, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [critters]);

  const brood = critters.filter((c) => broodIds.has(c.id));
  const leader = critters.find((c) => c.id === player?.leaderId);
  const totals = broodTotals(brood, leader);

  const onCard = async (c: Critter) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      if (mode === "leader") {
        if (!broodIds.has(c.id)) {
          notify("Field it first", "Only fielded critters can lead.");
          return;
        }
        setPlayer(await api.setLeader(player.id, c.id));
      } else {
        const next = new Set(broodIds);
        if (next.has(c.id)) next.delete(c.id);
        else next.add(c.id);
        setPlayer(await api.setBrood(player.id, [...next], player.leaderId));
      }
    } catch (e) {
      notify("Could not update brood", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Brood power</Text>
        <Text style={styles.big}>ATK {totals.atk.toLocaleString()}</Text>
        <Text style={styles.big}>DEF {totals.def.toLocaleString()}</Text>
        <Text style={styles.dim}>
          {brood.length} fielded · leader: {leader ? `${leader.essence} ${TIERS[leader.tier].name}` : "none"}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <ModeBtn label="Tap = field/unfield" active={mode === "field"} onPress={() => setMode("field")} />
        <ModeBtn label="Tap = set leader" active={mode === "leader"} onPress={() => setMode("leader")} />
      </View>

      {byTier.map(([tier, list]) => (
        <View key={tier}>
          <Text style={styles.section}>
            {TIERS[tier].name} · {list.length}
          </Text>
          <View style={styles.grid}>
            {list.map((c) => (
              <CritterCard
                key={c.id}
                critter={c}
                fielded={broodIds.has(c.id)}
                isLeader={c.id === player?.leaderId}
                onPress={() => onCard(c)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ModeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeBtn, active && styles.modeActive]}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.space(2), paddingBottom: theme.space(6) },
  panel: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginBottom: theme.space(1),
  },
  title: { color: theme.colors.brass, fontWeight: "800" },
  big: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  dim: { color: theme.colors.textDim, marginTop: 4 },
  modeRow: { flexDirection: "row", gap: theme.space(1), marginBottom: theme.space(1) },
  modeBtn: {
    flex: 1,
    paddingVertical: theme.space(1),
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    alignItems: "center",
  },
  modeActive: { backgroundColor: theme.colors.panel, borderColor: theme.colors.brass },
  modeText: { color: theme.colors.textDim, fontSize: 12, fontWeight: "700" },
  modeTextActive: { color: theme.colors.brass },
  section: { color: theme.colors.brass, fontWeight: "800", marginVertical: theme.space(1) },
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
