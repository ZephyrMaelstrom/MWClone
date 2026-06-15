import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, type PlayerState } from "./api";

const PLAYER_ID_KEY = "cc.playerId";

interface GameContextValue {
  player: PlayerState | null;
  loading: boolean;
  error: string | null;
  setPlayer: (p: PlayerState) => void;
  refresh: () => Promise<void>;
  /** Wipe progress back to a fresh starter profile (same id). */
  resetProgress: () => Promise<void>;
  /** Abandon this profile and start a brand-new one. */
  newProfile: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPlayer = useCallback((p: PlayerState) => setPlayerState(p), []);

  const createAndStore = useCallback(async () => {
    const p = await api.createPlayer("Alchemist");
    await AsyncStorage.setItem(PLAYER_ID_KEY, p.id);
    setPlayerState(p);
    return p;
  }, []);

  const refresh = useCallback(async () => {
    if (!player) return;
    try {
      setPlayerState(await api.getPlayer(player.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [player]);

  const resetProgress = useCallback(async () => {
    if (!player) return;
    setPlayerState(await api.reset(player.id));
  }, [player]);

  const newProfile = useCallback(async () => {
    await AsyncStorage.removeItem(PLAYER_ID_KEY);
    await createAndStore();
  }, [createAndStore]);

  // Poll for fresh state so resource regen (energy/stamina/HP) ticks up live.
  useEffect(() => {
    if (!player) return;
    const t = setInterval(() => {
      void refresh();
    }, 15000);
    return () => clearInterval(t);
  }, [player?.id, refresh]);

  useEffect(() => {
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(PLAYER_ID_KEY);
        if (savedId) {
          try {
            // Resume the stored profile (progress persists server-side).
            setPlayerState(await api.getPlayer(savedId));
            return;
          } catch {
            // Stored profile is gone on the server — fall through to create.
          }
        }
        await createAndStore();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [createAndStore]);

  return (
    <GameContext.Provider
      value={{ player, loading, error, setPlayer, refresh, resetProgress, newProfile }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
