/**
 * Procedural PBR Canvas Texture & Material Generator
 * Generates zero-CORS, crisp architectural textures (diffuse + bump) on offscreen canvases.
 * Guarantees WebGL snapshot export (toDataURL) never suffers from canvas tainting.
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.TextureFactory = class TextureFactory {
  constructor(THREE, maxAnisotropy = 8) {
    this.THREE = THREE;
    this.anisotropy = Math.min(maxAnisotropy, 8);
    this.cache = new Map();
  }

  _makeCanvas(w = 512, h = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  _toTexture(canvas, isColor = true) {
    const { THREE } = this;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.anisotropy;
    if (isColor && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    return tex;
  }

  // Deterministic pseudo-random for consistent architectural patterns
  _rand(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  get(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    let result;
    switch (key) {
      case 'herringbone_oak': result = this._buildHerringboneOak(); break;
      case 'calacatta_marble': result = this._buildCalacattaMarble(); break;
      case 'smoked_walnut': result = this._buildSmokedWalnut(); break;
      case 'venetian_terrazzo': result = this._buildTerrazzo(); break;
      case 'travertine_slate': result = this._buildTravertine(); break;
      case 'subway_tile': result = this._buildSubwayTile(); break;
      case 'hex_brass_tile': result = this._buildHexBrassTile(); break;
      case 'bath_ceramic': result = this._buildBathCeramic(); break;
      case 'balcony_deck': result = this._buildBalconyDeck(); break;
      case 'exterior_cladding': result = this._buildExteriorCladding(); break;
      case 'plaza_paver': result = this._buildPlazaPaver(); break;
      case 'water_normal': result = this._buildWaterRipples(); break;
      case 'moon_surface': result = this._buildMoonSurface(); break;
      case 'glow_sprite': result = this._buildGlowSprite(); break;
      default: result = this._buildHerringboneOak();
    }
    this.cache.set(key, result);
    return result;
  }

  _buildHerringboneOak() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const { canvas: bCanvas, ctx: bCtx } = this._makeCanvas(512, 512);
    const rng = this._rand(101);

    ctx.fillStyle = '#c49d71';
    ctx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#d0d0d0';
    bCtx.fillRect(0, 0, 512, 512);

    const step = 64;
    for (let gy = -2; gy < 10; gy++) {
      for (let gx = -2; gx < 10; gx++) {
        const horiz = (gx + gy) % 2 === 0;
        const x = gx * step;
        const y = gy * step;
        const w = horiz ? step * 2 : step;
        const h = horiz ? step : step * 2;

        const tone = (rng() - 0.5) * 24;
        const r = Math.min(255, Math.max(0, 202 + tone));
        const g = Math.min(255, Math.max(0, 161 + tone * 0.85));
        const b = Math.min(255, Math.max(0, 114 + tone * 0.7));

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
        ctx.fillRect(x, y, w, h);

        // Fine wood grain fibers
        ctx.strokeStyle = `rgba(95, 62, 32, 0.13)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          if (horiz) {
            const ly = y + (i / 14) * h + rng() * 3;
            ctx.moveTo(x, ly);
            ctx.bezierCurveTo(x + w * 0.33, ly + (rng() - 0.5) * 4, x + w * 0.66, ly + (rng() - 0.5) * 4, x + w, ly);
          } else {
            const lx = x + (i / 14) * w + rng() * 3;
            ctx.moveTo(lx, y);
            ctx.bezierCurveTo(lx + (rng() - 0.5) * 4, y + h * 0.33, lx + (rng() - 0.5) * 4, y + h * 0.66, lx, y + h);
          }
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(72, 48, 26, 0.38)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.restore();

        bCtx.strokeStyle = '#555555';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: this._toTexture(bCanvas, false), bumpScale: 0.015 };
  }

  _buildCalacattaMarble() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const { canvas: bCanvas, ctx: bCtx } = this._makeCanvas(512, 512);
    const rng = this._rand(202);

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#f4f2ec');
    grad.addColorStop(0.5, '#ebe8e0');
    grad.addColorStop(1, '#f6f4ef');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#eeeeee';
    bCtx.fillRect(0, 0, 512, 512);

    // Organic mineral grey & warm gold veins
    const drawVein = (color, width, count) => {
      for (let v = 0; v < count; v++) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width * (0.5 + rng());
        ctx.lineCap = 'round';
        let vx = rng() * 512;
        let vy = 0;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        for (let step = 0; step < 16; step++) {
          vx += (rng() - 0.38) * 58;
          vy += 34 + rng() * 14;
          ctx.quadraticCurveTo(vx + (rng() - 0.5) * 28, vy - 16, vx, vy);
        }
        ctx.stroke();
        ctx.restore();
      }
    };

    drawVein('rgba(155, 150, 142, 0.22)', 9, 6);
    drawVein('rgba(120, 116, 110, 0.32)', 2.4, 9);
    drawVein('rgba(196, 158, 92, 0.24)', 1.8, 5);

    // Large slab subtle grout grid (256px slabs)
    ctx.strokeStyle = 'rgba(160, 155, 146, 0.35)';
    ctx.lineWidth = 1.5;
    for (let p = 0; p <= 512; p += 256) {
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
      bCtx.strokeStyle = '#999999';
      bCtx.lineWidth = 2;
      bCtx.beginPath(); bCtx.moveTo(p, 0); bCtx.lineTo(p, 512); bCtx.stroke();
      bCtx.beginPath(); bCtx.moveTo(0, p); bCtx.lineTo(512, p); bCtx.stroke();
    }

    return { map: this._toTexture(canvas, true), bumpMap: this._toTexture(bCanvas, false), bumpScale: 0.006 };
  }

  _buildSmokedWalnut() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const { canvas: bCanvas, ctx: bCtx } = this._makeCanvas(512, 512);
    const rng = this._rand(303);

    ctx.fillStyle = '#523624';
    ctx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#cccccc';
    bCtx.fillRect(0, 0, 512, 512);

    const plankH = 64;
    for (let row = 0; row < 8; row++) {
      const y = row * plankH;
      const offset = (row % 2) * 128 + Math.floor(rng() * 64);
      for (let col = -1; col < 3; col++) {
        const x = col * 256 + offset;
        const w = 256;
        const delta = (rng() - 0.5) * 22;
        ctx.fillStyle = `rgb(${(88 + delta)|0}, ${(58 + delta * 0.7)|0}, ${(38 + delta * 0.5)|0})`;
        ctx.fillRect(x, y, w, plankH);

        ctx.strokeStyle = 'rgba(32, 18, 10, 0.28)';
        ctx.lineWidth = 1.2;
        for (let g = 0; g < 16; g++) {
          const gy = y + (g / 16) * plankH;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + 85, gy + (rng() - 0.5) * 6, x + 170, gy + (rng() - 0.5) * 6, x + w, gy);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(24, 14, 8, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x, y, w, plankH);

        bCtx.strokeStyle = '#444444';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(x, y, w, plankH);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: this._toTexture(bCanvas, false), bumpScale: 0.016 };
  }

  _buildTerrazzo() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const { canvas: bCanvas, ctx: bCtx } = this._makeCanvas(512, 512);
    const rng = this._rand(404);

    ctx.fillStyle = '#ddd7ce';
    ctx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#dddddd';
    bCtx.fillRect(0, 0, 512, 512);

    const palette = ['#b87d62', '#525860', '#f5f3ee', '#9a8c7a', '#c9a46b', '#76827a'];
    for (let i = 0; i < 420; i++) {
      const cx = rng() * 512;
      const cy = rng() * 512;
      const rad = 2.5 + rng() * 9.5;
      const sides = 4 + Math.floor(rng() * 4);
      ctx.fillStyle = palette[Math.floor(rng() * palette.length)];
      ctx.beginPath();
      for (let s = 0; s < sides; s++) {
        const ang = (s / sides) * Math.PI * 2 + rng() * 0.5;
        const r = rad * (0.65 + rng() * 0.45);
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(150, 144, 134, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 254, 254);
    ctx.strokeRect(257, 1, 254, 254);
    ctx.strokeRect(1, 257, 254, 254);
    ctx.strokeRect(257, 257, 254, 254);

    return { map: this._toTexture(canvas, true), bumpMap: this._toTexture(bCanvas, false), bumpScale: 0.008 };
  }

  _buildTravertine() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const { canvas: bCanvas, ctx: bCtx } = this._makeCanvas(512, 512);
    const rng = this._rand(505);

    ctx.fillStyle = '#a39c92';
    ctx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#c8c8c8';
    bCtx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 128) {
      const off = ((y / 128) % 2) * 128;
      for (let x = -128; x < 512; x += 256) {
        const d = (rng() - 0.5) * 16;
        ctx.fillStyle = `rgb(${(162 + d)|0}, ${(155 + d)|0}, ${(145 + d)|0})`;
        ctx.fillRect(x + off, y, 256, 128);

        for (let s = 0; s < 28; s++) {
          ctx.fillStyle = `rgba(115, 108, 98, ${0.06 + rng() * 0.1})`;
          ctx.fillRect(x + off + rng() * 220, y + rng() * 124, 18 + rng() * 45, 2);
        }

        ctx.strokeStyle = 'rgba(92, 86, 78, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + off, y, 256, 128);
        bCtx.strokeStyle = '#606060';
        bCtx.lineWidth = 2.5;
        bCtx.strokeRect(x + off, y, 256, 128);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: this._toTexture(bCanvas, false), bumpScale: 0.018 };
  }

  _buildSubwayTile() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    ctx.fillStyle = '#d8d5ce';
    ctx.fillRect(0, 0, 512, 512);
    const th = 32, tw = 96;
    for (let y = 0; y < 512; y += th) {
      const off = ((y / th) % 2) * (tw / 2);
      for (let x = -tw; x < 512; x += tw) {
        ctx.fillStyle = '#f7f6f2';
        ctx.fillRect(x + off + 2, y + 2, tw - 4, th - 4);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildHexBrassTile() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(0, 0, 512, 512);
    const r = 22;
    const dx = r * 1.732;
    const dy = r * 1.5;
    for (let row = -1; row < 20; row++) {
      for (let col = -1; col < 16; col++) {
        const cx = col * dx + ((row % 2) * dx) / 2;
        const cy = row * dy;
        ctx.fillStyle = '#26292e';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + Math.cos(a) * (r - 1.6);
          const py = cy + Math.sin(a) * (r - 1.6);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildBathCeramic() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    ctx.fillStyle = '#c9c6be';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 128) {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = '#e7e4dc';
        ctx.fillRect(x + 2, y + 2, 124, 124);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildBalconyDeck() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const rng = this._rand(606);
    ctx.fillStyle = '#3d2e22';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      const d = (rng() - 0.5) * 14;
      ctx.fillStyle = `rgb(${(138 + d)|0}, ${(102 + d * 0.7)|0}, ${(70 + d * 0.5)|0})`;
      ctx.fillRect(0, y + 2, 512, 27);
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildExteriorCladding() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const rng = this._rand(707);
    ctx.fillStyle = '#ded8ce';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      const off = ((y / 64) % 2) * 128;
      for (let x = -128; x < 512; x += 256) {
        const d = (rng() - 0.5) * 10;
        ctx.fillStyle = `rgb(${(226 + d)|0}, ${(220 + d)|0}, ${(210 + d)|0})`;
        ctx.fillRect(x + off + 1, y + 1, 254, 62);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildPlazaPaver() {
    const { canvas, ctx } = this._makeCanvas(512, 512);
    const rng = this._rand(808);
    ctx.fillStyle = '#383d44';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      const off = ((y / 64) % 2) * 64;
      for (let x = -64; x < 512; x += 128) {
        const d = (rng() - 0.5) * 14;
        ctx.fillStyle = `rgb(${(72 + d)|0}, ${(77 + d)|0}, ${(85 + d)|0})`;
        ctx.fillRect(x + off + 2, y + 2, 124, 60);
      }
    }
    return { map: this._toTexture(canvas, true), bumpMap: null, bumpScale: 0 };
  }

  _buildWaterRipples() {
    const { canvas, ctx } = this._makeCanvas(256, 256);
    const rng = this._rand(909);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      const x = rng() * 256, y = rng() * 256, r = 10 + rng() * 28;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return { map: null, bumpMap: this._toTexture(canvas, false), bumpScale: 0.04 };
  }

  _buildMoonSurface() {
    const { canvas, ctx } = this._makeCanvas(512, 256);
    const rng = this._rand(1111);
    ctx.fillStyle = '#d8dce6';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 45; i++) {
      const x = rng() * 512, y = rng() * 256, r = 8 + rng() * 44;
      ctx.fillStyle = `rgba(140, 148, 165, ${0.12 + rng() * 0.22})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 80; i++) {
      const x = rng() * 512, y = rng() * 256, r = 2 + rng() * 11;
      ctx.strokeStyle = 'rgba(248, 250, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    return { map: this._toTexture(canvas, true) };
  }

  _buildGlowSprite() {
    const { canvas, ctx } = this._makeCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.22, 'rgba(255, 245, 215, 0.72)');
    g.addColorStop(0.55, 'rgba(255, 210, 140, 0.2)');
    g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return { map: this._toTexture(canvas, true) };
  }
};

