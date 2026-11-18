/**
 * Interactive 2D Architectural Schematic & CAD Blueprint Renderer
 * Supports:
 *  - Pan, Zoom, 90°/Free Compass Rotation & Sync-with-3D-Camera directional controls
 *  - Architectural Color Plan & Technical CAD Blueprint themes
 *  - Walls, Door Swing Arcs, Window Symbols, Schematic Furniture, Area (sq.ft / m²)
 *  - Live Sun / Moon directional ray badge + Live 3D Player/Camera FOV Cone
 *  - Click-to-highlight & Click-to-enter room in 3D
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.Schematic2D = class Schematic2D {
  constructor(canvas, config, building, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.building = building;
    this.callbacks = callbacks;

    this.floorIndex = 2; // Default F3 Twin 2BHK
    this.selectedRoomId = null;
    this.hoveredRoomId = null;
    this.theme = 'architectural'; // 'architectural' | 'blueprint'

    // 2D View Transform State (Directional Controls)
    this.panX = 0;        // pixels
    this.panY = 0;        // pixels
    this.zoom = 1.0;      // multiplier over auto-fit scale
    this.rotationDeg = 0; // 0 = North Up, 90, 180, 270 or synced camera bearing
    this.syncWith3DCamera = false;

    // Live telemetry injected each frame by App
    this.telemetry = {
      playerPos: null,    // { x, z, floorIndex }
      cameraYawRad: 0,    // radians in world XZ
      sunAzimuth: 225,
      sunElevation: 30,
      moonAzimuth: 45,
      moonElevation: -30,
      activeBody: 'sun'
    };

    this._isDragging = false;
    this._dragMoved = false;
    this._lastMouse = { x: 0, y: 0 };

    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => {
      this._isDragging = true;
      this._dragMoved = false;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;

      if (this._isDragging) {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._dragMoved = true;
        this.panX += dx;
        this.panY += dy;
        this._lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }

      const world = this.screenToWorld(lx, ly);
      const room = this._findRoomAt(world.x, world.z);
      const nextHover = room ? room.id : null;
      if (nextHover !== this.hoveredRoomId) {
        this.hoveredRoomId = nextHover;
        this.canvas.style.cursor = room ? 'pointer' : 'grab';
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}

      if (!this._dragMoved) {
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        const room = this._findRoomAt(world.x, world.z);
        if (room) {
          this.selectedRoomId = room.id;
          if (this.callbacks.onRoomSelect) {
            this.callbacks.onRoomSelect(room, this.floorIndex);
          }
        }
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.zoom * factor);
    }, { passive: false });
  }

  setFloor(index) {
    if (index === null || index < 0) return;
    this.floorIndex = Math.max(0, Math.min(this.config.floors.length - 1, index));
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setZoom(z) {
    this.zoom = Math.max(0.55, Math.min(3.5, z));
  }

  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
  }

  rotateBy(deltaDeg) {
    this.syncWith3DCamera = false;
    this.rotationDeg = ((this.rotationDeg + deltaDeg) % 360 + 360) % 360;
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.rotationDeg = 0;
    this.syncWith3DCamera = false;
  }

  _getMetrics(cssW, cssH) {
    const pad = Math.min(cssW, cssH) < 360 ? 38 : 62;
    const baseScale = Math.min(
      (cssW - pad * 2) / this.config.building.width,
      (cssH - pad * 2) / this.config.building.depth
    );
    const scale = Math.max(6, baseScale * this.zoom);
    const cx = cssW / 2 + this.panX;
    const cy = cssH / 2 + this.panY;
    const rotRad = (-this.rotationDeg * Math.PI) / 180;
    return { scale, cx, cy, rotRad };
  }

  screenToWorld(sx, sy) {
    const cssW = this.canvas.clientWidth || 400;
    const cssH = this.canvas.clientHeight || 300;
    const { scale, cx, cy, rotRad } = this._getMetrics(cssW, cssH);
    const dx = (sx - cx) / scale;
    const dy = (sy - cy) / scale;
    const cos = Math.cos(-rotRad);
    const sin = Math.sin(-rotRad);
    return {
      x: dx * cos - dy * sin,
      z: dx * sin + dy * cos
    };
  }

  _findRoomAt(wx, wz) {
    const floor = this.config.floors[this.floorIndex];
    if (!floor) return null;
    for (const r of floor.rooms) {
      if (wx >= r.x && wx <= r.x + r.w && wz >= r.z && wz <= r.z + r.d) {
        return r;
      }
    }
    return null;
  }

  resizeIfNeeded() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    return dpr;
  }

  render() {
    if (!this.canvas.clientWidth || !this.canvas.clientHeight) return;
    const dpr = this.resizeIfNeeded();
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;

    if (this.syncWith3DCamera) {
      this.rotationDeg = ((this.telemetry.cameraYawDeg || 0) % 360 + 360) % 360;
    }

    this._drawToContext(this.ctx, cssW, cssH, dpr, {
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom,
      rotationDeg: this.rotationDeg,
      compact: cssW < 420
    });
  }

  /**
   * Renders a clean standalone offscreen canvas for Snapshot Studio PiP or 2D export
   */
  renderToOffscreen(width = 900, height = 680, themeOverride = null) {
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const octx = off.getContext('2d');
    const prevTheme = this.theme;
    if (themeOverride) this.theme = themeOverride;
    this._drawToContext(octx, width, height, 1, {
      panX: 0,
      panY: 8,
      zoom: 0.96,
      rotationDeg: 0,
      compact: width < 480
    });
    this.theme = prevTheme;
    return off;
  }

  _drawToContext(ctx, cssW, cssH, dpr, viewOpts) {
    const floor = this.config.floors[this.floorIndex];
    const rec = this.building.floorRecords[this.floorIndex];
    if (!floor || !rec) return;

    const isBP = this.theme === 'blueprint';
    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Background & Subtle Architectural Grid
    ctx.fillStyle = isBP ? '#09192f' : '#0f131a';
    ctx.fillRect(0, 0, cssW, cssH);

    const pad = viewOpts.compact ? 36 : 64;
    const baseScale = Math.min(
      (cssW - pad * 2) / this.config.building.width,
      (cssH - pad * 2) / this.config.building.depth
    );
    const scale = Math.max(6, baseScale * viewOpts.zoom);
    const cx = cssW / 2 + viewOpts.panX;
    const cy = cssH / 2 + viewOpts.panY;
    const rotRad = (-viewOpts.rotationDeg * Math.PI) / 180;

    // Fine background grid
    ctx.strokeStyle = isBP ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridStep = Math.max(18, scale * 1.0);
    for (let gx = cx % gridStep; gx < cssW; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH); ctx.stroke();
    }
    for (let gy = cy % gridStep; gy < cssH; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cssW, gy); ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotRad);

    // 2. Incoming Sun / Moon Light Vector Indicator around Building Perimeter
    const isSun = this.telemetry.activeBody === 'sun' && this.telemetry.sunElevation > -2;
    const bodyAz = isSun ? this.telemetry.sunAzimuth : this.telemetry.moonAzimuth;
    const bodyRad = (bodyAz * Math.PI) / 180;
    const orbitR = Math.hypot(10 * scale, 7.5 * scale) + (viewOpts.compact ? 16 : 26);
    const bx = Math.sin(bodyRad) * orbitR;
    const bz = -Math.cos(bodyRad) * orbitR;

    ctx.save();
    ctx.strokeStyle = isSun ? 'rgba(251, 191, 36, 0.45)' : 'rgba(96, 165, 250, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, bz);
    ctx.lineTo(bx * 0.58, bz * 0.58);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isSun ? '#fbbf24' : '#93c5fd';
    ctx.beginPath();
    ctx.arc(bx, bz, viewOpts.compact ? 5 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Room Fills & Schematic Furniture Outlines
    const catColors = {
      living:   isBP ? 'rgba(56, 189, 248, 0.10)' : 'rgba(212, 168, 83, 0.17)',
      dining:   isBP ? 'rgba(56, 189, 248, 0.08)' : 'rgba(212, 168, 83, 0.13)',
      kitchen:  isBP ? 'rgba(52, 211, 153, 0.12)' : 'rgba(52, 211, 153, 0.18)',
      bedroom:  isBP ? 'rgba(129, 140, 248, 0.11)': 'rgba(99, 102, 241, 0.18)',
      study:    isBP ? 'rgba(167, 139, 250, 0.10)': 'rgba(168, 85, 247, 0.16)',
      bath:     isBP ? 'rgba(34, 211, 238, 0.12)' : 'rgba(56, 189, 248, 0.17)',
      balcony:  isBP ? 'rgba(56, 189, 248, 0.04)' : 'rgba(180, 130, 82, 0.15)',
      lobby:    isBP ? 'rgba(56, 189, 248, 0.09)' : 'rgba(226, 200, 145, 0.15)',
      corridor: isBP ? 'rgba(148, 163, 184, 0.07)': 'rgba(148, 163, 184, 0.12)',
      core:     isBP ? 'rgba(30, 58, 95, 0.65)'   : 'rgba(30, 35, 45, 0.85)',
      gym:      isBP ? 'rgba(244, 114, 182, 0.10)': 'rgba(244, 114, 182, 0.16)',
      service:  isBP ? 'rgba(148, 163, 184, 0.08)': 'rgba(100, 116, 139, 0.16)'
    };

    for (const room of floor.rooms) {
      const rx = room.x * scale;
      const rz = room.z * scale;
      const rw = room.w * scale;
      const rd = room.d * scale;

      const isSel = room.id === this.selectedRoomId;
      const isHov = room.id === this.hoveredRoomId;

      ctx.fillStyle = catColors[room.category] || 'rgba(255,255,255,0.08)';
      ctx.fillRect(rx, rz, rw, rd);

      if (isSel || isHov) {
        ctx.fillStyle = isSel ? 'rgba(212, 168, 83, 0.28)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(rx, rz, rw, rd);
        ctx.strokeStyle = isSel ? '#fbbf24' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isSel ? 2.2 : 1.2;
        ctx.strokeRect(rx + 1, rz + 1, rw - 2, rd - 2);
      }

      // Balcony decking hatch lines
      if (room.isBalcony) {
        ctx.save();
        ctx.strokeStyle = isBP ? 'rgba(56, 189, 248, 0.14)' : 'rgba(212, 168, 83, 0.14)';
        ctx.lineWidth = 0.8;
        const step = Math.max(5, scale * 0.45);
        for (let hz = rz + step; hz < rz + rd; hz += step) {
          ctx.beginPath(); ctx.moveTo(rx, hz); ctx.lineTo(rx + rw, hz); ctx.stroke();
        }
        ctx.restore();
      }

      // Core elevator shaft & stairs schematic symbol
      if (room.category === 'core') {
        ctx.strokeStyle = isBP ? 'rgba(125, 211, 252, 0.5)' : 'rgba(203, 213, 225, 0.4)';
        ctx.lineWidth = 1;
        // Two elevator cars
        const ew = rw * 0.34, ed = rd * 0.55;
        for (const ox of [rx + rw * 0.1, rx + rw * 0.56]) {
          const oz = rz + rd * 0.35;
          ctx.strokeRect(ox, oz, ew, ed);
          ctx.beginPath();
          ctx.moveTo(ox, oz); ctx.lineTo(ox + ew, oz + ed);
          ctx.moveTo(ox + ew, oz); ctx.lineTo(ox, oz + ed);
          ctx.stroke();
        }
        // Stair treads at north of core
        const stCount = 7;
        for (let s = 0; s <= stCount; s++) {
          const sx = rx + rw * 0.15 + (s / stCount) * (rw * 0.7);
          ctx.beginPath(); ctx.moveTo(sx, rz + 3); ctx.lineTo(sx, rz + rd * 0.28); ctx.stroke();
        }
      } else {
        this._drawSchematicFurniture(ctx, room, scale, isBP);
      }
    }

    // 4. Walls, Balustrades, Door Swing Arcs & Window Glazing Lines
    for (const span of rec.wallSpans) {
      const isH = span.orient === 'H';
      if (span.kind === 'railing') {
        ctx.strokeStyle = isBP ? '#38bdf8' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(span.start * scale, span.fixed * scale);
          ctx.lineTo(span.end * scale, span.fixed * scale);
        } else {
          ctx.moveTo(span.fixed * scale, span.start * scale);
          ctx.lineTo(span.fixed * scale, span.end * scale);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      // Gather openings on this span so doorways remain cleanly open in 2D too!
      const ops = [];
      for (const d of floor.doors) {
        const lc = isH ? d.z : d.x;
        const pc = isH ? d.x : d.z;
        if (d.orient === span.orient && Math.abs(lc - span.fixed) < 0.05 && pc > span.start && pc < span.end) {
          ops.push({ kind: 'door', pos: pc, width: d.width, style: d.style });
        }
      }
      for (const w of floor.windows) {
        const lc = isH ? w.z : w.x;
        const pc = isH ? w.x : w.z;
        if (w.orient === span.orient && Math.abs(lc - span.fixed) < 0.05 && pc > span.start && pc < span.end) {
          ops.push({ kind: 'window', pos: pc, width: w.width });
        }
      }
      ops.sort((a, b) => a.pos - b.pos);

      const wallThickPx = span.kind === 'exterior' ? Math.max(3.5, scale * 0.22) : Math.max(2.2, scale * 0.13);
      const drawSolidSeg = (s, e) => {
        if (e - s <= 0.02) return;
        ctx.strokeStyle = isBP ? '#e0f2fe' : '#f1f5f9';
        ctx.lineWidth = wallThickPx;
        ctx.lineCap = 'square';
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(s * scale, span.fixed * scale);
          ctx.lineTo(e * scale, span.fixed * scale);
        } else {
          ctx.moveTo(span.fixed * scale, s * scale);
          ctx.lineTo(span.fixed * scale, e * scale);
        }
        ctx.stroke();
      };

      let cur = span.start;
      for (const op of ops) {
        const s = Math.max(cur, op.pos - op.width / 2);
        const e = Math.min(span.end, op.pos + op.width / 2);
        drawSolidSeg(cur, s);

        if (op.kind === 'window') {
          // Architectural triple-line window glazing symbol
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = Math.max(1.5, wallThickPx * 0.75);
          ctx.beginPath();
          if (isH) {
            ctx.moveTo(s * scale, span.fixed * scale);
            ctx.lineTo(e * scale, span.fixed * scale);
          } else {
            ctx.moveTo(span.fixed * scale, s * scale);
            ctx.lineTo(span.fixed * scale, e * scale);
          }
          ctx.stroke();
        } else if (op.kind === 'door' && op.style !== 'open' && op.style !== 'elevator') {
          // Quarter-circle architectural door swing arc
          const rPx = (e - s) * scale * (op.style === 'glass_double' ? 0.5 : 0.85);
          ctx.save();
          ctx.strokeStyle = isBP ? 'rgba(125, 211, 252, 0.65)' : 'rgba(212, 168, 83, 0.72)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          if (isH) {
            const hx = s * scale, hz = span.fixed * scale;
            ctx.moveTo(hx, hz);
            ctx.lineTo(hx, hz + rPx);
            ctx.arc(hx, hz, rPx, Math.PI / 2, 0, true);
          } else {
            const hx = span.fixed * scale, hz = s * scale;
            ctx.moveTo(hx, hz);
            ctx.lineTo(hx + rPx, hz);
            ctx.arc(hx, hz, rPx, 0, Math.PI / 2, false);
          }
          ctx.stroke();
          ctx.restore();
        }
        cur = e;
      }
      drawSolidSeg(cur, span.end);
    }

    // 5. Architectural Exterior Dimension Witness Lines (when not compact)
    if (!viewOpts.compact) {
      ctx.save();
      ctx.strokeStyle = isBP ? 'rgba(125, 211, 252, 0.5)' : 'rgba(148, 163, 184, 0.45)';
      ctx.fillStyle = isBP ? '#7dd3fc' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.textAlign = 'center';

      const topY = -7.5 * scale - 18;
      ctx.beginPath();
      ctx.moveTo(-10 * scale, topY);
      ctx.lineTo(10 * scale, topY);
      ctx.moveTo(-10 * scale, topY - 4); ctx.lineTo(-10 * scale, topY + 4);
      ctx.moveTo(10 * scale, topY - 4); ctx.lineTo(10 * scale, topY + 4);
      ctx.stroke();
      ctx.fillText('20.0 m  (65\'-7")', 0, topY - 5);

      ctx.save();
      const leftX = -10 * scale - 18;
      ctx.beginPath();
      ctx.moveTo(leftX, -7.5 * scale);
      ctx.lineTo(leftX, 7.5 * scale);
      ctx.moveTo(leftX - 4, -7.5 * scale); ctx.lineTo(leftX + 4, -7.5 * scale);
      ctx.moveTo(leftX - 4, 7.5 * scale); ctx.lineTo(leftX + 4, 7.5 * scale);
      ctx.stroke();
      ctx.translate(leftX - 7, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('15.0 m  (49\'-3")', 0, 0);
      ctx.restore();
      ctx.restore();
    }

    // 6. Room Labels & Area Badges (counter-rotated so text always stays upright & readable!)
    for (const room of floor.rooms) {
      if (room.w * scale < 34 || room.d * scale < 24) continue;
      const rcx = (room.x + room.w / 2) * scale;
      const rcz = (room.z + room.d / 2) * scale;
      const areaM2 = (room.w * room.d).toFixed(0);
      const areaSqFt = Math.round(room.w * room.d * 10.7639);

      ctx.save();
      ctx.translate(rcx, rcz);
      ctx.rotate(-rotRad);

      const shortName = room.name.replace(/^\d+\s+/, '');
      const fontSize = Math.max(8.5, Math.min(11.5, scale * 0.42));
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = isBP ? '#e0f2fe' : '#f8fafc';
      ctx.fillText(shortName, 0, viewOpts.compact ? 0 : -5);

      if (!viewOpts.compact && room.category !== 'core' && room.d * scale > 42) {
        ctx.font = `500 ${Math.max(7.5, fontSize - 2)}px ui-monospace, monospace`;
        ctx.fillStyle = isBP ? 'rgba(125, 211, 252, 0.78)' : 'rgba(203, 213, 225, 0.72)';
        ctx.fillText(`${areaM2} m² · ${areaSqFt} sf`, 0, 8);
      }
      ctx.restore();
    }

    // 7. Live 3D Camera / Walkthrough Player Position & FOV Cone
    if (this.telemetry.playerPos) {
      const px = this.telemetry.playerPos.x * scale;
      const pz = this.telemetry.playerPos.z * scale;
      const yaw = this.telemetry.cameraYawRad || 0;
      const coneLen = Math.max(20, scale * 2.4);

      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(yaw);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, coneLen);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, coneLen, -Math.PI / 2 - 0.52, -Math.PI / 2 + 0.52);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // End world-to-plan transform

    // 8. Corner North Arrow Indicator on 2D Plan
    const naX = cssW - 26, naY = 28;
    ctx.save();
    ctx.translate(naX, naY);
    ctx.rotate(rotRad);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(4.5, 5); ctx.lineTo(0, 2); ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  _drawSchematicFurniture(ctx, room, scale, isBP) {
    if (scale < 10) return;
    ctx.save();
    ctx.strokeStyle = isBP ? 'rgba(125, 211, 252, 0.35)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    const rx = room.x * scale, rz = room.z * scale, rw = room.w * scale, rd = room.d * scale;
    const cx = rx + rw / 2, cz = rz + rd / 2;

    if (room.category === 'kitchen') {
      // Counter run + burners + optional island
      const runW = Math.min(rw - 0.5 * scale, 4.6 * scale);
      const alongNorth = room.z <= -3.5;
      const kz = alongNorth ? rz + 0.14 * scale : rz + rd - 0.78 * scale;
      ctx.strokeRect(cx - runW / 2, kz, runW, 0.65 * scale);
      // Burner rings
      ctx.beginPath();
      ctx.arc(cx + runW * 0.2, kz + 0.32 * scale, 0.14 * scale, 0, Math.PI * 2);
      ctx.stroke();
      // Island if enabled
      const kOpt = this.building._getOpt('kitchen');
      if (kOpt.hasIsland && room.d >= 3.5 && room.w >= 4.0) {
        const iw = Math.min(rw * 0.56, 2.6 * scale);
        const iz = alongNorth ? kz + 1.45 * scale : kz - 1.45 * scale;
        ctx.strokeRect(cx - iw / 2, iz, iw, 0.88 * scale);
      }
    } else if (room.category === 'bedroom' && room.w >= 3) {
      const bw = 2.0 * scale, bd = 1.65 * scale;
      const bx = room.x < 0 ? rx + 0.18 * scale : rx + rw - bw - 0.18 * scale;
      ctx.strokeRect(bx, cz - bd / 2, bw, bd);
      // Pillows
      const px = room.x < 0 ? bx + 0.12 * scale : bx + bw - 0.45 * scale;
      ctx.strokeRect(px, cz - bd * 0.38, 0.32 * scale, bd * 0.32);
      ctx.strokeRect(px, cz + bd * 0.06, 0.32 * scale, bd * 0.32);
    } else if (room.category === 'living') {
      const sw = Math.min(rw * 0.5, 2.6 * scale);
      ctx.strokeRect(cx - sw / 2, cz - 0.8 * scale, sw, 0.82 * scale);
      ctx.strokeRect(cx - sw * 0.25, cz + 0.25 * scale, sw * 0.5, 0.55 * scale);
    }
    ctx.restore();
  }
};

