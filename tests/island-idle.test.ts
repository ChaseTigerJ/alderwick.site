import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createIslandIdleMotion } from '../src/island-idle.ts';

test('idle drift waits three seconds, accelerates gently, and stays below half a degree per second', () => {
  const idle = createIslandIdleMotion(1.1, 0);
  assert.deepEqual(idle.step(2.999, .05, .8, true), { azimuth: 0, polar: .8 });
  const first = idle.step(3, .05, .8, true);
  assert.ok(first.azimuth > 0 && first.azimuth < .00002, 'first frame is barely perceptible');
  let angle = 0, polar = .8;
  for (let i = 0; i < 1200; i++) {
    const next = idle.step(3 + i / 20, .05, polar, true);
    assert.ok(next.azimuth <= Math.PI / 360 * .05);
    assert.ok(next.polar >= polar && next.polar <= 1.1, 'returns to the normal plane without overshooting');
    assert.ok(next.polar - polar < .003, 'no sudden elevation snap');
    polar = next.polar; angle += next.azimuth;
  }
  assert.ok(angle > .48 && angle < Math.PI / 6, 'less than thirty degrees over a full minute');
  assert.ok(Math.abs(polar - 1.1) < .001);
});

test('a held pointer stops all idle motion immediately and resumes three seconds after release', () => {
  const idle = createIslandIdleMotion(1.1);
  for (let i = 0; i < 100; i++) idle.step(4 + i / 20, .05, .8, true);
  idle.begin(7, 9);
  assert.deepEqual(idle.step(100, .05, .8, true), { azimuth: 0, polar: .8 });
  idle.end(7, 101);
  assert.equal(idle.step(103.99, .05, .8, true).azimuth, 0);
  assert.ok(idle.step(104, .05, .8, true).azimuth > 0);
});

test('wheel bursts and held keyboard keys extend the pause through the last interaction', () => {
  const idle = createIslandIdleMotion(1.1);
  for (let time = 1; time <= 8; time += .25) {
    idle.activity(time);
    assert.equal(idle.step(time, .05, 1.3, true).azimuth, 0);
  }
  assert.equal(idle.step(10.99, .05, 1.3, true).azimuth, 0);
  idle.begin('key:ArrowLeft', 11);
  idle.begin(1, 12); idle.end(1, 12.2);
  assert.equal(idle.step(20, .05, 1.3, true).azimuth, 0, 'key remains held after touch releases');
  idle.end('key:ArrowLeft', 21);
  assert.equal(idle.step(23.99, .05, 1.3, true).azimuth, 0);
  assert.ok(idle.step(24, .05, 1.3, true).azimuth > 0);
});

test('pause, reduced motion and hidden frames discard velocity instead of accumulating a jump', () => {
  const idle = createIslandIdleMotion(1.1);
  assert.deepEqual(idle.step(100, 60, .6, false), { azimuth: 0, polar: .6 });
  assert.equal(idle.step(102, .05, .6, true).azimuth, 0);
  idle.suspend(200);
  assert.equal(idle.step(202, 100, .6, true).azimuth, 0);
  const resume = idle.step(203, 100, .6, true);
  assert.ok(resume.azimuth < .00002, 'even a huge elapsed delta is bounded');
  idle.begin(4, 210); idle.cancel(220);
  assert.equal(idle.step(222.99, .05, .6, true).azimuth, 0);
  assert.ok(idle.step(223, .05, .6, true).azimuth > 0, 'blur cleanup cannot leave a stuck hold');
});
