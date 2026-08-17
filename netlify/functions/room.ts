import { getStore } from "@netlify/blobs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const safeCode = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const choices = { character: ["human", "bear", "cat", "rabbit", "fox", "panda", "frog", "owl", "penguin", "unicorn", "alien", "robot", "ghost", "dragon", "cloud"], skin: ["light", "warm", "tan", "deep", "green", "blue", "pink", "purple"], hair: ["short", "curly", "long", "spiky"], outfit: ["casual", "sport", "space", "halloween", "christmas", "royal"], accessory: ["none", "glasses", "hat", "crown"] };

type Avatar = { character: string; skin: string; hair: string; outfit: string; accessory: string };
type Player = { id: string; nickname: string; avatar: Avatar; joinedAt: number };
type Room = { code: string; status: "waiting" | "started"; createdAt: number; startedAt?: number; participants: Player[] };

const safeAvatar = (value: unknown): Avatar => {
  const avatar = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(choices).map(([key, values]) => [key, values.includes(String(avatar[key])) ? String(avatar[key]) : values[0]])) as Avatar;
};

export default async (request: Request) => {
  const store = getStore("quizpop-live-rooms");
  const url = new URL(request.url);
  const readRoom = (code: string) => store.getWithMetadata(`${code}/room`, { type: "json", consistency: "strong" });

  if (request.method === "GET") {
    const code = safeCode(url.searchParams.get("code"));
    if (!code) return reply({ error: "Room code required" }, 400);
    const result = await readRoom(code);
    if (!result) return reply({ error: "Room not found" }, 404);
    const room = result.data as Room;
    if (url.searchParams.get("view") === "status") return reply({ code, status: room.status });
    return reply(room);
  }

  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const body = await request.json() as Record<string, unknown>;
  const code = safeCode(body.code);
  if (!code) return reply({ error: "Room code required" }, 400);

  if (body.action === "create") {
    const room: Room = { code, status: "waiting", createdAt: Date.now(), participants: [] };
    await store.setJSON(`${code}/room`, room);
    return reply(room);
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await readRoom(code);
    if (!result) return reply({ error: "Room not found or host is not ready" }, 404);
    const room = result.data as Room;

    if (body.action === "join") {
      const nickname = String(body.nickname || "").trim().slice(0, 24);
      const playerId = String(body.playerId || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
      if (!nickname || !playerId) return reply({ error: "Nickname required" }, 400);
      const existing = room.participants.find(player => player.id === playerId);
      const player: Player = { id: playerId, nickname, avatar: safeAvatar(body.avatar), joinedAt: existing?.joinedAt || Date.now() };
      const participants = existing ? room.participants.map(item => item.id === playerId ? player : item) : [...room.participants, player];
      if (participants.length > 300) return reply({ error: "This room is full" }, 409);
      try { await store.setJSON(`${code}/room`, { ...room, participants }, { onlyIfMatch: result.etag }); return reply({ ok: true, status: room.status }); } catch { continue; }
    }

    if (body.action === "leave") {
      const participants = room.participants.filter(player => player.id !== String(body.playerId || ""));
      try { await store.setJSON(`${code}/room`, { ...room, participants }, { onlyIfMatch: result.etag }); return reply({ ok: true }); } catch { continue; }
    }

    if (body.action === "start") {
      try { await store.setJSON(`${code}/room`, { ...room, status: "started", startedAt: Date.now() }, { onlyIfMatch: result.etag }); return reply({ ok: true, status: "started" }); } catch { continue; }
    }

    return reply({ error: "Unknown action" }, 400);
  }

  return reply({ error: "The room is busy. Please try again." }, 409);
};
