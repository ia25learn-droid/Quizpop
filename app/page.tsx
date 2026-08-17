"use client";

import { useState } from "react";

const answers = [
  { icon: "▲", text: "Venus", color: "red" },
  { icon: "◆", text: "Mars", color: "blue" },
  { icon: "●", text: "Jupiter", color: "gold" },
  { icon: "■", text: "Saturn", color: "green" },
];

export default function Home() {
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hostMode, setHostMode] = useState(false);
  const [lobby, setLobby] = useState(false);
  const [questionImage, setQuestionImage] = useState<string | null>(null);

  function loadImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setQuestionImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#">QuizPop<span>!</span></a>
        <div className="navlinks"><a href="#features">How it works</a><a href="#features">Features</a></div>
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
        </div>
      </section>
      <section id="features" className="featureBar">
        <div><b>◎</b><span><strong>Scan &amp; play</strong>No app needed</span></div><div><b>⚡</b><span><strong>Instant action</strong>Zero setup friction</span></div><div><b>▧</b><span><strong>Pictures welcome</strong>Questions &amp; answers</span></div><div><b>♟</b><span><strong>Room for everyone</strong>Up to 300 players</span></div>
      </section>
      {joined && <div className="modal" onClick={() => setJoined(false)}><div onClick={e => e.stopPropagation()}><span className="success">✓</span><h2>You&apos;re in!</h2><p>Room <b>{code}</b> is ready. Choose a nickname to join the lobby.</p><input autoFocus placeholder="Your nickname"/><button>Enter lobby →</button><small onClick={() => setJoined(false)}>Cancel</small></div></div>}
      {hostMode && <div className="studio">
        <header><button className="close" onClick={() => setHostMode(false)}>← Back</button><div className="studioBrand">QuizPop! <span>Quiz editor</span></div><button className="present" onClick={() => {setHostMode(false);setLobby(true)}}>Start live game</button></header>
        <div className="studioBody">
          <aside><h3>QUESTIONS</h3><button className="thumb active"><span>1</span><i>🪐</i><b>Multiple choice</b></button><button className="addQ">＋ Add question</button><div className="capacity"><b>♟ 0 / 300</b><span>Live player capacity</span></div></aside>
          <section className="editor">
            <div className="editTop"><select aria-label="Question type"><option>Multiple choice</option><option>True or false</option><option>Poll</option></select><label>Time limit <select><option>20 seconds</option><option>30 seconds</option><option>60 seconds</option></select></label><label>Points <select><option>Standard</option><option>Double</option><option>None</option></select></label></div>
            <input className="questionInput" defaultValue="Which planet is known as the Red Planet?" aria-label="Question"/>
            <label className={`upload ${questionImage ? "hasImage" : ""}`} style={questionImage ? {backgroundImage:`url(${questionImage})`} : undefined}>{!questionImage && <><b>＋</b><strong>Add an image to your question</strong><span>PNG or JPG · up to 10 MB</span></>}<input type="file" accept="image/*" onChange={e => loadImage(e.target.files?.[0])}/></label>
            <div className="editAnswers">{answers.map((a,i)=><div className={a.color} key={a.text}><b>{a.icon}</b><input defaultValue={a.text}/><label title="Correct answer"><input type="radio" defaultChecked={i===1} name="correct"/><span>✓</span></label><button title="Add image">▧</button></div>)}</div>
          </section>
        </div>
      </div>}
      {lobby && <div className="lobby">
        <header><span className="brand">QuizPop!</span><button onClick={() => setLobby(false)}>Exit game</button></header>
        <div className="lobbyGrid"><section><span className="livePill">● LIVE LOBBY</span><h2>Join the game</h2><p>Scan with your phone or enter the game code</p><div className="qr"><img alt="QR code to join room 7QX9KP" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fquizpop.example%2Fjoin%2F7QX9KP"/></div><div className="roomCode"><span>GAME CODE</span><b>7QX9KP</b></div></section><aside><div className="playerCount"><b>0</b><span>/ 300 players</span></div><h3>Players will appear here</h3><p>Share the code or QR with your audience. You can start whenever you&apos;re ready.</p><button disabled>Start game</button></aside></div>
      </div>}
    </main>
  );
}
