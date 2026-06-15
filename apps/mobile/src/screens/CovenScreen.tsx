import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, type ChatMessage, type CovenView, type LeaderboardRow, type Reward } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";
import { ChatBox } from "../components/ChatBox";
import { AnimatedBar } from "../components/anim";

type Board = "level" | "power" | "boss";

function rewardText(r?: Reward): string {
  if (!r) return "";
  const parts: string[] = [];
  if (r.grist) parts.push(`${r.grist.toLocaleString()} Grist`);
  if (r.elixir) parts.push(`${r.elixir} Elixir`);
  if (r.reagents) parts.push(`${r.reagents} Reagent`);
  return parts.join(", ");
}

export function CovenScreen() {
  const { player, setPlayer } = useGame();
  const [coven, setCoven] = useState<CovenView | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<Board>("power");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [worldMsgs, setWorldMsgs] = useState<ChatMessage[]>([]);
  const [covenMsgs, setCovenMsgs] = useState<ChatMessage[]>([]);

  const loadCoven = useCallback(async () => {
    if (!player) return;
    try {
      setCoven(await api.coven(player.id));
    } catch {
      /* ignore */
    }
  }, [player?.id]);

  const loadBoard = useCallback(async () => {
    try {
      setRows((await api.leaderboard(board)).rows);
    } catch {
      /* ignore */
    }
  }, [board]);

  useEffect(() => {
    loadCoven();
  }, [loadCoven]);
  useEffect(() => {
    loadBoard();
    const t = setInterval(loadBoard, 12000);
    return () => clearInterval(t);
  }, [loadBoard]);

  const loadChats = useCallback(async () => {
    if (!player) return;
    try {
      setWorldMsgs(await api.worldChat());
      if (player.covenId) setCovenMsgs(await api.covenChat(player.id));
    } catch {
      /* ignore */
    }
  }, [player?.id, player?.covenId]);

  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 10000);
    return () => clearInterval(t);
  }, [loadChats]);

  const sendWorld = async (text: string) => {
    if (!player) return;
    setWorldMsgs(await api.postWorldChat(player.id, text));
  };
  const sendCoven = async (text: string) => {
    if (!player) return;
    setCovenMsgs(await api.postCovenChat(player.id, text));
  };

  const wrap = async (fn: () => Promise<{ coven: CovenView | null; state: typeof player }>) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { coven: c, state } = await fn();
      if (state) setPlayer(state);
      setCoven(c);
    } catch (e) {
      notify("Coven", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const create = () => wrap(() => api.createCoven(player!.id, name || "New Coven"));
  const join = () => wrap(() => api.joinCoven(player!.id, code));
  const leave = () => wrap(() => api.leaveCoven(player!.id));
  const summon = () => wrap(() => api.summonHomunculus(player!.id));

  const attack = async () => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { result, coven: c, state } = await api.attackHomunculus(player.id);
      setPlayer(state);
      setCoven(c);
      if (result.defeated) notify("Homunculus down!", `Rewards: ${rewardText(result.reward)}`);
    } catch (e) {
      notify("Coven", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const boss = coven?.boss;
  const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!coven ? (
        <View style={styles.panel}>
          <Text style={styles.title}>Found or join a Coven</Text>
          <Text style={styles.fine}>Packmates raise your fielded-critter cap. Founding costs 1,000 Grist.</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Coven name" placeholderTextColor={theme.colors.textDim} style={styles.input} />
          <Pressable onPress={create} disabled={busy} style={[styles.button, busy && styles.dim]}>
            <Text style={styles.buttonText}>Found Coven</Text>
          </Pressable>
          <TextInput value={code} onChangeText={setCode} placeholder="Invite code" autoCapitalize="characters" placeholderTextColor={theme.colors.textDim} style={styles.input} />
          <Pressable onPress={join} disabled={busy} style={[styles.button, styles.secondary, busy && styles.dim]}>
            <Text style={styles.buttonText}>Join with code</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.panel}>
            <Text style={styles.title}>{coven.name}</Text>
            <Text style={styles.code}>Invite code: {coven.code}</Text>
            <Text style={styles.fine}>Your fielded cap: {player?.maxFielded}</Text>
            {coven.members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.member}>
                  {m.id === coven.leaderId ? "★ " : ""}
                  {m.name} <Text style={styles.fine}>Lv{m.level}</Text>
                </Text>
                <Text style={styles.power}>{m.power.toLocaleString()}</Text>
              </View>
            ))}
            <Pressable onPress={leave} disabled={busy} style={[styles.button, styles.danger, busy && styles.dim]}>
              <Text style={styles.buttonText}>Leave Coven</Text>
            </Pressable>
          </View>

          <Text style={styles.heading}>Homunculus</Text>
          <View style={styles.panel}>
            {boss ? (
              <>
                <AnimatedBar pct={hpPct} color={theme.colors.danger} height={16} />
                <Text style={styles.fine}>{Math.max(0, boss.hp).toLocaleString()} / {boss.maxHp.toLocaleString()} HP</Text>
                <Pressable onPress={attack} disabled={busy} style={[styles.button, busy && styles.dim]}>
                  <Text style={styles.buttonText}>Attack (−1 Stamina)</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.fine}>No Homunculus loose. Summon one for the coven (2,000 Grist + 1 Reagent).</Text>
                <Pressable onPress={summon} disabled={busy} style={[styles.button, busy && styles.dim]}>
                  <Text style={styles.buttonText}>Summon Homunculus</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}

      <Text style={styles.heading}>Leaderboard</Text>
      <View style={styles.modeRow}>
        {(["power", "level", "boss"] as Board[]).map((b) => (
          <Pressable key={b} onPress={() => setBoard(b)} style={[styles.modeBtn, board === b && styles.modeActive]}>
            <Text style={[styles.modeText, board === b && styles.modeTextActive]}>{b}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.panel}>
        {rows.map((r, i) => (
          <View key={r.id} style={styles.memberRow}>
            <Text style={styles.member}>
              {i + 1}. {r.isGhost ? "👻 " : ""}{r.name}
            </Text>
            <Text style={styles.power}>{r.value.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {coven && <ChatBox title="Coven chat" messages={covenMsgs} onSend={sendCoven} />}
      <ChatBox title="World chat" messages={worldMsgs} onSend={sendWorld} />
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
  title: { color: theme.colors.brass, fontWeight: "800", fontSize: 18 },
  code: { color: theme.colors.ember, fontWeight: "800", marginTop: 4 },
  heading: { color: theme.colors.brass, fontWeight: "800", marginBottom: theme.space(1) },
  fine: { color: theme.colors.textDim, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: theme.space(1),
    marginVertical: theme.space(1),
  },
  button: {
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1.5),
    alignItems: "center",
    marginTop: theme.space(1),
  },
  secondary: { backgroundColor: theme.colors.brass },
  danger: { backgroundColor: "#a23b2c" },
  dim: { opacity: 0.4 },
  buttonText: { color: "#1c1410", fontWeight: "800" },
  memberRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  member: { color: theme.colors.text, fontWeight: "700" },
  power: { color: theme.colors.textDim, fontWeight: "700" },
  barTrack: { height: 16, backgroundColor: theme.colors.bg, borderRadius: 8, overflow: "hidden" },
  barFill: { height: 16, backgroundColor: theme.colors.danger },
  modeRow: { flexDirection: "row", gap: theme.space(1), marginBottom: theme.space(1) },
  modeBtn: { flex: 1, paddingVertical: theme.space(1), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.panelEdge, alignItems: "center" },
  modeActive: { borderColor: theme.colors.brass },
  modeText: { color: theme.colors.textDim, fontWeight: "700", fontSize: 12 },
  modeTextActive: { color: theme.colors.brass },
});
