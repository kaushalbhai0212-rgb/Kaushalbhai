import React from 'react';
import { Sparkles, Check, Gift, X } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import confetti from 'canvas-confetti';

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
}

const REWARDS = [
  { day: 1, coins: 5000, label: 'Day 1 Bonus' },
  { day: 2, coins: 8000, label: 'Day 2 Tuning Cash' },
  { day: 3, coins: 12000, label: 'Day 3 Speed Pack' },
  { day: 4, coins: 18000, label: 'Day 4 Pro Credits' },
  { day: 5, coins: 25000, label: 'Day 5 Hyper Fund' },
  { day: 6, coins: 35000, label: 'Day 6 Apex Stash' },
  { day: 7, coins: 60000, label: 'Day 7 Jackpot Trophy' },
];

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  if (!isOpen) return null;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const canClaim = now - profile.lastDailyClaimTimestamp > dayMs || profile.lastDailyClaimTimestamp === 0;

  const handleClaim = () => {
    if (!canClaim) return;
    const dayReward = REWARDS[(profile.dailyStreak - 1) % 7];
    soundManager.playCoin();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    const newStreak = profile.dailyStreak >= 7 ? 1 : profile.dailyStreak + 1;
    onUpdateProfile({
      ...profile,
      coins: profile.coins + dayReward.coins,
      lastDailyClaimTimestamp: now,
      dailyStreak: newStreak,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md select-none font-['Rajdhani'] text-zinc-100">
      <div className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">Daily Login Rewards</h2>
              <p className="text-xs text-zinc-400">Log in every day to claim bonus credits and unlock hypercars faster!</p>
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

        {/* 7-Day Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {REWARDS.map((r) => {
            const isCompleted = r.day < profile.dailyStreak;
            const isCurrent = r.day === profile.dailyStreak;

            return (
              <div
                key={r.day}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition ${
                  isCurrent
                    ? 'bg-gradient-to-b from-amber-500/20 to-yellow-600/10 border-yellow-400 shadow-lg shadow-yellow-500/20'
                    : isCompleted
                    ? 'bg-zinc-950/40 border-zinc-800 opacity-60'
                    : 'bg-zinc-950/70 border-zinc-800/80'
                }`}
              >
                <div className="text-[11px] font-bold text-zinc-400 uppercase">DAY {r.day}</div>
                <div className="my-2 p-2 rounded-full bg-zinc-900 border border-zinc-800">
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Sparkles className={`w-5 h-5 ${isCurrent ? 'text-yellow-400 animate-pulse' : 'text-zinc-500'}`} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black text-white font-mono">+${r.coins.toLocaleString()}</div>
                  <div className="text-[9px] text-zinc-400 uppercase mt-0.5">{r.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Claim Button */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-400">
            Current Login Streak: <strong className="text-yellow-400 font-mono">{profile.dailyStreak} Days</strong>
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition ${
              canClaim
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-yellow-500/20 cursor-pointer active:scale-95'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            }`}
          >
            {canClaim ? 'Claim Today\'s Reward' : 'Already Claimed Today'}
          </button>
        </div>
      </div>
    </div>
  );
};
