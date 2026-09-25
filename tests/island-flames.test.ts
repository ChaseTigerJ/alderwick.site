import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createIslandFlames } from '../src/island-flames.ts';

test('ship candle follows the moving hull, stays dim and extinguishes during daylight', () => {
  const model = new THREE.Group(), ship = new THREE.Group(), anchor = new THREE.Object3D();
  ship.position.set(3, -.88, 5.2); ship.scale.setScalar(1.48); anchor.position.set(.3, 1, .6); anchor.name = 'ShipLanternLight_0';
  model.add(ship); ship.add(anchor);
  const flames = createIslandFlames(model), light = anchor.children[0] as THREE.PointLight;
  flames.update(0, 1, .55); const before = light.getWorldPosition(new THREE.Vector3());
  ship.rotation.z = .15; ship.position.y += .1;
  const after = light.getWorldPosition(new THREE.Vector3());
  assert.ok(before.distanceTo(after) > .05); assert.equal(light.distance, 1.9);
  const values = [];
  for (let i = 0; i < 60; i++) { flames.update(i / 30, 1, .55); values.push(light.intensity); }
  assert.ok(Math.max(...values) < .7 && Math.min(...values) > .58);
  assert.ok(Math.max(...values) - Math.min(...values) > .025, 'subtle visible flame variation');
  flames.update(3, 0, .55); assert.equal(light.intensity, 0);
  flames.update(3, 1, 0); assert.equal(light.intensity, 0);
  flames.update(3, 1, .55, false); const still = light.intensity;
  flames.update(8, 1, .55, false); assert.equal(light.intensity, still);
});
