// Shell Shuffle 3D - Cognitive Visual Tracking Game with real Three.js geometry and physics-inspired motion
class ShellShuffleGame {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.canvas = null;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animFrameId = null;
    this.resizeObserver = null;

    // 3D Objects
    this.cups = []; // Array of { id, group, mesh, rim, currentSlot }
    this.ball = null; // { mesh, targetCupId }
    this.tableMesh = null;
    this.cupGeom = null;
    this.rimGeom = null;
    this.cupMat = null;
    this.rimMat = null;
    this.ballGeom = null;
    this.ballMat = null;

    // Raycaster for Picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredCup = null;

    // Logical State
    // States: 'idle', 'revealing', 'hiding', 'shuffling', 'awaiting_selection', 'result', 'paused'
    this.state = 'idle';
    this.level = 1;
    this.score = 0;
    this.streak = 0;
    this.accuracy = { correct: 0, total: 0 };
    this.isPaused = false;
    this.storageKey = 'numberverse_shellshuffle_highscore';
    this.bestLevelKey = 'numberverse_shellshuffle_best_level';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);
    this.highestLevel = parseInt(localStorage.getItem(this.bestLevelKey) || '1', 10);

    // Shuffle & Animation Queue
    this.slots = []; // Array of X coordinates for slots
    this.cupPositionMap = {}; // slotIndex -> cupId
    this.targetCupId = null;
    this.swapQueue = [];
    this.activeSwap = null;
    this.activeLift = null;

    // Bound listeners for clean removal
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerDown = this.handlePointerDown.bind(this);
  }

  // --- Initialization & Setup ---
  init() {
    this.container = document.getElementById('shell-shuffle-canvas-container');
    if (!this.container) return;

    if (!this.isWebGLAvailable()) {
      this.container.innerHTML = `
        <div class="w-full h-full flex flex-col items-center justify-center p-6 text-center text-rose-400">
          <p class="font-bold text-sm mb-1">WebGL Not Available</p>
          <p class="text-xs text-[#858AA5]">Please enable WebGL or hardware acceleration in your browser settings to play 3D Shell Shuffle.</p>
        </div>
      `;
      return;
    }

    this.setupScene();
    this.setupEventListeners();
    this.updateHUD();
    this.setPhase('ready');
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  setupScene() {
    // If renderer already exists, cleanly dispose first
    this.cleanupScene();

    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 380;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0C0D19); // Match NumberVerse atmospheric dark background

    // Camera
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    this.camera.position.set(0, 3.8, 6.2);
    this.camera.lookAt(0, 0.5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.canvas = this.renderer.domElement;
    this.canvas.className = 'w-full h-full block cursor-default select-none outline-none';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xA0B0D8, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.1);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Subtle blue/indigo atmospheric rim light
    const rimLight = new THREE.DirectionalLight(0x4169FF, 0.8);
    rimLight.position.set(-5, 4, -4);
    this.scene.add(rimLight);

    // Table / Pedestal Surface
    this.buildTable();

    // Build Cups & Ball
    this.buildGameObjects();

    // Start Render Loop
    this.lastTime = performance.now();
    this.animate = this.renderLoop.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  buildTable() {
    // Pedestal surface
    const tableGeom = new THREE.CylinderGeometry(4.6, 4.8, 0.1, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x111322,
      metalness: 0.55,
      roughness: 0.4
    });
    this.tableMesh = new THREE.Mesh(tableGeom, tableMat);
    this.tableMesh.position.y = -0.05;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Glowing cyan/indigo arena boundary ring
    const ringGeom = new THREE.RingGeometry(3.6, 3.65, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x287BFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    this.scene.add(ringMesh);
  }

  // Lathed Hollow Cup Geometry
  createHollowCupGeometry() {
    const points = [];
    // Inside cavity (from top interior downwards to bottom opening):
    points.push(new THREE.Vector2(0.001, 1.25));  // Inner roof center
    points.push(new THREE.Vector2(0.24, 1.25));   // Inner roof corner
    points.push(new THREE.Vector2(0.26, 0.95));   // Inner upper wall
    points.push(new THREE.Vector2(0.31, 0.50));   // Inner mid wall
    points.push(new THREE.Vector2(0.38, 0.10));   // Inner lower wall
    points.push(new THREE.Vector2(0.42, 0.02));   // Inner lip transition
    
    // Lip / rim curve (sits on table at y = 0):
    points.push(new THREE.Vector2(0.46, 0.00));   // Bottom contact ring
    points.push(new THREE.Vector2(0.49, 0.03));   // Outer lip bulge

    // Exterior wall (tapers inward from bottom to top):
    points.push(new THREE.Vector2(0.46, 0.15));   // Lower exterior
    points.push(new THREE.Vector2(0.39, 0.55));   // Mid exterior
    points.push(new THREE.Vector2(0.33, 0.95));   // Upper exterior
    points.push(new THREE.Vector2(0.30, 1.25));   // Top exterior shoulder
    points.push(new THREE.Vector2(0.27, 1.30));   // Bevel to top cap
    points.push(new THREE.Vector2(0.001, 1.30));  // Outer roof center

    const geom = new THREE.LatheGeometry(points, 36);
    geom.computeVertexNormals();
    return geom;
  }

  buildGameObjects() {
    // Determine cup count based on level (3 cups for lvl 1-6, 4 cups for lvl 7-8, 5 cups for lvl 9+)
    const cupCount = this.getCupCountForLevel(this.level);

    // Calculate slot positions evenly spaced across the table
    this.slots = [];
    const spacing = cupCount === 3 ? 1.9 : cupCount === 4 ? 1.55 : 1.3;
    const startX = -((cupCount - 1) * spacing) / 2;
    for (let i = 0; i < cupCount; i++) {
      this.slots.push(startX + i * spacing);
    }

    // Shared Geometries & Materials
    this.cupGeom = this.createHollowCupGeometry();
    this.rimGeom = new THREE.TorusGeometry(0.47, 0.022, 16, 36);
    this.midRingGeom = new THREE.CylinderGeometry(0.385, 0.385, 0.03, 36);

    // Metallic-blue cup body
    this.cupMat = new THREE.MeshStandardMaterial({
      color: 0x1E3364,
      metalness: 0.82,
      roughness: 0.24,
      emissive: 0x0C1838,
      emissiveIntensity: 0.2
    });

    // Silver-blue refined rim
    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0x88B4FF,
      metalness: 0.92,
      roughness: 0.16
    });

    // Ball
    this.ballGeom = new THREE.SphereGeometry(0.18, 32, 24);
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xF4C66A,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x55380A,
      emissiveIntensity: 0.2
    });

    this.ball = new THREE.Mesh(this.ballGeom, this.ballMat);
    this.ball.castShadow = true;
    this.ball.receiveShadow = true;
    this.ball.position.set(0, 0.18, 0);
    this.ball.visible = false;
    this.scene.add(this.ball);

    // Build Cups
    this.cups = [];
    this.cupPositionMap = {};

    const cupLetters = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 0; i < cupCount; i++) {
      const cupId = `cup-${i}`;
      const group = new THREE.Group();
      group.userData = { cupId, slotIndex: i, letter: cupLetters[i] };

      // Main hollow body
      const cupMesh = new THREE.Mesh(this.cupGeom, this.cupMat.clone());
      cupMesh.castShadow = true;
      cupMesh.receiveShadow = true;
      group.add(cupMesh);

      // Bottom metallic rim
      const rimMesh = new THREE.Mesh(this.rimGeom, this.rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = 0.025;
      rimMesh.castShadow = true;
      group.add(rimMesh);

      // Mid-height accent band
      const midRingMesh = new THREE.Mesh(this.midRingGeom, this.rimMat);
      midRingMesh.position.y = 0.65;
      group.add(midRingMesh);

      // Position group at slot
      group.position.set(this.slots[i], 0, 0);
      this.scene.add(group);

      this.cups.push({
        id: cupId,
        group,
        mesh: cupMesh,
        rim: rimMesh,
        currentSlot: i,
        baseY: 0
      });

      this.cupPositionMap[i] = cupId;
    }
  }

  getCupCountForLevel(lvl) {
    if (lvl >= 9) return 5;
    if (lvl >= 7) return 4;
    return 3;
  }

  setupEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);

    // Responsive Resize Observer
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --- Interaction & Raycasting ---
  handlePointerMove(e) {
    if (this.state !== 'awaiting_selection') {
      if (this.canvas) this.canvas.style.cursor = 'default';
      this.clearHover();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cups.map(c => c.mesh));

    if (intersects.length > 0) {
      const hitCupMesh = intersects[0].object;
      const cupObj = this.cups.find(c => c.mesh === hitCupMesh);
      if (cupObj) {
        this.canvas.style.cursor = 'pointer';
        this.setHoverCup(cupObj);
        return;
      }
    }

    this.canvas.style.cursor = 'default';
    this.clearHover();
  }

  handlePointerDown(e) {
    if (this.state !== 'awaiting_selection') return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cups.map(c => c.mesh));

    if (intersects.length > 0) {
      const hitCupMesh = intersects[0].object;
      const cupObj = this.cups.find(c => c.mesh === hitCupMesh);
      if (cupObj) {
        this.selectCup(cupObj.id);
      }
    }
  }

  setHoverCup(cupObj) {
    if (this.hoveredCup === cupObj) return;
    this.clearHover();
    this.hoveredCup = cupObj;
    if (cupObj.mesh && cupObj.mesh.material) {
      cupObj.mesh.material.emissive.setHex(0x1A407A);
      cupObj.mesh.material.emissiveIntensity = 0.5;
    }
  }

  clearHover() {
    if (this.hoveredCup && this.hoveredCup.mesh && this.hoveredCup.mesh.material) {
      this.hoveredCup.mesh.material.emissive.setHex(0x0C1838);
      this.hoveredCup.mesh.material.emissiveIntensity = 0.2;
    }
    this.hoveredCup = null;
  }

  // --- Gameplay Flow & State Machine ---
  startRound() {
    if (this.state === 'shuffling' || this.state === 'revealing' || this.state === 'hiding') return;

    // Refresh cups if cup count changed
    const neededCups = this.getCupCountForLevel(this.level);
    if (this.cups.length !== neededCups) {
      this.rebuildSceneForLevel();
    }

    // Pick target cup randomly
    const targetIndex = Math.floor(Math.random() * this.cups.length);
    this.targetCupId = this.cups[targetIndex].id;

    const targetCup = this.cups.find(c => c.id === this.targetCupId);
    this.ball.position.set(targetCup.group.position.x, 0.18, targetCup.group.position.z);
    this.ball.visible = true;

    this.setPhase('revealing');
    if (window.soundFx) window.soundFx.playLift();

    // Lift target cup to reveal ball
    this.animateLift(targetCup, 1.8, -0.15, 600, () => {
      // Hold ball visible for player to memorize
      setTimeout(() => {
        if (this.state !== 'revealing') return;
        this.setPhase('hiding');
        if (window.soundFx) window.soundFx.playLift();

        // Lower cup back over the ball
        this.animateLift(targetCup, 0, 0, 500, () => {
          this.ball.visible = false;
          // Short dramatic pause before shuffle begins
          setTimeout(() => {
            this.generateShufflePlan();
            this.startShuffling();
          }, 350);
        });
      }, 1500);
    });
  }

  rebuildSceneForLevel() {
    // Remove old cups and ball
    this.cups.forEach(c => {
      this.scene.remove(c.group);
      c.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
      });
    });
    this.cups = [];
    if (this.ball) {
      this.scene.remove(this.ball);
      this.ball.geometry.dispose();
      this.ball = null;
    }

    this.buildGameObjects();
  }

  generateShufflePlan() {
    // Difficulty curve tuning
    // Swaps count
    let swapCount = 3 + Math.floor((this.level - 1) * 0.8);
    swapCount = Math.min(10, Math.max(3, swapCount));

    // Swap speed (duration in ms per swap)
    let speed = 1100 - (this.level - 1) * 75;
    speed = Math.max(480, speed);

    this.swapQueue = [];
    const numSlots = this.slots.length;

    let lastA = -1;
    let lastB = -1;

    for (let s = 0; s < swapCount; s++) {
      // Pick two distinct slots to swap
      let slotA = Math.floor(Math.random() * numSlots);
      let slotB = Math.floor(Math.random() * numSlots);
      while (slotB === slotA || (slotA === lastA && slotB === lastB) || (slotA === lastB && slotB === lastA)) {
        slotB = Math.floor(Math.random() * numSlots);
      }
      lastA = slotA;
      lastB = slotB;

      this.swapQueue.push({ slotA, slotB, duration: speed });
    }
  }

  startShuffling() {
    this.setPhase('shuffling');
    this.processNextSwap();
  }

  processNextSwap() {
    if (this.swapQueue.length === 0) {
      // All swaps completed!
      this.setPhase('awaiting_selection');
      if (window.soundFx) window.soundFx.playTick();
      return;
    }

    const swap = this.swapQueue.shift();
    const cupAId = this.cupPositionMap[swap.slotA];
    const cupBId = this.cupPositionMap[swap.slotB];
    const cupA = this.cups.find(c => c.id === cupAId);
    const cupB = this.cups.find(c => c.id === cupBId);

    if (!cupA || !cupB) return;

    if (window.soundFx) window.soundFx.playShuffle();

    const startXA = this.slots[swap.slotA];
    const startXB = this.slots[swap.slotB];
    const distance = Math.abs(startXB - startXA);

    // One cup arcs forward (z+), one arcs backward (z-) to prevent intersecting
    const zArc = Math.min(0.55, 0.28 + distance * 0.1);

    this.activeSwap = {
      cupA,
      cupB,
      slotA: swap.slotA,
      slotB: swap.slotB,
      startXA,
      startXB,
      zArc,
      duration: swap.duration,
      startTime: performance.now()
    };
  }

  selectCup(selectedCupId) {
    if (this.state !== 'awaiting_selection') return;
    this.setPhase('result');
    this.clearHover();

    const selectedCup = this.cups.find(c => c.id === selectedCupId);
    const targetCup = this.cups.find(c => c.id === this.targetCupId);

    // Sync ball position to target cup's current world position
    this.ball.position.set(targetCup.group.position.x, 0.18, targetCup.group.position.z);

    const isCorrect = selectedCupId === this.targetCupId;
    this.accuracy.total++;

    if (isCorrect) {
      this.accuracy.correct++;
      this.streak++;
      const earnedPoints = 100 * this.level + this.streak * 30;
      this.score += earnedPoints;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(this.storageKey, this.highScore.toString());
      }
      if (this.level > this.highestLevel) {
        this.highestLevel = this.level;
        localStorage.setItem(this.bestLevelKey, this.highestLevel.toString());
      }

      this.updateHUD();

      // Lift selected cup revealing the ball
      if (window.soundFx) window.soundFx.playCorrect();
      this.ball.visible = true;
      this.animateLift(selectedCup, 1.8, -0.15, 550, () => {
        if (this.app && typeof this.app.triggerConfetti === 'function') {
          this.app.triggerConfetti();
        }
        setTimeout(() => {
          this.showLevelClearModal(earnedPoints);
        }, 600);
      });
    } else {
      this.streak = 0;
      this.updateHUD();

      // Wrong selection: lift selected cup showing empty, then lift the target cup
      if (window.soundFx) window.soundFx.playError();
      this.animateLift(selectedCup, 1.8, -0.15, 550, () => {
        setTimeout(() => {
          if (window.soundFx) window.soundFx.playLift();
          this.ball.visible = true;
          this.animateLift(targetCup, 1.8, -0.15, 550, () => {
            setTimeout(() => {
              this.showGameOverModal();
            }, 800);
          });
        }, 400);
      });
    }
  }

  // Smooth Lift / Lower Animation Helper
  animateLift(cup, targetY, targetRotX, duration, onComplete) {
    const startY = cup.group.position.y;
    const startRotX = cup.group.rotation.x;
    const startTime = performance.now();

    this.activeLift = {
      cup,
      startY,
      targetY,
      startRotX,
      targetRotX,
      duration,
      startTime,
      onComplete
    };
  }

  // --- Render & Animation Loop ---
  renderLoop(now) {
    if (this.isDestroyed) return;

    this.animFrameId = requestAnimationFrame(this.animate);

    // Process Active Lift Animation
    if (this.activeLift) {
      const elapsed = now - this.activeLift.startTime;
      const t = Math.min(1, elapsed / this.activeLift.duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      this.activeLift.cup.group.position.y = this.activeLift.startY + (this.activeLift.targetY - this.activeLift.startY) * ease;
      this.activeLift.cup.group.rotation.x = this.activeLift.startRotX + (this.activeLift.targetRotX - this.activeLift.startRotX) * ease;

      if (t >= 1) {
        this.activeLift.cup.group.position.y = this.activeLift.targetY;
        this.activeLift.cup.group.rotation.x = this.activeLift.targetRotX;
        const cb = this.activeLift.onComplete;
        this.activeLift = null;
        if (cb) cb();
      }
    }

    // Process Active Swap Animation
    if (this.activeSwap) {
      const elapsed = now - this.activeSwap.startTime;
      const t = Math.min(1, elapsed / this.activeSwap.duration);

      // Smooth step easing: 3t^2 - 2t^3
      const ease = t * t * (3 - 2 * t);

      const cupA = this.activeSwap.cupA;
      const cupB = this.activeSwap.cupB;

      // X translation
      cupA.group.position.x = this.activeSwap.startXA + (this.activeSwap.startXB - this.activeSwap.startXA) * ease;
      cupB.group.position.x = this.activeSwap.startXB + (this.activeSwap.startXA - this.activeSwap.startXB) * ease;

      // Z arc (semi-circle trajectory so cups pass around each other)
      const sinCurve = Math.sin(t * Math.PI);
      cupA.group.position.z = sinCurve * this.activeSwap.zArc;
      cupB.group.position.z = -sinCurve * this.activeSwap.zArc;

      // Subtle Y lift during movement apex
      const liftY = sinCurve * 0.12;
      cupA.group.position.y = liftY;
      cupB.group.position.y = liftY;

      // Subtle tilt in direction of movement
      const tiltDirection = Math.sign(this.activeSwap.startXB - this.activeSwap.startXA);
      cupA.group.rotation.z = -sinCurve * 0.1 * tiltDirection;
      cupB.group.rotation.z = sinCurve * 0.1 * tiltDirection;

      if (t >= 1) {
        // Swap complete
        cupA.group.position.set(this.activeSwap.startXB, 0, 0);
        cupB.group.position.set(this.activeSwap.startXA, 0, 0);
        cupA.group.rotation.set(0, 0, 0);
        cupB.group.rotation.set(0, 0, 0);

        // Update logical slot map
        this.cupPositionMap[this.activeSwap.slotA] = cupB.id;
        this.cupPositionMap[this.activeSwap.slotB] = cupA.id;
        cupA.currentSlot = this.activeSwap.slotB;
        cupB.currentSlot = this.activeSwap.slotA;

        this.activeSwap = null;

        // Gap between swaps
        setTimeout(() => {
          this.processNextSwap();
        }, 70);
      }
    }

    // Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // --- UI Phase & HUD Management ---
  setPhase(newPhase) {
    this.state = newPhase;
    const badge = document.getElementById('shellshuffle-phase-badge');
    const startBtn = document.getElementById('shellshuffle-start-btn');

    if (!badge) return;

    if (newPhase === 'ready') {
      badge.className = 'px-3 py-1 rounded-full bg-[#191B2D] border border-[#34364A] text-[#858AA5] font-mono text-xs inline-flex items-center gap-1.5';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#4169FF]"></span> Ready • Click Start Round';
      if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.innerText = 'Start Round';
      }
    } else if (newPhase === 'revealing') {
      badge.className = 'px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-xs inline-flex items-center gap-1.5 animate-pulse';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Remember the ball! 👀';
      if (startBtn) startBtn.classList.add('hidden');
    } else if (newPhase === 'hiding') {
      badge.className = 'px-3 py-1 rounded-full bg-[#191B2D] border border-[#34364A] text-[#B8BCD0] font-mono text-xs inline-flex items-center gap-1.5';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#777BFF]"></span> Concealing ball...';
      if (startBtn) startBtn.classList.add('hidden');
    } else if (newPhase === 'shuffling') {
      badge.className = 'px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-mono text-xs inline-flex items-center gap-1.5';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-400 animate-spin"></span> Track the cup! 🔄';
      if (startBtn) startBtn.classList.add('hidden');
    } else if (newPhase === 'awaiting_selection') {
      badge.className = 'px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs inline-flex items-center gap-1.5 animate-pulse';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Where is the ball? Click a cup! 👆';
      if (startBtn) startBtn.classList.add('hidden');
    } else if (newPhase === 'result') {
      badge.className = 'px-3 py-1 rounded-full bg-[#191B2D] border border-[#34364A] text-[#858AA5] font-mono text-xs inline-flex items-center gap-1.5';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#858AA5]"></span> Revealing result...';
      if (startBtn) startBtn.classList.add('hidden');
    }
  }

  updateHUD() {
    const lvlEl = document.getElementById('shellshuffle-hud-level');
    const scoreEl = document.getElementById('shellshuffle-hud-score');
    const streakEl = document.getElementById('shellshuffle-hud-streak');
    const cupsCountEl = document.getElementById('shellshuffle-hud-cups');

    if (lvlEl) lvlEl.innerText = this.level.toString();
    if (scoreEl) scoreEl.innerText = this.score.toLocaleString();
    if (streakEl) streakEl.innerText = `x${this.streak}`;
    if (cupsCountEl) cupsCountEl.innerText = `${this.getCupCountForLevel(this.level)} Cups`;

    if (this.app && typeof this.app.updateShellShuffleMenuCard === 'function') {
      this.app.updateShellShuffleMenuCard();
    }
  }

  // --- Modals ---
  showLevelClearModal(pts) {
    const modal = document.getElementById('modal-shellshuffle-level-clear');
    const ptsEl = document.getElementById('shellshuffle-clear-points');
    const lvlEl = document.getElementById('shellshuffle-clear-level');
    const streakEl = document.getElementById('shellshuffle-clear-streak');

    if (ptsEl) ptsEl.innerText = `+${pts}`;
    if (lvlEl) lvlEl.innerText = `Level ${this.level}`;
    if (streakEl) streakEl.innerText = `x${this.streak}`;

    if (this.app) this.app.openModal('modal-shellshuffle-level-clear');
  }

  nextLevel() {
    if (this.app) this.app.closeModal('modal-shellshuffle-level-clear');
    this.level++;
    this.updateHUD();

    // Reset cup positions to ground flush
    this.resetCupsToRestPosition();
    this.ball.visible = false;
    this.setPhase('ready');

    // Auto-start round after short delay
    setTimeout(() => {
      this.startRound();
    }, 400);
  }

  showGameOverModal() {
    const modal = document.getElementById('modal-shellshuffle-game-over');
    const finalScoreEl = document.getElementById('shellshuffle-over-score');
    const bestScoreEl = document.getElementById('shellshuffle-over-best');
    const levelEl = document.getElementById('shellshuffle-over-level');
    const accEl = document.getElementById('shellshuffle-over-accuracy');

    const accPct = this.accuracy.total > 0 ? Math.round((this.accuracy.correct / this.accuracy.total) * 100) : 0;

    if (finalScoreEl) finalScoreEl.innerText = this.score.toLocaleString();
    if (bestScoreEl) bestScoreEl.innerText = this.highScore.toLocaleString();
    if (levelEl) levelEl.innerText = `Level ${this.level}`;
    if (accEl) accEl.innerText = `${accPct}%`;

    if (this.app) this.app.openModal('modal-shellshuffle-game-over');
  }

  restartGame() {
    if (this.app) {
      this.app.closeModal('modal-shellshuffle-game-over');
      this.app.closeModal('modal-shellshuffle-pause');
    }

    this.level = 1;
    this.score = 0;
    this.streak = 0;
    this.accuracy = { correct: 0, total: 0 };
    this.updateHUD();

    this.rebuildSceneForLevel();
    this.resetCupsToRestPosition();
    this.setPhase('ready');

    setTimeout(() => {
      this.startRound();
    }, 400);
  }

  resetCupsToRestPosition() {
    this.cups.forEach((c, idx) => {
      c.group.position.set(this.slots[c.currentSlot], 0, 0);
      c.group.rotation.set(0, 0, 0);
      if (c.mesh && c.mesh.material) {
        c.mesh.material.emissive.setHex(0x0C1838);
        c.mesh.material.emissiveIntensity = 0.2;
      }
    });
    this.activeSwap = null;
    this.activeLift = null;
    this.swapQueue = [];
  }

  resetHighScore() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.bestLevelKey);
      this.highScore = 0;
      this.highestLevel = 1;
      this.updateHUD();
    } catch (e) {}
  }

  togglePause() {
    if (this.state === 'idle' || this.state === 'result') return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      if (this.app) this.app.openModal('modal-shellshuffle-pause');
    } else {
      if (this.app) this.app.closeModal('modal-shellshuffle-pause');
    }
  }

  resumeGame() {
    this.isPaused = false;
    if (this.app) this.app.closeModal('modal-shellshuffle-pause');
  }

  // --- Cleanup & Unmount ---
  exitToMenu() {
    this.stopAnimations();
    if (this.app) {
      this.app.closeModal('modal-shellshuffle-level-clear');
      this.app.closeModal('modal-shellshuffle-game-over');
      this.app.closeModal('modal-shellshuffle-pause');
      this.app.showScreen('menu');
      this.app.updateShellShuffleMenuCard();
    }
  }

  stopAnimations() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.activeSwap = null;
    this.activeLift = null;
    this.swapQueue = [];
    this.state = 'idle';
  }

  cleanupScene() {
    this.stopAnimations();

    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.cups = [];
    this.ball = null;
  }
}

window.ShellShuffleGame = ShellShuffleGame;
