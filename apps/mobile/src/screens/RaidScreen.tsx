import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type ArenaOpponent, type ArenaStandings } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";

interface Rival {
  id: string;
  name: string;
  level: number;
  isGhost: boolean;
}

type Mode = "raids" | "exhibition";

export function RaidScreen() {
  const { player, setPlayer } = useGame();
  const [mode, setMode] = useState<Mode>("raids");
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [opps, setOpps] = useState<ArenaOpponent[]>([]);
  const [board, setBoard] = useState<ArenaStandings | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRivals = useCallback(async () => {
    const list = await api.listPlayers();
    setRivals(list.filter((p) => p.id !== player?.id));
  }, [player?.id]);

  const loadArena = useCallback(async () => {
    if (!player) return;
    try {
      setOpps(await api.arenaOpponents(player.id));
      setBoard(await api.arenaStandings());
    } catch {
      /* ignore */
    }
  }, [player?.id]);

  useEffect(() => {
    loadRivals();
  }, [loadRivals]);
  useEffect(() => {
    if (mode === "exhibition") loadArena();
  }, [mode, loadArena]);

  const raid = async (defenderId: string, name: string) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.raid(player.id, defenderId);
      setPlayer(state);
      notify(
        outcome.win ? "Victory!" : "Repelled",
        outcome.win
          ? `You raided ${name}'s lab and took ${outcome.gristStolen.toLocaleString()} Grist.`
          : `${name}'s wards held. No Grist taken.`,
      );
    } catch (e) {
      notify("Cannot raid", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exhibit = async (opponentId: string, name: string) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { result, state } = await api.arenaFight(player.id, opponentId);
      setPlayer(state);
      await loadArena();
      notify(
        result.win ? "Exhibition won!" : "Exhibition lost",
        `${name}: rating ${result.ratingBefore} → ${result.ratingAfter}, +${result.renown} Renown`,
      );
    } catch (e) {
      notify("Cannot fight", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renownShop = async () => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { critter } = await api.renownShop(player.id);
      setPlayer(await api.getPlayer(player.id));
      notify("Renown Egg", `Hatched a tier-${critter.tier} ${critter.essence}!`);
    } catch (e) {
      notify("Renown shop", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode("raids")} style={[styles.modeBtn, mode === "raids" && styles.modeOn]}>
          <Text style={[styles.modeText, mode === "raids" && styles.modeTextOn]}>Raids</Text>
        </Pressable>
        <Pressable onPress={() => setMode("exhibition")} style={[styles.modeBtn, mode === "exhibition" && styles.modeOn]}>
          <Text style={[styles.modeText, mode === "exhibition" && styles.modeTextOn]}>Exhibition</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.dim}>Stamina</Text>
        <Text style={styles.big}>
          {player?.stamina ?? 0}
          <Text style={styles.max}> / {player?.staminaMax ?? 0}</Text>
        </Text>
        {mode === "raids" ? (
          <Text style={styles.dim}>Friendly raids: win = 10% of their un-vaulted Grist. Critters are never lost.</Text>
        ) : (
          <Text style={styles.dim}>
            Ranked ladder · your rating {player?.arenaRating ?? 1000} · {player?.arenaWins ?? 0} wins this season
          </Text>
        )}
      </View>

      {mode === "raids" &&
        rivals.map((item) => (
          <View key={item.id} style={styles.rivalRow}>
            <Text style={styles.rivalName}>
              {item.isGhost ? "👻 " : ""}
              {item.name} <Text style={styles.dim}>Lv{item.level}</Text>
            </Text>
            <Pressable onPress={() => raid(item.id, item.name)} disabled={busy} style={[styles.actBtn, busy && styles.dimBtn]}>
              <Text style={styles.actText}>Raid</Text>
            </Pressable>
          </View>
        ))}

      {mode === "exhibition" && (
        <>
          {opps.map((o) => (
            <View key={o.id} style={styles.rivalRow}>
              <Text style={styles.rivalName}>
                {o.isGhost ? "👻 " : ""}
                {o.name} <Text style={styles.dim}>· {o.rating}</Text>
              </Text>
              <Pressable onPress={() => exhibit(o.id, o.name)} disabled={busy} style={[styles.actBtn, busy && styles.dimBtn]}>
                <Text style={styles.actText}>Fight</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={renownShop} disabled={busy} style={[styles.shopBtn, busy && styles.dimBtn]}>
            <Text style={styles.actText}>Renown Egg — 800 ({player?.renown ?? 0} Renown)</Text>
          </Pressable>

          <Text style={styles.heading}>Standings{board ? ` · season ${board.seasonId}` : ""}</Text>
          <View style={styles.panel}>
            {board?.rows.map((r, i) => (
              <View key={r.id} style={styles.rowLine}>
                <Text style={styles.rivalName}>
                  {i + 1}. {r.isGhost ? "👻 " : ""}{r.name}
                </Text>
                <Text style={styles.dim}>{r.rating}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.space(2), paddingBottom: theme.space(6) },
  modeRow: { flexDirection: "row", gap: theme.space(1), marginBottom: theme.space(2) },
  modeBtn: { flex: 1, paddingVertical: theme.space(1), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.panelEdge, alignItems: "center" },
  modeOn: { borderColor: theme.colors.brass },
  modeText: { color: theme.colors.textDim, fontWeight: "700" },
  modeTextOn: { color: theme.colors.brass },
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
  dim: { color: theme.colors.textDim, marginTop: 4 },
  heading: { color: theme.colors.brass, fontWeight: "800", marginBottom: theme.space(1) },
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
  rowLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rivalName: { color: theme.colors.text, fontWeight: "700" },
  actBtn: { backgroundColor: theme.colors.ember, borderRadius: theme.radius, paddingVertical: theme.space(1), paddingHorizontal: theme.space(2) },
  shopBtn: { backgroundColor: theme.colors.brass, borderRadius: theme.radius, paddingVertical: theme.space(1.5), alignItems: "center", marginBottom: theme.space(2) },
  dimBtn: { opacity: 0.4 },
  actText: { color: "#1c1410", fontWeight: "800" },
});
