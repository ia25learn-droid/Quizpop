import { getStore } from "@netlify/blobs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const encoder = new TextEncoder();
const bytesToHex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
const digest = async (value: string) => bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase().slice(0, 160);

async function passwordHash(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 120000 }, material, 256)));
}

type User = { id: string; email: string; salt: string; passwordHash: string; createdAt: number };
type Session = { userId: string; email: string; expiresAt: number };
type SavedQuiz = { id: string; title: string; questions: unknown[]; updatedAt: number };

export default async (request: Request) => {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const store = getStore("quizpop-accounts");
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "signup" || action === "login") {
    const email = normalizeEmail(body.email); const password = String(body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return reply({ error: "Enter a valid email address" }, 400);
    if (password.length < 8) return reply({ error: "Password must have at least 8 characters" }, 400);
    const emailKey = await digest(email); const existing = await store.get(`users/${emailKey}`, { type: "json" }) as User | null;
    let user = existing;
    if (action === "signup") {
      if (existing) return reply({ error: "An account already exists for this email" }, 409);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      user = { id: crypto.randomUUID(), email, salt: bytesToHex(salt), passwordHash: await passwordHash(password, salt), createdAt: Date.now() };
      await store.setJSON(`users/${emailKey}`, user);
    } else {
      if (!user || await passwordHash(password, hexToBytes(user.salt)) !== user.passwordHash) return reply({ error: "Incorrect email or password" }, 401);
    }
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`; const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await store.setJSON(`sessions/${await digest(token)}`, { userId: user!.id, email: user!.email, expiresAt } satisfies Session);
    return reply({ token, user: { id: user!.id, email: user!.email } });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const session = token ? await store.get(`sessions/${await digest(token)}`, { type: "json" }) as Session | null : null;
  if (!session || session.expiresAt < Date.now()) return reply({ error: "Please log in" }, 401);

  if (action === "me") return reply({ user: { id: session.userId, email: session.email } });
  if (action === "logout") { await store.delete(`sessions/${await digest(token)}`); return reply({ ok: true }); }

  const indexKey = `accounts/${session.userId}/quizzes`;
  const quizzes = (await store.get(indexKey, { type: "json" }) as SavedQuiz[] | null) || [];
  if (action === "list") return reply({ quizzes: quizzes.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })) });
  if (action === "get") { const quiz = quizzes.find(item => item.id === String(body.id || "")); return quiz ? reply({ quiz }) : reply({ error: "Quiz not found" }, 404); }
  if (action === "save") {
    const incoming = Array.isArray(body.questions) ? body.questions.slice(0, 50) : [];
    if (!incoming.length) return reply({ error: "Add at least one question" }, 400);
    const id = String(body.id || "").replace(/[^a-zA-Z0-9-]/g, "") || crypto.randomUUID();
    const title = String(body.title || "Untitled quiz").trim().slice(0, 100) || "Untitled quiz";
    const saved: SavedQuiz = { id, title, questions: incoming, updatedAt: Date.now() };
    const next = [saved, ...quizzes.filter(item => item.id !== id)].slice(0, 30);
    await store.setJSON(indexKey, next); return reply({ ok: true, quiz: { id, title, updatedAt: saved.updatedAt } });
  }
  return reply({ error: "Unknown action" }, 400);
};
