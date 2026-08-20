"use client";

import { useEffect, useRef, useState } from "react";

const answers = [
  { icon: "▲", text: "Venus", color: "red" },
  { icon: "◆", text: "Mars", color: "blue" },
  { icon: "●", text: "Jupiter", color: "gold" },
  { icon: "■", text: "Saturn", color: "green" },
];

type Avatar = { character: string; skin: string; hair: string; outfit: string; accessory: string };
type LiveQuestion = { text: string; image: string | null; answers: string[]; answerImages: (string | null)[]; answerScales: number[]; correct?: number };
type AccountUser = { id: string; email: string };
type SavedQuizSummary = { id: string; title: string; updatedAt: number };
const outfitIcons: Record<string,string> = { dress:"🍓", gown:"👗", suit:"👔", tuxedo:"🤵", dinosaur:"🦖", wedding:"💍", cowboy:"🤠", astronaut:"🚀", wizard:"🪄" };
const sunnyOutfitImages: Record<string,string> = { dress:"/sunny-transparent.png?v=4", gown:"/sunny-gown.png?v=4", suit:"/sunny-suit.png?v=4", tuxedo:"/sunny-tuxedo.png?v=4", dinosaur:"/sunny-dinosaur.png?v=4", wedding:"/sunny-wedding.png?v=4", cowboy:"/sunny-cowboy.png?v=4", astronaut:"/sunny-astronaut.png?v=4", wizard:"/sunny-wizard.png?v=4" };
const avatarChoices = {
  character: [{id:"golden",label:"Yuzu the golden retriever"}],
  skin: [{id:"light",label:"Cream"},{id:"warm",label:"Golden"},{id:"tan",label:"Honey"},{id:"deep",label:"Chocolate"},{id:"green",label:"Mint"},{id:"blue",label:"Blue"},{id:"pink",label:"Pink"},{id:"purple",label:"Purple"}],
  hair: [{id:"short",label:"Short"},{id:"curly",label:"Curly"},{id:"long",label:"Long"},{id:"spiky",label:"Spiky"}],
  outfit: [{id:"gown",label:"Royal"},{id:"suit",label:"Leader"},{id:"tuxedo",label:"Classic"},{id:"dinosaur",label:"Dino"},{id:"wedding",label:"Wedding"},{id:"cowboy",label:"Cowboy"},{id:"astronaut",label:"Space"},{id:"wizard",label:"Wizard"}],
  accessory: [{id:"none",label:"None"},{id:"hat",label:"Hat"},{id:"crown",label:"Crown"}],
};

function AvatarView({ avatar, size = "medium" }: { avatar: Avatar; size?: "small" | "medium" | "large" }) {
  if (avatar.character === "golden") {
    const outfitImage = sunnyOutfitImages[avatar.outfit] || sunnyOutfitImages.dress;
    return <div className={`avatar avatar-${size} character-golden fur-${avatar.skin}`} aria-label={`Yuzu the golden retriever wearing a ${avatar.outfit}`}><img src={outfitImage} alt=""/>{avatar.accessory !== "none" && <span className={`goldenAccessory ${avatar.accessory}`}>{avatar.accessory === "glasses" ? "👓" : avatar.accessory === "hat" ? "🎩" : "👑"}</span>}</div>;
  }
  const hasMascotEars = ["bear","cat","rabbit","fox","panda","unicorn"].includes(avatar.character);
  const hasBeak = ["owl","penguin"].includes(avatar.character);
  return <div className={`avatar avatar-${size} character-${avatar.character} skin-${avatar.skin} hair-${avatar.hair} outfit-${avatar.outfit}`} aria-label={`${avatar.character} cartoon profile avatar`}>
    {avatar.character === "alien" && <><i className="antenna left"/><i className="antenna right"/></>}{hasMascotEars && <><i className="mascotEar left"/><i className="mascotEar right"/></>}{avatar.character === "robot" && <><i className="robotAntenna"/><i className="robotSide left"/><i className="robotSide right"/></>}{avatar.character === "dragon" && <><i className="dragonHorn left"/><i className="dragonHorn right"/><i className="dragonWing left"/><i className="dragonWing right"/></>}{avatar.character === "cloud" && <div className="cloudPuffs"><i/><i/><i/></div>}{avatar.character === "frog" && <><i className="frogEye left"/><i className="frogEye right"/></>}{avatar.character === "unicorn" && <i className="unicornHorn"/>}
    <div className="avatarHair"/>{avatar.accessory === "hat" && <div className="avatarHat">★</div>}{avatar.accessory === "crown" && <div className="avatarCrown">♛</div>}<div className="avatarFace"><i className="eye left"/><i className="eye right"/><i className="mouth"/>{["bear","cat","rabbit","fox","panda"].includes(avatar.character) && <i className="mascotNose"/>}{avatar.character === "panda" && <><i className="pandaPatch left"/><i className="pandaPatch right"/></>}{hasBeak && <i className="mascotBeak"/>}{avatar.character === "rabbit" && <i className="rabbitTeeth"/>}{avatar.character === "robot" && <i className="robotPanel"/>}{avatar.character === "dragon" && <i className="dragonSnout"/>}{avatar.accessory === "glasses" && <div className="avatarGlasses"><b/><b/></div>}</div><div className="avatarBody"><span/>{avatar.character === "ghost" && <i className="ghostTail">● ● ●</i>}{avatar.outfit === "halloween" && <b className="outfitBadge">☠</b>}{avatar.outfit === "christmas" && <b className="outfitBadge">❄</b>}{avatar.outfit === "space" && <b className="outfitBadge">✦</b>}{avatar.outfit === "royal" && <b className="outfitBadge">◆</b>}</div>
  </div>;
}

export default function Home() {
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState("");
  const [participantLobby, setParticipantLobby] = useState(false);
  const [participants, setParticipants] = useState<{id:string;nickname:string;avatar:Avatar}[]>([]);
  const [avatar, setAvatar] = useState<Avatar>({ character: "golden", skin: "warm", hair: "short", outfit: "gown", accessory: "none" });
  const [roomError, setRoomError] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [participantAnswer, setParticipantAnswer] = useState<number | null>(null);
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(null);
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [participantQuestionIndex, setParticipantQuestionIndex] = useState(-1);
  const [hostPlaying, setHostPlaying] = useState(false);
  const [hostTimeLeft, setHostTimeLeft] = useState(20);
  const [gameFinished, setGameFinished] = useState(false);
  const [podiumStage, setPodiumStage] = useState(0);
  const applauseAudio = useRef<AudioContext | null>(null);
  const [hostResults, setHostResults] = useState<{playerId:string;nickname:string;avatar:Avatar;correct:boolean;elapsedMs:number;score:number;answered:boolean}[]>([]);
  const [playerId] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<number | null>(null);
  const [hostMode, setHostMode] = useState(false);
  const [lobby, setLobby] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [questions, setQuestions] = useState([
    { text: "Which planet is known as the Red Planet?", image: null as string | null, answers: ["Venus", "Mars", "Jupiter", "Saturn"], answerImages: [null, null, null, null] as (string | null)[], answerScales: [100, 100, 100, 100], correct: 1 },
  ]);
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuizSummary[]>([]);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const currentQuestion = questions[activeQuestion];
  const roomCode = "7QX9KP";
  const siteOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const configuredOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const isLocalSite = /^(localhost|127\.0\.0\.1)$/i.test(typeof window === "undefined" ? "" : window.location.hostname);
  const joinOrigin = configuredOrigin || siteOrigin;
  const joinUrl = `${joinOrigin}/?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`;

  useEffect(() => {
    const scannedRoom = new URLSearchParams(window.location.search).get("room");
    if (scannedRoom) {
      setCode(scannedRoom.toUpperCase());
      setJoined(true);
    }
  }, []);

  useEffect(() => {
    const token = window.sessionStorage.getItem("quizpop-session");
    if (!token) return;
    accountRequest("me").then(async response => {
      if (!response.ok) { window.sessionStorage.removeItem("quizpop-session"); return; }
      const data = await response.json(); setAccountUser(data.user);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!lobby) return;
    const refresh = async () => {
      const response = await fetch(`/.netlify/functions/room?code=${roomCode}`, { cache: "no-store" });
      if (response.ok) setParticipants((await response.json()).participants || []);
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [lobby]);

  useEffect(() => {
    if (!participantLobby) return;
    const refresh = async () => {
      const requestedAt = Date.now();
      const response = await fetch(`/.netlify/functions/room?code=${code}&view=status`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data.status === "started") { setServerClockOffset(Number(data.serverNow) - ((requestedAt + Date.now()) / 2)); setGameStarted(true); setLiveQuestion(data.question || null); setLiveStartedAt(Number(data.startedAt) || Date.now()); setParticipantQuestionIndex(current => { if (current !== Number(data.questionIndex)) setParticipantAnswer(null); return Number(data.questionIndex); }); }
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [participantLobby, code]);

  useEffect(() => {
    if (!participantLobby || !gameStarted || !liveStartedAt) return;
    const updateTimer = () => setTimeLeft(Math.max(0, Math.ceil((20000 - (Date.now() + serverClockOffset - liveStartedAt)) / 1000)));
    updateTimer(); const timer = window.setInterval(updateTimer, 250); return () => window.clearInterval(timer);
  }, [participantLobby, gameStarted, liveStartedAt, serverClockOffset]);

  useEffect(() => {
    if (!hostPlaying || !liveStartedAt) return;
    const updateTimer = () => setHostTimeLeft(Math.max(0, Math.ceil((20000 - (Date.now() + serverClockOffset - liveStartedAt)) / 1000)));
    updateTimer(); const timer = window.setInterval(updateTimer, 250); return () => window.clearInterval(timer);
  }, [hostPlaying, liveStartedAt, serverClockOffset]);

  useEffect(() => {
    if (!hostPlaying) return;
    const refreshResults = async () => {
      const response = await fetch(`/.netlify/functions/room?code=${roomCode}`, { cache: "no-store" }); if (!response.ok) return;
      const data = await response.json(); const responses = data.responses || []; const currentIndex = Number(data.questionIndex) || 0;
      setHostResults((data.participants || []).map((player:{id:string;nickname:string;avatar:Avatar}) => { const all = responses.filter((item:{playerId:string}) => item.playerId === player.id); const current = all.find((item:{questionIndex:number}) => item.questionIndex === currentIndex); return {playerId:player.id,nickname:player.nickname,avatar:player.avatar,correct:Boolean(current?.correct),elapsedMs:Number(current?.elapsedMs) || 20000,score:all.reduce((sum:number,item:{score:number}) => sum + (Number(item.score) || 0),0),answered:Boolean(current)}; }).sort((a:{score:number;correct:boolean;elapsedMs:number},b:{score:number;correct:boolean;elapsedMs:number}) => b.score-a.score || Number(b.correct)-Number(a.correct) || a.elapsedMs-b.elapsedMs));
    };
    refreshResults(); const timer = window.setInterval(refreshResults, 1000); return () => window.clearInterval(timer);
  }, [hostPlaying, roomCode]);

  useEffect(() => {
    if (!gameFinished) { setPodiumStage(0); return; }
    setPodiumStage(1);
    const silver = window.setTimeout(() => setPodiumStage(2), 1800);
    const gold = window.setTimeout(() => setPodiumStage(3), 3800);
    return () => { window.clearTimeout(silver); window.clearTimeout(gold); };
  }, [gameFinished]);

  useEffect(() => { if (podiumStage === 3) playApplause(); }, [podiumStage]);

  async function openHostLobby() {
    setRoomError("");
    const response = await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", code: roomCode, questions }) });
    if (!response.ok && location.hostname !== "localhost") { setRoomError("Could not create the live room. Please try again."); return; }
    setHostMode(false); setParticipants([]); setLobby(true);
  }

  async function postGame() {
    const invalidIndex = questions.findIndex(question => !question.text.trim() || question.answers.filter((answer, index) => answer.trim() || question.answerImages[index]).length < 2);
    if (invalidIndex >= 0) {
      setActiveQuestion(invalidIndex);
      setRoomError(`Question ${invalidIndex + 1} needs a question and at least two answer options.`);
      return;
    }
    await openHostLobby();
  }

  async function enterParticipantLobby() {
    if (!nickname.trim()) return;
    setJoiningRoom(true); setRoomError("");
    try {
      const response = await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join", code, nickname: nickname.trim(), playerId, avatar }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Unable to join room"); }
      setJoined(false); setParticipantLobby(true);
    } catch (error) { setRoomError(error instanceof Error ? error.message : "Unable to join room"); }
    finally { setJoiningRoom(false); }
  }

  async function startLiveGame() {
    const requestedAt = Date.now();
    const response = await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start", code: roomCode }) });
    if (response.ok) { const data = await response.json(); setServerClockOffset(Number(data.serverNow) - ((requestedAt + Date.now()) / 2)); setLiveStartedAt(Number(data.startedAt) || Date.now()); setHostTimeLeft(20); setActiveQuestion(0); setGameFinished(false); setHostPlaying(true); setLobby(false); setPreviewing(true); }
  }

  async function startNextQuestion() {
    if (activeQuestion + 1 >= questions.length && !applauseAudio.current) { applauseAudio.current = new AudioContext(); void applauseAudio.current.resume(); }
    const requestedAt = Date.now();
    const response = await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "next", code: roomCode }) });
    if (!response.ok) return; const data = await response.json();
    if (data.finished) { setGameFinished(true); return; }
    setServerClockOffset(Number(data.serverNow) - ((requestedAt + Date.now()) / 2)); setLiveStartedAt(Number(data.startedAt)); setHostTimeLeft(20); setActiveQuestion(Number(data.questionIndex));
  }

  function playApplause() {
    const context = applauseAudio.current || new AudioContext(); applauseAudio.current = context; void context.resume();
    const duration = 4; const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate); const channel = buffer.getChannelData(0);
    for (let i=0;i<channel.length;i+=1) { const t=i/context.sampleRate; const wave=Math.pow(Math.max(0,Math.sin(t*32)+Math.sin(t*47)*.55),3); channel[i]=(Math.random()*2-1)*(.12+wave*.42)*(1-t/duration*.35); }
    const source=context.createBufferSource(); const highpass=context.createBiquadFilter(); const gain=context.createGain(); source.buffer=buffer; highpass.type="highpass"; highpass.frequency.value=650; gain.gain.value=.52; source.connect(highpass).connect(gain).connect(context.destination); source.start();
  }

  async function submitParticipantAnswer(answerIndex: number) {
    if (participantAnswer !== null || timeLeft === 0) return; setParticipantAnswer(answerIndex);
    await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "answer", code, playerId, answer: answerIndex }) }).catch(() => undefined);
  }

  async function leaveParticipantRoom() {
    await fetch("/.netlify/functions/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave", code, playerId }) }).catch(() => undefined);
    setParticipantLobby(false); setGameStarted(false); setNickname(""); window.history.replaceState({}, "", window.location.pathname);
  }

  function updateQuestion(patch: Partial<(typeof questions)[number]>) {
    setQuestions(items => items.map((item, index) => index === activeQuestion ? { ...item, ...patch } : item));
  }

  function addQuestion() {
    setQuestions(items => [...items, { text: "", image: null, answers: ["", "", "", ""], answerImages: [null, null, null, null], answerScales: [100, 100, 100, 100], correct: 0 }]);
    setActiveQuestion(questions.length);
  }

  function loadImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateQuestion({ image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function loadAnswerImage(answerIndex: number, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = [...currentQuestion.answerImages];
      next[answerIndex] = String(reader.result);
      updateQuestion({ answerImages: next });
    };
    reader.readAsDataURL(file);
  }

  function removeAnswerImage(answerIndex: number) {
    const next = [...currentQuestion.answerImages];
    next[answerIndex] = null;
    updateQuestion({ answerImages: next });
  }

  function resizeAnswerImage(answerIndex: number, scale: number) {
    const next = [...currentQuestion.answerScales];
    next[answerIndex] = scale;
    updateQuestion({ answerScales: next });
  }

  function randomizeAvatar() {
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    setAvatar({ character: pick(avatarChoices.character).id, skin: pick(avatarChoices.skin).id, hair: pick(avatarChoices.hair).id, outfit: pick(avatarChoices.outfit).id, accessory: pick(avatarChoices.accessory).id });
  }

  function accountRequest(action: string, payload: Record<string, unknown> = {}) {
    const token = window.sessionStorage.getItem("quizpop-session");
    return fetch("/.netlify/functions/account", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, ...payload }) });
  }

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    try {
      const response = await accountRequest(authMode, { email: authEmail, password: authPassword });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not access your account");
      window.sessionStorage.setItem("quizpop-session", data.token); setAccountUser(data.user); setAuthPassword(""); setShowAuth(false);
    } catch (error) { setAuthError(error instanceof Error && error.message !== "Unexpected end of JSON input" ? error.message : "Account login is available after deploying this update to Netlify."); }
    finally { setAuthBusy(false); }
  }

  async function openAccount() {
    if (!accountUser) { setAuthError(""); setShowAuth(true); return; }
    try {
      const response = await accountRequest("list"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your quizzes");
      setSavedQuizzes(data.quizzes || []); setShowLibrary(true);
    } catch (error) { setRoomError(error instanceof Error ? error.message : "Could not load your quizzes"); }
  }

  async function saveQuizToAccount() {
    if (!accountUser) { setAuthError("Log in or create an account to save this quiz."); setShowAuth(true); return; }
    setSaveMessage("Saving…");
    try {
      const response = await accountRequest("save", { id: savedQuizId, title: questions[0]?.text.trim() || "Untitled quiz", questions }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this quiz");
      setSavedQuizId(data.quiz.id); setSaveMessage("Saved ✓"); window.setTimeout(() => setSaveMessage(""), 2200);
    } catch (error) { setSaveMessage(""); setRoomError(error instanceof Error ? error.message : "Could not save this quiz"); }
  }

  async function loadSavedQuiz(id: string) {
    try {
      const response = await accountRequest("get", { id }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open this quiz");
      setQuestions(data.quiz.questions); setActiveQuestion(0); setSavedQuizId(data.quiz.id); setShowLibrary(false); setHostMode(true); setRoomError("");
    } catch (error) { setRoomError(error instanceof Error ? error.message : "Could not open this quiz"); }
  }

  async function logoutAccount() {
    await accountRequest("logout").catch(() => undefined); window.sessionStorage.removeItem("quizpop-session"); setAccountUser(null); setSavedQuizzes([]); setShowLibrary(false); setSavedQuizId(null);
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#">QuizPop<span>!</span></a>
        <div className="navlinks"><a href="#how-it-works">How it works</a><a href="#features">Features</a></div>
        <button className="accountBtn" onClick={openAccount}>{accountUser ? `◉ ${accountUser.email.split("@")[0]}` : "Log in"}</button>
        <button className="hostBtn" onClick={() => setHostMode(true)}>Host a game <span>→</span></button>
      </nav>
      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow"><i>●</i> LIVE QUIZZES, BIG ENERGY</div>
          <h1>Bring everyone<br/><em>into the game.</em></h1>
          <p>Create vibrant, live quizzes that get the whole room playing. Up to 300 people. One unforgettable game.</p>
          <div className="joinBox">
            <label htmlFor="room">ENTER GAME CODE</label>
            <div><input id="room" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6))} placeholder="e.g. 7QX9KP"/><button onClick={() => code.length >= 4 && setJoined(true)}>Join game</button></div>
            <span><b>▣</b> Or scan the QR code on the host&apos;s screen</span>
          </div>
          <div className="trust"><span className="faces"><i>MS</i><i>JL</i><i>AK</i><i>+2k</i></span><span><b>2,000+ hosts</b><br/>made learning louder this week</span></div>
        </div>
        <div className="gameWrap">
          <div className="blob one"/><div className="blob two"/>
          <div className="gameCard">
            <div className="gameTop"><span>Question <b>4</b> of 10</span><span className="players">♟ 187 playing</span></div>
            <div className="timer">18</div>
            <div className="question"><div className="planet">🪐<span>✦</span></div><h2>Which planet is known as<br/>the Red Planet?</h2></div>
            <div className="answers">{answers.map((a, i) => <button key={a.text} onClick={() => setSelected(i)} className={`${a.color} ${selected === i ? "chosen" : ""}`}><b>{a.icon}</b><span>{a.text}</span></button>)}</div>
          </div>
          <div className="floatTag"><b>+300</b><span>players<br/>per room</span></div>
          <div className="floatTag bottom"><b>⚡</b><span>Real-time<br/>results</span></div>
          <div className="mascotSticker"><img src="/quizpop-mascot.jpg" alt="Yuzu, the QuizPop golden retriever mascot"/><span><b>Meet Yuzu</b>your game-day cheerleader</span></div>
        </div>
      </section>
      <section id="highlights" className="featureBar">
        <div><b>◎</b><span><strong>Scan &amp; play</strong>No app needed</span></div><div><b>⚡</b><span><strong>Instant action</strong>Zero setup friction</span></div><div><b>▧</b><span><strong>Pictures welcome</strong>Questions &amp; answers</span></div><div><b>♟</b><span><strong>Room for everyone</strong>Up to 300 players</span></div>
      </section>
      <section id="how-it-works" className="infoSection howSection">
        <div className="sectionIntro"><span>HOW IT WORKS</span><h2>From idea to game time<br/>in three easy steps.</h2><p>No downloads and no complicated setup. Build your quiz, invite the room, and watch everyone play together.</p></div>
        <div className="steps">
          <article><b>01</b><i>✎</i><h3>Create your quiz</h3><p>Write questions and use wording, pictures, or both for every answer.</p></article>
          <article><b>02</b><i>▦</i><h3>Share the room</h3><p>Players scan the QR code or enter the six-character secret game code.</p></article>
          <article><b>03</b><i>⚡</i><h3>Play live</h3><p>Host up to 300 participants and reveal results together in real time.</p></article>
        </div>
        <button onClick={() => setHostMode(true)}>Create your first game →</button>
      </section>
      <section id="features" className="infoSection featureSection">
        <div className="sectionIntro"><span>BUILT FOR BIG ROOMS</span><h2>Everything you need<br/>to make it memorable.</h2></div>
        <div className="featureCards">
          <article className="featureLarge"><span>300</span><h3>Everyone gets a seat</h3><p>Bring classrooms, company all-hands, and community events into one live room.</p></article>
          <article><i>▧</i><h3>Picture-powered questions</h3><p>Add and resize images in questions and answer choices.</p></article>
          <article><i>◉</i><h3>Preview before you present</h3><p>See the participant view before going live.</p></article>
          <article><i>◎</i><h3>QR or secret code</h3><p>Join from any phone without downloading an app.</p></article>
        </div>
      </section>
      {joined && <div className="modal avatarModal" onClick={() => setJoined(false)}><form onSubmit={e => {e.preventDefault();enterParticipantLobby()}} onClick={e => e.stopPropagation()}>
        <h2>Create your player</h2><p>Room <b>{code}</b></p>
        <div className="avatarCreator"><div className="avatarPreview sunnyPreview"><AvatarView avatar={avatar} size="large"/><span>Yuzu, your QuizPop player</span></div><div className="avatarControls">{Object.entries(avatarChoices).filter(([category]) => category === "outfit").map(([category,options]) => <fieldset key={category} className="characterGalleryField"><legend>Choose character</legend><div className="sunnyCharacterChoices">{options.map(option => <button type="button" key={option.id} title={option.label} aria-label={`character: ${option.label}`} className={`sunnyCharacterChoice ${avatar.outfit === option.id ? "selected" : ""}`} onClick={() => setAvatar(current => ({...current,outfit:option.id}))}><img src={sunnyOutfitImages[option.id]} alt=""/><small><span>{outfitIcons[option.id]}</span>{option.label}</small></button>)}</div></fieldset>)}</div></div>
        <input autoFocus value={nickname} onChange={e => setNickname(e.target.value.slice(0,24))} placeholder="Your nickname" aria-label="Your nickname"/>{roomError && <p className="roomError">{roomError}</p>}<button type="submit" disabled={!nickname.trim() || joiningRoom}>{joiningRoom ? "Joining…" : "Enter lobby →"}</button><small onClick={() => setJoined(false)}>Cancel</small>
      </form></div>}
      {showAuth && <div className="modal accountModal" onClick={() => setShowAuth(false)}><form onSubmit={submitAuth} onClick={event => event.stopPropagation()}>
        <div className="accountIcon">♟</div><h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2><p>Save your quizzes privately and reopen them whenever you host.</p>
        <label>Email<input autoFocus type="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="you@example.com" required/></label>
        <label>Password<input type="password" minLength={8} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="At least 8 characters" required/></label>
        {authError && <div className="authError">{authError}</div>}<button type="submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Log in" : "Create account"}</button>
        <button className="authSwitch" type="button" onClick={() => { setAuthMode(mode => mode === "login" ? "signup" : "login"); setAuthError(""); }}>{authMode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button><small onClick={() => setShowAuth(false)}>Cancel</small>
      </form></div>}
      {showLibrary && <div className="modal libraryModal" onClick={() => setShowLibrary(false)}><section className="libraryPanel" onClick={event => event.stopPropagation()}>
        <div className="libraryHeader"><div><span>YOUR ACCOUNT</span><h2>My quizzes</h2><p>{accountUser?.email}</p></div><button onClick={() => setShowLibrary(false)} aria-label="Close">×</button></div>
        <div className="quizLibraryList">{savedQuizzes.length ? savedQuizzes.map(quiz => <article className="savedQuizCard" key={quiz.id}><div><b>▦</b><span><strong>{quiz.title}</strong><small>Updated {new Date(quiz.updatedAt).toLocaleDateString()}</small></span></div><button onClick={() => loadSavedQuiz(quiz.id)}>Open →</button></article>) : <div className="emptyLibrary"><b>✎</b><h3>No saved quizzes yet</h3><p>Open the quiz editor, create your questions, then choose Save quiz.</p></div>}</div>
        <div className="libraryActions"><button onClick={() => { setShowLibrary(false); setSavedQuizId(null); setHostMode(true); }}>＋ Create a quiz</button><button onClick={logoutAccount}>Sign out</button></div>
      </section></div>}
      {participantLobby && <div className="participantLobby"><div className="participantTop"><span className="brand">QuizPop!</span><span>Room {code}</span></div>{gameStarted && liveQuestion ? <div className="participantQuestion phoneChoiceOnly"><div className={`phoneTimer ${timeLeft <= 5 ? "urgent" : ""}`}>{timeLeft}</div><div className="phoneAnswers">{answers.map((answer,index) => <button aria-label={`Choose ${answer.color} ${answer.icon}`} disabled={timeLeft === 0 || participantAnswer !== null} onClick={() => submitParticipantAnswer(index)} className={`${answer.color} ${participantAnswer === index ? "picked" : ""} ${timeLeft === 0 && liveQuestion.correct === index ? "revealedCorrect" : ""} ${timeLeft === 0 && participantAnswer === index && liveQuestion.correct !== index ? "revealedWrong" : ""}`} key={index}><b>{answer.icon}</b></button>)}</div><p className={timeLeft === 0 ? participantAnswer === liveQuestion.correct ? "resultCorrect" : "resultWrong" : ""}>{timeLeft > 0 ? participantAnswer !== null ? "Answer locked in!" : "Choose a colour and shape" : liveQuestion.correct === undefined ? "Checking the answer…" : participantAnswer === liveQuestion.correct ? "Correct! Great answer!" : participantAnswer === null ? "Time’s up — no answer submitted" : "Not quite — that answer was wrong"}</p></div> : <div className="waitingCard"><AvatarView avatar={avatar} size="large"/><p>YOU&apos;RE IN</p><h2>{nickname}</h2><div className="waitingDots"><i/><i/><i/></div><h3>Waiting for the host to start…</h3><small>Keep this screen open</small><button onClick={leaveParticipantRoom}>Leave room</button></div>}</div>}
      {hostMode && <div className="studio">
        <header><button className="close" onClick={() => setHostMode(false)}>← Back</button><div className="studioBrand">QuizPop! <span>Quiz editor</span></div><button className="saveQuizBtn" onClick={saveQuizToAccount}>{saveMessage || "Save quiz"}</button><button className="previewBtn" onClick={() => setPreviewing(true)}>◉ Preview</button><button className="present" onClick={postGame}>Post game</button></header>
        <div className="studioBody">
          <aside><h3>QUESTIONS</h3>{questions.map((question, index) => <button key={index} onClick={() => setActiveQuestion(index)} className={`thumb ${activeQuestion === index ? "active" : ""}`}><span>{index + 1}</span><i>{question.image ? "▧" : "?"}</i><b>{question.text || "Untitled question"}</b></button>)}<button className="addQ" onClick={addQuestion}>＋ Add question</button><div className="capacity"><b>♟ 0 / 300</b><span>Live player capacity</span></div></aside>
          <section className="editor">
            <div className="editTop"><select aria-label="Question type"><option>Multiple choice</option><option>True or false</option><option>Poll</option></select><label>Time limit <select><option>20 seconds</option><option>30 seconds</option><option>60 seconds</option></select></label><label>Points <select><option>Standard</option><option>Double</option><option>None</option></select></label></div>
            <input className="questionInput" value={currentQuestion.text} onChange={e => updateQuestion({text:e.target.value})} placeholder="Type your question" aria-label="Question"/>
            <label className={`upload ${currentQuestion.image ? "hasImage" : ""}`} style={currentQuestion.image ? {backgroundImage:`url(${currentQuestion.image})`} : undefined}>{!currentQuestion.image && <><b>＋</b><strong>Add an image to your question</strong><span>PNG or JPG · up to 10 MB</span></>}<input type="file" accept="image/*" onChange={e => loadImage(e.target.files?.[0])}/></label>
            <div className="answerHint"><b>Answer options</b><span>Use wording, a picture, or both</span></div>
            <div className="editAnswers">{answers.map((a,i)=><div className={`${a.color} ${currentQuestion.answerImages[i] ? "withAnswerImage" : ""}`} key={a.text}>{currentQuestion.answerImages[i] && <><div className="answerImageViewport"><img style={{transform:`scale(${currentQuestion.answerScales[i]/100})`}} src={currentQuestion.answerImages[i] || ""} alt={`Answer ${i+1} option`}/></div><label className="imageScale" title="Adjust picture size"><span>−</span><input aria-label={`Picture size for answer ${i+1}`} type="range" min="50" max="180" value={currentQuestion.answerScales[i]} onChange={e => resizeAnswerImage(i,Number(e.target.value))}/><span>＋</span></label></>}<b>{a.icon}</b><input value={currentQuestion.answers[i]} onChange={e => {const next=[...currentQuestion.answers];next[i]=e.target.value;updateQuestion({answers:next})}} placeholder={currentQuestion.answerImages[i] ? "Optional wording" : `Answer ${i+1}`}/><label className="correctPick" title="Correct answer"><input type="radio" checked={currentQuestion.correct===i} onChange={() => updateQuestion({correct:i})} name={`correct-${activeQuestion}`}/><span>✓</span></label>{currentQuestion.answerImages[i] ? <button className="removeAnswerImage" onClick={() => removeAnswerImage(i)} title="Remove picture">×</button> : <label className="answerImageButton" title="Use a picture"><span>▧</span><input type="file" accept="image/*" onChange={e => loadAnswerImage(i,e.target.files?.[0])}/></label>}</div>)}</div>
            <div className="postGameBar"><div>{roomError ? <span className="postError">{roomError}</span> : <span><b>{questions.length}</b> {questions.length === 1 ? "question" : "questions"} ready</span>}</div><button onClick={postGame}>Post game &amp; open lobby →</button></div>
          </section>
        </div>
      </div>}
      {previewing && <div className="questionPreview">
        <header><div><b>{hostPlaying ? "Live host screen" : "Participant preview"}</b><span>Question {activeQuestion + 1} of {questions.length}</span></div><button onClick={() => {setPreviewing(false);setHostPlaying(false)}}>× {hostPlaying ? "End game" : "Close preview"}</button></header>
        <section className={`previewStage ${hostPlaying && hostTimeLeft === 0 ? "rankingStage" : ""}`}>
          <div className={`previewTimer ${hostPlaying && hostTimeLeft <= 5 ? "urgent" : ""}`}>{hostPlaying ? hostTimeLeft : 20}</div>
          <h2>{currentQuestion.text || "Untitled question"}</h2>
          {currentQuestion.image && <img className="previewQuestionImage" src={currentQuestion.image} alt="Question"/>}
          <div className="previewAnswers">{answers.map((answer,index)=><button className={answer.color} key={answer.text}>{currentQuestion.answerImages[index] && <span className="previewAnswerImage"><img style={{transform:`scale(${currentQuestion.answerScales[index]/100})`}} src={currentQuestion.answerImages[index] || ""} alt=""/></span>}<b>{answer.icon}</b>{currentQuestion.answers[index] && <strong>{currentQuestion.answers[index]}</strong>}</button>)}</div>
          {hostPlaying && hostTimeLeft === 0 ? gameFinished ? <div className="podiumReveal"><span className="championEyebrow">QUIZPOP CHAMPIONS</span><h3>{podiumStage < 3 ? "And the winners are…" : "Congratulations!"}</h3><div className="podiumScene">{hostResults[2] && podiumStage >= 1 && <div className="podiumWinner bronzeWinner"><div className="winnerAvatar"><AvatarView avatar={hostResults[2].avatar} size="medium"/></div><strong>{hostResults[2].nickname}</strong><em>{hostResults[2].score} pts</em><div className="podiumBlock"><span>3</span></div></div>}{hostResults[0] && podiumStage >= 3 && <div className="podiumWinner goldWinner"><div className="winnerCrown">♛</div><div className="winnerAvatar"><AvatarView avatar={hostResults[0].avatar} size="medium"/></div><strong>{hostResults[0].nickname}</strong><em>{hostResults[0].score} pts</em><div className="podiumBlock"><span>1</span></div></div>}{hostResults[1] && podiumStage >= 2 && <div className="podiumWinner silverWinner"><div className="winnerAvatar"><AvatarView avatar={hostResults[1].avatar} size="medium"/></div><strong>{hostResults[1].nickname}</strong><em>{hostResults[1].score} pts</em><div className="podiumBlock"><span>2</span></div></div>}</div><button className="nextQuestionBtn" onClick={() => {setPreviewing(false);setHostPlaying(false);setGameFinished(false)}}>Close leaderboard</button></div> : <div className="hostRanking"><h3>Leaderboard · Total points</h3>{hostResults.length ? <ol>{hostResults.map((result,index)=><li className={result.correct ? "correct" : "wrong"} key={result.playerId}><b>{index + 1}</b><AvatarView avatar={result.avatar} size="small"/><span><strong>{result.nickname}</strong><small>{result.correct ? `Correct · ${(result.elapsedMs/1000).toFixed(2)}s` : result.answered ? "Wrong answer" : "No answer"}</small></span><em>{result.score} pts</em></li>)}</ol> : <p>No players are in this room.</p>}<button className="nextQuestionBtn" onClick={startNextQuestion}>{activeQuestion + 1 < questions.length ? "Next question →" : "Finish game"}</button></div> : <p>{hostPlaying ? `${hostResults.filter(result => result.answered).length} of ${participants.length} answered` : "Choose the best answer"}</p>}
        </section>
      </div>}
      {lobby && <div className="lobby">
        <header><span className="brand">QuizPop!</span><span className="lobbyMascot"><img src="/quizpop-mascot.jpg" alt="Yuzu, the QuizPop mascot"/><span><b>Yuzu says:</b> good luck, players!</span></span><button onClick={() => setLobby(false)}>Exit game</button></header>
        <div className="lobbyGrid"><section><span className="livePill">● LIVE LOBBY</span><h2>Join the game</h2><p>Scan with your phone or enter the game code</p>{isLocalSite && !configuredOrigin ? <div className="localQrWarning"><b>QR unavailable on localhost</b><span>Open your deployed Netlify website and post the game there. A phone cannot connect to localhost on this computer.</span></div> : <div className="qr"><img alt={`QR code to join room ${roomCode}`} src={qrUrl}/></div>}<div className="roomCode"><span>GAME CODE</span><b>{roomCode}</b><small>{joinOrigin.replace(/^https?:\/\//, "")}</small></div></section><aside><div className="playerCount"><b>{participants.length}</b><span>/ 300 players</span></div>{participants.length ? <><h3>Players in the room</h3><div className="playerNames">{participants.map(player => <span key={player.id}><AvatarView avatar={player.avatar} size="small"/><b>{player.nickname}</b></span>)}</div></> : <><h3>Players will appear here</h3><p>Share the code or QR with your audience.</p></>}<button disabled={!participants.length} onClick={startLiveGame}>{participants.length ? `Start game with ${participants.length}` : "Waiting for players"}</button></aside></div>
      </div>}
    </main>
  );
}
