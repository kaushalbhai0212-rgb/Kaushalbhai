import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BuiltTrack, buildTrack } from './tracks/TrackBuilder';
import { BuiltVehicle, buildVehicle } from './vehicles/VehicleBuilder';
import { VehiclePhysics, VehicleControlInput } from './physics/VehiclePhysics';
import { AIOpponent } from './ai/AIOpponent';
import {
  TrackDefinition,
  VehicleDefinition,
  VehicleUpgrades,
  VehicleCustomization,
  WeatherType,
  RaceParticipant,
  GameMode,
} from '../types/game';
import { soundManager } from '../audio/SoundManager';
import { VEHICLE_CATALOG } from './vehicles/vehicleData';

export interface GameEngineCallbacks {
  onLapCompleted: (lap: number, lapTime: number, bestTime: number) => void;
  onRaceFinished: (results: RaceParticipant[], totalTime: number) => void;
  onDriftPointsUpdated: (totalDrift: number, isDrifting: boolean) => void;
  onTelemetryUpdated: (
    speedKmh: number,
    rpm: number,
    gear: number,
    nitro: number,
    pos: number,
    totalRacers: number,
    lap: number,
    totalLaps: number,
    lapTime: number,
    wrongWay: boolean
  ) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  // Track & Environment
  private currentTrackDef: TrackDefinition;
  private builtTrack: BuiltTrack | null = null;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private weatherType: WeatherType = 'clear';

  // Player Vehicle
  public playerVehicle: BuiltVehicle | null = null;
  public playerPhysics: VehiclePhysics | null = null;
  private playerDef: VehicleDefinition;

  // AI Opponents
  private aiOpponents: AIOpponent[] = [];

  // Race Management
  public gameMode: GameMode = 'quick';
  public totalLaps: number = 3;
  public currentLap: number = 1;
  public currentCheckpointIdx: number = 0;
  public lapStartTime: number = 0;
  public raceStartTime: number = 0;
  public lapTimes: number[] = [];
  public bestLapTime: number = Infinity;
  public isRaceActive: boolean = false;
  public isCountdownActive: boolean = false;
  public countdownNumber: number = 3;
  public isRaceFinished: boolean = false;
  public totalDriftScore: number = 0;
  public cameraAngle: 'chase' | 'close' | 'hood' | 'bumper' = 'chase';

  // Particle systems
  private tireSmokeParticles!: THREE.Points;
  private smokePositions!: Float32Array;
  private smokeLifetimes!: Float32Array;
  private smokeIndex: number = 0;
  private maxSmokeParticles: number = 350;

  private rainParticles: THREE.Points | null = null;

  // Control inputs
  public controls: VehicleControlInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
  };

  private callbacks: GameEngineCallbacks;
  private frameId: number = 0;
  private lastTime: number = 0;
  private isDisposed: boolean = false;

  constructor(
    container: HTMLElement,
    trackDef: TrackDefinition,
    vehicleDef: VehicleDefinition,
    upgrades: VehicleUpgrades,
    customization: VehicleCustomization,
    weather: WeatherType,
    mode: GameMode,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.currentTrackDef = trackDef;
    this.playerDef = vehicleDef;
    this.weatherType = weather;
    this.gameMode = mode;
    this.callbacks = callbacks;
    this.totalLaps = trackDef.defaultLaps || 3;

    // 1. Detect software WebGL guard
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.2, 1800);

    // Studio Environment Map reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    this.dirLight.position.set(100, 150, 80);
    if (!this.isSoftwareGl) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 400;
      const d = 120;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    // 5. Apply Weather setup
    this.applyWeather(this.weatherType);

    // 6. Build Track
    this.setupTrack(trackDef);

    // 7. Build Player Vehicle
    this.setupPlayerVehicle(vehicleDef, upgrades, customization);

    // 8. Build AI Opponents
    this.setupAIOpponents();

    // 9. Particle Systems (Tire smoke and Rain)
    this.setupParticles();

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Start Sound Engine
    soundManager.startEngine(vehicleDef.soundProfile.type);

    // Start render loop
    this.lastTime = performance.now();
    this.startLoop();
  }

  private applyWeather(weather: WeatherType) {
    this.weatherType = weather;
    if (weather === 'sunset') {
      this.scene.background = new THREE.Color(0xfd7e14);
      this.scene.fog = new THREE.FogExp2(0xfd7e14, 0.0018);
      this.dirLight.color.set(0xff7733);
      this.dirLight.intensity = 2.8;
      this.hemiLight.color.set(0xffeedd);
      this.hemiLight.groundColor.set(0x7c2d12);
    } else if (weather === 'night') {
      this.scene.background = new THREE.Color(0x020617);
      this.scene.fog = new THREE.FogExp2(0x020617, 0.0025);
      this.dirLight.color.set(0x38bdf8);
      this.dirLight.intensity = 0.65;
      this.hemiLight.color.set(0x1e293b);
      this.hemiLight.groundColor.set(0x09090b);
    } else if (weather === 'rain') {
      this.scene.background = new THREE.Color(0x334155);
      this.scene.fog = new THREE.FogExp2(0x334155, 0.0035);
      this.dirLight.color.set(0x94a3b8);
      this.dirLight.intensity = 1.2;
      this.hemiLight.color.set(0x64748b);
      this.hemiLight.groundColor.set(0x1e293b);
      this.setupRainParticles();
    } else if (weather === 'fog') {
      this.scene.background = new THREE.Color(0x94a3b8);
      this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.0055);
      this.dirLight.intensity = 1.0;
    } else {
      // Clear bright day
      this.scene.background = new THREE.Color(0x38bdf8);
      this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.0012);
      this.dirLight.color.set(0xfffaed);
      this.dirLight.intensity = 2.4;
      this.hemiLight.color.set(0xffffff);
      this.hemiLight.groundColor.set(0x334155);
    }
  }

  private setupTrack(trackDef: TrackDefinition) {
    if (this.builtTrack) {
      this.scene.remove(this.builtTrack.group);
      this.builtTrack.dispose();
    }
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtTrack = buildTrack(trackDef, maxAniso);
    this.scene.add(this.builtTrack.group);
  }

  private setupPlayerVehicle(
    def: VehicleDefinition,
    upgrades: VehicleUpgrades,
    customization: VehicleCustomization
  ) {
    if (this.playerVehicle) {
      this.scene.remove(this.playerVehicle.group);
    }
    this.playerDef = def;
    this.playerVehicle = buildVehicle(def, customization);
    this.scene.add(this.playerVehicle.group);

    this.playerPhysics = new VehiclePhysics(
      this.playerVehicle,
      def,
      upgrades,
      this.builtTrack?.roadWidth || 15,
      this.currentTrackDef.baseGrip
    );

    // Place at track starting grid (Grid position 1 / pole)
    if (this.builtTrack) {
      const startPos = this.builtTrack.startPosition.clone();
      startPos.y += def.dimensions.wheelRadius * 0.5;
      this.playerPhysics.reset(startPos, this.builtTrack.startHeading);
    }
  }

  private setupAIOpponents() {
    // Clear existing AI
    this.aiOpponents.forEach((ai) => {
      this.scene.remove(ai.physics.vehicle.group);
    });
    this.aiOpponents = [];

    if (this.gameMode === 'timetrial' || this.gameMode === 'freeroam') {
      return; // Solo modes
    }

    const track = this.builtTrack;
    if (!track) return;

    const opponentProfiles = [
      { name: 'Elena "Valkyrie" Rostova', vehicleId: 'velocity_f1', color: '#f43f5e', offset: 3.5, aggression: 0.95 },
      { name: 'Kenji "DriftGod" Sato', vehicleId: 'silvia_drift', color: '#8b5cf6', offset: -3.5, aggression: 0.92 },
      { name: 'Marcus "Crusher" Cole', vehicleId: 'titan_crusher', color: '#f97316', offset: 2.0, aggression: 0.88 },
      { name: 'Viktor "Thunder" Stone', vehicleId: 'shelby_68', color: '#10b981', offset: -2.0, aggression: 0.85 },
      { name: 'Chloe "Phantom" Ray', vehicleId: 'ion_ev_sedan', color: '#06b6d4', offset: 4.0, aggression: 0.90 },
    ];

    // For "Vehicle vs Vehicle" challenge mode, pair contrasting vehicle types!
    opponentProfiles.forEach((opp, idx) => {
      const def = VEHICLE_CATALOG.find((v) => v.id === opp.vehicleId) || VEHICLE_CATALOG[0];
      const vehicle = buildVehicle(def, {
        bodyColor: opp.color,
        accentColor: '#111827',
        finish: 'gloss',
        rimColor: '#e2e8f0',
        spoilerIndex: 2,
        underglowColor: opp.color,
      });
      this.scene.add(vehicle.group);

      const participant: RaceParticipant = {
        id: `ai_${idx}`,
        name: opp.name,
        vehicleId: def.id,
        isAI: true,
        color: opp.color,
        currentLap: 1,
        currentCheckpointIdx: 0,
        lapTimes: [],
        bestLapTime: Infinity,
        totalTime: 0,
        distanceCovered: 0,
        racePosition: idx + 2,
        isFinished: false,
      };

      // Starting grid staggered placement behind pole position
      const startU = 1.0 - (idx + 1) * 0.015;
      const ai = new AIOpponent(
        participant,
        vehicle,
        def,
        track.curve,
        startU,
        opp.offset,
        opp.aggression
      );

      const gridPt = track.curve.getPointAt(startU);
      ai.physics.reset(gridPt, track.startHeading);
      this.aiOpponents.push(ai);
    });
  }

  private setupParticles() {
    // 1. Tire smoke particle pool
    const smokeGeom = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.maxSmokeParticles * 3);
    this.smokeLifetimes = new Float32Array(this.maxSmokeParticles);

    for (let i = 0; i < this.maxSmokeParticles; i++) {
      this.smokePositions[i * 3 + 1] = -100; // start hidden underground
      this.smokeLifetimes[i] = 0;
    }

    smokeGeom.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

    const smokeMat = new THREE.PointsMaterial({
      color: 0xd4d4d8,
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.tireSmokeParticles = new THREE.Points(smokeGeom, smokeMat);
    this.scene.add(this.tireSmokeParticles);
  }

  private setupRainParticles() {
    const rainCount = 1200;
    const rainGeom = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      rainPositions[i * 3 + 1] = Math.random() * 40;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.scene.add(this.rainParticles);
  }

  private emitSmoke(pos: THREE.Vector3) {
    const idx = this.smokeIndex;
    this.smokePositions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.6;
    this.smokePositions[idx * 3 + 1] = pos.y + 0.15;
    this.smokePositions[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
    this.smokeLifetimes[idx] = 1.0;
    this.smokeIndex = (this.smokeIndex + 1) % this.maxSmokeParticles;
  }

  public startRaceCountdown() {
    this.isCountdownActive = true;
    this.isRaceActive = false;
    this.countdownNumber = 3;
    soundManager.playCountdown(false);

    const interval = setInterval(() => {
      this.countdownNumber -= 1;
      if (this.countdownNumber > 0) {
        soundManager.playCountdown(false);
      } else if (this.countdownNumber === 0) {
        soundManager.playCountdown(true);
        this.isCountdownActive = false;
        this.isRaceActive = true;
        this.raceStartTime = performance.now();
        this.lapStartTime = performance.now();
        clearInterval(interval);
      }
    }, 1000);
  }

  public startFreeRoam() {
    this.isCountdownActive = false;
    this.isRaceActive = true;
    this.raceStartTime = performance.now();
    this.lapStartTime = performance.now();
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const delta = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.update(delta);
      this.render();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(delta: number) {
    if (!this.playerPhysics || !this.builtTrack) return;

    const elevationFn = this.builtTrack.getTrackElevation;

    // Check if off-road
    const distToRoadCenter = this.getDistanceToTrackSpline(this.playerPhysics.position);
    const isOffTrack = distToRoadCenter > this.builtTrack.roadWidth * 0.55;

    // 1. UPDATE PLAYER PHYSICS
    if (this.isRaceActive || this.gameMode === 'freeroam') {
      this.playerPhysics.update(delta, this.controls, elevationFn, isOffTrack);
    } else {
      // Locked on starting grid
      this.playerPhysics.update(delta, { throttle: 0, brake: 1, steer: 0, handbrake: true, nitro: false }, elevationFn, false);
    }

    // 2. AUDIO SYNTH HOOKUP
    soundManager.updateEngine(this.playerPhysics.currentRpm, this.controls.throttle);
    soundManager.updateTireScreech(this.playerPhysics.isDrifting ? 0.85 : isOffTrack ? 0.2 : 0);
    soundManager.playNitro(this.playerPhysics.isNitroActive);

    // 3. DRIFT SMOKE EMISSION
    if (this.playerPhysics.isDrifting) {
      this.emitSmoke(this.playerPhysics.vehicle.rearLeftWheel.getWorldPosition(new THREE.Vector3()));
      this.emitSmoke(this.playerPhysics.vehicle.rearRightWheel.getWorldPosition(new THREE.Vector3()));
      this.callbacks.onDriftPointsUpdated(this.playerPhysics.driftPointsCurrent, true);
    } else {
      this.callbacks.onDriftPointsUpdated(this.playerPhysics.driftPointsCurrent, false);
    }

    // Update smoke particles
    const posAttr = this.tireSmokeParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.maxSmokeParticles; i++) {
      if (this.smokeLifetimes[i] > 0) {
        this.smokeLifetimes[i] -= delta * 1.5;
        this.smokePositions[i * 3 + 1] += delta * 1.2; // rise up
        if (this.smokeLifetimes[i] <= 0) {
          this.smokePositions[i * 3 + 1] = -100;
        }
      }
    }
    posAttr.needsUpdate = true;

    // Rain particles animation
    if (this.rainParticles && this.weatherType === 'rain') {
      const rainPos = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = rainPos.array as Float32Array;
      const playerPos = this.playerPhysics.position;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= delta * 35; // fall
        if (arr[i + 1] < 0) {
          arr[i] = playerPos.x + (Math.random() - 0.5) * 120;
          arr[i + 1] = 35 + Math.random() * 10;
          arr[i + 2] = playerPos.z + (Math.random() - 0.5) * 120;
        }
      }
      rainPos.needsUpdate = true;
    }

    // 4. UPDATE AI OPPONENTS
    if (this.isRaceActive) {
      this.aiOpponents.forEach((ai) => {
        ai.update(delta, this.playerPhysics!.position, elevationFn);

        // Check collision between player and AI
        const dist = this.playerPhysics!.position.distanceTo(ai.physics.position);
        if (dist < 3.2) {
          // Bumping impact
          const bumpDir = new THREE.Vector3().subVectors(this.playerPhysics!.position, ai.physics.position).normalize();
          this.playerPhysics!.applyCollisionImpulse(bumpDir.clone().multiplyScalar(10));
          ai.physics.applyCollisionImpulse(bumpDir.clone().multiplyScalar(-10));
          soundManager.playCollision(0.65);
        }
      });
    }

    // 5. CHECKPOINTS & LAP COMPLETION
    this.updateRaceProgress();

    // 6. UPDATE CAMERA FOLLOW
    this.updateCamera(delta);

    // 7. BROADCAST TELEMETRY TO HUD
    const now = performance.now();
    const currentLapTime = this.isRaceActive ? (now - this.lapStartTime) / 1000 : 0;
    this.callbacks.onTelemetryUpdated(
      Math.round(this.playerPhysics.speedKmh),
      this.playerPhysics.currentRpm,
      this.playerPhysics.currentGear,
      Math.round(this.playerPhysics.nitroAmount),
      this.calculatePlayerPosition(),
      this.aiOpponents.length + 1,
      this.currentLap,
      this.totalLaps,
      currentLapTime,
      false
    );
  }

  private updateRaceProgress() {
    if (!this.playerPhysics || !this.builtTrack || !this.isRaceActive || this.isRaceFinished) return;

    const checkpoints = this.builtTrack.checkpoints;
    const targetCp = checkpoints[this.currentCheckpointIdx];
    const playerPos = this.playerPhysics.position;

    const distToCp = Math.hypot(playerPos.x - targetCp.x, playerPos.z - targetCp.z);
    if (distToCp < targetCp.width * 0.8) {
      // Triggered checkpoint!
      soundManager.playCheckpoint();
      this.currentCheckpointIdx += 1;

      if (this.currentCheckpointIdx >= checkpoints.length) {
        // Lap completed!
        this.currentCheckpointIdx = 0;
        const now = performance.now();
        const lapDuration = (now - this.lapStartTime) / 1000;
        this.lapStartTime = now;
        this.lapTimes.push(lapDuration);
        if (lapDuration < this.bestLapTime) {
          this.bestLapTime = lapDuration;
        }

        this.callbacks.onLapCompleted(this.currentLap, lapDuration, this.bestLapTime);

        if (this.currentLap >= this.totalLaps && this.gameMode !== 'freeroam') {
          // Race finished!
          this.isRaceFinished = true;
          this.isRaceActive = false;
          soundManager.playVictory();

          const totalTime = (now - this.raceStartTime) / 1000;
          const finalStandings = this.computeFinalStandings(totalTime);
          this.callbacks.onRaceFinished(finalStandings, totalTime);
        } else {
          this.currentLap += 1;
        }
      }
    }
  }

  private calculatePlayerPosition(): number {
    if (this.aiOpponents.length === 0) return 1;

    let aheadCount = 0;
    const playerScore = this.currentLap * 1000 + this.currentCheckpointIdx * 50;

    this.aiOpponents.forEach((ai) => {
      const aiScore = ai.participant.currentLap * 1000 + ai.participant.currentCheckpointIdx * 50;
      if (aiScore > playerScore) {
        aheadCount += 1;
      }
    });

    return aheadCount + 1;
  }

  private computeFinalStandings(playerTotalTime: number): RaceParticipant[] {
    const list: RaceParticipant[] = [];

    // Player entry
    list.push({
      id: 'player',
      name: 'Player 1',
      vehicleId: this.playerDef.id,
      isAI: false,
      color: '#38bdf8',
      currentLap: this.totalLaps,
      currentCheckpointIdx: 0,
      lapTimes: this.lapTimes,
      bestLapTime: this.bestLapTime,
      totalTime: playerTotalTime,
      distanceCovered: 4000 * this.totalLaps,
      racePosition: 1,
      isFinished: true,
      driftScore: this.playerPhysics?.driftPointsCurrent,
    });

    // AI entries
    this.aiOpponents.forEach((ai, idx) => {
      const timeVariance = (idx + 1) * 2.8 + (Math.random() - 0.5) * 1.5;
      list.push({
        ...ai.participant,
        totalTime: playerTotalTime + timeVariance,
        isFinished: true,
      });
    });

    // Sort by totalTime ascending
    list.sort((a, b) => a.totalTime - b.totalTime);
    list.forEach((p, idx) => {
      p.racePosition = idx + 1;
    });

    return list;
  }

  private updateCamera(delta: number) {
    if (!this.playerPhysics) return;

    const pPos = this.playerPhysics.position;
    const heading = this.playerPhysics.heading;

    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const up = new THREE.Vector3(0, 1, 0);

    const speedRatio = Math.min(1.0, this.playerPhysics.speedKmh / 280);

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.cameraAngle === 'close') {
      // Close chase
      const dist = 5.5 + speedRatio * 1.2;
      const height = 1.9 + speedRatio * 0.4;
      targetCamPos = pPos.clone().addScaledVector(forward, -dist).addScaledVector(up, height);
      targetLookAt = pPos.clone().addScaledVector(up, 1.2).addScaledVector(forward, 6.0);
    } else if (this.cameraAngle === 'hood') {
      // Hood / Windshield view
      targetCamPos = pPos.clone().addScaledVector(forward, 0.4).addScaledVector(up, 1.15);
      targetLookAt = pPos.clone().addScaledVector(forward, 25).addScaledVector(up, 1.0);
    } else if (this.cameraAngle === 'bumper') {
      // Bumper view
      targetCamPos = pPos.clone().addScaledVector(forward, 1.6).addScaledVector(up, 0.45);
      targetLookAt = pPos.clone().addScaledVector(forward, 35).addScaledVector(up, 0.4);
    } else {
      // Default dynamic Chase camera
      const dist = 7.5 + speedRatio * 2.5;
      const height = 2.8 + speedRatio * 0.8;
      targetCamPos = pPos.clone().addScaledVector(forward, -dist).addScaledVector(up, height);
      targetLookAt = pPos.clone().addScaledVector(up, 1.4).addScaledVector(forward, 10.0);
    }

    // Smooth exponential damping
    const dampRate = this.cameraAngle === 'bumper' || this.cameraAngle === 'hood' ? 25 : 10;
    this.camera.position.lerp(targetCamPos, Math.min(1.0, dampRate * delta));
    this.camera.lookAt(targetLookAt);

    // Dynamic FOV with speed sensation
    const baseFov = 60;
    const targetFov = baseFov + speedRatio * 18 + (this.playerPhysics.isNitroActive ? 8 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, delta);
    this.camera.updateProjectionMatrix();

    // Directional shadow caster light follows player position
    this.dirLight.position.set(pPos.x + 80, 140, pPos.z + 60);
    this.dirLight.target.position.copy(pPos);
    this.dirLight.target.updateMatrixWorld();
  }

  private getDistanceToTrackSpline(pos: THREE.Vector3): number {
    if (!this.builtTrack) return 0;
    const curve = this.builtTrack.curve;
    // Fast distance sample to track points
    let minDist = Infinity;
    for (let i = 0; i < 40; i++) {
      const pt = curve.getPointAt(i / 40);
      const d = Math.hypot(pt.x - pos.x, pt.z - pos.z);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  public resetPlayerToTrack() {
    if (!this.playerPhysics || !this.builtTrack) return;
    const checkpoints = this.builtTrack.checkpoints;
    const cp = checkpoints[this.currentCheckpointIdx];
    const resetPos = new THREE.Vector3(cp.x, 0, cp.z);
    resetPos.y = this.builtTrack.getTrackElevation(cp.x, cp.z) + this.playerDef.dimensions.wheelRadius;
    this.playerPhysics.reset(resetPos, cp.angle);
  }

  public setCameraAngle(angle: 'chase' | 'close' | 'hood' | 'bumper') {
    this.cameraAngle = angle;
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onWindowResize);
    soundManager.stopEngine();

    if (this.builtTrack) {
      this.builtTrack.dispose();
    }
    this.tireSmokeParticles.geometry.dispose();
    (this.tireSmokeParticles.material as THREE.Material).dispose();

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
