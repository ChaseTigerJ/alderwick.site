import * as THREE from 'three';
import type { Season } from './Island';

export type EasterEggSettings = { enabled: boolean; intervalSeconds: number };
export type EasterEggName = 'shark' | 'fish' | 'ghost' | 'hand';
export const EASTER_EGG_DURATIONS = { shark: 8, fish: 3.6, ghost: 9, hand: 7 } as const;

const WATER_Y = -.95;
const TAU = Math.PI * 2;
const smooth = (value: number) => { const p = THREE.MathUtils.clamp(value, 0, 1); return p * p * (3 - 2 * p); };

/** Rare, self-contained visitors. The scheduler uses visible, unpaused scene time. */
export function createIslandEasterEggs(scene: THREE.Scene, model: THREE.Object3D, options: Partial<EasterEggSettings> & { random?: () => number } = {}) {
  const random = options.random ?? Math.random;
  const settings: EasterEggSettings = { enabled: options.enabled ?? true, intervalSeconds: THREE.MathUtils.clamp(options.intervalSeconds ?? 60, 20, 300) };
  const root = new THREE.Group(); root.name = 'IslandEasterEggs'; root.visible = settings.enabled; scene.add(root);
  const makeGroup = (name: string) => { const group = new THREE.Group(); group.name = name; group.visible = false; root.add(group); return group; };
  const shark = makeGroup('RareSharkFin'), fish = makeGroup('RareLeapingFish'), ghost = makeGroup('RareAutumnGhost'), hand = makeGroup('RareGraveHand');
  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material); object.name = name; object.position.set(x, y, z); parent.add(object); return object;
  };
  const seaDark = new THREE.MeshStandardMaterial({ color: 0x526a70, roughness: .77, flatShading: true });
  const fishSilver = new THREE.MeshStandardMaterial({ color: 0xb7cdc2, roughness: .53, metalness: .12, flatShading: true });
  const fishDark = new THREE.MeshStandardMaterial({ color: 0x405d60, roughness: .8, flatShading: true });
  const foam = new THREE.MeshBasicMaterial({ color: 0xd7eee6, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide });
  const ghostCloth = new THREE.MeshStandardMaterial({ color: 0xf6f1dc, roughness: 1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ghostEyes = new THREE.MeshBasicMaterial({ color: 0x293c38, transparent: true, opacity: 0, depthWrite: false });
  const handClay = new THREE.MeshStandardMaterial({ color: 0x98a28c, roughness: .95, flatShading: true });

  // The convex leading edge faces local -X; the concave trailing edge sweeps +X.
  // Keep that leading edge aligned with the swim tangent, unlike the +X-facing fish.
  const finProfile = new THREE.Shape(); finProfile.moveTo(-.25, -.07); finProfile.lineTo(.28, -.07); finProfile.quadraticCurveTo(.035, .09, .07, .44); finProfile.quadraticCurveTo(-.04, .38, -.25, -.07);
  const finGeometry = new THREE.ExtrudeGeometry(finProfile, { depth: .045, bevelEnabled: false, curveSegments: 5 }); finGeometry.translate(0, 0, -.0225);
  mesh(shark, 'SharkDorsalFin', finGeometry, seaDark);
  const wakeGeometry = new THREE.RingGeometry(.30, .32, 24, 1, .2, Math.PI * 1.55); wakeGeometry.rotateX(-Math.PI / 2);
  const wake = mesh(root, 'SharkSurfaceWake', wakeGeometry, foam); wake.visible = false;

  const fishBody = mesh(fish, 'SilverFishBody', new THREE.IcosahedronGeometry(1, 1), fishSilver); fishBody.scale.set(.24, .085, .065);
  const fishTailShape = new THREE.Shape(); fishTailShape.moveTo(0, 0); fishTailShape.lineTo(-.14, .115); fishTailShape.lineTo(-.14, -.115); fishTailShape.closePath();
  mesh(fish, 'SilverFishTail', new THREE.ShapeGeometry(fishTailShape), fishDark, -.19).material.side = THREE.DoubleSide;
  const eyeGeometry = new THREE.SphereGeometry(.013, 6, 4);
  mesh(fish, 'SilverFishEyeLeft', eyeGeometry, fishDark, .145, .02, .052);
  mesh(fish, 'SilverFishEyeRight', eyeGeometry, fishDark, .145, .02, -.052);
  const splash = mesh(root, 'FishLandingRipple', new THREE.RingGeometry(.18, .205, 28), foam.clone()); splash.geometry.rotateX(-Math.PI / 2); splash.visible = false;
  const droplets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.035, 0), foam, 6); droplets.name = 'FishLandingDrops'; droplets.visible = false; droplets.frustumCulled = false; root.add(droplets);
  const instance = new THREE.Object3D();

  // A softly scalloped sheet, with two little holes rather than a humanoid body.
  const clothProfile = [new THREE.Vector2(.27, .02), new THREE.Vector2(.23, .22), new THREE.Vector2(.19, .45), new THREE.Vector2(.17, .58), new THREE.Vector2(.11, .69), new THREE.Vector2(0, .72)];
  const clothGeometry = new THREE.LatheGeometry(clothProfile, 18);
  const clothPositions = clothGeometry.getAttribute('position');
  for (let i = 0; i < clothPositions.count; i++) {
    const y = clothPositions.getY(i), a = Math.atan2(clothPositions.getX(i), clothPositions.getZ(i));
    if (y < .1) clothPositions.setY(i, y + Math.cos(a * 6) * .045);
  }
  clothGeometry.computeVertexNormals();
  mesh(ghost, 'GhostScallopedSheet', clothGeometry, ghostCloth);
  const ghostEyeGeometry = new THREE.SphereGeometry(1, 8, 6);
  for (const side of [-1, 1]) { const eye = mesh(ghost, side < 0 ? 'GhostLeftEye' : 'GhostRightEye', ghostEyeGeometry, ghostEyes, side * .064, .53, .167); eye.scale.set(.03, .053, .012); }

  // A small, storybook clay hand. Its root stays below the turf while it reaches.
  mesh(hand, 'GraveHandWrist', new THREE.CylinderGeometry(.045, .058, .26, 7), handClay, 0, .13);
  const palm = mesh(hand, 'GraveHandPalm', new THREE.IcosahedronGeometry(1, 1), handClay, 0, .32); palm.scale.set(.1, .125, .04);
  const fingers: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Group(); finger.name = `GraveHandFinger_${i}`; finger.position.set((i - 1.5) * .044, .40, 0); finger.rotation.z = (1.5 - i) * .09; hand.add(finger); fingers.push(finger);
    const length = [ .13, .19, .18, .13 ][i];
    mesh(finger, `GraveHandFingerSegment_${i}`, new THREE.CapsuleGeometry(.018, length, 2, 5), handClay, 0, length / 2);
  }
  const thumb = mesh(hand, 'GraveHandThumb', new THREE.CapsuleGeometry(.024, .12, 2, 5), handClay, -.12, .34); thumb.rotation.z = .95;

  model.updateMatrixWorld(true);
  const graveAnchor = model.getObjectByName('GraveHandAnchor'), ghostAnchor = model.getObjectByName('BackIslandGhostAnchor');
  const graveOrigin = graveAnchor?.getWorldPosition(new THREE.Vector3()), ghostOrigin = ghostAnchor?.getWorldPosition(new THREE.Vector3());
  const ground = new THREE.Box3(); const vertex = new THREE.Vector3();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (!materials.some(material => material.name === 'grass_ground')) return;
    const position = object.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) ground.expandByPoint(vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld));
  });
  if (ground.isEmpty()) { ground.min.set(-5.85, -.1, -4.4); ground.max.set(5.85, .1, 4.4); }
  const shipObject = model.getObjectByName('MerchantShip'), shipBounds = shipObject ? new THREE.Box3().setFromObject(shipObject).expandByScalar(.55) : null;
  const inFootprint = (bounds: THREE.Box3, x: number, z: number, margin: number) => x > bounds.min.x - margin && x < bounds.max.x + margin && z > bounds.min.z - margin && z < bounds.max.z + margin;
  // These paths remain in the open western water, opposite the dock and ship.
  // Inspect actual meadow/ship extents once; skip sea visitors if future edits fill this lane.
  let safeWater = true;
  for (let i = 0; i <= 24; i++) {
    const angle = Math.PI - .36 + i / 24 * .72, x = Math.cos(angle) * 7.25, z = Math.sin(angle) * 7.25;
    if (inFootprint(ground, x, z, .55) || (shipBounds && inFootprint(shipBounds, x, z, .25))) safeWater = false;
  }
  const ordinary: EasterEggName[] = safeWater ? ['shark', 'fish'] : [];
  if (graveOrigin) ordinary.push('hand');
  const autumn: EasterEggName[] = [...ordinary]; if (ghostOrigin) autumn.push('ghost');
  const actors = { shark, fish, ghost, hand };
  let active: EasterEggName | null = null, elapsed = 0, waiting = settings.intervalSeconds * (.75 + random() * .75);
  let radius = 7.35, startAngle = Math.PI - .3, endAngle = Math.PI + .3;

  function hide() { shark.visible = fish.visible = ghost.visible = hand.visible = wake.visible = splash.visible = droplets.visible = false; }
  function finish() { hide(); active = null; elapsed = 0; waiting = settings.intervalSeconds * (.75 + random() * .75); }
  function configure(next: Partial<EasterEggSettings>) {
    if (typeof next.intervalSeconds === 'number' && Number.isFinite(next.intervalSeconds)) {
      const interval = THREE.MathUtils.clamp(next.intervalSeconds, 20, 300);
      waiting *= interval / settings.intervalSeconds; settings.intervalSeconds = interval;
    }
    if (typeof next.enabled === 'boolean' && next.enabled !== settings.enabled) { settings.enabled = next.enabled; finish(); }
    root.visible = settings.enabled;
  }
  function pose() {
    if (active === 'shark') {
      const p = elapsed / EASTER_EGG_DURATIONS.shark, a = THREE.MathUtils.lerp(startAngle, endAngle, p);
      const emerge = smooth(elapsed / 1.2) * smooth((EASTER_EGG_DURATIONS.shark - elapsed) / 1.4);
      shark.position.set(Math.cos(a) * radius, WATER_Y - .47 * (1 - emerge), Math.sin(a) * radius);
      shark.rotation.y = -a + Math.PI / 2;
      wake.visible = emerge > .2; wake.position.set(shark.position.x + Math.sin(a) * .16, WATER_Y + .012, shark.position.z - Math.cos(a) * .16); wake.rotation.y = -a; wake.scale.set(.75 + emerge * .4, 1, 1.4);
    } else if (active === 'fish') {
      const flight = 2.1, p = THREE.MathUtils.clamp(elapsed / flight, 0, 1), a = THREE.MathUtils.lerp(startAngle, endAngle, p);
      fish.visible = elapsed < flight;
      fish.position.set(Math.cos(a) * radius, WATER_Y - .14 + Math.sin(p * Math.PI) * .95, Math.sin(a) * radius);
      fish.rotation.set(0, -a - Math.PI / 2, Math.atan2(Math.cos(p * Math.PI) * .95 * Math.PI, radius * (endAngle - startAngle)));
      const landing = elapsed - flight;
      splash.visible = droplets.visible = landing >= 0;
      if (landing >= 0) {
        splash.position.set(Math.cos(endAngle) * radius, WATER_Y + .013, Math.sin(endAngle) * radius); splash.scale.setScalar(1 + landing * 3.2);
        (splash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - landing / 1.5) * .4);
        for (let i = 0; i < 6; i++) {
          const direction = i / 6 * TAU, t = Math.min(.65, landing), size = Math.max(0, 1 - landing / .65);
          instance.position.set(splash.position.x + Math.cos(direction) * t * .6, WATER_Y + .025 + Math.sin(t / .65 * Math.PI) * .25, splash.position.z + Math.sin(direction) * t * .6);
          instance.scale.setScalar(size); instance.updateMatrix(); droplets.setMatrixAt(i, instance.matrix);
        }
        droplets.instanceMatrix.needsUpdate = true;
      }
    } else if (active === 'ghost' && ghostOrigin) {
      const p = elapsed / EASTER_EGG_DURATIONS.ghost;
      ghost.position.copy(ghostOrigin); ghost.position.x += Math.sin(p * TAU - Math.PI / 2) * .50; ghost.position.z += Math.sin(p * TAU) * .10; ghost.position.y += .12 + Math.sin(elapsed * 2.2) * .035;
      ghost.rotation.set(0, Math.PI + Math.sin(elapsed * .85) * .38, Math.sin(elapsed * 1.4) * .075);
      const fade = smooth(elapsed / 1.2) * smooth((EASTER_EGG_DURATIONS.ghost - elapsed) / 1.5);
      ghostCloth.opacity = fade * .88; ghostEyes.opacity = fade;
    } else if (active === 'hand' && graveOrigin) {
      const reach = smooth(elapsed / 1.8) * smooth((EASTER_EGG_DURATIONS.hand - elapsed) / 1.8);
      hand.position.copy(graveOrigin); hand.position.y += -.72 + reach * .69;
      hand.rotation.set(Math.sin(elapsed * 2.4) * .10 * reach, Math.PI, Math.sin(elapsed * 2) * .12 * reach);
      for (let i = 0; i < fingers.length; i++) fingers[i].rotation.x = -.15 - (1 + Math.sin(elapsed * 3 + i * .8)) * .22 * reach;
    }
  }
  function update(delta: number, motion: boolean, season: Season) {
    if (active === 'ghost' && season !== 'autumn') finish();
    if (!settings.enabled || !motion || !Number.isFinite(delta) || delta <= 0) return;
    const step = Math.min(delta, .1);
    if (active) {
      elapsed += step;
      if (elapsed >= EASTER_EGG_DURATIONS[active]) finish(); else pose();
      return;
    }
    waiting -= step;
    if (waiting > 0) return;
    const choices = season === 'autumn' ? autumn : ordinary;
    if (!choices.length) { waiting = settings.intervalSeconds; return; }
    active = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]; elapsed = 0; hide(); actors[active].visible = true;
    radius = 7.25 + random() * .2;
    startAngle = Math.PI - .30 + random() * .06; endAngle = active === 'fish' ? startAngle + .19 : Math.PI + .24 + random() * .06;
    pose();
  }
  return { root, configure, update, get activeEvent() { return active; } };
}
