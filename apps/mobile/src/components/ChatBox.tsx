import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ChatMessage } from "../api";
import { theme } from "../theme";

interface Props {
  title: string;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
}

export function ChatBox({ title, messages, onSend }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await onSend(t);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const recent = messages.slice(-20);

  return (
    <View>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.panel}>
        {recent.length === 0 ? (
          <Text style={styles.dim}>No messages yet — say hello!</Text>
        ) : (
          recent.map((m) => (
            <Text key={m.id} style={styles.msg}>
              <Text style={styles.name}>{m.name}: </Text>
              {m.text}
            </Text>
          ))
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
            maxLength={200}
          />
          <Pressable onPress={send} disabled={busy || !text.trim()} style={[styles.send, (busy || !text.trim()) && styles.dim2]}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: theme.colors.brass, fontWeight: "800", marginBottom: theme.space(1) },
  panel: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    padding: theme.space(2),
    marginBottom: theme.space(2),
  },
  dim: { color: theme.colors.textDim },
  msg: { color: theme.colors.text, marginBottom: 3 },
  name: { color: theme.colors.brass, fontWeight: "700" },
  inputRow: { flexDirection: "row", gap: theme.space(1), marginTop: theme.space(1) },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.panelEdge,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: theme.space(1),
  },
  send: { backgroundColor: theme.colors.ember, borderRadius: theme.radius, paddingHorizontal: theme.space(2), justifyContent: "center" },
  dim2: { opacity: 0.4 },
  sendText: { color: "#1c1410", fontWeight: "800" },
});
