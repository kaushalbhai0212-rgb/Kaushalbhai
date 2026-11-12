import * as THREE from 'three';
import { TrackDefinition, TrackCheckpoint } from '../../types/game';

export interface BuiltTrack {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  checkpoints: TrackCheckpoint[];
  startPosition: THREE.Vector3;
  startHeading: number;
  getTrackElevation: (x: number, z: number) => number;
  roadWidth: number;
  dispose: () => void;
}

// Procedural high-resolution road texture generator
function createRoadTexture(surface: 'asphalt' | 'dirt' | 'snow' | 'runway'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (surface === 'dirt') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 512, 512);
    // Gravel noise
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#92400e' : '#451a03';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  } else if (surface === 'snow') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 512, 512);
    // Frost & ice patches
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 2000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
  } else {
    // Asphalt / Runway
    ctx.fillStyle = surface === 'runway' ? '#27272a' : '#1e2022';
    ctx.fillRect(0, 0, 512, 512);

    // Fine aggregate speckle
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#373a40' : '#141416';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Outer edge lines (Solid white)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, 0, 8, 512);
    ctx.fillRect(480, 0, 8, 512);

    // Center divider (Dashed yellow for city/mountain, white for track)
    ctx.fillStyle = surface === 'runway' ? '#facc15' : '#fef08a';
    for (let y = 30; y < 512; y += 100) {
      ctx.fillRect(252, y, 8, 50);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural apex curb texture (red and white stripes)
function createCurbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dc2626'; // red
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#f8fafc'; // white
  ctx.fillRect(0, 64, 128, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 60);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTrack(def: TrackDefinition, maxAnisotropy: number = 4): BuiltTrack {
  const trackGroup = new THREE.Group();
  trackGroup.name = `track_${def.id}`;

  const roadWidth = def.surfaceType === 'runway' ? 20 : 15;
  const halfRoad = roadWidth * 0.5;

  // 1. CatmullRom spline curve
  const curvePoints = def.points.map((p) => new THREE.Vector3(p.x, p.y || 0, p.z));
  const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal');

  const divisions = 400;
  const roadTexture = createRoadTexture(def.surfaceType);
  roadTexture.anisotropy = maxAnisotropy;

  const curbTexture = createCurbTexture();
  curbTexture.anisotropy = maxAnisotropy;

  // Road geometry builder using ribbon quads
  const roadGeom = new THREE.BufferGeometry();
  const curbLeftGeom = new THREE.BufferGeometry();
  const curbRightGeom = new THREE.BufferGeometry();
  const barrierGeom = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const curbLVertices: number[] = [];
  const curbRVertices: number[] = [];
  const curbUvs: number[] = [];
  const curbIndices: number[] = [];

  const barrierVertices: number[] = [];
  const barrierUvs: number[] = [];
  const barrierIndices: number[] = [];

  const samplePoints: THREE.Vector3[] = [];
  const sampleNormals: THREE.Vector3[] = [];
  const sampleTangents: THREE.Vector3[] = [];

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    samplePoints.push(pt);
    sampleNormals.push(normal);
    sampleTangents.push(tangent);

    // Left and right road edge
    const leftPt = pt.clone().addScaledVector(normal, -halfRoad);
    const rightPt = pt.clone().addScaledVector(normal, halfRoad);

    vertices.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
    vertices.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

    const vCoord = (i / divisions) * 60;
    uvs.push(0, vCoord);
    uvs.push(1, vCoord);

    // Left Curb
    const curbLOuter = pt.clone().addScaledVector(normal, -(halfRoad + 1.2));
    curbLVertices.push(curbLOuter.x, curbLOuter.y + 0.12, curbLOuter.z);
    curbLVertices.push(leftPt.x, leftPt.y + 0.06, leftPt.z);

    // Right Curb
    const curbROuter = pt.clone().addScaledVector(normal, halfRoad + 1.2);
    curbRVertices.push(rightPt.x, rightPt.y + 0.06, rightPt.z);
    curbRVertices.push(curbROuter.x, curbROuter.y + 0.12, curbROuter.z);

    curbUvs.push(0, vCoord);
    curbUvs.push(1, vCoord);

    // Armco Crash Barriers (Everywhere except airport runway)
    if (def.surfaceType !== 'runway') {
      const barL = pt.clone().addScaledVector(normal, -(halfRoad + 1.6));
      barrierVertices.push(barL.x, barL.y + 0.1, barL.z);
      barrierVertices.push(barL.x, barL.y + 1.0, barL.z);

      const barR = pt.clone().addScaledVector(normal, halfRoad + 1.6);
      barrierVertices.push(barR.x, barR.y + 0.1, barR.z);
      barrierVertices.push(barR.x, barR.y + 1.0, barR.z);

      barrierUvs.push(0, vCoord * 0.2);
      barrierUvs.push(1, vCoord * 0.2);
    }
  }

  // Construct triangles for ribbon
  for (let i = 0; i < divisions; i++) {
    const v0 = i * 2;
    const v1 = i * 2 + 1;
    const v2 = (i + 1) * 2;
    const v3 = (i + 1) * 2 + 1;

    indices.push(v0, v1, v2);
    indices.push(v1, v3, v2);

    curbIndices.push(v0, v1, v2);
    curbIndices.push(v1, v3, v2);
  }

  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeom.setIndex(indices);
  roadGeom.computeVertexNormals();

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: def.surfaceType === 'snow' ? 0.35 : 0.8,
    metalness: 0.1,
  });
  const roadMesh = new THREE.Mesh(roadGeom, roadMaterial);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  // Curbs mesh
  curbLeftGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbLVertices, 3));
  curbLeftGeom.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvs, 2));
  curbLeftGeom.setIndex(curbIndices);
  curbLeftGeom.computeVertexNormals();

  curbRightGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbRVertices, 3));
  curbRightGeom.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvs, 2));
  curbRightGeom.setIndex(curbIndices);
  curbRightGeom.computeVertexNormals();

  const curbMaterial = new THREE.MeshStandardMaterial({
    map: curbTexture,
    roughness: 0.7,
    metalness: 0.2,
  });

  const curbLMesh = new THREE.Mesh(curbLeftGeom, curbMaterial);
  const curbRMesh = new THREE.Mesh(curbRightGeom, curbMaterial);
  trackGroup.add(curbLMesh);
  trackGroup.add(curbRMesh);

  // Barriers
  if (def.surfaceType !== 'runway') {
    const barIndices: number[] = [];
    for (let i = 0; i < divisions; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      barIndices.push(v0, v1, v2);
      barIndices.push(v1, v3, v2);
    }
    barrierGeom.setAttribute('position', new THREE.Float32BufferAttribute(barrierVertices, 3));
    barrierGeom.setAttribute('uv', new THREE.Float32BufferAttribute(barrierUvs, 2));
    barrierGeom.setIndex(barIndices);
    barrierGeom.computeVertexNormals();

    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });
    const barrierMesh = new THREE.Mesh(barrierGeom, barrierMat);
    barrierMesh.castShadow = true;
    trackGroup.add(barrierMesh);
  }

  // 2. Huge Ground Landscape Terrain
  const groundSize = 1200;
  const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
  groundGeom.rotateX(-Math.PI / 2);

  let groundColor = 0x1f2937; // city asphalt grey
  if (def.sceneryType === 'desert') groundColor = 0xc27838;
  else if (def.sceneryType === 'snow') groundColor = 0xe2e8f0;
  else if (def.sceneryType === 'forest' || def.sceneryType === 'mountain') groundColor = 0x164e32;
  else if (def.sceneryType === 'coastal') groundColor = 0x0284c7;

  const groundMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.9,
    metalness: 0.05,
  });
  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  trackGroup.add(groundMesh);

  // 3. START / FINISH Gantry Arch
  const startPt = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0).normalize();
  const startNormal = new THREE.Vector3().crossVectors(startTangent, new THREE.Vector3(0, 1, 0)).normalize();
  const startHeading = Math.atan2(startTangent.x, startTangent.z);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startPt);
  gantryGroup.rotation.y = startHeading;

  // Gantry pillars
  const pillarGeom = new THREE.BoxGeometry(0.8, 7.5, 0.8);
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.3 });
  [-halfRoad - 2, halfRoad + 2].forEach((x) => {
    const pillar = new THREE.Mesh(pillarGeom, trussMat);
    pillar.position.set(x, 3.75, 0);
    gantryGroup.add(pillar);
  });

  // Gantry crossbar
  const crossGeom = new THREE.BoxGeometry(roadWidth + 5.5, 1.8, 1.2);
  const crossMesh = new THREE.Mesh(crossGeom, trussMat);
  crossMesh.position.set(0, 7.0, 0);
  gantryGroup.add(crossMesh);

  // Start banner display with glowing text emulation
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 512;
  bannerCanvas.height = 128;
  const bCtx = bannerCanvas.getContext('2d')!;
  bCtx.fillStyle = '#09090b';
  bCtx.fillRect(0, 0, 512, 128);
  bCtx.strokeStyle = '#38bdf8';
  bCtx.lineWidth = 6;
  bCtx.strokeRect(6, 6, 500, 116);
  bCtx.fillStyle = '#f8fafc';
  bCtx.font = 'bold 44px sans-serif';
  bCtx.textAlign = 'center';
  bCtx.fillText('START / FINISH', 256, 75);

  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 0.8, 1.5), bannerMat);
  bannerMesh.position.set(0, 7.0, -0.62);
  bannerMesh.rotation.y = Math.PI;
  gantryGroup.add(bannerMesh);

  trackGroup.add(gantryGroup);

  // 4. Checkpoints generation along curve
  const checkpointCount = 12;
  const checkpoints: TrackCheckpoint[] = [];
  for (let i = 0; i < checkpointCount; i++) {
    const t = i / checkpointCount;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    checkpoints.push({
      x: pt.x,
      z: pt.z,
      width: roadWidth + 4,
      angle,
    });

    // Add glowing visual checkpoint arches on non-zero checkpoints
    if (i > 0) {
      const arch = new THREE.Group();
      arch.position.set(pt.x, pt.y || 0, pt.z);
      arch.rotation.y = angle;

      const archGeom = new THREE.TorusGeometry(halfRoad + 2.5, 0.22, 6, 12, Math.PI);
      const archMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.45,
      });
      const archMesh = new THREE.Mesh(archGeom, archMat);
      archMesh.position.y = 0.5;
      arch.add(archMesh);
      trackGroup.add(arch);
    }
  }

  // 5. RICH PROCEDURAL SCENERY & SURROUNDINGS (3-12 part composite elements)
  if (def.sceneryType === 'city') {
    // Downtown Skyscraper skyline
    const bldgGeom = new THREE.BoxGeometry(1, 1, 1);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const glassWindowMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.4,
    });

    const bldgCount = 65;
    for (let b = 0; b < bldgCount; b++) {
      const t = (b / bldgCount + 0.05) % 1;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const dist = 32 + (b % 4) * 22;
      const side = b % 2 === 0 ? 1 : -1;

      const bldgX = pt.x + normal.x * dist * side + ((b * 17) % 30 - 15);
      const bldgZ = pt.z + normal.z * dist * side + ((b * 23) % 30 - 15);
      const bHeight = 35 + ((b * 37) % 95);
      const bWidth = 16 + (b % 3) * 8;
      const bDepth = 16 + ((b * 7) % 3) * 8;

      const bldgGroup = new THREE.Group();
      bldgGroup.position.set(bldgX, bHeight * 0.5, bldgZ);

      const coreMesh = new THREE.Mesh(bldgGeom, bldgMat);
      coreMesh.scale.set(bWidth, bHeight, bDepth);
      coreMesh.castShadow = true;
      bldgGroup.add(coreMesh);

      // Window strips
      const winMesh = new THREE.Mesh(bldgGeom, glassWindowMat);
      winMesh.scale.set(bWidth * 1.01, bHeight * 0.85, bDepth * 1.01);
      bldgGroup.add(winMesh);

      // Rooftop neon antenna
      if (bHeight > 60) {
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.6, 12, 6), trussMat);
        spire.position.y = bHeight * 0.5 + 6;
        bldgGroup.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.y = bHeight * 0.5 + 12;
        bldgGroup.add(beacon);
      }

      trackGroup.add(bldgGroup);
    }

    // Streetlights along road
    const lightPillarGeom = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8);
    const lightHeadGeom = new THREE.BoxGeometry(0.6, 0.2, 1.2);
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let s = 0; s < 40; s++) {
      const t = s / 40;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const lightSide = s % 2 === 0 ? 1 : -1;
      const lPos = pt.clone().addScaledVector(normal, lightSide * (halfRoad + 2.2));

      const slGroup = new THREE.Group();
      slGroup.position.set(lPos.x, lPos.y, lPos.z);
      const post = new THREE.Mesh(lightPillarGeom, trussMat);
      post.position.y = 3.25;
      slGroup.add(post);

      const head = new THREE.Mesh(lightHeadGeom, lightGlowMat);
      head.position.set(-normal.x * lightSide * 0.8, 6.4, -normal.z * lightSide * 0.8);
      slGroup.add(head);

      trackGroup.add(slGroup);
    }
  } else if (def.sceneryType === 'forest' || def.sceneryType === 'mountain' || def.sceneryType === 'snow') {
    // PINE TREES & ROCK OUTCROPS
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const foliageGeom = new THREE.ConeGeometry(3.5, 8, 6);
    const foliageMat = new THREE.MeshStandardMaterial({
      color: def.sceneryType === 'snow' ? 0xdbeafe : 0x14532d,
      roughness: 0.8,
    });

    for (let i = 0; i < 90; i++) {
      const t = (i / 90) % 1;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = halfRoad + 8 + ((i * 13) % 45);

      const treePos = pt.clone().addScaledVector(normal, side * dist);
      const treeGroup = new THREE.Group();
      treeGroup.position.set(treePos.x, treePos.y, treePos.z);

      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 2;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(foliageGeom, foliageMat);
      foliage.position.y = 6.5;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      const scale = 0.7 + ((i * 19) % 50) / 100;
      treeGroup.scale.set(scale, scale, scale);
      trackGroup.add(treeGroup);
    }

    // Rocky Mountain Cliffs
    const rockGeom = new THREE.DodecahedronGeometry(12, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: def.sceneryType === 'snow' ? 0x94a3b8 : 0x57534e,
      roughness: 0.95,
      metalness: 0.1,
    });

    for (let r = 0; r < 35; r++) {
      const t = (r / 35 + 0.03) % 1;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const side = r % 2 === 0 ? 1 : -1;
      const rockPos = pt.clone().addScaledVector(normal, side * (halfRoad + 28 + ((r * 11) % 40)));

      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.position.set(rockPos.x, rockPos.y + 4, rockPos.z);
      rock.rotation.set((r * 0.4) % Math.PI, (r * 0.7) % Math.PI, 0);
      rock.scale.set(1 + (r % 3), 1.5 + ((r * 2) % 3), 1 + ((r * 3) % 3));
      trackGroup.add(rock);
    }
  } else if (def.sceneryType === 'stadium') {
    // Grandstands and bleachers
    const standGeom = new THREE.BoxGeometry(40, 10, 15);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    for (let s = 0; s < 12; s++) {
      const t = (s / 12) % 1;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const sPos = pt.clone().addScaledVector(normal, (halfRoad + 16) * (s % 2 === 0 ? 1 : -1));

      const stand = new THREE.Mesh(standGeom, standMat);
      stand.position.set(sPos.x, sPos.y + 5, sPos.z);
      trackGroup.add(stand);
    }
  } else if (def.sceneryType === 'airport') {
    // Aircraft hangars & Radar tower
    const hangarGeom = new THREE.CylinderGeometry(20, 20, 60, 16, 1, false, 0, Math.PI);
    hangarGeom.rotateZ(Math.PI / 2);
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });

    [-1, 1].forEach((side, idx) => {
      const hangar = new THREE.Mesh(hangarGeom, hangarMat);
      hangar.position.set(side * 80, 0, -120 + idx * 100);
      trackGroup.add(hangar);
    });

    // Radar Control Tower
    const towerPillar = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 35, 12), trussMat);
    towerPillar.position.set(90, 17.5, 40);
    trackGroup.add(towerPillar);

    const radarCab = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 6, 12), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    radarCab.position.set(90, 36, 40);
    trackGroup.add(radarCab);
  } else if (def.sceneryType === 'coastal') {
    // Palm trees
    const palmTrunkGeom = new THREE.CylinderGeometry(0.25, 0.4, 7, 8);
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const palmFrondGeom = new THREE.ConeGeometry(3.5, 1.2, 7);
    const palmGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });

    for (let p = 0; p < 45; p++) {
      const t = p / 45;
      const pt = curve.getPointAt(t);
      const normal = sampleNormals[Math.floor(t * divisions)];
      const pPos = pt.clone().addScaledVector(normal, (halfRoad + 6) * (p % 2 === 0 ? 1 : -1));

      const palmGroup = new THREE.Group();
      palmGroup.position.set(pPos.x, pPos.y, pPos.z);
      const trunk = new THREE.Mesh(palmTrunkGeom, palmMat);
      trunk.position.y = 3.5;
      palmGroup.add(trunk);

      const fronds = new THREE.Mesh(palmFrondGeom, palmGreenMat);
      fronds.position.y = 7.0;
      palmGroup.add(fronds);
      trackGroup.add(palmGroup);
    }
  }

  // Elevation sampling function
  const getTrackElevation = (x: number, z: number): number => {
    // Find closest point on curve
    let minDistSq = Infinity;
    let closestY = 0;
    const testVec = new THREE.Vector3(x, 0, z);

    for (let i = 0; i < samplePoints.length; i += 4) {
      const sp = samplePoints[i];
      const distSq = (sp.x - testVec.x) ** 2 + (sp.z - testVec.z) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestY = sp.y;
      }
    }
    return closestY;
  };

  const dispose = () => {
    roadGeom.dispose();
    curbLeftGeom.dispose();
    curbRightGeom.dispose();
    barrierGeom.dispose();
    roadTexture.dispose();
    curbTexture.dispose();
    groundGeom.dispose();
  };

  return {
    group: trackGroup,
    curve,
    checkpoints,
    startPosition: startPt,
    startHeading,
    getTrackElevation,
    roadWidth,
    dispose,
  };
}
