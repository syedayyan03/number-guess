// Modern Minimalist Application Logic for NumberVerse
class NumberVerseApp {
  constructor() {
    this.socket = null;
    this.currentScreen = 'menu';
    this.player = {
      name: 'Player 1',
      avatar: 'NV'
    };
    this.roomState = null;
    this.myId = null;
    this.isMuted = false;

    this.avatars = [
      { id: 'NV', label: 'NV', color: 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40' },
      { id: 'AL', label: 'AL', color: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40' },
      { id: 'ZX', label: 'ZX', color: 'bg-cyan-600/30 text-cyan-400 border-cyan-500/40' },
      { id: 'MQ', label: 'MQ', color: 'bg-purple-600/30 text-purple-400 border-purple-500/40' },
      { id: 'PX', label: 'PX', color: 'bg-rose-600/30 text-rose-400 border-rose-500/40' },
      { id: 'KY', label: 'KY', color: 'bg-amber-600/30 text-amber-400 border-amber-500/40' },
      { id: 'RA', label: 'RA', color: 'bg-blue-600/30 text-blue-400 border-blue-500/40' },
      { id: 'OP', label: 'OP', color: 'bg-teal-600/30 text-teal-400 border-teal-500/40' }
    ];

    this.defaultNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];

    this.init();
  }

  init() {
    this.setupSocket();
    this.setupInitialName();
    this.setupAvatarPicker();
    this.setupKeyboardListeners();
    this.setupInputSanitizer();
    if (window.SpeedMatrixGame) {
      this.matrixGame = new window.SpeedMatrixGame(this);
    }
    if (window.DontTapGame) {
      this.dontTapGame = new window.DontTapGame(this);
    }
    if (window.CountdownCalculationGame) {
      this.countdownGame = new window.CountdownCalculationGame(this);
    }
    if (window.ShellShuffleGame) {
      this.shellShuffleGame = new window.ShellShuffleGame(this);
    }
    this.updateMatrixMenuCard();
    this.updateDontTapMenuCard();
    this.updateCountdownMenuCard();
    this.updateShellShuffleMenuCard();
    this.setupRouter();
    this.routeFromUrl(false);
    this.renderIcons();
  }

  renderIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  setupSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      this.myId = this.socket.id;
      if (this.roomState) this.renderLobby();
    });

    this.socket.on('disconnect', () => {
      this.showToast('Disconnected from server. Reconnecting...', 'error');
    });

    this.socket.on('room_created', ({ roomId, roomState }) => {
      this.roomState = roomState;
      this.updateUrl(roomId);
      this.showScreen('lobby', false);
      this.renderLobby();
      this.showToast(`Room ${roomId} created`, 'info');
      window.soundFx.playClick();
    });

    this.socket.on('room_joined', ({ roomId, roomState }) => {
      this.roomState = roomState;
      this.updateUrl(roomId);
      this.showScreen('lobby', false);
      this.renderLobby();
      this.showToast(`Joined room ${roomId}`, 'info');
      window.soundFx.playClick();
    });

    this.socket.on('match_found', ({ roomId }) => {
      this.joinRoom(roomId);
    });

    this.socket.on('player_joined', ({ player, roomState }) => {
      this.roomState = roomState;
      this.renderLobby();
      this.showToast(`${player.name} joined`, 'info');
      window.soundFx.playClick();
    });

    this.socket.on('player_left', ({ playerId, roomState }) => {
      this.roomState = roomState;
      this.renderLobby();
    });

    this.socket.on('player_ready_changed', ({ roomState }) => {
      this.roomState = roomState;
      this.renderLobby();
      window.soundFx.playClick();
    });

    this.socket.on('settings_updated', ({ settings, roomState }) => {
      this.roomState = roomState;
      this.renderLobbySettings();
      this.showToast('Rules updated by host', 'info');
    });

    this.socket.on('host_changed', ({ hostId }) => {
      if (this.roomState) this.roomState.hostId = hostId;
      this.renderLobby();
      if (hostId === this.myId) {
        this.showToast('You are now the room host', 'info');
      }
    });

    this.socket.on('round_started', (roomState) => {
      this.roomState = roomState;
      this.closeModal('modal-round-end');
      this.closeModal('modal-game-over');
      this.showScreen('game');
      this.setupRoundUI();
      window.soundFx.playClick();
    });

    this.socket.on('timer_tick', ({ timeLeft }) => {
      this.updateTimer(timeLeft);
    });

    this.socket.on('turn_changed', ({ activeTurnPlayerId }) => {
      if (this.roomState) this.roomState.activeTurnPlayerId = activeTurnPlayerId;
      this.updateTurnUI();
    });

    this.socket.on('turn_timeout', ({ message }) => {
      this.showToast(message || 'Turn timed out! Next player\'s turn.', 'info');
    });

    this.socket.on('bot_thinking', ({ botId, botName, avatar }) => {
      this.showBotThinking(botName, avatar);
    });

    this.socket.on('guess_result', ({ mode, result, bounds }) => {
      if (bounds && this.roomState) {
        this.roomState.currentBounds = bounds;
      }
      this.addGuessFeedItem(result);

      // Sound effect
      window.soundFx.playGuessFeedback(result.hint, result.proximity);

      if (result.isCorrect || result.hint === 'correct') {
        this.triggerConfetti();
      }
    });

    this.socket.on('round_ended', (data) => {
      this.showRoundEndModal(data);
    });

    this.socket.on('game_over', (roomState) => {
      this.roomState = roomState;
      this.showGameOverModal();
    });

    this.socket.on('game_restarted', (roomState) => {
      this.roomState = roomState;
      this.clearCountdownIntervals();
      this.closeModal('modal-game-over');
      this.closeModal('modal-round-end');
      this.showScreen('lobby');
      this.renderLobby();
    });

    this.socket.on('returned_to_lobby', ({ message, roomState }) => {
      this.roomState = roomState;
      this.clearCountdownIntervals();
      this.closeModal('modal-game-over');
      this.closeModal('modal-round-end');
      this.showScreen('lobby');
      this.renderLobby();
      if (message) this.showToast(message, 'info');
    });

    this.socket.on('new_chat', (chatMsg) => {
      this.handleNewChatMessage(chatMsg);
    });

    this.socket.on('kicked_from_room', ({ message }) => {
      this.roomState = null;
      this.clearCountdownIntervals();
      const codeInput = document.getElementById('join-room-code-input');
      if (codeInput) codeInput.value = '';
      this.updateUrl(null);
      this.showScreen('welcome', false);
      this.showToast(message || 'You were removed from the room by the host.', 'error');
    });

    this.socket.on('error_message', (msg) => {
      this.showToast(msg, 'error');
    });
  }

  // --- Screens & Navigation ---
  selectGame(gameId, updateHistory = true) {
    window.soundFx.playClick();
    if (gameId === 'number_guess') {
      this.showScreen('welcome', updateHistory);
    } else if (gameId === 'speed_grid') {
      if (!this.matrixGame && window.SpeedMatrixGame) {
        this.matrixGame = new window.SpeedMatrixGame(this);
      }
      this.showScreen('matrix', updateHistory);
      if (this.matrixGame) {
        // Starts freshly from the saved level with timer refreshed and target at 1
        this.matrixGame.startLevel();
      }
    } else if (gameId === 'dont_tap') {
      if (!this.dontTapGame && window.DontTapGame) {
        this.dontTapGame = new window.DontTapGame(this);
      }
      this.showScreen('donttap', updateHistory);
      if (this.dontTapGame) {
        this.dontTapGame.startGame();
      }
    } else if (gameId === 'countdown') {
      if (!this.countdownGame && window.CountdownCalculationGame) {
        this.countdownGame = new window.CountdownCalculationGame(this);
      }
      this.showScreen('countdown', updateHistory);
      if (this.countdownGame) {
        this.countdownGame.initSetupScreen();
      }
    } else if (gameId === 'shell_shuffle') {
      if (!this.shellShuffleGame && window.ShellShuffleGame) {
        this.shellShuffleGame = new window.ShellShuffleGame(this);
      }
      this.showScreen('shellshuffle', updateHistory);
      if (this.shellShuffleGame) {
        this.shellShuffleGame.init();
      }
    }
  }

  exitShellShuffleToMenu() {
    if (this.shellShuffleGame) {
      this.shellShuffleGame.exitToMenu();
    } else {
      this.showScreen('menu');
    }
  }

  exitMatrixToMenu() {
    if (this.matrixGame) {
      this.matrixGame.exitToMenu();
    } else {
      this.showScreen('menu');
    }
  }

  exitDontTapToMenu() {
    if (this.dontTapGame) {
      this.dontTapGame.exitToMenu();
    } else {
      this.showScreen('menu');
    }
  }

  updateMatrixMenuCard() {
    const savedLevel = this.matrixGame ? this.matrixGame.getSavedLevel() : parseInt(localStorage.getItem('numberverse_matrix_level') || '1', 10);
    const badge = document.getElementById('matrix-card-badge');
    const btnText = document.getElementById('matrix-card-btn-text');
    const resetBtn = document.getElementById('matrix-card-reset-btn');

    if (savedLevel > 1) {
      if (badge) badge.innerText = `Level ${savedLevel} / 10`;
      if (btnText) btnText.innerText = `Resume Level ${savedLevel}`;
      if (resetBtn) resetBtn.classList.remove('hidden');
    } else {
      if (badge) badge.innerText = `10 Levels`;
      if (btnText) btnText.innerText = `Play Matrix`;
      if (resetBtn) resetBtn.classList.add('hidden');
    }
  }

  resetMatrixProgress() {
    if (this.matrixGame) {
      this.matrixGame.resetProgress();
    } else {
      localStorage.removeItem('numberverse_matrix_level');
    }
    this.updateMatrixMenuCard();
    this.showToast('Speed Matrix progress reset to Level 1', 'info');
  }

  updateDontTapMenuCard() {
    const highScore = this.dontTapGame ? this.dontTapGame.highScore : parseInt(localStorage.getItem('numberverse_donttap_highscore') || '0', 10);
    const badge = document.getElementById('donttap-card-badge');
    const resetBtn = document.getElementById('donttap-card-reset-btn');

    if (badge) {
      badge.innerText = highScore > 0 ? `High: ${highScore.toLocaleString()}` : `Reflex & Inhibition`;
    }
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', highScore <= 0);
    }
  }

  resetDontTapProgress() {
    if (this.dontTapGame) {
      this.dontTapGame.resetHighScore();
    } else {
      localStorage.removeItem('numberverse_donttap_highscore');
      localStorage.removeItem('numberverse_donttap_highest_level');
    }
    this.updateDontTapMenuCard();
    this.showToast("Don't Tap! high score reset", 'info');
  }

  updateCountdownMenuCard() {
    const bestScore = this.countdownGame ? this.countdownGame.bestScore : parseInt(localStorage.getItem('numberverse_countdown_best') || '0', 10);
    const badge = document.getElementById('countdown-card-badge');
    const resetBtn = document.getElementById('countdown-card-reset-btn');

    if (badge) {
      badge.innerText = bestScore > 0 ? `Best: ${bestScore.toLocaleString()}` : `5s Per Answer`;
    }
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', bestScore <= 0);
    }
  }

  resetCountdownProgress() {
    if (this.countdownGame) {
      this.countdownGame.resetBestScore();
    } else {
      localStorage.removeItem('numberverse_countdown_best');
    }
    this.updateCountdownMenuCard();
    this.showToast('Countdown Calculation best score reset', 'info');
  }

  updateShellShuffleMenuCard() {
    const highScore = this.shellShuffleGame ? this.shellShuffleGame.highScore : parseInt(localStorage.getItem('numberverse_shellshuffle_highscore') || '0', 10);
    const badge = document.getElementById('shellshuffle-card-badge');
    const resetBtn = document.getElementById('shellshuffle-card-reset-btn');

    if (badge) {
      badge.innerText = highScore > 0 ? `Best: ${highScore.toLocaleString()}` : `Best: 0`;
    }
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', highScore <= 0);
    }
  }

  resetShellShuffleProgress() {
    if (this.shellShuffleGame) {
      this.shellShuffleGame.resetHighScore();
    } else {
      localStorage.removeItem('numberverse_shellshuffle_highscore');
      localStorage.removeItem('numberverse_shellshuffle_best_level');
    }
    this.updateShellShuffleMenuCard();
    this.showToast('Shell Shuffle high score reset', 'info');
  }

  showScreen(screenId, updateHistory = true) {
    if (this.currentScreen !== screenId) {
      if (this.currentScreen === 'matrix' && this.matrixGame) {
        this.matrixGame.stopTimer();
      } else if (this.currentScreen === 'donttap' && this.dontTapGame) {
        this.dontTapGame.clearSpawnTimer();
        this.dontTapGame.isPlaying = false;
        this.dontTapGame.isPaused = false;
      } else if (this.currentScreen === 'countdown' && this.countdownGame) {
        this.countdownGame.clearTimer();
        this.countdownGame.isPlaying = false;
        this.countdownGame.isPaused = false;
      } else if (this.currentScreen === 'shellshuffle' && this.shellShuffleGame) {
        this.shellShuffleGame.stopAnimations();
      }
    }

    this.currentScreen = screenId;
    ['menu', 'welcome', 'lobby', 'game', 'matrix', 'donttap', 'countdown', 'shellshuffle'].forEach(s => {
      const el = document.getElementById(`screen-${s}`);
      if (el) el.classList.toggle('hidden', s !== screenId);
    });

    const navBadge = document.getElementById('nav-room-badge');
    if (navBadge) {
      navBadge.classList.toggle('hidden', screenId === 'menu' || screenId === 'welcome' || screenId === 'matrix' || screenId === 'donttap' || screenId === 'countdown' || screenId === 'shellshuffle' || !this.roomState);
      if (this.roomState) {
        document.getElementById('nav-room-id').innerText = this.roomState.id;
      }
    }

    this.renderIcons();

    if (updateHistory) {
      this.syncUrlForScreen(screenId);
    }
  }

  // --- Profile Setup ---
  setupAvatarPicker() {
    const container = document.getElementById('avatar-selector');
    if (!container) return;
    container.innerHTML = '';

    this.avatars.forEach(av => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = av.id === this.player.avatar;
      btn.className = `w-10 h-10 rounded-xl font-mono text-xs font-bold border transition ${
        isSelected
          ? `${av.color} scale-105 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/40`
          : 'bg-white/[0.04] text-slate-400 border-white/10 hover:border-white/20'
      }`;
      btn.innerText = av.label;
      btn.onclick = () => {
        this.player.avatar = av.id;
        try {
          localStorage.setItem('numberverse_avatar', av.id);
        } catch (e) {}
        this.setupAvatarPicker();
        window.soundFx.playClick();
      };
      container.appendChild(btn);
    });
  }

  setupInitialName() {
    // 1. Try to load cached avatar from local storage
    try {
      const cachedAvatar = localStorage.getItem('numberverse_avatar');
      if (cachedAvatar && this.avatars.some(a => a.id === cachedAvatar)) {
        this.player.avatar = cachedAvatar;
      }
    } catch (e) {}

    const input = document.getElementById('player-nickname');
    
    // 2. Try to load cached player name from local storage
    let savedName = null;
    try {
      savedName = localStorage.getItem('numberverse_player_name');
    } catch (e) {}

    if (savedName && savedName.trim()) {
      this.player.name = savedName.trim();
    } else {
      const randomName = this.defaultNames[Math.floor(Math.random() * this.defaultNames.length)] + Math.floor(Math.random() * 90 + 10);
      this.player.name = randomName;
      try {
        localStorage.setItem('numberverse_player_name', this.player.name);
      } catch (e) {}
    }

    if (input) {
      input.value = this.player.name;
      input.oninput = (e) => {
        const newName = e.target.value.trim() || 'Player';
        this.player.name = newName;
        // Keep cache memory in sync whenever user updates their name
        try {
          localStorage.setItem('numberverse_player_name', newName);
        } catch (err) {}
      };
    }
  }

  randomizeNickname() {
    const randomName = this.defaultNames[Math.floor(Math.random() * this.defaultNames.length)] + Math.floor(Math.random() * 90 + 10);
    this.player.name = randomName;
    const input = document.getElementById('player-nickname');
    if (input) input.value = randomName;
    try {
      localStorage.setItem('numberverse_player_name', randomName);
    } catch (e) {}
    window.soundFx.playClick();
  }

  // Prevents negative numbers, wheel-scroll changes, and non-digits
  setupInputSanitizer() {
    const guessInput = document.getElementById('game-guess-input');
    if (!guessInput) return;

    // Reject non-numeric keys and negative signs
    guessInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Disable mouse-wheel scrolling changing numbers
    guessInput.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  setupRouter() {
    window.addEventListener('popstate', () => {
      this.routeFromUrl(false);
    });
  }

  routeFromUrl(updateHistory = false) {
    const rawPath = (window.location.pathname || '/').toLowerCase();
    const cleanPath = rawPath.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room-id') || params.get('room');

    // Handle legacy root link with room param e.g. /?room=XYZ or /?room-id=XYZ
    if (cleanPath === '/' && roomId) {
      const codeInput = document.getElementById('join-room-code-input');
      if (codeInput) codeInput.value = roomId.toUpperCase();
      this.updateUrl(roomId.toUpperCase());
      this.showScreen('welcome', false);
      return;
    }

    if (cleanPath === '/speed-matrix') {
      this.selectGame('speed_grid', updateHistory);
    } else if (cleanPath === '/dont-tap') {
      this.selectGame('dont_tap', updateHistory);
    } else if (cleanPath === '/countdown-calc' || cleanPath === '/countdown') {
      this.selectGame('countdown', updateHistory);
    } else if (cleanPath === '/shell-shuffle' || cleanPath === '/shellshuffle') {
      this.selectGame('shell_shuffle', updateHistory);
    } else if (cleanPath === '/num-guess-game') {
      if (roomId) {
        const codeInput = document.getElementById('join-room-code-input');
        if (codeInput) codeInput.value = roomId.toUpperCase();
      }

      if (this.roomState && roomId && this.roomState.id === roomId.toUpperCase()) {
        if (this.roomState.status === 'playing') {
          this.showScreen('game', updateHistory);
        } else {
          this.showScreen('lobby', updateHistory);
        }
      } else {
        this.showScreen('welcome', updateHistory);
      }
    } else {
      this.showScreen('menu', updateHistory);
    }
  }

  syncUrlForScreen(screenId) {
    let targetPath = '/';
    let targetSearch = '';

    if (screenId === 'menu') {
      targetPath = '/';
    } else if (screenId === 'welcome') {
      targetPath = '/num-guess-game/';
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room-id') || params.get('room');
      if (code) {
        targetSearch = `?room-id=${encodeURIComponent(code.toUpperCase())}`;
      }
    } else if (screenId === 'lobby' || screenId === 'game') {
      targetPath = '/num-guess-game/';
      if (this.roomState && this.roomState.id) {
        targetSearch = `?room-id=${encodeURIComponent(this.roomState.id)}`;
      }
    } else if (screenId === 'matrix') {
      targetPath = '/speed-matrix/';
    } else if (screenId === 'donttap') {
      targetPath = '/dont-tap/';
    } else if (screenId === 'countdown') {
      targetPath = '/countdown-calc/';
    } else if (screenId === 'shellshuffle') {
      targetPath = '/shell-shuffle/';
    }

    const newUrl = targetPath + targetSearch;
    const currentUrl = window.location.pathname + window.location.search;

    if (currentUrl !== newUrl) {
      window.history.pushState({ screen: screenId }, '', newUrl);
    }
  }

  updateUrl(roomId) {
    if (roomId) {
      const newUrl = `/num-guess-game/?room-id=${encodeURIComponent(roomId)}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        window.history.pushState({ screen: 'lobby', roomId }, '', newUrl);
      }
    } else {
      const newUrl = '/num-guess-game/';
      if (window.location.pathname + window.location.search !== newUrl) {
        window.history.pushState({ screen: 'welcome' }, '', newUrl);
      }
    }
  }

  // --- Lobby Actions ---
  quickMatch() {
    window.soundFx.playClick();
    this.socket.emit('quick_match', {
      name: this.player.name,
      avatar: this.player.avatar
    });
  }

  openCreateModal() {
    window.soundFx.playClick();
    const modal = document.getElementById('modal-create-room');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    this.renderIcons();
  }

  closeCreateModal() {
    this.closeModal('modal-create-room');
  }

  submitCreateRoom() {
    window.soundFx.playClick();
    const mode = document.getElementById('create-mode').value;
    const maxRange = document.getElementById('create-range').value;
    const roundTime = document.getElementById('create-time').value;
    const totalRounds = document.getElementById('create-rounds').value;
    const isPublic = document.getElementById('create-public').checked;

    this.socket.emit('create_room', {
      name: this.player.name,
      avatar: this.player.avatar,
      isPublic,
      settings: {
        mode,
        maxRange,
        roundTime,
        totalRounds
      }
    });

    this.closeCreateModal();
  }

  joinRoomWithCode() {
    const code = document.getElementById('join-room-code-input').value.trim().toUpperCase();
    if (!code) {
      this.showToast('Please enter a valid room code', 'error');
      return;
    }
    this.joinRoom(code);
  }

  joinRoom(roomId) {
    window.soundFx.playClick();
    this.socket.emit('join_room', {
      roomId,
      name: this.player.name,
      avatar: this.player.avatar
    });
  }

  leaveRoom() {
    window.soundFx.playClick();
    if (this.socket) {
      this.socket.emit('leave_room');
    }
    this.roomState = null;
    this.clearCountdownIntervals();
    const codeInput = document.getElementById('join-room-code-input');
    if (codeInput) codeInput.value = '';
    this.updateUrl(null);
    this.showScreen('welcome', false);
  }

  toggleReady() {
    window.soundFx.playClick();
    this.socket.emit('toggle_ready');
  }

  addBot(level = 'medium') {
    window.soundFx.playClick();
    this.socket.emit('add_bot', { level });
  }

  kickPlayer(playerId) {
    if (!this.isHost()) return;
    window.soundFx.playClick();
    this.socket.emit('kick_player', { playerId });
  }

  updateSettings() {
    if (!this.isHost()) return;
    const mode = document.getElementById('setting-mode').value;
    const maxRange = document.getElementById('setting-range').value;
    const roundTime = document.getElementById('setting-time').value;
    const totalRounds = document.getElementById('setting-rounds').value;

    this.socket.emit('update_settings', {
      mode,
      maxRange,
      roundTime,
      totalRounds
    });
  }

  startGame() {
    if (!this.isHost()) return;
    // Check if everyone is ready
    const unreadyCount = this.roomState.players.filter(p => !p.isReady).length;
    if (unreadyCount > 0) {
      window.soundFx.playClick();
      this.showToast('All players must be Ready before starting!', 'error');
      return;
    }

    window.soundFx.playClick();
    this.socket.emit('start_game');
  }

  isHost() {
    const currentId = this.myId || (this.socket && this.socket.id);
    return !!(this.roomState && currentId && this.roomState.hostId === currentId);
  }

  renderLobby() {
    if (!this.roomState) return;
    const currentId = this.myId || (this.socket && this.socket.id);

    document.getElementById('lobby-room-code').innerText = this.roomState.id;
    document.getElementById('lobby-player-count').innerText = `${this.roomState.players.length} / 10`;

    // Start / Ready button
    const startBtn = document.getElementById('lobby-start-btn');
    const readyBtn = document.getElementById('lobby-ready-btn');

    // Check if all players are ready
    const allReady = this.roomState.players.every(p => p.isReady);

    if (this.isHost()) {
      startBtn.classList.remove('hidden');
      startBtn.classList.add('flex');
      if (allReady) {
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        startBtn.title = 'Start the match';
      } else {
        startBtn.disabled = true;
        startBtn.classList.add('opacity-40', 'cursor-not-allowed');
        startBtn.title = 'Waiting for all players to be Ready';
      }
    } else {
      startBtn.classList.add('hidden');
      startBtn.classList.remove('flex');
    }

    const me = this.roomState.players.find(p => p.id === currentId);
    if (me && readyBtn) {
      readyBtn.className = `px-5 py-2.5 rounded-xl font-medium text-xs transition border flex items-center gap-1.5 ${
        me.isReady 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
          : 'btn-secondary text-slate-300'
      }`;
      readyBtn.innerText = me.isReady ? 'Ready ✓' : 'Ready';
    }

    // Render Players in Lobby
    const playersListEl = document.getElementById('lobby-players-list');
    playersListEl.innerHTML = '';

    const hostIsMe = this.isHost();

    this.roomState.players.forEach(p => {
      const isMe = p.id === currentId;
      const isRoomHost = p.id === this.roomState.hostId;
      const canKick = hostIsMe && !isMe;

      const card = document.createElement('div');
      card.className = `p-3 rounded-xl flex items-center justify-between border transition ${
        isMe ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/[0.02] border-white/5'
      }`;

      card.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="avatar-badge font-mono text-xs">
            ${this.escapeHtml(p.avatar)}
          </div>
          <div>
            <div class="flex items-center gap-1 text-xs font-semibold text-white">
              <span>${this.escapeHtml(p.name)}</span>
              ${isMe ? '<span class="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono">YOU</span>' : ''}
              ${isRoomHost ? '<span class="text-amber-400 text-[10px]" title="Host">★</span>' : ''}
              ${p.isBot ? '<span class="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-400 font-mono">BOT</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-500 font-mono">
              ${p.score} pts
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] font-mono ${p.isReady ? 'text-emerald-400' : 'text-slate-500'}">
            ${p.isReady ? 'Ready' : 'Waiting'}
          </span>
          ${canKick ? `
            <button onclick="app.kickPlayer('${p.id}')" title="Kick / Remove player" class="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 transition text-xs font-bold" aria-label="Remove player">
              ✕
            </button>
          ` : ''}
        </div>
      `;

      playersListEl.appendChild(card);
    });

    this.renderLobbySettings();
    this.renderIcons();
  }

  renderLobbySettings() {
    if (!this.roomState) return;
    const isHost = this.isHost();

    const modeSelect = document.getElementById('setting-mode');
    const rangeSelect = document.getElementById('setting-range');
    const timeSelect = document.getElementById('setting-time');
    const roundsSelect = document.getElementById('setting-rounds');
    const rangeContainer = document.getElementById('setting-range-container');
    const notice = document.getElementById('lobby-settings-notice');

    modeSelect.value = this.roomState.settings.mode;
    rangeSelect.value = String(this.roomState.settings.maxRange);
    timeSelect.value = String(this.roomState.settings.roundTime);
    roundsSelect.value = String(this.roomState.settings.totalRounds);

    modeSelect.disabled = !isHost;
    rangeSelect.disabled = !isHost;
    timeSelect.disabled = !isHost;
    roundsSelect.disabled = !isHost;

    if (rangeContainer) {
      rangeContainer.style.display = this.roomState.settings.mode === 'codebreaker' ? 'none' : 'block';
    }

    if (notice) {
      notice.innerText = isHost ? 'Host controls' : 'Set by host';
    }
  }

  // --- Game Arena UI ---
  setupRoundUI() {
    if (!this.roomState) return;
    const { settings, currentRound } = this.roomState;

    const roundCurrentEl = document.getElementById('game-round-current');
    const roundTotalEl = document.getElementById('game-round-total');
    if (roundCurrentEl) roundCurrentEl.innerText = currentRound;
    if (roundTotalEl) roundTotalEl.innerText = settings.totalRounds;

    const modeTag = document.getElementById('game-mode-tag');
    const numericSection = document.getElementById('numeric-input-section');
    const codebreakerSection = document.getElementById('codebreaker-input-section');
    const rangeLabel = document.getElementById('game-range-label');
    const heroFeedbackText = document.getElementById('hero-feedback-text');
    const mysteryBox = document.getElementById('game-mystery-box');
    const chipsContainer = document.getElementById('recent-guesses-chips');
    const countEl = document.getElementById('recent-guesses-count');

    if (mysteryBox) {
      mysteryBox.innerText = '?';
      mysteryBox.className = 'w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center font-mono font-bold text-3xl text-slate-300 shadow-inner mb-4 transition';
    }

    if (chipsContainer) {
      chipsContainer.innerHTML = '<span class="text-xs text-slate-500 italic">No guesses made yet in this round.</span>';
    }
    if (countEl) countEl.innerText = '0 guesses';

    if (settings.mode === 'codebreaker') {
      if (modeTag) modeTag.innerText = 'Codebreaker';
      if (numericSection) numericSection.classList.add('hidden');
      if (codebreakerSection) {
        codebreakerSection.classList.remove('hidden');
        codebreakerSection.classList.add('flex');
      }
      if (rangeLabel) rangeLabel.innerText = '4-Digit Code';
      if (heroFeedbackText) heroFeedbackText.innerHTML = 'Deduce the secret 4-digit code (unique digits)';
      this.clearCodebreakerSlots();
    } else {
      if (modeTag) modeTag.innerText = settings.mode === 'turn_based' ? 'Turn-Based' : 'Rapid Blitz';
      if (numericSection) numericSection.classList.remove('hidden');
      if (codebreakerSection) {
        codebreakerSection.classList.add('hidden');
        codebreakerSection.classList.remove('flex');
      }
      if (rangeLabel) rangeLabel.innerText = `1 - ${settings.maxRange}`;
      if (heroFeedbackText) {
        heroFeedbackText.innerHTML = `Guess the secret number between <span class="text-white font-mono font-bold">1 and ${settings.maxRange}</span>`;
      }

      const guessInput = document.getElementById('game-guess-input');
      if (guessInput) {
        guessInput.value = '';
      }
    }

    this.updateScoreboard();
    this.updateTurnUI();
    this.clearGuessFeed();
  }

  updateTimer(timeLeft) {
    const timerEl = document.getElementById('game-timer');
    if (!timerEl) return;

    if (timeLeft <= 0) {
      timerEl.innerText = '0s';
      timerEl.classList.remove('text-rose-400');
      return;
    }

    timerEl.innerText = `${timeLeft}s`;

    if (timeLeft <= 5) {
      timerEl.classList.add('text-rose-400');
      window.soundFx.playUrgentTick();
    } else {
      timerEl.classList.remove('text-rose-400');
      window.soundFx.playTick();
    }
  }

  updateTurnUI() {
    if (!this.roomState) return;

    const turnBanner = document.getElementById('game-turn-banner');
    const turnDot = document.getElementById('game-turn-dot');
    const turnText = document.getElementById('game-turn-text');
    const input = document.getElementById('game-guess-input');
    const submitBtn = document.getElementById('game-submit-btn');
    const maxRange = this.roomState.settings.maxRange || 100;

    if (this.roomState.settings.mode === 'turn_based') {
      const activePlayer = this.roomState.players.find(p => p.id === this.roomState.activeTurnPlayerId);
      const isMyTurn = this.roomState.activeTurnPlayerId === this.myId;

      if (turnBanner && turnText) {
        if (isMyTurn) {
          turnBanner.className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition';
          if (turnDot) turnDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
          turnText.innerText = 'Your turn to guess';

          if (input) {
            input.disabled = false;
            input.placeholder = `Enter number (1-${maxRange})...`;
            input.classList.remove('opacity-40', 'cursor-not-allowed');
            setTimeout(() => input.focus(), 60);
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Guess</span> <kbd class="text-[10px] opacity-70 bg-black/20 px-1 py-0.5 rounded font-mono">↵</kbd>';
            submitBtn.className = 'btn-solid-primary sm:w-auto px-7 py-3.5 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer';
          }
        } else {
          const isBot = activePlayer && activePlayer.isBot;
          const actorName = activePlayer ? activePlayer.name : 'Opponent';
          turnBanner.className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-400 transition';
          if (turnDot) turnDot.className = 'w-2 h-2 rounded-full bg-slate-500';
          turnText.innerText = isBot ? `${actorName} is calculating...` : `Waiting for ${actorName}...`;

          if (input) {
            input.disabled = true;
            input.placeholder = `Waiting for ${actorName}...`;
            input.classList.add('opacity-40', 'cursor-not-allowed');
          }
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="opacity-60">Waiting...</span>';
            submitBtn.className = 'btn-solid-primary sm:w-auto px-7 py-3.5 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 opacity-40 cursor-not-allowed';
          }
        }
      }
    } else {
      // Blitz
      if (turnBanner && turnText) {
        turnBanner.className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400';
        if (turnDot) turnDot.className = 'w-2 h-2 rounded-full bg-indigo-400';
        turnText.innerText = 'Rapid Blitz — Guess as fast as you can';
      }
      if (input) {
        input.disabled = false;
        input.placeholder = `Enter number (1-${maxRange})...`;
        input.classList.remove('opacity-40', 'cursor-not-allowed');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Guess</span> <kbd class="text-[10px] opacity-70 bg-black/20 px-1 py-0.5 rounded font-mono">↵</kbd>';
        submitBtn.className = 'btn-solid-primary sm:w-auto px-7 py-3.5 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer';
      }
    }

    this.renderIcons();
  }

  showBotThinking(botName, avatar) {
    const turnText = document.getElementById('game-turn-text');
    if (turnText) {
      turnText.innerText = `${botName || 'Bot'} is thinking...`;
    }
  }

  isMyTurn() {
    if (!this.roomState) return true;
    if (this.roomState.settings.mode !== 'turn_based') return true;
    return this.roomState.activeTurnPlayerId === this.myId;
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Matrix level clear modal keyboard shortcuts
      const clearModal = document.getElementById('modal-matrix-level-clear');
      if (clearModal && !clearModal.classList.contains('hidden')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.matrixGame) this.matrixGame.nextLevel();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.exitMatrixToMenu();
          this.closeModal('modal-matrix-level-clear');
          return;
        }
      }

      if (this.currentScreen !== 'game') return;
      if (document.activeElement && document.activeElement.id === 'game-chat-input') return;

      if (e.key === 'Enter') {
        if (this.roomState && this.roomState.settings.mode === 'codebreaker') {
          this.submitCodebreakerGuess();
        } else {
          this.submitGuess();
        }
      }
    });
  }

  submitGuess() {
    if (!this.isMyTurn()) {
      this.showToast("Wait for your turn", "error");
      return;
    }

    const input = document.getElementById('game-guess-input');
    if (!input) return;
    const rawVal = input.value.trim();
    const guess = parseInt(rawVal, 10);

    if (isNaN(guess) || rawVal === '') {
      this.showToast('Please enter a valid number', 'error');
      return;
    }

    const maxRange = (this.roomState && this.roomState.settings.maxRange) || 100;
    if (guess < 1 || guess > maxRange) {
      this.showToast(`Number must be between 1 and ${maxRange}`, 'error');
      return;
    }

    this.socket.emit('make_guess', { guess });
    input.value = '';
  }

  // Codebreaker helpers
  handleSlotInput(index, event) {
    const val = event.target.value.replace(/\D/g, '');
    event.target.value = val;
    if (val && index < 3) {
      const nextSlot = document.getElementById(`slot-${index + 1}`);
      if (nextSlot) nextSlot.focus();
    }
  }

  clearCodebreakerSlots() {
    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (slot) slot.value = '';
    }
    const firstSlot = document.getElementById('slot-0');
    if (firstSlot) firstSlot.focus();
  }

  submitCodebreakerGuess() {
    if (!this.isMyTurn()) {
      this.showToast("Wait for your turn", "error");
      return;
    }

    let code = '';
    for (let i = 0; i < 4; i++) {
      const val = document.getElementById(`slot-${i}`).value;
      if (!val) {
        this.showToast('Please enter all 4 digits', 'error');
        return;
      }
      code += val;
    }

    this.socket.emit('make_guess', { guess: code });
    this.clearCodebreakerSlots();
  }

  // --- Real-Time Activity Feed & Feedback ---
  addGuessFeedItem(res) {
    // 1. Update Hero Feedback Banner
    const heroBox = document.getElementById('hero-feedback-box');
    const mysteryBox = document.getElementById('game-mystery-box');
    if (heroBox) {
      if (res.hint === 'correct') {
        if (mysteryBox) {
          mysteryBox.innerText = res.guess;
          mysteryBox.className = 'w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-3xl shadow-lg shadow-emerald-500/20 mb-4 transition';
        }
        heroBox.innerHTML = `
          <div class="feedback-card-correct px-4 py-2 rounded-xl inline-flex flex-col items-center">
            <span class="font-bold text-base sm:text-lg">✓ ${res.guess} is Correct!</span>
            <span class="text-xs text-emerald-300/80">${this.escapeHtml(res.playerName)} won the round</span>
          </div>
        `;
      } else if (res.hint === 'high') {
        heroBox.innerHTML = `
          <div class="feedback-card-high px-4 py-2 rounded-xl inline-flex flex-col items-center">
            <span class="font-bold text-sm sm:text-base">↓ ${res.guess} is Too High</span>
            <span class="text-[11px] text-rose-300/80">${this.escapeHtml(res.playerName)} guessed ${res.guess} • Guess lower</span>
          </div>
        `;
      } else if (res.hint === 'low') {
        heroBox.innerHTML = `
          <div class="feedback-card-low px-4 py-2 rounded-xl inline-flex flex-col items-center">
            <span class="font-bold text-sm sm:text-base">↑ ${res.guess} is Too Low</span>
            <span class="text-[11px] text-sky-300/80">${this.escapeHtml(res.playerName)} guessed ${res.guess} • Guess higher</span>
          </div>
        `;
      } else if (res.bulls !== undefined) {
        heroBox.innerHTML = `
          <div class="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 inline-flex flex-col items-center">
            <span class="font-bold text-sm font-mono text-white">${res.guess} ➔ ${res.bulls} Bulls, ${res.cows} Cows</span>
            <span class="text-[11px] text-slate-400">${this.escapeHtml(res.playerName)}'s attempt</span>
          </div>
        `;
      }
    }

    // 2. Add Tag Chip to Recent Attempts Ribbon
    const chipsContainer = document.getElementById('recent-guesses-chips');
    if (chipsContainer) {
      if (chipsContainer.innerText.includes('No guesses made yet')) {
        chipsContainer.innerHTML = '';
      }
      const chip = document.createElement('div');
      const tagClass = res.hint === 'correct' ? 'tag-chip-correct'
        : res.hint === 'high' ? 'tag-chip-high' : 'tag-chip-low';
      const arrowIcon = res.hint === 'correct' ? '✓ Correct'
        : res.hint === 'high' ? '↓ High' : '↑ Low';
      chip.className = `tag-chip font-mono ${tagClass}`;
      chip.innerHTML = `<span class="opacity-70">${this.escapeHtml(res.playerName)}:</span> <strong>${res.guess}</strong> <span class="text-[10px] font-sans opacity-90">${arrowIcon}</span>`;
      chipsContainer.prepend(chip);

      const countEl = document.getElementById('recent-guesses-count');
      if (countEl) {
        countEl.innerText = `${chipsContainer.children.length} attempt${chipsContainer.children.length > 1 ? 's' : ''}`;
      }
    }

    // 3. Activity Feed List
    const feed = document.getElementById('game-guess-feed');
    if (!feed) return;

    if (feed.innerText.includes('Guesses and chat will appear here') || feed.innerText.includes('Awaiting first guess')) {
      feed.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'py-1 border-b border-white/[0.03] flex items-center justify-between text-xs';

    if (res.bulls !== undefined) {
      item.innerHTML = `
        <span class="text-slate-300 font-medium">${this.escapeHtml(res.playerName)}: <strong class="font-mono text-white">${res.guess}</strong></span>
        <span class="font-mono text-[11px] text-slate-400">${res.bulls}B ${res.cows}C</span>
      `;
    } else {
      const hintColor = res.hint === 'correct' ? 'text-emerald-400' : res.hint === 'high' ? 'text-rose-400' : 'text-sky-400';
      const hintArrow = res.hint === 'correct' ? '✓' : res.hint === 'high' ? '↓ High' : '↑ Low';

      item.innerHTML = `
        <span class="text-slate-300 font-medium">${this.escapeHtml(res.playerName)}: <strong class="font-mono text-white">${res.guess}</strong></span>
        <span class="font-mono text-[11px] font-semibold ${hintColor}">${hintArrow}</span>
      `;
    }

    feed.prepend(item);

    const feedCountEl = document.getElementById('game-feed-count');
    if (feedCountEl) {
      feedCountEl.innerText = `${feed.children.length}`;
    }
  }

  clearGuessFeed() {
    const feed = document.getElementById('game-guess-feed');
    if (feed) feed.innerHTML = '<div class="text-center py-4 text-xs text-slate-500">Guesses and chat will appear here.</div>';
  }

  updateScoreboard() {
    if (!this.roomState) return;
    const scoreboard = document.getElementById('game-scoreboard-list');
    if (!scoreboard) return;
    scoreboard.innerHTML = '';

    const sortedPlayers = [...this.roomState.players].sort((a, b) => b.score - a.score);

    sortedPlayers.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `p-2.5 rounded-xl flex items-center justify-between border transition ${
        p.id === this.myId ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/[0.02] border-white/5'
      }`;

      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="font-mono text-xs ${idx === 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}">#${idx + 1}</span>
          <div class="avatar-badge w-7 h-7 text-[10px] font-mono">
            ${this.escapeHtml(p.avatar)}
          </div>
          <span class="font-medium text-xs text-white truncate max-w-[110px]">${this.escapeHtml(p.name)}</span>
        </div>
        <div class="font-mono font-semibold text-xs text-indigo-400">${p.score} pts</div>
      `;
      scoreboard.appendChild(row);
    });
  }

  // --- Modals: Round End & Game Over ---
  showRoundEndModal(data) {
    const modal = document.getElementById('modal-round-end');
    if (!modal) return;

    window.soundFx.playCorrect();

    document.getElementById('round-revealed-number').innerText = data.targetCode || data.targetNumber;
    document.getElementById('round-end-reason').innerText = data.reason || 'Round finished';

    const avatarEl = document.getElementById('round-winner-avatar');
    if (data.winnerName) {
      avatarEl.innerText = '✓';
      document.getElementById('round-end-title').innerText = `${data.winnerName} won the round`;
    } else {
      avatarEl.innerText = '⏱';
      document.getElementById('round-end-title').innerText = 'Time Expired';
    }

    const scoresList = document.getElementById('round-end-scores');
    scoresList.innerHTML = '';

    data.scores.sort((a, b) => b.score - a.score).forEach(p => {
      const item = document.createElement('div');
      item.className = 'p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs';
      item.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="avatar-badge w-6 h-6 text-[9px] font-mono">${p.avatar}</span>
          <span class="font-medium text-white">${this.escapeHtml(p.name)}</span>
        </div>
        <div class="font-mono">
          ${p.roundScore > 0 ? `<span class="text-emerald-400 font-bold mr-1.5">+${p.roundScore}</span>` : ''}
          <span class="text-slate-400">${p.score} total</span>
        </div>
      `;
      scoresList.appendChild(item);
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    this.clearCountdownIntervals();

    let left = 5;
    const cdEl = document.getElementById('round-countdown-timer');
    if (cdEl) cdEl.innerText = left;

    this.roundCountdownInterval = setInterval(() => {
      left--;
      if (cdEl) cdEl.innerText = Math.max(0, left);
      if (left <= 0) {
        clearInterval(this.roundCountdownInterval);
        this.roundCountdownInterval = null;
      }
    }, 1000);
  }

  showGameOverModal() {
    const modal = document.getElementById('modal-game-over');
    if (!modal) return;

    window.soundFx.playVictory();
    this.triggerConfetti();

    const sorted = [...this.roomState.players].sort((a, b) => b.score - a.score);

    if (sorted[0]) {
      document.getElementById('podium-1-name').innerText = sorted[0].name;
      document.getElementById('podium-1-avatar').innerText = sorted[0].avatar;
      document.getElementById('podium-1-score').innerText = `${sorted[0].score} pts`;
    }
    if (sorted[1]) {
      document.getElementById('podium-2-name').innerText = sorted[1].name;
      document.getElementById('podium-2-avatar').innerText = sorted[1].avatar;
      document.getElementById('podium-2-score').innerText = `${sorted[1].score} pts`;
    } else {
      document.getElementById('podium-2-name').innerText = '-';
      document.getElementById('podium-2-score').innerText = '0 pts';
    }
    if (sorted[2]) {
      document.getElementById('podium-3-name').innerText = sorted[2].name;
      document.getElementById('podium-3-avatar').innerText = sorted[2].avatar;
      document.getElementById('podium-3-score').innerText = `${sorted[2].score} pts`;
    } else {
      document.getElementById('podium-3-name').innerText = '-';
      document.getElementById('podium-3-score').innerText = '0 pts';
    }

    const fullList = document.getElementById('game-over-full-list');
    fullList.innerHTML = '';
    sorted.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-mono text-slate-500">#${idx + 1}</span>
          <span class="avatar-badge w-6 h-6 text-[9px] font-mono">${p.avatar}</span>
          <span class="font-medium text-white">${this.escapeHtml(p.name)}</span>
        </div>
        <span class="font-mono text-indigo-400 font-semibold">${p.score} pts</span>
      `;
      fullList.appendChild(row);
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    this.clearCountdownIntervals();

    // 5-to-0 countdown for auto-restarting the game
    let left = 5;
    const cdEl = document.getElementById('gameover-countdown-timer');
    if (cdEl) cdEl.innerText = left;

    this.gameOverCountdownInterval = setInterval(() => {
      left--;
      if (cdEl) cdEl.innerText = Math.max(0, left);
      if (left <= 0) {
        clearInterval(this.gameOverCountdownInterval);
        this.gameOverCountdownInterval = null;
        // Auto start game automatically with the same players
        this.continueGame();
      }
    }, 1000);
  }

  continueGame() {
    window.soundFx.playClick();
    this.clearCountdownIntervals();
    this.closeModal('modal-round-end');
    this.closeModal('modal-game-over');
    this.socket.emit('continue_game');
  }

  leaveGameToLobby() {
    window.soundFx.playClick();
    this.clearCountdownIntervals();
    this.closeModal('modal-round-end');
    this.closeModal('modal-game-over');
    this.socket.emit('leave_game_to_lobby');
  }

  clearCountdownIntervals() {
    if (this.roundCountdownInterval) {
      clearInterval(this.roundCountdownInterval);
      this.roundCountdownInterval = null;
    }
    if (this.gameOverCountdownInterval) {
      clearInterval(this.gameOverCountdownInterval);
      this.gameOverCountdownInterval = null;
    }
  }

  restartGame() {
    if (!this.isHost()) return;
    this.clearCountdownIntervals();
    this.socket.emit('restart_game');
  }

  returnToLobby() {
    this.leaveGameToLobby();
  }

  // --- In-Game Chat ---
  sendChat() {
    const input = document.getElementById('game-chat-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    this.socket.emit('send_chat', { message: msg });
    input.value = '';
    window.soundFx.playClick();
  }

  handleNewChatMessage(msg) {
    const feed = document.getElementById('game-guess-feed');
    if (!feed) return;

    if (feed.innerText.includes('Guesses and chat will appear here')) {
      feed.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'py-1 border-b border-white/[0.03] flex items-center justify-between text-xs';
    item.innerHTML = `
      <span class="text-slate-300 font-medium">${this.escapeHtml(msg.senderName)}: <span class="text-white">${this.escapeHtml(msg.message)}</span></span>
      <span class="text-[10px] text-slate-500 font-mono">chat</span>
    `;

    feed.prepend(item);
  }

  // --- Utilities ---
  triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }

  toggleSound() {
    this.isMuted = window.soundFx.toggleMute();
    const icon = document.getElementById('sound-icon');
    if (icon) {
      icon.setAttribute('data-lucide', this.isMuted ? 'volume-x' : 'volume-2');
      icon.className = `w-4 h-4 ${this.isMuted ? 'text-rose-400' : 'text-emerald-400'}`;
      this.renderIcons();
    }
  }

  toggleHowToPlay() {
    window.soundFx.playClick();
    const modal = document.getElementById('modal-rules');
    if (modal) {
      modal.classList.toggle('hidden');
      modal.classList.toggle('flex');
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  copyRoomLink() {
    if (!this.roomState) return;
    const url = `${window.location.origin}/num-guess-game/?room-id=${encodeURIComponent(this.roomState.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Room link copied', 'info');
      window.soundFx.playClick();
    }).catch(() => {
      this.showToast(`Code: ${this.roomState.id}`, 'info');
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colorClass = type === 'error' ? 'border-rose-500/40 bg-rose-950/80 text-rose-200'
      : type === 'success' ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200'
      : 'border-white/10 bg-[#121826] text-slate-200';

    toast.className = `px-3.5 py-2.5 rounded-xl border text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-auto transition duration-200 translate-y-2 opacity-0 ${colorClass}`;
    toast.innerText = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.app = new NumberVerseApp();
});
