import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIslandFlags } from '../src/island-flags.ts';

test('exported cloth ripples at the free edge while remaining attached to the mast', async () => {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const cloth: THREE.Mesh[] = [];
  scene.traverse(object => { if (object instanceof THREE.Mesh && object.name.startsWith('FlagCloth')) cloth.push(object); });
  assert.equal(cloth.length, 3);
  const originals = cloth.map(mesh => Array.from(mesh.geometry.attributes.position.array));
  const flags = createIslandFlags(scene); flags.update(2);
  for (let j = 0; j < cloth.length; j++) {
    const positions = cloth[j].geometry.attributes.position, rest = originals[j];
    let moving = 0, pinned = 0;
    for (let i = 0; i < positions.count; i++) {
      const n = i * 3;
      if (Math.abs(rest[n]) < 1e-5) { pinned++; assert.equal(positions.getY(i), rest[n + 1]); assert.ok(Math.abs(positions.getZ(i) - rest[n + 2]) < 1e-7); }
      else if (Math.abs(positions.getZ(i) - rest[n + 2]) > .001) moving++;
    }
    assert.ok(pinned > 1 && moving > 5, `${cloth[j].name} must have both a fixed hoist and a flowing body`);
  }
  const before = cloth.map(mesh => Array.from(mesh.geometry.attributes.position.array));
  flags.update(2); cloth.forEach((mesh, i) => assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), before[i], 'paused time gives a stable flag'));
});
