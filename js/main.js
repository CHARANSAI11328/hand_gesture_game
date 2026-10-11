/**
 * Moto GP Pro - Main Application & Spatial Controller
 * Bridges 3D Superbike Engine, MediaPipe Vision Telemetry, High-Fidelity Synthesizer,
 * Apple CarPlay Cockpit HUD, and Engineering Lab Tuning.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Top Header Elements
  const headerHighScore = document.getElementById('header-high-score');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // Screens & Containers
  const gameContainer = document.getElementById('game-container');
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const guideModal = document.getElementById('guide-modal');
  const settingsModal = document.getElementById('settings-modal');
  const inGameHUD = document.getElementById('in-game-hud');

  // Video & Canvas Elements
  const webcamVideo = document.getElementById('webcam-video');
  const hudCanvas = document.getElementById('hud-canvas');

  // Navigation & Action Buttons
  const btnStart = document.getElementById('btn-start-game');
  const btnRestart = document.getElementById('btn-restart');
  const btnResume = document.getElementById('btn-resume');
  const btnQuit = document.getElementById('btn-quit');
  const btnOverMenu = document.getElementById('btn-over-menu');
  const btnOverSettings = document.getElementById('btn-over-settings');

  // Guide Modal Buttons
  const btnOpenGuide = document.getElementById('btn-open-guide');
  const btnInGameGuide = document.getElementById('btn-ingame-guide');
  const btnPauseGuide = document.getElementById('btn-pause-guide');
  const btnCloseGuide = document.getElementById('btn-close-guide');
  const btnGuideResume = document.getElementById('btn-guide-resume');

  // Settings Modal Buttons
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnInGameSettings = document.getElementById('btn-ingame-settings');
  const btnPauseSettings = document.getElementById('btn-pause-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnModalToHome = document.getElementById('btn-modal-to-home');

  // HUD Controls
  const btnInGamePause = document.getElementById('btn-ingame-pause');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const btnToggleMusic = document.getElementById('btn-toggle-music');
  const btnToggleSFX = document.getElementById('btn-toggle-sfx');

  // Speed Controls & Presets
  const speedDisplayBadge = document.getElementById('speed-display-badge');
  const presetChill = document.getElementById('preset-chill');
  const presetNormal = document.getElementById('preset-normal');
  const presetTurbo = document.getElementById('preset-turbo');

  const modalPresetChill = document.getElementById('modal-preset-chill');
  const modalPresetNormal = document.getElementById('modal-preset-normal');
  const modalPresetTurbo = document.getElementById('modal-preset-turbo');
  const gameSpeedSlider = document.getElementById('game-speed-slider');
  const customSpeedVal = document.getElementById('custom-speed-val');

  // Sensitivity & Audio Sliders
  const modalSensSlider = document.getElementById('modal-sens-slider');
  const sensValModal = document.getElementById('sens-val-modal');
  const musicVolSlider = document.getElementById('music-vol-slider');
  const musicVolVal = document.getElementById('music-vol-val');
  const sfxVolSlider = document.getElementById('sfx-vol-slider');
  const sfxVolVal = document.getElementById('sfx-vol-val');

  // Cockpit Dashboard Elements
  const hudScore = document.getElementById('hud-score');
  const hudDistance = document.getElementById('hud-distance');
  const hudCoins = document.getElementById('hud-coins');
  const hudMultiplier = document.getElementById('hud-multiplier');
  const hudGear = document.getElementById('hud-gear');
  const hudRpm = document.getElementById('hud-rpm');
  const hudSpeed = document.getElementById('hud-speed');
  const hudSpeedBar = document.getElementById('hud-speed-bar');
  const hudLeanDeg = document.getElementById('hud-lean-deg');
  const hudShieldBadge = document.getElementById('hud-shield-badge');
  const hudBoostBadge = document.getElementById('hud-boost-badge');

  // Dynamic Island Badges & Notifications
  const bannerMessage = document.getElementById('banner-message');
  const activeGestureBadge = document.getElementById('active-gesture-badge');
  const gestureIcon = document.getElementById('gesture-icon');
  const gestureText = document.getElementById('gesture-text');
  const cameraStatusText = document.getElementById('camera-status-text');

  // Steering Compass Elements
  const compassNeedle = document.getElementById('compass-needle');
  const compassLblLeft = document.getElementById('compass-lbl-left');
  const compassLblCenter = document.getElementById('compass-lbl-center');
  const compassLblRight = document.getElementById('compass-lbl-right');

  // Interactive Sensor Cards
  const tutorialCards = {
    steer: document.getElementById('dojo-card-steer'),
    boost: document.getElementById('dojo-card-boost'),
    brake: document.getElementById('dojo-card-brake')
  };
  const tutorialStatuses = {
    steer: document.getElementById('status-steer'),
    boost: document.getElementById('status-boost'),
    brake: document.getElementById('status-brake')
  };
  const dojoProgressBadge = document.getElementById('dojo-progress-badge');

  // Results Briefing Elements
  const finalScoreEl = document.getElementById('final-score');
  const highScoreEl = document.getElementById('high-score');
  const finalDistanceEl = document.getElementById('final-distance');
  const finalCoinsEl = document.getElementById('final-coins');
  const finalSpeedEl = document.getElementById('final-speed');
  const finalNearmissesEl = document.getElementById('final-nearmisses');

  // 1. Initial State & High Score Display
  const savedHighScore = localStorage.getItem('moto_highscore') || '0';
  if (headerHighScore) headerHighScore.textContent = parseInt(savedHighScore, 10).toLocaleString();

  let currentSpeedPreset = localStorage.getItem('moto_preset') || 'chill';
  let currentBaseSpeed = parseFloat(localStorage.getItem('moto_speed') || '28.0');

  // Fullscreen Button
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        btnFullscreen.querySelector('span').textContent = 'EXIT FULL';
      } else {
        document.exitFullscreen().catch(() => {});
        btnFullscreen.querySelector('span').textContent = 'FULLSCREEN';
      }
    });
  }

  // 2. Initialize 3D Engine
  window.cyberRunnerGame.init(gameContainer);
  applySpeedPreset(currentSpeedPreset, currentBaseSpeed);

  // 3. Initialize Gesture Controller
  let cameraActive = false;
  const isGestureReady = await window.gestureController.init(webcamVideo, hudCanvas);

  if (isGestureReady) {
    cameraActive = await window.gestureController.startCamera();
    updateCameraStatus(cameraActive);
  }

  function updateCameraStatus(active) {
    if (active) {
      if (cameraStatusText) {
        cameraStatusText.innerHTML = '<span class="status-dot green"></span><span>NEURAL VISION ACTIVE (READY TO RACE)</span>';
      }
      if (btnToggleCamera) {
        const span = btnToggleCamera.querySelector('span');
        if (span) span.textContent = 'CAMERA: ON';
      }
    } else {
      if (cameraStatusText) {
        cameraStatusText.innerHTML = '<span class="status-dot red"></span><span>KEYBOARD FALLBACK ACTIVE</span>';
      }
      if (btnToggleCamera) {
        const span = btnToggleCamera.querySelector('span');
        if (span) span.textContent = 'CAMERA: OFF';
      }
    }
  }

  // 4. Speed & Presets Logic
  function applySpeedPreset(preset, customSpeed = null) {
    currentSpeedPreset = preset;
    let speed = customSpeed;

    if (!speed) {
      if (preset === 'chill') speed = 28.0;
      else if (preset === 'normal') speed = 42.0;
      else if (preset === 'turbo') speed = 58.0;
    }

    currentBaseSpeed = speed;
    window.cyberRunnerGame.setBaseSpeed(speed);
    window.cyberRunnerGame.setSpeedPreset(preset);

    const presetLabels = {
      chill: '28 km/h • TOURING PROFILE',
      normal: '42 km/h • SPORT PROFILE',
      turbo: '58 km/h • CORSE MOTOGP',
      custom: `${speed} km/h • CUSTOM TUNED`
    };

    if (speedDisplayBadge) {
      speedDisplayBadge.textContent = presetLabels[preset] || `${speed} km/h`;
    }

    [presetChill, presetNormal, presetTurbo].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    [modalPresetChill, modalPresetNormal, modalPresetTurbo].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    if (gameSpeedSlider) gameSpeedSlider.value = speed;
    if (customSpeedVal) customSpeedVal.textContent = `${speed} km/h`;
  }

  [presetChill, presetNormal, presetTurbo, modalPresetChill, modalPresetNormal, modalPresetTurbo].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playUiClick();
        const preset = btn.dataset.preset;
        const spd = parseFloat(btn.dataset.speed);
        applySpeedPreset(preset, spd);
      });
    }
  });

  if (gameSpeedSlider) {
    gameSpeedSlider.addEventListener('input', (e) => {
      const spd = parseFloat(e.target.value);
      currentBaseSpeed = spd;
      window.cyberRunnerGame.setBaseSpeed(spd);
      if (customSpeedVal) customSpeedVal.textContent = `${spd} km/h`;
      if (speedDisplayBadge) speedDisplayBadge.textContent = `${spd} km/h • CUSTOM TUNED`;

      [presetChill, presetNormal, presetTurbo, modalPresetChill, modalPresetNormal, modalPresetTurbo].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
    });
  }

  // Audio Mixer Sliders
  if (musicVolSlider) {
    musicVolSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.soundEngine) window.soundEngine.setMusicVolume(val);
      if (musicVolVal) musicVolVal.textContent = `${Math.round(val * 100)}%`;
    });
  }

  if (sfxVolSlider) {
    sfxVolSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.soundEngine) window.soundEngine.setSfxVolume(val);
      if (sfxVolVal) sfxVolVal.textContent = `${Math.round(val * 100)}%`;
    });
  }

  if (modalSensSlider) {
    modalSensSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.gestureController.thresholds.minCutoff = val * 3.0;
      if (sensValModal) {
        sensValModal.textContent = val < 0.22 ? 'STABLE TOURING' : (val > 0.38 ? 'SHARP APEX CARVING' : 'BALANCED');
      }
    });
  }

  // 5. Navigation & Modal Handlers
  function openSettings() {
    if (window.soundEngine) window.soundEngine.playUiClick();
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.pause();
    }
    settingsModal.classList.add('active');
  }

  function closeSettings() {
    if (window.soundEngine) window.soundEngine.playUiClick();
    settingsModal.classList.remove('active');
    if (window.cyberRunnerGame.isPlaying && window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.pause();
    }
  }

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
  if (btnInGameSettings) btnInGameSettings.addEventListener('click', openSettings);
  if (btnPauseSettings) btnPauseSettings.addEventListener('click', openSettings);
  if (btnOverSettings) btnOverSettings.addEventListener('click', openSettings);
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      closeSettings();
      showBanner('✅ TUNING PROFILE APPLIED');
    });
  }

  function returnToHome() {
    if (window.soundEngine) window.soundEngine.playUiClick();
    settingsModal.classList.remove('active');
    guideModal.classList.remove('active');
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    inGameHUD.classList.remove('active');

    window.cyberRunnerGame.isPlaying = false;
    window.cyberRunnerGame.isPaused = false;
    if (window.soundEngine) window.soundEngine.stopMusic();

    startScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showBanner('🏠 WELCOME TO PADDOCK • READY TO RACE');
  }

  if (btnOverMenu) btnOverMenu.addEventListener('click', returnToHome);
  if (btnQuit) btnQuit.addEventListener('click', returnToHome);
  if (btnModalToHome) btnModalToHome.addEventListener('click', returnToHome);

  function openGuide() {
    if (window.soundEngine) window.soundEngine.playUiClick();
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.pause();
    }
    guideModal.classList.add('active');
  }

  function closeGuide() {
    if (window.soundEngine) window.soundEngine.playUiClick();
    guideModal.classList.remove('active');
    if (window.cyberRunnerGame.isPlaying && window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.pause();
    }
  }

  if (btnOpenGuide) btnOpenGuide.addEventListener('click', openGuide);
  if (btnInGameGuide) btnInGameGuide.addEventListener('click', openGuide);
  if (btnPauseGuide) btnPauseGuide.addEventListener('click', openGuide);
  if (btnCloseGuide) btnCloseGuide.addEventListener('click', closeGuide);
  if (btnGuideResume) btnGuideResume.addEventListener('click', closeGuide);

  // 6. Interactive Control Checklist Verification
  const masteredControls = new Set();
  function markCardMastered(key) {
    const card = tutorialCards[key];
    const status = tutorialStatuses[key];
    if (card && status && !card.classList.contains('mastered')) {
      card.classList.add('mastered');
      status.className = 'card-status-badge success';
      status.textContent = '✔ CALIBRATED';
      masteredControls.add(key);
      if (dojoProgressBadge) {
        dojoProgressBadge.textContent = `${masteredControls.size} / 3 SENSORS READY`;
      }
      if (window.soundEngine) window.soundEngine.playCoin(masteredControls.size);
    }
  }

  window.gestureController.onDojoGestureTested = (gestureKey) => {
    if (gestureKey === 'left' || gestureKey === 'right' || gestureKey === 'steer') {
      markCardMastered('steer');
    } else if (gestureKey === 'boost') {
      markCardMastered('boost');
    } else if (gestureKey === 'brake') {
      markCardMastered('brake');
    }
  };

  // 7. Connect Gesture Callbacks to Superbike
  window.gestureController.onLaneChange = (lane) => {
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.changeLane(lane);
      const icon = lane === -1 ? '⇦' : (lane === 1 ? '⇨' : '◉');
      const text = lane === -1 ? 'LEAN LEFT' : (lane === 1 ? 'LEAN RIGHT' : 'UPRIGHT CENTER');
      showGestureBadge(icon, text);
    }
    markCardMastered('steer');
  };

  window.gestureController.onContinuousSteer = (smoothX) => {
    if (compassNeedle) {
      const pct = Math.max(0, Math.min(100, smoothX * 100));
      compassNeedle.style.left = `${pct}%`;

      if (compassLblLeft && compassLblCenter && compassLblRight) {
        compassLblLeft.classList.toggle('active', smoothX < 0.38);
        compassLblCenter.classList.toggle('active', smoothX >= 0.38 && smoothX <= 0.62);
        compassLblRight.classList.toggle('active', smoothX > 0.62);
      }
    }

    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.setFreeSteerPosition(smoothX);
    }
  };

  window.gestureController.onBoost = () => {
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.activateBoost();
      showGestureBadge('🚀', 'NITRO WHEELIE');
    }
    markCardMastered('boost');
  };

  window.gestureController.onBrake = () => {
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isPaused) {
      window.cyberRunnerGame.brake();
      showGestureBadge('🛑', 'REAR BRAKE');
    }
    markCardMastered('brake');
  };

  window.gestureController.onHandStatusChange = (detected) => {
    const handIndicator = document.getElementById('hud-hand-indicator');
    if (handIndicator) {
      if (detected) {
        handIndicator.className = 'hand-indicator tracking';
        handIndicator.innerHTML = '<span class="status-indicator-dot"></span><span class="status-indicator-label">SPATIAL LOCKED</span>';
      } else {
        handIndicator.className = 'hand-indicator searching';
        handIndicator.innerHTML = '<span class="status-indicator-dot"></span><span class="status-indicator-label">LOCATING HAND</span>';
      }
    }
  };

  // 8. Connect Superbike Engine Callbacks to Cockpit Dashboard
  window.cyberRunnerGame.onUpdateHUD = (stats) => {
    if (hudScore) hudScore.textContent = stats.score.toLocaleString();
    if (hudDistance) hudDistance.textContent = `${stats.distance}m`;
    if (hudCoins) hudCoins.textContent = stats.coins;
    if (hudMultiplier) hudMultiplier.textContent = `${stats.combo}x`;
    if (hudSpeed) hudSpeed.textContent = stats.speed;
    if (hudRpm) hudRpm.textContent = stats.rpm.toLocaleString();
    if (hudGear) hudGear.textContent = stats.gear;

    if (hudLeanDeg) {
      const deg = stats.leanDeg;
      hudLeanDeg.textContent = deg > 0 ? `+${deg}°` : `${deg}°`;
    }

    if (hudSpeedBar) {
      const pct = Math.min(100, Math.round((stats.speed / 280) * 100));
      hudSpeedBar.style.width = `${pct}%`;
    }

    if (hudShieldBadge) hudShieldBadge.style.display = stats.hasShield ? 'inline-flex' : 'none';
    if (hudBoostBadge) hudBoostBadge.style.display = stats.boostActive ? 'inline-flex' : 'none';
  };

  let bannerTimeout = null;
  function showBanner(text) {
    if (!bannerMessage) return;
    bannerMessage.textContent = text;
    bannerMessage.classList.add('visible');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      bannerMessage.classList.remove('visible');
    }, 2200);
  }
  window.cyberRunnerGame.onBannerMessage = showBanner;

  window.cyberRunnerGame.onGameOver = (results) => {
    if (finalScoreEl) finalScoreEl.textContent = results.score.toLocaleString();
    if (highScoreEl) highScoreEl.textContent = results.highScore.toLocaleString();
    if (headerHighScore) headerHighScore.textContent = results.highScore.toLocaleString();
    if (finalDistanceEl) finalDistanceEl.textContent = `${results.distance} m`;
    if (finalCoinsEl) finalCoinsEl.textContent = results.coins;
    if (finalSpeedEl) finalSpeedEl.textContent = `${results.topSpeed} KM/H`;
    if (finalNearmissesEl) finalNearmissesEl.textContent = results.nearMisses;

    inGameHUD.classList.remove('active');
    gameOverScreen.classList.add('active');
  };

  function showGestureBadge(icon, text) {
    if (!activeGestureBadge) return;
    gestureIcon.textContent = icon;
    gestureText.textContent = text;
    activeGestureBadge.classList.add('active');
    setTimeout(() => {
      activeGestureBadge.classList.remove('active');
    }, 600);
  }

  // 9. Launch & Restart Buttons
  btnStart.addEventListener('click', async () => {
    if (window.soundEngine) window.soundEngine.playUiClick();
    if (!window.gestureController.isRunning) {
      const started = await window.gestureController.startCamera();
      updateCameraStatus(started);
    }
    startScreen.classList.remove('active');
    inGameHUD.classList.add('active');
    window.soundEngine.init();
    window.soundEngine.resume();
    window.cyberRunnerGame.start();
  });

  btnRestart.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playUiClick();
    gameOverScreen.classList.remove('active');
    inGameHUD.classList.add('active');
    window.cyberRunnerGame.start();
  });

  btnResume.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playUiClick();
    pauseScreen.classList.remove('active');
    window.cyberRunnerGame.pause();
  });

  if (btnInGamePause) {
    btnInGamePause.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      window.cyberRunnerGame.pause();
      pauseScreen.classList.toggle('active', window.cyberRunnerGame.isPaused);
    });
  }

  if (btnToggleCamera) {
    btnToggleCamera.addEventListener('click', async () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      if (window.gestureController.isRunning) {
        window.gestureController.stopCamera();
        updateCameraStatus(false);
      } else {
        const started = await window.gestureController.startCamera();
        updateCameraStatus(started);
      }
    });
  }

  if (btnToggleMusic) {
    btnToggleMusic.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      const enabled = window.soundEngine.toggleMusic();
      btnToggleMusic.classList.toggle('active', enabled);
      btnToggleMusic.textContent = enabled ? '🎵 MUSIC' : '🔇 MUSIC OFF';
    });
  }

  if (btnToggleSFX) {
    btnToggleSFX.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playUiClick();
      const enabled = window.soundEngine.toggleSFX();
      btnToggleSFX.classList.toggle('active', enabled);
      btnToggleSFX.textContent = enabled ? '🔊 SFX' : '🔇 SFX OFF';
    });
  }

  // 10. Buttery Keyboard Controls with Progressive Analog Roll
  const keyState = { left: false, right: false };
  let keyAnalogX = 0.5;

  setInterval(() => {
    if (!window.cyberRunnerGame.isPlaying || window.cyberRunnerGame.isPaused) return;
    if (keyState.left) {
      keyAnalogX = Math.max(0.12, keyAnalogX - 0.045);
      window.cyberRunnerGame.setFreeSteerPosition(keyAnalogX);
    } else if (keyState.right) {
      keyAnalogX = Math.min(0.88, keyAnalogX + 0.045);
      window.cyberRunnerGame.setFreeSteerPosition(keyAnalogX);
    } else {
      // Gently return to center when released
      keyAnalogX += (0.5 - keyAnalogX) * 0.12;
    }
  }, 16);

  window.addEventListener('keydown', (e) => {
    if (window.cyberRunnerGame.isPlaying && !window.cyberRunnerGame.isGameOver) {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keyState.left = true;
          window.cyberRunnerGame.changeLane('left');
          showGestureBadge('⇦', 'LEAN LEFT');
          break;
        case 'ArrowRight':
        case 'KeyD':
          keyState.right = true;
          window.cyberRunnerGame.changeLane('right');
          showGestureBadge('⇨', 'LEAN RIGHT');
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          window.cyberRunnerGame.activateBoost();
          showGestureBadge('🚀', 'NITRO BOOST');
          break;
        case 'ArrowDown':
        case 'KeyS':
        case 'Space':
          e.preventDefault();
          window.cyberRunnerGame.brake();
          showGestureBadge('🛑', 'REAR BRAKE');
          break;
        case 'KeyP':
        case 'Escape':
          window.cyberRunnerGame.pause();
          pauseScreen.classList.toggle('active', window.cyberRunnerGame.isPaused);
          break;
      }
    } else if (window.cyberRunnerGame.isGameOver && e.code === 'KeyR') {
      gameOverScreen.classList.remove('active');
      inGameHUD.classList.add('active');
      window.cyberRunnerGame.start();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = false;
  });

  console.log('🏎️ Moto GP Pro Engine Ready!');
});
