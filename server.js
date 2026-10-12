const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// In-memory Game Rooms
const rooms = {};

// Bot helper names and avatars
const BOT_NAMES = ['CyberByte (Bot)', 'NeoGuess (Bot)', 'PixelGenius (Bot)', 'QuantumQ (Bot)', 'CipherAI (Bot)'];
const BOT_AVATARS = ['CB', 'NG', 'PG', 'QQ', 'CA'];

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSecretCode(digits = 4) {
  // 4 unique digits e.g. "4821"
  const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  nums.sort(() => Math.random() - 0.5);
  return nums.slice(0, digits).join('');
}

function evaluateBullsAndCows(guessStr, secretStr) {
  let bulls = 0;
  let cows = 0;
  const guess = String(guessStr).split('');
  const secret = String(secretStr).split('');

  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }
  return { bulls, cows };
}

// Generate all valid 4-digit codes with unique digits for smart bot deduction
function getAllCodebreakerCandidates() {
  const list = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          list.push(`${a}${b}${c}${d}`);
        }
      }
    }
  }
  return list;
}

function sanitizeRoomState(room) {
  const isPlaying = room.status === 'playing';
  // In lobby or between games, only show currently connected players or bots (no ghosts!)
  const playersList = Object.values(room.players)
    .filter(p => p.isBot || p.connected)
    .map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      botLevel: p.botLevel,
      score: p.score,
      roundScore: p.roundScore,
      isReady: p.isReady,
      connected: p.connected,
      attemptsCount: p.attempts.length,
      lastGuess: p.attempts[p.attempts.length - 1] || null
    }));

  return {
    id: room.id,
    status: room.status,
    hostId: room.hostId,
    settings: room.settings,
    currentRound: room.currentRound,
    currentBounds: room.currentBounds,
    timeLeft: room.timeLeft,
    activeTurnPlayerId: room.turnOrder[room.activeTurnIndex] || null,
    players: playersList,
    history: room.history,
    targetNumber: isPlaying ? null : room.targetNumber,
    targetCode: isPlaying ? null : room.targetCode,
    isPublic: room.isPublic
  };
}

function clearAllBotTimeouts(room) {
  Object.values(room.players).forEach(p => {
    if (p.actionTimeout) {
      clearTimeout(p.actionTimeout);
      p.actionTimeout = null;
    }
  });
}

function startRound(room) {
  clearAllBotTimeouts(room);

  room.status = 'playing';
  room.currentBounds = { min: 1, max: room.settings.maxRange };

  // Prioritize human players so humans always go first, bots take turns after
  const humans = Object.keys(room.players).filter(id => !room.players[id].isBot && room.players[id].connected);
  const bots = Object.keys(room.players).filter(id => room.players[id].isBot && room.players[id].connected);
  room.turnOrder = [...humans, ...bots];
  room.activeTurnIndex = 0;

  // Reset round data
  Object.values(room.players).forEach(p => {
    p.roundScore = 0;
    p.attempts = [];
  });

  if (room.settings.mode === 'codebreaker') {
    room.targetCode = generateSecretCode(4);
    room.targetNumber = null;
    const allCodes = getAllCodebreakerCandidates();
    bots.forEach(botId => {
      if (room.players[botId]) {
        room.players[botId].codeCandidates = [...allCodes];
      }
    });
  } else {
    room.targetNumber = getRandomInt(1, room.settings.maxRange);
    room.targetCode = null;
  }

  // Turn Timer setup
  startTurnTimer(room);

  io.to(room.id).emit('round_started', sanitizeRoomState(room));

  // Check if first turn belongs to a bot (if no humans exist)
  checkBotTurn(room);
}

function startTurnTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // If unlimited timer (0), do nothing
  if (!room.settings.roundTime || room.settings.roundTime <= 0) {
    room.timeLeft = 0;
    return;
  }

  room.timeLeft = room.settings.roundTime;
  io.to(room.id).emit('timer_tick', { timeLeft: room.timeLeft });

  room.timer = setInterval(() => {
    if (room.status !== 'playing') {
      clearInterval(room.timer);
      room.timer = null;
      return;
    }

    room.timeLeft--;
    io.to(room.id).emit('timer_tick', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;

      if (room.settings.mode === 'turn_based' && room.turnOrder.length > 1) {
        // Current player timed out on their turn: skip to next player's turn!
        const timedOutPlayerId = room.turnOrder[room.activeTurnIndex];
        const timedOutPlayer = room.players[timedOutPlayerId];
        const playerName = timedOutPlayer ? timedOutPlayer.name : 'Player';

        io.to(room.id).emit('turn_timeout', {
          playerId: timedOutPlayerId,
          playerName: playerName,
          message: `${playerName}'s turn timed out! Switching turn.`
        });

        // Advance to next turn and reset the 30s timer for the next player
        room.activeTurnIndex = (room.activeTurnIndex + 1) % room.turnOrder.length;
        const nextPlayerId = room.turnOrder[room.activeTurnIndex];
        io.to(room.id).emit('turn_changed', {
          activeTurnPlayerId: nextPlayerId
        });
        startTurnTimer(room);
        checkBotTurn(room);
      } else {
        // Solo game or blitz mode time up
        endRound(room, null, 'Time up! Nobody guessed the number.');
      }
    }
  }, 1000);
}

function endRound(room, winnerPlayerId, reason) {
  clearAllBotTimeouts(room);

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.status = 'round_end';

  let winnerName = null;
  if (winnerPlayerId && room.players[winnerPlayerId]) {
    winnerName = room.players[winnerPlayerId].name;
  }

  const roundResult = {
    round: room.currentRound,
    targetNumber: room.targetNumber,
    targetCode: room.targetCode,
    winnerId: winnerPlayerId,
    winnerName: winnerName,
    reason: reason,
    scores: Object.values(room.players).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      roundScore: p.roundScore,
      attempts: p.attempts.length
    }))
  };

  room.history.push(roundResult);
  io.to(room.id).emit('round_ended', {
    ...roundResult,
    roomState: sanitizeRoomState(room)
  });

  // Next round or match end
  if (room.nextRoundTimeout) clearTimeout(room.nextRoundTimeout);
  room.nextRoundTimeout = setTimeout(() => {
    room.nextRoundTimeout = null;
    if (!rooms[room.id]) return;
    if (room.currentRound >= room.settings.totalRounds) {
      room.status = 'game_over';
      io.to(room.id).emit('game_over', sanitizeRoomState(room));
    } else {
      room.currentRound++;
      startRound(room);
    }
  }, 5000);
}

function checkBotTurn(room) {
  if (room.status !== 'playing') return;

  if (room.settings.mode === 'turn_based') {
    const currentTurnId = room.turnOrder[room.activeTurnIndex];
    const player = room.players[currentTurnId];
    // ONLY schedule if current turn belongs to a bot!
    // If it's a human player's turn, the bot does NOTHING and WAITS for human!
    if (player && player.isBot) {
      scheduleBotGuess(room, player);
    }
  } else if (room.settings.mode === 'blitz') {
    // In blitz, each bot waits at least 4-6s between guesses to avoid spamming
    Object.values(room.players).forEach(p => {
      if (p.isBot && !p.actionTimeout) {
        scheduleBotBlitzGuess(room, p);
      }
    });
  }
}

function calculateBotGuess(room, bot) {
  if (room.settings.mode === 'codebreaker') {
    if (!bot.codeCandidates || bot.codeCandidates.length === 0) {
      bot.codeCandidates = getAllCodebreakerCandidates();
    }
    // Pick from deduced candidate codes
    const sampleSize = Math.min(8, bot.codeCandidates.length);
    const chosenIndex = Math.floor(Math.random() * sampleSize);
    return bot.codeCandidates[chosenIndex] || generateSecretCode(4);
  }

  const min = room.currentBounds.min;
  const max = room.currentBounds.max;

  if (min >= max) {
    return min;
  }

  // Find all numbers already guessed in this round
  const guessedNumbers = new Set();
  Object.values(room.players).forEach(p => {
    p.attempts.forEach(att => {
      if (typeof att.guess === 'number') {
        guessedNumbers.add(att.guess);
      }
    });
  });

  // Build candidate numbers strictly within [min, max] that haven't been guessed yet
  const candidates = [];
  for (let n = min; n <= max; n++) {
    if (!guessedNumbers.has(n)) {
      candidates.push(n);
    }
  }

  // Safety fallback if all have been guessed
  if (candidates.length === 0) {
    return Math.floor((min + max) / 2);
  }

  // Genius Bot: pure binary search midpoint
  if (bot.botLevel === 'genius') {
    const mid = Math.round((min + max) / 2);
    candidates.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    return candidates[0];
  }

  // Medium / Smart Bot:
  // Tracks previous round attempts to check if previous guess was hot
  const allAttempts = [];
  Object.values(room.players).forEach(p => {
    allAttempts.push(...p.attempts);
  });
  allAttempts.sort((a, b) => a.timestamp - b.timestamp);
  const lastAttempt = allAttempts[allAttempts.length - 1];

  if (bot.botLevel === 'medium') {
    // If last attempt was burning hot or hot, probe immediately adjacent numbers!
    if (lastAttempt && (lastAttempt.proximity === 'burning' || lastAttempt.proximity === 'hot') && typeof lastAttempt.guess === 'number') {
      if (lastAttempt.hint === 'high') {
        // Last was too high: candidate must be < lastAttempt.guess
        const lowerList = candidates.filter(c => c < lastAttempt.guess);
        if (lowerList.length > 0) {
          lowerList.sort((a, b) => b - a); // pick closest lower
          return lowerList[0];
        }
      } else if (lastAttempt.hint === 'low') {
        // Last was too low: candidate must be > lastAttempt.guess
        const higherList = candidates.filter(c => c > lastAttempt.guess);
        if (higherList.length > 0) {
          higherList.sort((a, b) => a - b); // pick closest higher
          return higherList[0];
        }
      }
    }

    // Logical cut: pick near midpoint with slight realistic variance
    const mid = Math.round((min + max) / 2);
    const variance = Math.max(1, Math.round((max - min) * 0.12));
    const targetGuess = Math.max(min, Math.min(max, mid + getRandomInt(-variance, variance)));
    candidates.sort((a, b) => Math.abs(a - targetGuess) - Math.abs(b - targetGuess));
    return candidates[0];
  }

  // Easy bot: picks randomly among candidates, still strictly within bounds
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function scheduleBotGuess(room, bot) {
  if (bot.actionTimeout) {
    clearTimeout(bot.actionTimeout);
    bot.actionTimeout = null;
  }

  // Broadcast that the bot is thinking
  io.to(room.id).emit('bot_thinking', {
    botId: bot.id,
    botName: bot.name,
    avatar: bot.avatar
  });

  const delay = getRandomInt(1400, 2200); // 1.4 to 2.2 seconds realistic thinking time
  bot.actionTimeout = setTimeout(() => {
    bot.actionTimeout = null;
    if (room.status !== 'playing') return;

    // Double check it is still this bot's turn
    const currentTurnId = room.turnOrder[room.activeTurnIndex];
    if (currentTurnId !== bot.id) return;

    const guess = calculateBotGuess(room, bot);
    processGuess(room, bot.id, guess);
  }, delay);
}

function scheduleBotBlitzGuess(room, bot) {
  if (bot.actionTimeout) {
    clearTimeout(bot.actionTimeout);
    bot.actionTimeout = null;
  }

  const delay = getRandomInt(4500, 7000);
  bot.actionTimeout = setTimeout(() => {
    bot.actionTimeout = null;
    if (room.status !== 'playing') return;

    const guess = calculateBotGuess(room, bot);
    processGuess(room, bot.id, guess);

    if (room.status === 'playing' && room.settings.mode === 'blitz') {
      scheduleBotBlitzGuess(room, bot);
    }
  }, delay);
}

function processGuess(room, playerId, guessVal) {
  if (room.status !== 'playing') return;
  const player = room.players[playerId];
  if (!player) return;

  // Strict Turn Enforcement in Turn-Based Mode
  if (room.settings.mode === 'turn_based') {
    const currentTurnId = room.turnOrder[room.activeTurnIndex];
    if (currentTurnId !== playerId) {
      return; // Not player's turn!
    }
  }

  let result = {};

  if (room.settings.mode === 'codebreaker') {
    const guessStr = String(guessVal).trim();
    if (guessStr.length !== 4) return;
    const { bulls, cows } = evaluateBullsAndCows(guessStr, room.targetCode);
    const isCorrect = bulls === 4;

    result = {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      guess: guessStr,
      bulls,
      cows,
      isCorrect,
      timestamp: Date.now()
    };

    player.attempts.push(result);

    // Filter candidate list for all bots using this deduction
    Object.values(room.players).forEach(p => {
      if (p.isBot && p.codeCandidates) {
        p.codeCandidates = p.codeCandidates.filter(candidate => {
          const evalRes = evaluateBullsAndCows(guessStr, candidate);
          return evalRes.bulls === bulls && evalRes.cows === cows;
        });
      }
    });

    io.to(room.id).emit('guess_result', {
      mode: 'codebreaker',
      result,
      playerStats: {
        id: player.id,
        attemptsCount: player.attempts.length
      }
    });

    if (isCorrect) {
      const attemptsCount = player.attempts.length;
      const roundPoints = Math.max(10, 100 - (attemptsCount - 1) * 15);
      player.score += roundPoints;
      player.roundScore = roundPoints;
      endRound(room, playerId, `${player.name} cracked the code ${room.targetCode}!`);
      return;
    }
  } else {
    // Numeric Guessing Mode (Turn-Based or Blitz)
    const guess = parseInt(guessVal, 10);
    if (isNaN(guess)) return;

    const target = room.targetNumber;
    let hint = 'correct';
    let diff = Math.abs(guess - target);
    let proximity = 'cold';

    // Strictly update bounds so range shrinks correctly
    if (guess > target) {
      hint = 'high';
      room.currentBounds.max = Math.min(room.currentBounds.max, guess - 1);
    } else if (guess < target) {
      hint = 'low';
      room.currentBounds.min = Math.max(room.currentBounds.min, guess + 1);
    }

    if (diff === 0) proximity = 'correct';
    else if (diff <= Math.max(3, Math.round(room.settings.maxRange * 0.03))) proximity = 'burning';
    else if (diff <= Math.max(8, Math.round(room.settings.maxRange * 0.08))) proximity = 'hot';
    else if (diff <= Math.max(20, Math.round(room.settings.maxRange * 0.2))) proximity = 'warm';

    result = {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      guess,
      hint,
      proximity,
      diff,
      bounds: { ...room.currentBounds },
      timestamp: Date.now()
    };

    player.attempts.push(result);

    io.to(room.id).emit('guess_result', {
      mode: room.settings.mode,
      result,
      bounds: room.currentBounds,
      playerStats: {
        id: player.id,
        attemptsCount: player.attempts.length
      }
    });

    if (hint === 'correct') {
      const timeBonus = room.settings.roundTime > 0 ? Math.round((room.timeLeft / room.settings.roundTime) * 40) : 10;
      const attemptsPenalty = Math.min(30, (player.attempts.length - 1) * 5);
      const roundPoints = Math.max(20, 60 + timeBonus - attemptsPenalty);

      player.score += roundPoints;
      player.roundScore = roundPoints;
      endRound(room, playerId, `${player.name} guessed the exact number ${target}! 🎉`);
      return;
    }
  }

  // Turn advance logic for turn-based mode
  if (room.settings.mode === 'turn_based') {
    room.activeTurnIndex = (room.activeTurnIndex + 1) % room.turnOrder.length;
    const nextPlayerId = room.turnOrder[room.activeTurnIndex];
    io.to(room.id).emit('turn_changed', {
      activeTurnPlayerId: nextPlayerId
    });

    // Reset the timer back to full turn time (e.g. 30s) after every guess
    startTurnTimer(room);

    // Check if next turn is a bot
    checkBotTurn(room);
  }
}

// Socket.IO Events
io.on('connection', (socket) => {
  let currentRoomId = null;

  // Create room
  socket.on('create_room', (data) => {
    const roomId = generateRoomId();
    const { name, avatar, settings, isPublic } = data;

    rooms[roomId] = {
      id: roomId,
      isPublic: !!isPublic,
      status: 'waiting',
      hostId: socket.id,
      settings: {
        mode: settings?.mode || 'turn_based',
        maxRange: parseInt(settings?.maxRange, 10) || 100,
        roundTime: parseInt(settings?.roundTime, 10) || 30,
        totalRounds: parseInt(settings?.totalRounds, 10) || 5
      },
      currentRound: 1,
      targetNumber: null,
      targetCode: null,
      currentBounds: { min: 1, max: 100 },
      activeTurnIndex: 0,
      timer: null,
      timeLeft: 0,
      players: {
        [socket.id]: {
          id: socket.id,
          name: name || 'Player 1',
          avatar: avatar || '🎮',
          isBot: false,
          score: 0,
          roundScore: 0,
          attempts: [],
          isReady: true,
          connected: true
        }
      },
      turnOrder: [socket.id],
      history: [],
      chat: []
    };

    currentRoomId = roomId;
    socket.join(roomId);
    socket.emit('room_created', {
      roomId,
      roomState: sanitizeRoomState(rooms[roomId])
    });
  });

  // Join room
  socket.on('join_room', ({ roomId, name, avatar }) => {
    const targetRoomId = (roomId || '').trim().toUpperCase();
    const room = rooms[targetRoomId];

    if (!room) {
      socket.emit('error_message', 'Room not found. Check the code or create a new room.');
      return;
    }

    if (Object.keys(room.players).length >= 10) {
      socket.emit('error_message', 'Room is currently full (max 10 players).');
      return;
    }

    if (room.deleteTimeout) {
      clearTimeout(room.deleteTimeout);
      room.deleteTimeout = null;
    }

    currentRoomId = targetRoomId;
    socket.join(targetRoomId);

    room.players[socket.id] = {
      id: socket.id,
      name: name || `Player ${Object.keys(room.players).length + 1}`,
      avatar: avatar || '🚀',
      isBot: false,
      score: 0,
      roundScore: 0,
      attempts: [],
      isReady: false,
      connected: true
    };

    if (!room.turnOrder.includes(socket.id)) {
      room.turnOrder.push(socket.id);
    }

    socket.emit('room_joined', {
      roomId: targetRoomId,
      roomState: sanitizeRoomState(room)
    });

    io.to(targetRoomId).emit('player_joined', {
      player: room.players[socket.id],
      roomState: sanitizeRoomState(room)
    });
  });

  // Quick match / join public room
  socket.on('quick_match', ({ name, avatar }) => {
    // Only match into rooms that are waiting, have space, and have at least 1 currently connected human player
    let publicRoom = Object.values(rooms).find(
      r => r.isPublic && 
           r.status === 'waiting' && 
           Object.values(r.players).some(p => !p.isBot && p.connected) &&
           Object.values(r.players).filter(p => p.isBot || p.connected).length < 8
    );

    if (publicRoom) {
      socket.emit('match_found', { roomId: publicRoom.id });
    } else {
      // Auto-create public room with turn_based as default
      const roomId = generateRoomId();
      rooms[roomId] = {
        id: roomId,
        isPublic: true,
        status: 'waiting',
        hostId: socket.id,
        settings: {
          mode: 'turn_based',
          maxRange: 100,
          roundTime: 30,
          totalRounds: 5
        },
        currentRound: 1,
        targetNumber: null,
        targetCode: null,
        currentBounds: { min: 1, max: 100 },
        activeTurnIndex: 0,
        timer: null,
        timeLeft: 0,
        players: {
          [socket.id]: {
            id: socket.id,
            name: name || 'Player 1',
            avatar: avatar || '⚡',
            isBot: false,
            score: 0,
            roundScore: 0,
            attempts: [],
            isReady: true,
            connected: true
          }
        },
        turnOrder: [socket.id],
        history: [],
        chat: []
      };

      currentRoomId = roomId;
      socket.join(roomId);
      socket.emit('room_created', {
        roomId,
        roomState: sanitizeRoomState(rooms[roomId])
      });
    }
  });

  // Add bot player
  socket.on('add_bot', ({ level = 'medium' }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.hostId !== socket.id) return;

    const botId = 'bot_' + Math.random().toString(36).substring(2, 8);
    const botIndex = Object.values(room.players).filter(p => p.isBot).length;
    const botName = BOT_NAMES[botIndex % BOT_NAMES.length];
    const botAvatar = BOT_AVATARS[botIndex % BOT_AVATARS.length];

    room.players[botId] = {
      id: botId,
      name: botName,
      avatar: botAvatar,
      isBot: true,
      botLevel: level,
      score: 0,
      roundScore: 0,
      attempts: [],
      isReady: true,
      connected: true,
      actionTimeout: null
    };

    // Bots go after humans in turn order
    room.turnOrder.push(botId);

    io.to(room.id).emit('player_joined', {
      player: room.players[botId],
      roomState: sanitizeRoomState(room)
    });
  });

  // Remove bot player
  socket.on('remove_bot', ({ botId }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.hostId !== socket.id) return;
    if (room.players[botId] && room.players[botId].isBot) {
      if (room.players[botId].actionTimeout) {
        clearTimeout(room.players[botId].actionTimeout);
      }
      delete room.players[botId];
      room.turnOrder = room.turnOrder.filter(id => id !== botId);
      io.to(room.id).emit('player_left', {
        playerId: botId,
        roomState: sanitizeRoomState(room)
      });
    }
  });

  // Update game settings (host only)
  socket.on('update_settings', (newSettings) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.hostId !== socket.id || room.status !== 'waiting') return;

    room.settings = {
      ...room.settings,
      ...newSettings
    };
    room.currentBounds = { min: 1, max: room.settings.maxRange };

    io.to(room.id).emit('settings_updated', {
      settings: room.settings,
      roomState: sanitizeRoomState(room)
    });
  });

  // Toggle ready status
  socket.on('toggle_ready', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    const player = room.players[socket.id];
    if (player) {
      player.isReady = !player.isReady;
      io.to(room.id).emit('player_ready_changed', {
        playerId: socket.id,
        isReady: player.isReady,
        roomState: sanitizeRoomState(room)
      });
    }
  });

  // Start game (host only)
  socket.on('start_game', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.hostId !== socket.id) return;

    room.currentRound = 1;
    Object.values(room.players).forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.attempts = [];
    });
    room.history = [];

    startRound(room);
  });

  // Submit guess
  socket.on('make_guess', ({ guess }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    processGuess(room, socket.id, guess);
  });

  // Immediate Continue / Play Again (start game immediately with same players)
  socket.on('continue_game', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.status === 'round_end') {
      if (room.nextRoundTimeout) {
        clearTimeout(room.nextRoundTimeout);
        room.nextRoundTimeout = null;
      }
      if (room.currentRound >= room.settings.totalRounds) {
        room.status = 'game_over';
        io.to(room.id).emit('game_over', sanitizeRoomState(room));
      } else {
        room.currentRound++;
        startRound(room);
      }
    } else if (room.status === 'game_over') {
      // Restart fresh game with same players
      if (room.hostId === socket.id) {
        clearAllBotTimeouts(room);
        room.currentRound = 1;
        Object.values(room.players).forEach(p => {
          p.score = 0;
          p.roundScore = 0;
          p.attempts = [];
          p.isReady = true;
        });
        startRound(room);
      }
    }
  });

  // Leave Game (Return to Room Lobby without leaving the room)
  socket.on('leave_game_to_lobby', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
    clearAllBotTimeouts(room);
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    room.status = 'waiting';
    room.currentRound = 1;
    Object.values(room.players).forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.attempts = [];
      p.isReady = p.isBot; // humans can ready up again
    });

    const leavingPlayer = room.players[socket.id];
    const playerName = leavingPlayer ? leavingPlayer.name : 'A player';

    io.to(room.id).emit('returned_to_lobby', {
      message: `${playerName} returned to the room lobby.`,
      roomState: sanitizeRoomState(room)
    });
  });

  // Explicit Leave Room (User clicks Back to Menu / Leave Room)
  socket.on('leave_room', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    socket.leave(currentRoomId);

    if (room.players[socket.id]) {
      delete room.players[socket.id];
      room.turnOrder = room.turnOrder.filter(id => id !== socket.id);
    }

    const remainingHumans = Object.values(room.players).filter(p => !p.isBot && p.connected);
    if (remainingHumans.length === 0) {
      clearAllBotTimeouts(room);
      if (room.timer) clearInterval(room.timer);
      delete rooms[currentRoomId];
    } else {
      if (room.hostId === socket.id) {
        room.hostId = remainingHumans[0].id;
        io.to(room.id).emit('host_changed', { hostId: room.hostId });
      }
      io.to(room.id).emit('player_left', {
        playerId: socket.id,
        roomState: sanitizeRoomState(room)
      });
    }

    currentRoomId = null;
  });

  // Restart match after game over
  socket.on('restart_game', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    if (room.hostId !== socket.id) return;

    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
    clearAllBotTimeouts(room);
    room.status = 'waiting';
    room.currentRound = 1;
    Object.values(room.players).forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.attempts = [];
      p.isReady = p.id === room.hostId || p.isBot;
    });
    io.to(room.id).emit('game_restarted', sanitizeRoomState(room));
  });

  // Send in-game chat or reaction
  socket.on('send_chat', ({ message, reaction }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];
    const player = room.players[socket.id];
    if (!player) return;

    const chatMsg = {
      id: Date.now() + Math.random().toString(36).substring(2, 5),
      senderId: socket.id,
      senderName: player.name,
      avatar: player.avatar,
      message: message ? message.slice(0, 100) : '',
      reaction: reaction || null,
      timestamp: Date.now()
    };

    room.chat.push(chatMsg);
    if (room.chat.length > 50) room.chat.shift();

    io.to(room.id).emit('new_chat', chatMsg);
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    if (room.players[socket.id]) {
      if (room.status === 'waiting') {
        // In lobby, immediately remove disconnected player so they don't persist as ghosts!
        delete room.players[socket.id];
        room.turnOrder = room.turnOrder.filter(id => id !== socket.id);
      } else {
        // In active game, mark disconnected to preserve current scores/history
        room.players[socket.id].connected = false;
      }
      
      io.to(room.id).emit('player_left', {
        playerId: socket.id,
        roomState: sanitizeRoomState(room)
      });
    }

    const remainingHumans = Object.values(room.players).filter(p => !p.isBot && p.connected);

    if (remainingHumans.length === 0) {
      // If no active humans are left in lobby, remove room immediately
      if (room.status === 'waiting') {
        clearAllBotTimeouts(room);
        if (room.timer) clearInterval(room.timer);
        delete rooms[currentRoomId];
      } else {
        // In active match, allow 30 seconds reconnect window
        if (room.deleteTimeout) clearTimeout(room.deleteTimeout);
        room.deleteTimeout = setTimeout(() => {
          const activeHumans = Object.values(room.players).filter(p => !p.isBot && p.connected);
          if (activeHumans.length === 0) {
            clearAllBotTimeouts(room);
            if (room.timer) clearInterval(room.timer);
            delete rooms[currentRoomId];
          }
        }, 30000);
      }
    } else if (room.hostId === socket.id) {
      // Reassign host to remaining active human
      room.hostId = remainingHumans[0].id;
      io.to(room.id).emit('host_changed', { hostId: room.hostId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Number Guessing Multiplayer Server running at http://localhost:${PORT}`);
});
