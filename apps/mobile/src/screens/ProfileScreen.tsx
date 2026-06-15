import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, type DailyView, type EggType, type EventType, type Reward, type SkillKey } from "../api";
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

const EGGS: { type: EggType; label: string; cost: number }[] = [
  { type: "crucible", label: "Crucible Egg", cost: 5 },
  { type: "refined", label: "Refined Egg", cost: 50 },
  { type: "opus", label: "Opus Egg (Gold+)", cost: 300 },
];

function rewardText(r?: Reward): string {
  if (!r) return "";
  const parts: string[] = [];
  if (r.grist) parts.push(`${r.grist.toLocaleString()} Grist`);
  if (r.elixir) parts.push(`${r.elixir} Elixir`);
  if (r.reagents) parts.push(`${r.reagents} Reagent`);
  if (r.critterTier) parts.push(`a tier-${r.critterTier} critter`);
  return parts.join(", ");
}

export function ProfileScreen() {
  const { player, setPlayer, resetProgress, newProfile } = useGame();
  const [busy, setBusy] = useState(false);
  const [daily, setDaily] = useState<DailyView | null>(null);
  const [showOps, setShowOps] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("cc.adminToken").then((t) => t && setAdminToken(t));
  }, []);

  const saveToken = (t: string) => {
    setAdminToken(t);
    AsyncStorage.setItem("cc.adminToken", t).catch(() => {});
  };

  const startEvent = async (type: EventType, value: number, name: string, hours: number) => {
    if (!adminToken) {
      notify("No token", "Enter your operator token first.");
      return;
    }
    try {
      await api.adminStartEvent(adminToken, { type, value, name, hours });
      notify("Event started", `${name} for ${hours}h`);
    } catch (e) {
      notify("Could not start", (e as Error).message);
    }
  };

  const clearEvents = async () => {
    try {
      await api.adminClearEvents(adminToken);
      notify("Events cleared", "");
    } catch (e) {
      notify("Could not clear", (e as Error).message);
    }
  };

  const loadDaily = useCallback(async () => {
    if (!player) return;
    try {
      setDaily(await api.daily(player.id));
    } catch {
      /* ignore */
    }
  }, [player?.id]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

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

  const claimMission = async (missionId: string) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { reward, state } = await api.claimMission(player.id, missionId);
      setPlayer(state);
      await loadDaily();
      notify("Claimed", rewardText(reward));
    } catch (e) {
      notify("Cannot claim", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const claimAttendance = async () => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { result, state } = await api.attendanceClaim(player.id);
      setPlayer(state);
      await loadDaily();
      notify(`Day ${result.day}`, rewardText(result.reward));
    } catch (e) {
      notify("Cannot claim", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const spin = async () => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { result, state } = await api.rouletteSpin(player.id);
      setPlayer(state);
      await loadDaily();
      notify("Roulette", `You won ${rewardText(result.reward)}!`);
    } catch (e) {
      notify("Cannot spin", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const buyEgg = async (type: EggType) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { outcome, state } = await api.buyEgg(player.id, type);
      setPlayer(state);
      notify("Egg hatched!", `A tier-${outcome.critter.tier} ${outcome.critter.essence}${outcome.pity ? " (pity!)" : ""}`);
    } catch (e) {
      notify("Cannot buy", (e as Error).message);
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

      <Text style={styles.heading}>Daily</Text>
      <View style={styles.panel}>
        <View style={styles.rowBtns}>
          <Pressable onPress={claimAttendance} disabled={busy || !player?.attendanceAvailable} style={[styles.smallBtn, (busy || !player?.attendanceAvailable) && styles.dim2]}>
            <Text style={styles.smallText}>{player?.attendanceAvailable ? "Claim attendance" : "Attendance ✓"}</Text>
          </Pressable>
          <Pressable onPress={spin} disabled={busy || !player?.rouletteAvailable} style={[styles.smallBtn, (busy || !player?.rouletteAvailable) && styles.dim2]}>
            <Text style={styles.smallText}>{player?.rouletteAvailable ? "Free roulette" : "Roulette ✓"}</Text>
          </Pressable>
        </View>
        {daily?.missions.map((m) => (
          <View key={m.id} style={styles.skillRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skillLabel}>{m.label}</Text>
              <Text style={styles.hint}>
                {m.progress}/{m.target} · {rewardText(m.reward)}
              </Text>
            </View>
            <Pressable
              onPress={() => claimMission(m.id)}
              disabled={busy || !m.done || m.claimed}
              style={[styles.claimMini, (busy || !m.done || m.claimed) && styles.dim2]}
            >
              <Text style={styles.claimMiniText}>{m.claimed ? "✓" : "Claim"}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Eggs · {player?.elixir ?? 0} Elixir</Text>
      <View style={styles.panel}>
        {EGGS.map((e) => (
          <View key={e.type} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{e.label}</Text>
            <Pressable
              onPress={() => buyEgg(e.type)}
              disabled={busy || (player?.elixir ?? 0) < e.cost}
              style={[styles.claimMini, (busy || (player?.elixir ?? 0) < e.cost) && styles.dim2]}
            >
              <Text style={styles.claimMiniText}>{e.cost} ✦</Text>
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

      <Pressable onPress={() => setShowOps((v) => !v)} style={styles.opsToggle}>
        <Text style={styles.opsToggleText}>{showOps ? "▾ Operator tools" : "▸ Operator tools"}</Text>
      </Pressable>
      {showOps && (
        <View style={styles.panel}>
          <Text style={styles.hint}>Run live events for your group (needs your server's ADMIN_TOKEN).</Text>
          <TextInput
            value={adminToken}
            onChangeText={saveToken}
            placeholder="Operator token"
            placeholderTextColor={theme.colors.textDim}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable onPress={() => startEvent("merge_success", 0.2, "Merge Frenzy", 48)} style={[styles.smallBtn, styles.opsBtn]}>
            <Text style={styles.smallText}>Merge Event +20% (48h)</Text>
          </Pressable>
          <Pressable onPress={() => startEvent("double_grist", 2, "Double Grist", 24)} style={[styles.smallBtn, styles.opsBtn]}>
            <Text style={styles.smallText}>Double Grist (24h)</Text>
          </Pressable>
          <Pressable onPress={() => startEvent("boss_frenzy", 2, "Aberration Frenzy", 24)} style={[styles.smallBtn, styles.opsBtn]}>
            <Text style={styles.smallText}>Boss Frenzy ×2 (24h)</Text>
          </Pressable>
          <Pressable onPress={clearEvents} style={[styles.button, styles.danger]}>
            <Text style={styles.buttonText}>Clear all events</Text>
          </Pressable>
        </View>
      )}
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
  rowBtns: { flexDirection: "row", gap: theme.space(1), marginBottom: theme.space(1) },
  smallBtn: {
    flex: 1,
    backgroundColor: theme.colors.brass,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1),
    alignItems: "center",
  },
  smallText: { color: "#1c1410", fontWeight: "700", fontSize: 12 },
  claimMini: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1),
    paddingHorizontal: theme.space(2),
  },
  claimMiniText: { color: "#1c1410", fontWeight: "800", fontSize: 12 },
  opsToggle: { paddingVertical: theme.space(1), alignItems: "center" },
  opsToggleText: { color: theme.colors.textDim, fontWeight: "700" },
  opsBtn: { marginBottom: theme.space(1) },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: theme.space(1),
    marginBottom: theme.space(1),
  },
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
