import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VEHICLE_CATALOG } from '../game/vehicles/vehicleData';
import { buildVehicle, BuiltVehicle } from '../game/vehicles/VehicleBuilder';
import { VehicleDefinition, PlayerProfile, VehicleUpgrades, VehicleCustomization } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import {
  Car,
  Zap,
  Gauge,
  Disc,
  Flame,
  Palette,
  Wrench,
  Check,
  Lock,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Layers,
  Sliders,
} from 'lucide-react';

interface GarageProps {
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
  onBackToMenu: () => void;
  onQuickRaceWithVehicle: (vehicleId: string) => void;
}

const PAINT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc', '#18181b',
  '#dc2626', '#0284c7', '#10b981', '#a855f7', '#78350f',
];

const ACCENT_COLORS = [
  '#f8fafc', '#18181b', '#facc15', '#ef4444', '#06b6d4', '#ec4899'
];

const UNDERGLOW_COLORS = [
  { name: 'Off', color: null },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Crimson', color: '#ef4444' },
  { name: 'Neon Green', color: '#22c55e' },
  { name: 'Electric Purple', color: '#a855f7' },
  { name: 'Golden Sun', color: '#eab308' },
];

export const Garage: React.FC<GarageProps> = ({
  profile,
  onUpdateProfile,
  onBackToMenu,
  onQuickRaceWithVehicle,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const idx = VEHICLE_CATALOG.findIndex((v) => v.id === profile.selectedVehicleId);
    return idx >= 0 ? idx : 0;
  });

  const [activeTab, setActiveTab] = useState<'vehicles' | 'upgrades' | 'paint' | 'parts'>('vehicles');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const currentVehicleDef = VEHICLE_CATALOG[selectedIdx];
  const isOwned = profile.ownedVehicles.includes(currentVehicleDef.id);
  const isSelected = profile.selectedVehicleId === currentVehicleDef.id;

  // Current upgrades & customization
  const upgrades: VehicleUpgrades = profile.upgrades[currentVehicleDef.id] || {
    engine: 0,
    turbo: 0,
    brakes: 0,
    tires: 0,
    nitro: 0,
  };

  const customization: VehicleCustomization = profile.customizations[currentVehicleDef.id] || {
    ...currentVehicleDef.defaultCustomization,
  };

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const builtVehicleRef = useRef<BuiltVehicle | null>(null);
  const turntableGroupRef = useRef<THREE.Group | null>(null);

  // Initialize 3D Showroom
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 2.2, 5.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Reflection Map
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-6, 8, -6);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(0xffffff, 0x18181b, 1.2);
    scene.add(fillLight);

    // Showroom Turntable Platform & Floor Grid
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);
    turntableGroupRef.current = turntableGroup;

    const platGeom = new THREE.CylinderGeometry(4.2, 4.4, 0.2, 48);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const platform = new THREE.Mesh(platGeom, platMat);
    platform.position.y = -0.1;
    platform.receiveShadow = true;
    turntableGroup.add(platform);

    // Glowing platform outer ring
    const ringGeom = new THREE.RingGeometry(4.1, 4.35, 48);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.y = 0.01;
    turntableGroup.add(ringMesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x06b6d4, 0x27272a);
    gridHelper.position.y = -0.11;
    scene.add(gridHelper);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 12;
    controls.target.set(0, 0.6, 0);

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (turntableGroupRef.current) {
        turntableGroupRef.current.rotation.y += 0.004;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Vehicle in Showroom when selected vehicle or customization changes
  useEffect(() => {
    if (!turntableGroupRef.current || !sceneRef.current) return;

    // Remove old vehicle
    if (builtVehicleRef.current) {
      turntableGroupRef.current.remove(builtVehicleRef.current.group);
      builtVehicleRef.current = null;
    }

    const currentDef = VEHICLE_CATALOG[selectedIdx];
    const cust = profile.customizations[currentDef.id] || currentDef.defaultCustomization;

    const built = buildVehicle(currentDef, cust);
    turntableGroupRef.current.add(built.group);
    builtVehicleRef.current = built;
  }, [selectedIdx, profile.customizations]);

  const handleSelectVehicle = () => {
    soundManager.playClick();
    onUpdateProfile({
      ...profile,
      selectedVehicleId: currentVehicleDef.id,
    });
  };

  const handleBuyVehicle = () => {
    if (profile.coins >= currentVehicleDef.price) {
      soundManager.playCoin();
      onUpdateProfile({
        ...profile,
        coins: profile.coins - currentVehicleDef.price,
        ownedVehicles: [...profile.ownedVehicles, currentVehicleDef.id],
        selectedVehicleId: currentVehicleDef.id,
      });
    }
  };

  const handleUpgrade = (statKey: keyof VehicleUpgrades) => {
    const currentLvl = upgrades[statKey];
    if (currentLvl >= 5) return;
    const cost = (currentLvl + 1) * 8000;
    if (profile.coins < cost) return;

    soundManager.playCoin();
    const newUpgrades: VehicleUpgrades = {
      ...upgrades,
      [statKey]: currentLvl + 1,
    };

    onUpdateProfile({
      ...profile,
      coins: profile.coins - cost,
      upgrades: {
        ...profile.upgrades,
        [currentVehicleDef.id]: newUpgrades,
      },
    });
  };

  const handleUpdateCustomization = (newCust: Partial<VehicleCustomization>) => {
    soundManager.playClick();
    const fullCust: VehicleCustomization = {
      ...customization,
      ...newCust,
    };

    builtVehicleRef.current?.updateCustomization(fullCust);

    onUpdateProfile({
      ...profile,
      customizations: {
        ...profile.customizations,
        [currentVehicleDef.id]: fullCust,
      },
    });
  };

  const filteredVehicles = VEHICLE_CATALOG.filter((v) => {
    if (categoryFilter === 'all') return true;
    return v.category === categoryFilter;
  });

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-zinc-950 font-['Rajdhani'] text-zinc-100 flex flex-col">
      {/* 3D Showroom Viewport Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-zinc-950/90 via-zinc-950/60 to-transparent">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onBackToMenu();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-sm font-semibold tracking-wider transition uppercase"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            Main Menu
          </button>
          <div className="border-l border-zinc-700 pl-4">
            <h1 className="text-2xl font-black italic tracking-wide text-white uppercase flex items-center gap-2">
              <Wrench className="w-6 h-6 text-cyan-400" />
              Pro Tuning Garage
            </h1>
            <p className="text-xs text-zinc-400 tracking-wider">
              {currentVehicleDef.categoryLabel.toUpperCase()} &bull; {currentVehicleDef.name}
            </p>
          </div>
        </div>

        {/* Currency & XP Badge */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-yellow-500/40 rounded-xl">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Racing Credits</div>
              <div className="text-lg font-black text-yellow-400">${profile.coins.toLocaleString()}</div>
            </div>
          </div>

          {isOwned ? (
            <button
              onClick={() => {
                soundManager.playClick();
                onQuickRaceWithVehicle(currentVehicleDef.id);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black tracking-wider text-base rounded-xl shadow-lg shadow-cyan-500/20 uppercase transition hover:scale-105 active:scale-95"
            >
              <Car className="w-5 h-5" />
              Test Drive / Race
            </button>
          ) : (
            <button
              onClick={handleBuyVehicle}
              disabled={profile.coins < currentVehicleDef.price}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-base uppercase tracking-wider transition ${
                profile.coins >= currentVehicleDef.price
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-zinc-950 shadow-lg shadow-green-500/20 cursor-pointer active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <Lock className="w-5 h-5" />
              Unlock for ${currentVehicleDef.price.toLocaleString()}
            </button>
          )}
        </div>
      </header>

      {/* Main Bottom Control Hub (Zero Viewport Occlusion compliant) */}
      <div className="mt-auto relative z-10 w-full max-w-5xl mx-auto px-4 pb-6 flex flex-col gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-2 px-4 shadow-2xl">
          <div className="flex items-center gap-2">
            {[
              { id: 'vehicles', label: 'Vehicles', icon: Car },
              { id: 'upgrades', label: 'Performance Tuning', icon: Gauge },
              { id: 'paint', label: 'Paint & Finishes', icon: Palette },
              { id: 'parts', label: 'Aero & Spoilers', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wider uppercase transition ${
                    isActive
                      ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Select Status */}
          {isOwned && (
            <button
              onClick={handleSelectVehicle}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition ${
                isSelected
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSelected ? 'Active Vehicle' : 'Set as Active'}
            </button>
          )}
        </div>

        {/* Tab Content Panel */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl min-h-[220px]">
          {/* TAB 1: VEHICLE BROWSER */}
          {activeTab === 'vehicles' && (
            <div className="flex flex-col gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All Classes' },
                  { id: 'supercar', label: 'Supercars' },
                  { id: 'superbike', label: 'Bikes' },
                  { id: 'formula', label: 'Formula 1' },
                  { id: 'monstertruck', label: 'Monster 4x4' },
                  { id: 'heavytruck', label: 'Heavy Trucks' },
                  { id: 'bus', label: 'Transit Bus' },
                  { id: 'scooter', label: 'Scooter' },
                  { id: 'offroad', label: 'Off-Road' },
                  { id: 'rally', label: 'Rally WRC' },
                  { id: 'drift', label: 'Drift Spec' },
                  { id: 'electric', label: 'Electric EV' },
                  { id: 'vintage', label: 'Classic Muscle' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold tracking-wider uppercase whitespace-nowrap transition ${
                      categoryFilter === cat.id
                        ? 'bg-zinc-200 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Horizontal Vehicle Cards */}
              <div className="flex items-center gap-3 overflow-x-auto py-2">
                {filteredVehicles.map((v) => {
                  const isCurrent = VEHICLE_CATALOG[selectedIdx].id === v.id;
                  const owned = profile.ownedVehicles.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        soundManager.playClick();
                        const idx = VEHICLE_CATALOG.findIndex((it) => it.id === v.id);
                        setSelectedIdx(idx);
                      }}
                      className={`flex-shrink-0 w-52 p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold uppercase">
                          <span>{v.categoryLabel}</span>
                          {owned ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-bold">
                              <Check className="w-3 h-3" /> OWNED
                            </span>
                          ) : (
                            <span className="text-yellow-400">${v.price.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="text-base font-black text-white mt-1 truncate">{v.name}</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                        <span>Top: {v.stats.topSpeed} km/h</span>
                        <span className="text-cyan-400 font-bold">{v.stats.acceleration} Accel</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'engine', label: 'Engine ECU', icon: Zap, boost: '+15 km/h Top Speed' },
                { key: 'turbo', label: 'Twin Turbo', icon: Gauge, boost: '+Acceleration Boost' },
                { key: 'brakes', label: 'Ceramic Brakes', icon: Disc, boost: '+Stopping Power' },
                { key: 'tires', label: 'Track Slicks', icon: Shield, boost: '+Cornering & Drift Grip' },
                { key: 'nitro', label: 'Nitro Tank', icon: Flame, boost: '+Capacity & Recharge' },
              ].map((up) => {
                const lvl = upgrades[up.key as keyof VehicleUpgrades];
                const cost = (lvl + 1) * 8000;
                const Icon = up.icon;
                const isMax = lvl >= 5;

                return (
                  <div key={up.key} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-5 h-5 text-cyan-400" />
                        <span className="text-xs font-black text-zinc-400">STAGE {lvl}/5</span>
                      </div>
                      <div className="text-sm font-black text-white uppercase">{up.label}</div>
                      <div className="text-[11px] text-zinc-400">{up.boost}</div>
                    </div>

                    {/* Progress bars */}
                    <div className="flex items-center gap-1 my-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div
                          key={s}
                          className={`flex-1 h-2 rounded-full ${
                            s <= lvl ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => handleUpgrade(up.key as keyof VehicleUpgrades)}
                      disabled={isMax || profile.coins < cost || !isOwned}
                      className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                        isMax
                          ? 'bg-zinc-800 text-zinc-500 cursor-default'
                          : profile.coins >= cost && isOwned
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAXED' : `$${cost.toLocaleString()} Tune`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: PAINT & CUSTOMIZATION */}
          {activeTab === 'paint' && (
            <div className="flex flex-col gap-4">
              {/* Finish selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase text-zinc-400">Surface Finish:</span>
                {(['gloss', 'metallic', 'matte', 'chrome'] as const).map((finish) => (
                  <button
                    key={finish}
                    onClick={() => handleUpdateCustomization({ finish })}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      customization.finish === finish
                        ? 'bg-cyan-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {finish}
                  </button>
                ))}
              </div>

              {/* Body Paint Swatches */}
              <div>
                <span className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Body Paint Color:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {PAINT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleUpdateCustomization({ bodyColor: c })}
                      className={`w-8 h-8 rounded-full border-2 transition transform hover:scale-110 ${
                        customization.bodyColor === c ? 'border-white scale-110 shadow-lg' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Rims Color */}
              <div>
                <span className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Wheel Rim Alloy Color:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#e2e8f0', '#18181b', '#fbbf24', '#ef4444', '#06b6d4', '#8b5cf6'].map((rc) => (
                    <button
                      key={rc}
                      onClick={() => handleUpdateCustomization({ rimColor: rc })}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        customization.rimColor === rc ? 'border-cyan-400 scale-110' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: rc }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AERO SPOILER & UNDERGLOW */}
          {activeTab === 'parts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Spoilers */}
              <div>
                <span className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Rear Spoiler Downforce Kit:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { idx: 0, label: 'Stock / None' },
                    { idx: 1, label: 'Sport Lip Spoiler' },
                    { idx: 2, label: 'GT Carbon Wing' },
                    { idx: 3, label: 'Time Attack Aero Wing' },
                  ].map((sp) => (
                    <button
                      key={sp.idx}
                      onClick={() => handleUpdateCustomization({ spoilerIndex: sp.idx })}
                      className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider text-left transition ${
                        customization.spoilerIndex === sp.idx
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Underglow Neon */}
              <div>
                <span className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Underglow Cyber Neon:</span>
                <div className="grid grid-cols-3 gap-2">
                  {UNDERGLOW_COLORS.map((ug) => (
                    <button
                      key={ug.name}
                      onClick={() => handleUpdateCustomization({ underglowColor: ug.color })}
                      className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                        customization.underglowColor === ug.color
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ug.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
