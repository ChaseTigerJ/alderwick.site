import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandOrbit } from './island-orbit';
import { createIslandLife } from './island-life';
import { createIslandAtmosphere } from './island-atmosphere';
import { attachIslandInteractions } from './island-interactions';
import { createBellChime } from './island-sound';
import { attachIslandDrag } from './island-drag';
import { createIslandIdleMotion } from './island-idle';
import { createIslandFlames } from './island-flames';
import { createIslandFlags } from './island-flags';
import { createIslandBreeze } from './island-breeze';
import { createIslandLighting, renderIslandFrame } from './island-render';
import { createIslandWater } from './island-water';
import { createIslandEasterEggs } from './island-easter-eggs';
import type { WorldSettings } from './site-config';
import type { Season } from './Island';

export type IslandController = { rotate: (amount: number) => void; zoom: (amount: number) => void; reset: () => void; dispose: () => void };
type State = { night: boolean; season: Season; paused: boolean; reducedMotion: boolean; found: number[]; worldSettings: WorldSettings; action?: { id: number; nonce: number } | null };
export async function createIsland(host: HTMLDivElement, state: () => State, discover: (id: number) => void): Promise<IslandController> {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement; host.appendChild(canvas);
  canvas.addEventListener('webglcontextlost', event => event.preventDefault());
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 120); camera.position.set(13, 13, 19);
  const controls = createIslandOrbit(camera, canvas);
  let sceneDirty = true;
  const offset = new THREE.Vector3(), spherical = new THREE.Spherical();
  spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
  const seconds = () => performance.now() / 1000;
  const idleMotion = createIslandIdleMotion(spherical.phi, seconds());
  const activity = () => idleMotion.activity(seconds());
  let shakeWorld = (_dx: number, _dy: number) => {};
  const removeDrag = attachIslandDrag(canvas, (dx, dy) => shakeWorld(dx, dy), {
    begin: id => idleMotion.begin(id, seconds()),
    end: id => idleMotion.end(id, seconds()),
    cancel: () => idleMotion.cancel(seconds()),
  });
  const orbitKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home']);
  const keyDown = (event: KeyboardEvent) => { if (orbitKeys.has(event.key)) idleMotion.begin(`key:${event.code || event.key}`, seconds()); };
  const keyUp = (event: KeyboardEvent) => { if (orbitKeys.has(event.key)) idleMotion.end(`key:${event.code || event.key}`, seconds()); };
  canvas.addEventListener('wheel', activity, { passive: true, capture: true });
  host.addEventListener('keydown', keyDown, true); window.addEventListener('keyup', keyUp);
  const onControlsChange = () => { sceneDirty = true; };
  controls.addEventListener('change', onControlsChange);
  const lighting = createIslandLighting(scene, window.matchMedia('(pointer: coarse)').matches);
  function removeControls() {
    removeDrag();
    controls.removeEventListener('change', onControlsChange); controls.dispose();
    canvas.removeEventListener('wheel', activity, true);
    host.removeEventListener('keydown', keyDown, true); window.removeEventListener('keyup', keyUp);
  }
  let model;
  try { model = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/alderwick-island.glb?v=${__ISLAND_MODEL_VERSION__}`); }
  catch (error) { removeControls(); lighting.dispose(); renderer.dispose(); canvas.remove(); throw error; }
  scene.add(model.scene); model.scene.updateMatrixWorld(true);
  const materials: { material: THREE.MeshStandardMaterial; base: THREE.Color; name: string }[] = [];
  const seen = new Set<THREE.Material>();
  model.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true; object.receiveShadow = true;
    // Poses change the skin's bounds. She is small enough to keep renderable;
    // picking computes fresh bounds on demand, without per-frame CPU skinning.
    if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false;
    for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
      if (m instanceof THREE.MeshStandardMaterial && !seen.has(m)) {
        seen.add(m); materials.push({ material: m, base: m.color.clone(), name: m.name.toLowerCase() }); m.roughness = Math.max(m.roughness, .65);
      }
    }
  });
  const life = createIslandLife(scene, model.scene, model.animations);
  const atmosphere = createIslandAtmosphere(scene, model.scene);
  const flames = createIslandFlames(model.scene);
  const flags = createIslandFlags(model.scene);
  const breeze = createIslandBreeze(model.scene);
  const easterEggs = createIslandEasterEggs(scene, model.scene);
  shakeWorld = (dx, dy) => {
    const s = state();
    if (s.season === 'winter' && !s.paused && !s.reducedMotion && s.worldSettings.animationEnabled && s.worldSettings.effectsEnabled && s.worldSettings.shakeEnabled) atmosphere.shake(dx, dy);
  };
  const bellChime = createBellChime();
  let clickedTree: THREE.Vector3 | undefined;
  const removeInteractions = attachIslandInteractions(host, canvas, camera, model.scene, (id, point) => {
    if (!state().worldSettings.discoveriesEnabled) return;
    if (id === 5 && t - lastRustle <= 5) return;
    if (!life.isActive(id)) { clickedTree = point?.clone(); discover(id); }
  });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x62a9a2, roughness: .42, metalness: .05, flatShading: true });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.15, .35, 96, 1), waterMat); water.position.y = -1.15; water.receiveShadow = true; scene.add(water);
  const surfaceGeo = new THREE.CircleGeometry(8.35, 96); surfaceGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(surfaceGeo, new THREE.MeshStandardMaterial({ color: 0x6fb7ac, roughness: .5, transparent: true, opacity: .46, side: THREE.DoubleSide })); sea.position.y = -.965; scene.add(sea);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .10 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.6; shadow.receiveShadow = true; scene.add(shadow);

  const smoke: { mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>; origin: THREE.Vector3; phase: number }[] = [];
  model.scene.traverse(object => {
    const origin = new THREE.Vector3();
    if (object.name.startsWith('ChimneySmoke_')) {
      object.getWorldPosition(origin);
      const index = Number(object.name.split('_').pop());
      for (let i = 0; i < 7; i++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xe1ddcf, transparent: true, opacity: .2, depthWrite: false }));
        scene.add(puff); smoke.push({ mesh: puff, origin: origin.clone(), phase: i / 7 + index * .16 });
      }
    }
  });
  const starPoints: number[] = [];
  for (let i = 0; i < 50; i++) { const a = i * 2.3999; starPoints.push(Math.cos(a) * (7 + i % 6), 4 + (i % 9) * .6, Math.sin(a) * (7 + i % 6)); }
  const stars = new THREE.BufferGeometry(); stars.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffe4a0, size: .065, transparent: true, opacity: 0 }); const starField = new THREE.Points(stars, starMat); scene.add(starField);
  const reflectionExclusions = [
    water, sea, shadow, starField, ...smoke.map(puff => puff.mesh),
    ...['WinterSnowglobe', 'IrregularShoreFoam', 'CoastalWavelets', 'DockPostFoam', 'MerchantShipWaterlineFoam', 'ShoreSplashes']
      .map(name => scene.getObjectByName(name)).filter((object): object is THREE.Object3D => !!object),
  ];
  const reflection = createIslandWater(scene, { excluded: reflectionExclusions });
  let width = 1, height = 1, disposed = false, frame = 0, t = 0, last = performance.now(), lastSeason: Season | '' = '';
  let nightMix = state().night ? 1 : 0, visible = true, lastRender = 0, lastAction = -1, viewScale = 1, lastRustle = -100;
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sceneDirty = true; }, { rootMargin: '100px' }); observer.observe(host);
  const resize = new ResizeObserver(() => {
    width = host.clientWidth; height = host.clientHeight; if (!width || !height) return;
    const fit = Math.max(1, 390 / window.innerWidth);
    offset.copy(camera.position).sub(controls.target).multiplyScalar(fit / viewScale); camera.position.copy(controls.target).add(offset); viewScale = fit;
    camera.aspect = width / height;
    // The canvas spans the hero so enlarged scenery can flow behind the copy.
    // Offset projection retains the island's right-hand composition without clipping it at the text column.
    if (window.innerWidth > 800) camera.setViewOffset(width, height, -width * .16, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix(); renderer.setSize(width, height);
    reflection.resize(width, height, renderer.getPixelRatio(), window.matchMedia('(pointer: coarse)').matches); sceneDirty = true;
  }); resize.observe(host);
  let lastWorldSettings: WorldSettings | null = null;
  const dayWater = new THREE.Color(0x62a9a2), nightWater = new THREE.Color(0x183749);
  const winterColor = new THREE.Color(0xdfebe1), roofSnow = new THREE.Color(0xf6f1df), summerGreen = new THREE.Color(0x589045), springGreen = new THREE.Color(0x91ab67);
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (now - lastRender < 30) return;
    lastRender = now; const delta = THREE.MathUtils.clamp((now - last) / 1000, 0, .05); last = now;
    if (!visible || document.hidden) { idleMotion.suspend(now / 1000); return; }
    const s = state(), motion = !s.paused && !s.reducedMotion && s.worldSettings.animationEnabled;
    if (s.worldSettings !== lastWorldSettings) {
      atmosphere.configure(s.worldSettings);
      easterEggs.configure({ enabled: s.worldSettings.easterEggsEnabled && s.worldSettings.effectsEnabled, intervalSeconds: s.worldSettings.easterEggIntervalSeconds });
      lastWorldSettings = s.worldSettings; sceneDirty = true;
    }
    if (s.action && s.action.nonce !== lastAction) {
      lastAction = s.action.nonce; activity();
      if (!s.worldSettings.discoveriesEnabled) { /* Preserve the nonce without triggering disabled discoveries. */ }
      else if (s.action.id === 5) {
        if (t - lastRustle > 5 || !motion) { atmosphere.rustleTrees(clickedTree); clickedTree = undefined; lastRustle = t; }
      } else if (life.trigger(s.action.id, !motion) && s.action.id === 3 && s.worldSettings.soundEnabled) bellChime.play();
      sceneDirty = true; renderer.shadowMap.needsUpdate = true;
    }
    if (motion) t += delta;
    spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
    const drift = idleMotion.step(now / 1000, delta, spherical.phi, motion);
    if (drift.azimuth || drift.polar !== spherical.phi) {
      spherical.theta += drift.azimuth; spherical.phi = drift.polar;
      offset.setFromSpherical(spherical); camera.position.copy(controls.target).add(offset);
    }
    const controlsChanged = controls.update(delta);
    const lightChanging = Math.abs(nightMix - (s.night ? 1 : 0)) > .001;
    if (!motion && !controlsChanged && !sceneDirty && !lightChanging && lastSeason === s.season) return;
    sceneDirty = false;
    nightMix = THREE.MathUtils.damp(nightMix, s.night ? 1 : 0, s.reducedMotion ? 100 : 3, delta);
    lighting.update(nightMix);
    waterMat.color.copy(dayWater).lerp(nightWater, nightMix); starMat.opacity = s.worldSettings.effectsEnabled ? nightMix * .8 : 0;
    if (lastSeason !== s.season) {
      lastSeason = s.season;
      for (const { material, base, name } of materials) {
        material.color.copy(base);
        if (/leaf|foliage|canopy|grass|green|ground/.test(name)) {
          if (s.season === 'winter') material.color.lerp(winterColor, .9);
          if (s.season === 'summer' && /leaf|foliage|canopy|grass/.test(name)) material.color.lerp(summerGreen, .73);
          if (s.season === 'spring' && /leaf|foliage|canopy|grass/.test(name)) material.color.lerp(springGreen, .8);
        }
        if (s.season === 'winter' && /roof/.test(name)) material.color.lerp(roofSnow, .8);
        if (s.season === 'winter' && name === 'sand') material.color.lerp(winterColor, .86);
      }
    }
    const flutter = s.reducedMotion ? 1 : 1 + Math.sin(t * 6.3) * .035 + Math.sin(t * 11.7) * .025;
    for (const { material, name } of materials) if (/window|glow|lantern/.test(name)) { material.emissive.set(0xffb948); material.emissiveIntensity = .06 + nightMix * 1.1 * s.worldSettings.flameIntensity * flutter; }
    flames.update(t, nightMix, s.worldSettings.flameIntensity, !s.reducedMotion);
    flags.update(t);
    breeze.update(t);
    smoke.forEach(({ mesh, origin, phase }) => {
      mesh.visible = s.worldSettings.effectsEnabled;
      const age = ((phase + t * .115) % 1), rise = age * 1.65;
      mesh.position.copy(origin); mesh.position.y += .045 + rise;
      mesh.position.x += rise * .27 + Math.sin(age * 5 + phase) * .035 * age; mesh.position.z += rise * .08;
      mesh.scale.setScalar(.065 + age * .18); mesh.material.opacity = Math.sin(age * Math.PI) * (1 - age) * .27;
    });
    life.update(delta, motion, s.season === 'winter', camera);
    atmosphere.update(delta, motion, s.season, nightMix);
    easterEggs.update(delta, motion, s.season);
    reflection.update(t, nightMix, s.worldSettings.effectsEnabled);
    renderIslandFrame(renderer, scene, camera, () => reflection.capture(renderer, camera));
  }
  frame = requestAnimationFrame(animate);
  return {
    rotate(amount) { activity(); offset.copy(camera.position).sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), amount); camera.position.copy(controls.target).add(offset); controls.update(); sceneDirty = true; },
    zoom(amount) { activity(); offset.copy(camera.position).sub(controls.target).multiplyScalar(amount).clampLength(10, 35); camera.position.copy(controls.target).add(offset); controls.update(); sceneDirty = true; },
    reset() { activity(); controls.target.set(0, .7, 0); camera.position.set(13, 13, 19).sub(controls.target).multiplyScalar(viewScale).add(controls.target); controls.update(); sceneDirty = true; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); removeInteractions(); bellChime.dispose(); removeControls(); reflection.dispose(); life.dispose();
      const geometries = new Set<THREE.BufferGeometry>(), disposableMaterials = new Set<THREE.Material>(), skeletons = new Set<THREE.Skeleton>();
      scene.traverse(obj => { if (obj instanceof THREE.SkinnedMesh) skeletons.add(obj.skeleton); if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) { geometries.add(obj.geometry); for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) disposableMaterials.add(material); } });
      skeletons.forEach(skeleton => skeleton.dispose()); geometries.forEach(geometry => geometry.dispose()); disposableMaterials.forEach(material => material.dispose()); lighting.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
