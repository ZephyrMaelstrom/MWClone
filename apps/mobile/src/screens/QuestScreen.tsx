import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TIERS } from "@cc/engine";
import { api, type Catalog } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";
import { FloatingReward, TapScale } from "../components/anim";

function mmss(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function QuestScreen() {
  const { player, setPlayer, refresh } = useGame();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [reward, setReward] = useState({ text: "", seq: 0 });

  useEffect(() => {
    api.catalog().then(setCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    setCountdown(player?.energyNext ?? 0);
  }, [player?.energyNext, player?.energy]);

  useEffect(() => {
    if (!player || player.energy >= player.energyMax) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refresh();
          return player.energyNext;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [player, refresh]);

  const addLog = (line: string) => setLog((l) => [line, ...l].slice(0, 12));

  const runQuest = async () => {
    if (!player) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.quest(player.id);
      setPlayer(state);
      setReward({ text: `+${outcome.gristGained} Grist`, seq: reward.seq + 1 });
      addLog(
        outcome.captured
          ? `+${outcome.gristGained} Grist, +${outcome.xpGained} XP — captured a ${TIERS[outcome.captured.tier].name} ${outcome.captured.essence}!`
          : `+${outcome.gristGained} Grist, +${outcome.xpGained} XP`,
      );
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
    addLog(`Collected ${gained.toLocaleString()} Grist from your apparatus`);
  };

  const buy = async (apparatusId: string) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { state } = await api.buyApparatus(player.id, apparatusId);
      setPlayer(state);
    } catch (e) {
      notify("Cannot build", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deposit = async (amount: number) => {
    if (!player || amount <= 0) return;
    try {
      const { state } = await api.vaultDeposit(player.id, amount);
      setPlayer(state);
    } catch (e) {
      notify("Cannot deposit", (e as Error).message);
    }
  };

  const withdrawAll = async () => {
    if (!player || player.vaultGrist <= 0) return;
    try {
      setPlayer(await api.vaultWithdraw(player.id, player.vaultGrist));
    } catch (e) {
      notify("Cannot withdraw", (e as Error).message);
    }
  };

  const full = !!player && player.energy >= player.energyMax;
  const canQuest = !!player && player.energy >= 5;
  const growth = catalog?.apparatusCostGrowth ?? 0.1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.panel, styles.relative]}>
        <FloatingReward trigger={reward.seq} text={reward.text} />
        <Text style={styles.dim}>Energy</Text>
        <Text style={styles.big}>
          {player?.energy ?? 0}
          <Text style={styles.max}> / {player?.energyMax ?? 0}</Text>
        </Text>
        <Text style={styles.dim}>{full ? "Full" : `+1 in ${mmss(countdown)}`} · 5 Energy per quest</Text>
      </View>

      <TapScale onPress={runQuest} disabled={busy || !canQuest} style={[styles.button, (busy || !canQuest) && styles.dimBtn]}>
        <Text style={styles.buttonText}>{canQuest ? "Quest (−5 Energy)" : "Not enough Energy"}</Text>
      </TapScale>

      {/* Vault */}
      <Text style={styles.section}>Vault</Text>
      <View style={styles.panel}>
        <Text style={styles.dim}>Carried (raidable): <Text style={styles.val}>{player?.grist.toLocaleString()}</Text></Text>
        <Text style={styles.dim}>Vaulted (safe): <Text style={styles.val}>{player?.vaultGrist.toLocaleString()}</Text></Text>
        <Text style={styles.fine}>Deposit fee {Math.round((catalog?.vaultFeeFraction ?? 0.05) * 100)}% · withdraw is free</Text>
        <View style={styles.rowBtns}>
          <SmallBtn label="Vault 50%" onPress={() => deposit(Math.floor((player?.grist ?? 0) / 2))} />
          <SmallBtn label="Vault all" onPress={() => deposit(player?.grist ?? 0)} />
          <SmallBtn label="Withdraw all" onPress={withdrawAll} />
        </View>
      </View>

      {/* Apparatus */}
      <Text style={styles.section}>Apparatus · {player?.gristPerHour?.toLocaleString() ?? 0} Grist/hr</Text>
      <View style={styles.panel}>
        <Text style={styles.dim}>Idle Grist waiting: {player?.pendingIdleGrist?.toLocaleString() ?? 0}</Text>
        <Pressable onPress={claim} style={[styles.button, styles.secondary, styles.claimBtn]}>
          <Text style={styles.buttonText}>Collect Grist</Text>
        </Pressable>
        {catalog?.apparatus.map((a) => {
          const owned = player?.apparatus[a.id] ?? 0;
          const cost = Math.round(a.baseCost + a.baseCost * growth * owned);
          const afford = (player?.grist ?? 0) >= cost;
          return (
            <View key={a.id} style={styles.appRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>
                  {a.name} <Text style={styles.dim}>×{owned}</Text>
                </Text>
                <Text style={styles.fine}>+{a.gristPerHour}/hr · cost {cost.toLocaleString()}</Text>
              </View>
              <Pressable onPress={() => buy(a.id)} disabled={!afford || busy} style={[styles.buyBtn, (!afford || busy) && styles.dimBtn]}>
                <Text style={styles.buyText}>Build</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.section}>Journal</Text>
      {log.map((l, i) => (
        <Text key={i} style={styles.logLine}>• {l}</Text>
      ))}
    </ScrollView>
  );
}

function SmallBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.smallBtn}>
      <Text style={styles.smallText}>{label}</Text>
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
  relative: { position: "relative", overflow: "hidden" },
  big: { color: theme.colors.text, fontSize: 22, fontWeight: "800" },
  max: { color: theme.colors.textDim, fontSize: 16, fontWeight: "600" },
  val: { color: theme.colors.text, fontWeight: "700" },
  dim: { color: theme.colors.textDim, marginTop: 2 },
  fine: { color: theme.colors.textDim, fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(2),
    alignItems: "center",
    marginBottom: theme.space(1),
  },
  claimBtn: { marginTop: theme.space(1), marginBottom: 0, paddingVertical: theme.space(1.5) },
  secondary: { backgroundColor: theme.colors.brass },
  dimBtn: { opacity: 0.4 },
  buttonText: { color: "#1c1410", fontWeight: "800" },
  section: { color: theme.colors.brass, fontWeight: "800", marginTop: theme.space(2), marginBottom: theme.space(1) },
  rowBtns: { flexDirection: "row", gap: theme.space(1), marginTop: theme.space(1) },
  smallBtn: {
    flex: 1,
    backgroundColor: theme.colors.brass,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1),
    alignItems: "center",
  },
  smallText: { color: "#1c1410", fontWeight: "700", fontSize: 12 },
  appRow: { flexDirection: "row", alignItems: "center", paddingVertical: theme.space(1), borderTopWidth: 1, borderTopColor: theme.colors.panelEdge },
  appName: { color: theme.colors.text, fontWeight: "700" },
  buyBtn: { backgroundColor: theme.colors.ember, borderRadius: theme.radius, paddingVertical: theme.space(1), paddingHorizontal: theme.space(2) },
  buyText: { color: "#1c1410", fontWeight: "800" },
  logLine: { color: theme.colors.textDim, marginBottom: 4 },
});
