// Sudoku Classic — 9x9 Logic Number Grid with Notes, Auto-validation, and Level Progression
// Designed exclusively for the NumberVerse Cognitive Platform

class SudokuGame {
  constructor(app) {
    this.app = app;
    this.difficulty = 'easy'; // 'easy' | 'medium' | 'hard'
    this.level = 1;
    this.maxLevel = 10;

    // Board Matrices (9x9)
    this.board = Array(9).fill(0).map(() => Array(9).fill(0));
    this.initial = Array(9).fill(0).map(() => Array(9).fill(0));
    this.solution = Array(9).fill(0).map(() => Array(9).fill(0));
    this.notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));

    // Selection & Entry State
    this.selectedCell = { r: 0, c: 0 };
    this.notesMode = false;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.hintsRemaining = 3;
    this.history = []; // Stack of { type: 'value'|'note', r, c, prevVal, prevNotes, newVal, newNotes }

    // Game lifecycle & stopwatch
    this.isPlaying = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.secondsElapsed = 0;
    this.timerInterval = null;

    // Bound listeners for keyboard
    this.handleKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  // --- Puzzle Loading ---
  loadPuzzleForLevel(lvl = this.level, difficulty = this.difficulty) {
    this.difficulty = difficulty || 'easy';
    this.level = Math.max(1, Math.min(10, parseInt(lvl, 10) || 1));

    const puzzles = window.SUDOKU_PUZZLES || {};
    const list = puzzles[this.difficulty] || [];
    const puzzleData = list[this.level - 1] || list[0];

    // Fallback if data not loaded
    const puzzleStr = puzzleData ? puzzleData.puzzle : '000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const solutionStr = puzzleData ? puzzleData.solution : '123456789456789123789123456231564897564897231897231564312645978645978312978312645';

    this.board = Array(9).fill(0).map(() => Array(9).fill(0));
    this.initial = Array(9).fill(0).map(() => Array(9).fill(0));
    this.solution = Array(9).fill(0).map(() => Array(9).fill(0));
    this.notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c;
        const val = parseInt(puzzleStr.charAt(idx), 10) || 0;
        const solVal = parseInt(solutionStr.charAt(idx), 10) || 0;
        this.board[r][c] = val;
        this.initial[r][c] = val;
        this.solution[r][c] = solVal;
      }
    }

    this.history = [];
    this.mistakes = 0;
    this.hintsRemaining = 3;
    this.selectedCell = { r: 0, c: 0 };
    this.notesMode = false;
    this.isCompleted = false;
    this.isPaused = false;
  }

  // --- Start & Lifecycle ---
  startLevel(lvl = 1, difficulty = 'easy') {
    this.difficulty = difficulty || 'easy';
    this.level = Math.max(1, Math.min(10, parseInt(lvl, 10) || 1));
    this.isPlaying = true;

    this.loadPuzzleForLevel(this.level, this.difficulty);
    this.startTimer();
    this.renderBoard();
    this.updateHUD();
    this.updateKeypadBadges();
  }

  startTimer() {
    this.stopTimer();
    this.secondsElapsed = 0;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      if (this.isPlaying && !this.isPaused && !this.isCompleted) {
        this.secondsElapsed++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const el = document.getElementById('sudoku-timer');
    if (!el) return;
    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;
    el.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- Board Rendering ---
  renderBoard() {
    const boardEl = document.getElementById('sudoku-grid');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const selR = this.selectedCell.r;
    const selC = this.selectedCell.c;
    const selVal = (selR >= 0 && selC >= 0) ? this.board[selR][selC] : 0;
    const selBoxR = Math.floor(selR / 3) * 3;
    const selBoxC = Math.floor(selC / 3) * 3;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.id = `sudoku-cell-${r}-${c}`;
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Base cell class & border boundaries for 3x3 subgrids
        let borderClasses = 'border border-slate-700/50';
        if (c === 2 || c === 5) borderClasses += ' border-r-2 border-r-amber-500/70';
        if (r === 2 || r === 5) borderClasses += ' border-b-2 border-b-amber-500/70';

        const isSelected = (r === selR && c === selC);
        const isRelated = (r === selR || c === selC || (Math.floor(r / 3) * 3 === selBoxR && Math.floor(c / 3) * 3 === selBoxC));
        const val = this.board[r][c];
        const isInitial = this.initial[r][c] !== 0;
        const isMatchingVal = (val > 0 && selVal > 0 && val === selVal);
        const isWrong = (val > 0 && val !== this.solution[r][c]);

        let stateClasses = 'bg-[#151728]';
        if (isSelected) {
          stateClasses = 'bg-amber-500/30 ring-2 ring-amber-400 z-10';
        } else if (isMatchingVal) {
          stateClasses = 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50';
        } else if (isRelated) {
          stateClasses = 'bg-white/[0.04]';
        }

        cell.className = `sudoku-cell relative aspect-square flex items-center justify-center cursor-pointer select-none transition-colors duration-100 ${borderClasses} ${stateClasses}`;

        // Content: Initial clue, Player entered digit, or Notes grid
        if (val > 0) {
          const numSpan = document.createElement('span');
          if (isInitial) {
            numSpan.className = 'text-lg sm:text-2xl font-black font-mono text-[#F5F5FF] drop-shadow-sm';
          } else if (isWrong) {
            numSpan.className = 'text-lg sm:text-2xl font-black font-mono text-[#FF7185] animate-pulse';
          } else {
            numSpan.className = 'text-lg sm:text-2xl font-black font-mono text-[#38BDF8]';
          }
          numSpan.innerText = val;
          cell.appendChild(numSpan);
        } else {
          // Candidate notes mini grid (3x3)
          const cellNotes = this.notes[r][c];
          if (cellNotes && cellNotes.size > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'w-full h-full grid grid-cols-3 grid-rows-3 p-0.5 pointer-events-none';
            for (let n = 1; n <= 9; n++) {
              const noteSlot = document.createElement('div');
              noteSlot.className = 'flex items-center justify-center text-[8px] sm:text-[10px] font-mono leading-none';
              if (cellNotes.has(n)) {
                noteSlot.innerText = n;
                noteSlot.className += (selVal === n) ? ' text-amber-300 font-black' : ' text-slate-400 font-semibold';
              }
              notesGrid.appendChild(noteSlot);
            }
            cell.appendChild(notesGrid);
          }
        }

        cell.onclick = (e) => {
          e.stopPropagation();
          this.selectCell(r, c);
        };

        boardEl.appendChild(cell);
      }
    }
  }

  // --- Interaction & Input ---
  selectCell(r, c) {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;
    this.selectedCell = { r, c };
    if (window.soundFx) window.soundFx.playClick();
    this.renderBoard();
  }

  inputNumber(num) {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;
    const { r, c } = this.selectedCell;
    if (r < 0 || c < 0 || r >= 9 || c >= 9) return;

    // Starting clues are immutable
    if (this.initial[r][c] !== 0) {
      if (window.soundFx) window.soundFx.playTick();
      return;
    }

    if (this.notesMode) {
      // Toggle candidate pencil note
      const cellNotes = this.notes[r][c];
      const prevNotes = new Set(cellNotes);
      const prevVal = this.board[r][c];

      if (cellNotes.has(num)) {
        cellNotes.delete(num);
      } else {
        cellNotes.add(num);
      }
      this.board[r][c] = 0; // Clear value if notes are entered

      this.history.push({
        type: 'note',
        r,
        c,
        prevVal,
        newVal: 0,
        prevNotes,
        newNotes: new Set(cellNotes)
      });

      if (window.soundFx) window.soundFx.playClick();
      this.renderBoard();
      this.updateKeypadBadges();
      return;
    }

    // Normal value input
    if (this.board[r][c] === num) return; // Same value already

    const prevVal = this.board[r][c];
    const prevNotes = new Set(this.notes[r][c]);
    const isCorrect = (num === this.solution[r][c]);

    this.board[r][c] = num;
    this.notes[r][c].clear();

    // Auto-remove placed digit from notes in same row, col, box
    const affectedNotes = [];
    if (isCorrect) {
      const boxR = Math.floor(r / 3) * 3;
      const boxC = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        if (this.notes[r][i].has(num)) {
          this.notes[r][i].delete(num);
          affectedNotes.push({ r, c: i, num });
        }
        if (this.notes[i][c].has(num)) {
          this.notes[i][c].delete(num);
          affectedNotes.push({ r: i, c, num });
        }
        const br = boxR + Math.floor(i / 3);
        const bc = boxC + (i % 3);
        if (this.notes[br][bc].has(num)) {
          this.notes[br][bc].delete(num);
          affectedNotes.push({ r: br, c: bc, num });
        }
      }
    }

    this.history.push({
      type: 'value',
      r,
      c,
      prevVal,
      newVal: num,
      prevNotes,
      newNotes: new Set(),
      affectedNotes
    });

    if (isCorrect) {
      if (window.soundFx) window.soundFx.playCorrect();
      this.renderBoard();
      this.updateKeypadBadges();
      this.checkWinCondition();
    } else {
      // Mistake!
      this.mistakes++;
      if (window.soundFx) window.soundFx.playError();
      this.updateHUD();
      this.renderBoard();

      // Shake board card
      const boardCard = document.getElementById('sudoku-board-card');
      if (boardCard) {
        boardCard.classList.remove('animate-shake');
        void boardCard.offsetWidth;
        boardCard.classList.add('animate-shake');
        setTimeout(() => boardCard.classList.remove('animate-shake'), 400);
      }

      if (this.mistakes >= this.maxMistakes) {
        this.handleGameOver();
      }
    }
  }

  erase() {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;
    const { r, c } = this.selectedCell;
    if (r < 0 || c < 0 || this.initial[r][c] !== 0) return;

    if (this.board[r][c] === 0 && this.notes[r][c].size === 0) return;

    const prevVal = this.board[r][c];
    const prevNotes = new Set(this.notes[r][c]);

    this.board[r][c] = 0;
    this.notes[r][c].clear();

    this.history.push({
      type: 'erase',
      r,
      c,
      prevVal,
      newVal: 0,
      prevNotes,
      newNotes: new Set()
    });

    if (window.soundFx) window.soundFx.playClick();
    this.renderBoard();
    this.updateKeypadBadges();
  }

  undo() {
    if (!this.isPlaying || this.isPaused || this.isCompleted || this.history.length === 0) return;
    const action = this.history.pop();
    const { r, c, prevVal, prevNotes, affectedNotes } = action;

    this.board[r][c] = prevVal;
    this.notes[r][c] = new Set(prevNotes);

    // Restore affected candidate notes if any
    if (affectedNotes && affectedNotes.length > 0) {
      affectedNotes.forEach(item => {
        if (this.board[item.r][item.c] === 0) {
          this.notes[item.r][item.c].add(item.num);
        }
      });
    }

    this.selectedCell = { r, c };
    if (window.soundFx) window.soundFx.playClick();
    this.renderBoard();
    this.updateKeypadBadges();
  }

  toggleNotesMode() {
    this.notesMode = !this.notesMode;
    const btn = document.getElementById('sudoku-btn-pencil');
    const badge = document.getElementById('sudoku-pencil-badge');
    if (btn) {
      btn.classList.toggle('bg-amber-500', this.notesMode);
      btn.classList.toggle('text-black', this.notesMode);
      btn.classList.toggle('bg-white/5', !this.notesMode);
      btn.classList.toggle('text-slate-300', !this.notesMode);
    }
    if (badge) {
      badge.innerText = this.notesMode ? 'ON' : 'OFF';
      badge.className = `text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${this.notesMode ? 'bg-black text-amber-300' : 'bg-slate-700 text-slate-300'}`;
    }
    if (window.soundFx) window.soundFx.playClick();
  }

  giveHint() {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;
    if (this.hintsRemaining <= 0) {
      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast('No hints remaining for this level!', 'warning');
      }
      return;
    }

    let { r, c } = this.selectedCell;
    // If selected cell already has correct value, find the first open cell
    if (r < 0 || c < 0 || this.board[r][c] === this.solution[r][c]) {
      let found = false;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (this.board[row][col] !== this.solution[row][col]) {
            r = row;
            c = col;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) return; // Board complete
      this.selectedCell = { r, c };
    }

    const correctVal = this.solution[r][c];
    this.board[r][c] = correctVal;
    this.notes[r][c].clear();
    this.hintsRemaining--;

    // Update hints badge
    const hintBadge = document.getElementById('sudoku-hints-left');
    if (hintBadge) hintBadge.innerText = this.hintsRemaining;

    if (window.soundFx) window.soundFx.playCorrect();
    this.renderBoard();
    this.updateKeypadBadges();
    this.checkWinCondition();
  }

  // --- Keypad Remaining Badges ---
  updateKeypadBadges() {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.board[r][c] === num && this.board[r][c] === this.solution[r][c]) {
            count++;
          }
        }
      }
      const remaining = 9 - count;
      const btn = document.getElementById(`sudoku-key-${num}`);
      const badge = document.getElementById(`sudoku-key-badge-${num}`);
      if (badge) {
        badge.innerText = remaining > 0 ? remaining : '✓';
      }
      if (btn) {
        if (remaining <= 0) {
          btn.classList.add('opacity-30', 'pointer-events-none');
        } else {
          btn.classList.remove('opacity-30', 'pointer-events-none');
        }
      }
    }
  }

  // --- Keyboard Handler ---
  onKeyDown(e) {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;
    if (this.app && this.app.currentScreen !== 'sudoku') return;

    const key = e.key;
    if (key >= '1' && key <= '9') {
      e.preventDefault();
      this.inputNumber(parseInt(key, 10));
    } else if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      this.erase();
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      this.moveSelection(-1, 0);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      this.moveSelection(1, 0);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      this.moveSelection(0, -1);
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      this.moveSelection(0, 1);
    } else if (key === 'n' || key === 'N' || key === 'p' || key === 'P') {
      e.preventDefault();
      this.toggleNotesMode();
    } else if (key === 'h' || key === 'H') {
      e.preventDefault();
      this.giveHint();
    } else if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.undo();
    } else if (key === 'Escape') {
      e.preventDefault();
      this.togglePause();
    }
  }

  moveSelection(dr, dc) {
    let r = this.selectedCell.r + dr;
    let c = this.selectedCell.c + dc;
    r = (r + 9) % 9;
    c = (c + 9) % 9;
    this.selectedCell = { r, c };
    this.renderBoard();
  }

  // --- Win Condition & Celebration ---
  checkWinCondition() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] !== this.solution[r][c]) {
          return false;
        }
      }
    }

    // Level Cleared!
    this.isCompleted = true;
    this.stopTimer();

    if (window.soundFx) window.soundFx.playCorrect();
    if (this.app && typeof this.app.triggerConfetti === 'function') {
      this.app.triggerConfetti();
    }

    // Save Progress to GameSettingsManager
    if (this.app && this.app.gameSettingsManager) {
      this.app.gameSettingsManager.markLevelCompleted('sudoku', this.difficulty, this.level, 3, this.secondsElapsed);
    }

    setTimeout(() => {
      this.showLevelClearModal();
    }, 600);
    return true;
  }

  showLevelClearModal() {
    const modal = document.getElementById('modal-sudoku-level-clear');
    const timeEl = document.getElementById('sudoku-clear-time');
    const lvlEl = document.getElementById('sudoku-clear-level');
    const mistakesEl = document.getElementById('sudoku-clear-mistakes');

    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;
    if (timeEl) timeEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (lvlEl) lvlEl.innerText = `Level ${this.level} (${(this.difficulty || 'easy').toUpperCase()})`;
    if (mistakesEl) mistakesEl.innerText = `${this.mistakes} / ${this.maxMistakes}`;

    if (this.app) this.app.openModal('modal-sudoku-level-clear');
  }

  nextLevel() {
    if (this.app) this.app.closeModal('modal-sudoku-level-clear');
    if (this.level < this.maxLevel) {
      this.level++;
      if (this.app && this.app.gameSettingsManager) {
        this.app.gameSettingsManager.startLevel('sudoku', this.difficulty, this.level);
      } else {
        this.startLevel(this.level, this.difficulty);
      }
    } else {
      this.exitToLevels();
      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast(`🎉 Mastermind! You completed all 10 ${(this.difficulty || 'easy').toUpperCase()} Sudoku puzzles!`, 'success');
      }
    }
  }

  handleGameOver() {
    this.isPlaying = false;
    this.stopTimer();

    const modal = document.getElementById('modal-sudoku-game-over');
    const lvlEl = document.getElementById('sudoku-over-level');
    if (lvlEl) lvlEl.innerText = `Level ${this.level} (${(this.difficulty || 'easy').toUpperCase()})`;

    if (this.app) this.app.openModal('modal-sudoku-game-over');
  }

  restartLevel() {
    if (this.app) {
      this.app.closeModal('modal-sudoku-game-over');
      this.app.closeModal('modal-sudoku-pause');
    }
    this.startLevel(this.level, this.difficulty);
  }

  // --- Pause & Resume ---
  togglePause() {
    if (!this.isPlaying || this.isCompleted) return;
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame() {
    this.isPaused = true;
    const modal = document.getElementById('modal-sudoku-pause');
    const lvlEl = document.getElementById('sudoku-pause-level');
    if (lvlEl) lvlEl.innerText = `Level ${this.level}`;
    if (this.app) this.app.openModal('modal-sudoku-pause');
  }

  resumeGame() {
    this.isPaused = false;
    if (this.app) this.app.closeModal('modal-sudoku-pause');
  }

  // --- Navigation ---
  exitToLevels() {
    this.stopTimer();
    this.isPlaying = false;
    if (this.app && this.app.gameSettingsManager) {
      this.app.gameSettingsManager.openLevels('sudoku', this.difficulty);
    } else if (this.app) {
      this.app.showScreen('menu');
    }
  }

  exitToMenu() {
    this.stopTimer();
    this.isPlaying = false;
    if (this.app) {
      this.app.closeModal('modal-sudoku-pause');
      this.app.closeModal('modal-sudoku-level-clear');
      this.app.closeModal('modal-sudoku-game-over');
      this.app.showScreen('menu');
      if (typeof this.app.updateSudokuMenuCard === 'function') {
        this.app.updateSudokuMenuCard();
      }
    }
  }

  updateHUD() {
    const lvlEl = document.getElementById('sudoku-hud-level');
    const diffBadge = document.getElementById('sudoku-diff-badge');
    const mistakesEl = document.getElementById('sudoku-hud-mistakes');
    const hintsBadge = document.getElementById('sudoku-hints-left');

    if (lvlEl) lvlEl.innerText = `${this.level} / ${this.maxLevel}`;
    if (mistakesEl) mistakesEl.innerText = `${this.mistakes} / ${this.maxMistakes}`;
    if (hintsBadge) hintsBadge.innerText = this.hintsRemaining;

    if (diffBadge) {
      diffBadge.innerText = (this.difficulty || 'easy').toUpperCase();
      diffBadge.className = `px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
        this.difficulty === 'hard'
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          : this.difficulty === 'medium'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      }`;
    }
  }
}

window.SudokuGame = SudokuGame;
