import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { TIERS, canTransmute, catalystCost, gristCost, successRate, type Critter, type Tier } from "@cc/engine";
import { api, type TransmuteOutcome } from "../api";
import { useGame } from "../state";
import { theme } from "../theme";
import { CritterCard } from "../components/CritterCard";
import { CrucibleArt } from "../components/CrucibleArt";
import { notify } from "../dialog";

export function CrucibleScreen() {
  const { player, setPlayer } = useGame();
  const [picked, setPicked] = useState<string[]>([]);
  const [catalyst, setCatalyst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<TransmuteOutcome | null>(null);
  const [mergeBonus, setMergeBonus] = useState(0);
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    api
      .events()
      .then((evs) => {
        const merges = evs.filter((e) => e.type === "merge_success");
        const bonus = Math.min(0.4, merges.reduce((a, e) => a + e.value, 0));
        setMergeBonus(bonus);
        setEventName(merges[0]?.name ?? null);
      })
      .catch(() => {});
  }, []);

  const critters = player?.critters ?? [];

  // Only critters of the currently-picked tier are selectable together.
  const lockTier = useMemo(() => {
    if (picked.length === 0) return null;
    return critters.find((c) => c.id === picked[0])?.tier ?? null;
  }, [picked, critters]);

  const selectable = (c: Critter) =>
    canTransmute(c.tier) && (lockTier === null || c.tier === lockTier);

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  };

  const ready = picked.length === 2;
  const resultTier: Tier | null = lockTier ? ((lockTier + 1) as Tier) : null;
  const rate = resultTier
    ? catalyst
      ? 1
      : Math.min(0.95, successRate(resultTier) + mergeBonus)
    : 0;

  const transmute = async () => {
    if (!player || !ready) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.transmute(player.id, picked[0]!, picked[1]!, catalyst);
      setPlayer(state);
      setLast(outcome);
      setPicked([]);
    } catch (e) {
      notify("The brew refused", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mergeBonus > 0 && (
        <View style={styles.eventBanner}>
          <Text style={styles.eventText}>
            🔥 {eventName ?? "Merge Event"}: +{Math.round(mergeBonus * 100)}% success
          </Text>
        </View>
      )}
      <View style={styles.vessel}>
        <CrucibleArt slag={last ? !last.success : false} />
        <Text style={styles.hint}>
          {ready
            ? `Transmute two ${TIERS[lockTier!].name} → ${TIERS[resultTier!].name}`
            : "Drop two same-tier critters into the crucible"}
        </Text>
      </View>

      {resultTier && (
        <View style={styles.panel}>
          <Row label="Result" value={TIERS[resultTier].name} />
          <Row label="Success" value={`${Math.round(rate * 100)}%`} />
          <Row label="Grist" value={gristCost(resultTier).toLocaleString()} />
          {catalyst && <Row label="Catalyst" value={`${catalystCost(resultTier)} Elixir`} />}
          <View style={styles.catalystRow}>
            <Text style={styles.label}>Use Catalyst (guarantee)</Text>
            <Switch value={catalyst} onValueChange={setCatalyst} />
          </View>
        </View>
      )}

      <Pressable
        onPress={transmute}
        disabled={!ready || busy}
        style={[styles.button, (!ready || busy) && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{busy ? "Brewing…" : "Stoke the Crucible"}</Text>
      </Pressable>

      {last && (
        <Text style={[styles.outcome, { color: last.success ? theme.colors.success : theme.colors.danger }]}>
          {last.success
            ? `✦ Transmuted into ${TIERS[last.outcomeCritter!.tier].name}!`
            : `✗ The brew curdled into Slag (+${last.shardsGained} shard)`}
        </Text>
      )}

      <Text style={styles.section}>Your Critters</Text>
      <View style={styles.grid}>
        {critters.map((c) => (
          <View key={c.id} style={!selectable(c) && styles.dim}>
            <CritterCard
              critter={c}
              selected={picked.includes(c.id)}
              onPress={selectable(c) ? () => toggle(c.id) : undefined}
            />
          </View>
        ))}
      </View>
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
  container: { padding: theme.space(2), paddingBottom: theme.space(6) },
  eventBanner: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    padding: theme.space(1),
    alignItems: "center",
    marginBottom: theme.space(1),
  },
  eventText: { color: "#1c1410", fontWeight: "800" },
  vessel: { alignItems: "center", marginBottom: theme.space(1) },
  hint: { color: theme.colors.textDim, marginTop: theme.space(1), textAlign: "center" },
  panel: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginVertical: theme.space(1),
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  catalystRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.space(1),
  },
  label: { color: theme.colors.textDim },
  value: { color: theme.colors.text, fontWeight: "700" },
  button: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(2),
    alignItems: "center",
    marginVertical: theme.space(1),
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#1c1410", fontWeight: "800", fontSize: 16 },
  outcome: { textAlign: "center", fontWeight: "700", marginVertical: theme.space(1) },
  section: { color: theme.colors.brass, fontWeight: "800", marginTop: theme.space(2), marginBottom: theme.space(1) },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dim: { opacity: 0.35 },
});
