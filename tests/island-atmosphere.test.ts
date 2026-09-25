import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIslandAtmosphere } from '../src/island-atmosphere.ts';

function world(withFootprint = false) {
  const scene = new THREE.Scene(), model = new THREE.Group(); scene.add(model);
  const positions = [0, 0, 0];
  for (let i = 0; i < 52; i++) { const a = i * Math.PI * 2 / 52, wave = 1 + .032 * Math.sin(5 * a) + .033 * Math.cos(9 * a); positions.push(5.7 * Math.cos(a) * wave, 0, -4.15 * Math.sin(a) * wave); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.MeshStandardMaterial(); material.name = 'grass_ground'; model.add(new THREE.Mesh(geometry, material));
  const ship = new THREE.Group(); ship.name = 'MerchantShip'; ship.position.set(2.9, -.88, 4.62); model.add(ship);
  if (withFootprint) {
    const footprint = new THREE.Object3D(); footprint.name = 'CottageFootprint_Test'; footprint.position.set(-.4, 0, 2.1); footprint.rotation.y = .47;
    footprint.userData = { roofWidth: 2.4, roofDepth: 1.6 }; model.add(footprint);
  }
  const atmosphere = createIslandAtmosphere(scene, model);
  return { scene, model, ship, atmosphere };
}
function state(scene) {
  const result = [];
  scene.getObjectByName('IslandAtmosphere').traverse(object => {
    if (object instanceof THREE.InstancedMesh) result.push(...object.instanceMatrix.array);
    if (object instanceof THREE.Points) result.push(...object.geometry.attributes.position.array);
    result.push(...object.position.toArray(), ...object.rotation.toArray().slice(0, 3));
  });
  return result;
}

test('snow stays inside the dome and all season pools remain bounded and finite', () => {
  const { scene, atmosphere } = world();
  const count = () => { let n = 0; scene.traverse(() => n++); return n; };
  const originalCount = count();
  for (const season of ['winter', 'autumn', 'spring', 'summer']) {
    for (let i = 0; i < 1100; i++) { if (i % 170 === 0) atmosphere.rustleTrees(); atmosphere.update(.1, true, season, i % 2); }
    assert.equal(count(), originalCount, 'Effects must reuse their existing pools');
    assert.ok(state(scene).every(Number.isFinite), `${season} transforms contain non-finite values`);
    if (season === 'winter') {
      const positions = scene.getObjectByName('SnowInsideGlobe').geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) assert.ok(positions[i] ** 2 + (positions[i + 1] + .94) ** 2 + positions[i + 2] ** 2 < 7.9 ** 2, 'Snow escaped the globe');
    }
  }
});

test('pause/reduced-motion freezes all transforms and recurring particles', () => {
  const { scene, atmosphere } = world();
  atmosphere.update(.1, true, 'autumn', false); atmosphere.rustleTrees(); atmosphere.update(.1, true, 'autumn', false);
  const before = state(scene);
  for (let i = 0; i < 100; i++) atmosphere.update(1, false, 'autumn', false);
  assert.deepEqual(state(scene), before);
  atmosphere.update(1, false, 'spring', false);
  const spring = state(scene); atmosphere.update(1, false, 'spring', false); assert.deepEqual(state(scene), spring);
  const flowers = scene.getObjectByName('SpringFlowerBlooms'), matrix = new THREE.Matrix4(); flowers.getMatrixAt(0, matrix);
  assert.ok(matrix.elements[0] !== 0 || matrix.elements[8] !== 0, 'Static spring should show completed blooms');
});

test('boat foam follows the movable ship without leaving the water surface', () => {
  const { scene, ship, atmosphere } = world(); atmosphere.update(0, false, 'summer', false);
  const foam = scene.getObjectByName('MerchantShipWaterlineFoam'), before = new THREE.Matrix4(), after = new THREE.Matrix4(); foam.getMatrixAt(0, before);
  ship.position.x += 2; ship.position.y += 1; atmosphere.update(0, false, 'summer', false); foam.getMatrixAt(0, after);
  assert.ok(Math.abs(after.elements[12] - before.elements[12] - 2) < .0001);
  assert.equal(after.elements[13], before.elements[13], 'Foam must stay at sea level during ship rocking');
});


test('moved and rotated cottage footprint extras protect leaf and flower placement', () => {
  const { scene, model, atmosphere } = world(true), footprint = model.getObjectByName('CottageFootprint_Test');
  const inverse = footprint.matrixWorld.clone().invert(), matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  for (const [season, name] of [['autumn', 'AutumnGroundLeaves'], ['spring', 'SpringFlowerBlooms']]) {
    atmosphere.update(0, false, season, false);
    const mesh = scene.getObjectByName(name);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix).applyMatrix4(inverse);
      assert.ok(Math.abs(point.x) >= 1.32 || Math.abs(point.z) >= .92, `${name} placed inside moved cottage ${i}`);
    }
  }
});

test('seasonal visitors depart and autumn gusts replenish their ground leaves', () => {
  const summer = world(), autumn = world();
  let sawGulls = false, sawGullsLeave = false, sawBlownLeaves = false, sawLeavesRestored = false;
  const leafMatrix = new THREE.Matrix4();
  for (let step = 0; step < 1200; step++) {
    summer.atmosphere.update(.1, true, 'summer', false);
    const gullVisible = [0, 1].some(index => summer.scene.getObjectByName(`SummerSeagull_${index}`).visible);
    if (sawGulls && !gullVisible) sawGullsLeave = true;
    if (gullVisible) sawGulls = true;
    autumn.atmosphere.update(.1, true, 'autumn', false);
    const leaves = autumn.scene.getObjectByName('AutumnGroundLeaves');
    let present = 0;
    for (let index = 0; index < leaves.count; index++) {
      leaves.getMatrixAt(index, leafMatrix);
      if (Math.abs(leafMatrix.determinant()) > .00001) present++;
    }
    if (sawBlownLeaves && present === leaves.count) sawLeavesRestored = true;
    if (present < leaves.count) sawBlownLeaves = true;
  }
  assert.ok(sawGulls, 'Summer should bring at least one scheduled seagull visit');
  assert.ok(sawGullsLeave, 'Seagulls should leave the scene instead of orbiting forever');
  assert.ok(sawBlownLeaves, 'An autumn gust should lift leaves out of the ground pool');
  assert.ok(sawLeavesRestored, 'Falling canopy leaves should replenish the complete ground pool');
});
