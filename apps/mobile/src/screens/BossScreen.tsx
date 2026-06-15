import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type BossView, type Reward } from "../api";
import { useGame } from "../state";
import { notify } from "../dialog";
import { theme } from "../theme";
import { AnimatedBar, FloatingReward, TapScale } from "../components/anim";

const MODES: { mode: number; label: string; ap: number }[] = [
  { mode: 1, label: "1× hit", ap: 1 },
  { mode: 10, label: "10× hit", ap: 4 },
  { mode: 50, label: "50× hit", ap: 10 },
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

export function BossScreen() {
  const { player, setPlayer } = useGame();
  const [boss, setBoss] = useState<BossView | null>(null);
  const [busy, setBusy] = useState(false);
  const [hit, setHit] = useState({ dmg: 0, seq: 0 });

  const loadBoss = useCallback(async () => {
    try {
      setBoss(await api.boss());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadBoss();
    const t = setInterval(loadBoss, 10000); // others are hitting it too
    return () => clearInterval(t);
  }, [loadBoss]);

  const attack = async (mode: number) => {
    if (!player || busy) return;
    setBusy(true);
    try {
      const { result, state } = await api.attackBoss(player.id, mode);
      setPlayer(state);
      setHit({ dmg: result.damage, seq: hit.seq + 1 });
      await loadBoss();
      if (result.defeated) {
        notify("The Aberration falls!", `Rewards: ${rewardText(result.reward)}. A tougher one rises…`);
      }
    } catch (e) {
      notify("Cannot attack", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.panel, styles.bossPanel]}>
        <FloatingReward trigger={hit.seq} text={`-${hit.dmg.toLocaleString()}`} color={theme.colors.ember} />
        <Text style={styles.title}>{boss?.name ?? "The Aberration"}</Text>
        <Text style={styles.level}>Level {boss?.level ?? "—"} · shared world boss</Text>
        <AnimatedBar pct={hpPct} color={theme.colors.danger} height={16} />
        <Text style={styles.hp}>
          {boss ? `${Math.max(0, boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()} HP` : "…"}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.dim}>
          Boss AP <Text style={styles.val}>{player?.bossAp ?? 0}</Text> / {player?.bossApMax ?? 0}
        </Text>
        <Text style={styles.fine}>Bigger hits are more AP-efficient. Save AP and unload.</Text>
        <View style={styles.modes}>
          {MODES.map((m) => {
            const can = (player?.bossAp ?? 0) >= m.ap;
            return (
              <TapScale
                key={m.mode}
                onPress={() => attack(m.mode)}
                disabled={busy || !can}
                style={[styles.modeBtn, (busy || !can) && styles.dimBtn]}
              >
                <Text style={styles.modeLabel}>{m.label}</Text>
                <Text style={styles.modeAp}>{m.ap} AP</Text>
              </TapScale>
            );
          })}
        </View>
      </View>

      {boss && boss.topDamagers.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.section}>Top damage</Text>
          {boss.topDamagers.map((d, i) => (
            <Text key={i} style={styles.dim}>
              {i + 1}. {d.name} — {d.damage.toLocaleString()}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
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
  bossPanel: { position: "relative", overflow: "hidden" },
  title: { color: theme.colors.ember, fontWeight: "800", fontSize: 20 },
  level: { color: theme.colors.textDim, marginBottom: theme.space(1) },
  barTrack: { height: 16, backgroundColor: theme.colors.bg, borderRadius: 8, overflow: "hidden", marginTop: theme.space(1) },
  barFill: { height: 16, backgroundColor: theme.colors.danger },
  hp: { color: theme.colors.text, fontWeight: "700", marginTop: 6, textAlign: "center" },
  dim: { color: theme.colors.textDim, marginTop: 2 },
  val: { color: theme.colors.text, fontWeight: "800" },
  fine: { color: theme.colors.textDim, fontSize: 11, marginTop: 4 },
  modes: { flexDirection: "row", gap: theme.space(1), marginTop: theme.space(1) },
  modeBtn: {
    flex: 1,
    backgroundColor: theme.colors.ember,
    borderRadius: theme.radius,
    paddingVertical: theme.space(1.5),
    alignItems: "center",
  },
  dimBtn: { opacity: 0.4 },
  modeLabel: { color: "#1c1410", fontWeight: "800" },
  modeAp: { color: "#1c1410", fontSize: 11 },
  section: { color: theme.colors.brass, fontWeight: "800", marginBottom: theme.space(1) },
});
