import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIslandEasterEggs, EASTER_EGG_DURATIONS } from '../src/island-easter-eggs.ts';

function fixture(selection: number, anchors = true) {
  const scene = new THREE.Scene(), model = new THREE.Group(); scene.add(model);
  if (anchors) for (const [name, position] of [['GraveHandAnchor', [1.08, .025, -3.2]], ['BackIslandGhostAnchor', [-1.88, 0, -2.26]]] as const) {
    const anchor = new THREE.Object3D(); anchor.name = name; anchor.position.set(...position); model.add(anchor);
  }
  let calls = 0;
  const eggs = createIslandEasterEggs(scene, model, { intervalSeconds: 20, random: () => { calls++; return calls === 2 ? selection : 0; } });
  const advance = (seconds: number, motion = true, season: 'spring' | 'summer' | 'autumn' | 'winter' = 'autumn') => { for (let i = 0; i < Math.ceil(seconds / .05); i++) eggs.update(.05, motion, season); };
  return { eggs, scene, model, advance };
}

test('rare visitors wait for visible animation time and stop cleanly when disabled', () => {
  const { eggs, advance } = fixture(0);
  advance(60, false); assert.equal(eggs.activeEvent, null);
  advance(14.5); assert.equal(eggs.activeEvent, null);
  advance(.6); assert.equal(eggs.activeEvent, 'shark');
  const position = eggs.root.getObjectByName('RareSharkFin')!.position.toArray();
  advance(15, false); assert.deepEqual(eggs.root.getObjectByName('RareSharkFin')!.position.toArray(), position);
  eggs.configure({ enabled: false }); assert.equal(eggs.activeEvent, null); assert.equal(eggs.root.visible, false);
  advance(60); assert.equal(eggs.activeEvent, null);
  eggs.configure({ enabled: true, intervalSeconds: 60 }); advance(44); assert.equal(eggs.activeEvent, null);
});

test('fin traverses only the open western sea and completes one pass before waiting again', () => {
  const { eggs, advance } = fixture(0); advance(15.1); assert.equal(eggs.activeEvent, 'shark');
  const fin = eggs.root.getObjectByName('RareSharkFin')!;
  for (let i = 0; i < 140; i++) {
    eggs.update(.05, true, 'summer');
    assert.ok(fin.position.x < -6.8, 'fin stays well beyond the meadow, dock and ship');
    assert.ok(Math.hypot(fin.position.x, fin.position.z) + .35 < 8.35, 'fin remains on the water disc');
    assert.ok(fin.position.y < -.94, 'only the dorsal fin surfaces');
  }
  advance(2); assert.equal(eggs.activeEvent, null); assert.equal(fin.visible, false);
  assert.equal(eggs.root.getObjectByName('SharkSurfaceWake')!.visible, false);
  advance(10); assert.equal(eggs.activeEvent, null, 'the finished animation cannot immediately repeat');
});

test('fish follows a continuous jump and lands with a single fading splash', () => {
  const { eggs, advance } = fixture(.3); advance(15.1); assert.equal(eggs.activeEvent, 'fish');
  const fish = eggs.root.getObjectByName('RareLeapingFish')!;
  let highest = -Infinity, lastX = fish.position.x;
  for (let i = 0; i < 38; i++) {
    eggs.update(.05, true, 'spring'); highest = Math.max(highest, fish.position.y);
    assert.ok(fish.position.x < -6.8); assert.ok(Math.abs(fish.position.x - lastX) < .05); lastX = fish.position.x;
  }
  assert.ok(highest > -.2, 'fish clearly leaves the water');
  advance(.3); assert.equal(fish.visible, false); assert.equal(eggs.root.getObjectByName('FishLandingRipple')!.visible, true);
  advance(2); assert.equal(eggs.activeEvent, null); assert.equal(eggs.root.getObjectByName('FishLandingRipple')!.visible, false); assert.equal(eggs.root.getObjectByName('FishLandingDrops')!.visible, false);
});

test('sheet ghost appears only in autumn and retreats when the season changes', () => {
  const { eggs, advance } = fixture(.9); advance(15.1); assert.equal(eggs.activeEvent, 'ghost'); advance(2);
  const ghost = eggs.root.getObjectByName('RareAutumnGhost')!;
  assert.ok(ghost.visible); assert.ok(Math.abs(ghost.position.x + 1.88) <= .5); assert.ok(ghost.position.z < -2.1);
  const cloth = eggs.root.getObjectByName('GhostScallopedSheet') as THREE.Mesh;
  assert.ok((cloth.material as THREE.MeshStandardMaterial).opacity > .8);
  eggs.update(.05, false, 'winter'); assert.equal(eggs.activeEvent, null); assert.equal(ghost.visible, false);
  const next = fixture(.99); next.advance(16, true, 'summer'); assert.notEqual(next.eggs.activeEvent, 'ghost');
  const fullVisit = fixture(.99); fullVisit.advance(15.1); fullVisit.advance(EASTER_EGG_DURATIONS.ghost);
  assert.equal(fullVisit.eggs.activeEvent, null); assert.equal(fullVisit.eggs.root.getObjectByName('RareAutumnGhost')!.visible, false);
});

test('grave hand rises from its authored soil anchor, reaches, and fully withdraws', () => {
  const { eggs, advance } = fixture(.6); advance(15.1); assert.equal(eggs.activeEvent, 'hand');
  const hand = eggs.root.getObjectByName('RareGraveHand')!; assert.ok(hand.position.y < -.65);
  advance(2); assert.ok(hand.position.y > -.02); assert.equal(hand.position.x, 1.08); assert.equal(hand.position.z, -3.2);
  const finger = eggs.root.getObjectByName('GraveHandFinger_1')!, bend = finger.rotation.x; advance(.5); assert.notEqual(finger.rotation.x, bend);
  advance(EASTER_EGG_DURATIONS.hand); assert.equal(eggs.activeEvent, null); assert.equal(hand.visible, false);
});

test('missing grave and ghost anchors stay optional, and repeated events never overlap', () => {
  const { eggs, advance } = fixture(.99, false); advance(15.1); assert.equal(eggs.activeEvent, 'fish');
  for (let i = 0; i < 3000; i++) {
    eggs.update(.05, true, 'autumn');
    const visible = ['RareSharkFin', 'RareLeapingFish', 'RareAutumnGhost', 'RareGraveHand'].filter(name => eggs.root.getObjectByName(name)!.visible);
    assert.ok(visible.length <= 1); assert.equal(eggs.root.getObjectByName('RareAutumnGhost')!.visible, false); assert.equal(eggs.root.getObjectByName('RareGraveHand')!.visible, false);
  }
});

test('future island or ship expansion cannot make sea visitors pass through land or hulls', () => {
  for (const obstacle of ['meadow', 'ship']) {
    const scene = new THREE.Scene(), model = new THREE.Group(); scene.add(model);
    const material = new THREE.MeshStandardMaterial(); if (obstacle === 'meadow') material.name = 'grass_ground';
    const obstruction = new THREE.Mesh(new THREE.BoxGeometry(obstacle === 'meadow' ? 16 : 2, 1, 7), material);
    if (obstacle === 'ship') { obstruction.name = 'MerchantShip'; obstruction.position.x = -7; }
    model.add(obstruction);
    const eggs = createIslandEasterEggs(scene, model, { intervalSeconds: 20, random: () => 0 });
    for (let i = 0; i < 2000; i++) eggs.update(.05, true, 'summer');
    assert.equal(eggs.activeEvent, null, `blocked water lane disables sea events for ${obstacle}`);
  }
});
