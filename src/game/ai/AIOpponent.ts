import * as THREE from 'three';
import { VehiclePhysics, VehicleControlInput } from '../physics/VehiclePhysics';
import { BuiltVehicle } from '../vehicles/VehicleBuilder';
import { VehicleDefinition, RaceParticipant } from '../../types/game';

export class AIOpponent {
  public participant: RaceParticipant;
  public physics: VehiclePhysics;
  public curve: THREE.CatmullRomCurve3;

  private targetU: number = 0; // Curve parameter t (0 to 1)
  private lateralOffset: number = 0; // Racing line variation (-3 to +3 meters)
  private aggression: number = 0.85; // Skill factor (0.7 to 1.0)
  private lookAheadDist: number = 0.04; // Look ahead along curve

  constructor(
    participant: RaceParticipant,
    vehicle: BuiltVehicle,
    def: VehicleDefinition,
    curve: THREE.CatmullRomCurve3,
    startU: number = 0,
    lateralOffset: number = 0,
    aggression: number = 0.85
  ) {
    this.participant = participant;
    this.physics = new VehiclePhysics(vehicle, def, undefined, 15, 1.0);
    this.curve = curve;
    this.targetU = startU;
    this.lateralOffset = lateralOffset;
    this.aggression = aggression;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    getElevation?: (x: number, z: number) => number
  ) {
    // 1. Find current position along curve
    // Estimate U by advancing based on speed
    const currentSpeedMs = this.physics.velocity.length();
    const approxTrackLength = 4000;
    const progressDelta = (currentSpeedMs * delta) / approxTrackLength;
    this.targetU = (this.targetU + progressDelta) % 1.0;

    // 2. Sample lookahead target on curve
    const lookAheadU = (this.targetU + this.lookAheadDist) % 1.0;
    const targetPt = this.curve.getPointAt(lookAheadU);
    const tangent = this.curve.getTangentAt(lookAheadU).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    // Apply lateral offset
    targetPt.addScaledVector(normal, this.lateralOffset);

    // 3. Simple player avoidance (don't rear-end or sideswipe player)
    const distToPlayer = this.physics.position.distanceTo(playerPos);
    if (distToPlayer < 12) {
      const awayFromPlayer = new THREE.Vector3().subVectors(this.physics.position, playerPos).normalize();
      targetPt.addScaledVector(awayFromPlayer, 3.0);
    }

    // 4. Steer toward target point
    const toTarget = new THREE.Vector3().subVectors(targetPt, this.physics.position);
    const forward = new THREE.Vector3(Math.sin(this.physics.heading), 0, Math.cos(this.physics.heading));
    const right = new THREE.Vector3(Math.cos(this.physics.heading), 0, -Math.sin(this.physics.heading));

    const forwardDot = toTarget.clone().normalize().dot(forward);
    const rightDot = toTarget.clone().normalize().dot(right);

    // Desired steer angle
    let steer = THREE.MathUtils.clamp(rightDot * 2.2, -1.0, 1.0);

    // 5. Throttle and Braking calculation
    // Slow down if target heading requires sharp steer
    let throttle = 0.95 * this.aggression;
    let brake = 0;

    if (forwardDot < 0.85 && this.physics.speedKmh > 110) {
      // Need to brake for corner
      throttle = 0.1;
      brake = 0.7;
    } else if (forwardDot < 0.65 && this.physics.speedKmh > 75) {
      throttle = 0;
      brake = 0.9;
    }

    // Occasional nitro on long straights
    const useNitro = forwardDot > 0.98 && this.physics.speedKmh > 140 && Math.random() < 0.05;

    const input: VehicleControlInput = {
      throttle,
      brake,
      steer,
      handbrake: false,
      nitro: useNitro,
    };

    // Update physics
    this.physics.update(delta, input, getElevation, false);

    // Update participant stats
    this.participant.distanceCovered += currentSpeedMs * delta;
  }
}
