import * as THREE from 'three';
import { BuiltVehicle } from '../vehicles/VehicleBuilder';
import { VehicleDefinition, VehicleUpgrades } from '../../types/game';

export interface VehicleControlInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  nitro: boolean;
}

export class VehiclePhysics {
  public vehicle: BuiltVehicle;
  public def: VehicleDefinition;
  public upgrades: VehicleUpgrades;

  // Spatial state
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public heading: number = 0; // Yaw angle in radians

  // Dynamic simulation values
  public speedKmh: number = 0;
  public maxSpeedKmh: number = 300;
  public accelerationRate: number = 25; // m/s^2
  public brakeForce: number = 35;
  public currentRpm: number = 0.2; // 0 to 1
  public currentGear: number = 1;
  public totalGears: number = 7;

  // Steering & Drift
  public currentSteerAngle: number = 0;
  public driftSlipAngle: number = 0;
  public isDrifting: boolean = false;
  public driftPointsCurrent: number = 0;

  // Nitro Boost
  public nitroAmount: number = 100; // 0 to 100
  public isNitroActive: boolean = false;

  // Suspension roll and pitch
  public pitchAngle: number = 0; // diving/squatting
  public rollAngle: number = 0; // leaning in corners

  // Track collision boundaries
  private roadWidth: number = 15;
  private surfaceGrip: number = 1.0;

  constructor(
    vehicle: BuiltVehicle,
    def: VehicleDefinition,
    upgrades?: VehicleUpgrades,
    roadWidth: number = 15,
    surfaceGrip: number = 1.0
  ) {
    this.vehicle = vehicle;
    this.def = def;
    this.upgrades = upgrades || { engine: 0, turbo: 0, brakes: 0, tires: 0, nitro: 0 };
    this.roadWidth = roadWidth;
    this.surfaceGrip = surfaceGrip;

    this.recomputeStats();
  }

  public recomputeStats() {
    // Apply upgrades to base vehicle stats
    const engineBoost = this.upgrades.engine * 15; // +75 km/h at max
    const turboBoost = this.upgrades.turbo * 4; // acceleration
    const brakeBoost = this.upgrades.brakes * 4;
    const tireBoost = this.upgrades.tires * 0.05;

    this.maxSpeedKmh = this.def.stats.topSpeed + engineBoost;
    this.accelerationRate = (this.def.stats.acceleration + turboBoost) * 0.42;
    this.brakeForce = (this.def.stats.braking + brakeBoost) * 0.55;
    this.surfaceGrip = 1.0 + tireBoost;
  }

  public reset(position: THREE.Vector3, heading: number) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.speedKmh = 0;
    this.currentSteerAngle = 0;
    this.driftSlipAngle = 0;
    this.isDrifting = false;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.currentRpm = 0.2;
    this.currentGear = 1;
    this.vehicle.group.position.copy(position);
    this.vehicle.group.rotation.set(0, heading, 0);
  }

  public update(
    delta: number,
    input: VehicleControlInput,
    getElevation?: (x: number, z: number) => number,
    isOffTrack: boolean = false
  ) {
    const dt = Math.min(delta, 0.1);

    // 1. NITRO LOGIC
    let nitroMultiplier = 1.0;
    if (input.nitro && this.nitroAmount > 5) {
      this.isNitroActive = true;
      this.nitroAmount = Math.max(0, this.nitroAmount - 35 * dt);
      nitroMultiplier = 1.45;
      // Scale visual nitro flame cones
      this.vehicle.nitroFlames.forEach((flame) => {
        flame.scale.set(1.0, 1.0 + Math.random() * 0.3, 1.0);
      });
    } else {
      this.isNitroActive = false;
      this.nitroAmount = Math.min(100, this.nitroAmount + 8 * dt);
      this.vehicle.nitroFlames.forEach((flame) => {
        flame.scale.set(0.001, 0.001, 0.001);
      });
    }

    // 2. SPEED DEPENDENT STEERING SENSITIVITY
    // At high speeds, steer limit drops to maintain realism and control
    const currentSpeedMs = this.velocity.length();
    this.speedKmh = currentSpeedMs * 3.6;

    const speedFactor = Math.min(1.0, this.speedKmh / 220);
    const maxSteerAngle = THREE.MathUtils.lerp(0.55, 0.18, speedFactor);
    const targetSteer = input.steer * maxSteerAngle;
    this.currentSteerAngle = THREE.MathUtils.damp(this.currentSteerAngle, targetSteer, 14, dt);

    // 3. ACCELERATION / BRAKING / REVERSE
    const forwardDir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const rightDir = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

    const forwardSpeed = this.velocity.dot(forwardDir);
    const lateralSpeed = this.velocity.dot(rightDir);

    let driveForce = 0;
    if (input.throttle > 0) {
      const topSpeedMs = (this.maxSpeedKmh * (isOffTrack ? 0.55 : 1.0) * nitroMultiplier) / 3.6;
      const speedRatio = Math.min(1.0, Math.max(0, forwardSpeed / topSpeedMs));
      driveForce = (1.0 - speedRatio * 0.75) * this.accelerationRate * input.throttle * nitroMultiplier;
    } else if (input.brake > 0) {
      if (forwardSpeed > 1.0) {
        // Active braking
        driveForce = -this.brakeForce * input.brake;
      } else {
        // Reverse
        driveForce = -this.accelerationRate * 0.45 * input.brake;
      }
    }

    // Handbrake & Drift Physics
    const handbrakeActive = input.handbrake;
    const driftFactor = (this.def.stats.driftFactor || 70) / 100;

    let lateralFriction = (handbrakeActive ? 3.5 : 12.0) * this.surfaceGrip;
    if (isOffTrack) lateralFriction *= 0.65;

    // Detect Drift State
    const slipRatio = Math.abs(lateralSpeed) / (Math.abs(forwardSpeed) + 1.0);
    if ((handbrakeActive || (Math.abs(input.steer) > 0.6 && this.speedKmh > 65)) && slipRatio > 0.25) {
      this.isDrifting = true;
      this.driftSlipAngle = lateralSpeed;
      this.driftPointsCurrent += Math.floor(this.speedKmh * Math.abs(slipRatio) * 1.5 * dt);
    } else {
      this.isDrifting = false;
      this.driftSlipAngle = THREE.MathUtils.damp(this.driftSlipAngle, 0, 6, dt);
    }

    // Apply forces
    const rollingResistance = forwardSpeed * (isOffTrack ? 4.5 : 0.85);
    const forwardAccel = driveForce - rollingResistance;
    const lateralAccel = -lateralSpeed * lateralFriction;

    const accelVec = forwardDir.clone().multiplyScalar(forwardAccel).add(rightDir.clone().multiplyScalar(lateralAccel));
    this.velocity.addScaledVector(accelVec, dt);

    // 4. HEADING / YAW ROTATION
    const effectiveSpeed = this.velocity.dot(forwardDir);
    const turnRate = (effectiveSpeed / (this.def.dimensions.wheelbase || 2.7)) * Math.tan(this.currentSteerAngle);
    this.heading += turnRate * dt;

    // 5. UPDATE WORLD POSITION
    this.position.addScaledVector(this.velocity, dt);

    // 6. GROUND ELEVATION & SUSPENSION
    let groundY = 0;
    if (getElevation) {
      groundY = getElevation(this.position.x, this.position.z);
    }
    this.position.y = THREE.MathUtils.damp(this.position.y, groundY, 15, dt);

    // Suspension Pitch (dive on brake, squat on acceleration)
    const targetPitch = THREE.MathUtils.clamp(-driveForce * 0.0025, -0.08, 0.08);
    this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 10, dt);

    // Suspension Roll (lean away from lateral acceleration)
    const targetRoll = THREE.MathUtils.clamp(-turnRate * effectiveSpeed * 0.015, -0.12, 0.12);
    this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 10, dt);

    // 7. SYNC 3D MESH TRANSFORMS
    this.vehicle.group.position.copy(this.position);
    this.vehicle.group.rotation.set(this.pitchAngle, this.heading, this.rollAngle, 'YXZ');

    // 8. WHEEL ROTATION & STEER VISUALS
    const wheelSpinRate = (effectiveSpeed / this.def.dimensions.wheelRadius) * dt;
    this.vehicle.frontLeftWheel.rotation.x += wheelSpinRate;
    this.vehicle.frontRightWheel.rotation.x += wheelSpinRate;
    this.vehicle.rearLeftWheel.rotation.x += wheelSpinRate;
    this.vehicle.rearRightWheel.rotation.x += wheelSpinRate;

    this.vehicle.extraWheels?.forEach((w) => {
      w.rotation.x += wheelSpinRate;
    });

    // Steer front wheels
    this.vehicle.frontLeftWheel.rotation.y = this.currentSteerAngle;
    this.vehicle.frontRightWheel.rotation.y = this.currentSteerAngle;

    // 9. GEAR AND RPM CALCULATION
    const speedRatioOverall = Math.max(0, Math.min(1.0, Math.abs(this.speedKmh) / this.maxSpeedKmh));
    const gearFraction = speedRatioOverall * this.totalGears;
    this.currentGear = Math.max(1, Math.min(this.totalGears, Math.floor(gearFraction) + 1));
    const gearRpm = (gearFraction % 1);
    this.currentRpm = THREE.MathUtils.clamp(0.2 + gearRpm * 0.8, 0.15, 1.0);

    // 10. BRAKE LIGHT GLOW
    const isBraking = input.brake > 0.1 && forwardSpeed > 0;
    this.vehicle.taillights.forEach((tl) => {
      (tl.material as THREE.MeshBasicMaterial).color.set(isBraking ? 0xff0000 : 0xaa1111);
      tl.scale.set(1.0, isBraking ? 1.4 : 1.0, 1.0);
    });
  }

  public applyCollisionImpulse(impulse: THREE.Vector3) {
    this.velocity.add(impulse);
    // Dampen forward momentum on severe collision
    this.velocity.multiplyScalar(0.7);
  }
}
