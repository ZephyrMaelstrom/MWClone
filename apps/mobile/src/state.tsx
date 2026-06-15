import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken, type PlayerState } from "./api";

const ID_KEY = "cc.playerId";
const TOKEN_KEY = "cc.token";

interface GameContextValue {
  player: PlayerState | null;
  loading: boolean;
  error: string | null;
  setPlayer: (p: PlayerState) => void;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  playAsGuest: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPlayer = useCallback((p: PlayerState) => setPlayerState(p), []);

  const persist = useCallback(async (id: string, token: string | null) => {
    await AsyncStorage.setItem(ID_KEY, id);
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(token);
  }, []);

  const refresh = useCallback(async () => {
    if (!player) return;
    try {
      setPlayerState(await api.getPlayer(player.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [player]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password);
      await persist(res.playerId, res.token);
      setPlayerState(res.state);
    },
    [persist],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      // If there's a current guest profile, claim it so progress carries over.
      const claimId = player && !player.hasAccount ? player.id : undefined;
      const res = await api.register(username, password, claimId);
      await persist(res.playerId, res.token);
      setPlayerState(res.state);
    },
    [persist, player],
  );

  const playAsGuest = useCallback(async () => {
    const p = await api.createPlayer("Alchemist");
    await persist(p.id, null);
    setPlayerState(p);
  }, [persist]);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([ID_KEY, TOKEN_KEY]);
    setAuthToken(null);
    setPlayerState(null);
  }, []);

  const resetProgress = useCallback(async () => {
    if (!player) return;
    setPlayerState(await api.reset(player.id));
  }, [player]);

  // Poll for fresh state so resource regen ticks up live.
  useEffect(() => {
    if (!player) return;
    const t = setInterval(() => void refresh(), 15000);
    return () => clearInterval(t);
  }, [player?.id, refresh]);

  // On launch, resume a stored session if there is one.
  useEffect(() => {
    (async () => {
      try {
        const [savedId, savedToken] = await Promise.all([
          AsyncStorage.getItem(ID_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (savedId) {
          setAuthToken(savedToken);
          try {
            setPlayerState(await api.getPlayer(savedId));
          } catch {
            // session invalid/expired — drop it and show auth
            await AsyncStorage.multiRemove([ID_KEY, TOKEN_KEY]);
            setAuthToken(null);
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <GameContext.Provider
      value={{ player, loading, error, setPlayer, refresh, login, register, logout, playAsGuest, resetProgress }}
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
