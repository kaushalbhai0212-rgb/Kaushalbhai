import React, { useState } from 'react';
import {
  Play,
  Trophy,
  Wrench,
  Compass,
  Award,
  Calendar,
  Settings as SettingsIcon,
  Zap,
  Gauge,
  Shield,
  Sparkles,
  Users,
  Timer,
  Wind,
  Flame,
  ChevronRight,
  MapPin,
  Car,
} from 'lucide-react';
import { GameMode, PlayerProfile, TrackDefinition, VehicleDefinition, WeatherType } from '../types/game';
import { TRACK_CATALOG } from '../game/tracks/trackData';
import { VEHICLE_CATALOG } from '../game/vehicles/vehicleData';
import { soundManager } from '../audio/SoundManager';

interface MainMenuProps {
  profile: PlayerProfile;
  selectedVehicle: VehicleDefinition;
  selectedTrack: TrackDefinition;
  selectedWeather: WeatherType;
  onSelectTrack: (track: TrackDefinition) => void;
  onSelectWeather: (weather: WeatherType) => void;
  onStartRace: (mode: GameMode) => void;
  onOpenGarage: () => void;
  onOpenDailyRewards: () => void;
  onOpenAchievements: () => void;
  onOpenCareer: () => void;
  onOpenSettings: () => void;
}

const GAME_MODES: {
  id: GameMode;
  title: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
}[] = [
  { id: 'quick', title: 'Quick Race', tagline: 'Jump straight into intense circuit action against AI grid', icon: Play, color: 'from-cyan-500 to-blue-600', badge: 'POPULAR' },
  { id: 'career', title: 'Career Mode', tagline: 'Climb 10 championship cups from Rookie to World Champion', icon: Trophy, color: 'from-amber-500 to-yellow-600', badge: '10 CUPS' },
  { id: 'multiplayer', title: 'Multiplayer Lobby', tagline: 'Compete in high-stakes simulated live lobby with dynamic rivals', icon: Users, color: 'from-purple-500 to-indigo-600', badge: 'LIVE' },
  { id: 'timetrial', title: 'Time Trial', tagline: 'Master every apex and beat gold, silver, bronze medal ghost records', icon: Timer, color: 'from-emerald-500 to-teal-600' },
  { id: 'drift', title: 'Drift Challenge', tagline: 'Throw the rear out and rack up massive slip-angle combo multipliers', icon: Wind, color: 'from-fuchsia-500 to-pink-600' },
  { id: 'vehicle_vs_vehicle', title: 'Vehicle vs Vehicle', tagline: 'Epic cross-category showdowns: Superbike vs Supercar, F1 vs Monster!', icon: Zap, color: 'from-rose-500 to-red-600', badge: 'EPIC' },
  { id: 'offroad', title: 'Off-Road Rally', tagline: 'Conquer loose dirt, sand dunes, and muddy hill climbs', icon: Shield, color: 'from-orange-500 to-amber-600' },
  { id: 'highway', title: 'Highway Traffic Weave', tagline: 'High-speed speedway lane weaving with near-miss combos', icon: Gauge, color: 'from-blue-500 to-cyan-600' },
  { id: 'championship', title: 'Grand Prix Series', tagline: '4-race points tournament across different track biomes', icon: Trophy, color: 'from-yellow-500 to-orange-600' },
  { id: 'freeroam', title: 'Open World Free Roam', tagline: 'Unrestricted open playground with stunt jumps, speed traps, and loops', icon: Compass, color: 'from-teal-500 to-emerald-600', badge: 'OPEN WORLD' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  selectedVehicle,
  selectedTrack,
  selectedWeather,
  onSelectTrack,
  onSelectWeather,
  onStartRace,
  onOpenGarage,
  onOpenDailyRewards,
  onOpenAchievements,
  onOpenCareer,
  onOpenSettings,
}) => {
  const [activeMenuTab, setActiveMenuTab] = useState<'modes' | 'tracks'>('modes');

  const upgrades = profile.upgrades[selectedVehicle.id] || { engine: 0, turbo: 0, brakes: 0, tires: 0, nitro: 0 };
  const effectiveTopSpeed = selectedVehicle.stats.topSpeed + upgrades.engine * 15;

  return (
    <div className="relative w-full h-full select-none overflow-y-auto bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 font-['Rajdhani'] text-zinc-100 flex flex-col justify-between p-6">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER BAR */}
      <header className="relative z-10 flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-zinc-950 text-xs font-black rounded uppercase tracking-wider">
              AAA 3D Next-Gen
            </span>
            <span className="text-xs text-zinc-400 font-bold tracking-wider">V1.0 FINAL RELEASE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 uppercase mt-1">
            Ultimate World Racing
          </h1>
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
            All Vehicles Challenge &bull; 14 Categories &bull; 10 Modes &bull; Open World
          </p>
        </div>

        {/* Currency & Quick Action Icons */}
        <div className="flex items-center gap-3">
          {/* Daily Streak */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenDailyRewards();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 rounded-xl transition shadow-lg group"
          >
            <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            <div className="text-left">
              <div className="text-[9px] text-zinc-400 font-bold uppercase">Daily Claim</div>
              <div className="text-xs font-black text-amber-400">Day {profile.dailyStreak}</div>
            </div>
          </button>

          {/* Credits */}
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-yellow-500/40 rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <div className="text-left">
              <div className="text-[9px] text-zinc-400 font-bold uppercase">Credits</div>
              <div className="text-sm font-black text-yellow-400">${profile.coins.toLocaleString()}</div>
            </div>
          </div>

          {/* Achievements */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenAchievements();
            }}
            title="Achievements"
            className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition"
          >
            <Award className="w-5 h-5 text-purple-400" />
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            title="Settings"
            className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition"
          >
            <SettingsIcon className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
        </div>
      </header>

      {/* 2. MAIN CENTER HERO CONTENT */}
      <div className="relative z-10 my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Active Vehicle Card & Fast Garage Link */}
        <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-zinc-950/80 border border-zinc-800/90 rounded-3xl backdrop-blur-md shadow-2xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">Selected Vehicle</span>
              <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded text-[11px] font-bold uppercase">
                {selectedVehicle.categoryLabel}
              </span>
            </div>
            <h2 className="text-2xl font-black italic text-white uppercase mt-1 truncate">{selectedVehicle.name}</h2>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{selectedVehicle.description}</p>

            {/* Vehicle Stats Bars */}
            <div className="mt-5 flex flex-col gap-2.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Top Speed</span>
                  <span className="text-cyan-400 font-mono">{effectiveTopSpeed} km/h</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (effectiveTopSpeed / 400) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Acceleration</span>
                  <span className="text-green-400 font-mono">{selectedVehicle.stats.acceleration}/100</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                    style={{ width: `${selectedVehicle.stats.acceleration}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Handling Agility</span>
                  <span className="text-purple-400 font-mono">{selectedVehicle.stats.handling}/100</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    style={{ width: `${selectedVehicle.stats.handling}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Drift Factor</span>
                  <span className="text-fuchsia-400 font-mono">{selectedVehicle.stats.driftFactor}/100</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full"
                    style={{ width: `${selectedVehicle.stats.driftFactor}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Garage Link */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenGarage();
              }}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-lg"
            >
              <Wrench className="w-4 h-4" />
              Customize & Tune in Garage
            </button>
            <div className="text-[11px] text-center text-zinc-500">
              {profile.ownedVehicles.length} of {VEHICLE_CATALOG.length} Vehicles Owned
            </div>
          </div>
        </div>

        {/* Right Column: Game Modes & Tracks Selector */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-950/80 border border-zinc-800/90 rounded-3xl p-5 backdrop-blur-md shadow-2xl">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveMenuTab('modes');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition ${
                  activeMenuTab === 'modes'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                1. Select Game Mode ({GAME_MODES.length})
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveMenuTab('tracks');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition ${
                  activeMenuTab === 'tracks'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                2. Select Track & Weather ({TRACK_CATALOG.length})
              </button>
            </div>

            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Track: <strong className="text-white">{selectedTrack.name}</strong></span>
            </div>
          </div>

          {/* TAB 1: GAME MODES GRID */}
          {activeMenuTab === 'modes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 overflow-y-auto max-h-[360px] pr-1">
              {GAME_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      soundManager.playClick();
                      if (mode.id === 'career') {
                        onOpenCareer();
                      } else {
                        onStartRace(mode.id);
                      }
                    }}
                    className="p-3.5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl text-left transition flex items-center justify-between group shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${mode.color} text-zinc-950 font-black shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white uppercase group-hover:text-cyan-300 transition">
                            {mode.title}
                          </span>
                          {mode.badge && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold rounded">
                              {mode.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{mode.tagline}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: TRACK & WEATHER SELECTOR */}
          {activeMenuTab === 'tracks' && (
            <div className="flex flex-col gap-4 mt-4 overflow-y-auto max-h-[360px] pr-1">
              {/* Weather selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-zinc-400">Weather Condition:</span>
                {(['clear', 'sunset', 'night', 'rain', 'fog'] as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectWeather(w);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      selectedWeather === w
                        ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Tracks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TRACK_CATALOG.map((trk) => {
                  const isSelected = selectedTrack.id === trk.id;
                  return (
                    <button
                      key={trk.id}
                      onClick={() => {
                        soundManager.playClick();
                        onSelectTrack(trk);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                          <span>{trk.category.toUpperCase()} &bull; {trk.lengthKm} KM</span>
                          <span className={`font-black ${
                            trk.difficulty === 'Easy' ? 'text-green-400' : trk.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {trk.difficulty}
                          </span>
                        </div>
                        <div className="text-base font-black text-white mt-1">{trk.name}</div>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{trk.tagline}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Laps: {trk.defaultLaps}</span>
                        <span className="text-cyan-400 font-bold">Surface: {trk.surfaceType.toUpperCase()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM FOOTER CONTROLS HELPER BAR */}
      <footer className="relative z-10 flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span><strong className="text-zinc-200">WASD / Arrows</strong> Steer & Throttle</span>
          <span><strong className="text-zinc-200">SPACE</strong> Handbrake Drift</span>
          <span><strong className="text-zinc-200">SHIFT / N</strong> Nitro Boost</span>
          <span><strong className="text-zinc-200">C</strong> Camera Switch</span>
          <span><strong className="text-zinc-200">R</strong> Reset Car</span>
        </div>
        <div className="text-zinc-500 font-mono text-[11px]">
          TOUCH SCREEN / GAMEPAD COMPATIBLE
        </div>
      </footer>
    </div>
  );
};
