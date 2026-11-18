/**
 * Site Environment, Compass Rose Ground Ring & Celestial Sun/Moon System
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.EnvironmentSystem = class EnvironmentSystem {
  constructor(THREE, scene, textures) {
    this.THREE = THREE;
    this.scene = scene;
    this.textures = textures;

    this.group = new THREE.Group();
    this.group.name = 'EnvironmentRoot';
    this.scene.add(this.group);

    this.celestialRadius = 56;
    this.showCelestialPaths = true;
    this.streetLampBulbs = [];
    this.streetPointLights = [];
    this.waterMesh = null;

    this.state = {
      hour: 16.5,           // 4:30 PM warm afternoon default
      manualOverride: false,
      activeBody: 'sun',    // 'sun' | 'moon'
      sunAzimuth: 232,      // degrees (0=N, 90=E, 180=S, 270=W)
      sunElevation: 32,     // degrees above horizon
      moonAzimuth: 52,
      moonElevation: -28,
      seasonTilt: 28,       // Southern solar arc tilt (Northern Hemisphere feel)
      nightFactor: 0        // 0 = full day, 1 = full night
    };

    this._buildSkyAndStars();
    this._buildLighting();
    this._buildCelestialBodies();
    this._buildSiteAndLandscaping();
    this._buildCompassRing();
    this._buildUrbanContext();

    this.setTimeOfDay(this.state.hour);
  }

  _buildSkyAndStars() {
    const { THREE } = this;

    // Procedural gradient sky dome shader
    const skyGeo = new THREE.SphereGeometry(220, 40, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x1e5799) },
        uMidColor: { value: new THREE.Color(0x6db3f2) },
        uHorizonColor: { value: new THREE.Color(0xdbeeff) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunGlowColor: { value: new THREE.Color(0xffcc77) },
        uSunGlowStrength: { value: 0.45 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunGlowColor;
        uniform float uSunGlowStrength;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
          col = mix(col, uTopColor, smoothstep(0.22, 0.88, h));
          float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
          col += uSunGlowColor * pow(sunAmt, 10.0) * uSunGlowStrength;
          col += uSunGlowColor * pow(sunAmt, 96.0) * (uSunGlowStrength * 0.9);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(this.skyDome);

    // Night starfield
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.08 + Math.random() * 0.92); // Above horizon
      const r = 195;
      positions[i * 3] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.cos(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.15,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.group.add(this.stars);
  }

  _buildLighting() {
    const { THREE } = this;

    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x4a463f, 0.72);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambientLight);

    // Primary shadow-casting celestial directional light (shared smoothly between Sun & Moon)
    this.mainLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 8;
    this.mainLight.shadow.camera.far = 140;
    const d = 28;
    this.mainLight.shadow.camera.left = -d;
    this.mainLight.shadow.camera.right = d;
    this.mainLight.shadow.camera.top = d;
    this.mainLight.shadow.camera.bottom = -d;
    this.mainLight.shadow.bias = -0.0005;
    this.mainLight.shadow.normalBias = 0.025;
    this.scene.add(this.mainLight);
    this.scene.add(this.mainLight.target);

    // Soft sky bounce fill from opposite azimuth so shadows aren't pitch black
    this.fillLight = new THREE.DirectionalLight(0x9ec5ff, 0.35);
    this.scene.add(this.fillLight);
  }

  _buildCelestialBodies() {
    const { THREE } = this;
    this.celestialGroup = new THREE.Group();
    this.group.add(this.celestialGroup);

    const glowMap = this.textures.get('glow_sprite').map;

    // 3D Sun
    this.sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff5cc })
    );
    const sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowMap,
        color: 0xffb84d,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    sunHalo.scale.set(14, 14, 1);
    this.sunGroup.add(sunCore, sunHalo);
    this.celestialGroup.add(this.sunGroup);

    // 3D Moon
    this.moonGroup = new THREE.Group();
    const moonTex = this.textures.get('moon_surface').map;
    const moonCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 24, 24),
      new THREE.MeshBasicMaterial({ map: moonTex, color: 0xeef4ff })
    );
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowMap,
        color: 0x7cb8ff,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    moonHalo.scale.set(10, 10, 1);
    this.moonGroup.add(moonCore, moonHalo);
    this.celestialGroup.add(this.moonGroup);

    // Solar & Lunar Orbital Path Arcs + Light Ray Line
    this.pathsGroup = new THREE.Group();
    this.celestialGroup.add(this.pathsGroup);

    this.sunRayLine = this._createRayIndicator(0xffb84d);
    this.moonRayLine = this._createRayIndicator(0x7cb8ff);
    this.pathsGroup.add(this.sunRayLine, this.moonRayLine);

    this._rebuildOrbitArcs();
  }

  _createRayIndicator(hex) {
    const { THREE } = this;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 10, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    const mat = new THREE.LineDashedMaterial({
      color: hex,
      dashSize: 1.4,
      gapSize: 0.9,
      transparent: true,
      opacity: 0.55
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  _rebuildOrbitArcs() {
    const { THREE } = this;
    if (this.sunArcMesh) {
      this.pathsGroup.remove(this.sunArcMesh);
      this.sunArcMesh.geometry.dispose();
    }
    if (this.moonArcMesh) {
      this.pathsGroup.remove(this.moonArcMesh);
      this.moonArcMesh.geometry.dispose();
    }

    const sunPts = [];
    const moonPts = [];
    for (let h = 5.5; h <= 18.5; h += 0.25) {
      const { sunAz, sunEl } = this._computeSolarAngles(h, this.state.seasonTilt);
      if (sunEl >= 0) sunPts.push(this.anglesToPosition(sunAz, sunEl, this.celestialRadius));
    }
    for (let h = 18.0; h <= 30.0; h += 0.25) {
      const { moonAz, moonEl } = this._computeSolarAngles(h % 24, this.state.seasonTilt);
      if (moonEl >= 0) moonPts.push(this.anglesToPosition(moonAz, moonEl, this.celestialRadius - 2));
    }

    if (sunPts.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(sunPts);
      this.sunArcMesh = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 })
      );
      this.pathsGroup.add(this.sunArcMesh);
    }

    if (moonPts.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(moonPts);
      this.moonArcMesh = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35 })
      );
      this.pathsGroup.add(this.moonArcMesh);
    }
  }

  /**
   * Azimuth convention:
   *   0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X)
   */
  anglesToPosition(azimuthDeg, elevationDeg, radius = 56) {
    const { THREE } = this;
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    const el = THREE.MathUtils.degToRad(elevationDeg);
    const horiz = Math.cos(el) * radius;
    const x = Math.sin(az) * horiz;
    const z = -Math.cos(az) * horiz;
    const y = Math.sin(el) * radius;
    return new THREE.Vector3(x, y, z);
  }

  _computeSolarAngles(hour, seasonTilt = 28) {
    // Sun rises ~06:00 in East (90°), peaks at 12:00 toward South (180°), sets ~18:00 in West (270°)
    const dayPhase = ((hour - 6) / 12) * Math.PI; // 0 at 6:00, PI/2 at 12:00, PI at 18:00
    const maxSunEl = 90 - Math.abs(seasonTilt);   // e.g. 62° max elevation
    const sunEl = Math.sin(dayPhase) * maxSunEl;
    // Azimuth sweeps smoothly around 360°
    let sunAz = (90 + ((hour - 6) / 24) * 360) % 360;
    if (sunAz < 0) sunAz += 360;

    // Moon is ~12 hours opposite the Sun with a slight orbital inclination
    const moonHour = (hour + 12) % 24;
    const nightPhase = ((moonHour - 6) / 12) * Math.PI;
    const moonEl = Math.sin(nightPhase) * (maxSunEl - 8);
    let moonAz = (sunAz + 180) % 360;

    return { sunAz, sunEl, moonAz, moonEl };
  }

  setTimeOfDay(hour) {
    this.state.hour = ((hour % 24) + 24) % 24;
    this.state.manualOverride = false;
    const { sunAz, sunEl, moonAz, moonEl } = this._computeSolarAngles(this.state.hour, this.state.seasonTilt);
    this.state.sunAzimuth = sunAz;
    this.state.sunElevation = sunEl;
    this.state.moonAzimuth = moonAz;
    this.state.moonElevation = moonEl;
    this.state.activeBody = sunEl >= -2 ? 'sun' : 'moon';
    this._applyCelestialLighting();
  }

  setSeasonTilt(tiltDeg) {
    this.state.seasonTilt = tiltDeg;
    this._rebuildOrbitArcs();
    if (!this.state.manualOverride) {
      this.setTimeOfDay(this.state.hour);
    }
  }

  /**
   * Direct user directional control of Sun or Moon azimuth & elevation
   */
  setManualCelestialDirection(body, azimuthDeg, elevationDeg) {
    this.state.manualOverride = true;
    this.state.activeBody = body;
    const az = ((azimuthDeg % 360) + 360) % 360;
    const el = Math.max(4, Math.min(86, elevationDeg));
    if (body === 'sun') {
      this.state.sunAzimuth = az;
      this.state.sunElevation = el;
      this.state.moonAzimuth = (az + 180) % 360;
      this.state.moonElevation = -el;
    } else {
      this.state.moonAzimuth = az;
      this.state.moonElevation = el;
      this.state.sunAzimuth = (az + 180) % 360;
      this.state.sunElevation = -el;
    }
    this._applyCelestialLighting();
  }

  setShowPaths(visible) {
    this.showCelestialPaths = visible;
    this.pathsGroup.visible = visible;
  }

  _applyCelestialLighting() {
    const { THREE } = this;
    const { sunAzimuth, sunElevation, moonAzimuth, moonElevation } = this.state;

    const sunPos = this.anglesToPosition(sunAzimuth, sunElevation, this.celestialRadius);
    const moonPos = this.anglesToPosition(moonAzimuth, moonElevation, this.celestialRadius - 2);

    this.sunGroup.position.copy(sunPos);
    this.sunGroup.visible = sunElevation > -6;

    this.moonGroup.position.copy(moonPos);
    this.moonGroup.visible = moonElevation > -6;

    // Update ray indicator lines pointing to building center (0, 10, 0)
    const targetCenter = new THREE.Vector3(0, 10, 0);
    this.sunRayLine.visible = sunElevation > 0 && this.showCelestialPaths;
    if (this.sunRayLine.visible) {
      this.sunRayLine.geometry.setFromPoints([sunPos, targetCenter]);
      this.sunRayLine.computeLineDistances();
    }
    this.moonRayLine.visible = sunElevation <= 0 && moonElevation > 0 && this.showCelestialPaths;
    if (this.moonRayLine.visible) {
      this.moonRayLine.geometry.setFromPoints([moonPos, targetCenter]);
      this.moonRayLine.computeLineDistances();
    }

    // Blend smoothly between Day, Golden Hour, Twilight, and Moonlit Night
    const sunNorm = THREE.MathUtils.clamp(sunElevation / 45, -1, 1);
    const nightFactor = THREE.MathUtils.smoothstep(-sunElevation, -4, 10);
    this.state.nightFactor = nightFactor;

    const skyU = this.skyDome.material.uniforms;
    if (sunElevation > 12) {
      // Crisp Daylight
      const t = THREE.MathUtils.clamp((sunElevation - 12) / 35, 0, 1);
      skyU.uTopColor.value.setHex(0x1b4f8c).lerp(new THREE.Color(0x164b8a), t);
      skyU.uMidColor.value.setHex(0xf2a663).lerp(new THREE.Color(0x63ace5), t);
      skyU.uHorizonColor.value.setHex(0xffd2a6).lerp(new THREE.Color(0xdcf0ff), t);
      skyU.uSunGlowColor.value.setHex(0xffb866).lerp(new THREE.Color(0xfff5db), t);
      skyU.uSunGlowStrength.value = THREE.MathUtils.lerp(0.75, 0.35, t);
      skyU.uSunDir.value.copy(sunPos).normalize();

      this.mainLight.position.copy(sunPos);
      this.mainLight.color.setHex(0xffb978).lerp(new THREE.Color(0xfff7ea), t);
      this.mainLight.intensity = THREE.MathUtils.lerp(1.75, 2.55, t);
      this.hemiLight.color.setHex(0xdceeff);
      this.hemiLight.groundColor.setHex(0x575046);
      this.hemiLight.intensity = THREE.MathUtils.lerp(0.55, 0.82, t);
      this.ambientLight.intensity = 0.28;
    } else if (sunElevation > -5) {
      // Sunrise / Sunset / Golden-to-Blue Dusk
      const t = THREE.MathUtils.clamp((sunElevation + 5) / 17, 0, 1);
      skyU.uTopColor.value.setHex(0x0b162c).lerp(new THREE.Color(0x1b4f8c), t);
      skyU.uMidColor.value.setHex(0x273859).lerp(new THREE.Color(0xe68a5c), t);
      skyU.uHorizonColor.value.setHex(0x4b425f).lerp(new THREE.Color(0xffbe85), t);
      skyU.uSunGlowColor.value.setHex(0xff7b47);
      skyU.uSunGlowStrength.value = THREE.MathUtils.lerp(0.25, 0.85, t);
      skyU.uSunDir.value.copy(sunPos).normalize();

      const safeSunPos = this.anglesToPosition(sunAzimuth, Math.max(sunElevation, 5), this.celestialRadius);
      this.mainLight.position.copy(safeSunPos);
      this.mainLight.color.setHex(0xff8c52).lerp(new THREE.Color(0xffc285), t);
      this.mainLight.intensity = THREE.MathUtils.lerp(0.45, 1.75, t);
      this.hemiLight.color.setHex(0x8aa2c9).lerp(new THREE.Color(0xffd2b3), t);
      this.hemiLight.groundColor.setHex(0x262933);
      this.hemiLight.intensity = THREE.MathUtils.lerp(0.32, 0.55, t);
      this.ambientLight.intensity = 0.24;
    } else {
      // Moonlit Night
      skyU.uTopColor.value.setHex(0x050914);
      skyU.uMidColor.value.setHex(0x0d182e);
      skyU.uHorizonColor.value.setHex(0x182744);
      skyU.uSunGlowColor.value.setHex(0x7cb8ff);
      skyU.uSunGlowStrength.value = 0.28;
      skyU.uSunDir.value.copy(moonPos).normalize();

      const safeMoonPos = this.anglesToPosition(moonAzimuth, Math.max(moonElevation, 12), this.celestialRadius);
      this.mainLight.position.copy(safeMoonPos);
      this.mainLight.color.setHex(0x9ec5ff);
      this.mainLight.intensity = moonElevation > 0 ? 0.85 : 0.4;
      this.hemiLight.color.setHex(0x42618f);
      this.hemiLight.groundColor.setHex(0x151924);
      this.hemiLight.intensity = 0.34;
      this.ambientLight.intensity = 0.22;
    }

    this.mainLight.target.position.set(0, 8, 0);
    this.fillLight.position.set(-this.mainLight.position.x * 0.6, 22, -this.mainLight.position.z * 0.6);
    this.fillLight.intensity = sunNorm > 0 ? 0.35 : 0.18;

    this.starMat.opacity = nightFactor * 0.88;

    // Street & Plaza Lamps respond automatically to dusk/night
    const lampOn = nightFactor > 0.32;
    for (const bulb of this.streetLampBulbs) {
      bulb.material.emissiveIntensity = lampOn ? 1.8 : 0.08;
    }
    for (const pl of this.streetPointLights) {
      pl.intensity = lampOn ? 3.5 : 0;
    }
  }

  _buildSiteAndLandscaping() {
    const { THREE } = this;

    // Extended surrounding urban ground plane
    const groundGeo = new THREE.CircleGeometry(180, 64);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x262c28,
      roughness: 0.94,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Sculpted turf lawn parcel
    const lawnGeo = new THREE.BoxGeometry(58, 0.08, 52);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x3b593f, roughness: 0.92 });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(0, 0.0, 2);
    lawn.receiveShadow = true;
    this.group.add(lawn);

    // Stone Paver Arrival Plaza & Promenade
    const paverTex = this.textures.get('plaza_paver').map.clone();
    paverTex.repeat.set(10, 8);
    paverTex.needsUpdate = true;
    const plazaMat = new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.78 });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(34, 0.14, 28), plazaMat);
    plaza.position.set(0, 0.06, 2.5);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    // Building Architectural Podium Plinth (0 to 0.36m)
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c7, roughness: 0.65 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.36, 17.4), plinthMat);
    plinth.position.set(0, 0.18, 0);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.group.add(plinth);

    // South Entrance Steps & Drop-off Driveway
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(8 - s * 0.6, 0.12, 1.4 - s * 0.35),
        plinthMat
      );
      step.position.set(0, 0.08 + s * 0.1, 9.2 - s * 0.25);
      step.receiveShadow = true;
      this.group.add(step);
    }

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.88 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(58, 0.1, 6.5), roadMat);
    road.position.set(0, 0.03, 21.5);
    road.receiveShadow = true;
    this.group.add(road);

    // Resort Infinity Pool on West-South Garden Deck
    const poolBasin = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.28, 5.2),
      new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.55 })
    );
    poolBasin.position.set(-16.5, 0.14, 4.0);
    poolBasin.receiveShadow = true;
    this.group.add(poolBasin);

    const waterBump = this.textures.get('water_normal').bumpMap;
    waterBump.repeat.set(3, 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x22a6d4,
      emissive: 0x093a4d,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.18,
      bumpMap: waterBump,
      bumpScale: 0.03,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.7, 4.4), waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(-16.5, 0.3, 4.0);
    this.group.add(this.waterMesh);

    // Landscaped Trees around parcel
    const treeCoords = [
      [-15, -9], [-18, -3], [-15, 11], [-9, 15], [9, 15],
      [15, 10], [17, 2], [15, -7], [8, -12], [-8, -12]
    ];
    for (const [tx, tz] of treeCoords) {
      this._addTree(tx, tz, 0.85 + ((Math.abs(tx + tz) % 4) * 0.14));
    }

    // Architectural Bollard / Street Lamps
    const lampCoords = [[-5.5, 14.5], [5.5, 14.5], [-13.5, 14.5], [13.5, 14.5], [-13.5, -9.5], [13.5, -9.5]];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e2229, metalness: 0.7, roughness: 0.35 });
    for (let i = 0; i < lampCoords.length; i++) {
      const [lx, lz] = lampCoords[i];
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.4, 10), poleMat);
      pole.position.y = 1.7;
      pole.castShadow = true;

      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff0cc,
        emissive: 0xffb84d,
        emissiveIntensity: 0.1
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), bulbMat);
      bulb.position.y = 3.5;
      this.streetLampBulbs.push(bulb);
      lamp.add(pole, bulb);

      if (i < 2) {
        const pl = new THREE.PointLight(0xffbe66, 0, 14, 1.8);
        pl.position.set(0, 3.4, 0);
        lamp.add(pl);
        this.streetPointLights.push(pl);
      }

      lamp.position.set(lx, 0.1, lz);
      this.group.add(lamp);
    }
  }

  _addTree(x, z, scale = 1) {
    const { THREE } = this;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 2.2 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.9 })
    );
    trunk.position.y = 1.1 * scale;
    trunk.castShadow = true;

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3f6e46, roughness: 0.82 });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45 * scale, 1), foliageMat);
    c1.position.y = 2.85 * scale;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05 * scale, 1), foliageMat);
    c2.position.set(0.55 * scale, 3.6 * scale, 0.3 * scale);
    c2.castShadow = true;

    tree.add(trunk, c1, c2);
    tree.position.set(x, 0.05, z);
    this.group.add(tree);
  }

  _buildCompassRing() {
    const { THREE } = this;
    const radius = 26.5;

    const ringGeo = new THREE.RingGeometry(radius - 0.18, radius + 0.18, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a853,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.16;
    this.group.add(ring);

    const dirs = [
      { label: 'N', az: 0, primary: true },
      { label: 'NE', az: 45, primary: false },
      { label: 'E', az: 90, primary: true },
      { label: 'SE', az: 135, primary: false },
      { label: 'S', az: 180, primary: true },
      { label: 'SW', az: 225, primary: false },
      { label: 'W', az: 270, primary: true },
      { label: 'NW', az: 315, primary: false }
    ];

    for (const d of dirs) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = d.label === 'N' ? 'rgba(212, 168, 83, 0.95)' : 'rgba(20, 25, 34, 0.85)';
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = d.primary ? '#d4a853' : 'rgba(255,255,255,0.35)';
      ctx.stroke();

      ctx.fillStyle = d.label === 'N' ? '#11151c' : '#f4f0e8';
      ctx.font = `700 ${d.primary ? 48 : 36}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.label, 64, 66);

      const tex = new THREE.CanvasTexture(c);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      const sz = d.primary ? 2.4 : 1.75;
      badge.scale.set(sz, sz, 1);
      const rad = THREE.MathUtils.degToRad(d.az);
      badge.position.set(Math.sin(rad) * (radius + 2.2), 0.9, -Math.cos(rad) * (radius + 2.2));
      this.group.add(badge);
    }
  }

  _buildUrbanContext() {
    const { THREE } = this;
    // Subtle translucent architectural context massing at distance for real-estate sightline context
    const massMat = new THREE.MeshStandardMaterial({
      color: 0x3b4454,
      roughness: 0.75,
      metalness: 0.15,
      transparent: true,
      opacity: 0.42
    });
    const neighbors = [
      { x: -46, z: -32, w: 18, h: 24, d: 16 },
      { x: 48,  z: -28, w: 16, h: 32, d: 18 },
      { x: -52, z: 24,  w: 15, h: 16, d: 15 },
      { x: 52,  z: 28,  w: 20, h: 19, d: 14 },
      { x: 0,   z: -54, w: 24, h: 28, d: 14 }
    ];
    for (const b of neighbors) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), massMat);
      m.position.set(b.x, b.h / 2 - 0.04, b.z);
      this.group.add(m);
    }
  }

  update(dt) {
    if (this.waterMesh && this.waterMesh.material.bumpMap) {
      this.waterMesh.material.bumpMap.offset.x += dt * 0.03;
      this.waterMesh.material.bumpMap.offset.y += dt * 0.02;
    }
  }
};

