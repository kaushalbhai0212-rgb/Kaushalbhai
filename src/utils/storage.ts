import { PlayerProfile, GameSettings, VehicleUpgrades, VehicleCustomization } from '../types/game';

const STORAGE_KEY_PROFILE = 'uwr_player_profile_v1';
const STORAGE_KEY_SETTINGS = 'uwr_game_settings_v1';

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'SpeedDemon',
  coins: 45000,
  xp: 1200,
  rank: 'Street Racer',
  ownedVehicles: ['apex_venom', 'hayate_1000rr', 'titan_crusher', 'milano_scooter', 'trailblazer_jeep'],
  selectedVehicleId: 'apex_venom',
  upgrades: {},
  customizations: {},
  careerProgress: {
    completedCupIds: [],
    starsByCupId: {},
  },
  highScores: {},
  lastDailyClaimTimestamp: 0,
  dailyStreak: 1,
  achievementsClaimed: [],
};

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  engineVolume: 0.75,
  graphicsQuality: 'high',
  cameraAngle: 'chase',
  speedUnit: 'kmh',
  steeringControl: 'buttons',
  showMinimap: true,
  haptics: true,
};

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      ownedVehicles: parsed.ownedVehicles || DEFAULT_PROFILE.ownedVehicles,
      upgrades: parsed.upgrades || {},
      customizations: parsed.customizations || {},
      careerProgress: parsed.careerProgress || DEFAULT_PROFILE.careerProgress,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export const RANKS = [
  { xp: 0, title: 'Rookie Driver' },
  { xp: 2000, title: 'Street Racer' },
  { xp: 6000, title: 'Pro Circuit Driver' },
  { xp: 14000, title: 'Apex Master' },
  { xp: 30000, title: 'Legendary Champion' },
  { xp: 60000, title: 'World Grandmaster' },
];

export function getRankFromXp(xp: number): string {
  let title = RANKS[0].title;
  for (const r of RANKS) {
    if (xp >= r.xp) {
      title = r.title;
    }
  }
  return title;
}
