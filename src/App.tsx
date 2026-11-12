import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { VEHICLE_CATALOG } from './game/vehicles/vehicleData';
import { TRACK_CATALOG } from './game/tracks/trackData';
import {
  GameMode,
  PlayerProfile,
  GameSettings,
  TrackDefinition,
  VehicleDefinition,
  WeatherType,
  RaceParticipant,
} from './types/game';
import { loadProfile, saveProfile, loadSettings, saveSettings, getRankFromXp } from './utils/storage';
import { soundManager } from './audio/SoundManager';
import { MainMenu } from './components/MainMenu';
import { Garage } from './components/Garage';
import { HUD } from './components/HUD';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { CareerModal } from './components/CareerModal';
import { SettingsModal } from './components/SettingsModal';
import { RaceResultModal } from './components/RaceResultModal';
import { Play, RotateCcw, Menu, Wrench } from 'lucide-react';

export default function App() {
  // 1. Persistent State
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  // 2. Active Screen State
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'racing'>('menu');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // 3. Selection State
  const [selectedTrack, setSelectedTrack] = useState<TrackDefinition>(() => TRACK_CATALOG[0]);
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>('clear');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('quick');
  const [activeCareerCupId, setActiveCareerCupId] = useState<string | null>(null);

  // 4. Modal Overlays
  const [showDailyRewards, setShowDailyRewards] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showCareer, setShowCareer] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showRaceResult, setShowRaceResult] = useState<boolean>(false);

  // 5. Race Telemetry & State
  const [telemetry, setTelemetry] = useState({
    speedKmh: 0,
    rpm: 0.2,
    gear: 1,
    nitro: 100,
    position: 1,
    totalRacers: 6,
    lap: 1,
    totalLaps: 3,
    currentLapTime: 0,
    wrongWay: false,
  });

  const [bestLapTime, setBestLapTime] = useState<number>(Infinity);
  const [driftScore, setDriftScore] = useState<number>(0);
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [countdownNumber, setCountdownNumber] = useState<number>(3);

  // Final race results
  const [raceResults, setRaceResults] = useState<RaceParticipant[]>([]);
  const [totalRaceTime, setTotalRaceTime] = useState<number>(0);
  const [raceRewards, setRaceRewards] = useState({ coins: 0, xp: 0 });

  // 6. 3D Game Engine Mount & Instance Refs
  const gameMountRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  // Key states for desktop controls
  const keyStateRef = useRef<Record<string, boolean>>({});

  // Get active selected vehicle definition
  const selectedVehicle = VEHICLE_CATALOG.find((v) => v.id === profile.selectedVehicleId) || VEHICLE_CATALOG[0];

  // Sync profile changes to localStorage
  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    // Update rank based on XP
    newProfile.rank = getRankFromXp(newProfile.xp);
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  // Sync settings changes
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 7. KEYBOARD CONTROLS LISTENERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyStateRef.current[e.code] = true;

      if (!gameEngineRef.current) return;

      // Camera toggle
      if (e.code === 'KeyC') {
        const angles: Array<'chase' | 'close' | 'hood' | 'bumper'> = ['chase', 'close', 'hood', 'bumper'];
        const currentIdx = angles.indexOf(gameEngineRef.current.cameraAngle);
        const next = angles[(currentIdx + 1) % angles.length];
        gameEngineRef.current.setCameraAngle(next);
      }

      // Reset vehicle
      if (e.code === 'KeyR') {
        gameEngineRef.current.resetPlayerToTrack();
      }

      // Pause toggle
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'racing' && !showRaceResult) {
          setIsPaused((prev) => !prev);
        }
      }

      syncControlsToEngine();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyStateRef.current[e.code] = false;
      syncControlsToEngine();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, showRaceResult]);

  const syncControlsToEngine = () => {
    if (!gameEngineRef.current) return;

    const keys = keyStateRef.current;
    const throttle = keys['KeyW'] || keys['ArrowUp'] ? 1 : 0;
    const brake = keys['KeyS'] || keys['ArrowDown'] ? 1 : 0;
    const steerLeft = keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0;
    const steerRight = keys['KeyD'] || keys['ArrowRight'] ? 1 : 0;
    const steer = steerRight - steerLeft;
    const handbrake = !!keys['Space'];
    const nitro = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyN']);

    gameEngineRef.current.controls = {
      throttle,
      brake,
      steer,
      handbrake,
      nitro,
    };
  };

  // 8. START / INITIALIZE RACE
  const startRaceSession = useCallback(
    (mode: GameMode, track: TrackDefinition = selectedTrack, cupId: string | null = null) => {
      // Clean up previous engine if any
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
        gameEngineRef.current = null;
      }

      setActiveGameMode(mode);
      setSelectedTrack(track);
      setActiveCareerCupId(cupId);
      setGameState('racing');
      setIsPaused(false);
      setShowRaceResult(false);
      setDriftScore(0);
      setBestLapTime(Infinity);

      // Timeout to ensure DOM mount ref exists
      setTimeout(() => {
        if (!gameMountRef.current) return;

        const upgrades = profile.upgrades[selectedVehicle.id] || { engine: 0, turbo: 0, brakes: 0, tires: 0, nitro: 0 };
        const customization = profile.customizations[selectedVehicle.id] || selectedVehicle.defaultCustomization;

        const engine = new GameEngine(
          gameMountRef.current,
          track,
          selectedVehicle,
          upgrades,
          customization,
          selectedWeather,
          mode,
          {
            onLapCompleted: (_lap, _lapTime, bestTime) => {
              setBestLapTime(bestTime);
            },
            onRaceFinished: (results, totalTime) => {
              setRaceResults(results);
              setTotalRaceTime(totalTime);

              // Calculate earnings based on finish position
              const playerEntry = results.find((r) => r.id === 'player') || results[0];
              const pos = playerEntry.racePosition;
              let coinsWon = pos === 1 ? 20000 : pos === 2 ? 12000 : pos === 3 ? 8000 : 4000;
              let xpWon = pos === 1 ? 600 : pos === 2 ? 400 : 200;

              // Bonus for drift score
              const driftBonus = Math.floor((playerEntry.driftScore || 0) * 0.1);
              coinsWon += driftBonus;

              // Career cup completion bonus
              if (cupId && pos <= 3) {
                const cupStars = pos === 1 ? 3 : pos === 2 ? 2 : 1;
                const newStarsMap = {
                  ...profile.careerProgress.starsByCupId,
                  [cupId]: Math.max(profile.careerProgress.starsByCupId[cupId] || 0, cupStars),
                };
                const newCompleted = Array.from(new Set([...profile.careerProgress.completedCupIds, cupId]));

                handleUpdateProfile({
                  ...profile,
                  coins: profile.coins + coinsWon,
                  xp: profile.xp + xpWon,
                  careerProgress: {
                    completedCupIds: newCompleted,
                    starsByCupId: newStarsMap,
                  },
                  highScores: {
                    ...profile.highScores,
                    [track.id]: {
                      bestLapTime: Math.min(profile.highScores[track.id]?.bestLapTime || Infinity, playerEntry.bestLapTime),
                      driftScore: Math.max(profile.highScores[track.id]?.driftScore || 0, playerEntry.driftScore || 0),
                      maxSpeed: 320,
                    },
                  },
                });
              } else {
                handleUpdateProfile({
                  ...profile,
                  coins: profile.coins + coinsWon,
                  xp: profile.xp + xpWon,
                  highScores: {
                    ...profile.highScores,
                    [track.id]: {
                      bestLapTime: Math.min(profile.highScores[track.id]?.bestLapTime || Infinity, playerEntry.bestLapTime),
                      driftScore: Math.max(profile.highScores[track.id]?.driftScore || 0, playerEntry.driftScore || 0),
                      maxSpeed: 320,
                    },
                  },
                });
              }

              setRaceRewards({ coins: coinsWon, xp: xpWon });
              setShowRaceResult(true);
            },
            onDriftPointsUpdated: (points, drifting) => {
              setDriftScore(points);
              setIsDrifting(drifting);
            },
            onTelemetryUpdated: (
              speed,
              rpm,
              gear,
              nitro,
              pos,
              total,
              lap,
              totalLaps,
              lapTime,
              wrongWay
            ) => {
              setTelemetry({
                speedKmh: speed,
                rpm,
                gear,
                nitro,
                position: pos,
                totalRacers: total,
                lap,
                totalLaps,
                currentLapTime: lapTime,
                wrongWay,
              });
            },
          }
        );

        gameEngineRef.current = engine;

        // Set camera angle from settings
        engine.setCameraAngle(settings.cameraAngle);

        // Start race countdown or free roam immediately
        if (mode === 'freeroam') {
          engine.startFreeRoam();
        } else {
          setIsCountdownActive(true);
          engine.startRaceCountdown();
          // Sync countdown counter visual
          const timer = setInterval(() => {
            if (engine.isCountdownActive) {
              setCountdownNumber(engine.countdownNumber);
            } else {
              setIsCountdownActive(false);
              clearInterval(timer);
            }
          }, 200);
        }
      }, 50);
    },
    [profile, selectedVehicle, selectedTrack, selectedWeather, settings]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
      }
    };
  }, []);

  // Exit race to Main Menu or Garage
  const exitRace = (destination: 'menu' | 'garage') => {
    if (gameEngineRef.current) {
      gameEngineRef.current.dispose();
      gameEngineRef.current = null;
    }
    setShowRaceResult(false);
    setIsPaused(false);
    setGameState(destination);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-['Rajdhani']">
      {/* 1. MAIN MENU SCREEN */}
      {gameState === 'menu' && (
        <MainMenu
          profile={profile}
          selectedVehicle={selectedVehicle}
          selectedTrack={selectedTrack}
          selectedWeather={selectedWeather}
          onSelectTrack={setSelectedTrack}
          onSelectWeather={setSelectedWeather}
          onStartRace={(mode) => startRaceSession(mode)}
          onOpenGarage={() => setGameState('garage')}
          onOpenDailyRewards={() => setShowDailyRewards(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenCareer={() => setShowCareer(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 2. GARAGE SCREEN */}
      {gameState === 'garage' && (
        <Garage
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onBackToMenu={() => setGameState('menu')}
          onQuickRaceWithVehicle={(vId) => {
            handleUpdateProfile({ ...profile, selectedVehicleId: vId });
            startRaceSession('quick');
          }}
        />
      )}

      {/* 3. ACTIVE 3D RACE VIEWPORT & HUD */}
      {gameState === 'racing' && (
        <div className="relative w-full h-full">
          {/* WebGL Canvas Container */}
          <div ref={gameMountRef} className="absolute inset-0 z-0" />

          {/* HUD Overlay */}
          <HUD
            speedKmh={telemetry.speedKmh}
            rpm={telemetry.rpm}
            gear={telemetry.gear}
            nitro={telemetry.nitro}
            position={telemetry.position}
            totalRacers={telemetry.totalRacers}
            lap={telemetry.lap}
            totalLaps={telemetry.totalLaps}
            currentLapTime={telemetry.currentLapTime}
            bestLapTime={bestLapTime}
            driftScore={driftScore}
            isDrifting={isDrifting}
            countdownNumber={countdownNumber}
            isCountdownActive={isCountdownActive}
            settings={settings}
            onCameraToggle={() => {
              if (gameEngineRef.current) {
                const angles: Array<'chase' | 'close' | 'hood' | 'bumper'> = ['chase', 'close', 'hood', 'bumper'];
                const currentIdx = angles.indexOf(gameEngineRef.current.cameraAngle);
                const next = angles[(currentIdx + 1) % angles.length];
                gameEngineRef.current.setCameraAngle(next);
              }
            }}
            onResetVehicle={() => {
              gameEngineRef.current?.resetPlayerToTrack();
            }}
            onPause={() => setIsPaused(true)}
            // Mobile Touch Event Handlers
            onMobileThrottle={(active) => {
              if (gameEngineRef.current) gameEngineRef.current.controls.throttle = active ? 1 : 0;
            }}
            onMobileBrake={(active) => {
              if (gameEngineRef.current) gameEngineRef.current.controls.brake = active ? 1 : 0;
            }}
            onMobileSteer={(dir) => {
              if (gameEngineRef.current) gameEngineRef.current.controls.steer = dir;
            }}
            onMobileHandbrake={(active) => {
              if (gameEngineRef.current) gameEngineRef.current.controls.handbrake = active;
            }}
            onMobileNitro={(active) => {
              if (gameEngineRef.current) gameEngineRef.current.controls.nitro = active;
            }}
          />

          {/* PAUSE MODAL OVERLAY */}
          {isPaused && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
              <div className="w-full max-w-md bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
                <h3 className="text-2xl font-black italic tracking-wider uppercase text-white">Race Paused</h3>
                <p className="text-xs text-zinc-400">Take a breather or tweak your settings.</p>

                <div className="flex flex-col gap-2.5 mt-2">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setIsPaused(false);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Resume Race
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      gameEngineRef.current?.resetPlayerToTrack();
                      setIsPaused(false);
                    }}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-orange-400" />
                    Restart / Reset Car
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      exitRace('garage');
                    }}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Return to Garage
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      exitRace('menu');
                    }}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Menu className="w-4 h-4" />
                    Exit to Main Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RACE FINISH RESULTS MODAL */}
          <RaceResultModal
            isOpen={showRaceResult}
            participants={raceResults}
            totalTime={totalRaceTime}
            bestLapTime={bestLapTime}
            driftPoints={driftScore}
            earnedCoins={raceRewards.coins}
            earnedXp={raceRewards.xp}
            onRetry={() => startRaceSession(activeGameMode, selectedTrack, activeCareerCupId)}
            onGarage={() => exitRace('garage')}
            onMenu={() => exitRace('menu')}
          />
        </div>
      )}

      {/* 4. GLOBAL POPUP MODALS */}
      <DailyRewardsModal
        isOpen={showDailyRewards}
        onClose={() => setShowDailyRewards(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
      />

      <AchievementsModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
      />

      <CareerModal
        isOpen={showCareer}
        onClose={() => setShowCareer(false)}
        profile={profile}
        onStartCareerRace={(cupId, track, _laps) => {
          setShowCareer(false);
          startRaceSession('career', track, cupId);
        }}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
