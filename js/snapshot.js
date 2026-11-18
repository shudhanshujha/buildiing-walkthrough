/**
 * Architectural Snapshot Capture Studio & Gallery Manager
 * Supports:
 *  - Clean Raw 3D Render Capture
 *  - Presentation Spec Title-Block Stamp + Optional 2D Schematic PiP Inset
 *  - Standalone High-Res 2D Schematic Blueprint Export
 *  - Session Gallery with Lightbox Preview & One-Click PNG Download
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.SnapshotStudio = class SnapshotStudio {
  constructor(config, callbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.snapshots = [];
    this.options = {
      includeSpecBar: true,
      includePlanInset: true
    };
  }

  /**
   * Captures a high-resolution PNG dataURL from the 3D WebGL canvas (or 2D schematic)
   */
  capture({ mode = '3d', webglCanvas, schematic2D, metadata, renderCleanFrame }) {
    let outCanvas;

    if (mode === '2d') {
      outCanvas = schematic2D.renderToOffscreen(1600, 1100, schematic2D.theme);
      if (this.options.includeSpecBar) {
        outCanvas = this._appendSpecFooter(outCanvas, metadata);
      }
    } else {
      // Render clean 3D frame immediately prior to pixel readback
      if (renderCleanFrame) renderCleanFrame();

      const srcW = webglCanvas.width;
      const srcH = webglCanvas.height;
      const footerH = this.options.includeSpecBar ? Math.round(Math.max(76, srcH * 0.088)) : 0;

      outCanvas = document.createElement('canvas');
      outCanvas.width = srcW;
      outCanvas.height = srcH + footerH;
      const ctx = outCanvas.getContext('2d');

      ctx.drawImage(webglCanvas, 0, 0, srcW, srcH);

      // Optional 2D Floorplan Picture-in-Picture Inset
      if (this.options.includePlanInset && schematic2D) {
        const insetW = Math.round(Math.min(340, srcW * 0.24));
        const insetH = Math.round(insetW * 0.76);
        const margin = Math.round(Math.max(18, srcW * 0.018));
        const ix = srcW - insetW - margin;
        const iy = srcH - insetH - margin;

        const planImg = schematic2D.renderToOffscreen(insetW * 2, insetH * 2);
        ctx.save();
        ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(ix - 4, iy - 4, insetW + 8, insetH + 8);
        ctx.strokeRect(ix - 4, iy - 4, insetW + 8, insetH + 8);
        ctx.drawImage(planImg, ix, iy, insetW, insetH);

        ctx.fillStyle = '#fbbf24';
        ctx.font = `700 ${Math.max(11, Math.round(insetW * 0.042))}px Inter, system-ui, sans-serif`;
        ctx.fillText(`${metadata.floorCode} SCHEMATIC`, ix + 10, iy + 20);
        ctx.restore();
      }

      // Optional Architectural Title-Block Footer
      if (this.options.includeSpecBar) {
        this._drawFooterInPlace(ctx, srcW, srcH, footerH, metadata);
      }
    }

    const dataUrl = outCanvas.toDataURL('image/png');
    const item = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dataUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: `${metadata.floorCode} · ${metadata.locationLabel}`,
      subtitle: `${metadata.compassLabel} · ${metadata.celestialLabel}`,
      specs: metadata.finishesSummary,
      filename: `aura-residences-${metadata.floorCode.toLowerCase()}-${Date.now()}.png`
    };

    this.snapshots.unshift(item);
    if (this.callbacks.onUpdate) this.callbacks.onUpdate(this.snapshots, item);
    return item;
  }

  _appendSpecFooter(baseCanvas, metadata) {
    const srcW = baseCanvas.width;
    const srcH = baseCanvas.height;
    const footerH = 92;
    const out = document.createElement('canvas');
    out.width = srcW;
    out.height = srcH + footerH;
    const ctx = out.getContext('2d');
    ctx.drawImage(baseCanvas, 0, 0);
    this._drawFooterInPlace(ctx, srcW, srcH, footerH, metadata);
    return out;
  }

  _drawFooterInPlace(ctx, w, yStart, footerH, metadata) {
    ctx.save();
    ctx.fillStyle = '#0c1017';
    ctx.fillRect(0, yStart, w, footerH);

    ctx.strokeStyle = 'rgba(212, 168, 83, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, yStart + 1);
    ctx.lineTo(w, yStart + 1);
    ctx.stroke();

    const padX = Math.max(22, Math.round(w * 0.022));
    const titleSize = Math.max(14, Math.round(footerH * 0.25));
    const subSize = Math.max(11, Math.round(footerH * 0.175));

    ctx.fillStyle = '#d4a853';
    ctx.font = `700 ${titleSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${this.config.building.name}  —  ${metadata.floorName.toUpperCase()}`, padX, yStart + footerH * 0.42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      `${metadata.locationLabel}   |   View: ${metadata.compassLabel}   |   Lighting: ${metadata.celestialLabel}`,
      padX,
      yStart + footerH * 0.74
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${subSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.fillText(metadata.finishesSummary, w - padX, yStart + footerH * 0.44);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Captured ${new Date().toLocaleString()}`, w - padX, yStart + footerH * 0.74);
    ctx.restore();
  }

  download(item) {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  remove(id) {
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    if (this.callbacks.onUpdate) this.callbacks.onUpdate(this.snapshots, null);
  }
};

