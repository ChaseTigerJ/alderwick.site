import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandBreeze, MAST_BREEZE_MAX_TILT, TREE_BREEZE_MAX_TILT } from '../src/island-breeze.ts';
import { createIslandFlags } from '../src/island-flags.ts';

async function fixture() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true); return scene;
}
function vertices(mesh: THREE.Mesh) {
  const positions = mesh.geometry.getAttribute('position');
  return Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i));
}

test('all exported trees and masts sway very slightly without moving their roots', async () => {
  const model = await fixture(), roots: THREE.Object3D[] = [];
  model.traverse(object => { if (/^(TreeBreeze|ShipMast)_\d+$/.test(object.name)) roots.push(object); });
  assert.equal(roots.filter(root => root.name.startsWith('Tree')).length, 17);
  assert.equal(roots.filter(root => root.name.startsWith('ShipMast')).length, 2);
  const resting = roots.map(root => ({ position: root.getWorldPosition(new THREE.Vector3()), quaternion: root.quaternion.clone() }));
  const breeze = createIslandBreeze(model), maximum = roots.map(() => 0);
  for (let time = 0; time <= 600; time += .5) {
    breeze.update(time); model.updateMatrixWorld(true);
    roots.forEach((root, i) => {
      assert.ok(root.getWorldPosition(new THREE.Vector3()).distanceTo(resting[i].position) < 1e-9, `${root.name}: root must stay planted`);
      const angle = root.quaternion.angleTo(resting[i].quaternion);
      maximum[i] = Math.max(maximum[i], angle);
      assert.ok(angle <= (root.name.startsWith('ShipMast') ? MAST_BREEZE_MAX_TILT : TREE_BREEZE_MAX_TILT), `${root.name}: breeze exceeds its subtle angle bound`);
    });
  }
  maximum.forEach((angle, i) => assert.ok(angle > .0004, `${roots[i].name}: the breeze must move the tree or mast`));
});

test('a frozen scene clock stops the breeze and resuming has no random jumps or drift', () => {
  const model = new THREE.Group(), tree = new THREE.Group(), mast = new THREE.Group();
  tree.name = 'TreeBreeze_0'; tree.position.set(4, 0, -2); tree.rotation.y = .8;
  mast.name = 'ShipMast_0'; mast.position.set(0, .43, .48); mast.rotation.y = -.3; model.add(tree, mast);
  const original = [tree.quaternion.clone(), mast.quaternion.clone()], breeze = createIslandBreeze(model);
  breeze.update(0); [tree, mast].forEach((object, i) => assert.deepEqual(object.quaternion.toArray(), original[i].toArray()));
  breeze.update(20); const frozen = [tree.quaternion.toArray(), mast.quaternion.toArray()];
  for (let frame = 0; frame < 100; frame++) breeze.update(20);
  [tree, mast].forEach((object, i) => assert.deepEqual(object.quaternion.toArray(), frozen[i]));
  const beforeResume = tree.quaternion.clone(); breeze.update(20 + 1 / 30);
  assert.ok(tree.quaternion.angleTo(beforeResume) < .00006, 'resumption follows the same slow wind smoothly');
  breeze.update(0); [tree, mast].forEach((object, i) => assert.ok(object.quaternion.angleTo(original[i]) < 1e-7, 'rest transforms never accumulate drift'));
});

test('exported ship cables keep lower anchors pinned and upper ties attached during mast sway', async () => {
  const model = await fixture(), cables: THREE.Mesh[] = [];
  model.traverse(object => { if (object instanceof THREE.Mesh && object.userData.mastNode && !object.name.includes('Foresail')) cables.push(object); });
  assert.ok(cables.length >= 3, 'two sets of shrouds and a forestay are deformable');
  const resting = cables.map(mesh => ({ points: vertices(mesh), matrix: mesh.matrixWorld.clone() }));
  const breeze = createIslandBreeze(model);
  for (const time of [0, 3, 7, 12, 24, 47, 79, 121]) {
    breeze.update(time); model.updateMatrixWorld(true);
    cables.forEach((mesh, i) => {
      const mast = model.getObjectByName(mesh.userData.mastNode)!;
      const toParent = mast.parent!.matrixWorld.clone().invert();
      const base = Number(mesh.userData.breezeBaseHeight), top = Number(mesh.userData.breezeTopHeight);
      let pinned = 0, following = 0;
      const positions = vertices(mesh);
      resting[i].points.forEach((point, j) => {
        const rest = point.clone().applyMatrix4(resting[i].matrix).applyMatrix4(toParent);
        const actual = positions[j].clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(toParent);
        if (rest.y <= base) {
          assert.ok(actual.distanceTo(rest) < 1e-7, `${mesh.name}: lower attachment must be fixed to the deck/bowsprit`); pinned++;
        } else if (rest.y >= top) {
          const expected = rest.clone().sub(mast.position).applyQuaternion(mast.quaternion).add(mast.position);
          assert.ok(actual.distanceTo(expected) < 5e-7, `${mesh.name}: upper attachment must follow the mast`); following++;
        }
      });
      assert.ok(pinned >= 3 && following >= 3, `${mesh.name}: both cable attachment regions are represented`);
    });
  }
});

test('the mast breeze and flag ripple preserve each cloth hoist attachment', async () => {
  const model = await fixture(), breeze = createIslandBreeze(model), flags = createIslandFlags(model);
  const cloth = ['FlagClothShip_0', 'FlagClothShip_1'].map(name => model.getObjectByName(name) as THREE.Mesh);
  const rest = cloth.map(mesh => vertices(mesh));
  for (const time of [2, 9, 24]) {
    flags.update(time); breeze.update(time); model.updateMatrixWorld(true);
    cloth.forEach((mesh, index) => {
      assert.equal(mesh.parent?.name, `ShipMast_${index}`, 'the flag inherits its own mast motion');
      const actual = vertices(mesh);
      rest[index].forEach((point, i) => { if (Math.abs(point.x) < 1e-5) assert.ok(actual[i].distanceTo(point) < 1e-7, 'cloth hoist remains on its mast'); });
    });
  }
});

test('shrouds stay behind the square sails and clear of mast wood throughout the breeze', async () => {
  const model = await fixture(), breeze = createIslandBreeze(model);
  for (let time = 0; time < 360; time += 3) {
    breeze.update(time); model.updateMatrixWorld(true);
    for (let index = 0; index < 2; index++) {
      const mast = model.getObjectByName(`ShipMast_${index}`)!;
      const shrouds = model.getObjectByName(`ShipRigging_${index}`) as THREE.Mesh;
      const canvas = model.getObjectByName(`ShipMast_${index}__canvas`) as THREE.Mesh;
      assert.ok(mast && shrouds && canvas, 'mast, cable and sail geometry are present');
      const toMast = mast.matrixWorld.clone().invert();
      const ropePoints = vertices(shrouds).map(point => point.applyMatrix4(shrouds.matrixWorld).applyMatrix4(toMast));
      const canvasPoints = vertices(canvas).map(point => point.applyMatrix4(canvas.matrixWorld).applyMatrix4(toMast));
      const sailBack = Math.min(...canvasPoints.map(point => point.z));
      const ropeFront = Math.max(...ropePoints.map(point => point.z));
      assert.ok(sailBack - ropeFront > .035, `mast ${index}: ropes cannot cut through canvas (gap ${sailBack - ropeFront})`);
      for (const point of ropePoints) assert.ok(Math.hypot(point.x, point.z) > .04, `mast ${index}: shrouds cannot pass through the .035-radius mast`);
    }
    const forestay = model.getObjectByName('ShipForestay') as THREE.Mesh, foremast = model.getObjectByName('ShipMast_0')!;
    const toMast = foremast.matrixWorld.clone().invert();
    for (const point of vertices(forestay)) {
      point.applyMatrix4(forestay.matrixWorld).applyMatrix4(toMast);
      assert.ok(Math.hypot(point.x, point.z) > .045, 'forestay stays outside the foremast, ending at its cleat');
    }
  }
});
