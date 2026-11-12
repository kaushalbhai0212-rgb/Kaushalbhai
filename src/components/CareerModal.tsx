import React from 'react';
import { Trophy, Star, Lock, Play, X, ChevronRight } from 'lucide-react';
import { PlayerProfile, TrackDefinition } from '../types/game';
import { TRACK_CATALOG } from '../game/tracks/trackData';
import { soundManager } from '../audio/SoundManager';

interface CareerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onStartCareerRace: (cupId: string, track: TrackDefinition, laps: number) => void;
}

export interface CareerCup {
  id: string;
  name: string;
  tagline: string;
  trackId: string;
  laps: number;
  rewardCoins: number;
  minStarsRequired: number;
  recommendedClass: string;
}

export const CAREER_CUPS: CareerCup[] = [
  { id: 'cup_1', name: 'Rookie Debut Cup', tagline: 'Begin your racing career on the wide boulevards of Neo City', trackId: 'track_city_metropolis', laps: 2, rewardCoins: 25000, minStarsRequired: 0, recommendedClass: 'Any Vehicle' },
  { id: 'cup_2', name: 'Alpine Hillclimb Series', tagline: 'Technical hairpin bends through steep mountain switchbacks', trackId: 'track_mountain_ridge', laps: 2, rewardCoins: 35000, minStarsRequired: 2, recommendedClass: 'Sports & Rally' },
  { id: 'cup_3', name: 'Sahara Sandstorm Trophy', tagline: 'High-speed off-road power race across rolling desert dunes', trackId: 'track_desert_dunes', laps: 3, rewardCoins: 45000, minStarsRequired: 5, recommendedClass: 'Off-Road & Monster' },
  { id: 'cup_4', name: 'Frostbite Drift Masters', tagline: 'Extreme low-friction ice curves demanding delicate throttle control', trackId: 'track_snow_peaks', laps: 3, rewardCoins: 55000, minStarsRequired: 8, recommendedClass: 'Drift & Rally' },
  { id: 'cup_5', name: 'Redwood Valley Sprint', tagline: 'Fast sweeping curves framed by towering ancient evergreens', trackId: 'track_forest_run', laps: 3, rewardCoins: 65000, minStarsRequired: 12, recommendedClass: 'Supercars & Bikes' },
  { id: 'cup_6', name: 'Apex International GP', tagline: 'FIA-spec asphalt circuit with tight chicanes and DRS zones', trackId: 'track_circuit_gp', laps: 3, rewardCoins: 80000, minStarsRequired: 15, recommendedClass: 'Formula 1 & Supercars' },
  { id: 'cup_7', name: 'Riviera Sunset Boulevard', tagline: 'Scenic coastal highway sprint against top international rivals', trackId: 'track_coastal_highway', laps: 3, rewardCoins: 95000, minStarsRequired: 18, recommendedClass: 'Supercars & EV' },
  { id: 'cup_8', name: 'Falcon Runway Drag & Turn', tagline: 'Top-speed battle across dual airport jet runways', trackId: 'track_airport_runway', laps: 3, rewardCoins: 110000, minStarsRequired: 21, recommendedClass: 'Unrestricted' },
  { id: 'cup_9', name: 'Heavy Titanium Clash', tagline: 'High-torque heavyweight showdown on tough terrain', trackId: 'track_desert_dunes', laps: 3, rewardCoins: 135000, minStarsRequired: 24, recommendedClass: 'Monster & Heavy' },
  { id: 'cup_10', name: 'World Championship Grand Final', tagline: 'The pinnacle of motorsport: 5 grueling laps for the crown', trackId: 'track_circuit_gp', laps: 5, rewardCoins: 250000, minStarsRequired: 27, recommendedClass: 'Top Tier Hypercars' },
];

export const CareerModal: React.FC<CareerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onStartCareerRace,
}) => {
  if (!isOpen) return null;

  // Total stars earned
  const totalStars = Object.values(profile.careerProgress.starsByCupId || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md select-none font-['Rajdhani'] text-zinc-100">
      <div className="relative w-full max-w-3xl bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-wider text-white">Career Championship</h2>
              <p className="text-xs text-zinc-400">Complete 10 championship cups and conquer the global racing circuit.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-950/40 border border-yellow-500/40 rounded-xl">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-black text-yellow-400 font-mono">{totalStars} / 30 Stars</span>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 hover:bg-zinc-800 rounded-xl transition text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cups List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {CAREER_CUPS.map((cup, idx) => {
            const isUnlocked = totalStars >= cup.minStarsRequired;
            const starsEarned = profile.careerProgress.starsByCupId[cup.id] || 0;
            const track = TRACK_CATALOG.find((t) => t.id === cup.trackId) || TRACK_CATALOG[0];

            return (
              <div
                key={cup.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                  isUnlocked
                    ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-950/40 border-zinc-900 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    isUnlocked ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-zinc-950' : 'bg-zinc-800 text-zinc-600'
                  }`}>
                    {isUnlocked ? idx + 1 : <Lock className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white uppercase">{cup.name}</span>
                      <span className="text-[11px] text-zinc-400 font-bold uppercase">({cup.recommendedClass})</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{cup.tagline}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 font-bold uppercase">
                      <span>Track: <strong className="text-zinc-300">{track.name}</strong></span>
                      <span>Laps: <strong className="text-zinc-300">{cup.laps}</strong></span>
                      <span className="text-yellow-400 font-mono">Prize: +${cup.rewardCoins.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Stars & Play Button */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          s <= starsEarned
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onStartCareerRace(cup.id, track, cup.laps);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Race
                    </button>
                  ) : (
                    <div className="text-xs text-zinc-600 font-bold uppercase flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Requires {cup.minStarsRequired} Stars
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
