export function buildCafeVerticalSlice(room, options = {}) {
  const { THREE, scene, renderer, camera } = room;
  const performer = options.performer || null;
  const mobileQuality = (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || window.innerWidth < 820;

  renderer.toneMappingExposure = 1.08;
  camera.fov = 62;
  camera.updateProjectionMatrix();

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);

  function makeCanvasTexture(draw, size = 512, repeat = [1, 1], colorSpace = true) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    draw(ctx, size);
    const map = new THREE.CanvasTexture(canvas);
    if (colorSpace) map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat[0], repeat[1]);
    map.anisotropy = maxAniso;
    return map;
  }

  function noise(ctx, size, strength = 18, alpha = .12) {
    const image = ctx.getImageData(0, 0, size, size);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - .5) * strength;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      data[i + 3] = Math.max(0, Math.min(255, 255 * (1 - alpha) + data[i + 3] * alpha));
    }
    ctx.putImageData(image, 0, 0);
  }

  const brickColor = makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#2b1512';
    ctx.fillRect(0, 0, size, size);
    const brickW = 96, brickH = 52;
    for (let row = -1, y = -brickH; y < size + brickH; row++, y += brickH) {
      const offset = row % 2 ? brickW / 2 : 0;
      for (let x = -brickW; x < size + brickW; x += brickW) {
        const r = 78 + Math.floor(Math.random() * 28);
        const g = 31 + Math.floor(Math.random() * 18);
        const b = 24 + Math.floor(Math.random() * 13);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + offset + 3, y + 3, brickW - 7, brickH - 7);
        ctx.fillStyle = 'rgba(255,160,110,.05)';
        ctx.fillRect(x + offset + 6, y + 6, brickW - 13, 3);
      }
    }
    noise(ctx, size, 12, .08);
  }, 512, [4.5, 2.4]);

  const brickBump = makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(0, 0, size, size);
    const brickW = 96, brickH = 52;
    for (let row = -1, y = -brickH; y < size + brickH; row++, y += brickH) {
      const offset = row % 2 ? brickW / 2 : 0;
      for (let x = -brickW; x < size + brickW; x += brickW) {
        ctx.fillStyle = '#d5d5d5';
        ctx.fillRect(x + offset + 4, y + 4, brickW - 9, brickH - 9);
        ctx.fillStyle = '#878787';
        ctx.fillRect(x + offset + 6, y + brickH - 8, brickW - 12, 3);
      }
    }
  }, 512, [4.5, 2.4], false);

  const woodColor = makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#20120d';
    ctx.fillRect(0, 0, size, size);
    const plankH = 46;
    for (let y = 0; y < size; y += plankH) {
      const base = 42 + Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${base + 28},${base + 5},${Math.max(18, base - 5)})`;
      ctx.fillRect(0, y + 2, size, plankH - 4);
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(15,8,6,${.12 + Math.random() * .12})`;
        ctx.beginPath();
        const wave = y + 10 + Math.random() * 26;
        ctx.moveTo(0, wave);
        for (let x = 0; x <= size; x += 32) {
          ctx.lineTo(x, wave + Math.sin(x * .04 + i) * (2 + Math.random() * 2));
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#120b08';
      ctx.fillRect(0, y, size, 2);
    }
    noise(ctx, size, 9, .06);
  }, 512, [5.5, 5.5]);

  const woodBump = makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 46) {
      ctx.fillStyle = '#545454';
      ctx.fillRect(0, y, size, 2);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#a9a9a9';
        ctx.beginPath();
        const wave = y + 9 + i * 8;
        ctx.moveTo(0, wave);
        for (let x = 0; x <= size; x += 40) ctx.lineTo(x, wave + Math.sin(x * .035 + i) * 2);
        ctx.stroke();
      }
    }
  }, 512, [5.5, 5.5], false);

  const stageColor = makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#151012';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 42) {
      ctx.fillStyle = y % 84 ? '#1d1518' : '#24191c';
      ctx.fillRect(0, y, size, 40);
      ctx.fillStyle = '#080708';
      ctx.fillRect(0, y, size, 2);
    }
    noise(ctx, size, 10, .08);
  }, 512, [4, 2.4]);

  const brickMat = new THREE.MeshStandardMaterial({
    map: brickColor,
    bumpMap: brickBump,
    bumpScale: .085,
    color: 0xb77562,
    roughness: .86,
    metalness: .02
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodColor,
    bumpMap: woodBump,
    bumpScale: .045,
    color: 0xa87657,
    roughness: .58,
    metalness: .03
  });
  const stageMat = new THREE.MeshStandardMaterial({
    map: stageColor,
    color: 0x3b2a31,
    roughness: .5,
    metalness: .16
  });
  const blackMetal = new THREE.MeshStandardMaterial({
    color: 0x111116,
    roughness: .28,
    metalness: .82
  });
  const darkFabric = new THREE.MeshStandardMaterial({
    color: 0x141116,
    roughness: .94,
    metalness: .02
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xb47a32,
    roughness: .31,
    metalness: .82
  });

  const floor = scene.getObjectByName('floor');
  if (floor) floor.material = woodMat;
  ['back wall', 'left wall', 'right wall', 'front-left', 'front-right'].forEach(name => {
    const wall = scene.getObjectByName(name);
    if (wall) wall.material = brickMat;
  });
  const stage = scene.getObjectByName('café stage');
  if (stage) stage.material = stageMat;

  // Ceiling and overhead industrial frame.
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 28),
    new THREE.MeshStandardMaterial({ color: 0x100d0f, roughness: .74, metalness: .16 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 7.85, 0);
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  function addBeam(size, pos, material = blackMetal) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Concert truss: denser and more believable than the prototype beams.
  for (const z of [-7.25, -5.95]) {
    addBeam([18, .14, .14], [0, 6.82, z]);
    addBeam([18, .08, .08], [0, 6.58, z]);
    for (let x = -8.8; x <= 8.8; x += 1.1) {
      const diag = addBeam([1.28, .055, .055], [x, 6.7, z]);
      diag.rotation.z = ((Math.round((x + 9) / 1.1) % 2) ? 1 : -1) * .35;
    }
  }
  for (const x of [-8.8, 8.8]) {
    addBeam([.14, 1.15, .14], [x, 6.25, -6.6]);
  }

  // Hanging line-array speakers, with individual cabinets.
  function lineArray(x, z, flip) {
    const group = new THREE.Group();
    group.position.set(x, 5.45, z);
    for (let i = 0; i < 4; i++) {
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.45, .72, .7), darkFabric);
      cabinet.position.y = -i * .67;
      cabinet.rotation.x = (i - 1.5) * .035 * flip;
      cabinet.castShadow = true;
      cabinet.receiveShadow = true;
      group.add(cabinet);

      const grille = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, .52),
        new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: .66, metalness: .58 })
      );
      grille.position.set(0, cabinet.position.y, .355);
      grille.rotation.x = cabinet.rotation.x;
      group.add(grille);
    }
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.5, .08), blackMetal);
    hanger.position.y = 1.05;
    group.add(hanger);
    scene.add(group);
    return group;
  }
  lineArray(-7.35, -9.25, 1);
  lineArray(7.35, -9.25, -1);

  // Floor wedge monitors.
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.55, .46, 1.05), darkFabric);
    wedge.position.set(x, .78, -7.72);
    wedge.rotation.x = -.28;
    wedge.castShadow = true;
    scene.add(wedge);
  }

  // DJ booth and laptop stage right.
  const djBooth = addBeam([4.3, 1.7, 1.35], [4.5, 1.18, -10.05], new THREE.MeshStandardMaterial({
    color: 0x171319,
    roughness: .78,
    metalness: .08
  }));
  const boothTop = addBeam([4.55, .13, 1.5], [4.5, 2.08, -10.05], blackMetal);
  boothTop.castShadow = true;

  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, .055, .72), blackMetal);
  laptopBase.position.set(4.45, 2.2, -9.85);
  laptopBase.rotation.x = -.08;
  scene.add(laptopBase);
  const laptopScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, .68),
    new THREE.MeshBasicMaterial({ color: 0x88c9ff, toneMapped: false })
  );
  laptopScreen.position.set(4.45, 2.52, -10.22);
  laptopScreen.rotation.x = -.18;
  scene.add(laptopScreen);

  // DJ silhouette using low-cost geometry.
  const dj = new THREE.Group();
  const djBody = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .65, 4, 10), darkFabric);
  djBody.position.y = 1.3;
  dj.add(djBody);
  const djHead = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6c412b, roughness: .82 }));
  djHead.position.y = 2.05;
  dj.add(djHead);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.3, .33, .12, 16), blackMetal);
  cap.position.y = 2.31;
  dj.add(cap);
  dj.position.set(4.55, .35, -10.45);
  scene.add(dj);

  // Side balconies and rails.
  const railMat = new THREE.MeshStandardMaterial({ color: 0x19171a, roughness: .36, metalness: .78 });
  for (const side of [-1, 1]) {
    const x = side * 15.35;
    addBeam([2.3, .22, 17.5], [x, 4.45, 1], new THREE.MeshStandardMaterial({ color: 0x1b1618, roughness: .62, metalness: .28 }));
    for (let z = -7; z <= 9; z += 2) {
      addBeam([.08, 1.2, .08], [x - side * 1.02, 5.05, z], railMat);
    }
    addBeam([.09, .09, 17.5], [x - side * 1.02, 5.63, 1], railMat);
    addBeam([.09, .09, 17.5], [x - side * 1.02, 4.78, 1], railMat);
  }

  // Warm wall practicals.
  const practicals = [];
  for (const side of [-1, 1]) {
    for (const z of (mobileQuality ? [-6, 6] : [-8, -2, 4, 10])) {
      const x = side * 16.35;
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xffbb67,
        emissive: 0xff7f28,
        emissiveIntensity: 2.4,
        roughness: .25
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), bulbMat);
      bulb.position.set(x - side * .22, 3.2, z);
      scene.add(bulb);
      practicals.push(bulb);

      const sconce = new THREE.PointLight(0xff8b45, 3.3, 5.2, 2);
      sconce.position.set(x - side * .45, 3.15, z);
      sconce.castShadow = false;
      scene.add(sconce);
    }
  }

  // Café detail: glasses, candles, bottles and table cards.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd9a8,
    transparent: true,
    opacity: .42,
    roughness: .08,
    metalness: .05,
    transmission: .48,
    thickness: .12
  });
  const candleMat = new THREE.MeshStandardMaterial({
    color: 0xffc27a,
    emissive: 0xff7c22,
    emissiveIntensity: 2,
    roughness: .35
  });
  const tablePositions = [];
  for (const z of [-3.8, .3, 4.2]) {
    for (const x of [-10, -6, -2, 2, 6]) tablePositions.push([x, z]);
  }
  tablePositions.forEach(([x, z], index) => {
    if (index % 2 === 0) {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(.11, .095, .33, 12), glassMat);
      glass.position.set(x + .28, 1.03, z - .16);
      scene.add(glass);
    }
    if (index % 3 === 0) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .16, 12), candleMat);
      candle.position.set(x - .22, .99, z + .14);
      scene.add(candle);
    }
    if (index % 4 === 0) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .52, 10), new THREE.MeshStandardMaterial({ color: 0x402218, roughness: .45, metalness: .05 }));
      bottle.position.set(x + .02, 1.12, z + .22);
      scene.add(bottle);
    }
  });

  // Plants at stage corners, stylized but dense enough to break up the geometry.
  function plant(x, z, scale = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.42, .32, .7, 12), new THREE.MeshStandardMaterial({ color: 0x3b2117, roughness: .83 }));
    pot.position.set(x, .35, z);
    scene.add(pot);
    for (let i = 0; i < 11; i++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(.48, 8, 6),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x254324 : 0x31532d, roughness: .88 })
      );
      const a = i / 11 * Math.PI * 2;
      leaf.scale.set(.28, 1.35 + (i % 3) * .16, .17);
      leaf.position.set(x + Math.cos(a) * .34, 1.1 + (i % 4) * .18, z + Math.sin(a) * .34);
      leaf.rotation.z = Math.cos(a) * .65;
      leaf.rotation.x = Math.sin(a) * .3;
      scene.add(leaf);
    }
  }
  plant(-8.5, -11.4, 1);
  plant(8.7, -11.5, 1);

  // Wall poster helper.
  function poster(text, pos, rotationY = 0, accent = '#f3a35c') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 768);
    grad.addColorStop(0, '#241211');
    grad.addColorStop(1, '#090708');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 768);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, 476, 732);
    ctx.fillStyle = '#f6e8dc';
    ctx.font = '900 54px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = String(text).split('\n');
    lines.forEach((line, i) => ctx.fillText(line, 256, 300 + (i - (lines.length - 1) / 2) * 68));
    ctx.fillStyle = accent;
    ctx.font = '900 26px Arial';
    ctx.fillText('MUSIC CITY ESTATES', 256, 650);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 3.5),
      new THREE.MeshStandardMaterial({ map, roughness: .72, metalness: .02 })
    );
    mesh.position.set(...pos);
    mesh.rotation.y = rotationY;
    scene.add(mesh);
  }
  poster('GOOD\nMUSIC\nBUILDS\nBETTER\nPEOPLE', [-16.72, 3.4, -4.2], Math.PI / 2, '#f0a05f');
  poster('MORE\nARTISTS\nA BRIGHTER\nTOMORROW', [16.72, 3.4, -3.6], -Math.PI / 2, '#e28b54');

  // Central brick logo treatment inspired by the target art.
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 1024;
  logoCanvas.height = 512;
  const lctx = logoCanvas.getContext('2d');
  lctx.clearRect(0, 0, 1024, 512);
  lctx.textAlign = 'center';
  lctx.fillStyle = '#f7d6bd';
  lctx.font = '900 italic 112px Arial';
  lctx.fillText('HIP-HOP CAFÉ', 512, 260);
  lctx.fillStyle = '#f2a468';
  lctx.font = '900 30px Arial';
  lctx.fillText('MUSIC  •  PEOPLE  •  CULTURE', 512, 335);
  const logoMap = new THREE.CanvasTexture(logoCanvas);
  logoMap.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 4.6),
    new THREE.MeshBasicMaterial({ map: logoMap, transparent: true, toneMapped: false })
  );
  logo.position.set(0, 4.82, -13.88);
  scene.add(logo);

  // Low-cost stage haze / light shafts.
  const beams = [];
  const beamGeom = new THREE.ConeGeometry(1.65, 8, 20, 1, true);
  beamGeom.translate(0, -4, 0);
  for (const [x, color, rotZ] of [
    [-5.8, 0xff8a48, -.18],
    [-2.0, 0x9b5cff, -.08],
    [2.0, 0xffa04f, .08],
    [5.8, 0xa64cff, .18]
  ]) {
    const beam = new THREE.Mesh(
      beamGeom,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: .032,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    beam.position.set(x, 6.7, -6.6);
    beam.rotation.z = rotZ;
    scene.add(beam);
    beams.push(beam);
  }

  // Dust particles inside the light volume.
  const dustCount = mobileQuality ? 84 : 140;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - .5) * 18;
    dustPositions[i * 3 + 1] = .8 + Math.random() * 6;
    dustPositions[i * 3 + 2] = -12 + Math.random() * 13;
  }
  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeom,
    new THREE.PointsMaterial({
      color: 0xffd6af,
      size: .028,
      transparent: true,
      opacity: .36,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(dust);

  // Hand-tracked stage microphone. It follows the real premium skeleton in world space,
  // avoiding bone-axis assumptions that can leave imported-avatar props floating.
  const performanceMic = new THREE.Group();
  performanceMic.visible = false;
  const handMic = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .38, 12), blackMetal);
  handMic.position.y = .19;
  performanceMic.add(handMic);
  const micHead = new THREE.Mesh(
    new THREE.SphereGeometry(.085, 12, 9),
    new THREE.MeshStandardMaterial({ color: 0x28282e, roughness: .38, metalness: .72 })
  );
  micHead.position.y = .41;
  performanceMic.add(micHead);
  scene.add(performanceMic);

  const micHandWorld = new THREE.Vector3();
  const micHeadWorld = new THREE.Vector3();
  const micDirection = new THREE.Vector3();
  const micUp = new THREE.Vector3(0, 1, 0);

  function performerRigNode(key) {
    const premiumRig = performer?.userData?.avatarController?.rig;
    if (premiumRig && premiumRig[key]) return premiumRig[key];
    const fallbackRig = performer?.userData?.rig;
    return fallbackRig && fallbackRig[key] ? fallbackRig[key] : null;
  }

  function updatePerformanceMic() {
    if (!performer || !live) {
      performanceMic.visible = false;
      return;
    }

    const hand = performerRigNode('rightHand') || performerRigNode('rightArm');
    const head = performerRigNode('head');
    if (!hand || !head) {
      performanceMic.visible = false;
      return;
    }

    hand.getWorldPosition(micHandWorld);
    head.getWorldPosition(micHeadWorld);
    micDirection.subVectors(micHeadWorld, micHandWorld);
    if (micDirection.lengthSq() < .02) {
      performanceMic.visible = false;
      return;
    }

    micDirection.normalize();
    performanceMic.position.copy(micHandWorld).addScaledVector(micDirection, .035);
    performanceMic.quaternion.setFromUnitVectors(micUp, micDirection);
    performanceMic.visible = true;
  }

  let live = false;
  let intensity = 0;

  function setPerformanceMode(on) {
    live = Boolean(on);
  }

  room.animated.push((time, dt) => {
    intensity += ((live ? 1 : 0) - intensity) * Math.min(1, dt * 3.2);
    beams.forEach((beam, index) => {
      beam.material.opacity = .022 + intensity * (.07 + index * .006);
      beam.rotation.y = Math.sin(time * .0007 + index) * .2;
    });
    const positions = dust.geometry.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      const yIndex = i * 3 + 1;
      positions[yIndex] += dt * (.028 + (i % 5) * .006);
      if (positions[yIndex] > 7.1) positions[yIndex] = .65;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    dj.rotation.z = Math.sin(time * .0032) * .018 * (live ? 1 : .25);
    djHead.rotation.y = Math.sin(time * .0024) * .22;
    updatePerformanceMic();
  });

  return { setPerformanceMode, materials: { brickMat, woodMat, stageMat } };
}
