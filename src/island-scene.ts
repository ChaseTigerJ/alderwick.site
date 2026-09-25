import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Season } from './Island';
export type IslandController = { rotate: (amount: number) => void; zoom: (amount: number) => void; reset: () => void; dispose: () => void };
type State = { night: boolean; season: Season; paused: boolean; reducedMotion: boolean; found: number[] };
export async function createIsland(host: HTMLDivElement, pins: (HTMLButtonElement | null)[], state: () => State): Promise<IslandController> {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => event.preventDefault());
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.set(13, 13, 19);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = .55;
  controls.maxPolarAngle = 1.35;
  controls.rotateSpeed = .48;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const sun = new THREE.DirectionalLight(0xffe4b8, 3);
  sun.position.set(-8, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, far: 50 });
  sun.shadow.normalBias = .045;
  sun.shadow.bias = -.0002;
  scene.add(sun);
  const ambient = new THREE.HemisphereLight(0xfff6de, 0x8d927c, 1.5); scene.add(ambient);
  const rim = new THREE.DirectionalLight(0xb8d6d0, 1.2); rim.position.set(5, 5, -8); scene.add(rim);
  let model;
  try {
    model = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/alderwick-island.glb`);
  } catch (error) {
    controls.dispose(); renderer.dispose(); renderer.domElement.remove();
    throw error;
  }
  scene.add(model.scene);
  const materials: { material: THREE.MeshStandardMaterial; base: THREE.Color; name: string }[] = [];
  const seen = new Set<THREE.Material>();
  model.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true; object.receiveShadow = true;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const m of list) {
      if (m instanceof THREE.MeshStandardMaterial && !seen.has(m)) {
        seen.add(m); materials.push({ material: m, base: m.color.clone(), name: m.name.toLowerCase() });
        m.roughness = Math.max(m.roughness, .65);
      }
    }
  });
  // A gently moving, shallow sea surrounds the Blender-authored island.
  const waterGeo = new THREE.CylinderGeometry(8.4, 8.15, .35, 96, 1);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x62a9a2, roughness: .42, metalness: .05, flatShading: true });
  const water = new THREE.Mesh(waterGeo, waterMat); water.position.y = -1.15; water.receiveShadow = true; scene.add(water);
  const surfaceGeo = new THREE.CircleGeometry(8.35, 96); surfaceGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(surfaceGeo, new THREE.MeshStandardMaterial({ color: 0x6fb7ac, roughness: .5, transparent: true, opacity: .46, side: THREE.DoubleSide }));
  sea.position.y = -.965; scene.add(sea);
  const ripples: THREE.Mesh[] = [];
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xd6ede3, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 32; i++) {
    const angle = (i * 2.39996); const radius = 5.6 + (i % 5) * .48;
    const g = new THREE.PlaneGeometry(.15 + (i % 4) * .12, .024);
    const ripple = new THREE.Mesh(g, rippleMat); ripple.rotation.x = -Math.PI / 2; ripple.rotation.z = angle * .12;
    ripple.position.set(Math.cos(angle) * radius, -.94, Math.sin(angle) * radius); ripples.push(ripple); scene.add(ripple);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .10 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.6; shadow.receiveShadow = true; scene.add(shadow);
  const smoke: THREE.Mesh[] = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xeee7d6, transparent: true, opacity: .22, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(.1 + i * .025, 1), smokeMat);
    puff.position.set(-1.5 + i * .055, 3 + i * .24, .2); smoke.push(puff); scene.add(puff);
  }
  const stars = new THREE.BufferGeometry(); const starPoints = [];
  for (let i = 0; i < 50; i++) { const a = i * 2.3999; starPoints.push(Math.cos(a) * (7 + i % 6), 4 + (i % 9) * .6, Math.sin(a) * (7 + i % 6)); }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffe4a0, size: .065, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(stars, starMat));
  const locations = [new THREE.Vector3(-1.9, 2.6, .5), new THREE.Vector3(2.5, 1.2, 1.7), new THREE.Vector3(3.2, .2, 4.7)];
  const project = new THREE.Vector3();
  let width = 1, height = 1, disposed = false, frame = 0, t = 0, last = performance.now(), nightMix = 0, lastSeason: Season | '' = '';
  let visible = true, sceneDirty = true, lastRender = 0;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sceneDirty = true; }, { rootMargin: '100px' }); observer.observe(host);
  const resize = new ResizeObserver(() => {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); sceneDirty = true;
  }); resize.observe(host);
  const dayWater = new THREE.Color(0x62a9a2), nightWater = new THREE.Color(0x254e60);
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (now - lastRender < 30) return;
    lastRender = now;
    const delta = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden) return;
    const s = state(), motion = !s.paused && !s.reducedMotion;
    if (motion) t += delta;
    controls.autoRotate = motion; controls.autoRotateSpeed = .22; const controlsChanged = controls.update(delta);
    const lightChanging = Math.abs(nightMix - (s.night ? 1 : 0)) > .001;
    if (!motion && !controlsChanged && !sceneDirty && !lightChanging && lastSeason === s.season) return;
    sceneDirty = false;
    nightMix = THREE.MathUtils.damp(nightMix, s.night ? 1 : 0, s.reducedMotion ? 100 : 3, delta);
    sun.intensity = THREE.MathUtils.lerp(3, .5, nightMix);
    sun.color.setRGB(1 - nightMix * .42, .86 - nightMix * .16, .68 + nightMix * .32);
    ambient.intensity = THREE.MathUtils.lerp(1.5, .75, nightMix);
    ambient.color.set(s.night ? 0xadc5ff : 0xfff6de);
    rim.intensity = THREE.MathUtils.lerp(1.2, 1.6, nightMix);
    waterMat.color.copy(dayWater).lerp(nightWater, nightMix);
    starMat.opacity = nightMix * .8;
    if (lastSeason !== s.season) {
      lastSeason = s.season;
      for (const { material, base, name } of materials) {
        material.color.copy(base);
        if (/leaf|foliage|canopy|grass|green|ground/.test(name)) {
          if (s.season === 'winter') material.color.lerp(new THREE.Color(0xdfebe1), .88);
          if (s.season === 'summer' && /leaf|foliage|canopy|grass/.test(name)) material.color.lerp(new THREE.Color(0x589045), .73);
        }
        if (s.season === 'winter' && /roof/.test(name)) material.color.lerp(new THREE.Color(0xf6f1df), .8);
      }
    }
    for (const { material, name } of materials) if (/window|glow|lantern/.test(name)) { material.emissive.set(0xffb948); material.emissiveIntensity = .2 + nightMix * 2.3; }
    ripples.forEach((r, i) => { r.scale.x = 1 + Math.sin(t * .7 + i) * .2; });
    smoke.forEach((p, i) => { p.position.y = 3 + ((i * .24 + t * .19) % 1.7); p.position.x = -1.5 + (p.position.y - 3) * .28; });
    pins.forEach((pin, i) => { if (!pin) return; project.copy(locations[i]).project(camera); pin.style.transform = `translate(${(project.x * .5 + .5) * width}px, ${(-project.y * .5 + .5) * height}px) translate(-50%, -50%)`; });
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    rotate(amount) { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), amount); camera.position.copy(controls.target).add(offset); controls.update(); sceneDirty = true; },
    zoom(amount) { const offset = camera.position.clone().sub(controls.target); offset.multiplyScalar(amount).clampLength(16, 36); camera.position.copy(controls.target).add(offset); controls.update(); sceneDirty = true; },
    reset() { camera.position.set(13, 13, 19); controls.target.set(0, .7, 0); controls.update(); sceneDirty = true; },
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); controls.dispose(); scene.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) { obj.geometry.dispose(); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); }
  };
}
