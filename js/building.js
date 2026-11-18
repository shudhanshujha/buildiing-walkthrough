/**
 * Parametric 3D Architectural Building Generator
 * Builds all 6 distinct floor layouts from single-source-of-truth room & opening data:
 *  - Topological wall deduplication (zero z-fighting)
 *  - True pass-through doorways & customizable window/glazing mullions
 *  - Multi-variation Modular Kitchens, Flooring, Walls & Furniture
 *  - Floor isolation (Dollhouse cutaway), X-Ray ghosting, and 3D highlight bands
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.BuildingBuilder = class BuildingBuilder {
  constructor(THREE, scene, config, textures) {
    this.THREE = THREE;
    this.scene = scene;
    this.config = config;
    this.textures = textures;

    this.root = new THREE.Group();
    this.root.name = 'AuraBuildingRoot';
    this.scene.add(this.root);

    // Active customization selections (option IDs)
    this.activeCustom = {
      flooring: config.customizations.flooring.options[0].id,
      windows: config.customizations.windows.options[0].id,
      kitchen: config.customizations.kitchen.options[0].id,
      walls: config.customizations.walls.options[0].id,
      furniture: config.customizations.furniture.options[0].id
    };

    this.floorRecords = [];   // One record per floor (0..5)
    this.windowAssemblies = [];
    this.kitchenAnchors = [];
    this.interiorLampBulbs = [];
    this.interiorLightsMode = 'auto'; // 'auto' | 'on' | 'off'

    this._initSharedMaterials();
    this._buildAllFloors();
    this._buildHighlightBand();
  }

  _getOpt(category, id) {
    const list = this.config.customizations[category].options;
    return list.find((o) => o.id === (id || this.activeCustom[category])) || list[0];
  }

  _initSharedMaterials() {
    const { THREE } = this;
    const floorOpt = this._getOpt('flooring');
    const floorTex = this.textures.get(floorOpt.texKey);
    const wallOpt = this._getOpt('walls');
    const winOpt = this._getOpt('windows');
    const furnOpt = this._getOpt('furniture');

    this.materials = {
      // Customizable primary flooring
      customFloor: new THREE.MeshStandardMaterial({
        map: floorTex.map,
        bumpMap: floorTex.bumpMap || null,
        bumpScale: floorTex.bumpScale || 0.01,
        roughness: floorOpt.roughness,
        metalness: floorOpt.metalness
      }),
      // Customizable interior walls
      customWall: new THREE.MeshStandardMaterial({
        color: wallOpt.color,
        roughness: wallOpt.roughness,
        metalness: 0.02
      }),
      // Customizable window frame & glazing
      windowFrame: new THREE.MeshStandardMaterial({
        color: winOpt.frameColor,
        roughness: winOpt.frameRoughness,
        metalness: winOpt.frameMetalness
      }),
      windowGlass: new THREE.MeshPhysicalMaterial({
        color: winOpt.glassColor,
        transparent: true,
        opacity: winOpt.glassOpacity,
        roughness: 0.06,
        metalness: 0.1,
        reflectivity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      // Customizable furniture materials
      furnFabric: new THREE.MeshStandardMaterial({ color: furnOpt.fabric, roughness: 0.82 }),
      furnAccent: new THREE.MeshStandardMaterial({ color: furnOpt.accent, roughness: 0.65 }),
      furnWood: new THREE.MeshStandardMaterial({ color: furnOpt.wood, roughness: 0.45, metalness: 0.05 }),

      // Fixed architectural materials
      extWall: new THREE.MeshStandardMaterial({
        map: this.textures.get('exterior_cladding').map,
        color: 0xeae4da,
        roughness: 0.62,
        metalness: 0.04
      }),
      slabFascia: new THREE.MeshStandardMaterial({
        color: 0x2a2f37,
        roughness: 0.42,
        metalness: 0.45
      }),
      slabTrimGold: new THREE.MeshStandardMaterial({
        color: 0xc59f59,
        roughness: 0.3,
        metalness: 0.72
      }),
      bathFloor: new THREE.MeshStandardMaterial({
        map: this.textures.get('bath_ceramic').map,
        roughness: 0.25,
        metalness: 0.05
      }),
      lobbyFloor: new THREE.MeshStandardMaterial({
        map: this.textures.get('calacatta_marble').map,
        roughness: 0.18,
        metalness: 0.06
      }),
      balconyFloor: new THREE.MeshStandardMaterial({
        map: this.textures.get('balcony_deck').map,
        roughness: 0.68,
        metalness: 0.04
      }),
      coreFloor: new THREE.MeshStandardMaterial({
        color: 0x3a3f47,
        roughness: 0.75
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0xf7f5f0,
        roughness: 0.88
      }),
      railingGlass: new THREE.MeshStandardMaterial({
        color: 0xcfe9ff,
        transparent: true,
        opacity: 0.34,
        roughness: 0.08,
        metalness: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      railingMetal: new THREE.MeshStandardMaterial({
        color: 0x232830,
        roughness: 0.35,
        metalness: 0.75
      }),
      doorWood: new THREE.MeshStandardMaterial({
        color: 0x6e4e35,
        roughness: 0.48,
        metalness: 0.06
      }),
      elevatorMetal: new THREE.MeshStandardMaterial({
        color: 0xbba172,
        roughness: 0.26,
        metalness: 0.82
      }),
      porcelain: new THREE.MeshStandardMaterial({
        color: 0xf8f8f6,
        roughness: 0.16,
        metalness: 0.05
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: 0xd8dde3,
        roughness: 0.18,
        metalness: 0.9
      }),
      darkAppliance: new THREE.MeshStandardMaterial({
        color: 0x1a1d22,
        roughness: 0.25,
        metalness: 0.6
      }),
      tvScreen: new THREE.MeshStandardMaterial({
        color: 0x0d121a,
        emissive: 0x162840,
        emissiveIntensity: 0.35,
        roughness: 0.12,
        metalness: 0.4
      }),
      plantGreen: new THREE.MeshStandardMaterial({
        color: 0x3b6e42,
        roughness: 0.78
      }),
      ghostShell: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.11,
        roughness: 0.5,
        depthWrite: false
      })
    };
  }

  /**
   * Scales PlaneGeometry UVs in world meters so shared materials tile uniformly
   */
  _makeWorldUVPlane(w, d, tileSize = 2.2) {
    const { THREE } = this;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * (w / tileSize), uv.getY(i) * (d / tileSize));
    }
    uv.needsUpdate = true;
    return geo;
  }

  /**
   * Topological wall extractor on 0.5m architectural grid
   * Guarantees zero duplicate interior partitions and clean classification
   */
  extractFloorTopology(floorData) {
    const STEP = 0.5;
    const roomAt = (px, pz) => {
      for (const r of floorData.rooms) {
        if (px > r.x && px < r.x + r.w && pz > r.z && pz < r.z + r.d) return r;
      }
      return null;
    };

    const classifyPair = (rA, rB) => {
      if (rA === rB) return null;
      const aIn = rA && !rA.isBalcony;
      const bIn = rB && !rB.isBalcony;
      if (aIn && bIn) return 'interior';
      if (aIn || bIn) return 'exterior';
      if ((rA && rA.isBalcony) || (rB && rB.isBalcony)) return 'railing';
      return null;
    };

    const spans = [];

    // Horizontal grid lines z in [-7.5 .. +7.5]
    for (let z = -7.5; z <= 7.501; z += STEP) {
      const zRound = Math.round(z * 100) / 100;
      let cur = null;
      for (let x = -10.0; x < 9.999; x += STEP) {
        const rNorth = roomAt(x + STEP * 0.5, zRound - 0.12);
        const rSouth = roomAt(x + STEP * 0.5, zRound + 0.12);
        const kind = classifyPair(rNorth, rSouth);
        // Track which side faces outside for exterior cladding orientation
        const extFace = kind === 'exterior' ? (rNorth && !rNorth.isBalcony ? 1 : -1) : 0;
        if (kind && cur && cur.kind === kind && cur.extFace === extFace) {
          cur.end = Math.round((x + STEP) * 100) / 100;
        } else {
          if (cur) spans.push(cur);
          cur = kind
            ? { orient: 'H', fixed: zRound, start: Math.round(x * 100) / 100, end: Math.round((x + STEP) * 100) / 100, kind, extFace }
            : null;
        }
      }
      if (cur) spans.push(cur);
    }

    // Vertical grid lines x in [-10.0 .. +10.0]
    for (let x = -10.0; x <= 10.001; x += STEP) {
      const xRound = Math.round(x * 100) / 100;
      let cur = null;
      for (let z = -7.5; z < 7.499; z += STEP) {
        const rWest = roomAt(xRound - 0.12, z + STEP * 0.5);
        const rEast = roomAt(xRound + 0.12, z + STEP * 0.5);
        const kind = classifyPair(rWest, rEast);
        const extFace = kind === 'exterior' ? (rWest && !rWest.isBalcony ? 1 : -1) : 0;
        if (kind && cur && cur.kind === kind && cur.extFace === extFace) {
          cur.end = Math.round((z + STEP) * 100) / 100;
        } else {
          if (cur) spans.push(cur);
          cur = kind
            ? { orient: 'V', fixed: xRound, start: Math.round(z * 100) / 100, end: Math.round((z + STEP) * 100) / 100, kind, extFace }
            : null;
        }
      }
      if (cur) spans.push(cur);
    }

    return spans;
  }

  _buildAllFloors() {
    const { THREE, config } = this;
    const { podiumHeight, floorHeight, slabThickness, width, depth } = config.building;

    config.floors.forEach((floorData, idx) => {
      const floorGroup = new THREE.Group();
      floorGroup.name = `Floor_${floorData.level}`;
      const baseSlabY = podiumHeight + idx * floorHeight;
      const walkY = baseSlabY + slabThickness;
      const wallH = floorHeight - slabThickness; // 3.26m clear height

      floorGroup.position.y = baseSlabY;
      this.root.add(floorGroup);

      const solidGroup = new THREE.Group();   // Standard architectural meshes
      const ceilingGroup = new THREE.Group(); // Ceiling/roof (hidden when floor is isolated in Dollhouse view)
      const ghostGroup = new THREE.Group();   // Semi-transparent massing when X-Ray ghosting non-active floors
      ghostGroup.visible = false;
      floorGroup.add(solidGroup, ceilingGroup, ghostGroup);

      // 1. Structural Slab Base & Exterior Architectural Fascia Band
      const slabMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.18, slabThickness, depth + 0.18),
        this.materials.slabFascia
      );
      slabMesh.position.set(0, slabThickness / 2, 0);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = true;
      solidGroup.add(slabMesh);

      const goldTrim = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.24, 0.045, depth + 0.24),
        this.materials.slabTrimGold
      );
      goldTrim.position.set(0, slabThickness - 0.03, 0);
      solidGroup.add(goldTrim);

      // Entrance Canopy on Floor 1 South Entry
      if (idx === 0) {
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(6.8, 0.22, 2.8),
          this.materials.slabFascia
        );
        canopy.position.set(0, slabThickness + wallH - 0.15, depth / 2 + 1.4);
        canopy.castShadow = true;
        solidGroup.add(canopy);

        const canopyTrim = new THREE.Mesh(
          new THREE.BoxGeometry(6.9, 0.05, 2.9),
          this.materials.slabTrimGold
        );
        canopyTrim.position.set(0, slabThickness + wallH - 0.25, depth / 2 + 1.4);
        solidGroup.add(canopyTrim);
      }

      // 2. Room Surface Flooring, Ceiling & Interior Ambient Light Fixtures
      const roomMeshes = [];
      for (const room of floorData.rooms) {
        const cx = room.x + room.w / 2;
        const cz = room.z + room.d / 2;

        let fMat = this.materials.customFloor;
        let isCustomFloor = false;
        if (room.isBalcony) fMat = this.materials.balconyFloor;
        else if (room.category === 'bath') fMat = this.materials.bathFloor;
        else if (room.category === 'core') fMat = this.materials.coreFloor;
        else if (room.category === 'lobby' || room.category === 'corridor') fMat = this.materials.lobbyFloor;
        else isCustomFloor = true;

        const fGeo = this._makeWorldUVPlane(room.w - 0.02, room.d - 0.02, 2.2);
        const fMesh = new THREE.Mesh(fGeo, fMat);
        fMesh.position.set(cx, slabThickness + 0.008, cz);
        fMesh.receiveShadow = true;
        fMesh.userData = {
          floorIndex: idx,
          roomId: room.id,
          roomName: room.name,
          customCategory: isCustomFloor ? 'flooring' : null
        };
        solidGroup.add(fMesh);
        roomMeshes.push(fMesh);

        // Ceiling over indoor rooms (hidden in cutaway mode so viewer can see inside)
        if (!room.isBalcony) {
          const ceilGeo = new THREE.PlaneGeometry(room.w, room.d);
          ceilGeo.rotateX(Math.PI / 2);
          const ceilMesh = new THREE.Mesh(ceilGeo, this.materials.ceiling);
          ceilMesh.position.set(cx, slabThickness + wallH - 0.01, cz);
          ceilingGroup.add(ceilMesh);

          // Penthouse crown roof slab above F6 indoor pavilion
          if (floorData.isPenthouse) {
            const roofCap = new THREE.Mesh(
              new THREE.BoxGeometry(room.w + 0.5, 0.28, room.d + 0.5),
              this.materials.slabFascia
            );
            roofCap.position.set(cx, slabThickness + wallH + 0.14, cz);
            roofCap.castShadow = true;
            roofCap.receiveShadow = true;
            ceilingGroup.add(roofCap);
          }

          // Warm recessed ceiling downlight puck
          if (room.category !== 'core') {
            const puckMat = new THREE.MeshStandardMaterial({
              color: 0xfff6e0,
              emissive: 0xffc875,
              emissiveIntensity: 0.4
            });
            const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), puckMat);
            puck.position.set(cx, slabThickness + wallH - 0.02, cz);
            ceilingGroup.add(puck);
            this.interiorLampBulbs.push(puck);
          }
        }
      }

      // 3. Walls, Doorways, Customizable Windows & Balcony Railings
      const wallSpans = this.extractFloorTopology(floorData);
      const collisionSegments = [];

      for (const span of wallSpans) {
        this._buildSpanGeometry(span, floorData, idx, slabThickness, wallH, solidGroup, collisionSegments);
      }

      // 4. Room Furniture & Customizable Modular Kitchens
      const furnitureGroup = new THREE.Group();
      furnitureGroup.position.y = slabThickness;
      solidGroup.add(furnitureGroup);

      for (const room of floorData.rooms) {
        if (!room.furniturePreset) continue;
        if (room.category === 'kitchen') {
          const anchor = new THREE.Group();
          furnitureGroup.add(anchor);
          const kRec = { anchor, room, floorIndex: idx };
          this.kitchenAnchors.push(kRec);
          this._populateModularKitchen(kRec);
        } else {
          this._populateRoomFurniture(furnitureGroup, room, idx, wallH);
        }
      }

      // Add warm ambient interior point light per floor (toggled at dusk/night or manually)
      const floorWarmLight = new THREE.PointLight(0xffcb80, 0, 22, 1.5);
      floorWarmLight.position.set(0, slabThickness + 2.6, 0.5);
      solidGroup.add(floorWarmLight);

      // 5. Ghost Shell Box for X-Ray non-selected floors
      const ghostW = floorData.isPenthouse ? 13.0 : width;
      const ghostD = floorData.isPenthouse ? 11.0 : depth;
      const ghostZ = floorData.isPenthouse ? -2.0 : 0;
      const ghostBox = new THREE.Mesh(
        new THREE.BoxGeometry(ghostW, floorHeight - 0.06, ghostD),
        this.materials.ghostShell
      );
      ghostBox.position.set(0, floorHeight / 2, ghostZ);
      const ghostEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(ghostBox.geometry),
        new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.25 })
      );
      ghostEdges.position.copy(ghostBox.position);
      ghostGroup.add(ghostBox, ghostEdges);

      this.floorRecords.push({
        index: idx,
        level: floorData.level,
        data: floorData,
        floorGroup,
        solidGroup,
        ceilingGroup,
        ghostGroup,
        floorWarmLight,
        walkY,
        baseSlabY,
        wallSpans,
        collisionSegments,
        roomMeshes
      });
    });
  }

  _buildSpanGeometry(span, floorData, floorIdx, baseY, wallH, parentGroup, collisionSegments) {
    const { THREE, config } = this;
    const isH = span.orient === 'H';

    // Balcony Glass & Metal Balustrade
    if (span.kind === 'railing') {
      const len = span.end - span.start;
      const mid = (span.start + span.end) / 2;
      const railH = 1.08;

      const glassGeo = isH
        ? new THREE.BoxGeometry(len, railH - 0.08, 0.03)
        : new THREE.BoxGeometry(0.03, railH - 0.08, len);
      const glass = new THREE.Mesh(glassGeo, this.materials.railingGlass);
      glass.position.set(isH ? mid : span.fixed, baseY + (railH - 0.08) / 2 + 0.04, isH ? span.fixed : mid);

      const topBarGeo = isH
        ? new THREE.BoxGeometry(len + 0.04, 0.05, 0.07)
        : new THREE.BoxGeometry(0.07, 0.05, len + 0.04);
      const topBar = new THREE.Mesh(topBarGeo, this.materials.railingMetal);
      topBar.position.set(isH ? mid : span.fixed, baseY + railH, isH ? span.fixed : mid);

      parentGroup.add(glass, topBar);

      // Vertical posts every ~2.5m
      const posts = Math.max(2, Math.ceil(len / 2.5) + 1);
      for (let i = 0; i < posts; i++) {
        const pCoord = span.start + (i / (posts - 1)) * len;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, railH, 0.05), this.materials.railingMetal);
        post.position.set(isH ? pCoord : span.fixed, baseY + railH / 2, isH ? span.fixed : pCoord);
        parentGroup.add(post);
      }

      collisionSegments.push({
        x1: isH ? span.start : span.fixed,
        z1: isH ? span.fixed : span.start,
        x2: isH ? span.end : span.fixed,
        z2: isH ? span.fixed : span.end
      });
      return;
    }

    const thickness = span.kind === 'exterior' ? config.building.wallThicknessExt : config.building.wallThicknessInt;
    const wallMat = span.kind === 'exterior' ? this.materials.extWall : this.materials.customWall;
    const customCat = span.kind === 'interior' ? 'walls' : null;

    // Collect doors & windows along this exact wall line
    const openings = [];
    for (const d of floorData.doors) {
      if (d.orient === span.orient) {
        const lineCoord = isH ? d.z : d.x;
        const posCoord = isH ? d.x : d.z;
        if (Math.abs(lineCoord - span.fixed) < 0.05 && posCoord > span.start && posCoord < span.end) {
          openings.push({ kind: 'door', pos: posCoord, width: d.width, style: d.style, sill: 0, head: 2.36 });
        }
      }
    }
    for (const w of floorData.windows) {
      if (w.orient === span.orient) {
        const lineCoord = isH ? w.z : w.x;
        const posCoord = isH ? w.x : w.z;
        if (Math.abs(lineCoord - span.fixed) < 0.05 && posCoord > span.start && posCoord < span.end) {
          openings.push({ kind: 'window', pos: posCoord, width: w.width, sill: w.sill, head: w.head });
        }
      }
    }
    openings.sort((a, b) => a.pos - b.pos);

    const addWallPiece = (s, e, y0, y1) => {
      const len = e - s;
      const h = y1 - y0;
      if (len <= 0.02 || h <= 0.02) return;
      const mid = (s + e) / 2;
      const geo = isH ? new THREE.BoxGeometry(len, h, thickness) : new THREE.BoxGeometry(thickness, h, len);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(isH ? mid : span.fixed, baseY + y0 + h / 2, isH ? span.fixed : mid);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (customCat) mesh.userData = { floorIndex: floorIdx, customCategory: customCat };
      parentGroup.add(mesh);

      // Add interior plaster lining face on exterior walls so custom wall color shows indoors too!
      if (span.kind === 'exterior' && span.extFace !== 0) {
        const linerGeo = isH ? new THREE.PlaneGeometry(len, h) : new THREE.PlaneGeometry(len, h);
        const liner = new THREE.Mesh(linerGeo, this.materials.customWall);
        const offset = -span.extFace * (thickness / 2 + 0.004);
        if (isH) {
          liner.position.set(mid, baseY + y0 + h / 2, span.fixed + offset);
          if (span.extFace > 0) liner.rotation.y = Math.PI;
        } else {
          liner.position.set(span.fixed + offset, baseY + y0 + h / 2, mid);
          liner.rotation.y = span.extFace > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        liner.receiveShadow = true;
        liner.userData = { floorIndex: floorIdx, customCategory: 'walls' };
        parentGroup.add(liner);
      }
    };

    const addCollision = (s, e) => {
      if (e - s <= 0.02) return;
      collisionSegments.push({
        x1: isH ? s : span.fixed,
        z1: isH ? span.fixed : s,
        x2: isH ? e : span.fixed,
        z2: isH ? span.fixed : e
      });
    };

    let cursor = span.start;
    for (const op of openings) {
      const opS = Math.max(cursor, op.pos - op.width / 2);
      const opE = Math.min(span.end, op.pos + op.width / 2);
      if (opS > cursor) {
        addWallPiece(cursor, opS, 0, wallH);
        addCollision(cursor, opS);
      }

      if (op.kind === 'door') {
        // Header lintel above doorway
        addWallPiece(opS, opE, op.head, wallH);
        this._buildDoorAssembly(parentGroup, isH, span.fixed, opS, opE, baseY, op.head, thickness, op.style);
        // Only elevator shaft doors block player walking; all room/balcony doors are pass-through!
        if (op.style === 'elevator') {
          addCollision(opS, opE);
        }
      } else if (op.kind === 'window') {
        // Sill below & lintel above window
        addWallPiece(opS, opE, 0, op.sill);
        addWallPiece(opS, opE, op.head, wallH);
        this._buildWindowAssembly(parentGroup, floorIdx, isH, span.fixed, opS, opE, baseY + op.sill, op.head - op.sill, thickness);
        addCollision(opS, opE);
      }
      cursor = opE;
    }

    if (cursor < span.end) {
      addWallPiece(cursor, span.end, 0, wallH);
      addCollision(cursor, span.end);
    }
  }

  _buildDoorAssembly(parentGroup, isH, fixed, s, e, baseY, headH, thickness, style) {
    const { THREE } = this;
    const w = e - s;
    const mid = (s + e) / 2;
    const frameDepth = thickness + 0.03;

    const jambMat = style === 'elevator' ? this.materials.elevatorMetal : this.materials.railingMetal;
    const j1 = new THREE.Mesh(
      isH ? new THREE.BoxGeometry(0.05, headH, frameDepth) : new THREE.BoxGeometry(frameDepth, headH, 0.05),
      jambMat
    );
    j1.position.set(isH ? s + 0.025 : fixed, baseY + headH / 2, isH ? fixed : s + 0.025);
    const j2 = j1.clone();
    j2.position.set(isH ? e - 0.025 : fixed, baseY + headH / 2, isH ? fixed : e - 0.025);
    const topJamb = new THREE.Mesh(
      isH ? new THREE.BoxGeometry(w, 0.05, frameDepth) : new THREE.BoxGeometry(frameDepth, 0.05, w),
      jambMat
    );
    topJamb.position.set(isH ? mid : fixed, baseY + headH - 0.025, isH ? fixed : mid);
    parentGroup.add(j1, j2, topJamb);

    if (style === 'elevator') {
      // Closed brushed bronze elevator double doors
      const panelGeo = isH
        ? new THREE.BoxGeometry(w / 2 - 0.03, headH - 0.05, 0.05)
        : new THREE.BoxGeometry(0.05, headH - 0.05, w / 2 - 0.03);
      const p1 = new THREE.Mesh(panelGeo, this.materials.elevatorMetal);
      const p2 = new THREE.Mesh(panelGeo, this.materials.elevatorMetal);
      p1.position.set(isH ? mid - w / 4 : fixed, baseY + (headH - 0.05) / 2, isH ? fixed : mid - w / 4);
      p2.position.set(isH ? mid + w / 4 : fixed, baseY + (headH - 0.05) / 2, isH ? fixed : mid + w / 4);
      parentGroup.add(p1, p2);
    } else if (style === 'wood') {
      // Architectural wood door leaf swung open at 76° so doorway is completely clear to walk through!
      const pivot = new THREE.Group();
      pivot.position.set(isH ? s + 0.05 : fixed, baseY, isH ? fixed : s + 0.05);
      const leafW = w - 0.1;
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(leafW, headH - 0.06, 0.045),
        this.materials.doorWood
      );
      leaf.position.set(leafW / 2, (headH - 0.06) / 2, 0);
      leaf.castShadow = true;
      pivot.add(leaf);
      pivot.rotation.y = isH ? -1.32 : 0.25;
      parentGroup.add(pivot);
    } else if (style === 'glass' || style === 'glass_double') {
      // Parted glass sliding panel tucked neatly to the side of the opening
      const panelW = w * 0.34;
      const glassPanel = new THREE.Mesh(
        isH ? new THREE.BoxGeometry(panelW, headH - 0.08, 0.03) : new THREE.BoxGeometry(0.03, headH - 0.08, panelW),
        this.materials.windowGlass
      );
      glassPanel.position.set(
        isH ? s + panelW / 2 + 0.04 : fixed,
        baseY + (headH - 0.08) / 2,
        isH ? fixed : s + panelW / 2 + 0.04
      );
      parentGroup.add(glassPanel);
    }
  }

  _buildWindowAssembly(parentGroup, floorIdx, isH, fixed, s, e, yBottom, h, thickness) {
    const { THREE } = this;
    const w = e - s;
    const mid = (s + e) / 2;

    const winGroup = new THREE.Group();
    winGroup.position.set(isH ? mid : fixed, yBottom + h / 2, isH ? fixed : mid);
    if (!isH) winGroup.rotation.y = Math.PI / 2;
    parentGroup.add(winGroup);

    const record = { group: winGroup, w, h, thickness, floorIdx };
    this.windowAssemblies.push(record);
    this._populateWindowMullions(record);
  }

  _populateWindowMullions(record) {
    const { THREE } = this;
    const { group, w, h, thickness, floorIdx } = record;
    while (group.children.length > 0) {
      const c = group.children.pop();
      if (c.geometry) c.geometry.dispose();
    }

    const opt = this._getOpt('windows');
    const tagData = { floorIndex: floorIdx, customCategory: 'windows' };
    const fDepth = thickness + 0.04;
    const bar = 0.055;

    // Outer perimeter frame
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, bar, fDepth), this.materials.windowFrame);
    top.position.y = h / 2 - bar / 2;
    const bot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, bar * 1.2, fDepth + 0.05), this.materials.windowFrame);
    bot.position.y = -h / 2 + bar / 2;
    const left = new THREE.Mesh(new THREE.BoxGeometry(bar, h, fDepth), this.materials.windowFrame);
    left.position.x = -w / 2 + bar / 2;
    const right = new THREE.Mesh(new THREE.BoxGeometry(bar, h, fDepth), this.materials.windowFrame);
    right.position.x = w / 2 - bar / 2;

    // Glazing pane (does NOT cast shadow so sunlight streams directly onto room floors!)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - bar * 2, h - bar * 2), this.materials.windowGlass);
    glass.castShadow = false;

    [top, bot, left, right, glass].forEach((m) => {
      m.userData = tagData;
      group.add(m);
    });

    // Variation-specific Mullion Architecture
    const style = opt.mullionStyle;
    if (style === 'minimal') {
      if (w > 2.2) {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.035, h - bar * 2, fDepth * 0.7), this.materials.windowFrame);
        vBar.userData = tagData;
        group.add(vBar);
      }
    } else if (style === 'transom') {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(w - bar * 2, 0.045, fDepth * 0.8), this.materials.windowFrame);
      hBar.position.y = h * 0.24;
      hBar.userData = tagData;
      group.add(hBar);
      const cols = Math.max(2, Math.round(w / 1.3));
      for (let i = 1; i < cols; i++) {
        const vx = -w / 2 + (i / cols) * w;
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, h - bar * 2, fDepth * 0.75), this.materials.windowFrame);
        vBar.position.x = vx;
        vBar.userData = tagData;
        group.add(vBar);
      }
    } else if (style === 'french_grid') {
      const cols = Math.max(2, Math.round(w / 0.85));
      const rows = Math.max(2, Math.round(h / 0.75));
      for (let i = 1; i < cols; i++) {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.032, h - bar * 2, 0.05), this.materials.windowFrame);
        vBar.position.x = -w / 2 + (i / cols) * w;
        vBar.userData = tagData;
        group.add(vBar);
      }
      for (let j = 1; j < rows; j++) {
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(w - bar * 2, 0.032, 0.05), this.materials.windowFrame);
        hBar.position.y = -h / 2 + (j / rows) * h;
        hBar.userData = tagData;
        group.add(hBar);
      }
    } else if (style === 'double_vertical') {
      const count = Math.max(2, Math.floor(w / 0.95));
      for (let i = 1; i <= count; i++) {
        const vx = -w / 2 + (i / (count + 1)) * w;
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - bar * 2, fDepth * 0.85), this.materials.windowFrame);
        vBar.position.x = vx;
        vBar.userData = tagData;
        group.add(vBar);
      }
    }
  }

  /**
   * Builds a multi-variation 3D Modular Kitchen inside a kitchen room
   */
  _populateModularKitchen(kRec) {
    const { THREE } = this;
    const { anchor, room, floorIndex } = kRec;

    while (anchor.children.length > 0) {
      const child = anchor.children.pop();
      child.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material && n.userData && n.userData.ownMaterial) n.material.dispose();
      });
    }

    const opt = this._getOpt('kitchen');
    const tag = { floorIndex, roomId: room.id, customCategory: 'kitchen', ownMaterial: true };

    const cabMat = new THREE.MeshStandardMaterial({ color: opt.cabinetColor, roughness: 0.42, metalness: 0.08 });
    const upperMat = new THREE.MeshStandardMaterial({ color: opt.upperColor, roughness: 0.38, metalness: 0.06 });
    const hardMat = new THREE.MeshStandardMaterial({ color: opt.hardwareColor, roughness: 0.25, metalness: 0.85 });

    const cTex = this.textures.get(opt.counterTex);
    const counterMat = new THREE.MeshStandardMaterial({
      map: cTex.map,
      roughness: 0.18,
      metalness: 0.06
    });

    const bTex = this.textures.get(opt.backsplashTex);
    const splashMat = new THREE.MeshStandardMaterial({
      map: bTex.map,
      roughness: 0.22,
      metalness: 0.1
    });

    const mark = (mesh) => {
      mesh.userData = { floorIndex, roomId: room.id, customCategory: 'kitchen' };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // Place primary counter run neatly along North wall (or East/South depending on room position)
    const alongNorth = room.z <= -3.5;
    const runLen = Math.min(room.w - 0.5, 4.6);
    const cx = room.x + room.w / 2;
    const wallZ = alongNorth ? room.z + 0.46 : room.z + room.d - 0.46;
    const faceSign = alongNorth ? 1 : -1;

    // 1. Base Cabinets + Toe Kick
    const baseCab = mark(new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.86, 0.65), cabMat));
    baseCab.position.set(cx, 0.45, wallZ);
    anchor.add(baseCab);

    // Shaker recessed door rails & hardware pulls
    const doorCount = Math.max(4, Math.round(runLen / 0.6));
    const doorW = (runLen - 0.08) / doorCount;
    for (let i = 0; i < doorCount; i++) {
      const dx = cx - runLen / 2 + 0.04 + doorW * (i + 0.5);
      if (opt.shakerStyle) {
        const frame = mark(new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.05, 0.72, 0.025), upperMat));
        frame.position.set(dx, 0.48, wallZ + faceSign * 0.33);
        anchor.add(frame);
      }
      const pull = mark(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.03), hardMat));
      pull.position.set(dx, 0.76, wallZ + faceSign * 0.345);
      anchor.add(pull);
    }

    // 2. Stone / Wood Countertop
    const counter = mark(new THREE.Mesh(new THREE.BoxGeometry(runLen + 0.04, 0.045, 0.69), counterMat));
    counter.position.set(cx, 0.90, wallZ);
    anchor.add(counter);

    // 3. Tiled Backsplash
    const splash = mark(new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.62, 0.03), splashMat));
    splash.position.set(cx, 1.23, wallZ - faceSign * 0.31);
    anchor.add(splash);

    // 4. Overhead Upper Cabinets + Warm Under-Cabinet LED Strip
    const upperW = runLen * 0.72;
    const upperCab = mark(new THREE.Mesh(new THREE.BoxGeometry(upperW, 0.78, 0.38), upperMat));
    upperCab.position.set(cx - runLen * 0.12, 1.94, wallZ - faceSign * 0.14);
    anchor.add(upperCab);

    const ledStrip = new THREE.Mesh(
      new THREE.BoxGeometry(upperW - 0.1, 0.018, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xffe6b3 })
    );
    ledStrip.position.set(cx - runLen * 0.12, 1.54, wallZ - faceSign * 0.06);
    anchor.add(ledStrip);

    // 5. Induction Cooktop, Architectural Range Hood & Undermount Sink + Faucet
    const cooktop = mark(new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.018, 0.48), this.materials.darkAppliance));
    cooktop.position.set(cx + runLen * 0.22, 0.928, wallZ);
    anchor.add(cooktop);

    const hood = mark(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.75, 0.46), hardMat));
    hood.position.set(cx + runLen * 0.22, 1.98, wallZ - faceSign * 0.08);
    anchor.add(hood);

    const sink = mark(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.44), this.materials.chrome));
    sink.position.set(cx - runLen * 0.22, 0.926, wallZ);
    anchor.add(sink);

    const faucetStem = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 10), hardMat));
    faucetStem.position.set(cx - runLen * 0.22, 1.08, wallZ - faceSign * 0.22);
    anchor.add(faucetStem);

    // 6. Tall Refrigerator & Oven Tower at end of run
    const fridgeX = cx + runLen / 2 - 0.36;
    const fridge = mark(new THREE.Mesh(new THREE.BoxGeometry(0.74, 2.22, 0.7), this.materials.darkAppliance));
    fridge.position.set(fridgeX, 1.11, wallZ);
    anchor.add(fridge);

    // 7. Waterfall Modular Kitchen Island + Bar Stools + Pendant Lamps (variation-controlled!)
    if (opt.hasIsland && room.d >= 3.5 && room.w >= 4.0) {
      const islW = Math.min(room.w * 0.56, 2.6);
      const islZ = wallZ + faceSign * 1.72;

      const islBase = mark(new THREE.Mesh(new THREE.BoxGeometry(islW - 0.08, 0.88, 0.86), cabMat));
      islBase.position.set(cx, 0.44, islZ);
      anchor.add(islBase);

      // Waterfall countertop top + side legs
      const islTop = mark(new THREE.Mesh(new THREE.BoxGeometry(islW, 0.05, 0.94), counterMat));
      islTop.position.set(cx, 0.905, islZ);
      const wfL = mark(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.92, 0.94), counterMat));
      wfL.position.set(cx - islW / 2 + 0.02, 0.46, islZ);
      const wfR = mark(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.92, 0.94), counterMat));
      wfR.position.set(cx + islW / 2 - 0.02, 0.46, islZ);
      anchor.add(islTop, wfL, wfR);

      // Designer Bar Stools
      const stoolCount = islW >= 2.1 ? 3 : 2;
      for (let s = 0; s < stoolCount; s++) {
        const sx = cx - (islW * 0.3) + (stoolCount > 1 ? (s / (stoolCount - 1)) * (islW * 0.6) : 0);
        const sz = islZ + faceSign * 0.65;
        const leg = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.64, 8), hardMat));
        leg.position.set(sx, 0.32, sz);
        const seat = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.06, 16), this.materials.furnFabric));
        seat.position.set(sx, 0.65, sz);
        anchor.add(leg, seat);
      }

      // Sculptural Kitchen Island Pendant Lights
      if (opt.hasPendants) {
        for (const off of [-islW * 0.25, islW * 0.25]) {
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 6), hardMat);
          cord.position.set(cx + off, 2.72, islZ);
          const shade = mark(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 16), hardMat));
          shade.position.set(cx + off, 2.16, islZ);
          const globe = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xfff0cc })
          );
          globe.position.set(cx + off, 2.06, islZ);
          anchor.add(cord, shade, globe);
        }
      }
    }
  }

  /**
   * Populates Living, Dining, Bedroom, Bath, Balcony, Lobby & Rooftop Spaces
   */
  _populateRoomFurniture(parent, room, floorIdx, wallH) {
    const { THREE } = this;
    const cx = room.x + room.w / 2;
    const cz = room.z + room.d / 2;
    const p = room.furniturePreset;
    const tagFurn = { floorIndex: floorIdx, roomId: room.id, customCategory: 'furniture' };

    const addBox = (w, h, d, mat, x, y, z, custom = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      if (custom) m.userData = tagFurn;
      parent.add(m);
      return m;
    };

    const addPlant = (px, pz, scale = 1) => {
      const pot = addBox(0.36 * scale, 0.38 * scale, 0.36 * scale, this.materials.porcelain, px, 0.19 * scale, pz, false);
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 * scale, 1), this.materials.plantGreen);
      bush.position.set(px, 0.65 * scale, pz);
      bush.castShadow = true;
      parent.add(pot, bush);
    };

    if (p === 'living_dining' || p === 'living_large' || p === 'sky_salon') {
      const big = p !== 'living_dining';
      const sw = Math.min(room.w * 0.52, big ? 3.2 : 2.3);
      // Area rug
      addBox(sw + 0.9, 0.015, 2.4, this.materials.furnAccent, cx, 0.01, cz + 0.2);
      // Sofa base + backrest + chaise
      addBox(sw, 0.42, 0.92, this.materials.furnFabric, cx, 0.21, cz - 0.4);
      addBox(sw, 0.44, 0.22, this.materials.furnFabric, cx, 0.56, cz - 0.75);
      addBox(0.88, 0.42, 1.55, this.materials.furnFabric, cx - sw / 2 + 0.44, 0.21, cz - 0.08);
      // Coffee table
      addBox(sw * 0.52, 0.34, 0.68, this.materials.furnWood, cx + 0.25, 0.17, cz + 0.55);
      // Media console + TV on opposite side
      const tvZ = Math.min(room.z + room.d - 0.35, cz + 2.1);
      addBox(Math.min(2.2, room.w - 1.2), 0.46, 0.42, this.materials.furnWood, cx, 0.23, tvZ);
      addBox(Math.min(1.75, room.w - 1.5), 0.98, 0.05, this.materials.tvScreen, cx, 1.25, tvZ + 0.08, false);
      addPlant(room.x + 0.55, room.z + room.d - 0.55, 1.05);
    } else if (p === 'dining' || p === 'dining_grand') {
      const tw = p === 'dining_grand' ? 2.4 : 1.65;
      addBox(tw, 0.06, 0.95, this.materials.furnWood, cx, 0.74, cz);
      addBox(0.18, 0.72, 0.55, this.materials.furnWood, cx - tw * 0.3, 0.36, cz);
      addBox(0.18, 0.72, 0.55, this.materials.furnWood, cx + tw * 0.3, 0.36, cz);
      const chairs = p === 'dining_grand' ? 3 : 2;
      for (let i = 0; i < chairs; i++) {
        const ox = cx - tw * 0.3 + (i / (chairs - 1)) * (tw * 0.6);
        addBox(0.44, 0.45, 0.44, this.materials.furnFabric, ox, 0.23, cz - 0.68);
        addBox(0.44, 0.45, 0.44, this.materials.furnFabric, ox, 0.23, cz + 0.68);
      }
    } else if (p === 'bedroom' || p === 'bedroom_master' || p === 'studio_suite') {
      const king = p === 'bedroom_master';
      const bw = king ? 1.95 : 1.6;
      const bd = 2.08;
      // Place headboard against West or East exterior/side wall
      const headWest = room.x < 0;
      const bedX = headWest ? room.x + bd / 2 + 0.16 : room.x + room.w - bd / 2 - 0.16;
      // Platform frame + mattress + pillows + headboard
      addBox(bd, 0.32, bw + 0.12, this.materials.furnWood, bedX, 0.16, cz);
      addBox(bd - 0.12, 0.24, bw - 0.06, this.materials.porcelain, bedX + (headWest ? 0.04 : -0.04), 0.42, cz, false);
      addBox(bd * 0.52, 0.26, bw - 0.04, this.materials.furnAccent, bedX + (headWest ? 0.42 : -0.42), 0.43, cz);
      addBox(0.12, 1.18, bw + 0.25, this.materials.furnFabric, headWest ? room.x + 0.12 : room.x + room.w - 0.12, 0.59, cz);
      // Nightstands
      const nsX = headWest ? room.x + 0.36 : room.x + room.w - 0.36;
      addBox(0.45, 0.48, 0.45, this.materials.furnWood, nsX, 0.24, cz - bw / 2 - 0.34);
      addBox(0.45, 0.48, 0.45, this.materials.furnWood, nsX, 0.24, cz + bw / 2 + 0.34);
      // Wardrobe along North or South wall of bedroom
      const wardZ = room.z + 0.36;
      addBox(Math.min(1.8, room.w * 0.48), 2.35, 0.58, this.materials.furnWood, cx, 1.175, wardZ);
    } else if (p === 'bathroom' || p === 'bathroom_spa') {
      // Floating vanity + mirror + glass shower
      addBox(1.25, 0.52, 0.52, this.materials.furnWood, cx - 0.5, 0.58, room.z + 0.34);
      addBox(1.28, 0.06, 0.54, this.materials.porcelain, cx - 0.5, 0.86, room.z + 0.34, false);
      const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.1, 1.15), this.materials.railingGlass);
      showerGlass.position.set(room.x + 1.1, 1.05, room.z + room.d - 0.65);
      parent.add(showerGlass);
      if (p === 'bathroom_spa') {
        // Freestanding sculptural oval-style spa tub
        const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 1.62, 20), this.materials.porcelain);
        tub.rotation.z = Math.PI / 2;
        tub.scale.set(0.68, 1, 1);
        tub.position.set(cx + 0.4, 0.34, cz + 0.7);
        parent.add(tub);
      }
    } else if (p === 'balcony' || p === 'balcony_compact' || p === 'sky_terrace' || p === 'sky_terrace_grand') {
      addBox(0.75, 0.38, 0.75, this.materials.furnFabric, cx - 0.85, 0.19, cz);
      addBox(0.75, 0.38, 0.75, this.materials.furnFabric, cx + 0.85, 0.19, cz);
      addBox(0.55, 0.34, 0.55, this.materials.furnWood, cx, 0.17, cz);
      addPlant(room.x + 0.55, cz, 0.95);
      if (room.w > 7) addPlant(room.x + room.w - 0.55, cz, 0.95);
    } else if (p === 'rooftop_lounge') {
      // Architectural Rooftop Pergola Frame over West Sky Deck!
      const pergMat = this.materials.slabFascia;
      const pw = room.w - 0.4, pd = 6.5, ph = wallH - 0.1;
      for (const px of [room.x + 0.3, room.x + room.w - 0.3]) {
        for (const pz of [cz - pd / 2, cz + pd / 2]) {
          addBox(0.14, ph, 0.14, pergMat, px, ph / 2, pz, false);
        }
      }
      for (let s = -pd / 2; s <= pd / 2; s += 0.55) {
        addBox(pw + 0.3, 0.1, 0.12, this.materials.furnWood, cx, ph, cz + s);
      }
      addBox(1.8, 0.38, 0.9, this.materials.furnFabric, cx, 0.19, cz);
    } else if (p === 'plunge_pool') {
      // Penthouse Sky Plunge Pool on East Rooftop Deck
      addBox(2.6, 0.48, 5.2, this.materials.porcelain, cx, 0.24, cz, false);
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 4.8),
        new THREE.MeshStandardMaterial({ color: 0x29b6f6, emissive: 0x0b4f6c, emissiveIntensity: 0.45, roughness: 0.1 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx, 0.5, cz);
      parent.add(water);
    } else if (p === 'grand_lobby') {
      // Reception Desk & Sculptural Waiting Lounge
      addBox(3.2, 1.05, 0.85, this.materials.lobbyFloor, 0, 0.525, -1.6, false);
      addBox(3.3, 0.08, 0.95, this.materials.slabTrimGold, 0, 1.08, -1.6, false);
      addBox(2.2, 0.42, 0.85, this.materials.furnFabric, -2.1, 0.21, 2.8);
      addBox(2.2, 0.42, 0.85, this.materials.furnFabric, 2.1, 0.21, 2.8);
      addPlant(-3.2, 6.4, 1.25);
      addPlant(3.2, 6.4, 1.25);
    } else if (p === 'coworking' || p === 'cafe_lounge') {
      addBox(2.4, 0.74, 1.05, this.materials.furnWood, cx, 0.37, cz);
      addBox(0.45, 0.44, 0.45, this.materials.furnFabric, cx - 0.7, 0.22, cz - 0.8);
      addBox(0.45, 0.44, 0.45, this.materials.furnFabric, cx + 0.7, 0.22, cz - 0.8);
      addBox(0.45, 0.44, 0.45, this.materials.furnFabric, cx - 0.7, 0.22, cz + 0.8);
      addBox(0.45, 0.44, 0.45, this.materials.furnFabric, cx + 0.7, 0.22, cz + 0.8);
    } else if (p === 'gym') {
      // Treadmills & yoga mats
      for (let i = -1; i <= 1; i++) {
        addBox(0.85, 0.14, 1.85, this.materials.darkAppliance, cx + i * 1.4, 0.07, cz - 1.5, false);
        addBox(0.82, 1.25, 0.18, this.materials.darkAppliance, cx + i * 1.4, 0.65, cz - 2.35, false);
        addBox(0.75, 0.02, 1.75, this.materials.furnAccent, cx + i * 1.4, 0.015, cz + 1.8);
      }
    }
  }

  _buildHighlightBand() {
    const { THREE, config } = this;
    const { width, depth, floorHeight } = config.building;
    const bandGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(width + 0.55, floorHeight + 0.06, depth + 0.55);

    const glowShell = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd4a853,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.92 })
    );
    bandGroup.add(glowShell, wire);
    bandGroup.visible = false;
    this.highlightBand = bandGroup;
    this.root.add(bandGroup);
  }

  /**
   * Updates floor visibility for Exterior, Floor Highlight, Cutaway Dollhouse & X-Ray Ghost modes
   */
  applyFloorDisplayState({ selectedFloorIndex = null, isolateCutaway = false, ghostOthers = false }) {
    const { podiumHeight, floorHeight } = this.config.building;

    if (selectedFloorIndex === null) {
      this.highlightBand.visible = false;
      for (const rec of this.floorRecords) {
        rec.floorGroup.visible = true;
        rec.solidGroup.visible = true;
        rec.ceilingGroup.visible = true;
        rec.ghostGroup.visible = false;
      }
      return;
    }

    // Position luminous architectural highlight band on selected floor (in non-isolated exterior mode)
    this.highlightBand.visible = !isolateCutaway;
    this.highlightBand.position.set(0, podiumHeight + selectedFloorIndex * floorHeight + floorHeight / 2, 0);

    for (const rec of this.floorRecords) {
      if (rec.index === selectedFloorIndex) {
        rec.floorGroup.visible = true;
        rec.solidGroup.visible = true;
        // Hide ceiling in Cutaway/Dollhouse mode so user sees cleanly inside all rooms!
        rec.ceilingGroup.visible = !isolateCutaway;
        rec.ghostGroup.visible = false;
      } else if (isolateCutaway) {
        if (rec.index > selectedFloorIndex) {
          // Lift away all floors above selected floor
          rec.floorGroup.visible = false;
        } else {
          // Lower floors remain as architectural base or ghosted if X-Ray is enabled
          rec.floorGroup.visible = true;
          rec.solidGroup.visible = !ghostOthers;
          rec.ceilingGroup.visible = !ghostOthers;
          rec.ghostGroup.visible = ghostOthers;
        }
      } else {
        rec.floorGroup.visible = true;
        rec.solidGroup.visible = !ghostOthers;
        rec.ceilingGroup.visible = !ghostOthers;
        rec.ghostGroup.visible = ghostOthers;
      }
    }
  }

  /**
   * Ensures ceilings are visible when entering First-Person Walkthrough inside a floor
   */
  setWalkthroughFloorState(floorIndex) {
    this.highlightBand.visible = false;
    for (const rec of this.floorRecords) {
      rec.floorGroup.visible = true;
      rec.solidGroup.visible = true;
      rec.ceilingGroup.visible = true;
      rec.ghostGroup.visible = false;
    }
  }

  /**
   * Live Material & Geometry Variation Swapper
   */
  setCustomization(category, optionId) {
    this.activeCustom[category] = optionId;
    const opt = this._getOpt(category, optionId);

    if (category === 'flooring') {
      const tex = this.textures.get(opt.texKey);
      this.materials.customFloor.map = tex.map;
      this.materials.customFloor.bumpMap = tex.bumpMap || null;
      this.materials.customFloor.bumpScale = tex.bumpScale || 0.01;
      this.materials.customFloor.roughness = opt.roughness;
      this.materials.customFloor.metalness = opt.metalness;
      this.materials.customFloor.needsUpdate = true;
    } else if (category === 'walls') {
      this.materials.customWall.color.setHex(opt.color);
      this.materials.customWall.roughness = opt.roughness;
      this.materials.customWall.needsUpdate = true;
    } else if (category === 'windows') {
      this.materials.windowFrame.color.setHex(opt.frameColor);
      this.materials.windowFrame.roughness = opt.frameRoughness;
      this.materials.windowFrame.metalness = opt.frameMetalness;
      this.materials.windowGlass.color.setHex(opt.glassColor);
      this.materials.windowGlass.opacity = opt.glassOpacity;
      this.materials.windowFrame.needsUpdate = true;
      this.materials.windowGlass.needsUpdate = true;
      for (const wRec of this.windowAssemblies) {
        this._populateWindowMullions(wRec);
      }
    } else if (category === 'kitchen') {
      for (const kRec of this.kitchenAnchors) {
        this._populateModularKitchen(kRec);
      }
    } else if (category === 'furniture') {
      this.materials.furnFabric.color.setHex(opt.fabric);
      this.materials.furnAccent.color.setHex(opt.accent);
      this.materials.furnWood.color.setHex(opt.wood);
    }
  }

  getTotalUpgradeCost() {
    let sum = 0;
    for (const cat of Object.keys(this.activeCustom)) {
      const opt = this._getOpt(cat, this.activeCustom[cat]);
      sum += opt.delta || 0;
    }
    return sum;
  }

  updateInteriorLights(nightFactor, activeFloorIndex = null) {
    const shouldLight =
      this.interiorLightsMode === 'on' ||
      (this.interiorLightsMode === 'auto' && nightFactor > 0.25);

    const bulbIntensity = shouldLight ? 2.0 : 0.22;
    for (const puck of this.interiorLampBulbs) {
      puck.material.emissiveIntensity = bulbIntensity;
    }

    for (const rec of this.floorRecords) {
      if (!shouldLight) {
        rec.floorWarmLight.intensity = 0;
      } else {
        // Focus point light strongest on active/selected floor or warm ambient across floors
        rec.floorWarmLight.intensity =
          activeFloorIndex === null || rec.index === activeFloorIndex ? 5.5 : 2.2;
      }
    }
  }
};

