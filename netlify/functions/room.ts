import { getStore } from "@netlify/blobs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const safeCode = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const choices = { character: ["golden"], skin: ["warm"], hair: ["short"], outfit: ["gown", "suit", "tuxedo", "dinosaur", "wedding", "cowboy", "astronaut", "wizard"], accessory: ["none"] };

type Avatar = { character: string; skin: string; hair: string; outfit: string; accessory: string };
type Player = { id: string; nickname: string; avatar: Avatar; joinedAt: number };
type Question = { text: string; image: string | null; answers: string[]; answerImages: (string | null)[]; answerScales: number[]; correct: number };
type AnswerRecord = { playerId: string; questionIndex: number; answer: number; correct: boolean; elapsedMs: number; score: number; answeredAt: number };
type Room = { code: string; status: "waiting" | "started"; createdAt: number; startedAt?: number; questionIndex: number; questions: Question[]; participants: Player[]; responses: AnswerRecord[] };

const safeAvatar = (value: unknown): Avatar => {
  const avatar = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(choices).map(([key, values]) => [key, values.includes(String(avatar[key])) ? String(avatar[key]) : values[0]])) as Avatar;
};

const safeQuestions = (value: unknown): Question[] => Array.isArray(value) ? value.slice(0, 50).map(item => {
  const question = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const answers = Array.isArray(question.answers) ? question.answers.slice(0, 4).map(answer => String(answer || "").slice(0, 160)) : [];
  const answerImages = Array.isArray(question.answerImages) ? question.answerImages.slice(0, 4).map(image => typeof image === "string" ? image : null) : [];
  const answerScales = Array.isArray(question.answerScales) ? question.answerScales.slice(0, 4).map(scale => Math.min(180, Math.max(50, Number(scale) || 100))) : [];
  while (answers.length < 4) answers.push(""); while (answerImages.length < 4) answerImages.push(null); while (answerScales.length < 4) answerScales.push(100);
  return { text: String(question.text || "").slice(0, 300), image: typeof question.image === "string" ? question.image : null, answers, answerImages, answerScales, correct: Math.min(3, Math.max(0, Number(question.correct) || 0)) };
}) : [];

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
    if (url.searchParams.get("view") === "status") {
      const question = room.questions?.[room.questionIndex || 0];
      const elapsedMs = room.startedAt ? Date.now() - room.startedAt : 0;
      return reply({ code, status: room.status, startedAt: room.startedAt, duration: 20, questionIndex: room.questionIndex || 0, question: question ? { text: question.text, image: question.image, answers: question.answers, answerImages: question.answerImages, answerScales: question.answerScales, ...(elapsedMs >= 20000 ? { correct: question.correct } : {}) } : null });
    }
    return reply(room);
  }

  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const body = await request.json() as Record<string, unknown>;
  const code = safeCode(body.code);
  if (!code) return reply({ error: "Room code required" }, 400);

  if (body.action === "create") {
    const room: Room = { code, status: "waiting", createdAt: Date.now(), questionIndex: 0, questions: safeQuestions(body.questions), participants: [], responses: [] };
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

    if (body.action === "answer") {
      const playerId = String(body.playerId || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
      const answer = Number(body.answer);
      const questionIndex = room.questionIndex || 0;
      const question = room.questions?.[questionIndex];
      if (room.status !== "started" || !room.startedAt || !question) return reply({ error: "Question is not active" }, 409);
      if (!room.participants.some(player => player.id === playerId) || !Number.isInteger(answer) || answer < 0 || answer > 3) return reply({ error: "Invalid answer" }, 400);
      const existing = (room.responses || []).find(item => item.playerId === playerId && item.questionIndex === questionIndex);
      if (existing) return reply({ ok: true, accepted: false });
      const answeredAt = Date.now(); const elapsedMs = Math.min(20000, Math.max(0, answeredAt - room.startedAt)); const correct = answer === question.correct;
      const record: AnswerRecord = { playerId, questionIndex, answer, correct, elapsedMs, score: correct ? 1000 + Math.round((20000 - elapsedMs) / 20) : 0, answeredAt };
      try { await store.setJSON(`${code}/room`, { ...room, responses: [...(room.responses || []), record] }, { onlyIfMatch: result.etag }); return reply({ ok: true, accepted: true }); } catch { continue; }
    }

    if (body.action === "start") {
      const startedAt = Date.now();
      try { await store.setJSON(`${code}/room`, { ...room, status: "started", startedAt }, { onlyIfMatch: result.etag }); return reply({ ok: true, status: "started", startedAt }); } catch { continue; }
    }

    return reply({ error: "Unknown action" }, 400);
  }

  return reply({ error: "The room is busy. Please try again." }, 409);
};
