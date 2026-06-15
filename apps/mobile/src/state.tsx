import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type PlayerState } from "./api";

interface GameContextValue {
  player: PlayerState | null;
  loading: boolean;
  error: string | null;
  setPlayer: (p: PlayerState) => void;
  refresh: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

/** For the prototype we auto-create a player on first launch. */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPlayer = useCallback((p: PlayerState) => setPlayerState(p), []);

  const refresh = useCallback(async () => {
    if (!player) return;
    try {
      setPlayerState(await api.getPlayer(player.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [player]);

  useEffect(() => {
    (async () => {
      try {
        setPlayerState(await api.createPlayer("Alchemist"));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <GameContext.Provider value={{ player, loading, error, setPlayer, refresh }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
