import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { resetStore } from "../src/store.js";

let app: ReturnType<typeof buildServer>;
beforeEach(() => {
  resetStore();
  app = buildServer();
});
afterEach(async () => {
  await app.close();
});

async function register(username: string, password: string, claimId?: string) {
  return app.inject({ method: "POST", url: "/auth/register", payload: { username, password, claimId } });
}

describe("accounts", () => {
  it("registers and returns a token + state", async () => {
    const res = await register("Alchemist1", "hunter2");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.state.hasAccount).toBe(true);
    expect(body.state.username).toBe("Alchemist1");
    // never leak secrets
    expect(body.state.passwordHash).toBeUndefined();
    expect(body.state.token).toBeUndefined();
  });

  it("rejects duplicate usernames and bad input", async () => {
    await register("Dup", "secret1");
    expect((await register("dup", "secret2")).statusCode).toBe(409); // case-insensitive
    expect((await register("x", "secret")).statusCode).toBe(409); // too short username
    expect((await register("ValidName", "123")).statusCode).toBe(409); // weak password
  });

  it("logs in with the right password, rejects the wrong one", async () => {
    await register("Loginner", "correct-horse");
    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "Loginner", password: "correct-horse" },
    });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "Loginner", password: "nope" },
    });
    expect(bad.statusCode).toBe(409);
  });

  it("protects account routes with the token", async () => {
    const { playerId, token } = (await register("Guarded", "password1")).json();
    // no token -> 401
    expect((await app.inject({ method: "GET", url: `/players/${playerId}` })).statusCode).toBe(401);
    // with token -> 200
    const ok = await app.inject({
      method: "GET",
      url: `/players/${playerId}`,
      headers: { "x-player-token": token },
    });
    expect(ok.statusCode).toBe(200);
  });

  it("claims an existing guest profile so progress is kept", async () => {
    const guest = (await app.inject({ method: "POST", url: "/players", payload: { name: "Guest" } })).json();
    const res = await register("Claimer", "password1", guest.id);
    expect(res.statusCode).toBe(200);
    expect(res.json().playerId).toBe(guest.id); // same profile, now secured
  });
});
