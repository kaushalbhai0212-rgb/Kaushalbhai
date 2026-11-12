import React, { useEffect } from 'react';
import { Trophy, Star, Sparkles, RotateCcw, Wrench, Menu, Award, Flag } from 'lucide-react';
import { RaceParticipant } from '../types/game';
import confetti from 'canvas-confetti';
import { soundManager } from '../audio/SoundManager';

interface RaceResultModalProps {
  isOpen: boolean;
  participants: RaceParticipant[];
  totalTime: number;
  bestLapTime: number;
  driftPoints: number;
  earnedCoins: number;
  earnedXp: number;
  onRetry: () => void;
  onGarage: () => void;
  onMenu: () => void;
}

export const RaceResultModal: React.FC<RaceResultModalProps> = ({
  isOpen,
  participants,
  totalTime,
  bestLapTime,
  driftPoints,
  earnedCoins,
  earnedXp,
  onRetry,
  onGarage,
  onMenu,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playVictory();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const player = participants.find((p) => p.id === 'player') || participants[0];
  const position = player.racePosition;

  const formatTime = (secs: number) => {
    if (!secs || secs === Infinity) return '--:--.--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getPositionTitle = (pos: number) => {
    if (pos === 1) return { text: 'VICTORY! 1ST PLACE', color: 'from-amber-400 via-yellow-400 to-amber-500', glow: 'text-yellow-400' };
    if (pos === 2) return { text: 'PODIUM! 2ND PLACE', color: 'from-zinc-200 to-slate-400', glow: 'text-zinc-300' };
    if (pos === 3) return { text: 'PODIUM! 3RD PLACE', color: 'from-amber-700 to-amber-600', glow: 'text-amber-600' };
    return { text: `FINISHED ${pos}TH`, color: 'from-zinc-400 to-zinc-500', glow: 'text-zinc-400' };
  };

  const posInfo = getPositionTitle(position);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md select-none font-['Rajdhani'] text-zinc-100">
      <div className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header Podium Banner */}
        <div className="text-center flex flex-col items-center">
          <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 mb-2">
            <Trophy className={`w-10 h-10 ${posInfo.glow}`} />
          </div>
          <h2 className={`text-3xl font-black italic tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r ${posInfo.color}`}>
            {posInfo.text}
          </h2>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">Race Session Concluded</p>
        </div>

        {/* Rewards Breakdown Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 bg-zinc-950/70 border border-yellow-500/30 rounded-2xl text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Credits Earned</div>
            <div className="text-2xl font-black text-yellow-400 font-mono mt-0.5">+${earnedCoins.toLocaleString()}</div>
          </div>
          <div className="p-3.5 bg-zinc-950/70 border border-cyan-500/30 rounded-2xl text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">XP Gained</div>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">+{earnedXp} XP</div>
          </div>
          <div className="p-3.5 bg-zinc-950/70 border border-purple-500/30 rounded-2xl text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Drift Score</div>
            <div className="text-2xl font-black text-purple-400 font-mono mt-0.5">+{driftPoints.toLocaleString()}</div>
          </div>
        </div>

        {/* Timings Summary */}
        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-around text-xs">
          <div>
            <span className="text-zinc-500 font-bold uppercase">Total Time: </span>
            <strong className="text-white font-mono">{formatTime(totalTime)}</strong>
          </div>
          <div className="border-l border-zinc-800 pl-4">
            <span className="text-zinc-500 font-bold uppercase">Best Lap: </span>
            <strong className="text-yellow-400 font-mono">{formatTime(bestLapTime)}</strong>
          </div>
        </div>

        {/* Final Standings Table */}
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
          {participants.map((p, idx) => {
            const isUser = p.id === 'player';
            return (
              <div
                key={p.id}
                className={`px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                  isUser
                    ? 'bg-cyan-950/40 border-cyan-400 text-white'
                    : 'bg-zinc-950/40 border-zinc-850 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 font-black font-mono ${idx === 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    #{idx + 1}
                  </span>
                  <span className={isUser ? 'text-cyan-300 font-black uppercase' : 'text-zinc-300'}>{p.name}</span>
                </div>
                <div className="font-mono text-zinc-300">{formatTime(p.totalTime)}</div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={() => {
              soundManager.playClick();
              onMenu();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-300 transition"
          >
            <Menu className="w-4 h-4" />
            Main Menu
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onGarage();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-wider text-cyan-400 transition"
            >
              <Wrench className="w-4 h-4" />
              Garage & Upgrades
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onRetry();
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Race Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
