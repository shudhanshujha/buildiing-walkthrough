/**
 * AURA RESIDENCES — Main Application Controller
 * Orchestrates Three.js WebGL scene, Sun/Moon Celestial controls, 6-Floor Architecture,
 * Interactive 2D Schematic, First-Person Walkthrough, Material Customizer & Snapshot Studio.
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.bootstrap = function bootstrap({ THREE, OrbitControls }) {
  const CONFIG = window.EstateApp.CONFIG;
  const webglCanvas = document.getElementById('webglCanvas');
  const schematicCanvas = document.getElementById('schematicCanvas');

  // 1. WebGL Renderer Setup
  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  // 2. Scene & Perspective Camera
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x182232, 0.0028);

  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.12, 420);

  // 3. Subsystems Initialization
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures = new window.EstateApp.TextureFactory(THREE, maxAniso);
  const environment = new window.EstateApp.EnvironmentSystem(THREE, scene, textures);
  const building = new window.EstateApp.BuildingBuilder(THREE, scene, CONFIG, textures);

  // App UI State
  const uiState = {
    layoutView: 'exterior',     // 'exterior' | 'cutaway' | 'walkthrough' | 'split' | 'schematic'
    selectedFloorIndex: null,   // null = All Floors, 0..5 = F1..F6
    isolateCutaway: false,
    ghostOthers: false,
    miniMapMinimized: false,
    activeCustomCategory: 'flooring',
    timelapsePlaying: false
  };

  // Forward declarations for cross-callbacks
  let nav = null;
  let schematic2D = null;

  schematic2D = new window.EstateApp.Schematic2D(schematicCanvas, CONFIG, building, {
    onRoomSelect: (room, floorIdx) => {
      selectFloor(floorIdx, false);
      if (nav.mode === 'walkthrough') {
        nav.teleportToRoom(room, floorIdx, true);
      } else if (uiState.layoutView === 'schematic') {
        updateBreadcrumb();
      } else {
        // Focus room in cutaway or enter walkthrough on double selection
        uiState.isolateCutaway = true;
        document.getElementById('chkIsolateFloor').checked = true;
        building.applyFloorDisplayState({
          selectedFloorIndex: floorIdx,
          isolateCutaway: true,
          ghostOthers: uiState.ghostOthers
        });
        nav.setMode('cutaway', floorIdx, room);
      }
      renderRoomNavList();
    }
  });

  nav = new window.EstateApp.NavigationController(
    THREE,
    OrbitControls,
    camera,
    webglCanvas,
    scene,
    CONFIG,
    building,
    {
      onRoomChange: (room, floorData) => {
        schematic2D.selectedRoomId = room.id;
        updateBreadcrumb();
        updateWalkthroughBanner(room, floorData);
        highlightActiveRoomCard(room.id);
      },
      onPointerLockChange: (locked) => {
        const btn = document.getElementById('btnPointerLock');
        if (btn) btn.textContent = locked ? 'Unlock Cursor (Esc)' : 'FPS Mouse Look';
      }
    }
  );

  const snapshotStudio = new window.EstateApp.SnapshotStudio(CONFIG, {
    onUpdate: (list) => {
      const badge = document.getElementById('snapCountBadge');
      if (badge) badge.textContent = String(list.length);
      renderSnapshotGallery();
    }
  });

  // =========================================================================
  // VIEWPORT RESIZING & LAYOUT MODES
  // =========================================================================
  function resizeViewports() {
    const pane3D = document.getElementById('pane3D');
    const w = Math.max(1, pane3D.clientWidth);
    const h = Math.max(1, pane3D.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    schematic2D.resizeIfNeeded();
  }
  window.addEventListener('resize', resizeViewports);

  function setLayoutView(viewMode) {
    uiState.layoutView = viewMode;
    const stage = document.getElementById('viewportStage');
    stage.dataset.mode = viewMode;

    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.viewMode === viewMode);
    });

    const floorIdx = uiState.selectedFloorIndex !== null ? uiState.selectedFloorIndex : 2;

    if (viewMode === 'exterior') {
      uiState.isolateCutaway = false;
      document.getElementById('chkIsolateFloor').checked = false;
      building.applyFloorDisplayState({
        selectedFloorIndex: uiState.selectedFloorIndex,
        isolateCutaway: false,
        ghostOthers: uiState.ghostOthers
      });
      nav.setMode('exterior', floorIdx);
    } else if (viewMode === 'cutaway') {
      if (uiState.selectedFloorIndex === null) uiState.selectedFloorIndex = 2;
      uiState.isolateCutaway = true;
      document.getElementById('chkIsolateFloor').checked = true;
      schematic2D.setFloor(uiState.selectedFloorIndex);
      building.applyFloorDisplayState({
        selectedFloorIndex: uiState.selectedFloorIndex,
        isolateCutaway: true,
        ghostOthers: uiState.ghostOthers
      });
      nav.setMode('cutaway', uiState.selectedFloorIndex);
    } else if (viewMode === 'walkthrough') {
      if (uiState.selectedFloorIndex === null) uiState.selectedFloorIndex = 2;
      schematic2D.setFloor(uiState.selectedFloorIndex);
      nav.setMode('walkthrough', uiState.selectedFloorIndex);
    } else if (viewMode === 'split') {
      if (uiState.selectedFloorIndex === null) uiState.selectedFloorIndex = 2;
      uiState.isolateCutaway = true;
      document.getElementById('chkIsolateFloor').checked = true;
      schematic2D.setFloor(uiState.selectedFloorIndex);
      building.applyFloorDisplayState({
        selectedFloorIndex: uiState.selectedFloorIndex,
        isolateCutaway: true,
        ghostOthers: uiState.ghostOthers
      });
      if (nav.mode === 'exterior') nav.setMode('cutaway', uiState.selectedFloorIndex);
    } else if (viewMode === 'schematic') {
      if (uiState.selectedFloorIndex === null) uiState.selectedFloorIndex = 2;
      schematic2D.setFloor(uiState.selectedFloorIndex);
    }

    document.getElementById('walkthroughBanner').classList.toggle('visible', nav.mode === 'walkthrough' && viewMode !== 'schematic');
    updatePadModeLabels();
    renderFloorStack();
    renderRoomNavList();
    updateBreadcrumb();
    // Allow CSS grid/flex transition frame before measuring canvas dimensions
    requestAnimationFrame(() => resizeViewports());
  }

  // =========================================================================
  // FLOORS & ROOMS UI
  // =========================================================================
  function selectFloor(floorIndex, adjustCamera = true) {
    uiState.selectedFloorIndex = floorIndex;
    if (floorIndex !== null) {
      schematic2D.setFloor(floorIndex);
      nav.activeFloorIndex = floorIndex;
    }

    if (nav.mode === 'walkthrough') {
      if (floorIndex === null) {
        setLayoutView('exterior');
        return;
      }
      nav.setMode('walkthrough', floorIndex);
    } else {
      building.applyFloorDisplayState({
        selectedFloorIndex: floorIndex,
        isolateCutaway: floorIndex !== null && uiState.isolateCutaway,
        ghostOthers: uiState.ghostOthers
      });
      if (adjustCamera && floorIndex !== null && uiState.isolateCutaway) {
        nav.setMode('cutaway', floorIndex);
      }
    }

    renderFloorStack();
    renderRoomNavList();
    updateBreadcrumb();
  }

  function renderFloorStack() {
    const container = document.getElementById('floorStackList');
    const allActive = uiState.selectedFloorIndex === null;

    let html = `
      <button class="floor-pill all-floors ${allActive ? 'active' : ''}" data-floor-idx="all">
        <span class="floor-code">ALL</span>
        <span class="floor-meta">
          <strong>Full 6-Story Building</strong>
          <small>Exterior Tower Massing & Site</small>
        </span>
      </button>
    `;

    // Render top-down (F6 Crown Penthouse at top -> F1 Grand Lobby at base)
    for (let i = CONFIG.floors.length - 1; i >= 0; i--) {
      const f = CONFIG.floors[i];
      const isAct = uiState.selectedFloorIndex === i;
      html += `
        <button class="floor-pill ${isAct ? 'active' : ''}" data-floor-idx="${i}" style="--floor-accent:${f.accentColor}">
          <span class="floor-code">${f.code}</span>
          <span class="floor-meta">
            <strong>${f.name}</strong>
            <small>${f.layoutType}</small>
          </span>
        </button>
      `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.floor-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.floorIdx;
        if (val === 'all') {
          uiState.isolateCutaway = false;
          document.getElementById('chkIsolateFloor').checked = false;
          selectFloor(null, true);
          if (uiState.layoutView === 'cutaway' || uiState.layoutView === 'walkthrough') {
            setLayoutView('exterior');
          }
        } else {
          selectFloor( parseInt(val, 10), true );
        }
      });
    });

    // Update 2D header badge
    const fIdx = schematic2D.floorIndex;
    const fObj = CONFIG.floors[fIdx];
    const lbl2D = document.getElementById('lbl2DFloorTitle');
    if (lbl2D && fObj) {
      lbl2D.textContent = `${fObj.code} · ${fObj.name}`;
    }
  }

  function renderRoomNavList() {
    const listEl = document.getElementById('roomNavList');
    const fIdx = uiState.selectedFloorIndex !== null ? uiState.selectedFloorIndex : schematic2D.floorIndex;
    const floor = CONFIG.floors[fIdx];
    if (!floor) return;

    // Group rooms by apartment unit
    const groups = new Map();
    for (const r of floor.rooms) {
      if (r.category === 'core') continue;
      if (!groups.has(r.unit)) groups.set(r.unit, []);
      groups.get(r.unit).push(r);
    }

    let html = `<div class="unit-floor-caption">${floor.code} — ${floor.unitsSummary}</div>`;
    for (const [unitName, rooms] of groups.entries()) {
      html += `<div class="unit-group"><div class="unit-header">${unitName}</div>`;
      for (const r of rooms) {
        const sqft = Math.round(r.w * r.d * 10.7639);
        const isCur = schematic2D.selectedRoomId === r.id;
        html += `
          <div class="room-card ${isCur ? 'active' : ''}" data-room-id="${r.id}">
            <div class="room-card-info" data-action="focus" data-room-id="${r.id}">
              <span class="room-name">${r.name}</span>
              <span class="room-area">${(r.w * r.d).toFixed(0)} m² · ${sqft} sf</span>
            </div>
            <button class="btn-walk-room" data-action="walk" data-room-id="${r.id}" title="Enter 3D Walkthrough in ${r.name}">
              Walk 3D
            </button>
          </div>
        `;
      }
      html += `</div>`;
    }
    listEl.innerHTML = html;

    listEl.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rId = el.dataset.roomId;
        const room = floor.rooms.find((rm) => rm.id === rId);
        if (!room) return;
        schematic2D.selectedRoomId = room.id;

        if (el.dataset.action === 'walk') {
          uiState.selectedFloorIndex = fIdx;
          if (uiState.layoutView === 'schematic') setLayoutView('split');
          else {
            uiState.layoutView = 'walkthrough';
            document.getElementById('viewportStage').dataset.mode = 'walkthrough';
            document.querySelectorAll('[data-view-mode]').forEach((b) =>
              b.classList.toggle('active', b.dataset.viewMode === 'walkthrough')
            );
          }
          nav.teleportToRoom(room, fIdx, true);
          document.getElementById('walkthroughBanner').classList.add('visible');
          updatePadModeLabels();
          renderFloorStack();
          highlightActiveRoomCard(room.id);
        } else {
          uiState.selectedFloorIndex = fIdx;
          if (uiState.layoutView === 'exterior') {
            uiState.isolateCutaway = true;
            document.getElementById('chkIsolateFloor').checked = true;
            building.applyFloorDisplayState({
              selectedFloorIndex: fIdx,
              isolateCutaway: true,
              ghostOthers: uiState.ghostOthers
            });
            nav.setMode('cutaway', fIdx, room);
          } else if (nav.mode === 'walkthrough') {
            nav.teleportToRoom(room, fIdx, true);
          } else if (nav.mode === 'cutaway') {
            nav.setMode('cutaway', fIdx, room);
          }
          renderFloorStack();
          highlightActiveRoomCard(room.id);
        }
      });
    });
  }

  function highlightActiveRoomCard(roomId) {
    document.querySelectorAll('.room-card').forEach((c) => {
      c.classList.toggle('active', c.dataset.roomId === roomId);
    });
  }

  function updateWalkthroughBanner(room, floorData) {
    const titleEl = document.getElementById('lblWalkRoom');
    if (titleEl && room && floorData) {
      titleEl.textContent = `${floorData.code} · ${room.unit} · ${room.name}`;
    }
  }

  function updateBreadcrumb() {
    const el = document.getElementById('contextBreadcrumb');
    if (!el) return;
    if (nav.mode === 'walkthrough' && nav.currentRoom) {
      const f = CONFIG.floors[nav.activeFloorIndex];
      el.textContent = `${f.code} · ${nav.currentRoom.unit} · ${nav.currentRoom.name}`;
    } else if (uiState.selectedFloorIndex !== null) {
      const f = CONFIG.floors[uiState.selectedFloorIndex];
      el.textContent = `${f.code} · ${f.name}`;
    } else {
      el.textContent = 'Full Tower · All 6 Floors';
    }
  }

  function updatePadModeLabels() {
    const lbl = document.getElementById('lblPadMode');
    if (lbl) {
      lbl.textContent = nav.mode === 'walkthrough' ? 'WALK & LOOK' : '3D DIRECTIONAL';
    }
  }

  // =========================================================================
  // SUN & MOON CELESTIAL CONTROLS
  // =========================================================================
  function formatHourLabel(h) {
    const totalMins = Math.round(h * 60) % 1440;
    const hrs24 = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const period = hrs24 >= 12 ? 'PM' : 'AM';
    const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
    let phase = 'Night';
    if (h >= 5.5 && h < 7.5) phase = 'Sunrise';
    else if (h >= 7.5 && h < 11.5) phase = 'Morning Sun';
    else if (h >= 11.5 && h < 15.0) phase = 'High Sun';
    else if (h >= 15.0 && h < 17.0) phase = 'Afternoon';
    else if (h >= 17.0 && h < 18.5) phase = 'Golden Sunset';
    else if (h >= 18.5 && h < 20.0) phase = 'Blue Twilight';
    else phase = 'Moonlit Sky';
    return `${String(hrs12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period} · ${phase}`;
  }

  function azimuthToCardinal(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return dirs[idx];
  }

  function syncCelestialUIFromState() {
    const st = environment.state;
    const sliderTime = document.getElementById('sliderTime');
    const lblTime = document.getElementById('lblTimeReadout');
    if (sliderTime) sliderTime.value = st.hour.toFixed(2);
    if (lblTime) {
      lblTime.textContent = st.manualOverride
        ? `Manual ${st.activeBody === 'sun' ? 'Solar' : 'Lunar'} Vector`
        : formatHourLabel(st.hour);
    }

    const isSun = st.activeBody === 'sun';
    document.getElementById('btnBodySun').classList.toggle('active', isSun);
    document.getElementById('btnBodyMoon').classList.toggle('active', !isSun);

    const az = isSun ? st.sunAzimuth : st.moonAzimuth;
    const el = Math.max(0, isSun ? st.sunElevation : st.moonElevation);

    document.getElementById('sliderCelestialAz').value = Math.round(az);
    document.getElementById('lblCelestialAz').textContent = `${azimuthToCardinal(az)} · ${Math.round(az)}°`;

    document.getElementById('sliderCelestialEl').value = Math.round(el);
    document.getElementById('lblCelestialEl').textContent = `${Math.round(el)}°`;
  }

  function initCelestialControls() {
    const presetGrid = document.getElementById('timePresetsGrid');
    presetGrid.innerHTML = CONFIG.timePresets
      .map(
        (p) => `
        <button class="preset-chip" data-hour="${p.hour}">
          <span>${p.icon}</span> ${p.label}
        </button>`
      )
      .join('');

    presetGrid.querySelectorAll('.preset-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.timelapsePlaying = false;
        document.getElementById('btnPlayTime').textContent = '▶ Timelapse';
        environment.setTimeOfDay(parseFloat(btn.dataset.hour));
        syncCelestialUIFromState();
      });
    });

    document.getElementById('sliderTime').addEventListener('input', (e) => {
      environment.setTimeOfDay(parseFloat(e.target.value));
      syncCelestialUIFromState();
    });

    document.getElementById('btnPlayTime').addEventListener('click', (e) => {
      uiState.timelapsePlaying = !uiState.timelapsePlaying;
      e.currentTarget.textContent = uiState.timelapsePlaying ? '⏸ Pause' : '▶ Timelapse';
    });

    document.getElementById('btnBodySun').addEventListener('click', () => {
      const az = parseFloat(document.getElementById('sliderCelestialAz').value);
      const el = Math.max(12, parseFloat(document.getElementById('sliderCelestialEl').value) || 35);
      environment.setManualCelestialDirection('sun', az, el);
      syncCelestialUIFromState();
    });

    document.getElementById('btnBodyMoon').addEventListener('click', () => {
      const az = parseFloat(document.getElementById('sliderCelestialAz').value);
      const el = Math.max(18, parseFloat(document.getElementById('sliderCelestialEl').value) || 38);
      environment.setManualCelestialDirection('moon', az, el);
      syncCelestialUIFromState();
    });

    document.getElementById('sliderCelestialAz').addEventListener('input', (e) => {
      const az = parseFloat(e.target.value);
      const body = environment.state.activeBody;
      const curEl = body === 'sun' ? environment.state.sunElevation : environment.state.moonElevation;
      environment.setManualCelestialDirection(body, az, Math.max(8, curEl));
      syncCelestialUIFromState();
    });

    document.getElementById('sliderCelestialEl').addEventListener('input', (e) => {
      const el = parseFloat(e.target.value);
      const body = environment.state.activeBody;
      const curAz = body === 'sun' ? environment.state.sunAzimuth : environment.state.moonAzimuth;
      environment.setManualCelestialDirection(body, curAz, el);
      syncCelestialUIFromState();
    });

    // Quick Celestial Compass Direction Buttons (Shine Sun/Moon from N, NE, E, SE, S, SW, W, NW)
    document.querySelectorAll('[data-celestial-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const az = parseFloat(btn.dataset.celestialDir);
        const body = environment.state.activeBody;
        const curEl = body === 'sun' ? environment.state.sunElevation : environment.state.moonElevation;
        environment.setManualCelestialDirection(body, az, Math.max(18, curEl));
        syncCelestialUIFromState();
      });
    });

    document.getElementById('selectSeason').addEventListener('change', (e) => {
      environment.setSeasonTilt(parseFloat(e.target.value));
      syncCelestialUIFromState();
    });

    document.getElementById('chkShowSunPath').addEventListener('change', (e) => {
      environment.setShowPaths(e.target.checked);
    });

    syncCelestialUIFromState();
  }

  // =========================================================================
  // INTERIOR CUSTOMIZER (FLOORING, WINDOWS, MODULAR KITCHEN, WALLS, FURNITURE)
  // =========================================================================
  function openCustomCategory(catKey) {
    if (!CONFIG.customizations[catKey]) return;
    uiState.activeCustomCategory = catKey;
    activateSidebarTab('tab-finishes');
    renderCustomizerUI();
  }

  function renderCustomizerUI() {
    const catTabs = document.getElementById('customCatTabs');
    const cats = Object.keys(CONFIG.customizations);
    const shortLabels = {
      flooring: 'Flooring',
      windows: 'Windows',
      kitchen: 'Kitchen',
      walls: 'Walls',
      furniture: 'Furniture'
    };

    catTabs.innerHTML = cats
      .map(
        (k) => `
        <button class="cat-chip ${uiState.activeCustomCategory === k ? 'active' : ''}" data-cat="${k}">
          ${shortLabels[k] || k}
        </button>`
      )
      .join('');

    catTabs.querySelectorAll('.cat-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.activeCustomCategory = btn.dataset.cat;
        renderCustomizerUI();
      });
    });

    const catObj = CONFIG.customizations[uiState.activeCustomCategory];
    const selectedId = building.activeCustom[uiState.activeCustomCategory];
    const listEl = document.getElementById('customOptionsList');

    let html = `<div class="custom-cat-desc">${catObj.description}</div>`;
    for (const opt of catObj.options) {
      const isSel = opt.id === selectedId;
      html += `
        <button class="swatch-card ${isSel ? 'active' : ''}" data-opt-id="${opt.id}">
          <span class="swatch-circle" style="background:${opt.swatch}"></span>
          <span class="swatch-meta">
            <strong>${opt.name}</strong>
            <small>${opt.tag}</small>
          </span>
          <span class="swatch-check">${isSel ? '✓' : ''}</span>
        </button>
      `;
    }
    listEl.innerHTML = html;

    listEl.querySelectorAll('.swatch-card').forEach((card) => {
      card.addEventListener('click', () => {
        building.setCustomization(uiState.activeCustomCategory, card.dataset.optId);
        renderCustomizerUI();
      });
    });

    const total = building.getTotalUpgradeCost();
    document.getElementById('lblUpgradeTotal').textContent =
      total === 0 ? 'Included Base Spec ($0)' : `+$${total.toLocaleString()} Selected Upgrades`;
  }

  // =========================================================================
  // 3D RAYCASTING (CLICK WAYPOINTS, HOVER & CLICK FLOOR / OBJECT CUSTOMIZATION)
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const pickTooltip = document.getElementById('pickTooltip');
  let downPos = { x: 0, y: 0 };

  webglCanvas.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });

  webglCanvas.addEventListener('pointermove', (e) => {
    if (nav.pointerLocked) {
      pickTooltip.classList.remove('visible');
      return;
    }
    const rect = webglCanvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);

    // 1. Check Waypoint Rings first when visible
    if (nav.waypointGroup.visible && nav.waypointMeshes.length > 0) {
      const wpHits = raycaster.intersectObjects(nav.waypointMeshes, false);
      if (wpHits.length > 0) {
        const { room } = wpHits[0].object.userData;
        showPickTooltip(e.clientX, e.clientY, `Walk to ${room.name}`);
        webglCanvas.style.cursor = 'pointer';
        return;
      }
    }

    // 2. Check Customizable Architectural Elements or Exterior Floor Selection
    const hits = raycaster.intersectObjects(building.root.children, true);
    const valid = hits.find((h) => h.object.visible && h.object.material && h.object.material.opacity !== 0);
    if (valid) {
      const ud = valid.object.userData || {};
      if (uiState.layoutView === 'exterior' && uiState.selectedFloorIndex === null && ud.floorIndex !== undefined) {
        const f = CONFIG.floors[ud.floorIndex];
        showPickTooltip(e.clientX, e.clientY, `${f.code} · ${f.name} (Click to Highlight)`);
        webglCanvas.style.cursor = 'pointer';
        return;
      }
      if (ud.customCategory) {
        const labelMap = {
          flooring: 'Customize Flooring',
          windows: 'Customize Windows & Glazing',
          kitchen: 'Customize Modular Kitchen',
          walls: 'Customize Wall Finish',
          furniture: 'Customize Furniture Palette'
        };
        showPickTooltip(e.clientX, e.clientY, labelMap[ud.customCategory] || 'Customize');
        webglCanvas.style.cursor = 'pointer';
        return;
      }
    }

    pickTooltip.classList.remove('visible');
    webglCanvas.style.cursor = nav.mode === 'walkthrough' ? 'grab' : 'default';
  });

  webglCanvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || nav.pointerLocked) return;
    if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;

    const rect = webglCanvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);

    // 1. Waypoint teleport / glide
    if (nav.waypointGroup.visible && nav.waypointMeshes.length > 0) {
      const wpHits = raycaster.intersectObjects(nav.waypointMeshes, false);
      if (wpHits.length > 0) {
        const { room, floorIndex } = wpHits[0].object.userData;
        uiState.selectedFloorIndex = floorIndex;
        if (uiState.layoutView === 'cutaway') {
          uiState.layoutView = 'walkthrough';
          document.getElementById('viewportStage').dataset.mode = 'walkthrough';
          document.querySelectorAll('[data-view-mode]').forEach((b) =>
            b.classList.toggle('active', b.dataset.viewMode === 'walkthrough')
          );
          document.getElementById('walkthroughBanner').classList.add('visible');
          updatePadModeLabels();
        }
        nav.teleportToRoom(room, floorIndex, true);
        renderFloorStack();
        renderRoomNavList();
        return;
      }
    }

    // 2. Floor highlight or Direct 3D Object Customization Pick
    const hits = raycaster.intersectObjects(building.root.children, true);
    const valid = hits.find((h) => h.object.visible && h.object.material && h.object.material.opacity !== 0);
    if (!valid) return;
    const ud = valid.object.userData || {};

    if (uiState.layoutView === 'exterior' && uiState.selectedFloorIndex === null && ud.floorIndex !== undefined) {
      selectFloor(ud.floorIndex, false);
      return;
    }

    if (ud.customCategory) {
      openCustomCategory(ud.customCategory);
    }
  });

  function showPickTooltip(clientX, clientY, text) {
    pickTooltip.textContent = text;
    pickTooltip.style.left = `${clientX + 14}px`;
    pickTooltip.style.top = `${clientY + 14}px`;
    pickTooltip.classList.add('visible');
  }

  // =========================================================================
  // SNAPSHOT CAPTURE & GALLERY
  // =========================================================================
  function buildSnapshotMetadata() {
    const fIdx = uiState.selectedFloorIndex !== null ? uiState.selectedFloorIndex : schematic2D.floorIndex;
    const f = CONFIG.floors[fIdx];
    const comp = nav.getCompassTelemetry();
    const card = azimuthToCardinal(comp.viewFromAzimuthDeg);
    const st = environment.state;
    const isSun = st.activeBody === 'sun' && st.sunElevation > -2;
    const bodyAz = isSun ? st.sunAzimuth : st.moonAzimuth;

    const flName = building._getOpt('flooring').name;
    const ktName = building._getOpt('kitchen').name;
    const wnName = building._getOpt('windows').name.split('·')[0].trim();

    let loc = 'Full Exterior View';
    if (nav.mode === 'walkthrough' && nav.currentRoom) {
      loc = `${nav.currentRoom.unit} · ${nav.currentRoom.name}`;
    } else if (uiState.selectedFloorIndex !== null) {
      loc = uiState.isolateCutaway ? '3D Cutaway Layout' : 'Highlighted Floor';
    }

    return {
      floorCode: uiState.selectedFloorIndex !== null ? f.code : 'ALL',
      floorName: uiState.selectedFloorIndex !== null ? `${f.code} ${f.name}` : 'Full 6-Story Tower',
      locationLabel: loc,
      compassLabel: `${card} (${Math.round(comp.viewFromAzimuthDeg)}°)`,
      celestialLabel: `${isSun ? 'Sun' : 'Moon'} ${azimuthToCardinal(bodyAz)} ${Math.round(bodyAz)}°`,
      finishesSummary: `${flName}  |  ${ktName}  |  ${wnName}`
    };
  }

  function triggerCapture(mode = '3d') {
    const flash = document.getElementById('shutterFlash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 220);

    const item = snapshotStudio.capture({
      mode: uiState.layoutView === 'schematic' ? '2d' : mode,
      webglCanvas,
      schematic2D,
      metadata: buildSnapshotMetadata(),
      renderCleanFrame: () => {
        const prevWp = nav.waypointGroup.visible;
        nav.waypointGroup.visible = false;
        renderer.render(scene, camera);
        nav.waypointGroup.visible = prevWp;
      }
    });

    showToast(`Snapshot saved: ${item.title}`);
    return item;
  }

  function renderSnapshotGallery() {
    const grid = document.getElementById('snapshotGrid');
    if (!grid) return;
    if (snapshotStudio.snapshots.length === 0) {
      grid.innerHTML = `<div class="empty-gallery">No snapshots captured yet. Frame any exterior view, sun/moon angle, floor cutaway, or customized apartment interior and click <strong>Capture</strong>.</div>`;
      return;
    }

    grid.innerHTML = snapshotStudio.snapshots
      .map(
        (s) => `
        <div class="snap-card">
          <div class="snap-thumb-wrap" data-preview-id="${s.id}">
            <img src="${s.dataUrl}" alt="${s.title}" />
          </div>
          <div class="snap-info">
            <strong>${s.title}</strong>
            <small>${s.subtitle} · ${s.timestamp}</small>
            <div class="snap-actions">
              <button class="btn-sm primary" data-dl-id="${s.id}">Download PNG</button>
              <button class="btn-sm" data-preview-id="${s.id}">Inspect</button>
              <button class="btn-sm danger" data-del-id="${s.id}">✕</button>
            </div>
          </div>
        </div>
      `
      )
      .join('');

    grid.querySelectorAll('[data-dl-id]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = snapshotStudio.snapshots.find((x) => x.id === b.dataset.dlId);
        if (item) snapshotStudio.download(item);
      });
    });

    grid.querySelectorAll('[data-del-id]').forEach((b) => {
      b.addEventListener('click', () => snapshotStudio.remove(b.dataset.delId));
    });

    grid.querySelectorAll('[data-preview-id]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = snapshotStudio.snapshots.find((x) => x.id === b.dataset.previewId);
        if (!item) return;
        document.getElementById('lightboxImg').src = item.dataUrl;
        document.getElementById('lightboxCaption').textContent = `${item.title} — ${item.subtitle} — ${item.specs}`;
        const dlBtn = document.getElementById('btnLightboxDownload');
        dlBtn.onclick = () => snapshotStudio.download(item);
        document.getElementById('lightboxModal').classList.add('open');
      });
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toastBanner');
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  // =========================================================================
  // SIDEBAR, COMPASS, DIRECTIONAL PADS & TOOLBAR EVENT WIRING
  // =========================================================================
  function activateSidebarTab(tabId) {
    document.querySelectorAll('[data-sidebar-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sidebarTab === tabId);
    });
    document.querySelectorAll('.sidebar-panel').forEach((p) => {
      p.classList.toggle('active', p.id === tabId);
    });
    document.getElementById('leftSidebar').classList.remove('collapsed');
  }

  function bindAllUIControls() {
    // Top view mode buttons
    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setLayoutView(btn.dataset.viewMode));
    });

    // Sidebar tabs & collapse
    document.querySelectorAll('[data-sidebar-tab]').forEach((btn) => {
      btn.addEventListener('click', () => activateSidebarTab(btn.dataset.sidebarTab));
    });

    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
      document.getElementById('leftSidebar').classList.toggle('collapsed');
      setTimeout(resizeViewports, 260);
    });

    // Floor Cutaway & X-Ray Ghost checkboxes
    document.getElementById('chkIsolateFloor').addEventListener('change', (e) => {
      uiState.isolateCutaway = e.target.checked;
      if (uiState.isolateCutaway && uiState.selectedFloorIndex === null) {
        uiState.selectedFloorIndex = 2;
      }
      building.applyFloorDisplayState({
        selectedFloorIndex: uiState.selectedFloorIndex,
        isolateCutaway: uiState.isolateCutaway,
        ghostOthers: uiState.ghostOthers
      });
      if (uiState.isolateCutaway) {
        nav.setMode('cutaway', uiState.selectedFloorIndex);
      } else if (nav.mode === 'cutaway') {
        nav.setMode('exterior', uiState.selectedFloorIndex);
      }
      renderFloorStack();
      renderRoomNavList();
      updateBreadcrumb();
    });

    document.getElementById('chkGhostFloors').addEventListener('change', (e) => {
      uiState.ghostOthers = e.target.checked;
      if (uiState.selectedFloorIndex === null && uiState.ghostOthers) {
        uiState.selectedFloorIndex = 2;
      }
      building.applyFloorDisplayState({
        selectedFloorIndex: uiState.selectedFloorIndex,
        isolateCutaway: uiState.isolateCutaway,
        ghostOthers: uiState.ghostOthers
      });
      renderFloorStack();
    });

    // Reset Customizations
    document.getElementById('btnResetFinishes').addEventListener('click', () => {
      for (const cat of Object.keys(CONFIG.customizations)) {
        building.setCustomization(cat, CONFIG.customizations[cat].options[0].id);
      }
      renderCustomizerUI();
      showToast('Finishes reset to base architectural specification');
    });

    // Interior Lights Cycle (Auto -> On -> Off)
    document.getElementById('btnToggleLights').addEventListener('click', (e) => {
      const order = ['auto', 'on', 'off'];
      const labels = { auto: 'Lights: Auto', on: 'Lights: On', off: 'Lights: Off' };
      const next = order[(order.indexOf(building.interiorLightsMode) + 1) % order.length];
      building.interiorLightsMode = next;
      e.currentTarget.textContent = labels[next];
    });

    // Compass Rose Direction Buttons (N, NE, E, SE, S, SW, W, NW, TOP, STREET)
    document.querySelectorAll('[data-compass-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nav.flyToExteriorDirection(btn.dataset.compassDir, 25, true);
      });
    });

    // 3D Directional Pad (supports both click nudge AND press-and-hold smooth motion!)
    const bindHold = (btnId, padProp, padVal, clickAction) => {
      const el = document.getElementById(btnId);
      if (!el) return;
      const stop = () => {
        if (padProp) {
          nav.hudPad.forward = 0;
          nav.hudPad.strafe = 0;
          nav.hudPad.turnYaw = 0;
          nav.hudPad.orbitAz = 0;
          nav.hudPad.orbitEl = 0;
          nav.hudPad.zoom = 0;
        }
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (nav.mode === 'walkthrough') {
          if (clickAction === 'up') nav.hudPad.forward = 1;
          else if (clickAction === 'down') nav.hudPad.forward = -1;
          else if (clickAction === 'left') nav.hudPad.turnYaw = -1;
          else if (clickAction === 'right') nav.hudPad.turnYaw = 1;
          else if (clickAction === 'strafeL') nav.hudPad.strafe = -1;
          else if (clickAction === 'strafeR') nav.hudPad.strafe = 1;
          else nav.nudgeDirection(clickAction);
        } else if (padProp) {
          nav.hudPad[padProp] = padVal;
        } else {
          nav.nudgeDirection(clickAction);
        }
      });
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointerleave', stop);
      el.addEventListener('pointercancel', stop);
    };

    bindHold('padUp', 'orbitEl', -1, 'up');
    bindHold('padDown', 'orbitEl', 1, 'down');
    bindHold('padLeft', 'orbitAz', -1, 'left');
    bindHold('padRight', 'orbitAz', 1, 'right');
    bindHold('padStrafeL', null, 0, 'strafeL');
    bindHold('padStrafeR', null, 0, 'strafeR');
    bindHold('padZoomIn', 'zoom', -0.9, 'zoomIn');
    bindHold('padZoomOut', 'zoom', 0.9, 'zoomOut');
    document.getElementById('padReset').addEventListener('click', () => nav.nudgeDirection('reset'));

    // Walkthrough Banner buttons
    document.getElementById('btnPointerLock').addEventListener('click', () => nav.togglePointerLock());
    document.getElementById('btnExitWalkthrough').addEventListener('click', () => setLayoutView('cutaway'));

    // 2D Schematic Directional & Theme Controls
    document.getElementById('btn2DZoomIn').addEventListener('click', () => schematic2D.setZoom(schematic2D.zoom * 1.2));
    document.getElementById('btn2DZoomOut').addEventListener('click', () => schematic2D.setZoom(schematic2D.zoom * 0.84));
    document.getElementById('btn2DRotLeft').addEventListener('click', () => schematic2D.rotateBy(-45));
    document.getElementById('btn2DRotRight').addEventListener('click', () => schematic2D.rotateBy(45));
    document.getElementById('btn2DPanN').addEventListener('click', () => schematic2D.panBy(0, 36));
    document.getElementById('btn2DPanS').addEventListener('click', () => schematic2D.panBy(0, -36));
    document.getElementById('btn2DPanW').addEventListener('click', () => schematic2D.panBy(36, 0));
    document.getElementById('btn2DPanE').addEventListener('click', () => schematic2D.panBy(-36, 0));
    document.getElementById('btn2DReset').addEventListener('click', () => schematic2D.resetView());

    document.getElementById('btn2DTheme').addEventListener('click', (e) => {
      const next = schematic2D.theme === 'architectural' ? 'blueprint' : 'architectural';
      schematic2D.setTheme(next);
      e.currentTarget.textContent = next === 'blueprint' ? 'Color Plan' : 'Blueprint';
    });

    document.getElementById('btn2DExpandSplit').addEventListener('click', () => {
      if (uiState.layoutView === 'split') setLayoutView('schematic');
      else if (uiState.layoutView === 'schematic') setLayoutView('split');
      else setLayoutView('split');
    });

    document.getElementById('btn2DMinimize').addEventListener('click', () => {
      const pane2D = document.getElementById('pane2D');
      pane2D.classList.toggle('minimized');
      setTimeout(() => schematic2D.resizeIfNeeded(), 60);
    });

    // Snapshot & Gallery Modals
    document.getElementById('btnQuickSnap').addEventListener('click', () => triggerCapture('3d'));
    document.getElementById('btnOpenGallery').addEventListener('click', () => {
      document.getElementById('snapshotModal').classList.add('open');
    });
    document.getElementById('btnCloseSnapModal').addEventListener('click', () => {
      document.getElementById('snapshotModal').classList.remove('open');
    });

    document.getElementById('chkSnapSpecBar').addEventListener('change', (e) => {
      snapshotStudio.options.includeSpecBar = e.target.checked;
    });
    document.getElementById('chkSnapPlanInset').addEventListener('change', (e) => {
      snapshotStudio.options.includePlanInset = e.target.checked;
    });

    document.getElementById('btnCapture3DNow').addEventListener('click', () => triggerCapture('3d'));
    document.getElementById('btnCapture2DNow').addEventListener('click', () => triggerCapture('2d'));

    document.getElementById('btnCloseLightbox').addEventListener('click', () => {
      document.getElementById('lightboxModal').classList.remove('open');
    });

    document.getElementById('btnHelpModal').addEventListener('click', () => {
      document.getElementById('helpModal').classList.add('open');
    });
    document.getElementById('btnCloseHelp').addEventListener('click', () => {
      document.getElementById('helpModal').classList.remove('open');
    });

    // Keyboard shortcut P for instant snapshot
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'KeyP') triggerCapture('3d');
    });
  }

  // =========================================================================
  // MAIN ANIMATION LOOP
  // =========================================================================
  initCelestialControls();
  renderFloorStack();
  renderRoomNavList();
  renderCustomizerUI();
  renderSnapshotGallery();
  bindAllUIControls();
  resizeViewports();

  const clock = new THREE.Clock();
  const compassDial = document.getElementById('compassDial');
  const lblBearing = document.getElementById('lblCompassBearing');
  const sunPin = document.getElementById('compassSunPin');
  const moonPin = document.getElementById('compassMoonPin');

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    // Advance Sun/Moon timelapse if playing
    if (uiState.timelapsePlaying) {
      environment.setTimeOfDay((environment.state.hour + dt * 1.15) % 24);
      syncCelestialUIFromState();
    }

    environment.update(dt);
    building.updateInteriorLights(environment.state.nightFactor, uiState.selectedFloorIndex);
    nav.update(dt, elapsed);

    // Update HUD Compass Rose & Sun/Moon Pins (Fixed North-Up Rose)
    const comp = nav.getCompassTelemetry();
    if (compassDial) {
      compassDial.style.transform = `rotate(${comp.lookBearingDeg.toFixed(1)}deg)`;
    }
    if (lblBearing) {
      const deg = Math.round(comp.viewFromAzimuthDeg);
      lblBearing.textContent = `${azimuthToCardinal(deg)} · ${deg}°`;
    }
    if (sunPin) {
      const sRad = ((environment.state.sunAzimuth - 90) * Math.PI) / 180;
      sunPin.style.left = `${50 + Math.cos(sRad) * 33}%`;
      sunPin.style.top = `${50 + Math.sin(sRad) * 33}%`;
      sunPin.style.opacity = environment.state.sunElevation > -4 ? '1' : '0.25';
    }
    if (moonPin) {
      const mRad = ((environment.state.moonAzimuth - 90) * Math.PI) / 180;
      moonPin.style.left = `${50 + Math.cos(mRad) * 33}%`;
      moonPin.style.top = `${50 + Math.sin(mRad) * 33}%`;
      moonPin.style.opacity = environment.state.moonElevation > -4 ? '1' : '0.25';
    }

    // Render 3D Viewport (unless in 100% 2D Schematic mode)
    if (uiState.layoutView !== 'schematic') {
      renderer.render(scene, camera);
    }

    // Feed live telemetry to 2D Schematic & Render it
    schematic2D.telemetry = {
      playerPos:
        nav.mode === 'walkthrough'
          ? { x: camera.position.x, z: camera.position.z, floorIndex: nav.activeFloorIndex }
          : null,
      cameraYawRad: comp.lookYawRad,
      cameraYawDeg: comp.lookBearingDeg,
      sunAzimuth: environment.state.sunAzimuth,
      sunElevation: environment.state.sunElevation,
      moonAzimuth: environment.state.moonAzimuth,
      moonElevation: environment.state.moonElevation,
      activeBody: environment.state.activeBody
    };

    const pane2D = document.getElementById('pane2D');
    if (!pane2D.classList.contains('minimized')) {
      schematic2D.render();
    }
  }

  animate();
};
