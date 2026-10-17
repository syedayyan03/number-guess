// Countdown Calculation Game — Mental Math Inhibitory & Rapid Deduction
// Strictly adheres to the NumberVerse Design System
class CountdownCalculationGame {
  constructor(app) {
    this.app = app;
    this.storageKey = 'numberverse_countdown_best';

    // Config values chosen by user (no hardcoded defaults)
    this.startNumber = null;
    this.subtractionGap = null;

    // Game state
    this.currentNumber = 0;
    this.expectedAnswer = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.streak = 0;
    this.bestStreak = 0;

    // Timer
    this.attemptDuration = 5000; // 5.0 seconds per answer
    this.remainingMs = 5000;
    this.attemptStartTime = 0;
    this.timerInterval = null;

    // State flags
    this.view = 'setup'; // 'setup' | 'play'
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isCompleted = false;
    this.isProcessingAttempt = false;

    // Best score cache
    this.bestScore = this.getSavedBestScore();

    // Setup input validation bindings
    this.setupEventListeners();
  }

  // --- Persistence ---
  getSavedBestScore() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestScore() {
    let isNewBest = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(this.storageKey, this.bestScore.toString());
      } catch (e) {}
      isNewBest = true;
    }
    if (this.app && typeof this.app.updateCountdownMenuCard === 'function') {
      this.app.updateCountdownMenuCard();
    }
    return isNewBest;
  }

  resetBestScore() {
    try {
      localStorage.removeItem(this.storageKey);
      this.bestScore = 0;
      if (this.app && typeof this.app.updateCountdownMenuCard === 'function') {
        this.app.updateCountdownMenuCard();
      }
    } catch (e) {}
  }

  // --- Event Listeners & Setup ---
  setupEventListeners() {
    // Visibility change handling to prevent extra time in background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying && !this.isPaused && !this.isGameOver && !this.isCompleted) {
        this.pauseGame();
      }
    });

    // Keyboard shortcuts (Escape / P to pause)
    window.addEventListener('keydown', (e) => {
      if (this.app && this.app.currentScreen === 'countdown' && this.view === 'play') {
        if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.isPlaying && !this.isGameOver && !this.isCompleted) {
          this.togglePause();
        }
      }
    });
  }

  initSetupScreen() {
    this.view = 'setup';
    this.clearTimer();
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isCompleted = false;

    // Toggle views
    const setupView = document.getElementById('countdown-setup-view');
    const playView = document.getElementById('countdown-play-view');
    if (setupView) setupView.classList.remove('hidden');
    if (playView) playView.classList.add('hidden');

    // Populate inputs with current values if already set by user
    const startInput = document.getElementById('countdown-start-input');
    const gapInput = document.getElementById('countdown-gap-input');
    if (startInput) startInput.value = this.startNumber !== null ? this.startNumber : '';
    if (gapInput) gapInput.value = this.subtractionGap !== null ? this.subtractionGap : '';

    this.updatePreviewAndValidation();
  }

  updatePreviewAndValidation() {
    const startInput = document.getElementById('countdown-start-input');
    const gapInput = document.getElementById('countdown-gap-input');
    const errorEl = document.getElementById('countdown-setup-error');
    const previewEl = document.getElementById('countdown-sequence-preview');
    const stepsEl = document.getElementById('countdown-steps-estimate');
    const startBtn = document.getElementById('countdown-start-btn');

    if (!startInput || !gapInput) return false;

    const rawStart = startInput.value.trim();
    const rawGap = gapInput.value.trim();

    // If either input is empty, cleanly prompt user without showing validation error
    if (!rawStart || !rawGap) {
      if (errorEl) errorEl.classList.add('hidden');
      if (previewEl) previewEl.innerText = 'Enter your upper limit and gap above';
      if (stepsEl) stepsEl.innerText = '—';
      if (startBtn) startBtn.disabled = true;
      return false;
    }

    const startVal = parseInt(rawStart, 10);
    const gapVal = parseInt(rawGap, 10);

    let error = null;

    if (isNaN(startVal) || isNaN(gapVal)) {
      error = 'Please enter valid whole numbers.';
    } else if (startVal <= 0 || gapVal <= 0) {
      error = 'Upper limit and gap must be positive whole numbers.';
    } else if (startVal <= gapVal) {
      error = 'Upper limit must be greater than subtraction gap.';
    } else if (startVal > 10000) {
      error = 'Upper limit must not exceed 10,000.';
    } else if (gapVal > 1000) {
      error = 'Subtraction gap must not exceed 1,000.';
    }

    if (error) {
      if (errorEl) {
        errorEl.innerText = error;
        errorEl.classList.remove('hidden');
      }
      if (previewEl) previewEl.innerText = '—';
      if (stepsEl) stepsEl.innerText = '—';
      if (startBtn) startBtn.disabled = true;
      return false;
    }

    // Valid inputs
    if (errorEl) errorEl.classList.add('hidden');
    if (startBtn) startBtn.disabled = false;

    this.startNumber = startVal;
    this.subtractionGap = gapVal;

    // Calculate preview sequence (e.g. 100 -> 93 -> 86 -> ... -> 2)
    const sequence = [this.startNumber];
    let curr = this.startNumber;
    let count = 0;
    while (curr - this.subtractionGap > 0 && count < 2000) {
      curr -= this.subtractionGap;
      sequence.push(curr);
      count++;
    }

    if (previewEl) {
      if (sequence.length <= 6) {
        previewEl.innerText = sequence.join(' → ');
      } else {
        const firstFew = sequence.slice(0, 3).join(' → ');
        const lastOne = sequence[sequence.length - 1];
        previewEl.innerText = `${firstFew} → ... → ${lastOne}`;
      }
    }

    if (stepsEl) {
      stepsEl.innerText = `${count} calculation${count === 1 ? '' : 's'} to complete`;
    }

    return true;
  }

  // --- Game Lifecycle ---
  startGame() {
    if (!this.updatePreviewAndValidation()) return;

    this.view = 'play';
    this.currentNumber = this.startNumber;
    this.expectedAnswer = this.currentNumber - this.subtractionGap;
    this.score = 0;
    this.correctAnswers = 0;
    this.mistakes = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isCompleted = false;
    this.isPlaying = true;
    this.isProcessingAttempt = false;

    // Toggle views
    const setupView = document.getElementById('countdown-setup-view');
    const playView = document.getElementById('countdown-play-view');
    if (setupView) setupView.classList.add('hidden');
    if (playView) playView.classList.remove('hidden');

    this.updateHUD();
    this.updateCurrentNumberUI();
    this.clearFeedback();

    // Start first attempt
    this.startAttempt();
  }

  startAttempt() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || this.isCompleted) return;

    this.clearTimer();
    this.isProcessingAttempt = false;
    this.remainingMs = this.attemptDuration;
    this.attemptStartTime = Date.now();

    this.updateTimerUI(this.remainingMs);

    // Focus answer input
    const input = document.getElementById('countdown-answer-input');
    if (input) {
      input.value = '';
      input.disabled = false;
      input.focus();
    }

    // High frequency interval for smooth timer
    this.timerInterval = setInterval(() => {
      if (this.isPaused || !this.isPlaying || this.isProcessingAttempt) return;

      const elapsed = Date.now() - this.attemptStartTime;
      this.remainingMs = Math.max(0, this.attemptDuration - elapsed);

      this.updateTimerUI(this.remainingMs);

      if (this.remainingMs <= 0) {
        this.clearTimer();
        this.handleTimeout();
      }
    }, 50);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerUI(ms) {
    const sec = (ms / 1000).toFixed(1);
    const display = document.getElementById('countdown-timer-display');
    const bar = document.getElementById('countdown-timer-bar');

    if (display) {
      display.innerText = `${sec}s`;
      if (ms <= 1500) {
        display.className = 'font-mono font-bold text-sm text-[#FF7185] animate-pulse';
      } else {
        display.className = 'font-mono font-bold text-sm text-[#F5F5FF]';
      }
    }

    if (bar) {
      const pct = Math.min(100, Math.max(0, (ms / this.attemptDuration) * 100));
      bar.style.width = `${pct}%`;
      if (ms <= 1500) {
        bar.className = 'h-full bg-gradient-to-r from-[#FF7185] to-[#DC2626] transition-all duration-75 rounded-full';
      } else {
        bar.className = 'h-full bg-gradient-to-r from-[#4169FF] to-[#287BFF] transition-all duration-75 rounded-full';
      }
    }
  }

  updateCurrentNumberUI() {
    const numEl = document.getElementById('countdown-current-number');
    const instructionEl = document.getElementById('countdown-subtraction-instruction');

    if (numEl) {
      numEl.innerText = this.currentNumber;
    }
    if (instructionEl) {
      instructionEl.innerText = `Subtract ${this.subtractionGap} (−${this.subtractionGap})`;
    }
  }

  updateHUD() {
    // Score
    const scoreEl = document.getElementById('countdown-hud-score');
    if (scoreEl) scoreEl.innerText = this.score.toLocaleString();

    // Correct Answers
    const correctEl = document.getElementById('countdown-hud-correct');
    if (correctEl) correctEl.innerText = this.correctAnswers;

    // Streak
    const streakEl = document.getElementById('countdown-hud-streak');
    if (streakEl) {
      streakEl.innerText = `x${this.streak}`;
      if (this.streak >= 5) {
        streakEl.className = 'font-mono text-xs font-bold text-[#48D6A0] animate-pulse';
      } else {
        streakEl.className = 'font-mono text-xs font-bold text-[#F5F5FF]';
      }
    }

    // Mistake Indicators (Accessible 3 indicators with symbols and numbers)
    const mistakesContainer = document.getElementById('countdown-mistakes-container');
    if (mistakesContainer) {
      mistakesContainer.innerHTML = '';
      for (let i = 1; i <= this.maxMistakes; i++) {
        const slot = document.createElement('span');
        if (i <= this.mistakes) {
          slot.className = 'inline-flex items-center justify-center w-7 h-6 rounded-md bg-rose-950/60 border border-rose-500/60 text-xs font-mono font-black text-[#FF7185] shadow-[0_0_8px_rgba(255,113,133,0.3)]';
          slot.innerHTML = '✕';
          slot.title = `Mistake ${i} of ${this.maxMistakes}`;
        } else {
          slot.className = 'inline-flex items-center justify-center w-7 h-6 rounded-md bg-[#191B2D] border border-[#34364A] text-[11px] font-mono text-[#858AA5]';
          slot.innerHTML = `${i}`;
          slot.title = `Attempt slot ${i}`;
        }
        mistakesContainer.appendChild(slot);
      }
    }
  }

  showFeedback(message, type = 'success') {
    const feed = document.getElementById('countdown-feedback');
    if (!feed) return;

    feed.innerText = message;
    feed.classList.remove('hidden', 'text-[#48D6A0]', 'text-[#FF7185]', 'text-[#F4C66A]');

    if (type === 'success') {
      feed.classList.add('text-[#48D6A0]');
    } else if (type === 'error') {
      feed.classList.add('text-[#FF7185]');
    } else {
      feed.classList.add('text-[#F4C66A]');
    }
  }

  clearFeedback() {
    const feed = document.getElementById('countdown-feedback');
    if (feed) {
      feed.innerText = '';
      feed.classList.add('hidden');
    }
  }

  // --- Submission Handling ---
  submitAnswer() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || this.isCompleted || this.isProcessingAttempt) return;

    const input = document.getElementById('countdown-answer-input');
    if (!input) return;

    const rawVal = input.value.trim();
    if (!rawVal) return;

    const userVal = parseInt(rawVal, 10);
    if (isNaN(userVal)) return;

    // Lock attempt to prevent double processing
    this.isProcessingAttempt = true;
    this.clearTimer();

    const expected = this.currentNumber - this.subtractionGap;

    if (userVal === expected) {
      this.handleCorrect(userVal, this.remainingMs);
    } else {
      this.handleIncorrect(userVal, expected);
    }
  }

  handleCorrect(answer, remainingMs) {
    // 1. Award base 10 points
    let pointsEarned = 10;

    // 2. Quick-answer bonus 0–5 points
    const quickBonus = Math.min(5, Math.max(0, Math.floor(remainingMs / 1000)));
    pointsEarned += quickBonus;

    // 3. Update state
    this.currentNumber = answer;
    this.correctAnswers++;
    this.streak++;
    if (this.streak > this.bestStreak) {
      this.bestStreak = this.streak;
    }

    // 4. Streak bonus: +5 points on every 5th consecutive correct answer
    let streakBonus = 0;
    if (this.streak > 0 && this.streak % 5 === 0) {
      streakBonus = 5;
      pointsEarned += streakBonus;
    }

    this.score += pointsEarned;

    // Sound effect
    if (window.soundFx) {
      if (streakBonus > 0) {
        window.soundFx.playCorrect();
      } else {
        window.soundFx.playTileTap(this.streak);
      }
    }

    // Visual feedback
    let feedbackMsg = `+${pointsEarned} pts`;
    if (quickBonus > 0) feedbackMsg += ` (⚡ +${quickBonus} speed)`;
    if (streakBonus > 0) feedbackMsg += ` (🔥 +5 streak bonus)`;
    this.showFeedback(feedbackMsg, 'success');

    this.updateHUD();
    this.updateCurrentNumberUI();

    // Subtle number card flash
    const card = document.getElementById('countdown-number-card');
    if (card) {
      card.classList.remove('countdown-flash-success');
      void card.offsetWidth;
      card.classList.add('countdown-flash-success');
      setTimeout(() => card.classList.remove('countdown-flash-success'), 300);
    }

    // 5. Zero-crossing completion rule evaluation:
    // Game completes when the NEXT subtraction would reach or cross zero!
    // currentNumber - subtractionGap <= 0
    if (this.currentNumber - this.subtractionGap <= 0) {
      this.handleChallengeCompleted();
      return;
    }

    // Otherwise, calculate next expected answer and start next attempt with fresh 5s timer
    this.expectedAnswer = this.currentNumber - this.subtractionGap;
    setTimeout(() => {
      this.clearFeedback();
      this.startAttempt();
    }, 350);
  }

  handleIncorrect(userVal, expected) {
    this.mistakes++;
    this.streak = 0;

    // SFX
    if (window.soundFx) {
      window.soundFx.playError();
    }

    this.showFeedback(`Incorrect: entered ${userVal}, expected ${expected}`, 'error');
    this.updateHUD();

    // Visual card shake
    const card = document.getElementById('countdown-number-card');
    if (card) {
      card.classList.remove('donttap-screen-shake');
      void card.offsetWidth;
      card.classList.add('donttap-screen-shake');
      setTimeout(() => card.classList.remove('donttap-screen-shake'), 400);
    }

    // Check if 3 mistakes reached
    if (this.mistakes >= this.maxMistakes) {
      this.handleGameOver();
      return;
    }

    // Otherwise fresh 5-second attempt on the SAME current number
    setTimeout(() => {
      this.clearFeedback();
      this.startAttempt();
    }, 800);
  }

  handleTimeout() {
    this.isProcessingAttempt = true;
    this.mistakes++;
    this.streak = 0;

    const expected = this.currentNumber - this.subtractionGap;

    if (window.soundFx) {
      window.soundFx.playError();
    }

    this.showFeedback(`Time's up! Expected ${expected}`, 'error');
    this.updateHUD();

    const card = document.getElementById('countdown-number-card');
    if (card) {
      card.classList.remove('donttap-screen-shake');
      void card.offsetWidth;
      card.classList.add('donttap-screen-shake');
      setTimeout(() => card.classList.remove('donttap-screen-shake'), 400);
    }

    if (this.mistakes >= this.maxMistakes) {
      this.handleGameOver();
      return;
    }

    setTimeout(() => {
      this.clearFeedback();
      this.startAttempt();
    }, 800);
  }

  // --- End States ---
  handleChallengeCompleted() {
    this.isPlaying = false;
    this.isCompleted = true;
    this.clearTimer();

    const isNewBest = this.saveBestScore();

    if (window.soundFx) {
      window.soundFx.playVictory();
    }
    if (this.app && typeof this.app.triggerConfetti === 'function') {
      this.app.triggerConfetti();
    }

    // Populate Completed Modal
    const modal = document.getElementById('modal-countdown-complete');
    const finalScore = document.getElementById('countdown-complete-score');
    const correctCount = document.getElementById('countdown-complete-correct');
    const bestStreak = document.getElementById('countdown-complete-streak');
    const mistakesCount = document.getElementById('countdown-complete-mistakes');
    const newBestBadge = document.getElementById('countdown-complete-new-best');

    if (finalScore) finalScore.innerText = this.score.toLocaleString();
    if (correctCount) correctCount.innerText = this.correctAnswers;
    if (bestStreak) bestStreak.innerText = `x${this.bestStreak}`;
    if (mistakesCount) mistakesCount.innerText = `${this.mistakes} / ${this.maxMistakes}`;
    if (newBestBadge) newBestBadge.classList.toggle('hidden', !isNewBest);

    if (this.app) {
      this.app.openModal('modal-countdown-complete');
    }
  }

  handleGameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.clearTimer();

    const isNewBest = this.saveBestScore();

    // Populate Game Over Modal
    const finalScore = document.getElementById('countdown-gameover-score');
    const correctCount = document.getElementById('countdown-gameover-correct');
    const bestStreak = document.getElementById('countdown-gameover-streak');
    const newBestBadge = document.getElementById('countdown-gameover-new-best');

    if (finalScore) finalScore.innerText = this.score.toLocaleString();
    if (correctCount) correctCount.innerText = this.correctAnswers;
    if (bestStreak) bestStreak.innerText = `x${this.bestStreak}`;
    if (newBestBadge) newBestBadge.classList.toggle('hidden', !isNewBest);

    if (this.app) {
      this.app.openModal('modal-countdown-gameover');
    }
  }

  // --- Pause & Resume ---
  togglePause() {
    if (!this.isPlaying || this.isGameOver || this.isCompleted) return;

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.clearTimer();

    // Freeze inputs
    const input = document.getElementById('countdown-answer-input');
    if (input) input.disabled = true;

    // Populate Pause Modal
    const pauseScore = document.getElementById('countdown-pause-score');
    const pauseStreak = document.getElementById('countdown-pause-streak');
    if (pauseScore) pauseScore.innerText = this.score.toLocaleString();
    if (pauseStreak) pauseStreak.innerText = `x${this.streak}`;

    if (this.app) {
      this.app.openModal('modal-countdown-pause');
    }
  }

  resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;

    if (this.app) {
      this.app.closeModal('modal-countdown-pause');
    }

    const input = document.getElementById('countdown-answer-input');
    if (input) {
      input.disabled = false;
      input.focus();
    }

    // Resume from remaining time
    this.attemptStartTime = Date.now() - (this.attemptDuration - this.remainingMs);

    this.timerInterval = setInterval(() => {
      if (this.isPaused || !this.isPlaying || this.isProcessingAttempt) return;

      const elapsed = Date.now() - this.attemptStartTime;
      this.remainingMs = Math.max(0, this.attemptDuration - elapsed);

      this.updateTimerUI(this.remainingMs);

      if (this.remainingMs <= 0) {
        this.clearTimer();
        this.handleTimeout();
      }
    }, 50);
  }

  restartGame() {
    if (this.app) {
      this.app.closeModal('modal-countdown-pause');
      this.app.closeModal('modal-countdown-complete');
      this.app.closeModal('modal-countdown-gameover');
    }
    this.startGame();
  }

  backToSetup() {
    if (this.app) {
      this.app.closeModal('modal-countdown-pause');
      this.app.closeModal('modal-countdown-complete');
      this.app.closeModal('modal-countdown-gameover');
    }
    this.initSetupScreen();
  }

  exitToMenu() {
    this.clearTimer();
    this.isPlaying = false;
    this.isPaused = false;
    this.saveBestScore();

    if (this.app) {
      this.app.closeModal('modal-countdown-pause');
      this.app.closeModal('modal-countdown-complete');
      this.app.closeModal('modal-countdown-gameover');
      this.app.showScreen('menu');
      this.app.updateCountdownMenuCard();
    }
  }
}

window.CountdownCalculationGame = CountdownCalculationGame;
