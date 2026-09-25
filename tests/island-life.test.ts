import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandLife } from '../src/island-life.ts';
async function fixture() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = new THREE.Scene(); scene.add(asset.scene); asset.scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 120); camera.position.set(13, 13, 19); camera.lookAt(0, .7, 0);
  return { scene, model: asset.scene, camera, life: createIslandLife(scene, asset.scene) };
}
test('export preserves articulated dog, ship pivot and exact effect anchors', async () => {
  const { model } = await fixture();
  for (const name of ['Khloe', 'KhloeBody', 'KhloeHead', 'KhloeTail', 'KhloeLegFL', 'KhloeLegFR', 'KhloeLegBL', 'KhloeLegBR', 'MerchantShip', 'PipLetterAnchor']) assert.ok(model.getObjectByName(name), name);
  for (let i = 0; i < 4; i++) assert.ok(model.getObjectByName(`ChimneySmoke_${i}`));
  for (let i = 0; i < 16; i++) assert.ok(model.getObjectByName(`WindowLight_${i}`));
  for (let i = 0; i < 2; i++) assert.ok(model.getObjectByName(`LanternLight_${i}`));
  assert.equal(model.getObjectByName('Khloe')!.children.filter(node => node.name.startsWith('Khloe')).length, 7);
});
test('dog roams continuously on land, pauses completely, leaves snowprints only in winter', async () => {
  const { scene, camera, life } = await fixture();
  const initial = life.update(0, true, true, camera).dogPin.clone();
  for (let i = 0; i < 3600; i++) {
    const p = life.update(1 / 30, true, true, camera).dogPin;
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    assert.ok(p.x > -1.5 && p.x < .9 && p.z > 1.4 && p.z < 3.2, `Outside safe clearing: ${p.toArray()}`);
  }
  assert.ok(initial.distanceTo(life.dog!.position) > .3);
  const paws = scene.getObjectByName('KhloeSnowPawprints') as THREE.InstancedMesh;
  assert.equal(paws.visible, true);
  const matrix = new THREE.Matrix4(); let visiblePrints = 0;
  for (let i = 0; i < paws.count; i++) { paws.getMatrixAt(i, matrix); if (matrix.elements[0] !== 0) visiblePrints++; }
  assert.ok(visiblePrints > 10);
  const before = life.dog!.position.clone();
  life.update(4, false, true, camera); assert.deepEqual(life.dog!.position.toArray(), before.toArray());
  life.update(0, false, false, camera); assert.equal(paws.visible, false);
});
test('discoveries replay, animate their objects and return to idle', async () => {
  const { scene, camera, life } = await fixture(); life.update(0, true, false, camera);
  const boat = life.boat!, before = boat.rotation.z;
  life.trigger(2, false); life.update(.4, true, false, camera); assert.notEqual(boat.rotation.z, before);
  life.trigger(0, false); life.update(.5, true, false, camera); assert.equal(scene.getObjectByName('PipsLetter')!.visible, true);
  life.trigger(1, false); life.update(.7, true, false, camera);
  assert.ok(life.dog!.getObjectByName('KhloeLegFL')!.rotation.x < -.3);
  for (let i = 0; i < 240; i++) life.update(1 / 30, true, false, camera);
  assert.equal(scene.getObjectByName('PipsLetter')!.visible, false);
  life.trigger(0, true); life.update(0, false, false, camera); assert.equal(scene.getObjectByName('PipsLetter')!.visible, true);
});
