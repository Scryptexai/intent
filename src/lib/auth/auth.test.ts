import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signSession, verifySession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { apiKeyValid, csrfOk } from "@/lib/auth/guard";
import { createDraft, updateDraft, listDrafts } from "@/lib/repo";

describe("session tokens", () => {
  it("round-trips and rejects tampering/expiry", async () => {
    const tok = await signSession({ uid: "u-demo", email: "admin@cif.local", role: "admin", plan: "pro", exp: Math.floor(Date.now() / 1000) + 60 });
    const ok = await verifySession(tok);
    expect(ok?.uid).toBe("u-demo");
    expect(await verifySession(tok + "x")).toBeNull();
    const expired = await signSession({ uid: "u-demo", email: "a@b.c", role: "viewer", plan: "free", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(await verifySession(expired)).toBeNull();
    expect(await verifySession(null)).toBeNull();
  });
});

describe("passwords", () => {
  it("verifies scrypt hashes & rejects wrong", () => {
    const h = hashPassword("hunter2hunter2");
    expect(verifyPassword("hunter2hunter2", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(verifyPassword("x", null)).toBe(false);
  });
});

describe("guards", () => {
  it("accepts the demo API key and rejects others", () => {
    const good = new NextRequest("http://localhost/api/v1/projects", { headers: { "x-cif-key": "cif_demo_key_2026" } });
    expect(apiKeyValid(good)).toBe(true);
    const bad = new NextRequest("http://localhost/api/v1/projects", { headers: { "x-cif-key": "nope" } });
    expect(apiKeyValid(bad)).toBe(false);
  });

  it("CSRF: same-origin ok, cross-origin rejected, non-browser ok", () => {
    const same = new NextRequest("http://localhost/api/drafts", { method: "POST", headers: { origin: "http://localhost" } });
    expect(csrfOk(same)).toBe(true);
    const cross = new NextRequest("http://localhost/api/drafts", { method: "POST", headers: { origin: "https://evil.example" } });
    expect(csrfOk(cross)).toBe(false);
    const nobrowser = new NextRequest("http://localhost/api/drafts", { method: "POST" });
    expect(csrfOk(nobrowser)).toBe(true);
  });
});

describe("repo ownership (IDOR)", () => {
  it("blocks cross-user draft mutation", async () => {
    const d = await createDraft({ userId: "u-demo", sourceType: "airdrop", sourceId: "p-blur", templateId: "tpl-tldr", generatedContent: "ownership test" });
    expect(await updateDraft(d.id, "u-analyst", { editedContent: "hijack" })).toBeNull();
    const own = await updateDraft(d.id, "u-demo", { editedContent: "mine" });
    expect(own?.editedContent).toBe("mine");
    const list = await listDrafts("u-analyst");
    expect(list.some((x) => x.id === d.id)).toBe(false);
  });
});
