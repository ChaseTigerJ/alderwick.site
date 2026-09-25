import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIslandAtmosphere } from '../src/island-atmosphere.ts';

function world(withFootprint = false, decorate, atmosphereOptions = {}) {
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
  if (decorate) decorate(model);
  const atmosphere = createIslandAtmosphere(scene, model, atmosphereOptions);
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
  before.copy(after); ship.scale.setScalar(1.48); atmosphere.update(0, false, 'summer', false); foam.getMatrixAt(0, after);
  assert.ok(Math.abs(after.elements[12] - ship.position.x - (before.elements[12] - ship.position.x) * 1.48) < .0001, 'Foam must expand with the larger hull');
  assert.ok(Math.abs(after.elements[14] - ship.position.z - (before.elements[14] - ship.position.z) * 1.48) < .0001);
  assert.equal(after.elements[13], before.elements[13]);
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

function sandPath(model, coveringAll = false) {
  const points = coveringAll ? [-8, .027, -8, 8, .027, -8, 8, .027, 8, -8, .027, 8] : [-2.2, .027, 1.3, .7, .027, 1.4, .8, .027, 3.3, -2.1, .027, 3.1];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const material = new THREE.MeshStandardMaterial(); material.name = 'sand';
  const path = new THREE.Mesh(geometry, material); path.name = 'UnexpectedDiagonalPath'; path.rotation.y = coveringAll ? 0 : .13; model.add(path); return path;
}

test('spring flowers keep their full petal clearance from transformed authored path triangles', () => {
  let path;
  const { scene, atmosphere } = world(false, model => { path = sandPath(model); }); atmosphere.update(0, false, 'spring', false);
  const geometry = path.geometry, points = geometry.attributes.position, index = geometry.index, triangles = [];
  for (let n = 0; n < index.count; n += 3) {
    const vertices = [n, n + 1, n + 2].map(i => { const p = new THREE.Vector3().fromBufferAttribute(points, index.getX(i)).applyMatrix4(path.matrixWorld); p.y = 0; return p; });
    triangles.push(new THREE.Triangle(...vertices));
  }
  const point = new THREE.Vector3(), closest = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const flowers = scene.getObjectByName('SpringFlowerBlooms'); let planted = 0;
  for (let i = 0; i < flowers.count; i++) {
    flowers.getMatrixAt(i, matrix); if (Math.abs(matrix.determinant()) < .00001) continue;
    point.setFromMatrixPosition(matrix); point.y = 0; planted++;
    for (const triangle of triangles) assert.ok(triangle.closestPointToPoint(point, closest).distanceTo(point) >= .119, `Flower ${i} overlaps the real path or its clearance`);
  }
  assert.ok(planted >= 80, 'Valid lawn should retain an abundant flower display');
});

test('spring hides flowers instead of forcing an invalid fallback onto a path', () => {
  const { scene, atmosphere } = world(false, model => sandPath(model, true)); atmosphere.update(0, false, 'spring', false);
  const matrix = new THREE.Matrix4();
  for (const name of ['SpringFlowerBlooms', 'SpringFlowerStems', 'SpringFlowerCenters', 'GardenSpringBlooms']) {
    const flowers = scene.getObjectByName(name);
    for (let i = 0; i < flowers.count; i++) { flowers.getMatrixAt(i, matrix); assert.equal(matrix.determinant(), 0, `${name} put a flower on the only available path`); }
  }
});

test('shaking imparts snow inertia, remains contained under repeated impulses, and settles', () => {
  const moving = world(), calm = world();
  moving.atmosphere.update(0, true, 'winter', false); calm.atmosphere.update(0, true, 'winter', false);
  const a = moving.scene.getObjectByName('SnowInsideGlobe'), b = calm.scene.getObjectByName('SnowInsideGlobe');
  const separation = () => { let result = 0; for (let i = 0; i < a.geometry.drawRange.count * 3; i += 3) result += Math.abs(a.geometry.attributes.position.array[i] - b.geometry.attributes.position.array[i]); return result / a.geometry.drawRange.count; };
  moving.atmosphere.shake(.2, -.1); moving.atmosphere.update(1 / 30, true, 'winter', false); calm.atmosphere.update(1 / 30, true, 'winter', false);
  const immediate = separation();
  for (let i = 0; i < 30; i++) { moving.atmosphere.update(1 / 30, true, 'winter', false); calm.atmosphere.update(1 / 30, true, 'winter', false); }
  assert.ok(immediate > .0001 && separation() > immediate * 5, 'Snow must continue drifting after the input ends');
  for (let step = 0; step < 120; step++) { moving.atmosphere.shake(step % 2 ? .8 : -.8, .5); moving.atmosphere.update(.1, true, 'winter', false); }
  let positions = a.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    assert.ok(Number.isFinite(positions[i]) && Number.isFinite(positions[i + 1]) && Number.isFinite(positions[i + 2]));
    assert.ok(positions[i] ** 2 + (positions[i + 1] + .94) ** 2 + positions[i + 2] ** 2 < 7.9 ** 2, 'A strong repeated shake pushed a flake outside the glass');
  }
  for (let i = 0; i < 300; i++) moving.atmosphere.update(.1, true, 'winter', false);
  positions = a.geometry.attributes.position.array; let settled = 0;
  for (let i = 0; i < a.geometry.drawRange.count * 3; i += 3) if (Math.abs(positions[i + 1] - .045) < .001 || Math.abs(positions[i + 1] + .84) < .001) settled++;
  assert.ok(settled > 100, 'Snow should come to rest on the island or the globe floor');
  const paused = positions.slice(); moving.atmosphere.update(.1, false, 'winter', false); moving.atmosphere.shake(.5, .5);
  for (let i = 0; i < 10; i++) moving.atmosphere.update(.1, false, 'winter', false);
  assert.deepEqual(positions, paused, 'Paused snow must neither shake nor settle');
});

test('seasonal garden props follow the plot anchor and switch without overlapping seasons', () => {
  const { scene, atmosphere } = world(false, model => {
    const anchor = new THREE.Object3D(); anchor.name = 'GardenPlot'; anchor.position.set(-3.7, .04, 1.3); anchor.rotation.y = .35; anchor.userData = { width: 1.5, depth: 1.1 }; model.add(anchor);
  });
  const garden = scene.getObjectByName('GardenSeasonalProps'); assert.deepEqual(garden.position.toArray(), [-3.7, .04, 1.3]); assert.ok(Math.abs(garden.rotation.y - .35) < .000001);
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    atmosphere.update(0, false, season, false);
    for (const other of ['spring', 'summer', 'autumn', 'winter']) assert.equal(scene.getObjectByName(`Garden${other[0].toUpperCase()}${other.slice(1)}`).visible, season === other);
  }
  assert.ok(scene.getObjectByName('GardenSpringBlooms')); assert.ok(scene.getObjectByName('CampfireStoneRing')); assert.ok(scene.getObjectByName('GardenAutumnPumpkins')); assert.ok(scene.getObjectByName('SnowmanCarrot'));
});

test('snow config uses a fixed pool and disabled shake/effects honor their switches', () => {
  const a = world(false, undefined, { shakeEnabled: false }), b = world(false, undefined, { shakeEnabled: false });
  a.atmosphere.update(.1, true, 'winter', false); b.atmosphere.update(.1, true, 'winter', false);
  a.atmosphere.shake(.5, .5);
  for (let i = 0; i < 10; i++) { a.atmosphere.update(.1, true, 'winter', false); b.atmosphere.update(.1, true, 'winter', false); }
  const snow = a.scene.getObjectByName('SnowInsideGlobe'), positions = snow.geometry.attributes.position;
  assert.deepEqual(positions.array, b.scene.getObjectByName('SnowInsideGlobe').geometry.attributes.position.array, 'Disabled shake must have no physical effect');
  a.atmosphere.configure({ snowAmount: 2 }); assert.equal(snow.geometry.drawRange.count, 9000); assert.equal(snow.geometry.attributes.position, positions);
  a.atmosphere.configure({ snowAmount: .5, effectsEnabled: false }); a.atmosphere.update(.1, true, 'winter', false);
  assert.equal(snow.geometry.drawRange.count, 2250); assert.equal(a.scene.getObjectByName('WinterSnowglobe').visible, false);
  assert.equal(a.scene.getObjectByName('GardenWinter').visible, true, 'Effects switch preserves static seasonal scenery');
});


test('dense snow stays dispersed through all sides of the globe under sustained multidirectional shaking', () => {
  const { scene, atmosphere } = world(); atmosphere.update(0, true, 'winter', false);
  const snow = scene.getObjectByName('SnowInsideGlobe');
  assert.equal(snow.geometry.drawRange.count, 4500, 'Default winter should contain thousands of visible flakes');
  for (let step = 0; step < 180; step++) {
    // Long drags push toward one wall; reversals must disperse, not compact that wall layer.
    const direction = Math.floor(step / 30) % 2 ? -1 : 1;
    atmosphere.shake(direction * .12, Math.sin(step * .17) * .10 + .07);
    atmosphere.update(1 / 30, true, 'winter', false);
  }
  const positions = snow.geometry.attributes.position.array, count = snow.geometry.drawRange.count;
  const quadrants = [0, 0, 0, 0], verticalBands = [0, 0, 0];
  let meanX = 0, meanZ = 0, nearWall = 0;
  for (let i = 0; i < count * 3; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]; meanX += x / count; meanZ += z / count;
    quadrants[(x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0)]++; verticalBands[y < 1.25 ? 0 : y < 3.75 ? 1 : 2]++;
    if (Math.hypot(x, y + .94, z) > 7.55) nearWall++;
  }
  assert.ok(quadrants.every(value => value > count * .085), `Snow collapsed to one side: ${quadrants}`);
  assert.ok(verticalBands.every(value => value > count * .07), `Snow collapsed to one height: ${verticalBands}`);
  assert.ok(Math.hypot(meanX, meanZ) < 2, `Snow bunched away from the center: ${meanX}, ${meanZ}`);
  assert.ok(nearWall < count * .2, `Too much snow stuck against the glass: ${nearWall}/${count}`);
});

test('opposing drag events stir snow even when their total translation cancels', () => {
  const stirred = world(), still = world();
  for (const fixture of [stirred, still]) fixture.atmosphere.update(0, true, 'winter', false);
  stirred.atmosphere.shake(.1, .08); stirred.atmosphere.shake(-.1, -.08);
  for (let i = 0; i < 20; i++) { stirred.atmosphere.update(1 / 30, true, 'winter', false); still.atmosphere.update(1 / 30, true, 'winter', false); }
  const a = stirred.scene.getObjectByName('SnowInsideGlobe'), b = still.scene.getObjectByName('SnowInsideGlobe');
  let displacement = 0;
  for (let i = 0; i < a.geometry.drawRange.count * 3; i++) displacement += Math.abs(a.geometry.attributes.position.array[i] - b.geometry.attributes.position.array[i]);
  assert.ok(displacement / a.geometry.drawRange.count > .25, 'Back-and-forth shaking should create visible swirling');
});

test('moved wishing well keeps lawn flowers and leaves outside its roof clearance', () => {
  const wellPosition = new THREE.Vector3(2.03, 0, 1.94);
  const { scene, atmosphere } = world(false, model => { const well = new THREE.Group(); well.name = 'WishingWell'; well.position.copy(wellPosition); model.add(well); });
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  for (const [season, name] of [['spring', 'SpringFlowerBlooms'], ['autumn', 'AutumnGroundLeaves']]) {
    atmosphere.update(0, false, season, false); const mesh = scene.getObjectByName(name);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); if (Math.abs(matrix.determinant()) < .00001) continue; point.setFromMatrixPosition(matrix);
      assert.ok(Math.hypot(point.x - wellPosition.x, point.z - wellPosition.z) >= .759, `${name} overlaps the relocated wishing well`);
    }
  }
});


test('rapid maximum drag never compacts snow into a layer against the glass', () => {
  const { scene, atmosphere } = world(); atmosphere.update(0, true, 'winter', false);
  for (let i = 0; i < 600; i++) { atmosphere.shake(.5 * Math.sin(i * .08), .5); atmosphere.update(1 / 60, true, 'winter', false); }
  const snow = scene.getObjectByName('SnowInsideGlobe'), positions = snow.geometry.attributes.position.array, count = snow.geometry.drawRange.count;
  let nearWall = 0, aboveVillage = 0; const quadrants = [0, 0, 0, 0];
  for (let i = 0; i < count * 3; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2], radius = Math.hypot(x, y + .94, z);
    assert.ok(Number.isFinite(radius) && radius < 7.9, 'Rapid shaking pushed snow outside the glass');
    if (radius > 7.55) nearWall++; if (y > 3.75) aboveVillage++;
    quadrants[(x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0)]++;
  }
  assert.ok(nearWall < count * .15, `Rapid impulses pressed ${nearWall}/${count} flakes against the glass`);
  assert.ok(aboveVillage > count * .10, 'Shaking should send snow above the village as well as around the ground');
  assert.ok(quadrants.every(value => value > count * .1), `Rapid shaking bunched snow on one side: ${quadrants}`);
});
