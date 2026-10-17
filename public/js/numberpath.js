// Number Path (Cognitive Sequential Path Puzzle inspired by LinkedIn Zip)
// Connect numbers 1 to N in sequence on a 7x7 grid (49 squares), visiting every single cell with zero gaps.
class NumberPathGame {
  constructor(app) {
    this.app = app;
    this.storageKey = 'numberverse_numberpath_level';
    this.bestTimesKey = 'numberverse_numberpath_best_times';
    this.maxLevel = 10;
    this.level = this.getSavedLevel();

    // Board & Path State (Strictly 7x7 grid = 49 cells across all levels)
    this.rows = 7;
    this.cols = 7;
    this.checkpoints = []; // Array of { number: 1..K, r, c, stepIndex }
    this.visitedPath = []; // Array of { r, c }
    this.isDragging = false;
    this.isCompleted = false;
    this.errorTimeout = null;

    // Stopwatch Timer
    this.timerInterval = null;
    this.secondsElapsed = 0;

    // 10 Mathematically Verified 7x7 Hamiltonian Levels
    this.levelConfigs = [
  {
    "level": 1,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        0,
        2
      ],
      [
        0,
        3
      ],
      [
        0,
        4
      ],
      [
        0,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        5,
        1
      ],
      [
        5,
        2
      ],
      [
        5,
        3
      ],
      [
        5,
        4
      ],
      [
        5,
        5
      ],
      [
        4,
        5
      ],
      [
        4,
        4
      ],
      [
        4,
        3
      ],
      [
        4,
        2
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        3,
        3
      ],
      [
        3,
        4
      ],
      [
        3,
        5
      ],
      [
        2,
        5
      ],
      [
        1,
        5
      ],
      [
        1,
        4
      ],
      [
        2,
        4
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        1,
        1
      ]
    ],
    "checkpointSteps": [
      0,
      4,
      7,
      11,
      15,
      18,
      22,
      26,
      30,
      33,
      37,
      41,
      44,
      48
    ]
  },
  {
    "level": 2,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        6,
        0
      ],
      [
        6,
        1
      ],
      [
        6,
        2
      ],
      [
        6,
        3
      ],
      [
        6,
        4
      ],
      [
        6,
        5
      ],
      [
        6,
        6
      ],
      [
        5,
        6
      ],
      [
        4,
        6
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        1,
        6
      ],
      [
        0,
        6
      ],
      [
        0,
        5
      ],
      [
        1,
        5
      ],
      [
        2,
        5
      ],
      [
        3,
        5
      ],
      [
        4,
        5
      ],
      [
        5,
        5
      ],
      [
        5,
        4
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        2
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        1,
        2
      ],
      [
        0,
        2
      ],
      [
        0,
        1
      ],
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        4,
        1
      ],
      [
        5,
        1
      ],
      [
        5,
        0
      ],
      [
        4,
        0
      ]
    ],
    "checkpointSteps": [
      0,
      4,
      9,
      13,
      17,
      22,
      26,
      31,
      35,
      39,
      44,
      48
    ]
  },
  {
    "level": 3,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        3,
        3
      ],
      [
        3,
        2
      ],
      [
        3,
        1
      ],
      [
        2,
        1
      ],
      [
        1,
        1
      ],
      [
        1,
        2
      ],
      [
        1,
        3
      ],
      [
        1,
        4
      ],
      [
        1,
        5
      ],
      [
        2,
        5
      ],
      [
        3,
        5
      ],
      [
        4,
        5
      ],
      [
        5,
        5
      ],
      [
        5,
        4
      ],
      [
        5,
        3
      ],
      [
        5,
        2
      ],
      [
        5,
        1
      ],
      [
        5,
        0
      ],
      [
        6,
        0
      ],
      [
        6,
        1
      ],
      [
        6,
        2
      ],
      [
        6,
        3
      ],
      [
        6,
        4
      ],
      [
        6,
        5
      ],
      [
        6,
        6
      ],
      [
        5,
        6
      ],
      [
        4,
        6
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        1,
        6
      ],
      [
        0,
        6
      ],
      [
        0,
        5
      ],
      [
        0,
        4
      ],
      [
        0,
        3
      ],
      [
        0,
        2
      ],
      [
        0,
        1
      ],
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ],
      [
        3,
        0
      ],
      [
        4,
        0
      ],
      [
        4,
        1
      ],
      [
        4,
        2
      ],
      [
        4,
        3
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        2,
        3
      ],
      [
        2,
        2
      ]
    ],
    "checkpointSteps": [
      0,
      4,
      12,
      18,
      24,
      30,
      36,
      44,
      48
    ]
  },
  {
    "level": 4,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        5,
        5
      ],
      [
        4,
        5
      ],
      [
        3,
        5
      ],
      [
        2,
        5
      ],
      [
        1,
        5
      ],
      [
        0,
        5
      ],
      [
        0,
        4
      ],
      [
        1,
        4
      ],
      [
        2,
        4
      ],
      [
        3,
        4
      ],
      [
        4,
        4
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        5,
        3
      ],
      [
        4,
        3
      ],
      [
        3,
        3
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        0,
        3
      ],
      [
        0,
        2
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        5,
        1
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        1,
        1
      ]
    ],
    "checkpointSteps": [
      0,
      6,
      12,
      18,
      24,
      30,
      36,
      42,
      48
    ]
  },
  {
    "level": 5,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        3,
        1
      ],
      [
        4,
        1
      ],
      [
        5,
        1
      ],
      [
        5,
        2
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        1,
        2
      ],
      [
        0,
        2
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        4
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        0,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        1,
        5
      ],
      [
        2,
        5
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        3,
        5
      ],
      [
        4,
        5
      ],
      [
        5,
        5
      ],
      [
        5,
        6
      ],
      [
        4,
        6
      ]
    ],
    "checkpointSteps": [
      0,
      7,
      14,
      21,
      27,
      34,
      41,
      48
    ]
  },
  {
    "level": 6,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        2,
        2
      ],
      [
        2,
        3
      ],
      [
        2,
        4
      ],
      [
        2,
        5
      ],
      [
        2,
        6
      ],
      [
        1,
        6
      ],
      [
        0,
        6
      ],
      [
        0,
        5
      ],
      [
        1,
        5
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        1,
        2
      ],
      [
        0,
        2
      ],
      [
        0,
        1
      ],
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        3,
        3
      ],
      [
        3,
        4
      ],
      [
        3,
        5
      ],
      [
        3,
        6
      ],
      [
        4,
        6
      ],
      [
        4,
        5
      ],
      [
        4,
        4
      ],
      [
        4,
        3
      ],
      [
        4,
        2
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        5,
        0
      ],
      [
        6,
        0
      ],
      [
        6,
        1
      ],
      [
        5,
        1
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        6,
        5
      ],
      [
        6,
        6
      ],
      [
        5,
        6
      ],
      [
        5,
        5
      ]
    ],
    "checkpointSteps": [
      0,
      8,
      16,
      24,
      32,
      40,
      48
    ]
  },
  {
    "level": 7,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        4,
        2
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        0,
        2
      ],
      [
        0,
        3
      ],
      [
        0,
        4
      ],
      [
        0,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        1,
        5
      ],
      [
        1,
        4
      ],
      [
        1,
        3
      ],
      [
        1,
        2
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        2,
        3
      ],
      [
        2,
        4
      ],
      [
        2,
        5
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        3,
        5
      ],
      [
        3,
        4
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        4,
        4
      ],
      [
        4,
        5
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        5,
        5
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        5,
        1
      ]
    ],
    "checkpointSteps": [
      0,
      10,
      19,
      29,
      38,
      48
    ]
  },
  {
    "level": 8,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        0,
        2
      ],
      [
        0,
        3
      ],
      [
        0,
        4
      ],
      [
        0,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        5,
        1
      ],
      [
        5,
        2
      ],
      [
        5,
        3
      ],
      [
        5,
        4
      ],
      [
        5,
        5
      ],
      [
        4,
        5
      ],
      [
        4,
        4
      ],
      [
        4,
        3
      ],
      [
        4,
        2
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        3,
        3
      ],
      [
        3,
        4
      ],
      [
        3,
        5
      ],
      [
        2,
        5
      ],
      [
        1,
        5
      ],
      [
        1,
        4
      ],
      [
        2,
        4
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        1,
        1
      ],
      [
        0,
        1
      ],
      [
        0,
        0
      ]
    ],
    "checkpointSteps": [
      0,
      10,
      19,
      29,
      38,
      48
    ]
  },
  {
    "level": 9,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        3,
        1
      ],
      [
        3,
        0
      ],
      [
        4,
        0
      ],
      [
        5,
        0
      ],
      [
        6,
        0
      ],
      [
        6,
        1
      ],
      [
        5,
        1
      ],
      [
        4,
        1
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        1,
        2
      ],
      [
        0,
        2
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        3
      ],
      [
        6,
        4
      ],
      [
        5,
        4
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        0,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        1,
        5
      ],
      [
        2,
        5
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        3,
        5
      ],
      [
        4,
        5
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        5,
        5
      ],
      [
        6,
        5
      ],
      [
        6,
        6
      ]
    ],
    "checkpointSteps": [
      0,
      12,
      24,
      36,
      48
    ]
  },
  {
    "level": 10,
    "rows": 7,
    "cols": 7,
    "path": [
      [
        4,
        4
      ],
      [
        4,
        5
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        6,
        5
      ],
      [
        5,
        5
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        6,
        3
      ],
      [
        5,
        3
      ],
      [
        4,
        3
      ],
      [
        3,
        3
      ],
      [
        3,
        4
      ],
      [
        3,
        5
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        1,
        6
      ],
      [
        0,
        6
      ],
      [
        0,
        5
      ],
      [
        1,
        5
      ],
      [
        2,
        5
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        6,
        0
      ],
      [
        5,
        0
      ],
      [
        5,
        1
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        3,
        1
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        0,
        2
      ],
      [
        1,
        2
      ],
      [
        1,
        1
      ]
    ],
    "checkpointSteps": [
      0,
      12,
      24,
      36,
      48
    ]
  }
];

    // Global drag release handler
    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Window resize handler to realign SVG lines
    window.addEventListener('resize', () => {
      if (this.app && this.app.currentScreen === 'numberpath') {
        this.renderPath();
      }
    });
  }

  // --- Storage & Level Management ---
  getSavedLevel() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= this.maxLevel) {
          return parsed;
        }
      }
    } catch (e) {}
    return 1;
  }

  saveProgress(lvl = this.level) {
    try {
      this.level = Math.min(this.maxLevel, Math.max(1, lvl));
      localStorage.setItem(this.storageKey, this.level.toString());
      if (this.app && typeof this.app.updateNumberPathMenuCard === 'function') {
        this.app.updateNumberPathMenuCard();
      }
    } catch (e) {}
  }

  resetProgress() {
    try {
      localStorage.removeItem(this.storageKey);
      this.level = 1;
      if (this.app && typeof this.app.updateNumberPathMenuCard === 'function') {
        this.app.updateNumberPathMenuCard();
      }
    } catch (e) {}
  }

  // --- Start & Init Game ---
  startLevel(lvl = this.level) {
    this.level = Math.min(this.maxLevel, Math.max(1, lvl));
    this.saveProgress(this.level);

    const config = this.levelConfigs[this.level - 1];
    this.rows = 7;
    this.cols = 7;
    this.isCompleted = false;
    this.isDragging = false;
    this.clearError();

    // Build checkpoints: number starts from 1..K
    this.checkpoints = config.checkpointSteps.map((stepIdx, idx) => {
      const [r, c] = config.path[stepIdx];
      return {
        number: idx + 1,
        r,
        c,
        stepIndex: stepIdx
      };
    });

    // Path automatically starts anchored at Checkpoint 1
    const startCp = this.checkpoints[0];
    this.visitedPath = [{ r: startCp.r, c: startCp.c }];

    this.startTimer();
    this.renderBoard();
    this.updateHUD();
  }

  // --- Stopwatch Timer ---
  startTimer() {
    this.stopTimer();
    this.secondsElapsed = 0;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      if (!this.isCompleted) {
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
    const el = document.getElementById('numberpath-timer');
    if (!el) return;
    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;
    el.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- Error Display ---
  showError(msg) {
    const banner = document.getElementById('numberpath-error-banner');
    if (banner) {
      banner.innerText = msg;
      banner.classList.remove('hidden');
      if (this.errorTimeout) clearTimeout(this.errorTimeout);
      this.errorTimeout = setTimeout(() => {
        banner.classList.add('hidden');
      }, 3000);
    }
  }

  clearError() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
    const banner = document.getElementById('numberpath-error-banner');
    if (banner && !banner.classList.contains('hidden')) {
      banner.classList.add('hidden');
    }
  }

  // --- Board Rendering ---
  renderBoard() {
    const boardEl = document.getElementById('numberpath-grid');
    if (!boardEl) return;

    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
    boardEl.style.gridTemplateRows = 'repeat(7, minmax(0, 1fr))';

    // Render 49 cells
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = document.createElement('div');
        cell.id = `np-cell-${r}-${c}`;
        cell.className = 'np-cell relative flex items-center justify-center font-bold cursor-pointer select-none transition-colors duration-150';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Checkpoint badge: Solid black circle with white text (matching LinkedIn Zip)
        const cp = this.checkpoints.find(p => p.r === r && p.c === c);
        if (cp) {
          const badge = document.createElement('div');
          badge.className = 'np-checkpoint-badge w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow z-10 select-none';
          badge.innerText = cp.number;
          cell.appendChild(badge);
        }

        // Pointer listeners for drag and tap
        cell.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.handleCellPointerDown(r, c);
        });

        cell.addEventListener('pointerenter', (e) => {
          if (this.isDragging) {
            this.handleCellPointerEnter(r, c);
          }
        });

        boardEl.appendChild(cell);
      }
    }

    this.renderPath();
  }

  // --- Move & Drag Logic ---
  handleCellPointerDown(r, c) {
    if (this.isCompleted) return;
    this.isDragging = true;

    // If tapped on an already visited cell, backtrack / rewind to it
    const existingIdx = this.visitedPath.findIndex(p => p.r === r && p.c === c);
    if (existingIdx !== -1) {
      this.rewindTo(existingIdx);
      return;
    }

    // Check if cell is an unvisited checkpoint tapped out of sequence
    const cp = this.checkpoints.find(p => p.r === r && p.c === c);
    if (cp) {
      const collectedCount = this.getCollectedCheckpointCount();
      const expectedNumber = collectedCount + 1;
      if (cp.number !== expectedNumber) {
        if (window.soundFx) window.soundFx.playTick();
        this.flashCellInvalid(r, c);
        this.showError(`⚠️ Wrong join! You must connect to ${expectedNumber} next, not ${cp.number}.`);
        return;
      }
    }

    // Attempt to step onto cell
    this.attemptStep(r, c);
  }

  handleCellPointerEnter(r, c) {
    if (this.isCompleted) return;

    // If dragging back onto the second-to-last cell, undo last move
    if (this.visitedPath.length >= 2) {
      const prev = this.visitedPath[this.visitedPath.length - 2];
      if (prev.r === r && prev.c === c) {
        this.undo();
        return;
      }
    }

    // If dragging onto an existing cell on the path, rewind to it
    const existingIdx = this.visitedPath.findIndex(p => p.r === r && p.c === c);
    if (existingIdx !== -1) {
      this.rewindTo(existingIdx);
      return;
    }

    this.attemptStep(r, c);
  }

  attemptStep(r, c) {
    if (this.visitedPath.length === 0) return false;
    const currentTip = this.visitedPath[this.visitedPath.length - 1];

    // Must not already be visited
    if (this.visitedPath.some(p => p.r === r && p.c === c)) {
      return false;
    }

    // Check if cell is a checkpoint out of sequence (checked first so wrong join error is clear)
    const cp = this.checkpoints.find(p => p.r === r && p.c === c);
    if (cp) {
      const collectedCount = this.getCollectedCheckpointCount();
      const expectedNumber = collectedCount + 1;

      // Must reach checkpoints strictly in sequential order (1 -> 2 -> 3 -> ...)
      if (cp.number !== expectedNumber) {
        if (window.soundFx) window.soundFx.playTick();
        this.flashCellInvalid(r, c);
        this.showError(`⚠️ Wrong join! You must connect to ${expectedNumber} next, not ${cp.number}.`);
        return false;
      }
    }

    // Must be adjacent (up, down, left, right)
    const dr = Math.abs(r - currentTip.r);
    const dc = Math.abs(c - currentTip.c);
    if (dr + dc !== 1) {
      this.showError('⚠️ Step must connect to an adjacent square (up, down, left, right).');
      return false;
    }

    // Valid step!
    this.clearError();
    this.visitedPath.push({ r, c });
    if (window.soundFx) window.soundFx.playTick();

    this.renderPath();
    this.updateHUD();
    this.checkWinCondition();
    return true;
  }

  getCollectedCheckpointCount() {
    let count = 0;
    this.checkpoints.forEach(cp => {
      if (this.visitedPath.some(p => p.r === cp.r && p.c === cp.c)) {
        count++;
      }
    });
    return count;
  }

  rewindTo(index) {
    if (index < 0 || index >= this.visitedPath.length) return;
    const targetLength = Math.max(1, index + 1);
    if (this.visitedPath.length === targetLength) return;

    this.visitedPath = this.visitedPath.slice(0, targetLength);
    this.clearError();
    if (window.soundFx) window.soundFx.playClick();
    this.renderPath();
    this.updateHUD();
  }

  undo() {
    if (this.visitedPath.length <= 1 || this.isCompleted) return;
    this.visitedPath.pop();
    this.clearError();
    if (window.soundFx) window.soundFx.playClick();
    this.renderPath();
    this.updateHUD();
  }

  undoStep() {
    this.undo();
  }

  resetCurrentLevel() {
    if (this.isCompleted) return;
    const startCp = this.checkpoints[0];
    this.visitedPath = [{ r: startCp.r, c: startCp.c }];
    this.clearError();
    if (window.soundFx) window.soundFx.playClick();
    this.renderPath();
    this.updateHUD();
  }

  flashCellInvalid(r, c) {
    const el = document.getElementById(`np-cell-${r}-${c}`);
    if (!el) return;
    el.classList.add('np-invalid-pulse');
    setTimeout(() => {
      el.classList.remove('np-invalid-pulse');
    }, 400);
  }

  // --- SVG Path Rendering ---
  renderPath() {
    const boardEl = document.getElementById('numberpath-grid');
    const svgEl = document.getElementById('numberpath-svg-lines');
    if (!boardEl || !svgEl) return;

    // Highlight visited cells (peach/light orange fill) and head
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = document.getElementById(`np-cell-${r}-${c}`);
        if (!cell) continue;

        const pathIndex = this.visitedPath.findIndex(p => p.r === r && p.c === c);
        const isVisited = pathIndex !== -1;
        const isHead = pathIndex === this.visitedPath.length - 1;

        cell.classList.toggle('np-cell-visited', isVisited);
        cell.classList.toggle('np-cell-head', isHead);

        const cp = this.checkpoints.find(p => p.r === r && p.c === c);
        if (cp) {
          const badge = cell.querySelector('.np-checkpoint-badge');
          if (badge) {
            badge.classList.toggle('np-checkpoint-reached', isVisited);
            badge.classList.toggle('np-checkpoint-pending', !isVisited);
          }
        }
      }
    }

    // Build SVG smooth path line connecting cell centers
    svgEl.innerHTML = '';
    if (this.visitedPath.length < 2) return;

    const boardRect = boardEl.getBoundingClientRect();
    if (boardRect.width === 0 || boardRect.height === 0) return;

    if (typeof svgEl.setAttribute === 'function') {
      svgEl.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    }

    let d = '';
    let lastCx = 0;
    let lastCy = 0;

    this.visitedPath.forEach((pt, idx) => {
      const cell = document.getElementById(`np-cell-${pt.r}-${pt.c}`);
      let cx, cy;
      if (cell) {
        cx = cell.offsetLeft + cell.offsetWidth / 2;
        cy = cell.offsetTop + cell.offsetHeight / 2;
      } else {
        const cellW = boardRect.width / 7;
        const cellH = boardRect.height / 7;
        cx = pt.c * cellW + cellW / 2;
        cy = pt.r * cellH + cellH / 2;
      }
      lastCx = cx;
      lastCy = cy;

      if (idx === 0) {
        d += `M ${cx} ${cy}`;
      } else {
        d += ` L ${cx} ${cy}`;
      }
    });

    // Shadow line
    const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shadowPath.setAttribute('d', d);
    shadowPath.setAttribute('class', 'np-svg-shadow');
    svgEl.appendChild(shadowPath);

    // Glowing main path line (solid thick rounded orange)
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('class', 'np-svg-path');
    svgEl.appendChild(mainPath);

    // Pulse head circle
    if (this.visitedPath.length > 0) {
      const headCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      headCircle.setAttribute('cx', lastCx);
      headCircle.setAttribute('cy', lastCy);
      headCircle.setAttribute('r', '6');
      headCircle.setAttribute('class', 'np-svg-head');
      svgEl.appendChild(headCircle);
    }
  }

  // --- Win Condition & Celebration ---
  checkWinCondition() {
    const totalCells = 49;
    const totalCheckpoints = this.checkpoints.length;
    const collectedCheckpoints = this.getCollectedCheckpointCount();

    // Must have visited all 49 cells AND collected all checkpoints
    if (this.visitedPath.length === totalCells && collectedCheckpoints === totalCheckpoints) {
      this.isCompleted = true;
      this.stopTimer();
      this.clearError();

      if (window.soundFx) window.soundFx.playCorrect();
      if (this.app && typeof this.app.triggerConfetti === 'function') {
        this.app.triggerConfetti();
      }

      // Record best time
      this.recordBestTime();

      setTimeout(() => {
        this.showLevelClearModal();
      }, 500);
    }
  }

  recordBestTime() {
    try {
      const bestTimes = JSON.parse(localStorage.getItem(this.bestTimesKey) || '{}');
      const curBest = bestTimes[this.level] || 999999;
      if (this.secondsElapsed < curBest) {
        bestTimes[this.level] = this.secondsElapsed;
        localStorage.setItem(this.bestTimesKey, JSON.stringify(bestTimes));
      }
    } catch (e) {}
  }

  showLevelClearModal() {
    const modal = document.getElementById('modal-numberpath-clear');
    const timeEl = document.getElementById('numberpath-clear-time');
    const lvlEl = document.getElementById('numberpath-clear-level');
    const cellsEl = document.getElementById('numberpath-clear-cells');

    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;
    if (timeEl) timeEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (lvlEl) lvlEl.innerText = `Level ${this.level}`;
    if (cellsEl) cellsEl.innerText = '49 / 49';

    if (this.app) this.app.openModal('modal-numberpath-clear');
  }

  nextLevel() {
    if (this.app) this.app.closeModal('modal-numberpath-clear');
    if (this.level < this.maxLevel) {
      this.level++;
      this.saveProgress(this.level);
      this.startLevel(this.level);
    } else {
      if (this.app) {
        this.app.exitNumberPathToMenu();
        if (typeof this.app.showToast === 'function') {
          this.app.showToast('🎉 Mastermind! You completed all 10 Number Path levels!', 'success');
        }
      }
    }
  }

  // --- HUD Updates ---
  updateHUD() {
    const lvlEl = document.getElementById('numberpath-hud-level');
    const progEl = document.getElementById('numberpath-hud-progress');
    const cpEl = document.getElementById('numberpath-hud-checkpoints');

    if (lvlEl) lvlEl.innerText = `${this.level} / ${this.maxLevel}`;
    if (progEl) progEl.innerText = `${this.visitedPath.length} / 49`;

    if (cpEl) {
      const collected = this.getCollectedCheckpointCount();
      const nextExpected = collected + 1;
      if (nextExpected <= this.checkpoints.length) {
        cpEl.innerText = `Next target: ${nextExpected} (Total ${this.checkpoints.length})`;
      } else {
        cpEl.innerText = `All ${this.checkpoints.length} reached! Fill remaining squares`;
      }
    }
  }

  exitToMenu() {
    this.stopTimer();
    this.clearError();
    this.isDragging = false;
    if (this.app) {
      this.app.showScreen('menu');
    }
  }
}

if (typeof window !== 'undefined') {
  window.NumberPathGame = NumberPathGame;
}
