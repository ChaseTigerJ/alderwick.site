import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createIslandWater } from '../src/island-water.ts';

/** Renderer state and pass-order fixture; pixel appearance is checked in the browser. */
function fakeRenderer(pixelRatio = 1) {
  let target: THREE.WebGLRenderTarget | null = null, face = 2, mip = 1;
  const viewport = new THREE.Vector4(4, 7, 800, 600), scissor = new THREE.Vector4(1, 2, 650, 500);
  const physicalViewport = viewport.clone().multiplyScalar(pixelRatio);
  const color = new THREE.Color(0x244060); let alpha = .7, scissorTest = true;
  const draws: { target: THREE.WebGLRenderTarget | null; camera: THREE.PerspectiveCamera }[] = [];
  let shadowPasses = 0, onRender = (_scene: THREE.Scene, _camera: THREE.PerspectiveCamera) => {};
  const renderer = {
    autoClear: false, xr: { enabled: true }, shadowMap: { autoUpdate: false, needsUpdate: true },
    state: { buffers: { depth: { setMask(_value: boolean) {} } } },
    getRenderTarget: () => target,
    getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(value: THREE.WebGLRenderTarget | null, nextFace = 0, nextMip = 0) { target = value; face = nextFace; mip = nextMip; if (value) physicalViewport.copy(value.viewport); else physicalViewport.copy(viewport).multiplyScalar(pixelRatio); },
    getViewport: (value: THREE.Vector4) => value.copy(viewport),
    setViewport(x: number | THREE.Vector4, y?: number, w?: number, h?: number) { if (typeof x === 'number') viewport.set(x, y!, w!, h!); else viewport.copy(x); physicalViewport.copy(viewport).multiplyScalar(pixelRatio); },
    getScissor: (value: THREE.Vector4) => value.copy(scissor), setScissor: (value: THREE.Vector4) => scissor.copy(value),
    getScissorTest: () => scissorTest, setScissorTest(value: boolean) { scissorTest = value; },
    getClearColor: (value: THREE.Color) => value.copy(color), getClearAlpha: () => alpha,
    setClearColor(value: THREE.ColorRepresentation, nextAlpha = 1) { color.set(value); alpha = nextAlpha; },
    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
      if (this.shadowMap.autoUpdate || this.shadowMap.needsUpdate) { shadowPasses++; this.shadowMap.needsUpdate = false; }
      draws.push({ target, camera: camera.clone() }); onRender(scene, camera);
    },
  };
  return {
    renderer: renderer as unknown as THREE.WebGLRenderer, draws,
    inspect: () => ({ target, face, mip, viewport: viewport.toArray(), physicalViewport: physicalViewport.toArray(), scissor: scissor.toArray(), scissorTest, color: color.getHex(), alpha, xr: renderer.xr.enabled, autoClear: renderer.autoClear, shadowAuto: renderer.shadowMap.autoUpdate }),
    onRender(callback: typeof onRender) { onRender = callback; },
    get shadowPasses() { return shadowPasses; },
  };
}
function fixture() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1.5, .1, 120);
  camera.position.set(13, 13, 19); camera.lookAt(0, .7, 0); camera.setViewOffset(1200, 800, -192, 0, 1200, 800); camera.updateMatrixWorld();
  const water = createIslandWater(scene); water.update(0, 0, true);
  return { scene, camera, water, fake: fakeRenderer() };
}

test('the reflected camera preserves the offset hero projection and clips everything below the waterline', () => {
  const { camera, water, fake } = fixture(), originalProjection = camera.projectionMatrix.toArray(), originalPose = camera.matrixWorld.toArray();
  water.capture(fake.renderer, camera);
  const reflected = fake.draws[0].camera, height = water.surface.position.y;
  assert.ok(Math.abs(reflected.position.y - (2 * height - camera.position.y)) < 1e-10);
  for (const point of [new THREE.Vector3(-2, 3, 1), new THREE.Vector3(4, 1, 5), new THREE.Vector3(0, 5, -3)]) {
    const actual = point.clone().project(reflected), mirrored = point.clone(); mirrored.y = 2 * height - mirrored.y;
    // Follow the main-camera ray toward the mirrored object until it hits water.
    // Its texture projection must sample the object in the reflected camera.
    const ray = mirrored.sub(camera.position), hit = camera.position.clone().addScaledVector(ray, (height - camera.position.y) / ray.y);
    const projected = new THREE.Vector4(hit.x, hit.y - height, hit.z, 1).applyMatrix4(water.surface.material.uniforms.textureMatrix.value);
    assert.ok(Math.abs(projected.x / projected.w - (actual.x * .5 + .5)) < 1e-10 && Math.abs(projected.y / projected.w - (actual.y * .5 + .5)) < 1e-10, 'the water samples the right scene position even with camera.setViewOffset');
  }
  const above = new THREE.Vector4(0, height + .25, 0, 1).applyMatrix4(reflected.matrixWorldInverse).applyMatrix4(reflected.projectionMatrix);
  const below = new THREE.Vector4(0, height - .25, 0, 1).applyMatrix4(reflected.matrixWorldInverse).applyMatrix4(reflected.projectionMatrix);
  assert.ok(above.z > -above.w, 'above-water scenery is inside the near clipping plane');
  assert.ok(below.z < -below.w, 'underwater geometry is outside the near clipping plane');
  assert.deepEqual(camera.projectionMatrix.toArray(), originalProjection); assert.deepEqual(camera.matrixWorld.toArray(), originalPose);
  assert.ok(reflected.projectionMatrix.clone().multiply(reflected.projectionMatrixInverse).equals(new THREE.Matrix4()) || reflected.projectionMatrix.clone().multiply(reflected.projectionMatrixInverse).elements.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-10));
  water.dispose();
});

test('the capture uses current animated transforms, updates shadows once, and restores excluded objects and render state', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1.5, .1, 120); camera.position.set(10, 12, 16); camera.lookAt(0, 0, 0);
  scene.background = new THREE.Color(0xabcabc);
  const background = scene.background, boat = new THREE.Group(), sea = new THREE.Group(), globe = new THREE.Group(); globe.visible = false; scene.add(boat, sea, globe);
  const water = createIslandWater(scene, { excluded: [sea, globe, sea] }), fake = fakeRenderer(), originalState = fake.inspect();
  water.update(15, 1, true); boat.position.set(3, 1, 5); boat.rotation.z = .08;
  fake.onRender((capturedScene, capturedCamera) => {
    if (capturedCamera === camera) return;
    assert.equal(water.surface.visible, false); assert.equal(sea.visible, false); assert.equal(globe.visible, false);
    assert.equal(capturedScene.background, null); assert.equal(boat.visible, true);
    assert.ok(boat.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(3, 1, 5)) < 1e-10, 'reflection uses this frame’s boat pose');
    assert.equal(fake.renderer.getClearAlpha(), 0, 'empty water remains transparent, never a reflected sky disk');
  });
  assert.equal(water.capture(fake.renderer, camera), true);
  assert.deepEqual(fake.inspect(), originalState); assert.equal(scene.background, background);
  assert.equal(water.surface.visible, true); assert.equal(sea.visible, true); assert.equal(globe.visible, false);
  assert.equal(fake.renderer.shadowMap.needsUpdate, false, 'the pending shadow update was consumed, not re-armed');
  fake.renderer.render(scene, camera);
  assert.equal(fake.shadowPasses, 1, 'reflected and main views share the same fresh shadow map');
  assert.equal(fake.draws.length, 2); water.dispose();
});

test('effects opt-out and below-water viewpoints skip capture, ripple time follows the paused scene clock', () => {
  const { camera, water, fake } = fixture();
  water.update(23.5, .4, false); assert.equal(water.capture(fake.renderer, camera), false); assert.equal(fake.draws.length, 0);
  water.update(23.5, .4, true); water.capture(fake.renderer, camera);
  const uniforms = water.surface.material.uniforms; assert.equal(uniforms.time.value, 23.5); assert.equal(uniforms.night.value, .4);
  for (let i = 0; i < 100; i++) water.update(23.5, .4, true);
  assert.equal(uniforms.time.value, 23.5, 'no wall clock leaks into paused water ripples');
  camera.position.y = -2; assert.equal(water.capture(fake.renderer, camera), false); assert.equal(fake.draws.length, 1);
  water.dispose();
});

test('render targets stay bounded on desktop and mobile, and all reflection resources dispose once', () => {
  const { camera, water, fake } = fixture();
  water.resize(3840, 2160, 3); water.capture(fake.renderer, camera);
  const target = fake.draws[0].target!; assert.equal(target.width, 640); assert.equal(target.height, 360);
  assert.equal(target.samples, 0); assert.equal(target.texture.generateMipmaps, false);
  water.resize(844, 390, 3, true); assert.equal(target.width, 384); assert.equal(target.height, 177);
  assert.equal(water.surface.material.uniforms.texel.value.x, 1 / 384);
  const disposed = { target: 0, geometry: 0, material: 0 };
  target.addEventListener('dispose', () => disposed.target++); water.surface.geometry.addEventListener('dispose', () => disposed.geometry++); water.surface.material.addEventListener('dispose', () => disposed.material++);
  water.dispose(); water.dispose();
  assert.deepEqual(disposed, { target: 1, geometry: 1, material: 1 }); assert.equal(water.surface.parent, null);
  assert.equal(water.capture(fake.renderer, camera), false);
});

test('a failed capture still restores the main scene and renderer state', () => {
  const { scene, camera, water, fake } = fixture(), previous = fake.inspect(); scene.background = new THREE.Color(0x123456); const background = scene.background;
  fake.onRender(() => { throw new Error('capture failed'); });
  assert.throws(() => water.capture(fake.renderer, camera), /capture failed/);
  assert.deepEqual(fake.inspect(), previous); assert.equal(scene.background, background); assert.equal(water.surface.visible, true);
  water.dispose();
});


test('offscreen capture uses physical target pixels without multiplying canvas DPR twice', () => {
  const { camera, water } = fixture(), fake = fakeRenderer(1.7), before = fake.inspect();
  water.resize(1440, 900, 1.7);
  // This must work independently of a shadow pass restoring the target viewport.
  fake.renderer.shadowMap.needsUpdate = false;
  fake.onRender(() => {
    const target = fake.renderer.getRenderTarget()!;
    assert.deepEqual(fake.inspect().physicalViewport, [0, 0, target.width, target.height], 'the entire offscreen image fits within the target at high DPR');
  });
  water.capture(fake.renderer, camera);
  assert.deepEqual(fake.inspect(), before, 'the main canvas viewport returns to its original DPR-scaled dimensions');
  water.dispose();
});
