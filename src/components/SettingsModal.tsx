import React from 'react';
import { Settings as SettingsIcon, Volume2, Gamepad2, Sliders, X } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleVolumeChange = (key: 'sfxVolume' | 'engineVolume' | 'musicVolume', val: number) => {
    const updated = { ...settings, [key]: val };
    onUpdateSettings(updated);
    soundManager.setVolumes(updated.sfxVolume, updated.engineVolume);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md select-none font-['Rajdhani'] text-zinc-100">
      <div className="relative w-full max-w-xl bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">Game Settings</h2>
              <p className="text-xs text-zinc-400">Audio, graphics, controls, and gameplay preferences.</p>
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

        {/* Settings Form */}
        <div className="flex flex-col gap-5">
          {/* Audio Sliders */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2">
              <Volume2 className="w-4 h-4" /> Audio Synthesis & Sound Levels
            </span>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Engine Sound Volume</span>
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.engineVolume}
                  onChange={(e) => handleVolumeChange('engineVolume', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <span className="text-xs font-mono w-8 text-right">{Math.round(settings.engineVolume * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Sound Effects & Tire Screech</span>
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => handleVolumeChange('sfxVolume', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <span className="text-xs font-mono w-8 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Gameplay Units */}
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
            <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Display Units & Speedometer
            </span>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Speedometer Unit</span>
              <div className="flex items-center gap-2">
                {(['kmh', 'mph'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => onUpdateSettings({ ...settings, speedUnit: unit })}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      settings.speedUnit === unit
                        ? 'bg-cyan-500 text-zinc-950 font-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {unit.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
            <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" /> Mobile Controls Layout
            </span>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Steering Mode</span>
              <div className="flex items-center gap-2">
                {[
                  { id: 'buttons', label: 'Direction Buttons' },
                  { id: 'wheel', label: 'Analog Wheel' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onUpdateSettings({ ...settings, steeringControl: mode.id as 'buttons' | 'wheel' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                      settings.steeringControl === mode.id
                        ? 'bg-cyan-500 text-zinc-950 font-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-2 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
