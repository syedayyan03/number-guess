// Shell Shuffle 3D - Cognitive Visual Tracking Game with real Three.js geometry, high-contrast visibility, and dynamic speed scaling
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
    this.cups = []; // Array of { id, group, mesh, rim, badge, currentSlot }
    this.ball = null; // { mesh, targetCupId }
    this.tableMesh = null;
    this.cupGeom = null;
    this.rimGeom = null;
    this.midRingGeom = null;
    this.cupMat = null;
    this.rimMat = null;
    this.ballGeom = null;
    this.ballMat = null;
    this.tableTexture = null;

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

  // --- Dynamic Difficulty & Speed Progression ---
  getShuffleConfigForLevel(lvl) {
    // Swaps count scales progressively:
    // Level 1: 3 swaps
    // Level 2: 4 swaps
    // Level 3: 5 swaps
    // Level 4: 6 swaps
    // Level 5: 7 swaps
    // Level 6: 8 swaps
    // Level 7: 10 swaps
    // Level 8: 12 swaps
    // Level 9+: 14 swaps
    const swapCount = Math.min(15, Math.max(3, 3 + Math.floor((lvl - 1) * 1.25)));

    // Duration in ms per swap (starts at 820ms, drops aggressively each level):
    // Level 1: 820ms (1.0x)
    // Level 2: 660ms (1.2x)
    // Level 3: 530ms (1.5x)
    // Level 4: 420ms (2.0x)
    // Level 5: 330ms (2.5x)
    // Level 6: 260ms (3.2x)
    // Level 7: 210ms (3.9x)
    // Level 8: 170ms (4.8x)
    // Level 9: 140ms (5.9x)
    // Level 10+: 115ms (7.1x)
    const duration = Math.max(115, Math.round(820 * Math.pow(0.80, lvl - 1)));

    // Inter-swap delay shrinks from 50ms at lvl 1 down to 10ms at high levels
    const gapDelay = Math.max(10, Math.round(50 - (lvl - 1) * 5));

    // Multiplier for display
    const speedMultiplier = (820 / duration).toFixed(1);

    return { swapCount, duration, gapDelay, speedMultiplier };
  }

  getCupCountForLevel(lvl) {
    if (lvl >= 8) return 5;
    if (lvl >= 5) return 4;
    return 3;
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
    this.cleanupScene();

    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 380;

    // Scene with transparent background so the CSS radial aura shines through
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Camera with enhanced wide-angle framing
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 4.2, 6.8);
    this.camera.lookAt(0, 0.5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.canvas = this.renderer.domElement;
    this.canvas.className = 'w-full h-full block cursor-default select-none outline-none';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    // High-Visibility Multi-Light Setup
    // 1. Ambient Fill Light (Soft bright bluish illumination)
    const ambientLight = new THREE.AmbientLight(0xD0DEFF, 0.95);
    this.scene.add(ambientLight);

    // 2. Primary Key Light (Directional from front-top)
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.4);
    dirLight.position.set(3, 9, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // 3. Electric Cyan Rim Light (Backlight separating cups from background)
    const rimLight = new THREE.DirectionalLight(0x38BDF8, 1.2);
    rimLight.position.set(-4, 6, -5);
    this.scene.add(rimLight);

    // 4. Overhead Table Spotlight (Creates focused glow on the arena platform)
    const centerSpot = new THREE.PointLight(0x818CF8, 1.0, 14);
    centerSpot.position.set(0, 5, 0.5);
    this.scene.add(centerSpot);

    // Build Table Surface
    this.buildTable();

    // Build Cups & Ball
    this.buildGameObjects();

    // Start Render Loop
    this.lastTime = performance.now();
    this.animate = this.renderLoop.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  // Create High-Contrast Table Texture with Concentric Energy Rings
  createTableTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // High-contrast frosted slate base
    ctx.fillStyle = '#161F36';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle radial gradient center
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
    grad.addColorStop(0, 'rgba(40, 75, 170, 0.45)');
    grad.addColorStop(0.6, 'rgba(25, 40, 90, 0.2)');
    grad.addColorStop(1, 'rgba(16, 22, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Concentric guideline rings
    const rings = [65, 130, 195, 235];
    rings.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === rings.length - 1 ? 'rgba(65, 105, 255, 0.85)' : 'rgba(70, 100, 180, 0.45)';
      ctx.lineWidth = idx === rings.length - 1 ? 3 : 1.5;
      ctx.stroke();
    });

    // Radial guideline crosshairs
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(angle) * 160, 256 + Math.sin(angle) * 160);
      ctx.lineTo(256 + Math.cos(angle) * 235, 256 + Math.sin(angle) * 235);
      ctx.strokeStyle = 'rgba(65, 105, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  buildTable() {
    this.tableTexture = this.createTableTexture();

    // Pedestal cylinder
    const tableGeom = new THREE.CylinderGeometry(5.2, 5.4, 0.12, 64);
    const tableMat = new THREE.MeshStandardMaterial({
      map: this.tableTexture,
      color: 0x1A2542,
      metalness: 0.45,
      roughness: 0.35
    });
    this.tableMesh = new THREE.Mesh(tableGeom, tableMat);
    this.tableMesh.position.y = -0.06;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Glowing Cobalt Outer Edge Ring
    const edgeTorusGeom = new THREE.TorusGeometry(5.2, 0.035, 16, 64);
    const edgeTorusMat = new THREE.MeshBasicMaterial({ color: 0x4169FF });
    const edgeTorus = new THREE.Mesh(edgeTorusGeom, edgeTorusMat);
    edgeTorus.rotation.x = Math.PI / 2;
    edgeTorus.position.y = 0.005;
    this.scene.add(edgeTorus);

    // Inner Luminous Cyan Boundary Ring
    const innerRingGeom = new THREE.RingGeometry(3.8, 3.84, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.01;
    this.scene.add(innerRingMesh);
  }

  // Create High-Contrast Cup Letter Badge ("A", "B", "C", "D", "E")
  createCupBadge(letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Outer glow disc
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#1A2952';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4169FF';
    ctx.stroke();

    // Crisp white bold letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 67);

    const texture = new THREE.CanvasTexture(canvas);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95
    });
    const badgeGeom = new THREE.CircleGeometry(0.18, 24);
    const badgeMesh = new THREE.Mesh(badgeGeom, badgeMat);
    badgeMesh.position.set(0, 0.65, 0.388); // Flush on front of cup
    return badgeMesh;
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
    const cupCount = this.getCupCountForLevel(this.level);

    // Calculate slot positions with comfortable spacing
    this.slots = [];
    const spacing = cupCount === 3 ? 1.9 : cupCount === 4 ? 1.5 : 1.35;
    const startX = -((cupCount - 1) * spacing) / 2;
    for (let i = 0; i < cupCount; i++) {
      this.slots.push(startX + i * spacing);
    }

    // Shared Geometries & Materials
    this.cupGeom = this.createHollowCupGeometry();
    this.rimGeom = new THREE.TorusGeometry(0.47, 0.024, 16, 36);
    this.midRingGeom = new THREE.CylinderGeometry(0.385, 0.385, 0.03, 36);
    this.topCapGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 36);
    this.topGemGeom = new THREE.SphereGeometry(0.08, 16, 16);

    // Vibrant Royal Cobalt Titanium Cup Body
    this.cupMat = new THREE.MeshStandardMaterial({
      color: 0x3460B8,
      metalness: 0.72,
      roughness: 0.18,
      emissive: 0x162A58,
      emissiveIntensity: 0.35
    });

    // High-Contrast Polished Chrome Silver Trim
    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0xF1F5F9,
      metalness: 0.95,
      roughness: 0.10
    });

    // Top Gem Beacon Material (Cyan)
    const gemMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

    // Radiant 24K Gold Ball
    this.ballGeom = new THREE.SphereGeometry(0.20, 32, 24);
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.12,
      emissive: 0x885500,
      emissiveIntensity: 0.4
    });

    this.ball = new THREE.Mesh(this.ballGeom, this.ballMat);
    this.ball.castShadow = true;
    this.ball.receiveShadow = true;
    this.ball.position.set(0, 0.20, 0);
    this.ball.visible = false;
    this.scene.add(this.ball);

    // Build Cups
    this.cups = [];
    this.cupPositionMap = {};

    const cupLetters = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 0; i < cupCount; i++) {
      const cupId = `cup-${i}`;
      const letter = cupLetters[i];
      const group = new THREE.Group();
      group.userData = { cupId, slotIndex: i, letter };

      // Main hollow body
      const cupMesh = new THREE.Mesh(this.cupGeom, this.cupMat.clone());
      cupMesh.castShadow = true;
      cupMesh.receiveShadow = true;
      group.add(cupMesh);

      // Bottom chrome lip
      const rimMesh = new THREE.Mesh(this.rimGeom, this.rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = 0.025;
      rimMesh.castShadow = true;
      group.add(rimMesh);

      // Mid-height chrome accent band
      const midRingMesh = new THREE.Mesh(this.midRingGeom, this.rimMat);
      midRingMesh.position.y = 0.65;
      group.add(midRingMesh);

      // Top chrome cap
      const topCapMesh = new THREE.Mesh(this.topCapGeom, this.rimMat);
      topCapMesh.position.y = 1.30;
      group.add(topCapMesh);

      // Top illuminated cyan gem beacon
      const gemMesh = new THREE.Mesh(this.topGemGeom, gemMat);
      gemMesh.position.y = 1.33;
      group.add(gemMesh);

      // Illuminated Cup Letter Badge
      const badgeMesh = this.createCupBadge(letter);
      group.add(badgeMesh);

      // Position group at slot
      group.position.set(this.slots[i], 0, 0);
      this.scene.add(group);

      this.cups.push({
        id: cupId,
        group,
        mesh: cupMesh,
        rim: rimMesh,
        badge: badgeMesh,
        currentSlot: i,
        baseY: 0
      });

      this.cupPositionMap[i] = cupId;
    }
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
      cupObj.mesh.material.emissive.setHex(0x2856B8);
      cupObj.mesh.material.emissiveIntensity = 0.65;
    }
  }

  clearHover() {
    if (this.hoveredCup && this.hoveredCup.mesh && this.hoveredCup.mesh.material) {
      this.hoveredCup.mesh.material.emissive.setHex(0x162A58);
      this.hoveredCup.mesh.material.emissiveIntensity = 0.35;
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
    this.ball.position.set(targetCup.group.position.x, 0.20, targetCup.group.position.z);
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
          }, 300);
        });
      }, 1500);
    });
  }

  rebuildSceneForLevel() {
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
    const config = this.getShuffleConfigForLevel(this.level);
    this.swapQueue = [];
    const numSlots = this.slots.length;

    let lastA = -1;
    let lastB = -1;

    for (let s = 0; s < config.swapCount; s++) {
      let slotA = Math.floor(Math.random() * numSlots);
      let slotB = Math.floor(Math.random() * numSlots);
      while (slotB === slotA || (slotA === lastA && slotB === lastB) || (slotA === lastB && slotB === lastA)) {
        slotB = Math.floor(Math.random() * numSlots);
      }
      lastA = slotA;
      lastB = slotB;

      this.swapQueue.push({ slotA, slotB, duration: config.duration, gapDelay: config.gapDelay });
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

    if (window.soundFx) {
      window.soundFx.playShuffle(swap.duration);
    }

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
      gapDelay: swap.gapDelay,
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
    this.ball.position.set(targetCup.group.position.x, 0.20, targetCup.group.position.z);

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
      this.animateLift(selectedCup, 1.8, -0.15, 500, () => {
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
      this.animateLift(selectedCup, 1.8, -0.15, 500, () => {
        setTimeout(() => {
          if (window.soundFx) window.soundFx.playLift();
          this.ball.visible = true;
          this.animateLift(targetCup, 1.8, -0.15, 500, () => {
            setTimeout(() => {
              this.showGameOverModal();
            }, 800);
          });
        }, 350);
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

      // Smooth step easing
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

        const gap = this.activeSwap.gapDelay;
        this.activeSwap = null;

        // Dynamic inter-swap gap scaled with level
        setTimeout(() => {
          this.processNextSwap();
        }, gap);
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
    const config = this.getShuffleConfigForLevel(this.level);
    const lvlEl = document.getElementById('shellshuffle-hud-level');
    const speedEl = document.getElementById('shellshuffle-hud-speed');
    const scoreEl = document.getElementById('shellshuffle-hud-score');
    const streakEl = document.getElementById('shellshuffle-hud-streak');
    const cupsCountEl = document.getElementById('shellshuffle-hud-cups');

    if (lvlEl) lvlEl.innerText = this.level.toString();
    if (speedEl) speedEl.innerText = `${config.speedMultiplier}x`;
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
    this.cups.forEach((c) => {
      c.group.position.set(this.slots[c.currentSlot], 0, 0);
      c.group.rotation.set(0, 0, 0);
      if (c.mesh && c.mesh.material) {
        c.mesh.material.emissive.setHex(0x162A58);
        c.mesh.material.emissiveIntensity = 0.35;
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
