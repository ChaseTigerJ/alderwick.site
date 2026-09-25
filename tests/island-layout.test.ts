import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandLife } from '../src/island-life.ts';

type Point = { x: number; y: number };
async function fixture() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = new THREE.Scene(); scene.add(asset.scene); scene.updateMatrixWorld(true);
  return { scene, model: asset.scene };
}
function cross(a: Point, b: Point, c: Point) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function pointSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = THREE.MathUtils.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function contains(p: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function polygonDistance(a: Point[], b: Point[]) {
  if (contains(a[0], b) || contains(b[0], a)) return 0;
  let distance = Infinity;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const a0 = a[i], a1 = a[(i + 1) % a.length], b0 = b[j], b1 = b[(j + 1) % b.length];
    if (cross(a0, a1, b0) * cross(a0, a1, b1) < 0 && cross(b0, b1, a0) * cross(b0, b1, a1) < 0) return 0;
    distance = Math.min(distance, pointSegment(a0, b0, b1), pointSegment(a1, b0, b1), pointSegment(b0, a0, a1), pointSegment(b1, a0, a1));
  }
  return distance;
}
function convexHull(points: Point[]) {
  const sorted = [...new Map(points.map(p => [`${p.x.toFixed(7)},${p.y.toFixed(7)}`, p])).values()].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: Point[] = [], upper: Point[] = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of sorted.reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function worldVertices(mesh: THREE.Mesh) {
  const positions = mesh.geometry.getAttribute('position');
  return Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld));
}
function outline(box: THREE.Box3): Point[] {
  return [{ x: box.min.x, y: box.min.z }, { x: box.max.x, y: box.min.z }, { x: box.max.x, y: box.max.z }, { x: box.min.x, y: box.max.z }];
}
function pathTriangles(model: THREE.Object3D) {
  const triangles: Point[][] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || ![object.material].flat().some(material => material.name === 'sand')) return;
    const points = worldVertices(object), index = object.geometry.index;
    for (let i = 0; i < (index?.count ?? points.length); i += 3) {
      const tri = [0, 1, 2].map(j => points[index ? index.getX(i + j) : i + j]);
      if (tri.every(p => p.y > .014 && p.y < .05) && Math.abs(new THREE.Triangle(...tri as [THREE.Vector3, THREE.Vector3, THREE.Vector3]).getNormal(new THREE.Vector3()).y) > .99) triangles.push(tri.map(p => ({ x: p.x, y: p.z })));
    }
  });
  assert.ok(triangles.length > 10, 'actual exported lane triangles are available');
  return triangles;
}

test('the entire well roof clears the lanes and the toss travels below it', async () => {
  const { model } = await fixture();
  const well = model.getObjectByName('WishingWell')!, roof = well.getObjectByName('WishingWell__roof_green')!;
  assert.ok(roof, 'well roof remains identifiable in its animated root');
  const bounds = new THREE.Box3().setFromPoints(worldVertices(roof as THREE.Mesh).filter(p => p.y > 1)), footprint = outline(bounds);
  for (const triangle of pathTriangles(model)) assert.ok(polygonDistance(footprint, triangle) > .08, 'roof cannot overhang a public path');
  const toss = model.getObjectByName('WellTossAnchor')!, target = model.getObjectByName('WellWishAnchor')!;
  assert.equal(toss.parent, well); assert.equal(target.parent, well);
  const start = toss.getWorldPosition(new THREE.Vector3()), end = target.getWorldPosition(new THREE.Vector3());
  assert.ok(start.y >= .45 && start.y <= .7 && start.z > bounds.max.z, 'coin starts at hand height in front of the opening');
  assert.ok(Math.max(start.y, end.y) + .25 < bounds.min.y, 'a natural short arc clears the roof from below');
  const bucket = model.getObjectByName('WellBucket')!.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.hypot(end.x - bucket.x, end.z - bucket.z) > .18, 'the coin lands beside the bucket');
  assert.ok(end.y > .4 && end.y < .43, 'the target is at the visible well water');
});

test('the enlarged ship clears the cliff, dock, and sea edge throughout a full rock', async t => {
  const { scene, model } = await fixture(), ship = model.getObjectByName('MerchantShip')!;
  const hull = model.getObjectByName('ShipHullBoundary') as THREE.Mesh;
  assert.ok(hull instanceof THREE.Mesh && hull.parent === ship);
  assert.ok(ship.scale.x >= 1.45 && ship.scale.x === ship.scale.y && ship.scale.y === ship.scale.z);
  const meadow = model.getObjectByName('grass_ground') as THREE.Mesh;
  const edge = [...new Map(worldVertices(meadow).filter(p => Math.hypot(p.x, p.z) > 1).map(p => [`${p.x.toFixed(5)},${p.z.toFixed(5)}`, { x: p.x * 1.04, y: p.z * 1.04 }])).values()].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  assert.ok(edge.length >= 40, 'use the real irregular cliff outline, expanded to its widest band');
  const dock = [{ x: .05, y: 3.4 }, { x: 1.25, y: 3.4 }, { x: 1.25, y: 6.3 }, { x: .05, y: 6.3 }];
  const meshes: THREE.Mesh[] = []; ship.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
  const life = createIslandLife(scene, model), camera = new THREE.PerspectiveCamera(); camera.position.set(13, 13, 19);
  life.trigger(2, false);
  let minimumCliffGap = Infinity, minimumDockGap = Infinity, maximumSeaRadius = 0;
  for (let frame = 0; frame <= 150; frame++) {
    life.update(1 / 30, true, false, camera); scene.updateMatrixWorld(true);
    const projected = convexHull(worldVertices(hull).map(p => ({ x: p.x, y: p.z })));
    minimumCliffGap = Math.min(minimumCliffGap, polygonDistance(projected, edge));
    minimumDockGap = Math.min(minimumDockGap, polygonDistance(projected, dock));
    assert.ok(minimumCliffGap > .08, `hull/cliff clearance at frame ${frame}: ${minimumCliffGap}`);
    assert.ok(minimumDockGap > .2, `hull/dock clearance at frame ${frame}: ${minimumDockGap}`);
    for (const mesh of meshes) for (const p of worldVertices(mesh)) {
      maximumSeaRadius = Math.max(maximumSeaRadius, Math.hypot(p.x, p.z));
      assert.ok(maximumSeaRadius < 8.28, `vessel extends beyond water at frame ${frame}: ${maximumSeaRadius}`);
    }
  }
  t.diagnostic(`Minimum cliff gap ${minimumCliffGap.toFixed(3)}; dock gap ${minimumDockGap.toFixed(3)}; maximum vessel radius ${maximumSeaRadius.toFixed(3)} of water radius 8.35.`);
});

test('cloth, moving ship lights, churchyard, and removed cottage lamp survive export', async () => {
  const { model } = await fixture(), ship = model.getObjectByName('MerchantShip')!;
  for (const name of ['FlagClothShip_0', 'FlagClothShip_1', 'FlagClothHarbor']) {
    const flag = model.getObjectByName(name) as THREE.Mesh;
    assert.ok(flag instanceof THREE.Mesh && flag.geometry.getAttribute('position').count > 40);
    assert.equal(flag.userData.hoistAxis, 'x'); assert.equal(flag.userData.hoistAt, 0); assert.equal(flag.userData.waveAxis, 'z');
    const positions = flag.geometry.getAttribute('position');
    const columns = new Set(Array.from({ length: positions.count }, (_, i) => positions.getX(i).toFixed(4)));
    assert.ok(columns.size >= 10, 'cloth has enough subdivisions to wave instead of rigidly rotating');
    assert.ok([...columns].some(value => Math.abs(Number(value) - flag.userData.flyLength) < .001));
    if (name.startsWith('FlagClothShip')) {
      assert.equal(flag.parent?.name, name.replace('FlagClothShip', 'ShipMast'));
      assert.equal(flag.parent?.parent, ship, 'mast-mounted cloth inherits vessel rocking');
    }
  }
  for (let i = 0; i < 3; i++) assert.equal(model.getObjectByName(`ShipLanternLight_${i}`)?.parent, ship, 'every vessel light follows its rocking root');
  const lamps: THREE.Object3D[] = []; model.traverse(object => { if (object.name.startsWith('LanternLight_')) lamps.push(object); });
  assert.equal(lamps.length, 1); assert.ok(lamps[0].getWorldPosition(new THREE.Vector3()).z > 2, 'only the harbor lamp remains');
  const stone = model.getObjectByName('grave_slate')!; assert.ok(stone);
  const stoneBounds = new THREE.Box3().setFromObject(stone), church = model.getObjectByName('CottageFootprint_0')!.getWorldPosition(new THREE.Vector3());
  assert.ok(stoneBounds.max.z < church.z - 1.5, 'headstones are behind the church');
  const grave = model.getObjectByName('GraveHandAnchor')!.getWorldPosition(new THREE.Vector3());
  assert.ok(grave.z < stoneBounds.min.z && grave.y < .05, 'the hand begins on the ground in front of a headstone');
  for (const triangle of pathTriangles(model)) assert.ok(polygonDistance(outline(stoneBounds), triangle) > .1, 'churchyard remains off the path');
  assert.ok(model.getObjectByName('BackIslandGhostAnchor'));
});
