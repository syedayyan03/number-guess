// Speed Matrix (1 to N Sequential deduction game) with Anti-Mugup Random Reshuffle
class SpeedMatrixGame {
  constructor(app) {
    this.app = app;
    this.currentLevel = 1;
    this.maxLevel = 10;
    this.targetNumber = 1;
    this.totalNumbers = 9;
    this.gridSize = 3; // e.g. 3x3 = 9
    this.timeLeft = 20;
    this.totalTime = 20;
    this.timerInterval = null;
    this.isGameOver = false;

    // 10 Progressive Levels Configuration
    this.levelConfigs = [
      { level: 1,  cols: 3, total: 9,  time: 18 },  // 3x3, 1-9
      { level: 2,  cols: 3, total: 9,  time: 14 },  // 3x3, faster
      { level: 3,  cols: 4, total: 12, time: 20 },  // 4x3, 1-12
      { level: 4,  cols: 4, total: 16, time: 26 },  // 4x4, 1-16
      { level: 5,  cols: 4, total: 16, time: 20 },  // 4x4, faster
      { level: 6,  cols: 5, total: 20, time: 28 },  // 5x4, 1-20
      { level: 7,  cols: 5, total: 25, time: 35 },  // 5x5, 1-25 (like photo!)
      { level: 8,  cols: 5, total: 25, time: 27 },  // 5x5, faster
      { level: 9,  cols: 6, total: 30, time: 38 },  // 6x5, 1-30
      { level: 10, cols: 6, total: 36, time: 42 }   // 6x6, 1-36 Supreme master
    ];
  }

  startLevel(lvl = 1) {
    this.currentLevel = Math.min(Math.max(1, lvl), this.maxLevel);
    const config = this.levelConfigs[this.currentLevel - 1];

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
    const levelBadge = document.getElementById('matrix-level-badge');
    const targetBadge = document.getElementById('matrix-target-num');
    const progressText = document.getElementById('matrix-progress-text');
    const timerBadge = document.getElementById('matrix-timer-badge');
    const timeBar = document.getElementById('matrix-time-bar');

    if (levelBadge) levelBadge.innerText = `${this.currentLevel} / ${this.maxLevel}`;
    if (targetBadge) targetBadge.innerText = this.targetNumber;
    if (progressText) progressText.innerText = `${this.targetNumber - 1} / ${this.totalNumbers}`;
    if (timerBadge) timerBadge.innerText = `${this.timeLeft.toFixed(1)}s`;
    if (timeBar) timeBar.style.width = '100%';
  }

  // Pure random shuffle algorithm (Fisher-Yates) for fresh Anti-Mugup randomization
  renderGrid() {
    const board = document.getElementById('matrix-board');
    if (!board) return;

    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${this.cols}, minmax(0, 1fr))`;

    // Generate array [1, 2, ..., totalNumbers]
    const numbers = [];
    for (let i = 1; i <= this.totalNumbers; i++) {
      numbers.push(i);
    }

    // Shuffle numbers so positions are 100% unpredictable
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Tile font size adapts smoothly based on grid density
    const fontSize = this.cols >= 6 ? 'text-lg sm:text-xl' : this.cols === 5 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';

    this.lastActiveTile = null;

    numbers.forEach((num) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `matrix-tile w-full aspect-square min-h-[54px] sm:min-h-[68px] ${fontSize}`;
      tile.innerText = num;
      tile.dataset.value = num;

      tile.onclick = () => this.handleTileClick(tile, num);
      board.appendChild(tile);
    });
  }

  handleTileClick(tile, num) {
    if (this.isGameOver || this.timeLeft <= 0) return;

    if (num === this.targetNumber) {
      // Correct sequential tap!
      window.soundFx.playTileTap(this.targetNumber);

      // Remove highlight from previously clicked tile
      if (this.lastActiveTile) {
        this.lastActiveTile.classList.remove('matrix-tile-last-active');
      }

      // Highlight this newly tapped number (number stays visible, NO tick mark!)
      tile.classList.add('matrix-tile-last-active');
      this.lastActiveTile = tile;

      this.targetNumber++;

      const targetBadge = document.getElementById('matrix-target-num');
      const progressText = document.getElementById('matrix-progress-text');
      if (targetBadge) targetBadge.innerText = this.targetNumber <= this.totalNumbers ? this.targetNumber : 'DONE';
      if (progressText) progressText.innerText = `${this.targetNumber - 1} / ${this.totalNumbers}`;

      // Check if all numbers cleared
      if (this.targetNumber > this.totalNumbers) {
        this.levelCompleted();
      }
    } else {
      // Wrong number tapped!
      window.soundFx.playError();
      tile.classList.add('matrix-tile-wrong');
      setTimeout(() => tile.classList.remove('matrix-tile-wrong'), 350);

      // Penalty of -2 seconds for incorrect tap
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

    if (this.currentLevel >= this.maxLevel) {
      // Conquered all 10 levels!
      window.soundFx.playVictory();
      this.app.triggerConfetti();
      const modal = document.getElementById('modal-matrix-victory');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    } else {
      // Level cleared
      const clearTimeEl = document.getElementById('matrix-clear-time-left');
      if (clearTimeEl) clearTimeEl.innerText = `${this.timeLeft.toFixed(1)}s`;

      const modal = document.getElementById('modal-matrix-level-clear');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  }

  nextLevel() {
    this.app.closeModal('modal-matrix-level-clear');
    this.startLevel(this.currentLevel + 1);
  }

  levelFailed() {
    this.stopTimer();
    this.isGameOver = true;
    window.soundFx.playError();

    const modal = document.getElementById('modal-matrix-fail');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  // Anti-mugup retry: keeps same level but triggers 100% fresh reshuffle
  retryLevel() {
    this.app.closeModal('modal-matrix-fail');
    this.startLevel(this.currentLevel);
  }
}

// Ensure global attachment
window.SpeedMatrixGame = SpeedMatrixGame;

