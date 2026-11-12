import * as THREE from 'three';
import { VehicleDefinition, VehicleCustomization } from '../../types/game';

export interface BuiltVehicle {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  accentMeshes: THREE.Mesh[];
  rimMeshes: THREE.Mesh[];
  spoilerGroup: THREE.Group;
  underglowMesh: THREE.Mesh | null;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  extraWheels?: THREE.Group[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  nitroFlames: THREE.Mesh[];
  customization: VehicleCustomization;
  updateCustomization: (cust: VehicleCustomization) => void;
}

// Materials generator helper with varied roughness and metalness
function createCarPaintMaterial(color: string, finish: VehicleCustomization['finish'] = 'gloss') {
  let roughness = 0.15;
  let metalness = 0.1;
  let clearcoat = 1.0;
  let clearcoatRoughness = 0.1;

  if (finish === 'metallic') {
    metalness = 0.85;
    roughness = 0.25;
    clearcoat = 1.0;
  } else if (finish === 'matte') {
    metalness = 0.05;
    roughness = 0.75;
    clearcoat = 0.0;
  } else if (finish === 'chrome') {
    metalness = 0.98;
    roughness = 0.04;
    clearcoat = 1.0;
  }

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness,
  });
}

const carbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.45,
  metalness: 0.3,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x111827,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.8,
  transparent: true,
  opacity: 0.85,
});

const rubberTireMaterial = new THREE.MeshStandardMaterial({
  color: 0x171717,
  roughness: 0.85,
  metalness: 0.05,
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  metalness: 0.95,
  roughness: 0.1,
});

const brakeDiscMaterial = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  metalness: 0.8,
  roughness: 0.3,
});

const caliperMaterial = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  metalness: 0.2,
  roughness: 0.3,
});

export function createWheel(radius: number, width: number, rimColor: string, isMonster: boolean = false): { wheelGroup: THREE.Group; rimMesh: THREE.Mesh } {
  const wheelGroup = new THREE.Group();

  // Tire geometry
  const tireGeom = isMonster
    ? new THREE.CylinderGeometry(radius, radius, width, 18)
    : new THREE.CylinderGeometry(radius, radius, width, 24);
  tireGeom.rotateZ(Math.PI / 2);

  const tireMesh = new THREE.Mesh(tireGeom, rubberTireMaterial);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wheelGroup.add(tireMesh);

  // Monster truck aggressive tread ridges
  if (isMonster) {
    const treadCount = 12;
    for (let i = 0; i < treadCount; i++) {
      const angle = (i / treadCount) * Math.PI * 2;
      const treadGeom = new THREE.BoxGeometry(0.08, width * 0.95, radius * 0.2);
      const treadMesh = new THREE.Mesh(treadGeom, rubberTireMaterial);
      treadMesh.position.set(Math.cos(angle) * radius * 0.96, Math.sin(angle) * radius * 0.96, 0);
      treadMesh.rotation.z = angle;
      wheelGroup.add(treadMesh);
    }
  }

  // Rim geometry
  const rimRadius = isMonster ? radius * 0.5 : radius * 0.68;
  const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 16);
  rimGeom.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rimColor),
    metalness: 0.85,
    roughness: 0.2,
  });
  const rimMesh = new THREE.Mesh(rimGeom, rimMat);
  wheelGroup.add(rimMesh);

  // Rim spokes accent
  const spokeCount = 5;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spokeGeom = new THREE.BoxGeometry(width * 1.03, rimRadius * 0.9, rimRadius * 0.15);
    const spokeMesh = new THREE.Mesh(spokeGeom, chromeMaterial);
    spokeMesh.rotation.x = angle;
    wheelGroup.add(spokeMesh);
  }

  // Brake disc & caliper inside rim (skip for bike/scooter or small wheels)
  if (radius > 0.3) {
    const discGeom = new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, 0.03, 16);
    discGeom.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeom, brakeDiscMaterial);
    wheelGroup.add(discMesh);

    const caliperGeom = new THREE.BoxGeometry(0.05, rimRadius * 0.4, rimRadius * 0.25);
    const caliperMesh = new THREE.Mesh(caliperGeom, caliperMaterial);
    caliperMesh.position.set(0, rimRadius * 0.45, 0);
    wheelGroup.add(caliperMesh);
  }

  return { wheelGroup, rimMesh };
}

export function buildVehicle(def: VehicleDefinition, custOverride?: VehicleCustomization): BuiltVehicle {
  const cust = custOverride || { ...def.defaultCustomization };
  const rootGroup = new THREE.Group();
  rootGroup.name = `vehicle_${def.id}`;

  const bodyMat = createCarPaintMaterial(cust.bodyColor, cust.finish);
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(cust.accentColor),
    metalness: 0.4,
    roughness: 0.3,
  });

  const accentMeshes: THREE.Mesh[] = [];
  const rimMeshes: THREE.Mesh[] = [];
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  const nitroFlames: THREE.Mesh[] = [];
  const extraWheels: THREE.Group[] = [];

  const dim = def.dimensions;
  const isMonster = def.category === 'monstertruck';
  const isBike = def.category === 'superbike' || def.category === 'scooter';
  const isTruck = def.category === 'heavytruck';
  const isBus = def.category === 'bus';
  const isFormula = def.category === 'formula';

  // Master body mesh reference
  let mainBodyMesh: THREE.Mesh;

  // Suspension / Chassis offset from ground
  const chassisY = dim.wheelRadius * 0.85 + (isMonster ? 0.7 : 0.08);

  // Headlight & Taillight materials
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });

  // 1. VEHICLE-SPECIFIC PROCEDURAL GEOMETRIES
  if (isFormula) {
    // FORMULA 1 CAR
    // Main needle monocoque
    const noseGeom = new THREE.BoxGeometry(0.7, 0.35, dim.length * 0.85);
    mainBodyMesh = new THREE.Mesh(noseGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.2, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Sidepods
    const podGeom = new THREE.BoxGeometry(dim.width * 0.8, 0.4, dim.length * 0.45);
    const podMesh = new THREE.Mesh(podGeom, bodyMat);
    podMesh.position.set(0, chassisY + 0.22, 0.1);
    rootGroup.add(podMesh);

    // Front wing
    const fwGeom = new THREE.BoxGeometry(dim.width * 0.95, 0.05, 0.5);
    const fwMesh = new THREE.Mesh(fwGeom, carbonMaterial);
    fwMesh.position.set(0, chassisY + 0.08, -dim.length * 0.42);
    rootGroup.add(fwMesh);

    // Cockpit opening & Halo safety bar
    const haloGeom = new THREE.TorusGeometry(0.28, 0.04, 8, 16, Math.PI);
    haloGeom.rotateX(Math.PI / 2);
    const haloMesh = new THREE.Mesh(haloGeom, carbonMaterial);
    haloMesh.position.set(0, chassisY + 0.45, -0.1);
    rootGroup.add(haloMesh);

    // Driver helmet
    const helmetGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const helmetMesh = new THREE.Mesh(helmetGeom, accentMat);
    helmetMesh.position.set(0, chassisY + 0.38, -0.05);
    rootGroup.add(helmetMesh);
    accentMeshes.push(helmetMesh);

  } else if (def.category === 'superbike') {
    // SUPERBIKE
    const bodyGeom = new THREE.BoxGeometry(0.38, 0.55, dim.length * 0.65);
    mainBodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.35, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Windshield
    const windGeom = new THREE.ConeGeometry(0.2, 0.35, 4);
    windGeom.rotateX(-Math.PI / 4);
    const windMesh = new THREE.Mesh(windGeom, glassMaterial);
    windMesh.position.set(0, chassisY + 0.7, -0.4);
    rootGroup.add(windMesh);

    // Handlebars
    const barGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
    barGeom.rotateZ(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeom, chromeMaterial);
    barMesh.position.set(0, chassisY + 0.65, -0.35);
    rootGroup.add(barMesh);

    // Rider silhouette
    const riderTorsoGeom = new THREE.BoxGeometry(0.32, 0.45, 0.45);
    const riderTorso = new THREE.Mesh(riderTorsoGeom, accentMat);
    riderTorso.position.set(0, chassisY + 0.62, 0.05);
    riderTorso.rotation.x = 0.3;
    rootGroup.add(riderTorso);
    accentMeshes.push(riderTorso);

    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), chromeMaterial);
    riderHead.position.set(0, chassisY + 0.9, -0.1);
    rootGroup.add(riderHead);

    // Twin sports exhaust
    const exhGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8);
    exhGeom.rotateX(Math.PI / 3);
    const exhMesh = new THREE.Mesh(exhGeom, chromeMaterial);
    exhMesh.position.set(0.18, chassisY + 0.35, 0.5);
    rootGroup.add(exhMesh);

  } else if (def.category === 'scooter') {
    // RETRO URBAN SCOOTER
    const deckGeom = new THREE.BoxGeometry(0.45, 0.15, dim.length * 0.7);
    mainBodyMesh = new THREE.Mesh(deckGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.12, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Front apron shield
    const apronGeom = new THREE.BoxGeometry(0.48, 0.65, 0.08);
    const apronMesh = new THREE.Mesh(apronGeom, bodyMat);
    apronMesh.position.set(0, chassisY + 0.45, -dim.length * 0.32);
    apronMesh.rotation.x = -0.2;
    rootGroup.add(apronMesh);

    // Retro round headlight
    const lightGeom = new THREE.SphereGeometry(0.1, 12, 12);
    const lightMesh = new THREE.Mesh(lightGeom, headlightMat);
    lightMesh.position.set(0, chassisY + 0.82, -dim.length * 0.32);
    rootGroup.add(lightMesh);
    headlights.push(lightMesh);

    // Seat
    const seatGeom = new THREE.BoxGeometry(0.35, 0.15, 0.6);
    const seatMesh = new THREE.Mesh(seatGeom, accentMat);
    seatMesh.position.set(0, chassisY + 0.45, 0.15);
    rootGroup.add(seatMesh);
    accentMeshes.push(seatMesh);

  } else if (isMonster) {
    // MONSTER TRUCK
    // High chassis subframe & roll-cage
    const subframeGeom = new THREE.BoxGeometry(dim.width * 0.6, 0.4, dim.length * 0.7);
    const subframeMesh = new THREE.Mesh(subframeGeom, carbonMaterial);
    subframeMesh.position.set(0, chassisY, 0);
    rootGroup.add(subframeMesh);

    // Main cab
    const cabGeom = new THREE.BoxGeometry(dim.width * 0.7, 1.1, dim.length * 0.75);
    mainBodyMesh = new THREE.Mesh(cabGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.8, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Windshield
    const wsGeom = new THREE.BoxGeometry(dim.width * 0.68, 0.5, 0.6);
    const wsMesh = new THREE.Mesh(wsGeom, glassMaterial);
    wsMesh.position.set(0, chassisY + 1.1, -0.4);
    wsMesh.rotation.x = 0.25;
    rootGroup.add(wsMesh);

    // Roof spotlights (4 lights)
    for (let i = -1.5; i <= 1.5; i += 1) {
      const spotGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12);
      spotGeom.rotateX(Math.PI / 2);
      const spotMesh = new THREE.Mesh(spotGeom, headlightMat);
      spotMesh.position.set(i * 0.35, chassisY + 1.45, -0.2);
      rootGroup.add(spotMesh);
      headlights.push(spotMesh);
    }

    // Heavy duty suspension shock absorbers
    const shockGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
    [-1, 1].forEach((side) => {
      [-1, 1].forEach((front) => {
        const shockMesh = new THREE.Mesh(shockGeom, chromeMaterial);
        shockMesh.position.set(side * 0.9, chassisY - 0.25, front * 1.3);
        rootGroup.add(shockMesh);
      });
    });

  } else if (isTruck) {
    // HEAVY TRUCK / 18-WHEELER
    const cabGeom = new THREE.BoxGeometry(dim.width * 0.88, 2.2, dim.length * 0.4);
    mainBodyMesh = new THREE.Mesh(cabGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 1.0, -dim.length * 0.25);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Sleeper cab extension
    const sleeperGeom = new THREE.BoxGeometry(dim.width * 0.86, 1.9, dim.length * 0.3);
    const sleeperMesh = new THREE.Mesh(sleeperGeom, bodyMat);
    sleeperMesh.position.set(0, chassisY + 0.9, -dim.length * 0.02);
    rootGroup.add(sleeperMesh);

    // Flatbed / Fifth wheel chassis
    const bedGeom = new THREE.BoxGeometry(dim.width * 0.85, 0.4, dim.length * 0.45);
    const bedMesh = new THREE.Mesh(bedGeom, carbonMaterial);
    bedMesh.position.set(0, chassisY + 0.2, dim.length * 0.25);
    rootGroup.add(bedMesh);

    // Huge chrome front grill
    const grillGeom = new THREE.BoxGeometry(dim.width * 0.7, 1.2, 0.15);
    const grillMesh = new THREE.Mesh(grillGeom, chromeMaterial);
    grillMesh.position.set(0, chassisY + 0.7, -dim.length * 0.46);
    rootGroup.add(grillMesh);

    // Twin vertical chrome smokestacks
    [-0.95, 0.95].forEach((xPos) => {
      const stackGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 12);
      const stackMesh = new THREE.Mesh(stackGeom, chromeMaterial);
      stackMesh.position.set(xPos, chassisY + 1.4, -dim.length * 0.12);
      rootGroup.add(stackMesh);
    });

  } else if (isBus) {
    // CITY PASSENGER TRANSIT BUS
    const busBodyGeom = new THREE.BoxGeometry(dim.width * 0.95, 2.1, dim.length * 0.95);
    mainBodyMesh = new THREE.Mesh(busBodyGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 1.0, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Long panoramic tinted windows
    const winGeom = new THREE.BoxGeometry(dim.width * 0.98, 0.75, dim.length * 0.85);
    const winMesh = new THREE.Mesh(winGeom, glassMaterial);
    winMesh.position.set(0, chassisY + 1.25, 0);
    rootGroup.add(winMesh);

    // Roof AC pod units
    const acGeom = new THREE.BoxGeometry(1.2, 0.25, 2.5);
    const acMesh = new THREE.Mesh(acGeom, accentMat);
    acMesh.position.set(0, chassisY + 2.15, 0);
    rootGroup.add(acMesh);
    accentMeshes.push(acMesh);

  } else if (def.category === 'offroad') {
    // OFFROAD 4X4 JEEP
    const bodyGeom = new THREE.BoxGeometry(dim.width * 0.9, 0.9, dim.length * 0.85);
    mainBodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.45, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // Upright cabin & roll-cage
    const cabGeom = new THREE.BoxGeometry(dim.width * 0.82, 0.75, dim.length * 0.5);
    const cabMesh = new THREE.Mesh(cabGeom, carbonMaterial);
    cabMesh.position.set(0, chassisY + 1.0, 0.35);
    rootGroup.add(cabMesh);

    // Windshield
    const wsGeom = new THREE.BoxGeometry(dim.width * 0.8, 0.55, 0.08);
    const wsMesh = new THREE.Mesh(wsGeom, glassMaterial);
    wsMesh.position.set(0, chassisY + 0.95, -0.1);
    wsMesh.rotation.x = -0.15;
    rootGroup.add(wsMesh);

    // Rear exterior spare tire
    const { wheelGroup: spareWheel } = createWheel(dim.wheelRadius * 0.9, dim.wheelWidth * 0.9, '#171717');
    spareWheel.position.set(0, chassisY + 0.65, dim.length * 0.44);
    rootGroup.add(spareWheel);

  } else {
    // SUPERCARS, SPORTS CARS, RALLY, DRIFT, VINTAGE, ELECTRIC, SPECIAL
    // 1. Lower chassis / floorpan
    const floorGeom = new THREE.BoxGeometry(dim.width * 0.92, 0.32, dim.length * 0.92);
    mainBodyMesh = new THREE.Mesh(floorGeom, bodyMat);
    mainBodyMesh.position.set(0, chassisY + 0.16, 0);
    mainBodyMesh.castShadow = true;
    rootGroup.add(mainBodyMesh);

    // 2. Aerodynamic Hood & Front Splitter
    const hoodGeom = new THREE.BoxGeometry(dim.width * 0.88, 0.22, dim.length * 0.4);
    const hoodMesh = new THREE.Mesh(hoodGeom, bodyMat);
    hoodMesh.position.set(0, chassisY + 0.26, -dim.length * 0.25);
    hoodMesh.rotation.x = -0.05;
    rootGroup.add(hoodMesh);

    // 3. Cockpit Glass Canopy
    const canopyLength = def.category === 'vintage' ? dim.length * 0.45 : dim.length * 0.4;
    const canopyGeom = new THREE.BoxGeometry(dim.width * 0.76, 0.45, canopyLength);
    const canopyMesh = new THREE.Mesh(canopyGeom, glassMaterial);
    canopyMesh.position.set(0, chassisY + 0.52, def.category === 'vintage' ? 0.2 : 0.05);
    rootGroup.add(canopyMesh);

    // 4. Racing accent stripe down the center
    const stripeGeom = new THREE.BoxGeometry(0.35, 0.02, dim.length * 0.85);
    const stripeMesh = new THREE.Mesh(stripeGeom, accentMat);
    stripeMesh.position.set(0, chassisY + 0.38, 0);
    rootGroup.add(stripeMesh);
    accentMeshes.push(stripeMesh);

    // 5. Front grille / Carbon Diffuser
    const diffuserGeom = new THREE.BoxGeometry(dim.width * 0.94, 0.12, 0.25);
    const diffuserMesh = new THREE.Mesh(diffuserGeom, carbonMaterial);
    diffuserMesh.position.set(0, chassisY + 0.06, dim.length * 0.47);
    rootGroup.add(diffuserMesh);

    // 6. Side mirrors
    [-1, 1].forEach((side) => {
      const mirrorGeom = new THREE.BoxGeometry(0.14, 0.08, 0.12);
      const mirrorMesh = new THREE.Mesh(mirrorGeom, carbonMaterial);
      mirrorMesh.position.set(side * (dim.width * 0.46), chassisY + 0.48, -0.3);
      rootGroup.add(mirrorMesh);
    });

    // 7. Quad chrome exhaust tips
    [-0.32, -0.15, 0.15, 0.32].forEach((xOff) => {
      const exhGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12);
      exhGeom.rotateX(Math.PI / 2);
      const exhMesh = new THREE.Mesh(exhGeom, chromeMaterial);
      exhMesh.position.set(xOff, chassisY + 0.15, dim.length * 0.49);
      rootGroup.add(exhMesh);
    });
  }

  // Headlights & Taillights common placement
  const hlZ = -dim.length * 0.46;
  const tlZ = dim.length * 0.46;
  const hlWidth = isBike ? 0 : dim.width * 0.35;

  if (isBike) {
    const hlGeom = new THREE.SphereGeometry(0.09, 12, 12);
    const hlMesh = new THREE.Mesh(hlGeom, headlightMat);
    hlMesh.position.set(0, chassisY + 0.4, hlZ);
    rootGroup.add(hlMesh);
    headlights.push(hlMesh);

    const tlGeom = new THREE.SphereGeometry(0.07, 12, 12);
    const tlMesh = new THREE.Mesh(tlGeom, taillightMat);
    tlMesh.position.set(0, chassisY + 0.42, tlZ);
    rootGroup.add(tlMesh);
    taillights.push(tlMesh);
  } else {
    // Dual front headlights
    [-hlWidth, hlWidth].forEach((xPos) => {
      const hlGeom = new THREE.BoxGeometry(dim.width * 0.2, 0.1, 0.06);
      const hlMesh = new THREE.Mesh(hlGeom, headlightMat);
      hlMesh.position.set(xPos, chassisY + 0.24, hlZ);
      rootGroup.add(hlMesh);
      headlights.push(hlMesh);
    });

    // Dual rear brake/tail lights
    [-hlWidth, hlWidth].forEach((xPos) => {
      const tlGeom = new THREE.BoxGeometry(dim.width * 0.22, 0.08, 0.06);
      const tlMesh = new THREE.Mesh(tlGeom, taillightMat);
      tlMesh.position.set(xPos, chassisY + 0.25, tlZ);
      rootGroup.add(tlMesh);
      taillights.push(tlMesh);
    });
  }

  // 2. SPOILER GROUP
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, chassisY + 0.42, dim.length * 0.4);
  rootGroup.add(spoilerGroup);

  function rebuildSpoiler(index: number) {
    while (spoilerGroup.children.length > 0) {
      spoilerGroup.remove(spoilerGroup.children[0]);
    }
    if (index === 0 || isBike || isTruck || isBus || isMonster) return; // Stock / No spoiler

    if (index === 1) {
      // Sport lip spoiler
      const lipGeom = new THREE.BoxGeometry(dim.width * 0.75, 0.08, 0.2);
      const lipMesh = new THREE.Mesh(lipGeom, carbonMaterial);
      lipMesh.position.set(0, 0.05, 0);
      spoilerGroup.add(lipMesh);
    } else if (index === 2) {
      // GT Carbon wing with twin stanchions
      const wingGeom = new THREE.BoxGeometry(dim.width * 0.88, 0.05, 0.35);
      const wingMesh = new THREE.Mesh(wingGeom, carbonMaterial);
      wingMesh.position.set(0, 0.35, 0);
      wingMesh.rotation.x = -0.12;
      spoilerGroup.add(wingMesh);

      [-0.45, 0.45].forEach((x) => {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.1), carbonMaterial);
        upright.position.set(x, 0.18, 0);
        spoilerGroup.add(upright);
      });
    } else if (index === 3) {
      // High Downforce Time Attack Wing
      const wingGeom = new THREE.BoxGeometry(dim.width * 0.98, 0.06, 0.45);
      const wingMesh = new THREE.Mesh(wingGeom, carbonMaterial);
      wingMesh.position.set(0, 0.55, 0.05);
      wingMesh.rotation.x = -0.18;
      spoilerGroup.add(wingMesh);

      // Endplates
      [-dim.width * 0.49, dim.width * 0.49].forEach((x) => {
        const epGeom = new THREE.BoxGeometry(0.03, 0.25, 0.5);
        const epMesh = new THREE.Mesh(epGeom, accentMat);
        epMesh.position.set(x, 0.55, 0.05);
        spoilerGroup.add(epMesh);
        accentMeshes.push(epMesh);
      });

      // Uprights
      [-0.48, 0.48].forEach((x) => {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.15), chromeMaterial);
        upright.position.set(x, 0.28, 0);
        spoilerGroup.add(upright);
      });
    }
  }
  rebuildSpoiler(cust.spoilerIndex);

  // 3. NITRO FLAMES (Cones at exhaust)
  const flameGeom = new THREE.ConeGeometry(0.12, 0.65, 12);
  flameGeom.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.9,
  });
  [-0.22, 0.22].forEach((xOff) => {
    const flameMesh = new THREE.Mesh(flameGeom, flameMat);
    flameMesh.position.set(xOff, chassisY + 0.15, dim.length * 0.52);
    flameMesh.scale.set(0.001, 0.001, 0.001); // hidden until active
    rootGroup.add(flameMesh);
    nitroFlames.push(flameMesh);
  });

  // 4. UNDERGLOW NEON PLANE
  let underglowMesh: THREE.Mesh | null = null;
  if (cust.underglowColor) {
    const underGeom = new THREE.PlaneGeometry(dim.width * 0.88, dim.length * 0.85);
    underGeom.rotateX(-Math.PI / 2);
    const underMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cust.underglowColor),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    underglowMesh = new THREE.Mesh(underGeom, underMat);
    underglowMesh.position.set(0, 0.04, 0);
    rootGroup.add(underglowMesh);
  }

  // 5. WHEELS & SUSPENSION
  const halfTrack = isBike ? 0 : dim.width * 0.48;
  const frontZ = -dim.wheelbase * 0.5;
  const rearZ = dim.wheelbase * 0.5;
  const wheelY = dim.wheelRadius;

  const flWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, isMonster);
  flWheelData.wheelGroup.position.set(-halfTrack, wheelY, frontZ);
  rootGroup.add(flWheelData.wheelGroup);
  rimMeshes.push(flWheelData.rimMesh);

  const frWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, isMonster);
  frWheelData.wheelGroup.position.set(halfTrack, wheelY, frontZ);
  rootGroup.add(frWheelData.wheelGroup);
  rimMeshes.push(frWheelData.rimMesh);

  const rlWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, isMonster);
  rlWheelData.wheelGroup.position.set(-halfTrack, wheelY, rearZ);
  rootGroup.add(rlWheelData.wheelGroup);
  rimMeshes.push(rlWheelData.rimMesh);

  const rrWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, isMonster);
  rrWheelData.wheelGroup.position.set(halfTrack, wheelY, rearZ);
  rootGroup.add(rrWheelData.wheelGroup);
  rimMeshes.push(rrWheelData.rimMesh);

  // Extra wheels for heavy truck / multi-axle bus
  if (isTruck || isBus) {
    const extraZ = rearZ + 1.25;
    const elWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, false);
    elWheelData.wheelGroup.position.set(-halfTrack, wheelY, extraZ);
    rootGroup.add(elWheelData.wheelGroup);
    extraWheels.push(elWheelData.wheelGroup);
    rimMeshes.push(elWheelData.rimMesh);

    const erWheelData = createWheel(dim.wheelRadius, dim.wheelWidth, cust.rimColor, false);
    erWheelData.wheelGroup.position.set(halfTrack, wheelY, extraZ);
    rootGroup.add(erWheelData.wheelGroup);
    extraWheels.push(erWheelData.wheelGroup);
    rimMeshes.push(erWheelData.rimMesh);
  }

  // Update customization function
  const updateCustomization = (newCust: VehicleCustomization) => {
    // Update body paint
    const newBodyMat = createCarPaintMaterial(newCust.bodyColor, newCust.finish);
    mainBodyMesh.material = newBodyMat;

    // Update accent meshes
    const newAccentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(newCust.accentColor),
      metalness: 0.4,
      roughness: 0.3,
    });
    accentMeshes.forEach((m) => {
      m.material = newAccentMat;
    });

    // Update rims
    const newRimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(newCust.rimColor),
      metalness: 0.85,
      roughness: 0.2,
    });
    rimMeshes.forEach((r) => {
      r.material = newRimMat;
    });

    // Update spoiler
    rebuildSpoiler(newCust.spoilerIndex);

    // Update underglow
    if (newCust.underglowColor) {
      if (!underglowMesh) {
        const underGeom = new THREE.PlaneGeometry(dim.width * 0.88, dim.length * 0.85);
        underGeom.rotateX(-Math.PI / 2);
        const underMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(newCust.underglowColor),
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        underglowMesh = new THREE.Mesh(underGeom, underMat);
        underglowMesh.position.set(0, 0.04, 0);
        rootGroup.add(underglowMesh);
      } else {
        (underglowMesh.material as THREE.MeshBasicMaterial).color.set(newCust.underglowColor);
        underglowMesh.visible = true;
      }
    } else if (underglowMesh) {
      underglowMesh.visible = false;
    }
  };

  return {
    group: rootGroup,
    bodyMesh: mainBodyMesh,
    accentMeshes,
    rimMeshes,
    spoilerGroup,
    underglowMesh,
    frontLeftWheel: flWheelData.wheelGroup,
    frontRightWheel: frWheelData.wheelGroup,
    rearLeftWheel: rlWheelData.wheelGroup,
    rearRightWheel: rrWheelData.wheelGroup,
    extraWheels,
    headlights,
    taillights,
    nitroFlames,
    customization: cust,
    updateCustomization,
  };
}
