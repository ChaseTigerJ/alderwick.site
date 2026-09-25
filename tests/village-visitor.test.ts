import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVillageVisitor, VISITOR_DURATION } from '../src/village-visitor.ts';

function fixture() {
  const scene = new THREE.Scene(), model = new THREE.Group(); scene.add(model);
  const door = new THREE.Group(); door.name = 'VillageDoor'; door.rotation.y = .17; door.userData.openAngle = -1.55; model.add(door);
  for (const [name, position] of [['DoorVisitorStart', [-2, .17, 0]], ['DoorVisitorEnd', [-1.85, .03, 1]]]) {
    const anchor = new THREE.Object3D(); anchor.name = name as string; anchor.position.set(...position as [number, number, number]); model.add(anchor);
  }
  model.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(13, 13, 19);
  return { scene, door, camera, visitor: createVillageVisitor(scene, model) };
}

test('Pip opens the door, walks to the path, waves once, and returns home', () => {
  const { scene, door, camera, visitor } = fixture(); const base = door.rotation.y;
  assert.equal(visitor.root.visible, false); assert.equal(visitor.trigger(0, false), true);
  visitor.update(.4, true, camera); assert.notEqual(door.rotation.y, base); assert.equal(visitor.root.visible, false);
  visitor.update(1.3, true, camera); assert.equal(visitor.root.visible, true);
  assert.ok(visitor.root.position.distanceTo(visitor.start) > 0); assert.ok(visitor.root.position.distanceTo(visitor.end) > 0);
  assert.equal(visitor.trigger(1.4, false), false, 'repeat clicks cannot restart the visit');
  visitor.update(3.5, true, camera); assert.deepEqual(visitor.root.position.toArray(), visitor.end.toArray());
  assert.ok(scene.getObjectByName('PipRightArm')!.rotation.z > 2, 'Pip raises his hand to wave');
  visitor.update(7, true, camera); assert.ok(visitor.root.position.distanceTo(visitor.end) > .1);
  visitor.update(VISITOR_DURATION, true, camera); assert.equal(visitor.root.visible, false); assert.equal(door.rotation.y, base); assert.equal(visitor.active(VISITOR_DURATION), false);
});

test('reduced-motion visitor remains a single frozen greeting even when the camera moves', () => {
  const { camera, door, visitor } = fixture(); visitor.trigger(10, true); visitor.update(10, false, camera);
  const pose = [...visitor.root.position.toArray(), ...visitor.root.rotation.toArray(), ...door.rotation.toArray()];
  camera.position.set(-13, 13, -19); visitor.update(10, false, camera);
  assert.deepEqual([...visitor.root.position.toArray(), ...visitor.root.rotation.toArray(), ...door.rotation.toArray()], pose);
  assert.equal(visitor.root.visible, true);
});
