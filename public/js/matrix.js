// Speed Matrix (1 to N Sequential deduction game) with Difficulty & Level Integration
class SpeedMatrixGame {
  constructor(app) {
    this.app = app;
    this.difficulty = 'easy'; // 'easy' | 'medium' | 'hard'
    this.currentLevel = 1;
    this.maxLevel = 10;
    this.targetNumber = 1;
    this.totalNumbers = 9;
    this.cols = 3;
    this.timeLeft = 35;
    this.totalTime = 35;
    this.timerInterval = null;
    this.isGameOver = false;

    // 10 Progressive Levels for each Difficulty (Monotonically strictly increasing hardness: seconds per tile shrinks steadily)
    this.difficultyConfigs = {
      easy: [
        { level: 1,  cols: 3, total: 9,  time: 35 }, // 3.89s / tile
        { level: 2,  cols: 3, total: 9,  time: 30 }, // 3.33s / tile
        { level: 3,  cols: 3, total: 9,  time: 25 }, // 2.78s / tile
        { level: 4,  cols: 4, total: 12, time: 30 }, // 2.50s / tile
        { level: 5,  cols: 4, total: 12, time: 26 }, // 2.17s / tile
        { level: 6,  cols: 4, total: 12, time: 22 }, // 1.83s / tile
        { level: 7,  cols: 4, total: 16, time: 26 }, // 1.63s / tile
        { level: 8,  cols: 4, total: 16, time: 23 }, // 1.44s / tile
        { level: 9,  cols: 4, total: 16, time: 20 }, // 1.25s / tile
        { level: 10, cols: 4, total: 16, time: 17 }  // 1.06s / tile
      ],
      medium: [
        { level: 1,  cols: 5, total: 20, time: 20 }, // 1.00s / tile
        { level: 2,  cols: 5, total: 20, time: 18 }, // 0.90s / tile
        { level: 3,  cols: 5, total: 25, time: 21 }, // 0.84s / tile
        { level: 4,  cols: 5, total: 25, time: 19 }, // 0.76s / tile
        { level: 5,  cols: 5, total: 25, time: 17 }, // 0.68s / tile
        { level: 6,  cols: 6, total: 30, time: 19 }, // 0.63s / tile
        { level: 7,  cols: 6, total: 30, time: 17 }, // 0.57s / tile
        { level: 8,  cols: 6, total: 30, time: 15 }, // 0.50s / tile
        { level: 9,  cols: 6, total: 36, time: 16 }, // 0.44s / tile
        { level: 10, cols: 6, total: 36, time: 14 }  // 0.39s / tile
      ],
      hard: [
        { level: 1,  cols: 6, total: 36, time: 13 }, // 0.36s / tile
        { level: 2,  cols: 6, total: 36, time: 12 }, // 0.33s / tile
        { level: 3,  cols: 7, total: 42, time: 13 }, // 0.31s / tile
        { level: 4,  cols: 7, total: 42, time: 12 }, // 0.29s / tile
        { level: 5,  cols: 7, total: 42, time: 11 }, // 0.26s / tile
        { level: 6,  cols: 7, total: 49, time: 12 }, // 0.24s / tile
        { level: 7,  cols: 7, total: 49, time: 11 }, // 0.22s / tile
        { level: 8,  cols: 7, total: 49, time: 10 }, // 0.20s / tile
        { level: 9,  cols: 7, total: 49, time: 9 },  // 0.18s / tile
        { level: 10, cols: 7, total: 49, time: 8 }   // 0.16s / tile
      ]
    };
  }

  getSavedLevel() {
    if (this.app && this.app.gameSettingsManager) {
      const prog = this.app.gameSettingsManager.getDifficultyProgress('speed_grid', this.difficulty || 'easy');
      return prog.unlocked || 1;
    }
    return 1;
  }

  saveProgress(lvl = this.currentLevel) {
    if (this.app && this.app.gameSettingsManager) {
      const all = this.app.gameSettingsManager.getAllProgress('speed_grid');
      const diff = this.difficulty || 'easy';
      if (!all[diff]) all[diff] = { unlocked: 1, completed: {} };
      if (lvl > all[diff].unlocked) all[diff].unlocked = Math.min(10, lvl);
      this.app.gameSettingsManager.saveAllProgress('speed_grid', all);
      this.app.gameSettingsManager.updateAppMenuCards('speed_grid');
    }
  }

  resetProgress() {
    if (this.app && this.app.gameSettingsManager) {
      const all = this.app.gameSettingsManager.getAllProgress('speed_grid');
      const diff = this.difficulty || 'easy';
      all[diff] = { unlocked: 1, completed: {} };
      this.app.gameSettingsManager.saveAllProgress('speed_grid', all);
      this.app.gameSettingsManager.updateAppMenuCards('speed_grid');
    }
  }

  exitToLevels() {
    this.stopTimer();
    if (this.app && this.app.gameSettingsManager) {
      this.app.gameSettingsManager.openLevels('speed_grid', this.difficulty);
    } else if (this.app) {
      this.app.showScreen('menu');
    }
  }

  exitToMenu() {
    this.stopTimer();
    if (this.app) {
      this.app.showScreen('menu');
      if (typeof this.app.updateMatrixMenuCard === 'function') {
        this.app.updateMatrixMenuCard();
      }
    }
  }

  // Starts freshly from the specified level and difficulty
  getLevelConfig(lvl = this.currentLevel, diff = this.difficulty) {
    const configs = this.difficultyConfigs[diff] || this.difficultyConfigs.easy;
    return configs[Math.min(Math.max(1, lvl), this.maxLevel) - 1] || configs[0];
  }

  startLevel(lvl = null, difficulty = null) {
    if (difficulty) {
      this.difficulty = difficulty;
    } else if (!this.difficulty) {
      this.difficulty = 'easy';
    }

    if (lvl === null || lvl === undefined) {
      lvl = this.getSavedLevel();
    }
    this.currentLevel = Math.min(Math.max(1, lvl), this.maxLevel);

    const configs = this.difficultyConfigs[this.difficulty] || this.difficultyConfigs.easy;
    const config = configs[this.currentLevel - 1] || configs[0];

    this.cols = config.cols;
    this.totalNumbers = config.total;
    this.totalTime = config.time;
    this.timeLeft = config.time;
    this.targetNumber = 1;
    this.isGameOver = false;

    this.stopTimer();
    this.renderHeader();
    this.renderGrid();
    this.startTimer();
  }

  renderHeader() {
    const diffBadge = document.getElementById('matrix-diff-badge');
    const levelBadge = document.getElementById('matrix-level-badge');
    const targetBadge = document.getElementById('matrix-target-num');
    const progressText = document.getElementById('matrix-progress-text');
    const timerBadge = document.getElementById('matrix-timer-badge');
    const timeBar = document.getElementById('matrix-time-bar');

    if (diffBadge) {
      diffBadge.innerText = (this.difficulty || 'EASY').toUpperCase();
      diffBadge.className = `font-mono text-xs font-black uppercase px-2 py-0.5 rounded-md ${
        this.difficulty === 'hard'
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          : this.difficulty === 'medium'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
      }`;
    }
    if (levelBadge) levelBadge.innerText = `${this.currentLevel} / ${this.maxLevel}`;
    if (targetBadge) targetBadge.innerText = this.targetNumber;
    if (progressText) progressText.innerText = `${this.targetNumber - 1} / ${this.totalNumbers}`;
    if (timerBadge) timerBadge.innerText = `${this.timeLeft.toFixed(1)}s`;
    if (timeBar) timeBar.style.width = '100%';
  }

  renderGrid() {
    const board = document.getElementById('matrix-board');
    if (!board) return;

    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${this.cols}, minmax(0, 1fr))`;

    const numbers = [];
    for (let i = 1; i <= this.totalNumbers; i++) {
      numbers.push(i);
    }

    // Shuffle numbers
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const fontSize = this.cols >= 7 ? 'text-xs sm:text-sm font-black' : this.cols >= 6 ? 'text-sm sm:text-base font-bold' : this.cols === 5 ? 'text-base sm:text-lg font-bold' : 'text-xl sm:text-2xl font-black';

    this.lastActiveTile = null;

    numbers.forEach((num) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `matrix-tile w-full aspect-square min-h-[38px] sm:min-h-[44px] ${fontSize}`;
      tile.innerText = num;
      tile.dataset.value = num;

      tile.onclick = () => this.handleTileClick(tile, num);
      board.appendChild(tile);
    });
  }

  handleTileClick(tile, num) {
    if (this.isGameOver || this.timeLeft <= 0) return;

    if (num === this.targetNumber) {
      window.soundFx.playTileTap(this.targetNumber);

      if (this.lastActiveTile) {
        this.lastActiveTile.classList.remove('matrix-tile-last-active');
      }

      tile.classList.add('matrix-tile-last-active');
      this.lastActiveTile = tile;

      this.targetNumber++;

      const targetBadge = document.getElementById('matrix-target-num');
      const progressText = document.getElementById('matrix-progress-text');
      if (targetBadge) targetBadge.innerText = this.targetNumber <= this.totalNumbers ? this.targetNumber : 'DONE';
      if (progressText) progressText.innerText = `${this.targetNumber - 1} / ${this.totalNumbers}`;

      if (this.targetNumber > this.totalNumbers) {
        this.levelCompleted();
      }
    } else {
      window.soundFx.playError();
      tile.classList.add('matrix-tile-wrong');
      setTimeout(() => tile.classList.remove('matrix-tile-wrong'), 350);

      this.timeLeft = Math.max(0, this.timeLeft - 2.0);
      this.updateTimerDisplay();

      if (this.timeLeft <= 0) {
        this.levelFailed();
      }
    }
  }

  startTimer() {
    const startTime = Date.now();
    const initialTime = this.timeLeft;

    this.timerInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.timeLeft = Math.max(0, initialTime - elapsed);
      this.updateTimerDisplay();

      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.levelFailed();
      }
    }, 100);
  }

  updateTimerDisplay() {
    const timerBadge = document.getElementById('matrix-timer-badge');
    const timeBar = document.getElementById('matrix-time-bar');

    if (timerBadge) {
      timerBadge.innerText = `${this.timeLeft.toFixed(1)}s`;
      if (this.timeLeft <= 5) {
        timerBadge.classList.add('text-rose-400');
      } else {
        timerBadge.classList.remove('text-rose-400');
      }
    }

    if (timeBar) {
      const pct = Math.max(0, Math.min(100, (this.timeLeft / this.totalTime) * 100));
      timeBar.style.width = `${pct}%`;
      if (pct <= 25) {
        timeBar.className = 'h-full bg-rose-500 transition-all duration-100 ease-linear rounded-full';
      } else {
        timeBar.className = 'h-full bg-cyan-400 transition-all duration-100 ease-linear rounded-full';
      }
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  levelCompleted() {
    this.stopTimer();
    this.isGameOver = true;

    window.soundFx.playCorrect();

    // Mark completed in gameSettingsManager
    if (this.app && this.app.gameSettingsManager) {
      this.app.gameSettingsManager.markLevelCompleted('speed_grid', this.difficulty, this.currentLevel, 3, this.timeLeft);
    }

    if (this.currentLevel >= this.maxLevel) {
      window.soundFx.playVictory();
      if (this.app) this.app.triggerConfetti();

      const modal = document.getElementById('modal-matrix-victory');
      const vicDiff = document.getElementById('matrix-victory-difficulty');
      if (vicDiff) vicDiff.innerText = `${(this.difficulty || 'Easy').toUpperCase()} MODE COMPLETED!`;
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    } else {
      const clearTimeEl = document.getElementById('matrix-clear-time-left');
      const clearLvlEl = document.getElementById('matrix-clear-level-title');
      if (clearTimeEl) clearTimeEl.innerText = `${this.timeLeft.toFixed(1)}s`;
      if (clearLvlEl) clearLvlEl.innerText = `${(this.difficulty || 'Easy').toUpperCase()} - Level ${this.currentLevel} Cleared!`;

      const modal = document.getElementById('modal-matrix-level-clear');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  }

  nextLevel() {
    if (this.app) this.app.closeModal('modal-matrix-level-clear');
    if (this.currentLevel < this.maxLevel) {
      const nextLvl = this.currentLevel + 1;
      if (this.app && this.app.gameSettingsManager) {
        this.app.gameSettingsManager.startLevel('speed_grid', this.difficulty, nextLvl, true);
      } else {
        this.startLevel(nextLvl);
      }
    } else {
      this.exitToLevels();
    }
  }

  levelFailed() {
    this.stopTimer();
    this.isGameOver = true;
    window.soundFx.playError();

    const failLvlEl = document.getElementById('matrix-fail-level-title');
    if (failLvlEl) failLvlEl.innerText = `${(this.difficulty || 'Easy').toUpperCase()} - Level ${this.currentLevel}`;

    const modal = document.getElementById('modal-matrix-fail');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  retryLevel() {
    if (this.app) {
      this.app.closeModal('modal-matrix-fail');
      this.app.closeModal('modal-matrix-level-clear');
      this.app.closeModal('modal-matrix-victory');
    }
    this.startLevel(this.currentLevel, this.difficulty);
  }
}

if (typeof window !== 'undefined') {
  window.SpeedMatrixGame = SpeedMatrixGame;
}
