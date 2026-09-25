import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createIslandLighting, renderIslandFrame } from '../src/island-render.ts';

type FrameRenderer = Parameters<typeof renderIslandFrame>[0];

function assertMatrix(actual: THREE.Matrix4, expected: THREE.Matrix4, message: string) {
  actual.elements.forEach((value, i) => assert.ok(Math.abs(value - expected.elements[i]) < 1e-10, `${message} (element ${i})`));
}

function localMatrix(object: THREE.Object3D) {
  return new THREE.Matrix4().compose(object.position, object.quaternion, object.scale);
}

function animatedFixture() {
  const scene = new THREE.Scene(), island = new THREE.Group(), ship = new THREE.Group(), mast = new THREE.Object3D();
  scene.add(island); island.add(ship); ship.add(mast);
  island.position.set(1, -.2, 3); island.rotation.y = .4;
  ship.position.set(3.45, -.88, 5.2); ship.scale.setScalar(1.48); ship.rotation.y = -.55;
  mast.position.set(0, .43, .48);
  const camera = new THREE.PerspectiveCamera(34, 1.6, .1, 120); camera.position.set(13, 13, 19);
  return { scene, island, ship, mast, camera };
}

/** Match WebGLShadowMap's consumption contract without requiring a GPU. */
function observingRenderer(onRender: (scene: THREE.Scene, camera: THREE.Camera, freshShadow: boolean) => void) {
  let needsUpdate = false, requests = 0, shadowPasses = 0;
  const shadowMap = {
    enabled: true, autoUpdate: false,
    get needsUpdate() { return needsUpdate; },
    set needsUpdate(value: boolean) { needsUpdate = value; if (value) requests++; },
  };
  const renderer = {
    shadowMap,
    render(scene: THREE.Scene, camera: THREE.Camera) {
      onRender(scene, camera, shadowMap.needsUpdate);
      if (shadowMap.needsUpdate) { shadowPasses++; shadowMap.needsUpdate = false; }
    },
  } as unknown as FrameRenderer;
  return { renderer, get requests() { return requests; }, get shadowPasses() { return shadowPasses; } };
}

test('day and night lighting use one outdoor direction and only the sun/moon casts shadows', () => {
  for (const coarse of [false, true]) {
    const scene = new THREE.Scene(), lighting = createIslandLighting(scene, coarse);
    const directional: THREE.DirectionalLight[] = [], lights: THREE.Light[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Light) lights.push(object);
      if (object instanceof THREE.DirectionalLight) directional.push(object);
    });
    assert.ok(directional.length >= 2, 'sun/moon and outdoor fill are both represented');
    assert.equal(lighting.sun.shadow.mapSize.x, coarse ? 1024 : 2048);
    assert.equal(lighting.sun.shadow.mapSize.y, lighting.sun.shadow.mapSize.x);
    let daySun = 0;
    for (const night of [0, .25, .5, .75, 1]) {
      lighting.update(night); scene.updateMatrixWorld(true);
      const direction = lighting.sun.target.getWorldPosition(new THREE.Vector3()).sub(lighting.sun.getWorldPosition(new THREE.Vector3())).normalize();
      for (const light of directional) {
        const other = light.target.getWorldPosition(new THREE.Vector3()).sub(light.getWorldPosition(new THREE.Vector3())).normalize();
        assert.ok(direction.dot(other) > 1 - 1e-12, 'outdoor fill cannot imply a competing shadow direction');
        assert.ok(light.intensity > 0, 'both sources illuminate the scene through the day/night transition');
      }
      assert.deepEqual(lights.filter(light => light.castShadow), [lighting.sun], 'only the sun/moon may create outdoor cast shadows');
      if (night === 0) daySun = lighting.sun.intensity;
      if (night === 1) assert.ok(lighting.sun.intensity < daySun, 'moonlight is dimmer while retaining its direction');
    }
    lighting.dispose();
  }
});

test('every frame propagates the latest ancestor, ship, mast and camera pose before refreshing shadows', () => {
  const { scene, island, ship, mast, camera } = animatedFixture();
  let calls = 0, expectedMast = new THREE.Matrix4(), expectedCamera = new THREE.Matrix4();
  const observer = observingRenderer((renderedScene, renderedCamera, freshShadow) => {
    calls++; assert.equal(renderedScene, scene); assert.equal(renderedCamera, camera);
    assert.ok(freshShadow, 'even consecutive fast frames need a shadow map for their current pose');
    assertMatrix(mast.matrixWorld, expectedMast, 'the visible mast must inherit this frame’s animated island and ship transforms');
    assertMatrix(camera.matrixWorld, expectedCamera, 'camera world pose must be fresh');
    assertMatrix(camera.matrixWorldInverse, expectedCamera.clone().invert(), 'camera inverse must match the fresh pose');
  });
  // No clock advance or render delay: a throttle must not reuse an earlier pose.
  for (let frame = 0; frame < 8; frame++) {
    island.rotation.y += .03; island.position.x += .01;
    ship.rotation.z += .02; ship.position.y += .008;
    mast.rotation.x += .001; camera.position.x += .1; camera.rotation.y -= .002;
    expectedMast = localMatrix(island).multiply(localMatrix(ship)).multiply(localMatrix(mast));
    expectedCamera = localMatrix(camera);
    renderIslandFrame(observer.renderer, scene, camera);
  }
  assert.equal(calls, 8); assert.equal(observer.requests, 8); assert.equal(observer.shadowPasses, 8);
});

test('optional reflection captures the fresh animated pose and shares one shadow refresh with the main render', () => {
  const { scene, island, ship, mast, camera } = animatedFixture();
  const reflectionCamera = new THREE.PerspectiveCamera(), calls: string[] = [];
  let expectedMast = new THREE.Matrix4();
  const observer = observingRenderer((renderedScene, renderedCamera, freshShadow) => {
    assert.equal(renderedScene, scene);
    assertMatrix(mast.matrixWorld, expectedMast, 'capture and main pass both see this frame’s complete hierarchy');
    if (renderedCamera === reflectionCamera) {
      calls.push('reflection'); assert.ok(freshShadow, 'reflection receives the newly requested map');
    } else {
      assert.equal(renderedCamera, camera); calls.push('main');
      assert.equal(freshShadow, false, 'main view reuses the same fresh shadow map consumed by reflection');
    }
  });
  for (let frame = 0; frame < 3; frame++) {
    island.rotation.y += .07; ship.rotation.z += .04; mast.rotation.x += .002;
    expectedMast = localMatrix(island).multiply(localMatrix(ship)).multiply(localMatrix(mast));
    renderIslandFrame(observer.renderer, scene, camera, () => {
      assertMatrix(mast.matrixWorld, expectedMast, 'matrices must be propagated before optional capture starts');
      observer.renderer.render(scene, reflectionCamera);
    });
  }
  assert.deepEqual(calls, ['reflection', 'main', 'reflection', 'main', 'reflection', 'main']);
  assert.equal(observer.requests, 3, 'one request per frame, not another between reflection and main view');
  assert.equal(observer.shadowPasses, 3, 'each frame refreshes the shadow map exactly once');
});
