/**
 * 3D Camera, Directional Controls & First-Person Apartment Walkthrough System
 * Modes:
 *  - 'exterior'   : Orbit around full building + 8-point compass & elevation presets
 *  - 'cutaway'    : Dollhouse 3D floor explorer with directional orbit/pan
 *  - 'walkthrough': Eye-level 3D interior room & apartment navigation with collision + waypoints
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.NavigationController = class NavigationController {
  constructor(THREE, OrbitControls, camera, domElement, scene, config, building, callbacks = {}) {
    this.THREE = THREE;
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.config = config;
    this.building = building;
    this.callbacks = callbacks;

    this.mode = 'exterior'; // 'exterior' | 'cutaway' | 'walkthrough'
    this.activeFloorIndex = 2;
    this.currentRoom = null;

    // OrbitControls for exterior & cutaway modes
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.075;
    this.orbit.maxPolarAngle = Math.PI * 0.492;
    this.orbit.minDistance = 5;
    this.orbit.maxDistance = 95;
    this.orbit.target.set(0, 10.5, 0);

    // Smooth camera tween state
    this.tween = null;

    // First-person walkthrough state
    this.eyeHeight = 1.62;
    this.walkSpeed = 4.2;
    this.playerRadius = 0.28;
    this.yaw = 0;     // 0 = looking North (-Z), PI/2 = East (+X), PI = South (+Z)
    this.pitch = 0;   // radians (-1.2 .. +1.2)
    this.keys = new Set();
    this.hudPad = { forward: 0, strafe: 0, turnYaw: 0, lookPitch: 0, orbitAz: 0, orbitEl: 0, zoom: 0 };

    this._lookDragging = false;
    this._lookDragDist = 0;
    this._lastPtr = { x: 0, y: 0 };
    this.pointerLocked = false;

    // 3D Floor Waypoint Hotspot Rings
    this.waypointGroup = new THREE.Group();
    this.waypointGroup.name = 'RoomWaypoints';
    this.scene.add(this.waypointGroup);
    this.waypointMeshes = [];

    this._bindInputs();
    this.flyToExteriorDirection('SW', 26, false);
  }

  _bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());

    // Drag-to-look in First-Person Walkthrough (plus PointerLock support)
    this.domElement.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'walkthrough' || e.button !== 0) return;
      this._lookDragging = true;
      this._lookDragDist = 0;
      this._lastPtr = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (this.mode !== 'walkthrough') return;
      if (this.pointerLocked) {
        this.yaw += e.movementX * 0.0022;
        this.pitch = Math.max(-1.22, Math.min(1.22, this.pitch - e.movementY * 0.0022));
        return;
      }
      if (!this._lookDragging) return;
      const dx = e.clientX - this._lastPtr.x;
      const dy = e.clientY - this._lastPtr.y;
      this._lookDragDist += Math.hypot(dx, dy);
      this._lastPtr = { x: e.clientX, y: e.clientY };
      // Dragging look naturally rotates view
      this.yaw -= dx * 0.0038;
      this.pitch = Math.max(-1.22, Math.min(1.22, this.pitch + dy * 0.0032));
    });

    window.addEventListener('pointerup', () => {
      this._lookDragging = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
      if (this.callbacks.onPointerLockChange) {
        this.callbacks.onPointerLockChange(this.pointerLocked);
      }
    });
  }

  wasRecentDrag() {
    return this._lookDragDist > 6;
  }

  togglePointerLock() {
    if (this.mode !== 'walkthrough') return;
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    } else if (this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  /**
   * Rebuilds clickable 3D floor waypoint rings for the active floor
   */
  rebuildWaypoints(floorIndex, visible = true) {
    const { THREE } = this;
    while (this.waypointGroup.children.length > 0) {
      const c = this.waypointGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.waypointMeshes = [];

    const rec = this.building.floorRecords[floorIndex];
    if (!rec) return;

    for (const room of rec.data.rooms) {
      if (room.category === 'core') continue;
      const cx = room.x + room.w / 2;
      const cz = room.z + room.d / 2;
      const wy = rec.walkY + 0.03;

      const ringGeo = new THREE.RingGeometry(0.26, 0.38, 28);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(cx, wy, cz);

      // Invisible slightly larger hit disc for effortless clicking
      const hitGeo = new THREE.CircleGeometry(0.58, 16);
      hitGeo.rotateX(-Math.PI / 2);
      const hitDisc = new THREE.Mesh(
        hitGeo,
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
      );
      hitDisc.position.set(cx, wy + 0.01, cz);
      hitDisc.userData = { isWaypoint: true, floorIndex, room };

      this.waypointGroup.add(ring, hitDisc);
      this.waypointMeshes.push(hitDisc);
    }

    this.waypointGroup.visible = visible;
  }

  /**
   * Smoothly animates camera position & target (Orbit modes) or glides eye position (Walkthrough)
   */
  _startTween(toPos, toTarget, duration = 0.85, onComplete = null) {
    this.tween = {
      elapsed: 0,
      duration,
      fromPos: this.camera.position.clone(),
      toPos: toPos.clone(),
      fromTarget: this.orbit.target.clone(),
      toTarget: toTarget.clone(),
      onComplete
    };
  }

  setMode(newMode, floorIndex = this.activeFloorIndex, targetRoom = null) {
    const { THREE } = this;
    if (document.pointerLockElement && newMode !== 'walkthrough') {
      document.exitPointerLock();
    }

    this.mode = newMode;
    if (floorIndex !== null && floorIndex !== undefined) {
      this.activeFloorIndex = floorIndex;
    }

    if (newMode === 'exterior') {
      this.orbit.enabled = true;
      this.orbit.maxDistance = 95;
      this.orbit.minDistance = 8;
      this.waypointGroup.visible = false;
      const targetY = 10.5;
      this.flyToExteriorDirection('SW', 26, true, targetY);
    } else if (newMode === 'cutaway') {
      this.orbit.enabled = true;
      this.orbit.maxDistance = 55;
      this.orbit.minDistance = 4;
      const rec = this.building.floorRecords[this.activeFloorIndex];
      this.rebuildWaypoints(this.activeFloorIndex, true);
      const focusX = targetRoom ? targetRoom.x + targetRoom.w / 2 : 0;
      const focusZ = targetRoom ? targetRoom.z + targetRoom.d / 2 : 0;
      const toTarget = new THREE.Vector3(focusX, rec.walkY + 0.8, focusZ);
      const toPos = new THREE.Vector3(focusX + 9.5, rec.walkY + 17.5, focusZ + 14.5);
      this._startTween(toPos, toTarget, 0.85);
    } else if (newMode === 'walkthrough') {
      this.orbit.enabled = false;
      this.building.setWalkthroughFloorState(this.activeFloorIndex);
      this.rebuildWaypoints(this.activeFloorIndex, true);

      const rec = this.building.floorRecords[this.activeFloorIndex];
      const spawnRoom =
        targetRoom ||
        rec.data.rooms.find((r) => r.category === 'living') ||
        rec.data.rooms.find((r) => r.category !== 'core') ||
        rec.data.rooms[0];

      this.teleportToRoom(spawnRoom, this.activeFloorIndex, false);
    }
  }

  /**
   * Moves or glides first-person camera into a specific room at human eye height
   */
  teleportToRoom(room, floorIndex = this.activeFloorIndex, smooth = true) {
    const { THREE } = this;
    this.activeFloorIndex = floorIndex;
    const rec = this.building.floorRecords[floorIndex];
    if (!rec || !room) return;

    // Pick a comfortable unobstructed standing spot slightly offset from exact furniture center
    let tx = room.x + room.w * 0.5;
    let tz = room.z + room.d * 0.5;
    if (room.category === 'living') {
      tx = room.x + room.w * 0.5;
      tz = room.z + room.d * 0.22;
    } else if (room.category === 'bedroom') {
      tx = room.x < 0 ? room.x + room.w * 0.72 : room.x + room.w * 0.28;
      tz = room.z + room.d * 0.55;
    } else if (room.category === 'kitchen') {
      const alongNorth = room.z <= -3.5;
      tz = alongNorth ? room.z + room.d * 0.72 : room.z + room.d * 0.28;
    }

    const ty = rec.walkY + this.eyeHeight;
    // Aim toward the center/window side of the room
    const lookX = room.x + room.w / 2;
    const lookZ = room.z + (room.z >= 0 ? room.d * 0.85 : room.d * 0.35);
    const desiredYaw = Math.atan2(lookX - tx, -(lookZ - tz));

    if (this.mode !== 'walkthrough') {
      this.mode = 'walkthrough';
      this.orbit.enabled = false;
      this.building.setWalkthroughFloorState(floorIndex);
      this.rebuildWaypoints(floorIndex, true);
    }

    if (smooth && Math.abs(this.camera.position.y - ty) < 1.0) {
      const dest = new THREE.Vector3(tx, ty, tz);
      const lookTarget = new THREE.Vector3(
        tx + Math.sin(desiredYaw) * 3,
        ty,
        tz - Math.cos(desiredYaw) * 3
      );
      this._startTween(dest, lookTarget, 0.65, () => {
        this.yaw = desiredYaw;
        this.pitch = -0.04;
        this._applyFirstPersonOrientation();
      });
    } else {
      this.tween = null;
      this.camera.position.set(tx, ty, tz);
      this.yaw = desiredYaw;
      this.pitch = -0.04;
      this._applyFirstPersonOrientation();
    }

    this._detectCurrentRoom();
  }

  /**
   * Flies camera to view the building or active floor from any cardinal/intercardinal compass direction
   */
  flyToExteriorDirection(dirIdOrAzimuth, elevationDeg = 25, animate = true, customTargetY = null) {
    const { THREE } = this;
    let azDeg = 225;
    if (typeof dirIdOrAzimuth === 'number') {
      azDeg = dirIdOrAzimuth;
    } else if (dirIdOrAzimuth === 'TOP') {
      azDeg = 180;
      elevationDeg = 84;
    } else if (dirIdOrAzimuth === 'STREET') {
      azDeg = 195;
      elevationDeg = 6;
    } else {
      const found = this.config.compassDirections.find((d) => d.id === dirIdOrAzimuth);
      if (found) azDeg = found.azimuth;
    }

    if (this.mode === 'walkthrough') {
      // In walkthrough mode, clicking a compass direction turns the viewer to face that compass bearing!
      this.yaw = THREE.MathUtils.degToRad(azDeg);
      this.pitch = 0;
      return;
    }

    const isCutaway = this.mode === 'cutaway';
    const rec = this.building.floorRecords[this.activeFloorIndex];
    const targetY =
      customTargetY !== null
        ? customTargetY
        : isCutaway && rec
        ? rec.walkY + 0.8
        : 10.5;
    const dist = isCutaway ? 22 : dirIdOrAzimuth === 'STREET' ? 34 : 42;

    const az = THREE.MathUtils.degToRad(azDeg);
    const el = THREE.MathUtils.degToRad(isCutaway ? Math.max(38, elevationDeg) : elevationDeg);
    const horiz = Math.cos(el) * dist;

    const toTarget = new THREE.Vector3(0, targetY, 0);
    const toPos = new THREE.Vector3(
      Math.sin(az) * horiz,
      targetY + Math.sin(el) * dist,
      -Math.cos(az) * horiz
    );

    if (animate) {
      this._startTween(toPos, toTarget, 0.78);
    } else {
      this.camera.position.copy(toPos);
      this.orbit.target.copy(toTarget);
      this.orbit.update();
    }
  }

  /**
   * Step impulse for On-Screen Directional Control Buttons
   */
  nudgeDirection(action) {
    const { THREE } = this;
    if (this.mode === 'walkthrough') {
      const step = 0.85;
      if (action === 'up') this._movePlayer(step, 0);
      else if (action === 'down') this._movePlayer(-step, 0);
      else if (action === 'left') this.yaw -= 0.28;
      else if (action === 'right') this.yaw += 0.28;
      else if (action === 'strafeL') this._movePlayer(0, -step);
      else if (action === 'strafeR') this._movePlayer(0, step);
      else if (action === 'zoomIn') this.camera.fov = Math.max(42, this.camera.fov - 5);
      else if (action === 'zoomOut') this.camera.fov = Math.min(82, this.camera.fov + 5);
      else if (action === 'reset') { this.camera.fov = 62; this.pitch = 0; }
      this.camera.updateProjectionMatrix();
      return;
    }

    // Orbit / Cutaway directional nudges
    const offset = this.camera.position.clone().sub(this.orbit.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    if (action === 'left') sph.theta -= 0.24;
    else if (action === 'right') sph.theta += 0.24;
    else if (action === 'up') sph.phi = Math.max(0.12, sph.phi - 0.16);
    else if (action === 'down') sph.phi = Math.min(Math.PI * 0.48, sph.phi + 0.16);
    else if (action === 'zoomIn') sph.radius = Math.max(this.orbit.minDistance, sph.radius * 0.84);
    else if (action === 'zoomOut') sph.radius = Math.min(this.orbit.maxDistance, sph.radius * 1.18);
    else if (action === 'reset') {
      this.flyToExteriorDirection('SW', this.mode === 'cutaway' ? 44 : 25, true);
      return;
    }
    offset.setFromSpherical(sph);
    this.camera.position.copy(this.orbit.target).add(offset);
    this.orbit.update();
  }

  _applyFirstPersonOrientation() {
    const { THREE } = this;
    const euler = new THREE.Euler(this.pitch, -this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  _movePlayer(forwardDelta, strafeDelta) {
    const rec = this.building.floorRecords[this.activeFloorIndex];
    if (!rec) return;

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);

    // Forward vector in world XZ: (sin(yaw), -cos(yaw)), Right vector: (cos(yaw), sin(yaw))
    const dx = sinY * forwardDelta + cosY * strafeDelta;
    const dz = -cosY * forwardDelta + sinY * strafeDelta;

    const steps = 2;
    for (let s = 0; s < steps; s++) {
      let nx = this.camera.position.x + dx / steps;
      let nz = this.camera.position.z + dz / steps;

      // Clamp to outer building footprint with gentle margin
      nx = Math.max(-9.65, Math.min(9.65, nx));
      nz = Math.max(-7.15, Math.min(7.15, nz));

      // Circle-vs-segment collision with smooth wall sliding
      const r = this.playerRadius;
      for (const seg of rec.collisionSegments) {
        const vx = seg.x2 - seg.x1;
        const vz = seg.z2 - seg.z1;
        const lenSq = vx * vx + vz * vz;
        if (lenSq < 1e-6) continue;
        let t = ((nx - seg.x1) * vx + (nz - seg.z1) * vz) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = seg.x1 + t * vx;
        const cz = seg.z1 + t * vz;
        const distX = nx - cx;
        const distZ = nz - cz;
        const dist = Math.hypot(distX, distZ);
        if (dist < r && dist > 1e-5) {
          const push = r - dist;
          nx += (distX / dist) * push;
          nz += (distZ / dist) * push;
        }
      }

      this.camera.position.x = nx;
      this.camera.position.z = nz;
    }

    this.camera.position.y = rec.walkY + this.eyeHeight;
    this._detectCurrentRoom();
  }

  _detectCurrentRoom() {
    const rec = this.building.floorRecords[this.activeFloorIndex];
    if (!rec) return;
    const px = this.camera.position.x;
    const pz = this.camera.position.z;
    let found = null;
    for (const r of rec.data.rooms) {
      if (px >= r.x && px <= r.x + r.w && pz >= r.z && pz <= r.z + r.d) {
        found = r;
        break;
      }
    }
    if (found && (!this.currentRoom || this.currentRoom.id !== found.id)) {
      this.currentRoom = found;
      if (this.callbacks.onRoomChange) {
        this.callbacks.onRoomChange(found, rec.data);
      }
    }
  }

  /**
   * Returns current camera compass bearing (0°=N, 90°=E, 180°=S, 270°=W)
   * In Exterior/Cutaway, returns direction FROM building TO camera (viewpoint side) + look bearing
   */
  getCompassTelemetry() {
    const { THREE } = this;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // Look bearing: direction camera is looking in XZ
    let lookBearing = THREE.MathUtils.radToDeg(Math.atan2(dir.x, -dir.z));
    lookBearing = ((lookBearing % 360) + 360) % 360;

    // Viewpoint compass side (where camera stands around building)
    let viewFromAz = THREE.MathUtils.radToDeg(
      Math.atan2(this.camera.position.x - this.orbit.target.x, -(this.camera.position.z - this.orbit.target.z))
    );
    viewFromAz = ((viewFromAz % 360) + 360) % 360;

    return {
      lookBearingDeg: lookBearing,
      lookYawRad: Math.atan2(dir.x, -dir.z),
      viewFromAzimuthDeg: this.mode === 'walkthrough' ? lookBearing : viewFromAz
    };
  }

  update(dt, elapsed) {
    const { THREE } = this;

    // Gentle pulse on 3D floor waypoint rings
    if (this.waypointGroup.visible) {
      const s = 1 + Math.sin(elapsed * 3.2) * 0.08;
      for (const child of this.waypointGroup.children) {
        if (!child.userData.isWaypoint) child.scale.set(s, s, s);
      }
    }

    // Active smooth camera tween
    if (this.tween) {
      this.tween.elapsed += dt;
      const rawT = Math.min(1, this.tween.elapsed / this.tween.duration);
      const ease = 1 - Math.pow(1 - rawT, 3); // cubicOut
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, ease);
      if (this.mode !== 'walkthrough') {
        this.orbit.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, ease);
        this.orbit.update();
      } else {
        this.camera.lookAt(this.tween.toTarget);
      }
      if (rawT >= 1) {
        const done = this.tween.onComplete;
        this.tween = null;
        if (done) done();
      }
      return;
    }

    if (this.mode === 'walkthrough') {
      let fwd = this.hudPad.forward;
      let str = this.hudPad.strafe;
      let turn = this.hudPad.turnYaw;

      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
      if (this.keys.has('KeyA')) str -= 1;
      if (this.keys.has('KeyD')) str += 1;
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) turn -= 1;
      if (this.keys.has('ArrowRight') || this.keys.has('KeyE')) turn += 1;

      if (turn !== 0) {
        this.yaw += turn * 1.85 * dt;
      }
      if (this.hudPad.lookPitch !== 0) {
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + this.hudPad.lookPitch * 1.3 * dt));
      }

      if (fwd !== 0 || str !== 0) {
        const mag = Math.hypot(fwd, str) || 1;
        const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? this.walkSpeed * 1.55 : this.walkSpeed;
        this._movePlayer((fwd / mag) * speed * dt, (str / mag) * speed * dt);
      }

      this._applyFirstPersonOrientation();
    } else {
      // Continuous HUD hold rotation/pan in Orbit & Cutaway modes
      if (this.hudPad.orbitAz !== 0 || this.hudPad.orbitEl !== 0 || this.hudPad.zoom !== 0) {
        const offset = this.camera.position.clone().sub(this.orbit.target);
        const sph = new THREE.Spherical().setFromVector3(offset);
        sph.theta += this.hudPad.orbitAz * 1.5 * dt;
        sph.phi = Math.max(0.12, Math.min(Math.PI * 0.48, sph.phi + this.hudPad.orbitEl * 1.2 * dt));
        sph.radius = Math.max(this.orbit.minDistance, Math.min(this.orbit.maxDistance, sph.radius * (1 + this.hudPad.zoom * dt)));
        offset.setFromSpherical(sph);
        this.camera.position.copy(this.orbit.target).add(offset);
      }

      // Keyboard WASD/Arrows pan/orbit convenience in Exterior & Cutaway modes
      let panX = 0, panZ = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) panZ -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) panZ += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) panX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) panX += 1;
      if (panX !== 0 || panZ !== 0) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        const move = new THREE.Vector3()
          .addScaledVector(forward, -panZ * 14 * dt)
          .addScaledVector(right, panX * 14 * dt);
        this.camera.position.add(move);
        this.orbit.target.add(move);
      }

      this.orbit.update();
    }
  }
};
