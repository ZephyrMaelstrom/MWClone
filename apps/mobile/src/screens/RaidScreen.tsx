import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useGame } from "../state";
import { theme } from "../theme";

interface Rival {
  id: string;
  name: string;
  level: number;
}

export function RaidScreen() {
  const { player, setPlayer } = useGame();
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const list = await api.listPlayers();
    setRivals(list.filter((p) => p.id !== player?.id));
  };

  useEffect(() => {
    load();
  }, [player?.id]);

  const raid = async (defenderId: string, name: string) => {
    if (!player) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.raid(player.id, defenderId);
      setPlayer(state);
      Alert.alert(
        outcome.win ? "Victory!" : "Repelled",
        outcome.win
          ? `You raided ${name}'s lab and took ${outcome.gristStolen.toLocaleString()} Grist.`
          : `${name}'s wards held. No Grist taken.`,
      );
    } catch (e) {
      Alert.alert("Cannot raid", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.dim}>Stamina</Text>
        <Text style={styles.big}>{player?.stamina ?? 0}</Text>
        <Text style={styles.dim}>Friendly raids: win = 10% of their un-vaulted Grist. Critters are never lost.</Text>
      </View>
      <FlatList
        data={rivals}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.dim}>No rival labs yet — invite a friend!</Text>}
        renderItem={({ item }) => (
          <View style={styles.rivalRow}>
            <Text style={styles.rivalName}>
              {item.name} <Text style={styles.dim}>Lv{item.level}</Text>
            </Text>
            <Pressable
              onPress={() => raid(item.id, item.name)}
              disabled={busy}
              style={[styles.raidBtn, busy && styles.dimBtn]}
            >
              <Text style={styles.raidText}>Raid</Text>
            </Pressable>
          </View>
        )}
      />
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
  dim: { color: theme.colors.textDim, marginTop: 4 },
  rivalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginBottom: theme.space(1),
  },
  rivalName: { color: theme.colors.text, fontWeight: "700" },
  raidBtn: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1),
    paddingHorizontal: theme.space(2),
  },
  dimBtn: { opacity: 0.4 },
  raidText: { color: "#1c1410", fontWeight: "800" },
});
