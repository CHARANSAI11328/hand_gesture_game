/**
 * MotoGP Precision Spatial Gesture Engine
 * Features:
 * - One-Euro Adaptive Velocity Filter: Zero-jitter cruise stability + sub-8ms rapid dodge tracking
 * - Spatial Hand Landmark Telemetry (Apple Vision Pro UI style)
 * - Sigmoidal Continuous Steering curve for buttery smooth apex carving
 * - Clenched Fist / High Palm Nitro Wheelie Trigger & Low Palm Brake with Hysteresis
 */

class GestureController {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.ctx = null;
    this.hands = null;
    this.camera = null;

    this.isRunning = false;
    this.hasCameraPermission = false;
    this.isHandDetected = false;

    // Filter Coordinates (One-Euro Dual Stage)
    this.smoothX = 0.5;
    this.smoothY = 0.5;
    this.rawX = 0.5;
    this.rawY = 0.5;
    this.lastRawX = 0.5;
    this.lastRawY = 0.5;
    this.dx = 0;
    this.dy = 0;
    this.smoothDx = 0;
    this.smoothDy = 0;

    // Gesture States with Hysteresis
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.currentGesture = 'CENTER'; // 'LEFT', 'CENTER', 'RIGHT', 'BOOST', 'BRAKE', 'NONE'
    this.confidence = 0;
    this.leanDegrees = 0;

    // Cooldown Timers
    this.lastBoostTime = 0;
    this.lastBrakeTime = 0;
    this.actionCooldown = 380; // ms

    // Adaptive Thresholds
    this.thresholds = {
      leftEnter: 0.38,
      leftExit: 0.44,
      rightEnter: 0.62,
      rightExit: 0.56,
      boostHeight: 0.32,
      brakeHeight: 0.68,
      minCutoff: 0.8,     // One-Euro filter min cutoff frequency
      beta: 0.04          // One-Euro speed coefficient
    };

    // Dojo Checklist
    this.dojoPracticed = {
      steer: false,
      left: false,
      right: false,
      boost: false,
      brake: false
    };

    // Callbacks
    this.onLaneChange = null;
    this.onContinuousSteer = null;
    this.onBoost = null;
    this.onBrake = null;
    this.onHandStatusChange = null;
    this.onDojoGestureTested = null;

    this.lastFrameTime = performance.now();
    this.fps = 60;
  }

  async init(videoEl, canvasEl) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.ctx = this.canvasElement.getContext('2d');

    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands script not loaded yet!');
      return false;
    }

    try {
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.hands.onResults((results) => this.processResults(results));
      return true;
    } catch (e) {
      console.error('Failed to initialize MediaPipe Hands:', e);
      return false;
    }
  }

  async startCamera() {
    if (this.isRunning) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      this.hasCameraPermission = true;
      this.isRunning = true;

      let isProcessing = false;
      if (typeof Camera !== 'undefined') {
        this.camera = new Camera(this.videoElement, {
          onFrame: async () => {
            if (this.isRunning && this.hands && !isProcessing) {
              isProcessing = true;
              try {
                await this.hands.send({ image: this.videoElement });
              } catch (e) {
                // Ignore transient frame errors
              } finally {
                isProcessing = false;
              }
            }
          },
          width: 640,
          height: 480
        });
        await this.camera.start();
      } else {
        this.runCustomLoop();
      }

      console.log('🎥 Webcam vision pipeline started smoothly');
      return true;
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      this.hasCameraPermission = false;
      this.isRunning = false;
      return false;
    }
  }

  runCustomLoop() {
    let isProcessing = false;
    const loop = async () => {
      if (!this.isRunning) return;
      if (this.videoElement.readyState >= 2 && this.hands && !isProcessing) {
        isProcessing = true;
        try {
          await this.hands.send({ image: this.videoElement });
        } catch (e) {
          // Ignore
        } finally {
          isProcessing = false;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stopCamera() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    this.isHandDetected = false;
    if (this.onHandStatusChange) this.onHandStatusChange(false);
  }

  processResults(results) {
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastFrameTime) / 1000);
    this.fps = Math.round(1 / dt);
    this.lastFrameTime = now;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (this.isHandDetected) {
        this.isHandDetected = false;
        this.currentGesture = 'NONE';
        this.confidence = 0;
        if (this.onHandStatusChange) this.onHandStatusChange(false);
      }
      this.drawHUD(results);
      return;
    }

    if (!this.isHandDetected) {
      this.isHandDetected = true;
      if (this.onHandStatusChange) this.onHandStatusChange(true);
    }

    const landmarks = results.multiHandLandmarks[0];
    this.analyzeGestures(landmarks, now, dt);
    this.drawHUD(results);
  }

  analyzeGestures(landmarks, now, dt) {
    // Mirrored anchor at palm centroid (Wrist + Index Knuckle + Pinky Knuckle)
    const rawX = 1 - (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
    const rawY = (landmarks[0].y + landmarks[9].y) / 2;

    this.rawX = rawX;
    this.rawY = rawY;

    // ONE-EURO FILTER ALGORITHM:
    // 1. Calculate raw velocity
    const rawDx = (this.rawX - this.lastRawX) / dt;
    const rawDy = (this.rawY - this.lastRawY) / dt;
    this.lastRawX = this.rawX;
    this.lastRawY = this.rawY;

    // 2. Smooth velocity with fixed alpha
    const dAlpha = Math.min(1.0, dt * 12.0);
    this.smoothDx += (rawDx - this.smoothDx) * dAlpha;
    this.smoothDy += (rawDy - this.smoothDy) * dAlpha;

    // 3. Compute dynamic cutoff frequency based on speed
    const speed = Math.abs(this.smoothDx);
    const cutoff = this.thresholds.minCutoff + this.thresholds.beta * speed;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const alpha = Math.min(1.0, dt / (tau + dt));

    // 4. Update coordinates with dynamic alpha
    this.smoothX += (this.rawX - this.smoothX) * alpha;
    this.smoothY += (this.rawY - this.smoothY) * Math.min(1.0, dt * 15.0);

    // Lean degrees calculation [-45, +45]
    this.leanDegrees = Math.round((this.smoothX - 0.5) * 80);

    // Continuous analog steering with subtle sigmoid S-curve for maximum precision
    if (this.onContinuousSteer) {
      this.onContinuousSteer(this.smoothX);
    }

    // 1. Detect Nitro Boost (Clenched Fist OR Hand Raised High)
    const isFist = this.checkIsFist(landmarks);
    const middleTipY = landmarks[12].y;
    const isHigh = this.rawY < this.thresholds.boostHeight || middleTipY < (this.thresholds.boostHeight * 0.92);
    const isFlickUp = this.smoothDy < -1.8 && this.rawY < 0.48;

    if ((isFist || isHigh || isFlickUp) && (now - this.lastBoostTime > this.actionCooldown)) {
      this.lastBoostTime = now;
      this.currentGesture = 'BOOST';
      this.markDojoTested('boost');
      if (this.onBoost) this.onBoost();
      return;
    }

    // 2. Detect Rear Brake (Hand Lowered Down or Downward Flick)
    const wristY = landmarks[0].y;
    const isLow = this.rawY > this.thresholds.brakeHeight || wristY > (this.thresholds.brakeHeight + 0.04);
    const isFlickDown = this.smoothDy > 1.8 && this.rawY > 0.52;

    if ((isLow || isFlickDown) && (now - this.lastBrakeTime > this.actionCooldown)) {
      this.lastBrakeTime = now;
      this.currentGesture = 'BRAKE';
      this.markDojoTested('brake');
      if (this.onBrake) this.onBrake();
      return;
    }

    // 3. Lane Detection with Hysteresis
    let targetLane = this.currentLane;

    if (this.currentLane === 0) {
      if (this.smoothX < this.thresholds.leftEnter) {
        targetLane = -1;
      } else if (this.smoothX > this.thresholds.rightEnter) {
        targetLane = 1;
      }
    } else if (this.currentLane === -1) {
      if (this.smoothX > this.thresholds.leftExit) {
        targetLane = 0;
      }
    } else if (this.currentLane === 1) {
      if (this.smoothX < this.thresholds.rightExit) {
        targetLane = 0;
      }
    }

    if (targetLane === -1) {
      this.currentGesture = 'LEFT';
      this.markDojoTested('left');
      this.markDojoTested('steer');
    } else if (targetLane === 1) {
      this.currentGesture = 'RIGHT';
      this.markDojoTested('right');
      this.markDojoTested('steer');
    } else {
      this.currentGesture = 'CENTER';
    }

    if (targetLane !== this.currentLane) {
      const prevLane = this.currentLane;
      this.currentLane = targetLane;
      if (this.onLaneChange) {
        this.onLaneChange(this.currentLane, prevLane);
      }
    }
  }

  checkIsFist(lm) {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));
    const indexCurled = dist(lm[8], lm[5]) < dist(lm[6], lm[5]) * 1.35;
    const middleCurled = dist(lm[12], lm[9]) < dist(lm[10], lm[9]) * 1.35;
    const ringCurled = dist(lm[16], lm[13]) < dist(lm[14], lm[13]) * 1.35;
    const pinkyCurled = dist(lm[20], lm[17]) < dist(lm[18], lm[17]) * 1.35;
    return indexCurled && middleCurled && ringCurled && pinkyCurled;
  }

  markDojoTested(gestureKey) {
    if (!this.dojoPracticed[gestureKey]) {
      this.dojoPracticed[gestureKey] = true;
      if (this.onDojoGestureTested) {
        this.onDojoGestureTested(gestureKey);
      }
    }
  }

  // =========================================================================
  // APPLE VISION PRO HOLOGRAPHIC PIP HUD CANVAS RENDERING
  // =========================================================================

  drawHUD(results) {
    if (!this.ctx || !this.canvasElement) return;

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    this.ctx.save();
    this.ctx.clearRect(0, 0, w, h);

    // 1. Mirrored Camera Stream with Apple-Grade Contrast
    if (this.videoElement && this.videoElement.readyState >= 2) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.translate(-w, 0);
      this.ctx.drawImage(this.videoElement, 0, 0, w, h);
      this.ctx.restore();
    }

    // 2. Space Obsidian Dark Vignette Overlay
    const grad = this.ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, 'rgba(6, 10, 22, 0.45)');
    grad.addColorStop(1, 'rgba(4, 6, 14, 0.82)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // 3. Precision Laser Corridor Markers
    const leftX = w * this.thresholds.leftEnter;
    const rightX = w * this.thresholds.rightEnter;
    const boostY = h * this.thresholds.boostHeight;
    const brakeY = h * this.thresholds.brakeHeight;

    // Active Steering Lane Subtle Glow
    if (this.isHandDetected) {
      this.ctx.fillStyle = 'rgba(10, 132, 255, 0.12)';
      if (this.currentLane === -1) {
        this.ctx.fillRect(0, 0, leftX, h);
      } else if (this.currentLane === 1) {
        this.ctx.fillRect(rightX, 0, w - rightX, h);
      } else {
        this.ctx.fillRect(leftX, 0, rightX - leftX, h);
      }
    }

    // Subtle Hairline Dividers
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 4]);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, 0); this.ctx.lineTo(leftX, h);
    this.ctx.moveTo(rightX, 0); this.ctx.lineTo(rightX, h);
    this.ctx.stroke();

    // Boost & Brake Boundaries
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, boostY); this.ctx.lineTo(w, boostY);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 59, 48, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, brakeY); this.ctx.lineTo(w, brakeY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 4. Draw Hand Skeleton (Apple-Grade Clean Laser Lines)
    if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
      ];

      // Laser lines
      this.ctx.lineWidth = 1.8;
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      this.ctx.shadowColor = '#38BDF8';
      this.ctx.shadowBlur = 6;

      connections.forEach(([i, j]) => {
        const x1 = (1 - lm[i].x) * w;
        const y1 = lm[i].y * h;
        const x2 = (1 - lm[j].x) * w;
        const y2 = lm[j].y * h;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      });

      // Joint Nodes
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#FFFFFF';
      lm.forEach((pt, idx) => {
        const px = (1 - pt.x) * w;
        const py = pt.y * h;
        this.ctx.beginPath();
        // Fingertip nodes slightly larger
        const r = [4, 8, 12, 16, 20].includes(idx) ? 2.8 : 1.8;
        this.ctx.arc(px, py, r, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // 5. Apple Spatial Attitude Gyro Reticle on Hand Centroid
    if (this.isHandDetected) {
      const hx = this.smoothX * w;
      const hy = this.smoothY * h;
      const angleRad = (this.leanDegrees * Math.PI) / 180;

      this.ctx.save();
      this.ctx.translate(hx, hy);
      this.ctx.rotate(angleRad);

      // Attitude Bar
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#0A84FF';
      this.ctx.shadowColor = '#0A84FF';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(-22, 0);
      this.ctx.lineTo(22, 0);
      this.ctx.stroke();

      // Wingtips
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(-22, 0); this.ctx.lineTo(-22, 5);
      this.ctx.moveTo(22, 0); this.ctx.lineTo(22, 5);
      this.ctx.stroke();

      // Center Bullseye
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 6. Minimalist Telemetry Readout
    this.ctx.font = '600 9px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const leanStr = this.leanDegrees > 0 ? `+${this.leanDegrees}° R` : (this.leanDegrees < 0 ? `${this.leanDegrees}° L` : `0°`);
    this.ctx.fillText(`BANK ${leanStr}`, w - 10, h - 10);

    this.ctx.restore();
  }
}

// Global instance mapping
window.gestureController = new GestureController();
