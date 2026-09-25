import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createKhloeAnimation, type KhloeAnimationState } from '../src/khloe-animation.ts';

const idle: KhloeAnimationState = { walking: false, sniffing: false, playing: false, dogElapsed: 0 };
const walk = { ...idle, walking: true }, sniff = { ...idle, sniffing: true };

function fixture(names = ['KhloeIdle', 'KhloeWalk', 'KhloeSniff', 'KhloePlay', 'KhloeSitCurious']) {
  const root = new THREE.Group(), head = new THREE.Bone(), ear = new THREE.Bone();
  head.name = 'KhloeTestHead'; head.position.x = -.5;
  ear.position.set(.2, .7, 0); head.add(ear); root.add(head); root.position.set(5, 2, 1);
  const clips = names.map(name => {
    const index = ['KhloeIdle', 'KhloeWalk', 'KhloeSniff', 'KhloePlay', 'KhloeSitCurious'].indexOf(name);
    const duration = name === 'KhloePlay' ? 4.7 : 2;
    // Distinct, time-varying poses expose both weight jumps and clock drift.
    return new THREE.AnimationClip(name, duration, [new THREE.NumberKeyframeTrack('KhloeTestHead.position[x]', [0, duration], [index * 10, index * 10 + duration])]);
  });
  return { root, head, ear, controller: createKhloeAnimation(root, clips) };
}

function near(actual: number, expected: number, message?: string) {
  assert.ok(Math.abs(actual - expected) < 1e-5, message ?? `${actual} should equal ${expected}`);
}

test('a moving first frame advances its pose using the supplied scene delta', () => {
  const { head, controller } = fixture();
  controller.update(.1, true, walk);
  near(head.position.x, 10.1);
  controller.dispose();
});

test('pause freezes a partly blended skeleton and resumes from the same frame', () => {
  const a = fixture(), b = fixture();
  for (const { controller } of [a, b]) {
    controller.update(0, true, walk); controller.update(.3, true, walk);
    controller.update(.08, true, sniff);
  }
  const frozen = a.head.position.toArray(), frozenWorld = a.ear.matrixWorld.toArray();
  for (let frame = 0; frame < 30; frame++) a.controller.update(5, false, sniff);
  assert.deepEqual(a.head.position.toArray(), frozen);
  assert.deepEqual(a.ear.matrixWorld.toArray(), frozenWorld, 'child matrices remain frozen along with the pose');
  a.controller.update(.02, true, sniff); b.controller.update(.02, true, sniff);
  assert.deepEqual(a.head.position.toArray(), b.head.position.toArray(), 'paused time must not advance the fade or clip');
  a.controller.dispose(); b.controller.dispose();
});

test('an explicit paused discovery samples the readable .7-second play pose once', () => {
  const { controller, head, ear } = fixture();
  controller.update(0, false, idle);
  controller.update(0, false, { ...idle, playing: true, dogElapsed: .7 });
  near(head.position.x, 30.7);
  near(ear.getWorldPosition(new THREE.Vector3()).x, 35.9, 'child world matrices update after the static sample');
  for (let frame = 0; frame < 50; frame++) controller.update(1, false, { ...idle, playing: true, dogElapsed: .7 });
  near(head.position.x, 30.7);
  controller.update(.1, true, { ...idle, playing: true, dogElapsed: .8 });
  near(head.position.x, 30.8, 'resuming advances the sampled pose instead of restarting');
  controller.dispose();
});

test('play clamps at its final pose and needs a genuine state exit before restarting', () => {
  const { controller, head } = fixture();
  controller.update(0, true, { ...idle, playing: true, dogElapsed: 0 });
  for (let frame = 1; frame <= 60; frame++) controller.update(.1, true, { ...idle, playing: true, dogElapsed: Math.min(4.7, frame / 10) });
  near(head.position.x, 34.7);
  controller.update(.1, true, { ...idle, playing: true, dogElapsed: 0 });
  near(head.position.x, 34.7, 'elapsed alone must not retrigger a debounced performance');
  controller.update(.3, true, idle);
  controller.update(.1, true, { ...idle, playing: true, dogElapsed: .1 });
  controller.update(.2, true, { ...idle, playing: true, dogElapsed: .3 });
  near(head.position.x, 30.3, 'a new play state restarts from its authored beginning');
  controller.dispose();
});

test('normal state changes crossfade between actual clip poses without an immediate snap', () => {
  const { controller, head } = fixture();
  controller.update(0, true, walk); controller.update(.5, true, walk);
  const before = head.position.x;
  controller.update(0, true, sniff); near(head.position.x, before);
  controller.update(.12, true, sniff);
  near(head.position.x, (10.62 + 20.12) / 2, 'the midpoint blends both advancing clips equally');
  controller.update(.12, true, sniff); near(head.position.x, 20.24);
  controller.dispose();
});

test('reversing an unfinished crossfade preserves the already visible incoming clip phase', () => {
  const { controller, head } = fixture();
  controller.update(0, true, walk); controller.update(.5, true, walk);
  controller.update(.08, true, sniff);
  const before = head.position.x;
  controller.update(0, true, walk);
  near(head.position.x, before, 'returning to a still-weighted walk clip must not reset its phase');
  controller.update(.24, true, walk);
  near(head.position.x, 10.82);
  controller.dispose();
});

test('idle, walk and sniff continue looping after their authored duration', () => {
  for (const [state, offset] of [[idle, 0], [walk, 10], [sniff, 20]] as const) {
    const { controller, head } = fixture();
    controller.update(0, true, state); controller.update(2.3, true, state);
    near(head.position.x, offset + .3);
    controller.dispose();
  }
});

test('a missing requested clip uses idle and absent animation data leaves the model intact', () => {
  const fallback = fixture(['KhloeIdle']);
  fallback.controller.update(0, true, walk); fallback.controller.update(.1, true, walk);
  near(fallback.head.position.x, .1); fallback.controller.dispose();
  const empty = fixture([]);
  empty.controller.update(.1, true, walk); near(empty.head.position.x, -.5);
  empty.controller.dispose();
});

test('disposal releases bindings and makes later updates inert', () => {
  const { controller, root, head } = fixture();
  controller.update(.1, true, walk); controller.dispose(); controller.dispose();
  near(head.position.x, -.5, 'stopping the last action restores the authored rest pose');
  head.position.x = 8;
  controller.update(1, true, sniff); near(head.position.x, 8, 'a disposed controller cannot change the reused model');
  const fresh = createKhloeAnimation(root, [new THREE.AnimationClip('KhloeIdle', 1, [new THREE.NumberKeyframeTrack('KhloeTestHead.position[x]', [0, 1], [50, 51])])]);
  fresh.update(0, true, idle); near(head.position.x, 50);
  fresh.dispose(); near(head.position.x, 8, 'a new mixer can bind and restore the model independently');
});
