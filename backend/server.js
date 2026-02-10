// backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const OpenAI = require('openai'); // of Groq

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend/build')); // Serve React

// OpenAI setup (gebruik je eigen API key of Groq gratis)
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'demo-key' 
});

// In-memory storage (voor productie: PostgreSQL/Redis)
let games = {}; // { pin: { questions, players, currentQuestion, etc } }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-game', ({ pin, name }) => {
    if (!games[pin]) {
      games[pin] = { players: {}, questions: [], currentQuestion: 0, host: socket.id };
    }
    games[pin].players[socket.id] = { name, score: 0, answered: false };
    socket.join(pin);
    socket.emit('game-joined', { pin, players: games[pin].players });
    io.to(pin).emit('player-joined', games[pin].players);
  });

  socket.on('create-ai-quiz', async ({ pin, theme, difficulty, numQuestions }) => {
    try {
      const prompt = `Genereer ${numQuestions} quiz vragen over "${theme}". Moeilijkheidsgraad: ${difficulty}.
      Formaat: JSON array met {question, options: [A,B,C,D], correct: 0-3}
      Optie 0 is altijd correct.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // of "grok-beta" bij Groq
        messages: [{ role: "user", content: prompt }],
      });

      const questions = JSON.parse(response.choices[0].message.content);
      games[pin].questions = questions;
      io.to(pin).emit('quiz-generated', questions);
    } catch (error) {
      socket.emit('error', 'AI generatie mislukt: ' + error.message);
    }
  });

  socket.on('next-question', ({ pin }) => {
    if (games[pin]) {
      games[pin].currentQuestion++;
      io.to(pin).emit('new-question', {
        question: games[pin].questions[games[pin].currentQuestion - 1],
        time: 30
      });
    }
  });

  socket.on('answer', ({ pin, option }) => {
    if (games[pin]) {
      const player = games[pin].players[socket.id];
      player.answered = true;
      if (option === games[pin].questions[games[pin].currentQuestion - 1].correct) {
        player.score += 100;
      }
      io.to(pin).emit('player-answer', { playerId: socket.id, correct: option === correct });
    }
  });

  socket.on('disconnect', () => {
    // Cleanup logic
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server op poort ${PORT}`));
