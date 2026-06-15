import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TIERS, statsFor, type Critter } from "@cc/engine";
import { theme } from "../theme";

interface Props {
  critter: Critter;
  selected?: boolean;
  onPress?: () => void;
}

const GRADE_MARK: Record<string, string> = { normal: "", plus: "+", omega: "Ω", star: "★" };

export function CritterCard({ critter, selected, onPress }: Props) {
  const stats = statsFor(critter.tier, critter.essence, critter.grade);
  const accent = theme.essence[critter.essence] ?? theme.colors.brass;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { borderColor: selected ? theme.colors.ember : theme.colors.panelEdge }]}
    >
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Text style={styles.badgeText}>{critter.essence[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.tier}>
        {TIERS[critter.tier].name}
        {GRADE_MARK[critter.grade]}
      </Text>
      <Text style={styles.stat}>ATK {stats.atk.toLocaleString()}</Text>
      <Text style={styles.stat}>DEF {stats.def.toLocaleString()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 104,
    padding: theme.space(1),
    margin: theme.space(0.5),
    borderRadius: theme.radius,
    borderWidth: 2,
    backgroundColor: theme.colors.panel,
  },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#1c1410", fontWeight: "800" },
  tier: { color: theme.colors.text, fontWeight: "700", marginTop: 6 },
  stat: { color: theme.colors.textDim, fontSize: 12 },
});
