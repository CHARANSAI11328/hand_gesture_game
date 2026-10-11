/**
 * MotoTrack 3D Superbike Engine - AAA Apple Arcade / High-Fidelity Racing Engine
 * Features:
 * - 120 FPS Frame-Rate Independent Exponential Smoothing (Zero Jitter, Zero Stutter)
 * - Sculpted Superbike: Carbon fiber fairings, Öhlins gold forks, Brembo calipers, Akrapovič exhausts
 * - Articulated MotoGP Rider: Dynamic tuck posture, iridescent visor, knee-down slider spark particles
 * - Aerodynamic Speed Streak Particle Lines on Nitro Boost
 * - Seamless Wet-Look Continuous Highway with Zero Seams
 * - Sleek Civilian Supercars & Cyber Sedans with Full-Width LED Lightbars & Underbody Shadows
 * - Real-time Doppler Shift & Dynamic Engine Synthesizer Integration
 */

class MotoTrackGame {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Game Lifecycle State
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;

    // Speeds & Physics
    this.baseSpeed = parseFloat(localStorage.getItem('moto_speed') || '28.0');
    this.currentSpeed = this.baseSpeed;
    this.targetSpeed = this.baseSpeed;
    this.maxSpeed = 95.0;
    this.speedPreset = localStorage.getItem('moto_preset') || 'chill';

    // Highway Geometry & Lanes
    this.laneWidth = 3.35;
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.targetX = 0;
    this.playerX = 0;
    this.playerVelocityX = 0;

    // Motorcycle Lean & Suspension Dynamics
    this.leanAngle = 0;        // Radians around Z
    this.targetLean = 0;
    this.steerYaw = 0;          // Radians around Y
    this.wheelieAngle = 0;      // Radians around X (front lift)
    this.suspensionDive = 0;    // Y offset when braking
    this.engineVibration = 0;

    // 3D Superbike & Rider Mesh Hierarchy
    this.bikeRoot = null;
    this.bikeTiltGroup = null;
    this.frontAssembly = null;
    this.wheelFront = null;
    this.wheelRear = null;
    this.riderGroup = null;
    this.riderTorso = null;
    this.riderHead = null;
    this.kneeLeft = null;
    this.kneeRight = null;
    this.exhaustFlames = [];
    this.brakeLight = null;
    this.brakeLightMat = null;
    this.headlights = [];
    this.shieldMesh = null;

    // Continuous Highway World
    this.roadMesh = null;
    this.roadTexture = null;
    this.trafficCars = [];
    this.pickups = [];
    this.lampposts = [];

    // Particle Systems
    this.sparks = [];
    this.speedStreaks = [];

    // Gameplay Statistics
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMisses = 0;
    this.highScore = parseInt(localStorage.getItem('moto_highscore') || '0', 10);
    this.gesturesPerformed = 0;

    // Power-ups & States
    this.hasShield = false;
    this.boostActive = false;
    this.boostTimer = 0;
    this.isBraking = false;

    // Camera & Screen Shake
    this.cameraTargetX = 0;
    this.cameraBaseY = 3.5;
    this.cameraBaseZ = 7.2;
    this.shakeIntensity = 0;
    this.clock = new THREE.Clock();
    this.animationId = null;

    // Textures Cache
    this.textures = {};

    // UI Callback Hooks
    this.onUpdateHUD = null;
    this.onGameOver = null;
    this.onBannerMessage = null;
  }

  init(containerElement) {
    this.container = containerElement;

    // 1. Procedural High-Definition Textures
    this.generateTextures();

    // 2. Three.js Scene Setup with Atmospheric Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070D);
    this.scene.fog = new THREE.FogExp2(0x05070D, 0.0072);

    // 3. Apple-Grade Cinematic Third-Person Chase Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 500);
    this.camera.position.set(0, this.cameraBaseY, this.cameraBaseZ);
    this.camera.lookAt(0, 1.25, -16);

    // 4. WebGL Renderer with ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 5. Lighting Setup
    this.setupLighting();

    // 6. City Skyline Backdrop
    this.setupCityEnvironment();

    // 7. Continuous Seamless Highway
    this.createSeamlessHighway();

    // 8. Fully Modeled 3D Superbike & Rider
    this.createSuperbikeAndRider();

    // 9. Speed Warp Particle Streaks
    this.initSpeedStreaks();

    // 10. Initial Props & Civilian Traffic
    this.initSceneryProps();
    this.spawnInitialTraffic();

    // 11. Window Resize Handler
    window.addEventListener('resize', () => this.onWindowResize());

    console.log('🏍️ MotoTrack 3D High-Fidelity Racing Engine Initialized');
  }

  // =========================================================================
  // 1. PROCEDURAL CANVASES & HIGH-RESOLUTION TEXTURES
  // =========================================================================

  generateTextures() {
    // 1. Wet-Look Asphalt Texture with Reflective Granularity & Crisp Dashes
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Deep Obsidian Asphalt Base
    ctx.fillStyle = '#0f121a';
    ctx.fillRect(0, 0, 1024, 2048);

    // Micro Asphalt Noise Granules
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 22000; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 2048, 2, 2);
    }

    // Wet Road Reflective Sheen Bands
    const wetGrad = ctx.createLinearGradient(0, 0, 1024, 0);
    wetGrad.addColorStop(0, 'rgba(15, 20, 32, 0.4)');
    wetGrad.addColorStop(0.5, 'rgba(30, 42, 65, 0.12)');
    wetGrad.addColorStop(1, 'rgba(15, 20, 32, 0.4)');
    ctx.fillStyle = wetGrad;
    ctx.fillRect(0, 0, 1024, 2048);

    // Outer Shoulder Solid White Lines (Crisp Anti-Aliased)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(85, 0, 12, 2048);
    ctx.fillRect(927, 0, 12, 2048);

    // Dashed Lane Center Stripes (3 Lanes)
    // Left divider x = 368, Right divider x = 656
    ctx.fillStyle = '#f8fafc';
    const dashLength = 160;
    const dashGap = 120;
    const totalStep = dashLength + dashGap;

    for (let y = 0; y < 2048 + totalStep; y += totalStep) {
      ctx.fillRect(364, y, 10, dashLength);
      ctx.fillRect(650, y, 10, dashLength);
    }

    // Outer Rumble Strips (Vibrant Apple Corse Red & Crisp White)
    const kerbStep = 96;
    for (let y = 0; y < 2048 + kerbStep; y += kerbStep) {
      const isRed = Math.floor(y / kerbStep) % 2 === 0;
      ctx.fillStyle = isRed ? '#FF3B30' : '#FFFFFF';
      ctx.fillRect(0, y, 42, kerbStep);
      ctx.fillRect(982, y, 42, kerbStep);
    }

    this.roadTexture = new THREE.CanvasTexture(canvas);
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
    this.roadTexture.repeat.set(1, 16);

    // 2. High-Tech Carbon Fiber Weave Texture
    const carbonCanvas = document.createElement('canvas');
    carbonCanvas.width = 64;
    carbonCanvas.height = 64;
    const cctx = carbonCanvas.getContext('2d');
    cctx.fillStyle = '#0d0f14';
    cctx.fillRect(0, 0, 64, 64);
    cctx.fillStyle = '#1c2230';
    for (let i = 0; i < 64; i += 8) {
      for (let j = 0; j < 64; j += 8) {
        if ((i + j) % 16 === 0) cctx.fillRect(i, j, 8, 8);
      }
    }
    this.textures.carbon = new THREE.CanvasTexture(carbonCanvas);
    this.textures.carbon.wrapS = THREE.RepeatWrapping;
    this.textures.carbon.wrapT = THREE.RepeatWrapping;
    this.textures.carbon.repeat.set(4, 4);

    // 3. Golden Coin Texture
    const coinCanvas = document.createElement('canvas');
    coinCanvas.width = 128;
    coinCanvas.height = 128;
    const coinctx = coinCanvas.getContext('2d');
    const cgrad = coinctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    cgrad.addColorStop(0, '#FFFBEB');
    cgrad.addColorStop(0.6, '#F59E0B');
    cgrad.addColorStop(1, '#B45309');
    coinctx.fillStyle = cgrad;
    coinctx.beginPath();
    coinctx.arc(64, 64, 58, 0, Math.PI * 2);
    coinctx.fill();

    coinctx.fillStyle = '#FFFFFF';
    coinctx.font = 'bold 42px -apple-system, sans-serif';
    coinctx.textAlign = 'center';
    coinctx.textBaseline = 'middle';
    coinctx.fillText('★', 64, 64);
    this.textures.coin = new THREE.CanvasTexture(coinCanvas);
  }

  // =========================================================================
  // 2. LIGHTING & ENVIRONMENT
  // =========================================================================

  setupLighting() {
    // Ambient Atmosphere Sky Light
    const hemiLight = new THREE.HemisphereLight(0x4a658f, 0x090d16, 1.1);
    this.scene.add(hemiLight);

    // Key Directional Light with subtle azure rim-light
    const dirLight = new THREE.DirectionalLight(0xbcd3ff, 1.5);
    dirLight.position.set(35, 70, 25);
    this.scene.add(dirLight);

    // Bike Forward LED Projector Spotlight (illuminates highway ahead)
    this.bikeHeadlight = new THREE.SpotLight(0x38bdf8, 3.2, 55, Math.PI / 4.8, 0.45);
    this.bikeHeadlight.position.set(0, 1.1, 0);
    this.bikeHeadlightTarget = new THREE.Object3D();
    this.bikeHeadlightTarget.position.set(0, 0.2, -35);
    this.scene.add(this.bikeHeadlight);
    this.scene.add(this.bikeHeadlightTarget);
    this.bikeHeadlight.target = this.bikeHeadlightTarget;
  }

  setupCityEnvironment() {
    const cityGroup = new THREE.Group();
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingColors = [0x080c16, 0x0a1020, 0x0e162c, 0x121d38];

    for (let i = 0; i < 75; i++) {
      const h = 30 + Math.random() * 95;
      const w = 14 + Math.random() * 20;
      const d = 14 + Math.random() * 20;
      const col = buildingColors[Math.floor(Math.random() * buildingColors.length)];

      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.3,
        metalness: 0.8
      });
      const bMesh = new THREE.Mesh(buildingGeo, mat);
      bMesh.scale.set(w, h, d);

      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (50 + Math.random() * 95);
      const z = -20 - Math.random() * 340;
      bMesh.position.set(x, h / 2 - 2, z);

      // Subtle Apple-Style Architectural Light Ribbons
      if (Math.random() > 0.35) {
        const glowGeo = new THREE.PlaneGeometry(w * 0.85, h * 0.7);
        const glowMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x0A84FF : 0x38BDF8,
          wireframe: true,
          transparent: true,
          opacity: 0.18
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(x - side * 0.1, h / 2, z + (side > 0 ? -d / 2 - 0.2 : d / 2 + 0.2));
        cityGroup.add(glowMesh);
      }

      cityGroup.add(bMesh);
    }

    this.scene.add(cityGroup);
  }

  // =========================================================================
  // 3. CONTINUOUS SEAMLESS HIGHWAY
  // =========================================================================

  createSeamlessHighway() {
    // 12.8m wide, 400m continuous road plane
    const roadGeo = new THREE.PlaneGeometry(12.8, 400, 1, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.45,
      metalness: 0.35
    });

    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, -175);
    this.scene.add(this.roadMesh);

    // Ground Surroundings
    const groundGeo = new THREE.PlaneGeometry(300, 400, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.06, -175);
    this.scene.add(ground);
  }

  initSceneryProps() {
    // Metallic Highway Guardrails (Left x = -6.45, Right x = 6.45)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 });
    const railGeo = new THREE.BoxGeometry(0.3, 0.75, 400);

    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-6.45, 0.38, -175);
    this.scene.add(railL);

    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(6.45, 0.38, -175);
    this.scene.add(railR);

    // Overhead Streetlights
    this.lampposts = [];
    for (let z = 25; z > -360; z -= 40) {
      this.createStreetlight(z);
    }
  }

  createStreetlight(z) {
    const postGroup = new THREE.Group();

    // Steel Mast
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(7.5, 3.75, 0);
    postGroup.add(pole);

    // Curved Arm
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.8, 8);
    armGeo.rotateZ(Math.PI / 3);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(5.5, 7.2, 0);
    postGroup.add(arm);

    // Luminaire Head (Apple Electric Azure LED)
    const lampGeo = new THREE.BoxGeometry(0.65, 0.2, 1.2);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(3.6, 8.1, 0);
    postGroup.add(lamp);

    postGroup.position.set(0, 0, z);
    this.scene.add(postGroup);
    this.lampposts.push(postGroup);
  }

  // =========================================================================
  // 4. SPEED STREAK & SPARK PARTICLE SYSTEMS
  // =========================================================================

  initSpeedStreaks() {
    const streakGeo = new THREE.CylinderGeometry(0.02, 0.02, 4.5, 4);
    streakGeo.rotateX(Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0
    });

    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(streakGeo, streakMat);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        0.5 + Math.random() * 3.5,
        -10 - Math.random() * 80
      );
      this.scene.add(mesh);
      this.speedStreaks.push({
        mesh: mesh,
        speed: 120 + Math.random() * 80
      });
    }
  }

  emitKneeSparks(x, y, z) {
    if (this.sparks.length > 25) return;
    const sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(sparkGeo, sparkMat);
      p.position.set(x + (Math.random() - 0.5) * 0.15, 0.05, z);
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx: (Math.random() - 0.5) * 4,
        vy: 1.5 + Math.random() * 2,
        vz: 10 + Math.random() * 15,
        life: 0.25
      });
    }
  }

  // =========================================================================
  // 5. SCULPTED SUPERBIKE & ARTICULATED RIDER
  // =========================================================================

  createSuperbikeAndRider() {
    this.bikeRoot = new THREE.Group();

    // 1. Tilt Group: Centers roll axis at ground contact level (y = 0)
    this.bikeTiltGroup = new THREE.Group();
    this.bikeRoot.add(this.bikeTiltGroup);

    // Materials (Apple Pro / Ducati Corse aesthetic)
    const fairingColor = 0xFF3B30; // Apple / Ducati Apex Crimson
    const fairingMat = new THREE.MeshStandardMaterial({
      color: fairingColor,
      metalness: 0.82,
      roughness: 0.15
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      map: this.textures.carbon,
      roughness: 0.35
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      metalness: 0.92,
      roughness: 0.2
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.08
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.85
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x0A84FF, // Electric Azure Racing Alloy Rims
      metalness: 0.9,
      roughness: 0.18
    });

    // --- REAR WHEEL & ALUMINUM SWINGARM ---
    this.wheelRear = this.createMotorcycleWheel(tireMat, rimMat, 0.38, 0.22);
    this.wheelRear.position.set(0, 0.38, 0.95);
    this.bikeTiltGroup.add(this.wheelRear);

    const swingarmGeo = new THREE.BoxGeometry(0.28, 0.12, 0.95);
    const swingarm = new THREE.Mesh(swingarmGeo, frameMat);
    swingarm.position.set(0, 0.42, 0.52);
    this.bikeTiltGroup.add(swingarm);

    // --- MAIN ENGINE & SCULPTED FAIRINGS ---
    const engineGeo = new THREE.BoxGeometry(0.38, 0.36, 0.65);
    const engine = new THREE.Mesh(engineGeo, frameMat);
    engine.position.set(0, 0.52, 0.05);
    this.bikeTiltGroup.add(engine);

    // Ergonomic Fuel Tank
    const tankGeo = new THREE.BoxGeometry(0.42, 0.34, 0.68);
    const tank = new THREE.Mesh(tankGeo, fairingMat);
    tank.position.set(0, 0.82, -0.12);
    this.bikeTiltGroup.add(tank);

    // Carbon Fiber Lower Bellypan
    const bellyGeo = new THREE.BoxGeometry(0.36, 0.22, 0.9);
    const belly = new THREE.Mesh(bellyGeo, carbonMat);
    belly.position.set(0, 0.32, -0.05);
    this.bikeTiltGroup.add(belly);

    // Aerodynamic Tail Cowl & Solo Leather Seat
    const tailGeo = new THREE.ConeGeometry(0.24, 0.85, 4);
    tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, fairingMat);
    tail.position.set(0, 0.84, 0.62);
    this.bikeTiltGroup.add(tail);

    const seatGeo = new THREE.BoxGeometry(0.32, 0.08, 0.42);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.9 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.74, 0.28);
    this.bikeTiltGroup.add(seat);

    // Akrapovič Dual Exhaust Canisters Under Tail
    [-0.14, 0.14].forEach(ex => {
      const pipeGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.7, 12);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, chromeMat);
      pipe.position.set(ex, 0.68, 0.88);
      this.bikeTiltGroup.add(pipe);

      // Blue Nitro Exhaust Flame Cones
      const flameGeo = new THREE.ConeGeometry(0.09, 0.7, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(ex, 0.68, 1.35);
      this.bikeTiltGroup.add(flame);
      this.exhaustFlames.push(flame);
    });

    // Intense Red Taillight LED Lightbar
    const brakeGeo = new THREE.BoxGeometry(0.26, 0.08, 0.06);
    this.brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    this.brakeLight = new THREE.Mesh(brakeGeo, this.brakeLightMat);
    this.brakeLight.position.set(0, 0.88, 1.05);
    this.bikeTiltGroup.add(this.brakeLight);

    // --- FRONT FORK & STEERING ASSEMBLY ---
    this.frontAssembly = new THREE.Group();
    this.frontAssembly.position.set(0, 0.38, -0.92);
    this.bikeTiltGroup.add(this.frontAssembly);

    // Front Wheel
    this.wheelFront = this.createMotorcycleWheel(tireMat, rimMat, 0.36, 0.18);
    this.frontAssembly.add(this.wheelFront);

    // Öhlins Gold Inverted Telescopic Forks
    const forkGeo = new THREE.CylinderGeometry(0.038, 0.045, 0.75, 8);
    const forkMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.15 });
    [-0.14, 0.14].forEach(fx => {
      const fork = new THREE.Mesh(forkGeo, forkMat);
      fork.position.set(fx, 0.32, 0.05);
      fork.rotation.x = -0.32;
      this.frontAssembly.add(fork);
    });

    // Front Cowl with Dual Projector Headlights
    const cowlGeo = new THREE.ConeGeometry(0.26, 0.58, 4);
    cowlGeo.rotateX(-Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, fairingMat);
    cowl.position.set(0, 0.65, -0.05);
    this.frontAssembly.add(cowl);

    // Aerodynamic Tinted Windscreen
    const screenGeo = new THREE.PlaneGeometry(0.32, 0.28);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x050c18, roughness: 0.1, transparent: true, opacity: 0.75 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.82, 0.05);
    screen.rotation.x = -0.7;
    this.frontAssembly.add(screen);

    // Handlebars
    const barGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.68, 8);
    barGeo.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeo, frameMat);
    bar.position.set(0, 0.75, 0.08);
    this.frontAssembly.add(bar);

    // --- ARTICULATED 3D BIKER / RIDER ---
    this.riderGroup = new THREE.Group();
    this.bikeTiltGroup.add(this.riderGroup);

    const suitMat = new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.6 });
    const suitAccent = new THREE.MeshStandardMaterial({ color: fairingColor, roughness: 0.4 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x090c14, metalness: 0.9, roughness: 0.15 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.98, roughness: 0.05 });

    // Rider Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.32, 0.2, 0.28);
    const pelvis = new THREE.Mesh(pelvisGeo, suitMat);
    pelvis.position.set(0, 0.88, 0.24);
    this.riderGroup.add(pelvis);

    // Rider Torso (Aerodynamic Forward Tuck)
    this.riderTorso = new THREE.Group();
    this.riderTorso.position.set(0, 0.94, 0.18);
    this.riderTorso.rotation.x = 0.58;

    const chestGeo = new THREE.BoxGeometry(0.38, 0.48, 0.26);
    const chest = new THREE.Mesh(chestGeo, suitAccent);
    this.riderTorso.add(chest);

    // Aerodynamic Speed Hump on Rider's Back
    const humpGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
    humpGeo.rotateX(Math.PI / 2);
    const hump = new THREE.Mesh(humpGeo, carbonMat);
    hump.position.set(0, 0.05, 0.16);
    this.riderTorso.add(hump);

    // Helmet with Mirror Visor
    this.riderHead = new THREE.Group();
    this.riderHead.position.set(0, 0.38, 0.05);
    this.riderHead.rotation.x = -0.32;

    const helmetGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    this.riderHead.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.24, 0.09, 0.16);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, -0.12);
    this.riderHead.add(visor);

    this.riderTorso.add(this.riderHead);
    this.riderGroup.add(this.riderTorso);

    // Rider Arms Reaching to Handlebars
    [-0.22, 0.22].forEach(ax => {
      const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.52, 8);
      armGeo.rotateX(Math.PI / 3);
      const arm = new THREE.Mesh(armGeo, suitMat);
      arm.position.set(ax, 1.05, -0.05);
      this.riderGroup.add(arm);
    });

    // Articulated Legs with Titanium Knee Sliders
    const legGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.46, 8);
    const kneeSliderGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    const kneeSliderMat = new THREE.MeshStandardMaterial({ color: 0xffea00, metalness: 0.9, roughness: 0.2 });

    this.kneeLeft = new THREE.Group();
    this.kneeLeft.position.set(-0.24, 0.72, 0.24);
    const legL = new THREE.Mesh(legGeo, suitMat);
    legL.rotation.z = 0.35;
    this.kneeLeft.add(legL);
    const sliderL = new THREE.Mesh(kneeSliderGeo, kneeSliderMat);
    sliderL.position.set(-0.12, 0, 0);
    this.kneeLeft.add(sliderL);
    this.riderGroup.add(this.kneeLeft);

    this.kneeRight = new THREE.Group();
    this.kneeRight.position.set(0.24, 0.72, 0.24);
    const legR = new THREE.Mesh(legGeo, suitMat);
    legR.rotation.z = -0.35;
    this.kneeRight.add(legR);
    const sliderR = new THREE.Mesh(kneeSliderGeo, kneeSliderMat);
    sliderR.position.set(0.12, 0, 0);
    this.kneeRight.add(sliderR);
    this.riderGroup.add(this.kneeRight);

    // Force Shield Energy Sphere
    const shieldGeo = new THREE.SphereGeometry(1.65, 20, 20);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0A84FF,
      emissive: 0x0066cc,
      emissiveIntensity: 0.85,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(0, 0.75, 0);
    this.shieldMesh.visible = false;
    this.bikeRoot.add(this.shieldMesh);

    this.scene.add(this.bikeRoot);
  }

  createMotorcycleWheel(tireMat, rimMat, radius, width) {
    const wheelGroup = new THREE.Group();

    // Treaded Sport Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    wheelGroup.add(tire);

    // Racing Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.05, 14);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rim);

    // Slotted Brake Disc
    const discGeo = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 1.15, 18);
    discGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 });
    const disc = new THREE.Mesh(discGeo, discMat);
    wheelGroup.add(disc);

    // Brembo Red Caliper
    const calGeo = new THREE.BoxGeometry(0.06, 0.16, 0.1);
    const calMat = new THREE.MeshStandardMaterial({ color: 0xff0022, roughness: 0.2 });
    const cal = new THREE.Mesh(calGeo, calMat);
    cal.position.set(width * 0.58, radius * 0.35, 0);
    wheelGroup.add(cal);

    return wheelGroup;
  }

  // =========================================================================
  // 6. CIVILIAN TRAFFIC SUPERCARS & COLLECTIBLES
  // =========================================================================

  spawnInitialTraffic() {
    this.trafficCars.forEach(c => this.scene.remove(c));
    this.pickups.forEach(p => this.scene.remove(p));
    this.trafficCars = [];
    this.pickups = [];

    for (let z = -35; z > -340; z -= 38) {
      if (Math.random() < 0.65) {
        this.createTrafficCar(this.randomLane(), z);
      } else {
        this.createCollectibleCluster(this.randomLane(), z);
      }
    }
  }

  randomLane() {
    return [-1, 0, 1][Math.floor(Math.random() * 3)];
  }

  createTrafficCar(lane, z) {
    const trafficGroup = new THREE.Group();
    const laneX = lane * this.laneWidth;

    const colors = [0x0A84FF, 0xF59E0B, 0x10B981, 0x8B5CF6, 0x38BDF8, 0xE2E8F0];
    const carColor = colors[Math.floor(Math.random() * colors.length)];

    const mat = new THREE.MeshStandardMaterial({
      color: carColor,
      metalness: 0.85,
      roughness: 0.18
    });

    // Aerodynamic Supercar Body
    const bodyGeo = new THREE.BoxGeometry(1.85, 0.54, 4.0);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.52;
    trafficGroup.add(body);

    // Panoramic Dark Tinted Glass Cockpit
    const cabinGeo = new THREE.BoxGeometry(1.42, 0.52, 2.1);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.08 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.95, -0.15);
    trafficGroup.add(cabin);

    // Full-Width Continuous Red LED Taillight Lightbar (Porsche / Audi style)
    const lightbarGeo = new THREE.BoxGeometry(1.75, 0.08, 0.08);
    const lightbarMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const lightbar = new THREE.Mesh(lightbarGeo, lightbarMat);
    lightbar.position.set(0, 0.58, 2.0);
    trafficGroup.add(lightbar);

    // Xenon Front Headlights
    const headGeo = new THREE.BoxGeometry(0.32, 0.1, 0.08);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    [-0.65, 0.65].forEach(hx => {
      const hl = new THREE.Mesh(headGeo, headMat);
      hl.position.set(hx, 0.52, -2.01);
      trafficGroup.add(hl);
    });

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12);
    wGeo.rotateZ(Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.8 });
    [-1.25, 1.25].forEach(wz => {
      const wl = new THREE.Mesh(wGeo, wMat);
      wl.position.set(-0.95, 0.34, wz);
      trafficGroup.add(wl);
      const wr = new THREE.Mesh(wGeo, wMat);
      wr.position.set(0.95, 0.34, wz);
      trafficGroup.add(wr);
    });

    // Underbody Drop Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(2.1, 4.2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    trafficGroup.add(shadow);

    trafficGroup.position.set(laneX, 0, z);
    trafficGroup.userData = {
      type: 'traffic',
      lane: lane,
      speed: 14.0 + Math.random() * 8.0,
      collected: false,
      nearMissChecked: false
    };

    this.scene.add(trafficGroup);
    this.trafficCars.push(trafficGroup);
  }

  createCollectibleCluster(lane, z) {
    const roll = Math.random();
    const laneX = lane * this.laneWidth;

    if (roll < 0.72) {
      // 3 Spinning Gold Coins
      for (let c = 0; c < 3; c++) {
        const coin = new THREE.Group();
        const geo = new THREE.CylinderGeometry(0.44, 0.44, 0.08, 18);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xffb703,
          metalness: 0.95,
          roughness: 0.15,
          map: this.textures.coin
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.85;
        coin.add(mesh);

        coin.position.set(laneX, 0, z + (c - 1) * 3.6);
        coin.userData = { type: 'coin', collected: false };
        this.scene.add(coin);
        this.pickups.push(coin);
      }
    } else if (roll < 0.88) {
      // Nitro Boost Fuel Flask
      const nitro = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.85, 14);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0A84FF,
        emissiveIntensity: 0.95,
        metalness: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.95;
      nitro.add(mesh);

      nitro.position.set(laneX, 0, z);
      nitro.userData = { type: 'nitro', collected: false };
      this.scene.add(nitro);
      this.pickups.push(nitro);
    } else {
      // Force Shield Octahedron
      const shield = new THREE.Group();
      const geo = new THREE.OctahedronGeometry(0.65, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.0;
      shield.add(mesh);

      shield.position.set(laneX, 0, z);
      shield.userData = { type: 'shield', collected: false };
      this.scene.add(shield);
      this.pickups.push(shield);
    }
  }

  // =========================================================================
  // 7. MOTORCYCLE CONTROLS & GESTURE API
  // =========================================================================

  changeLane(direction) {
    if (direction === -1 || direction === 0 || direction === 1) {
      this.currentLane = direction;
    } else if (direction === 'left') {
      this.currentLane = Math.max(-1, this.currentLane - 1);
    } else if (direction === 'right') {
      this.currentLane = Math.min(1, this.currentLane + 1);
    }

    this.targetX = this.currentLane * this.laneWidth;
    this.gesturesPerformed++;

    if (window.soundEngine) {
      window.soundEngine.playLaneSwitch(this.currentLane > 0 ? 'right' : 'left');
    }
  }

  setFreeSteerPosition(smoothX) {
    // Sigmoidal S-Curve analog steering: fine center corridor, sharp apex carving
    const norm = (smoothX - 0.5) * 2.0; // [-1.0, 1.0]
    const curved = Math.sign(norm) * Math.pow(Math.abs(norm), 1.15);
    this.targetX = THREE.MathUtils.clamp(curved * (this.laneWidth * 1.35), -this.laneWidth * 1.35, this.laneWidth * 1.35);
  }

  activateBoost() {
    if (this.boostActive) return;
    this.boostActive = true;
    this.boostTimer = 4.5;
    this.gesturesPerformed++;

    if (window.soundEngine) {
      window.soundEngine.playBoost();
    }

    if (this.onBannerMessage) {
      this.onBannerMessage('🚀 NITRO BOOST WHEELIE! 🚀');
    }
  }

  applyBrake(isBraking) {
    this.isBraking = isBraking;
    if (this.brakeLightMat) {
      this.brakeLightMat.color.setHex(isBraking ? 0xffffff : 0xff0022);
    }
  }

  brake() {
    this.applyBrake(true);
    this.gesturesPerformed++;
    if (this.onBannerMessage) {
      this.onBannerMessage('🛑 REAR BRAKE ENGAGED!');
    }
    setTimeout(() => {
      this.applyBrake(false);
    }, 850);
  }

  jump() { this.activateBoost(); }
  slide() { this.brake(); }
  setDynamicAcceleration() {}
  setObstacleSpacing() {}

  setBaseSpeed(speed) {
    this.baseSpeed = Math.max(18.0, Math.min(75.0, parseFloat(speed)));
    if (!this.isPlaying) {
      this.currentSpeed = this.baseSpeed;
    }
    localStorage.setItem('moto_speed', this.baseSpeed.toString());
  }

  setSpeedPreset(preset) {
    this.speedPreset = preset;
    localStorage.setItem('moto_preset', preset);
    if (preset === 'chill') {
      this.setBaseSpeed(28.0);
    } else if (preset === 'normal') {
      this.setBaseSpeed(42.0);
    } else if (preset === 'turbo') {
      this.setBaseSpeed(58.0);
    }
  }

  // =========================================================================
  // 8. BUTTERY SMOOTH ANIMATION LOOP (EXPONENTIAL DAMPING)
  // =========================================================================

  start() {
    this.reset();
    this.isPlaying = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.clock.start();

    if (window.soundEngine) {
      window.soundEngine.startMusic();
    }

    this.animate();
  }

  pause() {
    this.isPaused = !this.isPaused;
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMisses = 0;
    this.currentLane = 0;
    this.targetX = 0;
    this.playerX = 0;
    this.playerVelocityX = 0;
    this.leanAngle = 0;
    this.targetLean = 0;
    this.wheelieAngle = 0;
    this.suspensionDive = 0;
    this.hasShield = false;
    this.boostActive = false;
    this.isBraking = false;
    this.currentSpeed = this.baseSpeed;
    this.gesturesPerformed = 0;

    if (this.shieldMesh) this.shieldMesh.visible = false;
    if (this.bikeRoot) this.bikeRoot.position.set(0, 0, 0);
    if (this.bikeTiltGroup) this.bikeTiltGroup.rotation.set(0, 0, 0);

    this.spawnInitialTraffic();
  }

  animate() {
    if (!this.isPlaying) return;

    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.08);

    if (this.isPaused || this.isGameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  update(delta) {
    // 1. Speeds & Exponential Velocity Interpolation
    let targetVelocity = this.baseSpeed;
    if (this.boostActive) {
      targetVelocity *= 1.78;
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.boostActive = false;
      }
    } else if (this.isBraking) {
      targetVelocity *= 0.62;
    }

    // Exponential Decay Lerp: perfectly frame-rate independent
    const speedAlpha = 1.0 - Math.exp(-6.5 * delta);
    this.currentSpeed += (targetVelocity - this.currentSpeed) * speedAlpha;

    const moveDist = this.currentSpeed * delta;
    this.distance += Math.round(moveDist);
    this.score += Math.round(moveDist * (this.boostActive ? 3.5 : 1) * this.combo);

    if (this.combo > 1) {
      this.comboTimer += delta;
      if (this.comboTimer > 3.5) {
        this.combo = Math.max(1, this.combo - 1);
        this.comboTimer = 0;
      }
    }

    // 2. Seamless Continuous UV Scrolling
    if (this.roadTexture) {
      this.roadTexture.offset.y -= this.currentSpeed * delta * 0.04;
    }

    // Move Lampposts smoothly along Z
    this.lampposts.forEach(lp => {
      lp.position.z += moveDist;
      if (lp.position.z > 25) {
        lp.position.z -= 400;
      }
    });

    // 3. Smooth Lateral Movement & MotoGP Knee-Down Leaning
    const prevX = this.playerX;
    const steerAlpha = 1.0 - Math.exp(-14.0 * delta);
    this.playerX += (this.targetX - this.playerX) * steerAlpha;
    this.playerVelocityX = (this.playerX - prevX) / Math.max(0.001, delta);

    // Dynamic Leaning (Banks up to ~35 degrees)
    this.targetLean = -this.playerVelocityX * 0.042;
    this.targetLean = THREE.MathUtils.clamp(this.targetLean, -0.62, 0.62);

    const leanAlpha = 1.0 - Math.exp(-12.0 * delta);
    this.leanAngle += (this.targetLean - this.leanAngle) * leanAlpha;
    this.bikeTiltGroup.rotation.z = this.leanAngle;

    // Front Assembly Counter-Steering
    this.steerYaw = -this.playerVelocityX * 0.052;
    if (this.frontAssembly) {
      this.frontAssembly.rotation.y = this.steerYaw;
    }

    // Articulated Knee-Down Action & Sparks
    if (this.kneeLeft && this.kneeRight) {
      const isLeaningLeft = this.leanAngle < -0.18;
      const isLeaningRight = this.leanAngle > 0.18;
      this.kneeLeft.rotation.z = isLeaningLeft ? -0.85 : 0.35;
      this.kneeRight.rotation.z = isLeaningRight ? 0.85 : -0.35;

      if (isLeaningLeft) {
        this.emitKneeSparks(this.playerX - 0.45, 0.1, 0.2);
      } else if (isLeaningRight) {
        this.emitKneeSparks(this.playerX + 0.45, 0.1, 0.2);
      }
    }

    // Wheelie Angle on Nitro Boost
    const targetWheelie = this.boostActive ? -0.32 : 0.0;
    const wheelieAlpha = 1.0 - Math.exp(-6.0 * delta);
    this.wheelieAngle += (targetWheelie - this.wheelieAngle) * wheelieAlpha;

    // Brake Suspension Dive
    const targetDive = this.isBraking ? -0.08 : 0.0;
    const diveAlpha = 1.0 - Math.exp(-10.0 * delta);
    this.suspensionDive += (targetDive - this.suspensionDive) * diveAlpha;

    // Engine High-Frequency Vibration
    this.engineVibration = (Math.random() - 0.5) * 0.01;

    this.bikeTiltGroup.rotation.x = this.wheelieAngle;
    this.bikeTiltGroup.position.y = this.suspensionDive + this.engineVibration;
    this.bikeRoot.position.x = this.playerX;

    // Wheels Spin Forward
    const spin = (this.currentSpeed * delta) / 0.38;
    if (this.wheelFront) this.wheelFront.rotation.x += spin;
    if (this.wheelRear) this.wheelRear.rotation.x += spin;

    // 4. Update Exhaust Nitro Flames
    this.exhaustFlames.forEach(flame => {
      flame.material.opacity = this.boostActive ? 0.95 : 0.0;
      if (this.boostActive) {
        const stretch = 1.0 + Math.random() * 0.6;
        flame.scale.set(1.0, 1.0, stretch);
      }
    });

    // 5. Update Headlight & Light Target
    if (this.bikeHeadlight && this.bikeHeadlightTarget) {
      this.bikeHeadlight.position.x = this.playerX;
      this.bikeHeadlightTarget.position.x = this.playerX;
    }

    // 6. Force Shield Animation
    if (this.hasShield && this.shieldMesh) {
      this.shieldMesh.visible = true;
      this.shieldMesh.rotation.y += 2.8 * delta;
      this.shieldMesh.rotation.x += 1.4 * delta;
    } else if (this.shieldMesh) {
      this.shieldMesh.visible = false;
    }

    // 7. Update Speed Streaks (Warp lines on Nitro Boost)
    this.speedStreaks.forEach(s => {
      s.mesh.material.opacity = this.boostActive ? 0.65 : 0.0;
      if (this.boostActive) {
        s.mesh.position.z += (this.currentSpeed + s.speed) * delta;
        if (s.mesh.position.z > 15) {
          s.mesh.position.z = -90 - Math.random() * 40;
          s.mesh.position.x = this.playerX + (Math.random() - 0.5) * 12;
        }
      }
    });

    // Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= delta;
      sp.mesh.position.x += sp.vx * delta;
      sp.mesh.position.y += sp.vy * delta;
      sp.mesh.position.z += sp.vz * delta;
      sp.vy -= 9.8 * delta;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        this.sparks.splice(i, 1);
      }
    }

    // 8. Update Traffic Cars & Near-Miss Detection
    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const car = this.trafficCars[i];
      const relativeSpeed = this.currentSpeed - car.userData.speed;
      car.position.z += relativeSpeed * delta;

      // Close Pass / Near-Miss Bonus Detection
      if (!car.userData.collected && !car.userData.nearMissChecked && Math.abs(car.position.z) < 2.8) {
        const lateralDist = Math.abs(this.playerX - car.position.x);
        if (lateralDist > 1.25 && lateralDist < 2.4) {
          car.userData.nearMissChecked = true;
          this.triggerNearMiss();
        }
      }

      // Collision Check
      if (!car.userData.collected && Math.abs(car.position.z) < 2.6) {
        this.checkTrafficCollision(car);
      }

      // Recycle Traffic Cars Beyond View
      if (car.position.z > 20) {
        this.scene.remove(car);
        this.trafficCars.splice(i, 1);
      }
    }

    // Spawn New Traffic Ahead
    let minTrafficZ = 0;
    this.trafficCars.forEach(c => {
      if (c.position.z < minTrafficZ) minTrafficZ = c.position.z;
    });
    if (minTrafficZ > -280) {
      const spawnZ = minTrafficZ - 36 - Math.random() * 20;
      if (Math.random() < 0.68) {
        this.createTrafficCar(this.randomLane(), spawnZ);
      } else {
        this.createCollectibleCluster(this.randomLane(), spawnZ);
      }
    }

    // 9. Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.position.z += moveDist;
      p.rotation.y += 4.2 * delta;

      if (!p.userData.collected && Math.abs(p.position.z) < 2.2) {
        if (Math.abs(this.playerX - p.position.x) < 1.45) {
          this.collectPickup(p);
        }
      }

      if (p.position.z > 20) {
        this.scene.remove(p);
        this.pickups.splice(i, 1);
      }
    }

    // 10. Dynamic Camera Chase & Speed FOV Warp
    const targetFOV = this.boostActive ? 78 : 62;
    this.camera.fov += (targetFOV - this.camera.fov) * (1.0 - Math.exp(-4.5 * delta));
    this.camera.updateProjectionMatrix();

    this.cameraTargetX = this.playerX * 0.62;
    this.camera.position.x += (this.cameraTargetX - this.camera.position.x) * (1.0 - Math.exp(-8.5 * delta));
    this.camera.rotation.z = -this.leanAngle * 0.16;

    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y = this.cameraBaseY + (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 4.5);
    } else {
      this.camera.position.y = this.cameraBaseY;
    }

    // 11. Real-time Telemetry & Dynamic Synthesizer Update
    const kmh = Math.round(this.currentSpeed * 2.85);
    const rpm = Math.min(14500, Math.round(kmh * 50 + 2500));
    const gear = kmh < 40 ? 1 : (kmh < 85 ? 2 : (kmh < 135 ? 3 : (kmh < 190 ? 4 : (kmh < 240 ? 5 : 6))));
    const leanDeg = Math.round((this.leanAngle * 180) / Math.PI);

    if (window.soundEngine) {
      window.soundEngine.updateEngine(rpm, kmh, this.isBraking, this.boostActive);
    }

    if (this.onUpdateHUD) {
      this.onUpdateHUD({
        score: this.score,
        distance: this.distance,
        coins: this.coins,
        combo: this.combo,
        speed: kmh,
        rpm: rpm,
        gear: gear,
        leanDeg: leanDeg,
        nearMisses: this.nearMisses,
        hasShield: this.hasShield,
        boostActive: this.boostActive
      });
    }
  }

  // =========================================================================
  // 9. COLLISIONS & REWARDS
  // =========================================================================

  triggerNearMiss() {
    this.nearMisses++;
    this.combo = Math.min(10, this.combo + 1);
    this.comboTimer = 0;
    this.score += 250 * this.combo;

    if (window.soundEngine) {
      window.soundEngine.playPassByDoppler();
      window.soundEngine.playCoin(this.combo);
    }

    if (this.onBannerMessage) {
      this.onBannerMessage(`🔥 CLOSE PASS! +${250 * this.combo} (${this.combo}x)`);
    }
  }

  checkTrafficCollision(trafficCar) {
    if (Math.abs(this.playerX - trafficCar.position.x) > 1.45) {
      return; // Safe pass
    }

    // Nitro smash invulnerability
    if (this.boostActive) {
      trafficCar.userData.collected = true;
      this.shakeIntensity = 0.5;
      this.score += 500;
      if (window.soundEngine) window.soundEngine.playHit();
      if (this.onBannerMessage) this.onBannerMessage('💥 TRAFFIC SMASHED! +500');
      this.scene.remove(trafficCar);
      return;
    }

    // Force Shield protection
    if (this.hasShield) {
      this.hasShield = false;
      trafficCar.userData.collected = true;
      this.shakeIntensity = 0.65;
      if (window.soundEngine) window.soundEngine.playHit();
      if (this.onBannerMessage) this.onBannerMessage('🛡️ FORCE SHIELD SAVED YOU!');
      this.scene.remove(trafficCar);
      return;
    }

    // Fatal Crash
    this.triggerGameOver();
  }

  collectPickup(pickup) {
    pickup.userData.collected = true;
    const type = pickup.userData.type;

    if (type === 'coin') {
      this.coins += 1;
      this.score += 150 * this.combo;
      this.combo = Math.min(10, this.combo + 1);
      this.comboTimer = 0;
      if (window.soundEngine) window.soundEngine.playCoin(this.combo);
    } else if (type === 'nitro') {
      this.activateBoost();
    } else if (type === 'shield') {
      this.hasShield = true;
      this.score += 300;
      if (window.soundEngine) window.soundEngine.playShield();
      if (this.onBannerMessage) this.onBannerMessage('🛡️ FORCE SHIELD EQUIPPED!');
    }

    this.scene.remove(pickup);
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.isPlaying = false;
    this.shakeIntensity = 1.6;

    if (window.soundEngine) {
      window.soundEngine.playHit();
      window.soundEngine.stopMusic();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('moto_highscore', this.highScore.toString());
      if (typeof confetti === 'function') {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
      }
    }

    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        highScore: this.highScore,
        distance: this.distance,
        coins: this.coins,
        nearMisses: this.nearMisses,
        topSpeed: Math.round(this.currentSpeed * 2.85),
        gesturesPerformed: this.gesturesPerformed
      });
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

// Global instance mapping
window.cyberRunnerGame = new MotoTrackGame();
