import React from 'react';
import {
  Camera,
  RotateCcw,
  Pause,
  Flame,
  Flag,
  Timer,
  Trophy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Disc,
} from 'lucide-react';
import { GameSettings } from '../types/game';

interface HUDProps {
  speedKmh: number;
  rpm: number;
  gear: number;
  nitro: number;
  position: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  currentLapTime: number;
  bestLapTime: number;
  driftScore: number;
  isDrifting: boolean;
  countdownNumber: number;
  isCountdownActive: boolean;
  settings: GameSettings;
  onCameraToggle: () => void;
  onResetVehicle: () => void;
  onPause: () => void;
  // Mobile controls callback triggers
  onMobileThrottle: (active: boolean) => void;
  onMobileBrake: (active: boolean) => void;
  onMobileSteer: (dir: number) => void;
  onMobileHandbrake: (active: boolean) => void;
  onMobileNitro: (active: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  speedKmh,
  rpm,
  gear,
  nitro,
  position,
  totalRacers,
  lap,
  totalLaps,
  currentLapTime,
  bestLapTime,
  driftScore,
  isDrifting,
  countdownNumber,
  isCountdownActive,
  settings,
  onCameraToggle,
  onResetVehicle,
  onPause,
  onMobileThrottle,
  onMobileBrake,
  onMobileSteer,
  onMobileHandbrake,
  onMobileNitro,
}) => {
  const formatTime = (secs: number) => {
    if (!secs || secs === Infinity) return '--:--.--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const displaySpeed = settings.speedUnit === 'mph' ? Math.round(speedKmh * 0.621371) : speedKmh;
  const speedUnitLabel = settings.speedUnit === 'mph' ? 'MPH' : 'KM/H';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-['Rajdhani'] text-white z-20 flex flex-col justify-between p-4 md:p-6">
      {/* 1. TOP BAR: Race Position, Lap, Timers, and Action Buttons */}
      <div className="flex items-start justify-between w-full">
        {/* Top Left: Position & Lap */}
        <div className="flex items-center gap-3">
          {/* Position Badge */}
          <div className="px-4 py-2.5 bg-zinc-950/85 border border-zinc-800 backdrop-blur-md rounded-2xl flex items-center gap-3 shadow-2xl">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Position</div>
              <div className="text-2xl font-black text-white italic tracking-wide">
                <span className="text-cyan-400">{getOrdinal(position)}</span>
                <span className="text-xs text-zinc-500 font-normal ml-1">/ {totalRacers}</span>
              </div>
            </div>
          </div>

          {/* Lap Counter */}
          <div className="px-4 py-2.5 bg-zinc-950/85 border border-zinc-800 backdrop-blur-md rounded-2xl flex items-center gap-3 shadow-2xl">
            <Flag className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lap</div>
              <div className="text-2xl font-black text-white italic tracking-wide">
                {lap} <span className="text-xs text-zinc-500 font-normal">/ {totalLaps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Center: Drift Combo Toast */}
        {driftScore > 0 && (
          <div
            className={`px-5 py-2 rounded-2xl border backdrop-blur-md transition-all duration-300 transform ${
              isDrifting
                ? 'bg-purple-950/80 border-purple-400 scale-110 shadow-lg shadow-purple-500/30'
                : 'bg-zinc-950/80 border-zinc-800 scale-100 opacity-80'
            }`}
          >
            <div className="text-[10px] text-purple-300 font-bold tracking-widest uppercase text-center">
              DRIFT SCORE
            </div>
            <div className="text-2xl font-black text-purple-400 italic tracking-wider text-center">
              +{driftScore.toLocaleString()} PTS
            </div>
          </div>
        )}

        {/* Top Right: Lap Times & Controls Buttons */}
        <div className="flex items-center gap-3">
          {/* Lap Timer Display */}
          <div className="px-4 py-2.5 bg-zinc-950/85 border border-zinc-800 backdrop-blur-md rounded-2xl flex items-center gap-3 shadow-2xl">
            <Timer className="w-5 h-5 text-cyan-400" />
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Time</div>
              <div className="text-lg font-black text-white font-mono">{formatTime(currentLapTime)}</div>
              {bestLapTime !== Infinity && (
                <div className="text-[10px] text-yellow-400 font-mono">BEST: {formatTime(bestLapTime)}</div>
              )}
            </div>
          </div>

          {/* Action Buttons (Pointer events active) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onCameraToggle}
              title="Change Camera Angle (C)"
              className="p-3 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-zinc-300 hover:text-white transition active:scale-95 shadow-lg"
            >
              <Camera className="w-5 h-5 text-cyan-400" />
            </button>
            <button
              onClick={onResetVehicle}
              title="Reset Vehicle to Track (R)"
              className="p-3 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-zinc-300 hover:text-white transition active:scale-95 shadow-lg"
            >
              <RotateCcw className="w-5 h-5 text-orange-400" />
            </button>
            <button
              onClick={onPause}
              title="Pause Game (ESC / P)"
              className="p-3 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-zinc-300 hover:text-white transition active:scale-95 shadow-lg"
            >
              <Pause className="w-5 h-5 text-zinc-300" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Race Countdown Banner (3, 2, 1, GO!) */}
      {isCountdownActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center animate-bounce">
            <div className="text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_10px_25px_rgba(6,182,212,0.8)]">
              {countdownNumber > 0 ? countdownNumber : 'GO!'}
            </div>
            <div className="text-sm font-bold tracking-widest uppercase text-zinc-300 mt-2 bg-zinc-950/80 px-4 py-1 rounded-full border border-zinc-700">
              Get Ready!
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM TELEMETRY DOCK: Speedometer, RPM Arc, Gear, Nitro Gauge */}
      <div className="flex items-end justify-between w-full">
        {/* Mobile Left Controls: Steer Left & Right */}
        <div className="pointer-events-auto flex items-center gap-3 md:hidden">
          <button
            onPointerDown={() => onMobileSteer(-1)}
            onPointerUp={() => onMobileSteer(0)}
            onPointerLeave={() => onMobileSteer(0)}
            className="w-16 h-16 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 active:bg-cyan-500/40 active:border-cyan-400 flex items-center justify-center shadow-2xl backdrop-blur-md"
          >
            <ArrowLeft className="w-8 h-8 text-white" />
          </button>
          <button
            onPointerDown={() => onMobileSteer(1)}
            onPointerUp={() => onMobileSteer(0)}
            onPointerLeave={() => onMobileSteer(0)}
            className="w-16 h-16 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 active:bg-cyan-500/40 active:border-cyan-400 flex items-center justify-center shadow-2xl backdrop-blur-md"
          >
            <ArrowRight className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Center / Desktop Speedometer Cluster */}
        <div className="mx-auto flex flex-col items-center">
          {/* Nitro Gauge Bar */}
          <div className="w-64 bg-zinc-950/80 border border-zinc-800 rounded-full p-1 mb-2 backdrop-blur-md flex items-center gap-2 shadow-xl">
            <Flame className={`w-4 h-4 ml-1 ${nitro > 20 ? 'text-cyan-400 animate-pulse' : 'text-zinc-600'}`} />
            <div className="flex-1 h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 transition-all duration-100 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${nitro}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-cyan-300 mr-2 font-mono">N2O {Math.round(nitro)}%</span>
          </div>

          {/* Main Dial Instrument */}
          <div className="relative px-8 py-4 bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md rounded-3xl flex items-center gap-6 shadow-2xl">
            {/* Gear Indicator */}
            <div className="flex flex-col items-center border-r border-zinc-800 pr-6">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Gear</span>
              <span className="text-4xl font-black text-cyan-400 italic">{gear}</span>
            </div>

            {/* Speed Readout */}
            <div className="flex flex-col items-center">
              <div className="text-6xl font-black italic tracking-tighter text-white font-mono">
                {displaySpeed.toString().padStart(3, '0')}
              </div>
              <div className="text-xs font-black tracking-widest text-zinc-400 uppercase">
                {speedUnitLabel}
              </div>
            </div>

            {/* RPM Gauge Bar */}
            <div className="flex flex-col items-center border-l border-zinc-800 pl-6">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">RPM</span>
              <div className="w-4 h-14 bg-zinc-900 rounded-full overflow-hidden flex flex-col justify-end p-0.5 mt-1">
                <div
                  className={`w-full rounded-full transition-all duration-75 ${
                    rpm > 0.85 ? 'bg-red-500' : rpm > 0.65 ? 'bg-yellow-400' : 'bg-cyan-400'
                  }`}
                  style={{ height: `${Math.round(rpm * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Right Controls: Gas, Brake, Handbrake, Nitro */}
        <div className="pointer-events-auto flex items-end gap-3 md:hidden">
          <div className="flex flex-col gap-2">
            <button
              onPointerDown={() => onMobileNitro(true)}
              onPointerUp={() => onMobileNitro(false)}
              onPointerLeave={() => onMobileNitro(false)}
              className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/80 active:bg-cyan-500 active:text-zinc-950 flex items-center justify-center shadow-xl text-cyan-400"
            >
              <Flame className="w-7 h-7" />
            </button>
            <button
              onPointerDown={() => onMobileHandbrake(true)}
              onPointerUp={() => onMobileHandbrake(false)}
              onPointerLeave={() => onMobileHandbrake(false)}
              className="w-14 h-14 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 active:bg-orange-500/40 active:border-orange-400 flex items-center justify-center shadow-xl text-orange-400"
            >
              <Disc className="w-7 h-7" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onPointerDown={() => onMobileBrake(true)}
              onPointerUp={() => onMobileBrake(false)}
              onPointerLeave={() => onMobileBrake(false)}
              className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/80 active:bg-red-500 active:text-white flex items-center justify-center shadow-2xl text-red-400"
            >
              <ArrowDown className="w-8 h-8" />
            </button>
            <button
              onPointerDown={() => onMobileThrottle(true)}
              onPointerUp={() => onMobileThrottle(false)}
              onPointerLeave={() => onMobileThrottle(false)}
              className="w-16 h-20 rounded-2xl bg-gradient-to-t from-emerald-600 to-green-500 border border-green-400 active:brightness-125 flex items-center justify-center shadow-2xl text-zinc-950"
            >
              <ArrowUp className="w-10 h-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
