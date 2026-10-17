// Don't Tap! — Fast-Paced Cognitive Inhibitory Control Game
// Strictly adheres to the NumberVerse Design System
class DontTapGame {
  constructor(app) {
    this.app = app;
    this.highScoreKey = 'numberverse_donttap_highscore';
    this.highestLevelKey = 'numberverse_donttap_highest_level';

    // Game state
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.combo = 0;
    this.maxCombo = 0;
    this.safeTapsCount = 0;
    this.targetQuota = 15;
    this.isPaused = false;
    this.isGameOver = false;
    this.isPlaying = false;

    // Board configuration (4x4 = 16 cells)
    this.gridSize = 16;
    this.activeTargets = new Map(); // cellIndex -> targetObject
    this.spawnTimer = null;
    this.targetIdCounter = 0;

    // Load saved high score & highest level
    this.highScore = this.getSavedHighScore();
    this.highestLevel = this.getSavedHighestLevel();

    // Listen for Escape or P key for pause
    window.addEventListener('keydown', (e) => {
      if (this.app && this.app.currentScreen === 'donttap' && this.isPlaying && !this.isGameOver) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          this.togglePause();
        }
      }
    });

    // Save on beforeunload
    window.addEventListener('beforeunload', () => {
      this.checkAndSaveHighScore();
    });
  }

  // --- Persistence ---
  getSavedHighScore() {
    try {
      const saved = localStorage.getItem(this.highScoreKey);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  getSavedHighestLevel() {
    try {
      const saved = localStorage.getItem(this.highestLevelKey);
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch (e) {
      return 1;
    }
  }

  checkAndSaveHighScore() {
    let changed = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(this.highScoreKey, this.highScore.toString());
      } catch (e) {}
      changed = true;
    }
    if (this.level > this.highestLevel) {
      this.highestLevel = this.level;
      try {
        localStorage.setItem(this.highestLevelKey, this.highestLevel.toString());
      } catch (e) {}
      changed = true;
    }
    if (changed && this.app && typeof this.app.updateDontTapMenuCard === 'function') {
      this.app.updateDontTapMenuCard();
    }
    return changed;
  }

  resetHighScore() {
    try {
      localStorage.removeItem(this.highScoreKey);
      localStorage.removeItem(this.highestLevelKey);
      this.highScore = 0;
      this.highestLevel = 1;
      if (this.app && typeof this.app.updateDontTapMenuCard === 'function') {
        this.app.updateDontTapMenuCard();
      }
    } catch (e) {}
  }

  // --- Level Settings ---
  getLevelConfig(lvl = this.level) {
    // Progressive configuration up to Level 10 and beyond
    const quota = 10 + lvl * 3;
    // Lifetime decreases with level (from 1900ms down to 850ms)
    const lifetime = Math.max(850, 1900 - (lvl - 1) * 115);
    // Spawn interval decreases (from 1100ms down to 500ms)
    const spawnInterval = Math.max(500, 1150 - (lvl - 1) * 70);
    // Danger probability increases (from 18% up to 40%)
    const dangerChance = Math.min(0.40, 0.18 + (lvl - 1) * 0.025);
    // Concurrent targets max
    const maxConcurrent = lvl <= 2 ? 2 : (lvl <= 5 ? 3 : 4);

    return { quota, lifetime, spawnInterval, dangerChance, maxConcurrent };
  }

  // --- Game Lifecycle ---
  startGame() {
    this.level = 1;
    this.score = 0;
    this.lives = this.maxLives;
    this.combo = 0;
    this.maxCombo = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isPlaying = true;
    this.startLevel(1);
  }

  startLevel(lvl = 1) {
    this.level = lvl;
    this.safeTapsCount = 0;
    const config = this.getLevelConfig(this.level);
    this.targetQuota = config.quota;
    this.clearAllActiveTargets();
    this.clearSpawnTimer();
    this.isPaused = false;
    this.isGameOver = false;
    this.isPlaying = true;

    this.renderBoard();
    this.updateHUD();

    // Small delay before spawning starts
    this.spawnTimer = setTimeout(() => {
      this.scheduleNextSpawn();
    }, 600);
  }

  renderBoard() {
    const board = document.getElementById('donttap-board');
    if (!board) return;
    board.innerHTML = '';

    for (let i = 0; i < this.gridSize; i++) {
      const cell = document.createElement('div');
      cell.className = 'donttap-cell';
      cell.dataset.index = i;
      cell.onclick = (e) => this.handleCellClick(i, e);
      board.appendChild(cell);
    }
  }

  updateHUD() {
    // Level
    const lvlEl = document.getElementById('donttap-level-badge');
    if (lvlEl) lvlEl.innerText = this.level;

    // Score
    const scoreEl = document.getElementById('donttap-score');
    if (scoreEl) scoreEl.innerText = this.score.toLocaleString();

    // Quota
    const quotaEl = document.getElementById('donttap-quota');
    if (quotaEl) quotaEl.innerText = `${this.safeTapsCount} / ${this.targetQuota}`;

    // Quota Progress Bar
    const barEl = document.getElementById('donttap-quota-bar');
    if (barEl && barEl.style) {
      const pct = Math.min(100, Math.round((this.safeTapsCount / this.targetQuota) * 100));
      barEl.style.width = `${pct}%`;
    }

    // Combo
    const comboEl = document.getElementById('donttap-combo');
    if (comboEl) {
      if (this.combo > 1) {
        comboEl.innerText = `x${this.combo}`;
        comboEl.className = 'font-mono text-sm font-bold text-[#48D6A0] animate-pulse';
      } else {
        comboEl.innerText = 'x1';
        comboEl.className = 'font-mono text-sm font-semibold text-[#858AA5]';
      }
    }

    // Lives Icons
    const livesContainer = document.getElementById('donttap-lives-container');
    if (livesContainer) {
      livesContainer.innerHTML = '';
      for (let i = 0; i < this.maxLives; i++) {
        const heart = document.createElement('span');
        heart.className = 'inline-flex items-center justify-center transition-all duration-200';
        if (i < this.lives) {
          heart.innerHTML = `<i data-lucide="heart" class="w-4 h-4 text-[#FF7185] fill-[#FF7185] drop-shadow-[0_0_6px_rgba(255,113,133,0.5)]"></i>`;
        } else {
          heart.innerHTML = `<i data-lucide="heart" class="w-4 h-4 text-[#34364A]"></i>`;
        }
        livesContainer.appendChild(heart);
      }
      if (this.app && typeof this.app.renderIcons === 'function') {
        this.app.renderIcons();
      }
    }
  }

  // --- Spawning Logic ---
  scheduleNextSpawn() {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;

    this.clearSpawnTimer();
    const config = this.getLevelConfig(this.level);

    // Random interval variation around base
    const variance = (Math.random() - 0.5) * 200;
    const delay = Math.max(350, config.spawnInterval + variance);

    this.spawnTimer = setTimeout(() => {
      this.spawnTarget();
      this.scheduleNextSpawn();
    }, delay);
  }

  clearSpawnTimer() {
    if (this.spawnTimer) {
      clearTimeout(this.spawnTimer);
      this.spawnTimer = null;
    }
  }

  getAvailableCells() {
    const available = [];
    for (let i = 0; i < this.gridSize; i++) {
      if (!this.activeTargets.has(i)) {
        available.push(i);
      }
    }
    return available;
  }

  spawnTarget() {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;

    const config = this.getLevelConfig(this.level);
    if (this.activeTargets.size >= config.maxConcurrent) return;

    const available = this.getAvailableCells();
    if (available.length === 0) return;

    const cellIndex = available[Math.floor(Math.random() * available.length)];
    const isDanger = Math.random() < config.dangerChance;
    const type = isDanger ? 'danger' : 'safe';
    const duration = config.lifetime;
    const targetId = ++this.targetIdCounter;

    const board = document.getElementById('donttap-board');
    if (!board) return;
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    if (!cell) return;

    // Create Target DOM inside cell
    const targetEl = document.createElement('div');
    targetEl.className = `donttap-target ${type === 'safe' ? 'donttap-target-safe' : 'donttap-target-danger'}`;
    targetEl.dataset.targetId = targetId;
    targetEl.dataset.type = type;

    // Inner symbol & visual styling
    if (type === 'safe') {
      targetEl.innerHTML = `
        <div class="donttap-target-inner">
          <div class="donttap-glyph-safe">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
            </svg>
          </div>
          <span class="donttap-label-safe">TAP</span>
        </div>
        <div class="donttap-timer-ring" style="animation-duration: ${duration}ms;"></div>
      `;
    } else {
      targetEl.innerHTML = `
        <div class="donttap-target-inner">
          <div class="donttap-glyph-danger">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <span class="donttap-label-danger">DON'T</span>
        </div>
        <div class="donttap-timer-ring danger-ring" style="animation-duration: ${duration}ms;"></div>
      `;
    }

    cell.appendChild(targetEl);

    // Timeout for target expiration
    const spawnTimestamp = Date.now();
    const expireTimeout = setTimeout(() => {
      this.handleTargetExpired(cellIndex, targetId);
    }, duration);

    this.activeTargets.set(cellIndex, {
      id: targetId,
      cellIndex,
      type,
      duration,
      spawnTimestamp,
      remainingTime: duration,
      expireTimeout,
      domElement: targetEl
    });
  }

  // --- Interaction Handling ---
  handleCellClick(cellIndex, event) {
    if (event) event.stopPropagation();
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;

    const target = this.activeTargets.get(cellIndex);
    if (!target) {
      // Tapped an empty socket
      return;
    }

    if (target.type === 'safe') {
      this.handleSafeHit(cellIndex, target);
    } else {
      this.handleDangerHit(cellIndex, target);
    }
  }

  handleSafeHit(cellIndex, target) {
    clearTimeout(target.expireTimeout);
    this.activeTargets.delete(cellIndex);

    this.safeTapsCount++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Quickness calculation (faster tap = bonus points)
    const elapsed = Date.now() - target.spawnTimestamp;
    const quickBonus = Math.max(10, Math.round((1 - elapsed / target.duration) * 50));
    const comboMult = Math.min(this.combo, 10);
    const pointsEarned = (100 * comboMult) + quickBonus;
    this.score += pointsEarned;

    // SFX
    if (window.soundFx) {
      window.soundFx.playTileTap(this.combo);
    }

    // Hit Animation
    const el = target.domElement;
    if (el) {
      el.classList.add('donttap-hit-safe');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 180);
    }

    this.updateHUD();

    // Check if level clear quota reached
    if (this.safeTapsCount >= this.targetQuota) {
      this.handleLevelCleared();
    }
  }

  handleDangerHit(cellIndex, target) {
    clearTimeout(target.expireTimeout);
    this.activeTargets.delete(cellIndex);

    // Penalty: lose 1 life and break combo streak
    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;

    // SFX
    if (window.soundFx) {
      window.soundFx.playError();
    }

    // Violent shake and danger burst
    const el = target.domElement;
    if (el) {
      el.classList.add('donttap-hit-danger');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    }

    // Screen shake / red flash on board
    const board = document.getElementById('donttap-board-card');
    if (board) {
      board.classList.remove('donttap-screen-shake');
      // trigger reflow
      void board.offsetWidth;
      board.classList.add('donttap-screen-shake');
      setTimeout(() => {
        board.classList.remove('donttap-screen-shake');
      }, 400);
    }

    this.updateHUD();

    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  handleTargetExpired(cellIndex, targetId) {
    const target = this.activeTargets.get(cellIndex);
    if (!target || target.id !== targetId) return;

    this.activeTargets.delete(cellIndex);

    if (target.type === 'safe') {
      // Failed to tap safe target before it disappeared: deduct 1 life and reset combo
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;

      // Audio feedback for missed target
      if (window.soundFx) {
        window.soundFx.playError();
      }

      // Visual feedback: board shake / flash
      const board = document.getElementById('donttap-board-card');
      if (board) {
        board.classList.remove('donttap-screen-shake');
        void board.offsetWidth;
        board.classList.add('donttap-screen-shake');
        setTimeout(() => {
          board.classList.remove('donttap-screen-shake');
        }, 400);
      }

      const el = target.domElement;
      if (el) {
        el.classList.add('donttap-fade-miss');
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 150);
      }

      this.updateHUD();

      if (this.lives <= 0) {
        this.handleGameOver();
      }
    } else {
      // Danger target safely expired without tap — disciplined restraint!
      this.score += 25; // Bonus discipline points
      this.updateHUD();
      const el = target.domElement;
      if (el) {
        el.classList.add('donttap-fade-restraint');
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 150);
      }
    }
  }

  clearAllActiveTargets() {
    this.activeTargets.forEach((target) => {
      clearTimeout(target.expireTimeout);
      if (target.domElement && target.domElement.parentNode) {
        target.domElement.parentNode.removeChild(target.domElement);
      }
    });
    this.activeTargets.clear();
  }

  // --- Modals & State Transitions ---
  handleLevelCleared() {
    this.isPlaying = false;
    this.clearSpawnTimer();
    this.clearAllActiveTargets();

    // Bonus points for lives remaining
    const lifeBonus = this.lives * 150;
    this.score += lifeBonus;
    this.checkAndSaveHighScore();

    if (window.soundFx) {
      window.soundFx.playCorrect();
    }

    // Populate Level Clear Modal
    const modal = document.getElementById('modal-donttap-level-clear');
    const msg = document.getElementById('donttap-clear-message');
    const scoreVal = document.getElementById('donttap-clear-score');
    const comboVal = document.getElementById('donttap-clear-max-combo');

    if (msg) msg.innerText = `Reflex inhibition verified. Level ${this.level} conquered!`;
    if (scoreVal) scoreVal.innerText = this.score.toLocaleString();
    if (comboVal) comboVal.innerText = `x${this.maxCombo}`;

    if (this.app) {
      this.app.openModal('modal-donttap-level-clear');
    }
  }

  nextLevel() {
    if (this.app) {
      this.app.closeModal('modal-donttap-level-clear');
    }
    this.startLevel(this.level + 1);
  }

  handleGameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.clearSpawnTimer();
    this.clearAllActiveTargets();

    const isNewHigh = this.checkAndSaveHighScore();

    // Populate Game Over Modal
    const modal = document.getElementById('modal-donttap-game-over');
    const finalScore = document.getElementById('donttap-gameover-score');
    const bestScore = document.getElementById('donttap-gameover-best');
    const reachedLevel = document.getElementById('donttap-gameover-level');
    const newHighBadge = document.getElementById('donttap-gameover-new-high');

    if (finalScore) finalScore.innerText = this.score.toLocaleString();
    if (bestScore) bestScore.innerText = this.highScore.toLocaleString();
    if (reachedLevel) reachedLevel.innerText = this.level;
    if (newHighBadge) {
      newHighBadge.classList.toggle('hidden', !isNewHigh);
    }

    if (this.app) {
      this.app.openModal('modal-donttap-game-over');
    }
  }

  // --- Pause & Resume ---
  togglePause() {
    if (!this.isPlaying || this.isGameOver) return;

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame() {
    this.isPaused = true;
    this.clearSpawnTimer();

    // Calculate remaining time for all active targets & pause their timers
    const now = Date.now();
    this.activeTargets.forEach((target) => {
      clearTimeout(target.expireTimeout);
      const elapsed = now - target.spawnTimestamp;
      target.remainingTime = Math.max(100, target.duration - elapsed);
      if (target.domElement) {
        target.domElement.style.animationPlayState = 'paused';
      }
    });

    // Populate Pause Modal
    const pauseScore = document.getElementById('donttap-pause-score');
    const pauseLevel = document.getElementById('donttap-pause-level');
    if (pauseScore) pauseScore.innerText = this.score.toLocaleString();
    if (pauseLevel) pauseLevel.innerText = this.level;

    if (this.app) {
      this.app.openModal('modal-donttap-pause');
    }
  }

  resumeGame() {
    this.isPaused = false;
    if (this.app) {
      this.app.closeModal('modal-donttap-pause');
    }

    // Resume timers for active targets
    const now = Date.now();
    this.activeTargets.forEach((target) => {
      target.spawnTimestamp = now - (target.duration - target.remainingTime);
      if (target.domElement) {
        target.domElement.style.animationPlayState = 'running';
      }
      target.expireTimeout = setTimeout(() => {
        this.handleTargetExpired(target.cellIndex, target.id);
      }, target.remainingTime);
    });

    // Resume spawn schedule
    this.scheduleNextSpawn();
  }

  exitToMenu() {
    this.isPlaying = false;
    this.isPaused = false;
    this.clearSpawnTimer();
    this.clearAllActiveTargets();
    this.checkAndSaveHighScore();

    if (this.app) {
      this.app.closeModal('modal-donttap-pause');
      this.app.closeModal('modal-donttap-level-clear');
      this.app.closeModal('modal-donttap-game-over');
      this.app.showScreen('menu');
      this.app.updateDontTapMenuCard();
    }
  }
}

window.DontTapGame = DontTapGame;
