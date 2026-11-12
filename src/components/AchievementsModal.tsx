import React from 'react';
import { Award, Check, Sparkles, X } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import confetti from 'canvas-confetti';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
}

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  conditionMet: (p: PlayerProfile) => boolean;
}

const ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first_win',
    title: 'First Taste of Glory',
    description: 'Complete your first race and record a finish time.',
    rewardCoins: 8000,
    conditionMet: (p) => Object.keys(p.highScores).length > 0,
  },
  {
    id: 'drift_initiate',
    title: 'Tire Shredder',
    description: 'Achieve a drift score of at least 1,000 points.',
    rewardCoins: 12000,
    conditionMet: (p) => Object.values(p.highScores).some((s) => s.driftScore >= 1000),
  },
  {
    id: 'drift_master',
    title: 'Tokyo Drift Legend',
    description: 'Accumulate over 5,000 drift points in a technical race.',
    rewardCoins: 25000,
    conditionMet: (p) => Object.values(p.highScores).some((s) => s.driftScore >= 5000),
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon 300',
    description: 'Break the 300 km/h top speed threshold.',
    rewardCoins: 15000,
    conditionMet: (p) => Object.values(p.highScores).some((s) => s.maxSpeed >= 300),
  },
  {
    id: 'collector_5',
    title: 'Fleet Commander',
    description: 'Own at least 5 different racing vehicles in your garage.',
    rewardCoins: 20000,
    conditionMet: (p) => p.ownedVehicles.length >= 5,
  },
  {
    id: 'collector_10',
    title: 'Master Collector',
    description: 'Unlock 10 or more vehicle categories.',
    rewardCoins: 50000,
    conditionMet: (p) => p.ownedVehicles.length >= 10,
  },
  {
    id: 'career_start',
    title: 'Championship Challenger',
    description: 'Earn your first career championship cup.',
    rewardCoins: 30000,
    conditionMet: (p) => p.careerProgress.completedCupIds.length > 0,
  },
  {
    id: 'daily_loyalty',
    title: 'Dedicated Racer',
    description: 'Reach a 3-day daily reward streak.',
    rewardCoins: 18000,
    conditionMet: (p) => p.dailyStreak >= 3,
  },
];

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  if (!isOpen) return null;

  const handleClaim = (ach: AchievementItem) => {
    soundManager.playCoin();
    confetti({ particleCount: 50, spread: 60 });
    onUpdateProfile({
      ...profile,
      coins: profile.coins + ach.rewardCoins,
      achievementsClaimed: [...profile.achievementsClaimed, ach.id],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md select-none font-['Rajdhani'] text-zinc-100">
      <div className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">Racer Achievements</h2>
              <p className="text-xs text-zinc-400">Complete challenges to earn massive credit payouts and prestige.</p>
            </div>
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

        {/* List */}
        <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
          {ACHIEVEMENTS.map((ach) => {
            const isClaimed = profile.achievementsClaimed.includes(ach.id);
            const isCompleted = ach.conditionMet(profile);

            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                  isClaimed
                    ? 'bg-zinc-950/40 border-zinc-800/80 opacity-60'
                    : isCompleted
                    ? 'bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-500/10'
                    : 'bg-zinc-950/70 border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isCompleted ? 'bg-purple-900/40 border-purple-400 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                  }`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-black text-white uppercase">{ach.title}</div>
                    <div className="text-xs text-zinc-400">{ach.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-yellow-400 font-mono">+${ach.rewardCoins.toLocaleString()}</span>
                  {isClaimed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
                      <Check className="w-3.5 h-3.5" /> Claimed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaim(ach)}
                      disabled={!isCompleted}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        isCompleted
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg cursor-pointer active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? 'Claim Reward' : 'Incomplete'}
                    </button>
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
