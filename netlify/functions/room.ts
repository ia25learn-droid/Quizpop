import { getStore } from "@netlify/blobs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const safeCode = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export default async (request: Request) => {
  const store = getStore("quizpop-live-rooms");
  const url = new URL(request.url);

  if (request.method === "GET") {
    const code = safeCode(url.searchParams.get("code"));
    if (!code) return reply({ error: "Room code required" }, 400);
    const room = await store.get(`${code}/room`, { type: "json", consistency: "strong" });
    if (!room) return reply({ error: "Room not found" }, 404);
    if (url.searchParams.get("view") === "status") return reply({ code, status: room.status });
    const result = await store.list({ prefix: `${code}/participants/` });
    const participants = result.blobs.slice(0, 300).map(item => {
      const value = item.key.split("/").pop() || "";
      const separator = value.indexOf("--");
      return { id: value.slice(0, separator), nickname: decodeURIComponent(value.slice(separator + 2)) };
    });
    return reply({ ...room, participants });
  }

  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const body = await request.json() as Record<string, unknown>;
  const code = safeCode(body.code);
  if (!code) return reply({ error: "Room code required" }, 400);

  if (body.action === "create") {
    const existing = await store.list({ prefix: `${code}/participants/` });
    await Promise.all(existing.blobs.map(item => store.delete(item.key)));
    await store.setJSON(`${code}/room`, { code, status: "waiting", createdAt: Date.now() });
    return reply({ code, status: "waiting", participants: [] });
  }

  const room = await store.get(`${code}/room`, { type: "json", consistency: "strong" });
  if (!room) return reply({ error: "Room not found or host is not ready" }, 404);

  if (body.action === "join") {
    const nickname = String(body.nickname || "").trim().slice(0, 24);
    const playerId = String(body.playerId || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    if (!nickname || !playerId) return reply({ error: "Nickname required" }, 400);
    const current = await store.list({ prefix: `${code}/participants/` });
    if (current.blobs.length >= 300) return reply({ error: "This room is full" }, 409);
    await store.set(`${code}/participants/${playerId}--${encodeURIComponent(nickname)}`, String(Date.now()));
    return reply({ ok: true, status: room.status });
  }

  if (body.action === "start") {
    await store.setJSON(`${code}/room`, { ...room, status: "started", startedAt: Date.now() });
    return reply({ ok: true, status: "started" });
  }

  if (body.action === "leave") {
    const playerId = String(body.playerId || "");
    const current = await store.list({ prefix: `${code}/participants/` });
    const player = current.blobs.find(item => item.key.includes(`/${playerId}--`));
    if (player) await store.delete(player.key);
    return reply({ ok: true });
  }

  return reply({ error: "Unknown action" }, 400);
};
