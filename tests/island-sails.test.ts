import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandBreeze } from '../src/island-breeze.ts';

type Face = { triangle: THREE.Triangle; bounds: THREE.Box3 };
const scratch = new THREE.Vector3();
function faces(mesh: THREE.Mesh, ship: THREE.Object3D, select?: (face: THREE.Triangle) => boolean): Face[] {
  const positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index;
  const transform = ship.matrixWorld.clone().invert().multiply(mesh.matrixWorld), result: Face[] = [];
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    const points = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + offset) : i + offset).applyMatrix4(transform));
    const triangle = new THREE.Triangle(points[0], points[1], points[2]);
    if (triangle.getArea() > 1e-12 && (!select || select(triangle))) result.push({ triangle, bounds: new THREE.Box3().setFromPoints(points) });
  }
  return result;
}
function boundsGap(a: THREE.Box3, b: THREE.Box3) {
  return Math.hypot(Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x), Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y), Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z));
}
function edges(t: THREE.Triangle) { return [[t.a, t.b], [t.b, t.c], [t.c, t.a]]; }
function pierces(start: THREE.Vector3, end: THREE.Vector3, triangle: THREE.Triangle) {
  const direction = end.clone().sub(start), length = direction.length();
  const hit = new THREE.Ray(start, direction.divideScalar(length)).intersectTriangle(triangle.a, triangle.b, triangle.c, false, new THREE.Vector3());
  return hit !== null && hit.distanceTo(start) <= length + 1e-9;
}
function segmentDistance(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
  const u = b.clone().sub(a), v = d.clone().sub(c), w = a.clone().sub(c);
  const uu = u.dot(u), uv = u.dot(v), vv = v.dot(v), uw = u.dot(w), vw = v.dot(w), denominator = uu * vv - uv * uv;
  let s = denominator > 1e-20 ? THREE.MathUtils.clamp((uv * vw - vv * uw) / denominator, 0, 1) : 0;
  let t = (uv * s + vw) / vv;
  if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-uw / uu, 0, 1); }
  else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((uv - uw) / uu, 0, 1); }
  return a.clone().addScaledVector(u, s).distanceTo(c.clone().addScaledVector(v, t));
}
function distance(a: THREE.Triangle, b: THREE.Triangle) {
  const ae = edges(a), be = edges(b);
  if (ae.some(([s, e]) => pierces(s, e, b)) || be.some(([s, e]) => pierces(s, e, a))) return 0;
  let closest = Infinity;
  for (const p of [a.a, a.b, a.c]) closest = Math.min(closest, b.closestPointToPoint(p, scratch).distanceTo(p));
  for (const p of [b.a, b.b, b.c]) closest = Math.min(closest, a.closestPointToPoint(p, scratch).distanceTo(p));
  for (const [s, e] of ae) for (const [v, w] of be) closest = Math.min(closest, segmentDistance(s, e, v, w));
  return closest;
}
function clearance(a: Face[], b: Face[]) {
  let closest = Infinity;
  for (const first of a) for (const second of b) {
    if (boundsGap(first.bounds, second.bounds) >= closest) continue;
    closest = Math.min(closest, distance(first.triangle, second.triangle));
    if (closest < 1e-10) return 0;
  }
  return closest;
}
async function fixture() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true); return scene;
}

test('jib triangles remain completely ahead of both square sails and both masts throughout the breeze', async () => {
  const model = await fixture(), ship = model.getObjectByName('MerchantShip')!, breeze = createIslandBreeze(model);
  const jib = model.getObjectByName('ShipForesail') as THREE.Mesh;
  for (let time = 0; time <= 360; time += 6) {
    breeze.update(time); model.updateMatrixWorld(true);
    const jibFaces = faces(jib, ship);
    for (let mast = 0; mast < 2; mast++) for (const material of ['canvas', 'wood_light']) {
      const geometry = model.getObjectByName(`ShipMast_${mast}__${material}`) as THREE.Mesh;
      const gap = clearance(jibFaces, faces(geometry, ship));
      assert.ok(gap > .08, `${time}s: jib must clear mast ${mast} ${material} triangles by .08, actual ${gap}`);
    }
  }
});

test('lower and upper square sails have an open gap and do not intersect their mast or yards', async () => {
  const model = await fixture(), ship = model.getObjectByName('MerchantShip')!, breeze = createIslandBreeze(model);
  for (const time of [0, 3, 9, 18, 33, 72, 120, 240]) {
    breeze.update(time); model.updateMatrixWorld(true);
    for (let mast = 0; mast < 2; mast++) {
      const cloth = model.getObjectByName(`ShipMast_${mast}__canvas`) as THREE.Mesh;
      const wood = model.getObjectByName(`ShipMast_${mast}__wood_light`) as THREE.Mesh;
      const lower = faces(cloth, ship, triangle => triangle.getMidpoint(scratch).y < 1.8);
      const upper = faces(cloth, ship, triangle => triangle.getMidpoint(scratch).y >= 1.8);
      assert.ok(lower.length > 90 && upper.length > 90, 'both complete canvas surfaces are checked');
      assert.ok(clearance(lower, upper) > .07, `${time}s: mast ${mast} upper canvas must not overlap the lower sail`);
      assert.ok(clearance([...lower, ...upper], faces(wood, ship)) > .001, `${time}s: mast ${mast} wood cannot pierce the canvas`);
    }
    const fore = model.getObjectByName('ShipMast_0__canvas') as THREE.Mesh;
    const main = model.getObjectByName('ShipMast_1__canvas') as THREE.Mesh;
    assert.ok(clearance(faces(fore, ship), faces(main, ship)) > .6, `${time}s: the two square-sail assemblies stay separate`);
  }
});
