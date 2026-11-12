export type VehicleCategory =
  | 'supercar'
  | 'sportscar'
  | 'normal'
  | 'superbike'
  | 'scooter'
  | 'monstertruck'
  | 'heavytruck'
  | 'bus'
  | 'formula'
  | 'offroad'
  | 'rally'
  | 'drift'
  | 'electric'
  | 'vintage'
  | 'special';

export type GameMode =
  | 'career'
  | 'quick'
  | 'multiplayer'
  | 'timetrial'
  | 'drift'
  | 'offroad'
  | 'highway'
  | 'championship'
  | 'freeroam'
  | 'vehicle_vs_vehicle';

export type WeatherType = 'clear' | 'sunset' | 'night' | 'rain' | 'fog';

export interface VehicleStats {
  topSpeed: number; // in km/h (e.g., 180 - 380)
  acceleration: number; // 0-100 score (e.g. 40 - 98)
  handling: number; // 0-100 score
  braking: number; // 0-100 score
  driftFactor: number; // 0-100 score
  weightKg: number; // e.g. 900 - 8000
}

export interface VehicleUpgrades {
  engine: number; // 0 to 5
  turbo: number; // 0 to 5
  brakes: number; // 0 to 5
  tires: number; // 0 to 5
  nitro: number; // 0 to 5
}

export interface VehicleCustomization {
  bodyColor: string;
  accentColor: string;
  finish: 'gloss' | 'matte' | 'metallic' | 'chrome';
  rimColor: string;
  spoilerIndex: number; // 0 = stock, 1 = sport, 2 = gt carbon, 3 = high downforce
  underglowColor: string | null; // null or hex
}

export interface VehicleDefinition {
  id: string;
  name: string;
  category: VehicleCategory;
  categoryLabel: string;
  description: string;
  price: number;
  stats: VehicleStats;
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelRadius: number;
    wheelWidth: number;
    wheelbase: number;
  };
  soundProfile: {
    type: 'v8' | 'v10' | 'bike' | 'scooter' | 'diesel' | 'electric' | 'rotary' | 'turbo4';
    basePitch: number;
    idlePitch: number;
    maxPitch: number;
  };
  defaultCustomization: VehicleCustomization;
  isUnlockedDefault?: boolean;
}

export interface TrackCheckpoint {
  x: number;
  z: number;
  width: number;
  angle: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  tagline: string;
  category: 'city' | 'mountain' | 'desert' | 'snow' | 'forest' | 'circuit' | 'coastal' | 'airport';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  lengthKm: number;
  defaultLaps: number;
  weatherOptions: WeatherType[];
  surfaceType: 'asphalt' | 'dirt' | 'snow' | 'runway';
  baseGrip: number; // 1.0 = asphalt, 0.7 = dirt, 0.5 = snow
  points: { x: number; z: number; y?: number }[];
  sceneryType: 'city' | 'mountain' | 'desert' | 'snow' | 'forest' | 'stadium' | 'coastal' | 'airport';
  description: string;
}

export interface PlayerProfile {
  name: string;
  coins: number;
  xp: number;
  rank: string;
  ownedVehicles: string[]; // vehicle IDs
  selectedVehicleId: string;
  upgrades: Record<string, VehicleUpgrades>;
  customizations: Record<string, VehicleCustomization>;
  careerProgress: {
    completedCupIds: string[];
    starsByCupId: Record<string, number>;
  };
  highScores: Record<string, { bestLapTime: number; driftScore: number; maxSpeed: number }>;
  lastDailyClaimTimestamp: number;
  dailyStreak: number;
  achievementsClaimed: string[];
}

export interface RaceParticipant {
  id: string;
  name: string;
  vehicleId: string;
  isAI: boolean;
  color: string;
  currentLap: number;
  currentCheckpointIdx: number;
  lapTimes: number[];
  bestLapTime: number;
  totalTime: number;
  distanceCovered: number;
  racePosition: number;
  isFinished: boolean;
  driftScore?: number;
}

export interface GameSettings {
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  engineVolume: number; // 0 to 1
  graphicsQuality: 'high' | 'medium' | 'low';
  cameraAngle: 'chase' | 'close' | 'hood' | 'bumper';
  speedUnit: 'kmh' | 'mph';
  steeringControl: 'buttons' | 'wheel';
  showMinimap: boolean;
  haptics: boolean;
}
