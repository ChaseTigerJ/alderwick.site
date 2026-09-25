import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createIslandOrbit } from '../src/island-orbit.ts';
import { createIslandTapTracker } from '../src/island-tap.ts';
import { createIslandPicker } from '../src/island-interactions.ts';
import { attachIslandDrag } from '../src/island-drag.ts';

class CanvasFixture extends EventTarget {
  style = { touchAction: '', cursor: '' };
  clientHeight = 600; clientWidth = 600;
  root = new EventTarget();
  captures = new Set<number>();
  getRootNode() { return this.root; }
  setPointerCapture(id: number) { this.captures.add(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 600 }; }
}
function pointer(type: string, id: number, x: number, y: number, pointerType = 'touch') {
  return Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pageX: x, pageY: y, pointerType, button: 0, buttons: type === 'pointerup' ? 0 : 1 }) as PointerEvent;
}
function fixture() {
  const element = new CanvasFixture(), canvas = element as unknown as HTMLCanvasElement;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 120); camera.position.set(13, 13, 19);
  const controls = createIslandOrbit(camera, canvas); controls.update();
  return { element, canvas, camera, controls };
}

test('production OrbitControls rotates with one touch, pinches with two, and accepts a fresh tap afterward', () => {
  const { element, camera, controls } = fixture();
  const taps = createIslandTapTracker();
  let tapped = 0, time = 0;
  function send(type: string, id: number, x: number, y: number) {
    const event = pointer(type, id, x, y); time += 20;
    if (type === 'pointerdown') taps.down(event, time);
    if (type === 'pointermove') taps.move(event);
    if (type === 'pointerup' && taps.up(event, time)) tapped++;
    element.dispatchEvent(event);
  }
  const start = camera.position.clone(), distance = controls.getDistance();
  send('pointerdown', 1, 200, 280); send('pointermove', 1, 270, 310);
  assert.ok(start.distanceTo(camera.position) > .1, 'a one-finger drag rotates the real camera');
  assert.ok(Math.abs(distance - controls.getDistance()) < 1e-6);
  send('pointerup', 1, 270, 310); assert.equal(tapped, 0);
  send('pointerdown', 2, 220, 300); send('pointerdown', 3, 380, 300);
  const beforePinch = controls.getDistance();
  send('pointermove', 2, 150, 300); send('pointermove', 3, 450, 300);
  assert.ok(controls.getDistance() < beforePinch - 1, 'spreading fingers zooms in');
  send('pointerup', 2, 150, 300); send('pointerup', 3, 450, 300);
  assert.equal(tapped, 0, 'lifting the final pinch finger does not select an object');
  for (let i = 0; i < 200; i++) controls.update();
  send('pointerdown', 4, 300, 300); send('pointerup', 4, 300, 300);
  assert.equal(tapped, 1, 'an ordinary tap after the pinch still works');
  const model = new THREE.Group();
  const mailbox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mailbox.name = 'Mailbox'; mailbox.position.copy(controls.target); model.add(mailbox); model.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  assert.equal(createIslandPicker(model)(ray), 0, 'the post-gesture tap ray can select the mailbox');
  assert.equal(element.style.touchAction, 'none'); assert.equal(controls.enablePan, false);
  mailbox.geometry.dispose(); mailbox.material.dispose(); controls.dispose();
});

test('dragging away and back, long presses, pinch cancellation and lost focus never turn into discoveries', () => {
  const taps = createIslandTapTracker();
  taps.down(pointer('pointerdown', 1, 10, 10), 0);
  taps.move(pointer('pointermove', 1, 80, 10)); taps.move(pointer('pointermove', 1, 10, 10));
  assert.equal(taps.up(pointer('pointerup', 1, 10, 10), 100), false);
  taps.down(pointer('pointerdown', 1, 10, 10), 200);
  assert.equal(taps.up(pointer('pointerup', 1, 10, 10), 1400), false);
  taps.down(pointer('pointerdown', 1, 10, 10), 1500); taps.down(pointer('pointerdown', 2, 12, 12), 1510);
  taps.cancel({ pointerId: 2 });
  assert.equal(taps.up(pointer('pointerup', 1, 10, 10), 1550), false);
  taps.down(pointer('pointerdown', 1, 10, 10), 1600); taps.clear();
  assert.equal(taps.up(pointer('pointerup', 1, 10, 10), 1650), false);
  taps.down(pointer('pointerdown', 3, 10, 10), 1700);
  assert.equal(taps.up(pointer('pointerup', 3, 12, 11), 1750), true, 'small natural finger jitter is allowed');
});

test('the drag observer follows touch motion, and cleans up outside releases, cancellations and blur', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowFixture = new EventTarget(), documentFixture = new EventTarget();
  let selecting = false;
  Object.assign(documentFixture, { documentElement: { classList: { toggle(_name: string, active: boolean) { selecting = active; } } } });
  Object.defineProperty(globalThis, 'window', { value: windowFixture, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: documentFixture, configurable: true });
  const element = new CanvasFixture(), impulses: number[][] = [], held = new Set<number>();
  const dispose = attachIslandDrag(element as unknown as HTMLCanvasElement, (x, y) => impulses.push([x, y]), {
    begin: id => held.add(id), end: id => held.delete(id), cancel: () => held.clear(),
  });
  try {
    element.dispatchEvent(pointer('pointerdown', 1, 100, 100));
    windowFixture.dispatchEvent(pointer('pointermove', 1, 120, 110));
    assert.deepEqual(impulses.pop(), [.16, .06]);
    element.dispatchEvent(pointer('pointerdown', 2, 200, 100));
    windowFixture.dispatchEvent(pointer('pointermove', 2, 220, 110));
    assert.deepEqual(impulses.pop(), [.08, .03]);
    windowFixture.dispatchEvent(pointer('pointercancel', 1, 120, 110));
    windowFixture.dispatchEvent(pointer('pointerup', 2, 220, 110));
    assert.equal(held.size, 0);
    element.dispatchEvent(pointer('pointerdown', 3, 100, 100, 'mouse'));
    assert.equal(selecting, true);
    windowFixture.dispatchEvent(pointer('pointerup', 3, -100, -100, 'mouse'));
    assert.equal(selecting, false, 'release outside the world restores text selection');
    element.dispatchEvent(pointer('pointerdown', 4, 100, 100, 'mouse'));
    windowFixture.dispatchEvent(new Event('blur'));
    assert.equal(held.size, 0); assert.equal(selecting, false);
    const count = impulses.length;
    windowFixture.dispatchEvent(pointer('pointermove', 4, 500, 500, 'mouse'));
    assert.equal(impulses.length, count, 'blur discards stale pointer coordinates');
  } finally {
    dispose();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else Reflect.deleteProperty(globalThis, 'document');
  }
});
