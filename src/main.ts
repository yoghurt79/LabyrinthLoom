import { Clock } from 'three';
import './style.css';
import { generateDungeon } from './core/dungeonGenerator';
import { createEphemeralSeed } from './core/random';
import type { DungeonData } from './core/dungeonTypes';
import { DungeonBuilder, type DungeonPickTarget } from './render/DungeonBuilder';
import { DustParticles } from './render/Particles';
import { SceneManager } from './render/SceneManager';
import { ControlPanel } from './ui/ControlPanel';
import { InfoPanel } from './ui/InfoPanel';
import { raycastFromPointer } from './utils/raycaster';

declare global {
  interface Window {
    __DUNGEON__: DungeonData;
    getDungeonData: () => DungeonData;
    regenerate: (seed?: string | number) => DungeonData;
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#dungeon-canvas');
const controlRoot = document.querySelector<HTMLElement>('#control-root');
const infoRoot = document.querySelector<HTMLElement>('#info-root');
if (!canvas || !controlRoot || !infoRoot) {
  throw new Error('The dungeon application could not find its root elements.');
}

const sceneManager = new SceneManager(canvas);
const builder = new DungeonBuilder(sceneManager.scene);
let particles: DustParticles | null = null;
let currentData: DungeonData | null = null;
let selectedTarget: DungeonPickTarget | null = null;
let infoPanel: InfoPanel;
let controlPanel: ControlPanel;

function regenerate(seedInput?: string | number): DungeonData {
  const seed = seedInput === undefined ? createEphemeralSeed() : String(seedInput);
  const data = generateDungeon(seed);
  currentData = data;
  selectedTarget = null;
  builder.build(data);
  sceneManager.invalidateShadows();
  builder.select(null);
  particles?.dispose();
  particles = new DustParticles(sceneManager.scene, data.seed, data.width, data.height);
  const extent = Math.max(data.width, data.height);
  sceneManager.controls.target.set(0, 1.2, 0);
  sceneManager.controls.maxDistance = extent * 2.1;
  sceneManager.camera.position.set(extent * 0.58, extent * 0.58, extent * 0.72);
  controlPanel.setSeed(seed);
  controlPanel.setStatus(`已生成 ${data.stats.roomCount} 个房间`);
  infoPanel.updateStats(data, 60);
  infoPanel.updateSelection(null);
  window.__DUNGEON__ = data;
  return data;
}

function selectTarget(target: DungeonPickTarget | null): void {
  selectedTarget = target;
  builder.select(target);
  infoPanel.updateSelection(target);
  if (target) controlPanel.setStatus(`已选中：${target.title}`);
}

function focusTarget(): void {
  if (!currentData) return;
  let target = selectedTarget;
  if (!target && currentData.rooms.length > 0) {
    const room = currentData.rooms[Math.floor(Math.random() * currentData.rooms.length)];
    if (room) target = builder.getRoomTarget(room.id);
  }
  if (!target) return;

  const controls = sceneManager.controls;
  const direction = sceneManager.camera.position.clone().sub(controls.target);
  direction.y = Math.max(direction.y, 4);
  if (direction.lengthSq() < 0.01) direction.set(1, 0.85, 1);
  direction.normalize();
  const span = Math.max(target.size.x, target.size.z, 7);
  controls.target.copy(target.center);
  sceneManager.camera.position.copy(target.center).addScaledVector(direction, span * 1.25 + 4);
  controls.update();
  controlPanel.setStatus(target.id.startsWith('room:') ? '镜头已聚焦石室' : '镜头已聚焦选中对象');
}

async function copyCurrentSeed(): Promise<void> {
  if (!currentData) return;
  try {
    await navigator.clipboard.writeText(currentData.seed);
    controlPanel.showToast(`已复制种子：${currentData.seed}`);
  } catch {
    const input = document.createElement('textarea');
    input.value = currentData.seed;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    controlPanel.showToast(`已复制种子：${currentData.seed}`);
  }
}

infoPanel = new InfoPanel(infoRoot);
controlPanel = new ControlPanel(controlRoot, {
  regenerate: () => {
    regenerate();
  },
  generateSeed: (seed) => {
    regenerate(seed);
  },
  copySeed: () => {
    void copyCurrentSeed();
  },
  setAutoRotate: (enabled) => sceneManager.setAutoRotate(enabled),
  setAutoRotateSpeed: (speed) => sceneManager.setAutoRotateSpeed(speed),
  setWireframe: (enabled) => builder.setWireframe(enabled),
  setCeilingVisible: (visible) => builder.setCeilingVisible(visible),
  setCutaway: (enabled) => sceneManager.setCutaway(enabled),
  setPostProcessing: (enabled) => sceneManager.setPostProcessing(enabled),
  focusSelection: focusTarget,
});

let contextLost = false;
let activeRenderScale = Math.min(window.devicePixelRatio, 1.1);
let lowFpsSamples = 0;
let highFpsSamples = 0;

let pointerStartX = 0;
let pointerStartY = 0;
canvas.addEventListener('pointerdown', (event) => {
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
});
canvas.addEventListener('pointerup', (event) => {
  const movement = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
  if (event.button !== 0 || movement > 5) return;
  const hits = raycastFromPointer(event, canvas, sceneManager.camera, builder.pickables);
  let target: DungeonPickTarget | null = null;
  for (const hit of hits) {
    target = builder.resolveIntersection(hit);
    if (target) break;
  }
  selectTarget(target);
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  contextLost = true;
  controlPanel.setStatus('图形上下文重建中…');
});
canvas.addEventListener('webglcontextrestored', () => {
  contextLost = false;
  sceneManager.resize(window.innerWidth, window.innerHeight);
  sceneManager.invalidateShadows();
  controlPanel.setStatus('图形上下文已恢复');
});

window.addEventListener('keydown', (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement) return;
  if (event.key.toLowerCase() === 'r') regenerate();
  if (event.key.toLowerCase() === 'f') focusTarget();
});

window.addEventListener('resize', () => {
  sceneManager.resize(window.innerWidth, window.innerHeight);
});

window.getDungeonData = (): DungeonData => {
  if (!currentData) throw new Error('Dungeon data is not initialized.');
  return structuredClone(currentData);
};
window.regenerate = (seed) => regenerate(seed);



const clock = new Clock();
let frameCount = 0;
let lastFpsSample = 0;
let currentFps = 60;

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  sceneManager.update();
  builder.update(elapsed);
  particles?.update(elapsed, delta);
  if (!contextLost) sceneManager.render();

  frameCount += 1;
  if (elapsed - lastFpsSample >= 0.5) {
    currentFps = frameCount / (elapsed - lastFpsSample);
    frameCount = 0;
    lastFpsSample = elapsed;
    if (currentFps < 42) {
      lowFpsSamples += 1;
      highFpsSamples = 0;
      if (lowFpsSamples >= 3 && activeRenderScale > 0.72) {
        activeRenderScale = Math.max(0.72, activeRenderScale - 0.12);
        sceneManager.setRenderScale(activeRenderScale);
        lowFpsSamples = 0;
      }
    } else if (currentFps > 56) {
      highFpsSamples += 1;
      lowFpsSamples = 0;
      const maxScale = Math.min(window.devicePixelRatio, 1.1);
      if (highFpsSamples >= 12 && activeRenderScale < maxScale) {
        activeRenderScale = Math.min(maxScale, activeRenderScale + 0.05);
        sceneManager.setRenderScale(activeRenderScale);
        highFpsSamples = 0;
      }
    }
    if (currentData) infoPanel.updateStats(currentData, currentFps);
  }
  requestAnimationFrame(animate);
}

const searchSeed = new URLSearchParams(window.location.search).get('seed');
regenerate(searchSeed ?? createEphemeralSeed());
requestAnimationFrame(animate);

window.addEventListener('beforeunload', () => {
  particles?.dispose();
  builder.dispose();
  sceneManager.dispose();
});



