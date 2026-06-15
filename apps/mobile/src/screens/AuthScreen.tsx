import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useGame } from "../state";
import { theme } from "../theme";

export function AuthScreen() {
  const { login, register, playAsGuest } = useGame();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === "register") await register(username.trim(), password);
      else await login(username.trim(), password);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setBusy(true);
    setErr(null);
    try {
      await playAsGuest();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Crucible Critters</Text>
      <Text style={styles.tag}>collect · transmute · battle</Text>

      <View style={styles.card}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setMode("register")} style={[styles.tab, mode === "register" && styles.tabOn]}>
            <Text style={[styles.tabText, mode === "register" && styles.tabTextOn]}>Create account</Text>
          </Pressable>
          <Pressable onPress={() => setMode("login")} style={[styles.tab, mode === "login" && styles.tabOn]}>
            <Text style={[styles.tabText, mode === "login" && styles.tabTextOn]}>Log in</Text>
          </Pressable>
        </View>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.colors.textDim}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        {err && <Text style={styles.err}>{err}</Text>}

        <Pressable onPress={submit} disabled={busy || !username || !password} style={[styles.button, (busy || !username || !password) && styles.dim]}>
          {busy ? <ActivityIndicator color="#1c1410" /> : <Text style={styles.buttonText}>{mode === "register" ? "Create account" : "Log in"}</Text>}
        </Pressable>

        <Pressable onPress={guest} disabled={busy} style={styles.guest}>
          <Text style={styles.guestText}>Play as guest</Text>
        </Pressable>
        <Text style={styles.fine}>
          An account lets you log in from any device. A guest profile lives only on this device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: theme.space(3), backgroundColor: theme.colors.bg },
  logo: { color: theme.colors.ember, fontSize: 28, fontWeight: "900", textAlign: "center" },
  tag: { color: theme.colors.textDim, textAlign: "center", marginBottom: theme.space(3) },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
  },
  tabs: { flexDirection: "row", gap: theme.space(1), marginBottom: theme.space(2) },
  tab: { flex: 1, paddingVertical: theme.space(1), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.panelEdge, alignItems: "center" },
  tabOn: { borderColor: theme.colors.brass },
  tabText: { color: theme.colors.textDim, fontWeight: "700", fontSize: 13 },
  tabTextOn: { color: theme.colors.brass },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: theme.space(1.5),
    marginBottom: theme.space(1),
  },
  err: { color: theme.colors.ember, marginBottom: theme.space(1) },
  button: { backgroundColor: theme.colors.ember, borderRadius: theme.radius, paddingVertical: theme.space(2), alignItems: "center", marginTop: theme.space(1) },
  dim: { opacity: 0.4 },
  buttonText: { color: "#1c1410", fontWeight: "800", fontSize: 16 },
  guest: { alignItems: "center", paddingVertical: theme.space(2) },
  guestText: { color: theme.colors.textDim, fontWeight: "700", textDecorationLine: "underline" },
  fine: { color: theme.colors.textDim, fontSize: 11, textAlign: "center" },
});
