import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TIERS, broodTotals, type Critter, type Tier } from "@cc/engine";
import { useGame } from "../state";
import { theme } from "../theme";
import { CritterCard } from "../components/CritterCard";

export function RosterScreen() {
  const { player } = useGame();
  const critters = player?.critters ?? [];

  const byTier = useMemo(() => {
    const map = new Map<Tier, Critter[]>();
    for (const c of critters) {
      const arr = map.get(c.tier) ?? [];
      arr.push(c);
      map.set(c.tier, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [critters]);

  const brood = critters.filter((c) => player?.broodIds.includes(c.id));
  const totals = broodTotals(brood);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Brood power</Text>
        <Text style={styles.big}>ATK {totals.atk.toLocaleString()}</Text>
        <Text style={styles.big}>DEF {totals.def.toLocaleString()}</Text>
        <Text style={styles.dim}>{brood.length} critters fielded</Text>
      </View>

      {byTier.map(([tier, list]) => (
        <View key={tier}>
          <Text style={styles.section}>
            {TIERS[tier].name} · {list.length}
          </Text>
          <View style={styles.grid}>
            {list.map((c) => (
              <CritterCard key={c.id} critter={c} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
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
    marginBottom: theme.space(2),
  },
  title: { color: theme.colors.brass, fontWeight: "800" },
  big: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  dim: { color: theme.colors.textDim, marginTop: 4 },
  section: { color: theme.colors.brass, fontWeight: "800", marginVertical: theme.space(1) },
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
