// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io();

function App() {
  const [mode, setMode] = useState('host'); // 'host', 'player'
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({});
  const [players, setPlayers] = useState({});
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    socket.on('game-joined', (data) => {
      setPlayers(data.players);
      setPin(data.pin);
    });
    socket.on('quiz-generated', (qs) => setQuestions(qs));
    socket.on('new-question', (q) => {
      setCurrentQuestion(q.question);
      setCountdown(q.time);
    });
    socket.on('player-joined', (pls) => setPlayers(pls));
  }, []);

  const generateAIQuiz = () => {
    socket.emit('create-ai-quiz', { 
      pin, 
      theme, 
      difficulty, 
      numQuestions: parseInt(numQuestions)
    });
  };

  const joinGame = () => {
    socket.emit('join-game', { pin, name });
    setMode('game');
  };

  const nextQuestion = () => {
    socket.emit('next-question', { pin });
  };

  const sendAnswer = (option) => {
    socket.emit('answer', { pin, option });
  };

  if (mode === 'lobby') {
    return (
      <div className="host-lobby">
        <h1>🎯 AI Quiz Host</h1>
        <input placeholder="PIN (bijv. 1234)" value={pin || ''} onChange={(e) => setPin(e.target.value)} />
        <input placeholder="Thema (Film, Geschiedenis, etc)" value={theme} onChange={(e) => setTheme(e.target.value)} />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Makkelijk</option>
          <option value="medium">Gemiddeld</option>
          <option value="hard">Moeilijk</option>
        </select>
        <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} min="5" max="20" />
        <button onClick={generateAIQuiz}>🤖 AI Quiz Genereren</button>
        <div>Vragen: {questions.length}</div>
        <button onClick={nextQuestion} disabled={questions.length === 0}>▶️ Volgende Vraag</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sidebar">
        <button onClick={() => setMode(mode === 'host' ? 'lobby' : 'host')}>
          {mode === 'host' ? 'Host Modus' : 'Speler Modus'}
        </button>
        
        {mode === 'host' ? (
          <div>
            <h3>Host Paneel</h3>
            <input placeholder="Naam" onChange={(e) => setName(e.target.value)} />
            <input placeholder="PIN" onChange={(e) => setPin(e.target.value)} />
            <button onClick={joinGame}>Game Starten</button>
            <div>Spelers: {Object.keys(players).length}</div>
          </div>
        ) : (
          <div>
            <input placeholder="Jouw naam" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            <button onClick={joinGame}>Meespelen</button>
          </div>
        )}
      </div>
      
      <div className="main-screen">
        {mode === 'game' && currentQuestion.question && (
          <>
            <h1>{currentQuestion.question}</h1>
            <div>{countdown}s ⏰</div>
            <div className="options">
              {currentQuestion.options?.map((opt, i) => (
                <button key={i} onClick={() => sendAnswer(i)}>{String.fromCharCode(65+i)}. {opt}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
