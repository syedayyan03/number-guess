// Number Path (Cognitive Sequential Path Puzzle inspired by LinkedIn Zip)
// Connect numbers 1 to N in sequence on a 7x7 grid (49 squares), visiting every single cell with zero gaps.
class NumberPathGame {
  constructor(app) {
    this.app = app;
    this.storageKey = 'numberverse_numberpath_level';
    this.bestTimesKey = 'numberverse_numberpath_best_times';
    this.maxLevel = 10;
    this.difficulty = 'easy';
    this.level = this.getSavedLevel();

    // Board & Path State (Strictly 7x7 grid = 49 cells across all levels)
    this.rows = 7;
    this.cols = 7;
    this.checkpoints = []; // Array of { number: 1..K, r, c, stepIndex }
    this.visitedPath = []; // Array of { r, c }
    this.isDragging = false;
    this.isCompleted = false;
    this.errorTimeout = null;
    this.cachedGridRect = null;
    this.cells = [];
    this.badges = [];
    this.svgShadowEl = null;
    this.svgMainEl = null;
    this.svgHeadEl = null;

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

    // Global drag release handlers
    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.cachedGridRect = null;
    });
    window.addEventListener('pointercancel', () => {
      this.isDragging = false;
      this.cachedGridRect = null;
    });

    // Window resize handler to invalidate cached board rect
    window.addEventListener('resize', () => {
      this.cachedGridRect = null;
    });
  }

  // --- Storage & Level Management ---
  getStorageKey() {
    const uid = (this.app && typeof this.app.getUserId === 'function') ? this.app.getUserId() : 'guest';
    return `nv_u${uid}_numberpath_level`;
  }

  getBestTimesKey() {
    const uid = (this.app && typeof this.app.getUserId === 'function') ? this.app.getUserId() : 'guest';
    return `nv_u${uid}_numberpath_best_times`;
  }

  getSavedLevel() {
    try {
      const saved = localStorage.getItem(this.getStorageKey());
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
      localStorage.setItem(this.getStorageKey(), this.level.toString());
      if (this.app && typeof this.app.updateNumberPathMenuCard === 'function') {
        this.app.updateNumberPathMenuCard();
        if (typeof this.app.syncProgressToServer === 'function') {
          this.app.syncProgressToServer();
        }
      }
    } catch (e) {}
  }

  resetProgress() {
    try {
      localStorage.removeItem(this.getStorageKey());
      this.level = 1;
      if (this.app && typeof this.app.updateNumberPathMenuCard === 'function') {
        this.app.updateNumberPathMenuCard();
        if (typeof this.app.syncProgressToServer === 'function') {
          this.app.syncProgressToServer();
        }
      }
    } catch (e) {}
  }

  // --- Difficulty & Progressive Checkpoints ---
  getCheckpointCount(lvl = this.level, difficulty = this.difficulty || 'easy') {
    const cleanLvl = Math.max(1, Math.min(10, parseInt(lvl, 10) || 1));
    if (difficulty === 'easy') {
      // 20 down to 13 checkpoints across 49 cells (frequent guidance, highly intuitive)
      const counts = [20, 19, 18, 17, 16, 15, 15, 14, 14, 13];
      return counts[cleanLvl - 1];
    } else if (difficulty === 'medium') {
      // 13 down to 8 checkpoints across 49 cells (moderate guidance, logical deduction required)
      const counts = [13, 12, 12, 11, 11, 10, 10, 9, 9, 8];
      return counts[cleanLvl - 1];
    } else {
      // 8 down to 5 checkpoints across 49 cells (challenging deduction, perfectly solvable without guessing)
      const counts = [8, 8, 7, 7, 6, 6, 6, 5, 5, 5];
      return counts[cleanLvl - 1];
    }
  }

  getCheckpointStepIndices(pathLength, count) {
    if (count <= 2) return [0, pathLength - 1];
    const steps = [0];
    const stepSize = (pathLength - 1) / (count - 1);
    for (let i = 1; i < count - 1; i++) {
      steps.push(Math.round(i * stepSize));
    }
    steps.push(pathLength - 1);
    // Ensure strictly unique and sorted
    return Array.from(new Set(steps)).sort((a, b) => a - b);
  }

  // --- Start & Init Game ---
  startLevel(lvl = this.level, difficulty = 'easy') {
    this.difficulty = difficulty;
    this.level = Math.min(this.maxLevel, Math.max(1, lvl));
    this.saveProgress(this.level);

    const config = this.levelConfigs[this.level - 1];
    this.rows = 7;
    this.cols = 7;
    this.isCompleted = false;
    this.isDragging = false;
    this.clearError();

    const cpCount = this.getCheckpointCount(this.level, this.difficulty);
    const cpSteps = this.getCheckpointStepIndices(config.path.length, cpCount);

    // Build checkpoints: number starts from 1..K
    this.checkpoints = cpSteps.map((stepIdx, idx) => {
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

    this.cells = Array.from({ length: 7 }, () => Array(7).fill(null));
    this.badges = Array.from({ length: 7 }, () => Array(7).fill(null));

    // Render 49 cells
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = document.createElement('div');
        cell.id = `np-cell-${r}-${c}`;
        cell.className = 'np-cell relative flex items-center justify-center font-bold cursor-pointer select-none';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Checkpoint badge: Solid black circle with white text (matching LinkedIn Zip)
        const cp = this.checkpoints.find(p => p.r === r && p.c === c);
        if (cp) {
          const badge = document.createElement('div');
          badge.className = 'np-checkpoint-badge w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow z-10 select-none pointer-events-none';
          badge.innerText = cp.number;
          cell.appendChild(badge);
          this.badges[r][c] = badge;
        }

        boardEl.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }

    this.initSvgElements();
    this.bindWrapperEvents();
    this.refreshAllCellStyles();
  }

  // --- SVG Path Setup & Coordinates (Fixed 700x700 ViewBox for Zero-Reflow 60+ FPS) ---
  initSvgElements() {
    const svgEl = document.getElementById('numberpath-svg-lines');
    if (!svgEl) return;

    svgEl.setAttribute('viewBox', '0 0 700 700');
    svgEl.innerHTML = `
      <path id="np-svg-shadow" class="np-svg-shadow" d=""></path>
      <path id="np-svg-path" class="np-svg-path" d=""></path>
      <circle id="np-svg-head" class="np-svg-head" cx="-100" cy="-100" r="16" style="display:none;"></circle>
    `;
    this.svgShadowEl = document.getElementById('np-svg-shadow');
    this.svgMainEl = document.getElementById('np-svg-path');
    this.svgHeadEl = document.getElementById('np-svg-head');
  }

  // --- Smooth Pointer Drag Tracking with Arithmetic Cell Resolution & Zero Lag ---
  bindWrapperEvents() {
    const wrapper = document.getElementById('numberpath-grid-wrapper') || document.querySelector('.np-grid-wrapper');
    if (!wrapper || typeof wrapper.addEventListener !== 'function' || (wrapper.dataset && wrapper.dataset.bound === 'true')) return;
    if (wrapper.dataset) wrapper.dataset.bound = 'true';

    const getGridCoords = (e) => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      // Clamp coordinates to wrapper bounds so fast/near-edge dragging never drops or freezes
      const x = Math.max(0, Math.min(rect.width - 0.001, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 0.001, e.clientY - rect.top));
      const c = Math.floor((x / rect.width) * 7);
      const r = Math.floor((y / rect.height) * 7);
      if (r < 0 || r >= 7 || c < 0 || c >= 7) return null;
      return { r, c };
    };

    wrapper.addEventListener('pointerdown', (e) => {
      if (this.isCompleted) return;
      e.preventDefault();
      try {
        wrapper.setPointerCapture(e.pointerId);
      } catch (err) {}

      const coords = getGridCoords(e);
      if (!coords) return;

      this.isDragging = true;
      this.handlePointerDownAt(coords.r, coords.c);
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging || this.isCompleted) return;
      const coords = getGridCoords(e);
      if (!coords) return;
      this.handlePointerMoveAt(coords.r, coords.c);
    });

    const handlePointerEnd = (e) => {
      this.isDragging = false;
      this.cachedGridRect = null;
      try {
        if (wrapper.hasPointerCapture && wrapper.hasPointerCapture(e.pointerId)) {
          wrapper.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    };

    wrapper.addEventListener('pointerup', handlePointerEnd);
    wrapper.addEventListener('pointercancel', handlePointerEnd);
  }

  handlePointerDownAt(r, c) {
    if (this.isCompleted) return;

    // If clicked on an already visited cell
    const existingIdx = this.visitedPath.findIndex(p => p.r === r && p.c === c);
    if (existingIdx !== -1) {
      // Deliberate tap/click on an earlier cell -> rewind back to it
      if (existingIdx < this.visitedPath.length - 1) {
        this.rewindTo(existingIdx);
      }
      return;
    }

    // Unvisited cell -> attempt step
    this.attemptStep(r, c);
  }

  handlePointerMoveAt(r, c) {
    if (this.isCompleted || this.visitedPath.length === 0) return;
    const currentTip = this.visitedPath[this.visitedPath.length - 1];

    // Already on current tip cell -> no-op
    if (currentTip.r === r && currentTip.c === c) return;

    // Check if target is an already visited cell
    const targetIdx = this.visitedPath.findIndex(p => p.r === r && p.c === c);
    if (targetIdx !== -1) {
      const stepsBack = (this.visitedPath.length - 1) - targetIdx;
      // ONLY allow backtrack if moving back onto the immediate previous cell (stepsBack === 1)
      if (stepsBack === 1) {
        this.undo();
        return;
      }
      // If cursor accidentally brushes any other already visited cell (stepsBack > 1), ignore it completely!
      return;
    }

    // Target is unvisited: smoothly step towards (r, c)
    this.moveTowards(r, c);
  }

  moveTowards(targetR, targetC) {
    if (this.isCompleted || this.visitedPath.length === 0) return;
    let tip = this.visitedPath[this.visitedPath.length - 1];
    let dr = targetR - tip.r;
    let dc = targetC - tip.c;
    let dist = Math.abs(dr) + Math.abs(dc);

    if (dist === 0) return;

    // 1. Direct orthogonal step
    if (dist === 1) {
      this.attemptStep(targetR, targetC);
      return;
    }

    // 2. Diagonal corner turning (|dr| === 1 && |dc| === 1)
    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
      // Option A: Horizontal first (tip.r, targetC), then (targetR, targetC)
      // Option B: Vertical first (targetR, tip.c), then (targetR, targetC)
      const canA = this.canStepInto(tip.r, targetC);
      const canB = this.canStepInto(targetR, tip.c);

      if (canA) {
        if (this.attemptStep(tip.r, targetC)) {
          this.attemptStep(targetR, targetC);
        }
        return;
      } else if (canB) {
        if (this.attemptStep(targetR, tip.c)) {
          this.attemptStep(targetR, targetC);
        }
        return;
      }
    }

    // 3. Fast drag across multiple cells in one swipe (dist between 2 and 6)
    const maxSteps = Math.min(dist, 6);
    for (let i = 0; i < maxSteps; i++) {
      tip = this.visitedPath[this.visitedPath.length - 1];
      dr = targetR - tip.r;
      dc = targetC - tip.c;
      if (dr === 0 && dc === 0) break;

      let nextR = tip.r;
      let nextC = tip.c;

      if (Math.abs(dr) >= Math.abs(dc) && dr !== 0) {
        nextR += Math.sign(dr);
      } else if (dc !== 0) {
        nextC += Math.sign(dc);
      } else if (dr !== 0) {
        nextR += Math.sign(dr);
      }

      // If next step cannot be stepped into, stop smoothly
      if (!this.canStepInto(nextR, nextC)) break;
      if (!this.attemptStep(nextR, nextC)) break;
    }
  }

  canStepInto(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    if (this.visitedPath.some(p => p.r === r && p.c === c)) return false;

    const cp = this.checkpoints.find(p => p.r === r && p.c === c);
    if (cp) {
      const collectedCount = this.getCollectedCheckpointCount();
      const expectedNumber = collectedCount + 1;
      if (cp.number !== expectedNumber) return false;
      if (cp.number === this.checkpoints.length && this.visitedPath.length < (this.rows * this.cols - 1)) {
        return false;
      }
    }
    return true;
  }

  attemptStep(r, c) {
    if (this.isCompleted || this.visitedPath.length === 0) return false;
    const currentTip = this.visitedPath[this.visitedPath.length - 1];

    // Cannot draw past the final checkpoint
    const tipCp = this.checkpoints.find(p => p.r === currentTip.r && p.c === currentTip.c);
    if (tipCp && tipCp.number === this.checkpoints.length) {
      return false;
    }

    // Must not already be visited
    if (this.visitedPath.some(p => p.r === r && p.c === c)) {
      return false;
    }

    // Checkpoint validation (checked first so selecting a checkpoint gives specific number feedback)
    const cp = this.checkpoints.find(p => p.r === r && p.c === c);
    if (cp) {
      const collectedCount = this.getCollectedCheckpointCount();
      const expectedNumber = collectedCount + 1;

      // Checkpoint sequence order (1 -> 2 -> 3 -> ...)
      if (cp.number !== expectedNumber) {
        if (window.soundFx) window.soundFx.playTick();
        this.flashCellInvalid(r, c);
        this.showError(`⚠️ Wrong join! You must connect to ${expectedNumber} next, not ${cp.number}.`);
        return false;
      }
    }

    // Must be orthogonally adjacent (up, down, left, right)
    const dr = Math.abs(r - currentTip.r);
    const dc = Math.abs(c - currentTip.c);
    if (dr + dc !== 1) {
      this.showError('⚠️ Step must connect to an adjacent square (up, down, left, right).');
      return false;
    }

    // FIX FOR ISSUE 1:
    // The final checkpoint K is the DESTINATION of the entire zip (cell #49).
    // It can ONLY be entered on the final 49th square after all other 48 squares are filled!
    if (cp && cp.number === this.checkpoints.length) {
      const totalCells = this.rows * this.cols; // 49
      if (this.visitedPath.length < totalCells - 1) {
        if (window.soundFx) window.soundFx.playTick();
        this.flashCellInvalid(r, c);
        this.showError(`⚠️ Checkpoint ${cp.number} is the finish line! Fill all remaining squares first (${this.visitedPath.length}/${totalCells - 1} visited).`);
        return false;
      }
    }

    // Valid step!
    this.clearError();
    this.visitedPath.push({ r, c });
    if (window.soundFx) window.soundFx.playTick();

    // High performance incremental DOM update
    this.renderStepForward(currentTip, { r, c }, cp);
    this.updateHUD();
    this.checkWinCondition();
    return true;
  }

  // --- Incremental DOM updates for buttery 60+ FPS zero-latency drawing ---
  renderStepForward(prevTip, newTip, cp) {
    if (this.cells[prevTip.r] && this.cells[prevTip.r][prevTip.c]) {
      this.cells[prevTip.r][prevTip.c].classList.remove('np-cell-head');
    }
    if (this.cells[newTip.r] && this.cells[newTip.r][newTip.c]) {
      this.cells[newTip.r][newTip.c].classList.add('np-cell-visited', 'np-cell-head');
    }
    if (cp && this.badges[newTip.r] && this.badges[newTip.r][newTip.c]) {
      this.badges[newTip.r][newTip.c].classList.remove('np-checkpoint-pending');
      this.badges[newTip.r][newTip.c].classList.add('np-checkpoint-reached');
    }
    this.updateSvgPath();
  }

  renderStepBackward(poppedTip, newTip) {
    if (this.cells[poppedTip.r] && this.cells[poppedTip.r][poppedTip.c]) {
      this.cells[poppedTip.r][poppedTip.c].classList.remove('np-cell-visited', 'np-cell-head');
    }
    if (this.badges[poppedTip.r] && this.badges[poppedTip.r][poppedTip.c]) {
      this.badges[poppedTip.r][poppedTip.c].classList.remove('np-checkpoint-reached');
      this.badges[poppedTip.r][poppedTip.c].classList.add('np-checkpoint-pending');
    }
    if (newTip && this.cells[newTip.r] && this.cells[newTip.r][newTip.c]) {
      this.cells[newTip.r][newTip.c].classList.add('np-cell-head');
    }
    this.updateSvgPath();
  }

  updateSvgPath() {
    if (!this.svgMainEl || !this.svgShadowEl || !this.svgHeadEl) {
      this.initSvgElements();
    }
    if (!this.svgMainEl || !this.svgShadowEl || !this.svgHeadEl) return;

    const len = this.visitedPath.length;
    if (len < 2) {
      this.svgShadowEl.setAttribute('d', '');
      this.svgMainEl.setAttribute('d', '');
    } else {
      let d = '';
      for (let i = 0; i < len; i++) {
        const p = this.visitedPath[i];
        const cx = p.c * 100 + 50;
        const cy = p.r * 100 + 50;
        d += (i === 0 ? 'M ' : ' L ') + cx + ' ' + cy;
      }
      this.svgShadowEl.setAttribute('d', d);
      this.svgMainEl.setAttribute('d', d);
    }

    if (len > 0) {
      const head = this.visitedPath[len - 1];
      this.svgHeadEl.setAttribute('cx', head.c * 100 + 50);
      this.svgHeadEl.setAttribute('cy', head.r * 100 + 50);
      this.svgHeadEl.style.display = '';
    } else {
      this.svgHeadEl.style.display = 'none';
    }
  }

  refreshAllCellStyles() {
    const visitedSet = new Set(this.visitedPath.map(p => `${p.r},${p.c}`));
    const lastPt = this.visitedPath[this.visitedPath.length - 1];

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = this.cells[r] ? this.cells[r][c] : null;
        if (cell) {
          const isVisited = visitedSet.has(`${r},${c}`);
          const isHead = lastPt && lastPt.r === r && lastPt.c === c;
          cell.classList.toggle('np-cell-visited', isVisited);
          cell.classList.toggle('np-cell-head', isHead);
        }
        const badge = this.badges[r] ? this.badges[r][c] : null;
        if (badge) {
          const isVisited = visitedSet.has(`${r},${c}`);
          badge.classList.toggle('np-checkpoint-reached', isVisited);
          badge.classList.toggle('np-checkpoint-pending', !isVisited);
        }
      }
    }
    this.updateSvgPath();
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
    if (index < 0 || index >= this.visitedPath.length || this.isCompleted) return;
    const targetLength = Math.max(1, index + 1);
    if (this.visitedPath.length === targetLength) return;

    this.visitedPath = this.visitedPath.slice(0, targetLength);
    this.clearError();
    if (window.soundFx) window.soundFx.playClick();
    this.refreshAllCellStyles();
    this.updateHUD();
  }

  undo() {
    if (this.visitedPath.length <= 1 || this.isCompleted) return;
    const popped = this.visitedPath.pop();
    const newTip = this.visitedPath[this.visitedPath.length - 1];
    this.clearError();
    if (window.soundFx) window.soundFx.playClick();
    this.renderStepBackward(popped, newTip);
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
    this.refreshAllCellStyles();
    this.updateHUD();
  }

  flashCellInvalid(r, c) {
    const el = (this.cells[r] && this.cells[r][c]) || document.getElementById(`np-cell-${r}-${c}`);
    if (!el) return;
    el.classList.add('np-invalid-pulse');
    setTimeout(() => {
      el.classList.remove('np-invalid-pulse');
    }, 400);
  }

  // --- Win Condition & Celebration ---
  checkWinCondition() {
    const totalCells = 49;
    const totalCheckpoints = this.checkpoints.length;
    const collectedCheckpoints = this.getCollectedCheckpointCount();

    // Must have visited all 49 cells AND collected all checkpoints
    if (this.visitedPath.length === totalCells && collectedCheckpoints === totalCheckpoints) {
      this.isCompleted = true;
      this.isDragging = false;
      this.stopTimer();
      this.clearError();

      if (window.soundFx) window.soundFx.playCorrect();
      if (this.app && typeof this.app.triggerConfetti === 'function') {
        this.app.triggerConfetti();
      }

      // Record best time
      this.recordBestTime();

      if (this.app && this.app.gameSettingsManager) {
        this.app.gameSettingsManager.markLevelCompleted('number_path', this.difficulty || 'easy', this.level, 3, this.secondsElapsed);
      }

      setTimeout(() => {
        this.showLevelClearModal();
      }, 500);
    }
  }

  recordBestTime() {
    try {
      const bestTimes = JSON.parse(localStorage.getItem(this.getBestTimesKey()) || '{}');
      const curBest = bestTimes[this.level] || 999999;
      if (this.secondsElapsed < curBest) {
        bestTimes[this.level] = this.secondsElapsed;
        localStorage.setItem(this.getBestTimesKey(), JSON.stringify(bestTimes));
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
    if (lvlEl) lvlEl.innerText = `Level ${this.level} (${(this.difficulty || 'easy').toUpperCase()})`;
    if (cellsEl) cellsEl.innerText = '49 / 49';

    if (this.app) this.app.openModal('modal-numberpath-clear');
  }

  nextLevel() {
    if (this.app) this.app.closeModal('modal-numberpath-clear');
    if (this.level < this.maxLevel) {
      this.level++;
      this.saveProgress(this.level);
      if (this.app && this.app.gameSettingsManager) {
        this.app.gameSettingsManager.startLevel('number_path', this.difficulty || 'easy', this.level);
      } else {
        this.startLevel(this.level, this.difficulty);
      }
    } else {
      if (this.app && this.app.gameSettingsManager) {
        this.app.gameSettingsManager.exitGameToLevels('number_path');
      } else if (this.app) {
        this.app.exitNumberPathToMenu();
      }
      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast(`🎉 Mastermind! You completed all 10 ${(this.difficulty || 'easy').toUpperCase()} Zip levels!`, 'success');
      }
    }
  }

  // --- HUD Updates ---
  updateHUD() {
    const lvlEl = document.getElementById('numberpath-hud-level');
    const progEl = document.getElementById('numberpath-hud-progress');
    const cpEl = document.getElementById('numberpath-hud-checkpoints');
    const diffBadge = document.getElementById('numberpath-diff-badge');

    if (lvlEl) lvlEl.innerText = `${this.level} / ${this.maxLevel}`;
    if (progEl) progEl.innerText = `${this.visitedPath.length} / 49`;
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

    if (cpEl) {
      const collected = this.getCollectedCheckpointCount();
      const total = this.checkpoints.length;
      const nextExpected = collected + 1;
      if (nextExpected < total) {
        cpEl.innerText = `Next target: ${nextExpected} (Total ${total})`;
      } else if (nextExpected === total) {
        cpEl.innerText = `Final Target: ${total} (Finish Line)`;
      } else {
        cpEl.innerText = `All ${total} reached! Solved!`;
      }
    }
  }

  exitToLevels() {
    this.stopTimer();
    this.clearError();
    this.isDragging = false;
    this.cachedGridRect = null;
    if (this.app) {
      this.app.closeModal('modal-numberpath-clear');
      this.app.closeModal('modal-numberpath-fail');
    }
    if (this.app && this.app.gameSettingsManager) {
      this.app.gameSettingsManager.openLevels('number_path', this.difficulty || 'easy');
    } else if (this.app) {
      this.app.showScreen('menu');
    }
  }

  exitToMenu() {
    this.stopTimer();
    this.clearError();
    this.isDragging = false;
    this.cachedGridRect = null;
    if (this.app) {
      this.app.showScreen('menu');
    }
  }
}

if (typeof window !== 'undefined') {
  window.NumberPathGame = NumberPathGame;
}
