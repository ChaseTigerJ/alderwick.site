import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandLife, PAWPRINT_LIFETIME } from '../src/island-life.ts';
import { createIslandPicker } from '../src/island-interactions.ts';
async function fixture() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = new THREE.Scene(); scene.add(asset.scene); asset.scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 120); camera.position.set(13, 13, 19); camera.lookAt(0, .7, 0);
  return { scene, model: asset.scene, camera, life: createIslandLife(scene, asset.scene) };
}
test('export preserves articulated dog, ship pivot and exact effect anchors', async () => {
  const { model } = await fixture();
  for (const name of ['Khloe', 'KhloeBody', 'KhloeHead', 'KhloeTail', 'KhloeLegFL', 'KhloeLegFR', 'KhloeLegBL', 'KhloeLegBR', 'MerchantShip', 'PipLetterAnchor', 'Mailbox', 'MailboxDoor', 'ChurchBell', 'WishingWell', 'WellBucket', 'VillageDoor', 'DoorVisitorStart', 'DoorVisitorEnd', 'GardenPlot']) assert.ok(model.getObjectByName(name), name);
  for (let i = 0; i < 2; i++) assert.ok(model.getObjectByName(`ChimneySmoke_${i}`));
  for (let i = 0; i < 17; i++) assert.ok(model.getObjectByName(`WindowLight_${i}`));
  for (let i = 0; i < 2; i++) assert.ok(model.getObjectByName(`LanternLight_${i}`));
  assert.equal(model.getObjectByName('Khloe')!.children.filter(node => node.name.startsWith('Khloe')).length, 7);
  assert.equal(model.getObjectByName('ChimneySmoke_2'), undefined, 'Only the two remaining cottages have chimneys');
  assert.equal(model.getObjectByName('CottageFootprint_3'), undefined, 'The cramped rear cottage is removed');
  assert.ok(Math.abs(model.getObjectByName('MerchantShip')!.scale.x - 1.12) < .001);
  assert.ok(model.getObjectByName('Mailbox')!.scale.x <= .31, 'Mailbox is mounted at cottage scale');
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
test('each discovery plays once, cannot stack during playback, and returns to idle', async () => {
  const { scene, camera, life } = await fixture(); life.update(0, true, false, camera);
  const boat = life.boat!, before = boat.rotation.z;
  life.trigger(2, false); life.update(.4, true, false, camera); assert.notEqual(boat.rotation.z, before);
  assert.equal(life.trigger(2, false), false, 'a running performance must not restart');
  life.trigger(0, false); life.update(.5, true, false, camera); assert.equal(scene.getObjectByName('PipsLetter')!.visible, true);
  life.trigger(1, false); life.update(.7, true, false, camera);
  assert.ok(life.dog!.getObjectByName('KhloeLegFL')!.rotation.x < -.3);
  const pausedRotation = life.dog!.rotation.y;
  camera.position.set(-13, 13, -19); life.update(.1, false, false, camera);
  assert.equal(life.dog!.rotation.y, pausedRotation, 'orbiting the camera cannot turn a paused dog');
  for (let i = 0; i < 240; i++) life.update(1 / 30, true, false, camera);
  assert.equal(scene.getObjectByName('PipsLetter')!.visible, false);
  life.trigger(0, true); life.update(0, false, false, camera); assert.equal(scene.getObjectByName('PipsLetter')!.visible, true);
});

test('every snowprint has disappeared five seconds after the dog stops walking', async () => {
  const { scene, camera, life } = await fixture();
  assert.equal(PAWPRINT_LIFETIME, 5);
  for (let i = 0; i < 300; i++) life.update(1 / 30, true, true, camera);
  const paws = scene.getObjectByName('KhloeSnowPawprints') as THREE.InstancedMesh;
  const visible = () => { const matrix = new THREE.Matrix4(); let count = 0; for (let i = 0; i < paws.count; i++) { paws.getMatrixAt(i, matrix); if (matrix.determinant() !== 0) count++; } return count; };
  assert.ok(visible() > 0);
  // Her sniff/head-tilt routine lasts through t=15.5, so no fresh prints appear.
  for (let i = 0; i < 154; i++) life.update(1 / 30, true, true, camera);
  assert.equal(visible(), 0);
});

test('mailbox, bell and wishing well complete a single bounded performance', async () => {
  const { scene, model, camera, life } = await fixture();
  const door = model.getObjectByName('MailboxDoor')!, bell = model.getObjectByName('ChurchBell')!, bucket = model.getObjectByName('WellBucket')!;
  const doorRotation = door.rotation.clone(), bellRotation = bell.rotation.clone(), bucketPosition = bucket.position.clone();
  life.trigger(0, false); life.trigger(3, false); life.trigger(4, false); life.update(.35, true, false, camera);
  assert.notEqual(door.rotation.x, doorRotation.x); assert.notEqual(bell.rotation.x, bellRotation.x);
  assert.ok(bucket.position.y > bucketPosition.y); assert.equal(scene.getObjectByName('WishingCoin')!.visible, true);
  for (let i = 0; i < 240; i++) life.update(1 / 30, true, false, camera);
  assert.deepEqual(door.rotation.toArray(), doorRotation.toArray()); assert.deepEqual(bell.rotation.toArray(), bellRotation.toArray());
  assert.deepEqual(bucket.position.toArray(), bucketPosition.toArray()); assert.equal(scene.getObjectByName('WishingCoin')!.visible, false);
  assert.equal(life.isActive(0), false); assert.equal(life.isActive(3), false); assert.equal(life.isActive(4), false);
});

test('object picking follows actors and respects nearer scenery occlusion', () => {
  const model = new THREE.Group(), dog = new THREE.Group(); dog.name = 'Khloe';
  dog.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())); model.add(dog);
  const pick = createIslandPicker(model), ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
  assert.equal(pick(ray), 1);
  dog.position.x = 2; assert.equal(pick(ray), null);
  ray.ray.origin.x = 2; assert.equal(pick(ray), 1);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 1), new THREE.MeshBasicMaterial()); wall.position.set(2, 0, 3); model.add(wall);
  assert.equal(pick(ray), null, 'the dog cannot be clicked through a house');
});
