// Game Settings & Level Selection Manager (Difficulty & Progressive Levels System)
// Implements Image 1 (Settings Difficulty Popup) & Image 2 (Level Grid with Stars & Padlocks)
class GameSettingsManager {
  constructor(app) {
    this.app = app;
    this.activeGameId = 'speed_grid';
    this.activeDifficulty = 'easy'; // 'easy' | 'medium' | 'hard'

    this.gameConfigs = {
      speed_grid: {
        id: 'speed_grid',
        slug: 'speed-matrix',
        name: 'Speed Matrix',
        subtitle: 'Sequential Deduction',
        themeColor: '#22C55E',
        accentColor: '#10B981',
        icon: 'zap',
        totalLevels: 10
      },
      dont_tap: {
        id: 'dont_tap',
        slug: 'dont-tap',
        name: "Don't Tap!",
        subtitle: 'Reflex & Inhibitory Control',
        themeColor: '#287BFF',
        accentColor: '#4169FF',
        icon: 'alert-triangle',
        totalLevels: 10
      },
      shell_shuffle: {
        id: 'shell_shuffle',
        slug: 'shell-shuffle',
        name: 'Shell Shuffle 3D',
        subtitle: 'Visual Tracking',
        themeColor: '#F59E0B',
        accentColor: '#D97706',
        icon: 'eye',
        totalLevels: 10
      },
      number_path: {
        id: 'number_path',
        slug: 'number-path',
        name: 'Number Path (Zip)',
        subtitle: '7x7 Sequential Path',
        themeColor: '#FB923C',
        accentColor: '#EA580C',
        icon: 'route',
        totalLevels: 10
      },
      sudoku: {
        id: 'sudoku',
        slug: 'sudoku',
        name: 'Sudoku Classic',
        subtitle: '9x9 Logic Number Grid',
        themeColor: '#8B5CF6',
        accentColor: '#7C3AED',
        icon: 'grid',
        totalLevels: 10
      }
    };
  }

  // --- Storage & Progress Persistence ---
  getStorageKey(gameId) {
    return `numberverse_v2_prog_${gameId}`;
  }

  getAllProgress(gameId) {
    try {
      const raw = localStorage.getItem(this.getStorageKey(gameId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}

    return {
      easy: { unlocked: 1, completed: {} },
      medium: { unlocked: 1, completed: {} },
      hard: { unlocked: 1, completed: {} }
    };
  }

  saveAllProgress(gameId, data) {
    try {
      localStorage.setItem(this.getStorageKey(gameId), JSON.stringify(data));
    } catch (e) {}
  }

  getDifficultyProgress(gameId, difficulty = 'easy') {
    const all = this.getAllProgress(gameId);
    if (!all[difficulty]) {
      all[difficulty] = { unlocked: 1, completed: {} };
    }
    return all[difficulty];
  }

  isLevelUnlocked(gameId, difficulty, level) {
    if (level === 1) return true;
    const prog = this.getDifficultyProgress(gameId, difficulty);
    return level <= prog.unlocked || (prog.completed && prog.completed[level] !== undefined);
  }

  isLevelCompleted(gameId, difficulty, level) {
    const prog = this.getDifficultyProgress(gameId, difficulty);
    return prog.completed && prog.completed[level] !== undefined;
  }

  getLevelStars(gameId, difficulty, level) {
    const prog = this.getDifficultyProgress(gameId, difficulty);
    if (prog.completed && prog.completed[level]) {
      return prog.completed[level].stars || 3;
    }
    return 0;
  }

  getTotalStars(gameId, difficulty) {
    const prog = this.getDifficultyProgress(gameId, difficulty);
    let stars = 0;
    if (prog.completed) {
      Object.values(prog.completed).forEach(item => {
        stars += item.stars || 3;
      });
    }
    return stars;
  }

  markLevelCompleted(gameId, difficulty, level, stars = 3, scoreOrTime = null) {
    const all = this.getAllProgress(gameId);
    if (!all[difficulty]) {
      all[difficulty] = { unlocked: 1, completed: {} };
    }
    if (!all[difficulty].completed) {
      all[difficulty].completed = {};
    }

    all[difficulty].completed[level] = {
      stars,
      record: scoreOrTime,
      timestamp: Date.now()
    };

    if (level >= all[difficulty].unlocked && level < 10) {
      all[difficulty].unlocked = level + 1;
    }

    this.saveAllProgress(gameId, all);

    // Update main menu card badges
    this.updateAppMenuCards(gameId);
  }

  updateAppMenuCards(gameId) {
    if (!this.app) return;
    if (gameId === 'speed_grid' && typeof this.app.updateMatrixMenuCard === 'function') {
      this.app.updateMatrixMenuCard();
    } else if (gameId === 'dont_tap' && typeof this.app.updateDontTapMenuCard === 'function') {
      this.app.updateDontTapMenuCard();
    } else if (gameId === 'shell_shuffle' && typeof this.app.updateShellShuffleMenuCard === 'function') {
      this.app.updateShellShuffleMenuCard();
    } else if (gameId === 'number_path' && typeof this.app.updateNumberPathMenuCard === 'function') {
      this.app.updateNumberPathMenuCard();
    } else if (gameId === 'sudoku' && typeof this.app.updateSudokuMenuCard === 'function') {
      this.app.updateSudokuMenuCard();
    }
  }

  // --- Slug & ID Helpers ---
  getGameConfigBySlug(slug) {
    const clean = slug.toLowerCase().replace(/\/+$/, '');
    return Object.values(this.gameConfigs).find(cfg => cfg.slug === clean);
  }

  getGameConfigById(id) {
    return this.gameConfigs[id] || this.gameConfigs.speed_grid;
  }

  // --- View Rendering ---

  // Renders the Difficulty Selector Box (matching Image 1)
  openSettings(gameId, updateHistory = true) {
    const cfg = this.getGameConfigById(gameId);
    this.activeGameId = cfg.id;

    const screenEl = document.getElementById('screen-settings') || document.getElementById('screen-game-settings');
    if (!screenEl) return;

    // Title & subtitle
    const titleEl = document.getElementById('nv-settings-game-title');
    const subtitleEl = document.getElementById('nv-settings-game-subtitle');
    if (titleEl) titleEl.innerText = cfg.name;
    if (subtitleEl) subtitleEl.innerText = cfg.subtitle;

    // Difficulty stars summary
    ['easy', 'medium', 'hard'].forEach(diff => {
      const stars = this.getTotalStars(cfg.id, diff);
      const starEl = document.getElementById(`nv-settings-stars-${diff}`);
      if (starEl) starEl.innerText = `${stars} / 30 ★`;
    });

    this.app.showScreen('settings', false);

    if (updateHistory) {
      const targetUrl = `/${cfg.slug}/settings/`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ screen: 'settings', gameId: cfg.id }, '', targetUrl);
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  selectDifficulty(diff, updateHistory = true) {
    if (window.soundFx) window.soundFx.playClick();
    this.activeDifficulty = diff;
    this.openLevels(this.activeGameId, diff, updateHistory);
  }

  // Renders the Level Grid Frame (matching Image 2)
  openLevels(gameId, difficulty = this.activeDifficulty, updateHistory = true) {
    const cfg = this.getGameConfigById(gameId);
    this.activeGameId = cfg.id;
    this.activeDifficulty = difficulty;

    const screenEl = document.getElementById('screen-levels') || document.getElementById('screen-game-levels');
    if (!screenEl) return;

    // Game name & difficulty header
    const titleEl = document.getElementById('nv-levels-game-title');
    if (titleEl) titleEl.innerText = cfg.name;

    // Difficulty Tabs
    ['easy', 'medium', 'hard'].forEach(diff => {
      const tabBtn = document.getElementById(`nv-level-tab-${diff}`);
      if (tabBtn) {
        const isActive = diff === this.activeDifficulty;
        tabBtn.classList.toggle('nv-tab-active', isActive);
        tabBtn.classList.toggle('nv-tab-inactive', !isActive);
      }
    });

    // Stars summary
    const totalStars = this.getTotalStars(cfg.id, this.activeDifficulty);
    const summaryEl = document.getElementById('nv-levels-stars-summary');
    if (summaryEl) summaryEl.innerText = `⭐ ${totalStars} / 30 Stars`;

    // Render 10 Level Cards
    const gridEl = document.getElementById('nv-levels-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      const prog = this.getDifficultyProgress(cfg.id, this.activeDifficulty);
      const unlockedLvl = prog.unlocked || 1;

      for (let lvl = 1; lvl <= 10; lvl++) {
        const isCompleted = this.isLevelCompleted(cfg.id, this.activeDifficulty, lvl);
        const isUnlocked = this.isLevelUnlocked(cfg.id, this.activeDifficulty, lvl);
        const isOngoing = isUnlocked && !isCompleted && (lvl === unlockedLvl);

        const card = document.createElement('div');
        card.className = `nv-level-card relative flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer transition select-none ${
          isCompleted
            ? 'nv-card-completed'
            : isOngoing
            ? 'nv-card-ongoing ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
            : isUnlocked
            ? 'nv-card-unlocked'
            : 'nv-card-locked cursor-not-allowed opacity-60'
        }`;

        // Stars row at top
        const starsRow = document.createElement('div');
        starsRow.className = 'flex items-center gap-0.5 mt-0.5';
        if (isCompleted) {
          starsRow.innerHTML = `
            <span class="text-amber-400 text-xs">★</span>
            <span class="text-amber-400 text-sm">★</span>
            <span class="text-amber-400 text-xs">★</span>
          `;
        } else {
          starsRow.innerHTML = `
            <span class="text-slate-600 text-xs">★</span>
            <span class="text-slate-600 text-sm">★</span>
            <span class="text-slate-600 text-xs">★</span>
          `;
        }
        card.appendChild(starsRow);

        // Level Number in Center
        const numEl = document.createElement('div');
        numEl.className = 'text-xl sm:text-2xl font-black font-mono tracking-tight my-auto text-amber-100 drop-shadow';
        numEl.innerText = lvl;
        card.appendChild(numEl);

        // Status indicator at bottom
        const bottomStatus = document.createElement('div');
        bottomStatus.className = 'w-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider mb-0.5';
        if (isCompleted) {
          bottomStatus.innerHTML = '<span class="text-emerald-400">DONE</span>';
        } else if (isOngoing) {
          bottomStatus.innerHTML = '<span class="text-amber-300 animate-pulse">PLAY</span>';
        } else if (isUnlocked) {
          bottomStatus.innerHTML = '<span class="text-amber-300 font-semibold">OPEN</span>';
        } else {
          // Lock icon in bottom right (matching Image 2)
          bottomStatus.innerHTML = '<i data-lucide="lock" class="w-3.5 h-3.5 text-slate-500 ml-auto mr-1"></i>';
        }
        card.appendChild(bottomStatus);

        // Click Handler
        card.onclick = () => {
          if (isUnlocked) {
            if (window.soundFx) window.soundFx.playClick();
            this.startLevel(cfg.id, this.activeDifficulty, lvl);
          } else {
            if (window.soundFx) window.soundFx.playTick();
            card.classList.add('animate-shake');
            setTimeout(() => card.classList.remove('animate-shake'), 400);
            if (this.app && typeof this.app.showToast === 'function') {
              this.app.showToast(`🔒 Level ${lvl} is locked! Clear Level ${lvl - 1} first.`, 'error');
            }
          }
        };

        gridEl.appendChild(card);
      }
    }

    this.app.showScreen('levels', false);

    if (updateHistory) {
      const targetUrl = `/${cfg.slug}/settings/levels/`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ screen: 'levels', gameId: cfg.id, difficulty: this.activeDifficulty }, '', targetUrl);
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Starts the game directly on the chosen difficulty and level
  startLevel(gameId, difficulty, level, updateHistory = true) {
    const cfg = this.getGameConfigById(gameId);
    this.activeGameId = cfg.id;
    this.activeDifficulty = difficulty;
    const cleanLvl = Math.max(1, Math.min(10, parseInt(level, 10) || 1));

    // Launch game with difficulty and level parameters
    if (cfg.id === 'speed_grid') {
      if (!this.app.matrixGame && window.SpeedMatrixGame) {
        this.app.matrixGame = new window.SpeedMatrixGame(this.app);
      }
      this.app.showScreen('matrix', false);
      if (this.app.matrixGame) {
        this.app.matrixGame.startLevel(cleanLvl, difficulty);
      }
    } else if (cfg.id === 'dont_tap') {
      if (!this.app.dontTapGame && window.DontTapGame) {
        this.app.dontTapGame = new window.DontTapGame(this.app);
      }
      this.app.showScreen('donttap', false);
      if (this.app.dontTapGame) {
        this.app.dontTapGame.startLevel(cleanLvl, difficulty);
      }
    } else if (cfg.id === 'shell_shuffle') {
      if (!this.app.shellShuffleGame && window.ShellShuffleGame) {
        this.app.shellShuffleGame = new window.ShellShuffleGame(this.app);
      }
      this.app.showScreen('shellshuffle', false);
      if (this.app.shellShuffleGame) {
        this.app.shellShuffleGame.startLevel(cleanLvl, difficulty);
      }
    } else if (cfg.id === 'number_path') {
      if (!this.app.numberPathGame && window.NumberPathGame) {
        this.app.numberPathGame = new window.NumberPathGame(this.app);
      }
      this.app.showScreen('numberpath', false);
      if (this.app.numberPathGame) {
        this.app.numberPathGame.startLevel(cleanLvl, difficulty);
      }
    } else if (cfg.id === 'sudoku') {
      if (!this.app.sudokuGame && window.SudokuGame) {
        this.app.sudokuGame = new window.SudokuGame(this.app);
      }
      this.app.showScreen('sudoku', false);
      if (this.app.sudokuGame) {
        this.app.sudokuGame.startLevel(cleanLvl, difficulty);
      }
    }

    if (updateHistory) {
      const targetUrl = `/${cfg.slug}/settings/level/${encodeURIComponent(difficulty)}/?level=${cleanLvl}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ screen: 'game_play', gameId: cfg.id, difficulty, level: cleanLvl }, '', targetUrl);
      }
    }
  }

  // Returns to the Level Select screen from within an active game
  exitGameToLevels(gameId = this.activeGameId) {
    this.openLevels(gameId, this.activeDifficulty, true);
  }

  // Returns to Settings screen
  exitLevelsToSettings(gameId = this.activeGameId) {
    this.openSettings(gameId, true);
  }

  // --- Progress Reset Management ---
  confirmResetDifficulty() {
    const cfg = this.getGameConfigById(this.activeGameId);
    const infoEl = document.getElementById('reset-modal-game-info');
    if (infoEl) {
      infoEl.innerText = `${cfg.name} • ${(this.activeDifficulty || 'easy').toUpperCase()}`;
    }
    if (this.app) {
      this.app.openModal('modal-reset-progress');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  executeResetDifficulty() {
    if (this.app) {
      this.app.closeModal('modal-reset-progress');
    }
    this.resetDifficultyProgress(this.activeGameId, this.activeDifficulty);
  }

  executeResetAllDifficulties() {
    if (this.app) {
      this.app.closeModal('modal-reset-progress');
    }
    this.resetAllProgressForGame(this.activeGameId);
  }

  resetDifficultyProgress(gameId = this.activeGameId, difficulty = this.activeDifficulty) {
    const all = this.getAllProgress(gameId);
    all[difficulty] = { unlocked: 1, completed: {} };
    this.saveAllProgress(gameId, all);

    // Clear legacy game-specific single-level keys
    try {
      if (gameId === 'shell_shuffle') {
        localStorage.setItem('numberverse_shellshuffle_saved_level', '1');
      } else if (gameId === 'number_path') {
        localStorage.setItem('numberverse_numberpath_level', '1');
      }
    } catch (e) {}

    this.updateAppMenuCards(gameId);
    this.openLevels(gameId, difficulty, false);

    const cfg = this.getGameConfigById(gameId);
    if (this.app && typeof this.app.showToast === 'function') {
      this.app.showToast(`✨ ${cfg.name} (${difficulty.toUpperCase()}) reset! Ready to play Level 1.`, 'success');
    }
    if (window.soundFx) window.soundFx.playClick();
  }

  resetAllProgressForGame(gameId = this.activeGameId) {
    const all = {
      easy: { unlocked: 1, completed: {} },
      medium: { unlocked: 1, completed: {} },
      hard: { unlocked: 1, completed: {} }
    };
    this.saveAllProgress(gameId, all);

    try {
      if (gameId === 'shell_shuffle') {
        localStorage.setItem('numberverse_shellshuffle_saved_level', '1');
        localStorage.removeItem('numberverse_shellshuffle_best_level');
      } else if (gameId === 'number_path') {
        localStorage.setItem('numberverse_numberpath_level', '1');
      }
    } catch (e) {}

    this.updateAppMenuCards(gameId);
    this.openLevels(gameId, this.activeDifficulty, false);

    const cfg = this.getGameConfigById(gameId);
    if (this.app && typeof this.app.showToast === 'function') {
      this.app.showToast(`✨ All difficulties reset for ${cfg.name}!`, 'success');
    }
    if (window.soundFx) window.soundFx.playClick();
  }
}

if (typeof window !== 'undefined') {
  window.GameSettingsManager = GameSettingsManager;
}
